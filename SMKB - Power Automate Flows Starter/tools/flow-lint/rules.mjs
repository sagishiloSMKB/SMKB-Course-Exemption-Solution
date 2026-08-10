// ─────────────────────────────────────────────────────────────────────────────
// Flow-lint rule registry (rules-as-code).
//
// Each rule: { id, severity: 'error'|'warn', docs, check(flow, ctx) -> Finding[] }
//   flow = { name, path, raw, json }   (json is the parsed definition, BOM-stripped)
//   ctx  = { envVarSchemaNames: Set<string> }   (that is the whole context - if a rule
//          needs more, add the key in lint.mjs first; do not document it here only)
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

// The definition, or the document itself when there is no `properties.definition` wrapper.
// The fallback matters for FRAGMENT files - the OTP recipe's VALIDATE_AUTH_TOKEN_SNIPPET.json is
// a bare action tree meant to be pasted into a flow. With `?? {}` every rule walked an empty
// object and reported the fragment clean, including two >256-char descriptions that would fail
// activation the moment the snippet was pasted in. A real flow always has the wrapper, so this
// changes nothing for Workflows/.
const def = (json) => json?.properties?.definition ?? json ?? {}
const params = (json) => def(json).parameters ?? {}
const triggers = (json) => def(json).triggers ?? {}
const connRefs = (json) => json?.properties?.connectionReferences ?? {}

const EMAIL_RE = /[^@\s"]+@[^@\s"]+\.[a-z]{2,}/i
// Keep this list in step with the $placeholders array in the Flows starter's deploy.ps1 - that
// is the no-Node backstop for exactly the same invariant. It listed BOTH all-zero sentinels
// while this one listed only ...0001, so the second shipped example flow (and its
// <Workflow WorkflowId> / <RootComponent id> entries, which use ...0002) passed every lint
// while the deploy backstop blocked them: two gates, two answers, and the lint looked green.
export const PLACEHOLDERS = [
  'YourSolutionName', 'Your Solution Name', 'smkb_sol_',
  'your-default-value-here', '[yourid]', '[REPLACE', '[sol]',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
]

/**
 * The org-wide mandated sender. NOT per-solution data: the Flows README requires every flow to
 * send from this address, and the shipped Workflows/ skeletons carry it deliberately. Any rule
 * that flags "a hardcoded email" must exempt it, or its first run is red on correct files -
 * which is how a rule teaches people to ignore it.
 */
export const ORG_SENDER_RE = /^no[_-]?reply@smkb\.ac\.il$/i

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
    docs: 'Env-var parameter defaults should be blank; a committed email leaks a dev address and is used only if the per-environment value is unset. Set current values per environment instead. A recipient address hardcoded in an action input is the same leak. The org-wide mandated sender is exempt - it is a convention, not per-solution data.',
    check(flow) {
      const out = []
      for (const [key, p] of Object.entries(params(flow.json))) {
        if (typeof p?.defaultValue !== 'string') continue
        const m = p.defaultValue.match(EMAIL_RE)
        if (m && !ORG_SENDER_RE.test(m[0])) {
          out.push({ location: `parameters['${key}'].defaultValue`, message: `hardcoded email "${p.defaultValue}" in a parameter default` })
        }
      }
      // Also the recipient/CC/BCC side. A parameter default was only half the surface: an
      // address typed straight into a Send-an-email action leaks exactly the same way and was
      // invisible here. Scoped to inputs so a description mentioning an address is not a
      // finding, and the org sender is exempt - flagging it would make this rule red on every
      // correct shipped skeleton, which is worse than not having it.
      walk(def(flow.json), (n, p) => {
        if (Array.isArray(n) || !n.inputs || typeof n.inputs !== 'object') return
        for (const m of JSON.stringify(n.inputs).matchAll(new RegExp(EMAIL_RE.source, 'gi'))) {
          if (ORG_SENDER_RE.test(m[0])) continue
          out.push({ location: `${p}.inputs`, message: `hardcoded email "${m[0]}" in an action input - use an environment variable` })
        }
      })
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
      // Title matching, normalized. Keying on the single literal 'authtoken' meant a field
      // titled "auth token", "authToken " or "sessionToken" - all of which Power Pages maps
      // identically - silently exempted the flow from an ERROR-severity security rule.
      const isTokenTitle = (s) =>
        typeof s === 'string' && /^(auth|session)?token$/.test(s.replace(/[^a-z]/gi, '').toLowerCase())
      let takesAuthToken = false
      for (const t of Object.values(triggers(flow.json))) {
        const props = t?.inputs?.schema?.properties ?? {}
        for (const [pname, p] of Object.entries(props)) {
          if (isTokenTitle(p?.title) || isTokenTitle(pname)) takesAuthToken = true
        }
      }
      if (!takesAuthToken) return out
      // Evidence must be a real lookup, not the WORD. `flow.raw.includes('sessionToken')` was
      // satisfied by any occurrence anywhere in the file - including
      //   "description": "TODO: validate the sessionToken here"
      // which is the precise state this rule exists to reject. So look only at action INPUTS
      // (a $filter, a URI, a parameter value), never at description/metadata prose.
      // Walk `actions` only, never the whole definition. The TRIGGER's own
      // inputs.schema holds the field titles, so a field literally titled "sessionToken"
      // counted as its own validation - the flow accepted a token and proved nothing.
      let validated = false
      walk(def(flow.json).actions, (n) => {
        if (Array.isArray(n) || !n.inputs) return
        if (JSON.stringify(n.inputs).includes('sessionToken')) validated = true
      })
      if (!validated) {
        out.push({
          location: '(trigger)',
          message: 'accepts an auth token input but no ACTION INPUT references sessionToken - the token is not validated server-side (a mention in a description or comment does not count)',
        })
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
        // No prefix filter. `metadata.schemaName` on a flow parameter has exactly one meaning -
        // an environment-variable binding - so every value belongs in the cross-check. Requiring
        // `smkb_` meant a solution built under any other publisher prefix had this rule silently
        // switched off, and the kit's own convention (smkb_<prefix>_Name) is not the only shape
        // a real flow carries.
        if (typeof schema === 'string' && schema !== '' && !known.has(schema)) {
          out.push({ location: `parameters['${key}'].metadata.schemaName`, message: `env-var "${schema}" has no definition in the Environmental Variables folder (typo or missing/shared var — verify it exists)` })
        }
      }
      return out
    },
  },

  {
    id: 'securedata-only-on-connector-actions',
    severity: 'error',
    docs: 'runtimeConfiguration.secureData is accepted only on OpenApiConnection and Http ACTIONS. Anywhere else — a Compose, a ParseJson, or a trigger — the solution imports "successfully" and the flow then fails activation with InvalidSecureDataConfiguration and stays in Draft, so every portal call to it fails.',
    check(flow) {
      const out = []
      // Allow-list, not a deny-list for Compose alone: ParseJson, Select,
      // InitializeVariable and every other action type fail activation identically,
      // so enumerating the two that work is both shorter and complete.
      const SECUREABLE = new Set(['OpenApiConnection', 'Http'])
      walk(def(flow.json), (n, p) => {
        if (Array.isArray(n)) return
        if (!n.runtimeConfiguration || typeof n.runtimeConfiguration !== 'object') return
        if (!('secureData' in n.runtimeConfiguration)) return
        if (typeof n.type !== 'string') return
        const loc = `${p}.runtimeConfiguration.secureData`
        if (p === 'triggers' || p.startsWith('triggers.')) {
          // Distinct cause, same symptom: Microsoft does not support Secure Inputs on
          // the trigger of a flow invoked from Power Pages ("passing a parameter to a
          // flow configured with secure inputs isn't available").
          out.push({ location: loc, message: `secureData on a trigger ("${n.type}") — not supported on a Power-Pages-invoked flow trigger. Secure the internal actions that handle the value instead.` })
          return
        }
        if (SECUREABLE.has(n.type)) return
        out.push({ location: loc, message: `secureData on a "${n.type}" action — valid only on OpenApiConnection/Http. The flow will import but fail activation (InvalidSecureDataConfiguration) and stay in Draft. Remove it: a sensitive value held here is covered by run history being admin-only, or inline it into a secured connector action.` })
      })
      return out
    },
  },

  {
    id: 'keyvault-secret-read-is-secured',
    severity: 'error',
    docs: 'An action reading a Secret environment variable (the Dataverse unbound action RetrieveEnvironmentVariableSecretValue) must mark its OUTPUTS secure, or the secret is written to run history in clear text.',
    check(flow) {
      const out = []
      walk(def(flow.json), (n, p) => {
        if (Array.isArray(n) || n.type !== 'OpenApiConnection') return
        // Match on the operation + action name, case-insensitively and without
        // depending on parameter order.
        const opId = n.inputs?.host?.operationId
        const actionName = n.inputs?.parameters?.actionName
        if (typeof opId !== 'string' || opId.toLowerCase() !== 'performunboundaction') return
        if (typeof actionName !== 'string' || actionName.toLowerCase() !== 'retrieveenvironmentvariablesecretvalue') return
        const props = n.runtimeConfiguration?.secureData?.properties
        const secured = Array.isArray(props) && props.some((x) => typeof x === 'string' && x.toLowerCase() === 'outputs')
        if (!secured) {
          out.push({ location: `${p}.runtimeConfiguration.secureData`, message: 'reads a Secret env var without securing its outputs — the secret value lands in run history in clear text. Set runtimeConfiguration.secureData.properties to ["outputs"], and secure the INPUTS of whatever consumes it.' })
        }
      })
      return out
    },
  },

  {
    id: 'no-unused-trigger-inputs',
    severity: 'warn',
    docs: 'A Power Pages trigger input the flow never references is dead surface: the SPA can send it, nothing validates it, and a reviewer cannot tell whether it was meant to select a record. Remove it, or consume it. (The control that actually prevents IDOR is resolving the target record from the session row — see FLOW_SNIPPETS.md.)',
    check(flow) {
      const out = []
      for (const [tname, t] of Object.entries(triggers(flow.json))) {
        if (t?.kind !== 'PowerPages') continue
        const props = t?.inputs?.schema?.properties ?? {}
        const schemaPath = `triggers.${tname}.inputs.schema`
        // Collect every string VALUE in the definition except inside this trigger's own
        // input schema. A property KEY is not a value, so the declaration itself never
        // counts as a use; excluding the schema subtree by path also drops the
        // `required: [...]` array, which would otherwise mask every unused input.
        const seen = []
        walk(def(flow.json), (n, p) => {
          if (p === schemaPath || p.startsWith(`${schemaPath}.`) || p.startsWith(`${schemaPath}[`)) return
          const vals = Array.isArray(n) ? n : Object.values(n)
          for (const v of vals) if (typeof v === 'string') seen.push(v)
        })
        const haystack = seen.join('\n')
        for (const [pname, p] of Object.entries(props)) {
          if (haystack.includes(pname)) continue
          const title = typeof p?.title === 'string' && p.title.trim() ? p.title.trim() : pname
          out.push({ location: `${schemaPath}.properties.${pname}`, message: `trigger input "${title}" (${pname}) is declared but never referenced anywhere in the flow — dead input surface` })
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
