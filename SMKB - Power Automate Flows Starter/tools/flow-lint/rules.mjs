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
    // Critical Rule 6: Dataverse is the data platform. SharePoint is a legacy interoperability path,
    // used only when the data already lives in a list and cannot move — and then it is DECLARED in
    // SOLUTION-SPEC.md §7 as the constraint it is.
    //
    // A warning, not an error, and deliberately so: a legacy dependency is legitimate, and a rule that
    // blocked the deploy would be bypassed by the first solution that genuinely needs a list. What it
    // buys is that an UNDECLARED SharePoint write is visible in review. The kit needed this because the
    // rule went unwritten and drifted exactly where it cost most: the worked examples under
    // `examples/` were genericized from a real SharePoint-backed solution, so for a while the most-
    // copied artefacts in the kit taught the legacy pattern — and the CheckOtp example contradicted the
    // Dataverse recipe it was supposed to illustrate.
    id: 'sharepoint-data-action',
    severity: 'warn',
    docs: 'Dataverse is the data platform (CLAUDE.md Critical Rule 6). A SharePoint action is a legacy interoperability path, allowed only when the data already lives in a list and cannot move - and then SOLUTION-SPEC.md §7 must declare it. Undeclared SharePoint data access is reported so it is visible in review rather than discovered later.',
    check(flow, ctx) {
      const out = []
      // Declared in §7? Then this solution has a real legacy dependency and the rule stands down
      // entirely - it has nothing further to say about how that data is reached.
      if (ctx?.sharePointDeclared) return out
      walk(def(flow.json).actions, (n, p) => {
        if (Array.isArray(n) || !n.inputs || typeof n.inputs !== 'object') return
        const host = n.inputs.host
        if (!host || typeof host !== 'object') return
        const ref = `${host.apiId ?? ''} ${host.connectionName ?? ''}`
        if (!/shared_sharepointonline/i.test(ref)) return
        out.push({
          location: p,
          message: `SharePoint action "${host.operationId ?? 'unknown'}" but SOLUTION-SPEC.md §7 declares no SharePoint dependency. Dataverse is the data platform (Critical Rule 6) - use ListRecords / CreateRecord / UpdateRecord. If the data genuinely already lives in a list and cannot move, declare it in §7 and this warning stops.`,
        })
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
      //
      // PLATFORM-NEUTRAL EVIDENCE. This used to require the literal string `sessionToken`, which is a
      // SharePoint COLUMN NAME from the solution the reference flows were genericized from - not a
      // convention of this kit. Dataverse sessions tables use `smkb_<prefix>_Token` (see the OTP
      // recipe), so a correct Dataverse implementation FAILED this error-severity rule: the kit's own
      // RevokeSession template did. Same drift as the examples themselves, one layer deeper.
      //
      // What actually constitutes evidence: an action INPUT that carries the caller's token into a
      // lookup. So either the legacy literal, or a token-shaped column name used together with a
      // reference to the trigger body - both halves required, so a passing mention cannot fake it.
      let validated = false
      walk(def(flow.json).actions, (n) => {
        if (Array.isArray(n) || !n.inputs) return
        const inputs = JSON.stringify(n.inputs)
        if (inputs.includes('sessionToken')) { validated = true; return }
        if (/(_token|authtoken)/i.test(inputs) && inputs.includes('triggerBody(')) validated = true
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
    id: 'openapi-action-has-authentication',
    severity: 'error',
    docs: "Every OpenApiConnection action in a solution-aware flow must pass `authentication: @parameters('$authentication')`, or the action does not bind the solution's connection reference at runtime. Author-time it looks fine and the flow imports. Evidence for the convention: across the kit's harvested production flows all 30 such actions carry it and none omit it — the only omissions were in hand-typed JSON, including two in a shipped template.",
    check(flow) {
      const WANT = "@parameters('$authentication')"
      const out = []
      walk(def(flow.json), (n, p) => {
        if (Array.isArray(n) || n.type !== 'OpenApiConnection') return
        if (!n.inputs || typeof n.inputs !== 'object' || Array.isArray(n.inputs)) return
        const a = n.inputs.authentication
        if (a === undefined) {
          out.push({ location: `${p}.inputs`, message: `OpenApiConnection action has no "authentication" — add "authentication": "${WANT}" or the action will not bind the solution's connection reference at runtime` })
        } else if (a !== WANT) {
          out.push({ location: `${p}.inputs.authentication`, message: `authentication is ${JSON.stringify(a)}, expected "${WANT}"` })
        }
      })
      return out
    },
  },

  {
    id: 'no-undeclared-trigger-reference',
    severity: 'error',
    docs: 'An action reading a trigger input the trigger schema does not declare. This is the failure mode with no symptom: `triggerBody()?[\'text_1\']` for an undeclared `text_1` does not error — it evaluates to null, so the row is written with an empty column and the run is marked Succeeded. It is the mirror of no-unused-trigger-inputs, which only catches the harmless direction (declared, never read). Found by writing a wrong flow by hand: a generated Dataverse example read text_1 while the schema declared text_2..text_6, and every other rule passed it.',
    check(flow) {
      const declared = new Set()
      let schemaCount = 0
      for (const t of Object.values(triggers(flow.json))) {
        const props = t?.inputs?.schema?.properties
        if (!props || typeof props !== 'object' || Array.isArray(props)) continue
        schemaCount++
        for (const k of Object.keys(props)) declared.add(k)
      }
      // No declared input schema at all (e.g. a Recurrence or raw Request trigger) means
      // there is nothing to contradict — a triggerBody() read cannot be judged. Skip.
      if (!schemaCount) return []

      // Both quote forms occur in real flows: the plain `?['name']`, and `?[''name'']`
      // inside an OData $filter where the quotes have been doubled. Capturing the doubled
      // form as `'name'` would report a phantom undeclared input, so normalize both.
      const REF = /triggerBody\(\)\s*\?\s*\[\s*'{1,2}([^'\]]+)'{1,2}\s*\]/g
      const out = []
      const reported = new Set()
      // Only strings the RUNTIME evaluates count. `description` is documentation, and this
      // kit's templates deliberately quote expressions in prose to explain them — the first
      // version of this rule flagged its own explanatory note about the bug it had just
      // found. `metadata` is likewise designer bookkeeping.
      const DOC_ONLY = new Set(['description', 'metadata'])
      walk(def(flow.json), (n, p) => {
        if (/(^|\.)metadata(\.|\[|$)/.test(p)) return
        const vals = Array.isArray(n) ? n : Object.entries(n).filter(([k]) => !DOC_ONLY.has(k)).map(([, v]) => v)
        for (const v of vals) {
          if (typeof v !== 'string') continue
          for (const m of v.matchAll(REF)) {
            const name = m[1]
            if (declared.has(name) || reported.has(name)) continue
            reported.add(name)
            out.push({ location: p, message: `reads trigger input "${name}", which the trigger schema does not declare — this evaluates to null at runtime with no error, so the value silently lands empty. Declare it, or reference the input that exists (declared: ${[...declared].sort().join(', ') || 'none'}).` })
          }
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
//   g = { flowFiles: string[] (basenames), customizationsXml: string, flowSolutionXml: string,
//         envVarSchemaNames: Set<string>, envSolutionXml: string,
//         xmlFiles: { rel: string, raw: string }[] }
// ─────────────────────────────────────────────────────────────────────────────

/** Workflow GUIDs, normalized to lowercase with braces stripped, from any XML id attribute. */
const normalizeGuid = (s) => String(s).replace(/[{}]/g, '').toLowerCase()

/**
 * Does SOLUTION-SPEC.md §7 declare a SharePoint dependency? Pure function so the self-test can pin it.
 *
 * Two bugs found the moment this was tested, both worth remembering:
 *
 * 1. The first version anchored the section with `(?=^##\s|\Z)`. **`\Z` is not an anchor in JavaScript** —
 *    it is an identity escape matching a literal "Z". It only appeared to work because §7 happens to be
 *    followed by §8; had §7 been the last section the match would have failed and every declaration
 *    would have been missed. Sections are split on headings now, no end anchor needed.
 *
 * 2. Worse: the shipped template's own §7 carries a blockquote explaining this rule, and that note
 *    contains the word SharePoint — so a naive "does §7 mention it" check was satisfied by the TEMPLATE,
 *    on every solution, from the moment it was cloned. The rule would have been silent forever. So
 *    blockquote lines are excluded: guidance lives in `>` quotes, a real declaration is a table row.
 */
export function specDeclaresSharePoint(specText) {
  if (!specText) return false
  const lines = String(specText).split(/\r?\n/)
  let inSeven = false
  for (const line of lines) {
    if (/^##\s/.test(line)) inSeven = /^##\s*7\./.test(line)
    else if (inSeven && !/^\s*>/.test(line) && /sharepoint/i.test(line)) return true
  }
  return false
}

/** Is this actually a GUID, or prose that happens to sit in an id attribute? */
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/**
 * Drop XML comments before scanning for data.
 *
 * Not optional, and the reason is a bug this very file shipped for one run: `Other/Customizations.xml`
 * documents the three-file rule in a header comment that includes the literal text
 * `<Workflow WorkflowId="{GUID}"> entry`, and `Other/Solution.xml` explains its placeholder rows in a
 * comment that quotes them. Scanning raw text therefore read the DOCUMENTATION as a declared workflow
 * and reported a missing RootComponent for a flow named "guid". That is precisely the failure
 * scripts/check-template-guards.mjs exists to prevent - a checker firing on the prose that explains it -
 * and it is worth remembering that a rule can trip the trap it was written to close.
 */
const stripXmlComments = (s) => String(s || '').replace(/<!--[\s\S]*?-->/g, '')
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
    // The third leg of the THREE-FILE RULE that Other/Customizations.xml documents at the top of
    // itself: a flow must appear in Workflows/*.json, in Customizations.xml as a <Workflow>, AND in
    // Solution.xml as a <RootComponent type="29">, with the same GUID in all three. Two of the
    // three pairings were checked; the Solution.xml leg was checked by nothing, in either
    // direction. Both failure modes are real and both are silent:
    //
    //   ORPHAN  - delete a flow skeleton (the documented "keep the one matching your trigger type
    //             and delete the other") and leave its RootComponent row, and the import declares a
    //             component for a workflow that does not ship.
    //   MISSING - add a flow and forget the row, and the import fails with "component not declared
    //             in the solution file as a root component" - the error the three-file rule exists
    //             to prevent, discovered at deploy time instead of lint time.
    //
    // Until now the only thing that caught the orphan was the deploy guard's all-zero sentinel
    // token, and only while the GUID was still the shipped placeholder - i.e. not at all once a real
    // GUID was in place.
    id: 'workflow-rootcomponents-match',
    severity: 'error',
    docs: 'Every flow needs a <RootComponent type="29"> entry in the Cloud Flows Solution.xml carrying its workflow GUID, and every such entry needs a flow that exists. A missing entry fails the import ("component not declared in the solution file as a root component"); an orphaned entry declares a component that does not ship, and is what a deleted flow skeleton leaves behind.',
    check(g) {
      const out = []
      if (!g.flowSolutionXml) return out
      // Comments stripped, and every candidate shape-checked as a GUID - see stripXmlComments above.
      // <RootComponent type="29" id="{GUID}" /> in either attribute order.
      const declared = new Set(
        [...stripXmlComments(g.flowSolutionXml)
          .matchAll(/type="29"[^>]*\bid="([^"]+)"|\bid="([^"]+)"[^>]*type="29"/g)]
          .map((m) => normalizeGuid(m[1] || m[2]))
          .filter((gu) => GUID_RE.test(gu)),
      )
      // A flow's GUID is the 36-char suffix of its filename; Customizations.xml carries the same
      // GUID in WorkflowId. Take the union so the rule still reports usefully when one of the other
      // two files is mid-edit rather than blaming Solution.xml for someone else's gap.
      const present = new Set()
      for (const f of g.flowFiles || []) {
        const m = /-([0-9A-Fa-f]{8}-(?:[0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12})\.json$/.exec(f)
        if (m) present.add(normalizeGuid(m[1]))
      }
      for (const m of stripXmlComments(g.customizationsXml).matchAll(/WorkflowId="([^"]+)"/g)) {
        const gu = normalizeGuid(m[1])
        if (GUID_RE.test(gu)) present.add(gu)
      }
      if (declared.size === 0 && present.size === 0) return out

      for (const guid of declared) {
        if (!present.has(guid)) {
          out.push({
            location: 'Other/Solution.xml',
            message: `<RootComponent type="29"> declares workflow ${guid} but no flow carries that GUID - a stale entry (typically left by deleting a flow skeleton without its RootComponent row)`,
          })
        }
      }
      for (const guid of present) {
        if (!declared.has(guid)) {
          out.push({
            location: 'Other/Solution.xml',
            message: `workflow ${guid} has no <RootComponent type="29"> entry - the import will fail with "component not declared in the solution file as a root component"`,
          })
        }
      }
      return out
    },
  },
  {
    id: 'env-var-rootcomponents-complete',
    severity: 'error',
    // Now BIDIRECTIONAL. It only ever checked definition -> RootComponent, so deleting a definition
    // folder and leaving its row went unreported - and that is the documented cleanup step for the
    // shipped example variable, so the gap was on the happy path. apply-config.ps1 then re-prefixes
    // the orphaned row on every run, so the solution imports a RootComponent for a definition that
    // does not ship.
    docs: 'Every env-var definition needs a <RootComponent type="380"> entry in the Environmental Variables Solution.xml or it is upserted but not linked to the solution (it will not travel through the pipeline to Stage/Prod) - and every such entry needs a definition that exists, or the import declares a variable that does not ship.',
    check(g) {
      const out = []
      if (!g.envSolutionXml) return out
      // Comments stripped for the same reason as the rule above: this file explains its own
      // placeholder rows in a comment, and the reverse direction added below would have read that
      // explanation as an orphaned RootComponent.
      const inRoot = new Set(
        [...stripXmlComments(g.envSolutionXml)
          .matchAll(/type="380"[^>]*schemaName="([^"]+)"|schemaName="([^"]+)"[^>]*type="380"/g)]
          .map((m) => m[1] || m[2]),
      )
      const defined = g.envVarSchemaNames ?? new Set()
      // No definitions discovered at all means the Env Vars starter was not found or is not
      // activated - not that every row is orphaned. Stay silent rather than reporting the whole file.
      if (defined.size === 0) return out

      for (const name of defined) {
        if (!inRoot.has(name)) out.push({ location: 'Environmental Variables/Other/Solution.xml', message: `env var "${name}" has a definition but no <RootComponent type="380"> entry (won't travel through the pipeline)` })
      }
      for (const name of inRoot) {
        if (!defined.has(name)) out.push({ location: 'Environmental Variables/Other/Solution.xml', message: `<RootComponent type="380"> declares env var "${name}" but no definition folder exists - a stale entry (typically left by deleting a definition without its RootComponent row)` })
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
