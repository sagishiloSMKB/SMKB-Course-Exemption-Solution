// ─────────────────────────────────────────────────────────────────────────────
// Flow-lint rule registry (rules-as-code).
//
// Each rule: { id, severity: 'error'|'warn', docs, check(flow, ctx) -> Finding[] }
//   flow = { name, path, raw, json }   (json is the parsed definition, BOM-stripped)
//   ctx  = { envVarSchemaNames: Set<string>, publicFlows: Set<string> }
//   Finding = { location, message }     (ruleId/severity/file are added by the runner)
//
// Severity policy:
//   error  → blocks (import-breaking or security). Runner exits non-zero.
//   warn   → reported, does not block (unless --strict).
//
// Add a rule = push another object here. Keep checks pure (no I/O) so test.mjs can
// exercise them with crafted fixtures.
// ─────────────────────────────────────────────────────────────────────────────

/** Recursively visit every object/array node. cb(node, path). */
export function walk(node, cb, path = '') {
  if (!node || typeof node !== 'object') return
  cb(node, path)
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, cb, `${path}[${i}]`))
  } else {
    for (const k of Object.keys(node)) walk(node[k], cb, path ? `${path}.${k}` : k)
  }
}

/** All action/trigger nodes of a given `type` anywhere under the definition. */
function nodesOfType(json, type) {
  const out = []
  walk(json?.properties?.definition, (n, p) => {
    if (n && n.type === type) out.push({ node: n, path: p })
  })
  return out
}

const def = (json) => json?.properties?.definition ?? {}
const params = (json) => def(json).parameters ?? {}
const triggers = (json) => def(json).triggers ?? {}
const connRefs = (json) => json?.properties?.connectionReferences ?? {}

const EMAIL_RE = /[^@\s"]+@[^@\s"]+\.[a-z]{2,}/i
export const PLACEHOLDERS = [
  'YourSolutionName', 'Your Solution Name', 'smkb_sol_',
  'your-default-value-here', '[yourid]', '[REPLACE', '[sol]',
  '00000000-0000-0000-0000-000000000001',
]

export const rules = [
  {
    id: 'description-max-length',
    severity: 'error',
    docs: 'Trigger/action description >256 chars imports OK but then fails to activate (TriggerDescriptionTooLong / ActionDescriptionTooLong).',
    check(flow) {
      const out = []
      walk(def(flow.json), (n, p) => {
        if (n && typeof n.description === 'string' && n.description.length > 256) {
          out.push({ location: p || '(definition)', message: `description is ${n.description.length} chars (max 256)` })
        }
      })
      return out
    },
  },

  {
    id: 'connection-runtime-embedded',
    severity: 'error',
    docs: 'Every connection must be runtimeSource "embedded"; an "invoker" connection on a Power Pages flow causes a recurring 403 on each deploy.',
    check(flow) {
      const out = []
      for (const [key, ref] of Object.entries(connRefs(flow.json))) {
        if (ref?.runtimeSource && ref.runtimeSource !== 'embedded') {
          out.push({ location: `connectionReferences.${key}`, message: `runtimeSource is "${ref.runtimeSource}" (must be "embedded")` })
        }
      }
      return out
    },
  },

  {
    id: 'connection-reference-complete',
    severity: 'warn',
    docs: 'Each connection reference should carry a logical name and an api name.',
    check(flow) {
      const out = []
      for (const [key, ref] of Object.entries(connRefs(flow.json))) {
        if (!ref?.connection?.connectionReferenceLogicalName) {
          out.push({ location: `connectionReferences.${key}`, message: 'missing connection.connectionReferenceLogicalName' })
        }
        if (!ref?.api?.name) {
          out.push({ location: `connectionReferences.${key}`, message: 'missing api.name' })
        }
      }
      return out
    },
  },

  {
    id: 'no-placeholders',
    severity: 'error',
    docs: 'Unreplaced starter placeholders must not reach a deploy.',
    check(flow) {
      const out = []
      for (const p of PLACEHOLDERS) {
        if (flow.raw.includes(p)) out.push({ location: '(file)', message: `contains placeholder "${p}"` })
      }
      return out
    },
  },

  {
    id: 'no-email-in-defaultvalue',
    severity: 'warn',
    docs: 'Env-var parameter defaults should be blank; a committed email leaks a dev address and is used only if the per-environment value is unset. Set current values per environment instead.',
    check(flow) {
      const out = []
      for (const [key, p] of Object.entries(params(flow.json))) {
        if (typeof p?.defaultValue === 'string' && EMAIL_RE.test(p.defaultValue)) {
          out.push({ location: `parameters['${key}'].defaultValue`, message: `hardcoded email "${p.defaultValue}" in a parameter default` })
        }
      }
      return out
    },
  },

  {
    id: 'no-secret-param-default',
    severity: 'error',
    docs: 'A parameter whose name implies a secret must not carry a committed default; secrets belong in a Secret-type env var read via RetrieveEnvironmentVariableSecretValue.',
    check(flow) {
      const out = []
      const secretRe = /password|secret|apikey|api key|token/i
      for (const [key, p] of Object.entries(params(flow.json))) {
        const name = `${key} ${p?.metadata?.schemaName ?? ''}`
        if (secretRe.test(name) && typeof p?.defaultValue === 'string' && p.defaultValue.trim() !== '') {
          out.push({ location: `parameters['${key}'].defaultValue`, message: `secret-like parameter has a non-empty committed default` })
        }
      }
      return out
    },
  },

  {
    id: 'http-uri-encodes-client-input',
    severity: 'error',
    docs: 'An HTTP action URI that interpolates client trigger input must wrap it in encodeUriComponent() to prevent query-string/URL injection (audit F1/F4).',
    check(flow) {
      const out = []
      for (const { node, path } of nodesOfType(flow.json, 'Http')) {
        const uri = node?.inputs?.uri
        if (typeof uri !== 'string') continue
        const total = (uri.match(/triggerBody\(\)/g) || []).length
        if (total === 0) continue
        const wrapped = (uri.match(/encodeUriComponent\(\s*triggerBody\(\)/g) || []).length
        if (wrapped < total) {
          out.push({ location: `${path}.inputs.uri`, message: `interpolates triggerBody() into the URI without encodeUriComponent (${wrapped}/${total} wrapped)` })
        }
      }
      return out
    },
  },

  {
    id: 'authenticated-flow-validates-token',
    severity: 'error',
    docs: 'A Power Pages flow that accepts an authToken must validate it server-side (look up sessionToken) before accessing data.',
    check(flow) {
      const out = []
      let takesAuthToken = false
      for (const t of Object.values(triggers(flow.json))) {
        const props = t?.inputs?.schema?.properties ?? {}
        for (const p of Object.values(props)) {
          if (typeof p?.title === 'string' && p.title.trim().toLowerCase() === 'authtoken') takesAuthToken = true
        }
      }
      if (takesAuthToken && !flow.raw.includes('sessionToken')) {
        out.push({ location: '(trigger)', message: 'accepts an authToken input but never references sessionToken — token is not validated server-side' })
      }
      return out
    },
  },

  {
    id: 'powerpages-trigger-fields-have-title',
    severity: 'warn',
    docs: 'Power Pages maps eventData to trigger inputs by TITLE; a trigger field without a title (or with the wrong title) causes a 400 IncorrectPayload when the SPA calls it.',
    check(flow) {
      const out = []
      for (const [tname, t] of Object.entries(triggers(flow.json))) {
        if (t?.kind !== 'PowerPages') continue
        const props = t?.inputs?.schema?.properties ?? {}
        for (const [pname, p] of Object.entries(props)) {
          if (!p || typeof p.title !== 'string' || p.title.trim() === '') {
            out.push({ location: `triggers.${tname}.inputs.schema.properties.${pname}`, message: 'Power Pages trigger field has no title (eventData maps by title)' })
          }
        }
      }
      return out
    },
  },

  {
    id: 'env-var-param-defined',
    severity: 'warn',
    docs: 'A parameter bound to an environment variable (metadata.schemaName) should have a matching definition in the Environmental Variables solution, else the reference is a typo or a missing/shared definition.',
    check(flow, ctx) {
      const out = []
      const known = ctx?.envVarSchemaNames
      if (!known || known.size === 0) return out // no env-var folder discovered; skip
      for (const [key, p] of Object.entries(params(flow.json))) {
        const schema = p?.metadata?.schemaName
        if (typeof schema === 'string' && schema.startsWith('smkb_') && !known.has(schema)) {
          out.push({ location: `parameters['${key}'].metadata.schemaName`, message: `env-var "${schema}" has no definition in the Environmental Variables folder (typo or missing/shared var — verify it exists)` })
        }
      }
      return out
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Global rules — operate on the whole solution, not one flow.
//   g = { flowFiles: string[] (basenames), customizationsXml: string,
//         envVarSchemaNames: Set<string>, envSolutionXml: string,
//         xmlFiles: { rel: string, raw: string }[] }
// ─────────────────────────────────────────────────────────────────────────────
export const globalRules = [
  {
    id: 'workflow-json-matches-customizations',
    severity: 'error',
    docs: 'Every flow JSON must be listed in Other/Customizations.xml (<JsonFileName>), or the JSON ships in the zip but Dataverse never creates the Workflow record; and every referenced file must exist.',
    check(g) {
      const out = []
      if (!g.customizationsXml) return out
      const referenced = new Set(
        [...g.customizationsXml.matchAll(/\/Workflows\/([^<>"]+\.json)/gi)].map((m) => m[1]),
      )
      for (const f of g.flowFiles || []) {
        if (!referenced.has(f)) out.push({ location: `Workflows/${f}`, message: 'flow JSON is not referenced in Other/Customizations.xml — it will not create a Dataverse Workflow record on import' })
      }
      for (const r of referenced) {
        if (!(g.flowFiles || []).includes(r)) out.push({ location: 'Other/Customizations.xml', message: `references /Workflows/${r} but no such file exists (stale entry)` })
      }
      return out
    },
  },
  {
    id: 'env-var-rootcomponents-complete',
    severity: 'error',
    docs: 'Every env-var definition needs a <RootComponent type="380"> entry in the Environmental Variables Solution.xml, or the variable is upserted but not linked to the solution (it will not travel through the pipeline to Stage/Prod).',
    check(g) {
      const out = []
      if (!g.envSolutionXml || !g.envVarSchemaNames || g.envVarSchemaNames.size === 0) return out
      const inRoot = new Set(
        [...g.envSolutionXml.matchAll(/type="380"[^>]*schemaName="([^"]+)"|schemaName="([^"]+)"[^>]*type="380"/g)]
          .map((m) => m[1] || m[2]),
      )
      for (const name of g.envVarSchemaNames) {
        if (!inRoot.has(name)) out.push({ location: 'Environmental Variables/Other/Solution.xml', message: `env var "${name}" has a definition but no <RootComponent type="380"> entry (won't travel through the pipeline)` })
      }
      return out
    },
  },
  {
    id: 'xml-no-placeholders',
    severity: 'error',
    docs: 'Unreplaced starter placeholders in solution/env-var XML must not reach a deploy.',
    check(g) {
      const out = []
      for (const { rel, raw } of g.xmlFiles || []) {
        for (const p of PLACEHOLDERS) {
          if (raw.includes(p)) out.push({ location: rel, message: `contains placeholder "${p}"` })
        }
      }
      return out
    },
  },
  {
    id: 'xml-ascii-hyphen-only',
    severity: 'warn',
    docs: 'Display names in solution/env-var XML must use ASCII "-"; a Unicode en/em dash is garbled by Hebrew-locale Windows (Windows-1255).',
    check(g) {
      const out = []
      for (const { rel, raw } of g.xmlFiles || []) {
        if (/[–—]/.test(raw)) out.push({ location: rel, message: 'contains a Unicode en/em dash — use ASCII "-"' })
      }
      return out
    },
  },
]
