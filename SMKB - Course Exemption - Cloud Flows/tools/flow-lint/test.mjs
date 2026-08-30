#!/usr/bin/env node
// Self-test for the flow-lint rules: each rule must FIRE on a crafted bad input and
// stay silent on a good one. Run: node tools/flow-lint/test.mjs   (exit 0 = all pass)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rules, globalRules, specDeclaresSharePoint, DEPLOY_TIME_RULE_IDS } from './rules.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const byId = Object.fromEntries(rules.map((r) => [r.id, r]))
const globalById = Object.fromEntries(globalRules.map((r) => [r.id, r]))
let pass = 0, fail = 0
const results = []

// Per rule id: did an assertion below expect it to FIRE (>0 findings), and did one expect it
// to stay SILENT (0 findings)? Both are required - see "Coverage" at the end. Tracking only
// "fired at least once" let a rule ship with no evidence that it can be satisfied, which is the
// half that catches a rule so broad it flags correct files.
const exercised = new Map()
const note = (id, expected) => {
  const e = exercised.get(id) ?? { fired: false, silent: false }
  if (expected > 0) e.fired = true
  else e.silent = true
  exercised.set(id, e)
}

/** Assert `rule(flow, ctx)` returns exactly `expected` findings. */
function expect(id, label, flow, ctx, expected) {
  const rule = byId[id]
  if (!rule) { results.push(`FAIL ${id} :: ${label} :: rule not found`); fail++; return }
  note(id, expected)
  const n = (rule.check(flow, ctx) || []).length
  if (n === expected) { results.push(`ok   ${id} :: ${label} (${n})`); pass++ }
  else { results.push(`FAIL ${id} :: ${label} :: expected ${expected} findings, got ${n}`); fail++ }
}

/** Assert a global rule returns exactly `expected` findings for `gctx`. */
function expectGlobal(id, label, gctx, expected) {
  const rule = globalById[id]
  if (!rule) { results.push(`FAIL ${id} :: ${label} :: global rule not found`); fail++; return }
  note(id, expected)
  const n = (rule.check(gctx) || []).length
  if (n === expected) { results.push(`ok   ${id} :: ${label} (${n})`); pass++ }
  else { results.push(`FAIL ${id} :: ${label} :: expected ${expected} findings, got ${n}`); fail++ }
}

const flow = (definition, extra = {}, raw = '') => ({
  name: 'test', path: 'test.json', raw,
  json: { properties: { definition, ...extra } },
})

// description-max-length
expect('description-max-length', 'bad: 300-char description',
  flow({ actions: { A: { type: 'Compose', description: 'x'.repeat(300) } } }), {}, 1)
expect('description-max-length', 'good: 256-char description',
  flow({ actions: { A: { type: 'Compose', description: 'x'.repeat(256) } } }), {}, 0)

// connection-runtime-embedded
expect('connection-runtime-embedded', 'bad: invoker connection',
  flow({}, { connectionReferences: { c: { runtimeSource: 'invoker' } } }), {}, 1)
expect('connection-runtime-embedded', 'good: embedded connection',
  flow({}, { connectionReferences: { c: { runtimeSource: 'embedded' } } }), {}, 0)

// connection-reference-complete
expect('connection-reference-complete', 'bad: missing logical + api name',
  flow({}, { connectionReferences: { c: { runtimeSource: 'embedded' } } }), {}, 2)
expect('connection-reference-complete', 'good: complete',
  flow({}, { connectionReferences: { c: { connection: { connectionReferenceLogicalName: 'x' }, api: { name: 'y' } } } }), {}, 0)

// no-placeholders (raw-based)
expect('no-placeholders', 'bad: [yourid] in raw', flow({}, {}, 'blah [yourid] blah'), {}, 1)
expect('no-placeholders', 'good: clean raw', flow({}, {}, 'all real values'), {}, 0)

// no-email-in-defaultvalue
expect('no-email-in-defaultvalue', 'bad: email default',
  flow({ parameters: { P: { defaultValue: 'dev@smkb.ac.il', type: 'String' } } }), {}, 1)
expect('no-email-in-defaultvalue', 'good: blank default',
  flow({ parameters: { P: { defaultValue: '', type: 'String' } } }), {}, 0)
expect('no-email-in-defaultvalue', 'bad: recipient hardcoded in an action input',
  flow({ actions: { Mail: { type: 'OpenApiConnection', inputs: { parameters: { 'emailMessage/To': 'someone@smkb.ac.il' } } } } }), {}, 1)
// The org-wide mandated sender is a CONVENTION, not per-solution data - the Flows README requires
// it and every shipped skeleton carries it. A rule that flags it would be red on correct files on
// its very first run, which is how a rule teaches people to bypass the linter.
expect('no-email-in-defaultvalue', 'good: the org sender is exempt',
  flow({ actions: { Mail: { type: 'OpenApiConnection', inputs: { parameters: { 'emailMessage/From': 'NoReply@smkb.ac.il' } } } } }), {}, 0)
expect('no-email-in-defaultvalue', 'good: an address mentioned in a description is not a leak',
  flow({ actions: { C: { type: 'Compose', description: 'see dev@smkb.ac.il for help', inputs: 'x' } } }), {}, 0)
// THE regression, reported from a real solution built on this kit. A Dataverse lookup write is
// spelled `item/<logical name>@odata.bind` - the documented and only way to do it - and matching
// against JSON.stringify(inputs) read that KEY as an email address. Critical Rule 6 makes
// Dataverse relationships the default, so every solution writing a lookup got false findings on
// its first lint, on the one rule meant to make a real leaked address obvious.
expect('no-email-in-defaultvalue', 'good: an @odata.bind lookup KEY is not an email',
  flow({ actions: { Create: { type: 'OpenApiConnection', inputs: { parameters: {
    entityName: 'smkb_prp_placements',
    'item/smkb_prp_mentorteacherid@odata.bind': '/smkb_prp_mentors(00000000-0000-0000-0000-000000000001)',
    'item/smkb_prp_siteid@odata.bind': "@{concat('/smkb_prp_sites(', triggerBody()?['text'], ')')}",
  } } } } }), {}, 0)
// A VALUE can carry an annotation too: reading a lookup's bind target out of an earlier action's
// output puts `smkb_x@odata.bind` inside an expression string.
expect('no-email-in-defaultvalue', 'good: an annotation inside a value is not an email either',
  flow({ actions: { C: { type: 'Compose', inputs: "@{body('Get')?['value'][0]['smkb_prp_mentorid@odata.bind']}" } } }), {}, 0)
// ...but the exemption is by annotation NAME, so a real address at a lookalike domain still fires.
expect('no-email-in-defaultvalue', 'bad: a real address at odata.com is still reported',
  flow({ actions: { Mail: { type: 'OpenApiConnection', inputs: { parameters: { 'emailMessage/To': 'ops@odata.com' } } } } }), {}, 1)
// And a real leak nested deeper than the top level of inputs is still found.
expect('no-email-in-defaultvalue', 'bad: a leak nested inside an inputs array is still found',
  flow({ actions: { Mail: { type: 'OpenApiConnection', inputs: { parameters: {
    'emailMessage/To': ['a@example.org'] } } } } }), {}, 1)

// sharepoint-data-action — Critical Rule 6. Dataverse is the data platform; SharePoint is a declared
// legacy path. The rule exists because that rule went unwritten and the worked examples drifted to
// SharePoint, teaching the legacy pattern from the most-copied artefacts in the kit.
const spAction = (op) => ({
  actions: { Read: { type: 'OpenApiConnection', inputs: { host: {
    connectionName: 'shared_sharepointonline_sol', operationId: op,
    apiId: '/providers/Microsoft.PowerApps/apis/shared_sharepointonline' } } } },
})
const dvAction = {
  actions: { Read: { type: 'OpenApiConnection', inputs: { host: {
    connectionName: 'shared_commondataserviceforapps', operationId: 'ListRecords',
    apiId: '/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps' } } } },
}
expect('sharepoint-data-action', 'bad: SharePoint read with no §7 declaration',
  flow(spAction('GetItems')), { sharePointDeclared: false }, 1)
expect('sharepoint-data-action', 'bad: SharePoint write with no §7 declaration',
  flow(spAction('PatchItem')), {}, 1)
// The legacy path is legitimate WHEN DECLARED — otherwise the first solution that genuinely needs a
// list would learn to ignore the linter, which is worse than not having the rule.
expect('sharepoint-data-action', 'good: declared in SOLUTION-SPEC §7',
  flow(spAction('GetItems')), { sharePointDeclared: true }, 0)
expect('sharepoint-data-action', 'good: Dataverse is never reported',
  flow(dvAction), { sharePointDeclared: false }, 0)

// ── specDeclaresSharePoint — the gate the rule above keys on ──
// Pinned directly, because every bug it had was in the PARSING, not the rule: an anchor that
// isn't an anchor (`\Z`), and the template's own explanatory blockquote counting as a
// declaration, which silenced the rule for every solution that never touched §7.
const expectSpec = (label, text, want) => {
  const got = specDeclaresSharePoint(text)
  if (got === want) { results.push(`ok   specDeclaresSharePoint :: ${label} (${got})`); pass++ }
  else { results.push(`FAIL specDeclaresSharePoint :: ${label} :: expected ${want}, got ${got}`); fail++ }
}
const spec = (body) => `# Spec\n\n## 6. Interfaces\n\nnothing here\n\n${body}\n\n## 8. Design\n\nSharePoint is mentioned here too\n`
expectSpec('empty input is not a declaration', '', false)
expectSpec('null input is not a declaration', null, false)
expectSpec('a real §7 declaration', spec('## 7. External systems\n\n| Legacy HR list (SharePoint) | in | staff rows | Entra |'), true)
// THE regression. The shipped template's §7 carries a blockquote explaining the SharePoint
// carve-out. Reading that as a declaration made every solution exempt by default — the exact
// inverse of the rule's purpose, and invisible because the rule simply never fired.
expectSpec('the template blockquote alone is NOT a declaration', spec('## 7. External systems\n\n> **Reading or writing an existing SharePoint list? Declare it here.** Dataverse is this solution\'s\n> platform; SharePoint is a legacy interoperability path.'), false)
expectSpec('a mention outside §7 does not count', spec('## 7. External systems\n\n| [FILL IN] | in | rows | key |'), false)
expectSpec('a declaration after the blockquote still counts', spec('## 7. External systems\n\n> **Reading a SharePoint list? Declare it here.**\n\n| Payroll list on SharePoint | out | payments | key |'), true)

// And against the REAL shipped file, so the template can never drift into exempting itself.
{
  const specPath = path.resolve(__dirname, '..', '..', '..', 'SOLUTION-SPEC.md')
  if (fs.existsSync(specPath)) {
    expectSpec('the shipped SOLUTION-SPEC.md template does not exempt itself',
      fs.readFileSync(specPath, 'utf8'), false)
  } else {
    results.push('ok   specDeclaresSharePoint :: shipped template not present (skipped)'); pass++
  }
}

// no-secret-param-default
expect('no-secret-param-default', 'bad: password param with default',
  flow({ parameters: { 'SMS Password (smkb_Pw)': { defaultValue: 'hunter2', type: 'String' } } }), {}, 1)
expect('no-secret-param-default', 'good: password param blank',
  flow({ parameters: { 'SMS Password (smkb_Pw)': { defaultValue: '', type: 'String' } } }), {}, 0)

// http-uri-encodes-client-input
expect('http-uri-encodes-client-input', 'bad: unencoded triggerBody in URI',
  flow({ actions: { H: { type: 'Http', inputs: { uri: "@concat('https://x?d=', triggerBody()?['text'])" } } } }), {}, 1)
expect('http-uri-encodes-client-input', 'good: encoded triggerBody',
  flow({ actions: { H: { type: 'Http', inputs: { uri: "@concat('https://x?d=', encodeUriComponent(triggerBody()?['text']))" } } } }), {}, 0)
expect('http-uri-encodes-client-input', 'good: no client input',
  flow({ actions: { H: { type: 'Http', inputs: { uri: 'https://static.example' } } } }), {}, 0)

// authenticated-flow-validates-token
// The evidence must be a real lookup in an ACTION INPUT. It used to be `raw.includes`, which any
// occurrence anywhere satisfied - including a "TODO: check the sessionToken" description, i.e.
// precisely the unvalidated state this ERROR-severity rule exists to reject.
const authTrigger = (title = 'authToken') => ({
  triggers: { manual: { kind: 'PowerPages', inputs: { schema: { properties: { text: { title, type: 'string' } } } } } },
})
const lookup = { actions: { Q: { type: 'OpenApiConnection', inputs: { parameters: { $filter: "sessionToken eq 'x'" } } } } }
expect('authenticated-flow-validates-token', 'bad: authToken input, no session lookup',
  flow(authTrigger()), {}, 1)
expect('authenticated-flow-validates-token', 'bad: sessionToken only in a description (a TODO does not validate anything)',
  flow({ ...authTrigger(), actions: { C: { type: 'Compose', description: 'TODO: validate the sessionToken here', inputs: 'x' } } }), {}, 1)
expect('authenticated-flow-validates-token', 'good: authToken input + sessionToken in an action input',
  flow({ ...authTrigger(), ...lookup }), {}, 0)
// THE DATAVERSE SHAPE. `sessionToken` is a SharePoint column name from the solution the reference
// flows came from; this kit's Dataverse sessions table uses `smkb_<prefix>_Token`. Requiring the
// literal made a correct Dataverse implementation fail an ERROR rule - the kit's own RevokeSession
// template did exactly that. Evidence is now the token-shaped column PLUS a trigger-body reference.
const dvLookup = { actions: { Q: { type: 'OpenApiConnection', inputs: { parameters: {
  entityName: 'smkb_sol_sessions',
  $filter: "smkb_sol_token eq '@{triggerBody()?['authToken']}'" } } } } }
expect('authenticated-flow-validates-token', 'good: Dataverse session lookup (smkb_*_token + triggerBody)',
  flow({ ...authTrigger(), ...dvLookup }), {}, 0)
// Both halves required, so a bare mention still cannot satisfy it.
expect('authenticated-flow-validates-token', 'bad: a token-shaped name with no trigger-body reference',
  flow({ ...authTrigger(), actions: { Q: { type: 'Compose', inputs: 'smkb_sol_token' } } }), {}, 1)
// Title normalization: Power Pages maps all of these identically, so all must be caught.
expect('authenticated-flow-validates-token', 'bad: title "auth token" (space) still requires validation',
  flow(authTrigger('auth token')), {}, 1)
expect('authenticated-flow-validates-token', 'bad: title "sessionToken" still requires validation',
  flow(authTrigger('sessionToken')), {}, 1)
expect('authenticated-flow-validates-token', 'good: public flow (no token input)',
  flow(authTrigger('bankCode')), {}, 0)

// powerpages-trigger-fields-have-title
expect('powerpages-trigger-fields-have-title', 'bad: field without title',
  flow({ triggers: { manual: { kind: 'PowerPages', inputs: { schema: { properties: { text: { type: 'string' } } } } } } }), {}, 1)
expect('powerpages-trigger-fields-have-title', 'good: field titled',
  flow({ triggers: { manual: { kind: 'PowerPages', inputs: { schema: { properties: { text: { title: 'authToken' } } } } } } }), {}, 0)

// env-var-param-defined
const evCtx = { envVarSchemaNames: new Set(['smkb_OK']) }
expect('env-var-param-defined', 'bad: unknown schemaName',
  flow({ parameters: { P: { metadata: { schemaName: 'smkb_NOPE' } } } }), evCtx, 1)
expect('env-var-param-defined', 'good: known schemaName',
  flow({ parameters: { P: { metadata: { schemaName: 'smkb_OK' } } } }), evCtx, 0)

// securedata-only-on-connector-actions
const SECURE_OUT = { secureData: { properties: ['outputs'] } }
const SECURE_IN = { secureData: { properties: ['inputs'] } }
expect('securedata-only-on-connector-actions', 'bad: secureData on a Compose',
  flow({ actions: { C: { type: 'Compose', runtimeConfiguration: SECURE_OUT } } }), {}, 1)
expect('securedata-only-on-connector-actions', 'bad: secureData on a ParseJson',
  flow({ actions: { P: { type: 'ParseJson', runtimeConfiguration: SECURE_OUT } } }), {}, 1)
expect('securedata-only-on-connector-actions', 'bad: nested inside a Scope',
  flow({ actions: { S: { type: 'Scope', actions: { C: { type: 'Compose', runtimeConfiguration: SECURE_OUT } } } } }), {}, 1)
expect('securedata-only-on-connector-actions', 'bad: secureData on a trigger',
  flow({ triggers: { manual: { type: 'Request', kind: 'PowerPages', runtimeConfiguration: SECURE_IN } } }), {}, 1)
expect('securedata-only-on-connector-actions', 'good: secureData outputs on OpenApiConnection',
  flow({ actions: { K: { type: 'OpenApiConnection', runtimeConfiguration: SECURE_OUT } } }), {}, 0)
expect('securedata-only-on-connector-actions', 'good: secureData inputs on Http',
  flow({ actions: { H: { type: 'Http', runtimeConfiguration: SECURE_IN } } }), {}, 0)
expect('securedata-only-on-connector-actions', 'good: Compose with no secureData',
  flow({ actions: { C: { type: 'Compose', runtimeConfiguration: { concurrency: { repetitions: 1 } } } } }), {}, 0)

// keyvault-secret-read-is-secured
const secretRead = (runtimeConfiguration) => ({
  actions: {
    GetSecret: {
      type: 'OpenApiConnection',
      inputs: {
        host: { connectionName: 'shared_commondataserviceforapps', operationId: 'PerformUnboundAction' },
        parameters: { actionName: 'RetrieveEnvironmentVariableSecretValue', 'item/EnvironmentVariableName': 'smkb_ApiKey' },
      },
      ...(runtimeConfiguration ? { runtimeConfiguration } : {}),
    },
  },
})
expect('keyvault-secret-read-is-secured', 'bad: secret read with no secureData',
  flow(secretRead(null)), {}, 1)
expect('keyvault-secret-read-is-secured', 'bad: secret read securing inputs only',
  flow(secretRead(SECURE_IN)), {}, 1)
expect('keyvault-secret-read-is-secured', 'good: secret read securing outputs',
  flow(secretRead(SECURE_OUT)), {}, 0)
expect('keyvault-secret-read-is-secured', 'good: unrelated unbound action',
  flow({ actions: { A: { type: 'OpenApiConnection', inputs: { host: { operationId: 'PerformUnboundAction' }, parameters: { actionName: 'WhoAmI' } } } } }), {}, 0)

// no-unused-trigger-inputs
const ppTrigger = (props) => ({
  triggers: { manual: { kind: 'PowerPages', inputs: { schema: { properties: props, required: Object.keys(props) } } } },
})
expect('no-unused-trigger-inputs', 'bad: declared input never referenced',
  flow({ ...ppTrigger({ text: { title: 'authToken' }, text_1: { title: 'lecturerId' } }),
    actions: { A: { type: 'Compose', inputs: "@triggerBody()?['text']" } } }), {}, 1)
expect('no-unused-trigger-inputs', 'good: every input consumed',
  flow({ ...ppTrigger({ text: { title: 'authToken' }, text_1: { title: 'voucherId' } }),
    actions: { A: { type: 'Compose', inputs: "@concat(triggerBody()?['text'], triggerBody()?['text_1'])" } } }), {}, 0)
expect('no-unused-trigger-inputs', 'good: not a Power Pages trigger',
  flow({ triggers: { manual: { kind: 'Button', inputs: { schema: { properties: { text_9: { title: 'x' } } } } } } }), {}, 0)

// openapi-action-has-authentication — binds the solution's connection reference. Omitting it
// imports fine and fails at runtime. Found by auditing the whole kit: all 30 such actions in the
// harvested production flows carry it; the 7 omissions were all hand-typed, 2 in a shipped template.
const AUTH = "@parameters('$authentication')"
const conn = (inputs) => flow({ actions: { A: { type: 'OpenApiConnection', inputs } } })
expect('openapi-action-has-authentication', 'bad: no authentication key',
  conn({ host: { operationId: 'ListRecords' }, parameters: { entityName: 't' } }), {}, 1)
expect('openapi-action-has-authentication', 'bad: wrong authentication value',
  conn({ host: { operationId: 'ListRecords' }, authentication: '@parameters($conn)' }), {}, 1)
expect('openapi-action-has-authentication', 'good: the canonical value',
  conn({ host: { operationId: 'ListRecords' }, authentication: AUTH }), {}, 0)
expect('openapi-action-has-authentication', 'good: a non-connector action needs none',
  flow({ actions: { A: { type: 'Compose', inputs: 'x' } } }), {}, 0)

// no-undeclared-trigger-reference — the mirror direction, and the dangerous one.
// The regression that produced this rule: a hand-converted Dataverse example wrote
// item/smkb_name from text_1 while the schema declared text_2..text_6. Every other rule
// passed it, and at runtime the column would just be written empty.
expect('no-undeclared-trigger-reference', 'bad: reads an input the schema never declares',
  flow({ ...ppTrigger({ text: { title: 'authToken' }, text_2: { title: 'faculty' } }),
    actions: { A: { type: 'OpenApiConnection', inputs: { parameters: { 'item/smkb_name': "@triggerBody()?['text_1']" } } } } }), {}, 1)
expect('no-undeclared-trigger-reference', 'bad: reported once per name, not per occurrence',
  flow({ ...ppTrigger({ text: { title: 'authToken' } }),
    actions: { A: { type: 'Compose', inputs: "@triggerBody()?['ghost']" },
      B: { type: 'Compose', inputs: "@concat(triggerBody()?['ghost'], triggerBody()?['ghost'])" } } }), {}, 1)
expect('no-undeclared-trigger-reference', 'good: every read is declared',
  flow({ ...ppTrigger({ text: { title: 'authToken' }, text_2: { title: 'faculty' } }),
    actions: { A: { type: 'Compose', inputs: "@concat(triggerBody()?['text'], triggerBody()?['text_2'])" } } }), {}, 0)
// The doubled-quote form appears inside OData $filter strings in real flows. Capturing it
// naively yields the name "'email'", which is declared nowhere — a phantom finding.
expect('no-undeclared-trigger-reference', "good: doubled-quote OData form is normalized, not read as \"'email'\"",
  flow({ ...ppTrigger({ email: { title: 'email' } }),
    actions: { A: { type: 'OpenApiConnection', inputs: { parameters: { $filter: "smkb_email eq '@{triggerBody()?[''email'']}'" } } } } }), {}, 0)
// Documentation is not evaluated at runtime. The first version of this rule flagged the
// very note that was written to explain the bug it had just found in RevokeSession.
expect('no-undeclared-trigger-reference', 'good: an expression quoted in a description is prose, not a read',
  flow({ ...ppTrigger({ authToken: { title: 'authToken' } }),
    actions: { A: { type: 'Compose', description: "was reading an undeclared triggerBody()?['email'] that always rendered '(unknown)'", inputs: "@triggerBody()?['authToken']" } } }), {}, 0)
// A trigger with no declared schema (Recurrence, raw Request) cannot contradict a read.
expect('no-undeclared-trigger-reference', 'good: no input schema means nothing to contradict',
  flow({ triggers: { Recurrence: { type: 'Recurrence' } },
    actions: { A: { type: 'Compose', inputs: "@triggerBody()?['whatever']" } } }), {}, 0)

// ── Global rules ──
// workflow-json-matches-customizations
expectGlobal('workflow-json-matches-customizations', 'bad: flow not referenced',
  { flowFiles: ['sol_x-GUID.json'], customizationsXml: '<Workflows></Workflows>' }, 1)
expectGlobal('workflow-json-matches-customizations', 'bad: stale reference',
  { flowFiles: [], customizationsXml: '<JsonFileName>/Workflows/sol_y-GUID.json</JsonFileName>' }, 1)
expectGlobal('workflow-json-matches-customizations', 'good: referenced + exists',
  { flowFiles: ['sol_x-GUID.json'], customizationsXml: '<JsonFileName>/Workflows/sol_x-GUID.json</JsonFileName>' }, 0)

// workflow-rootcomponents-match — the third leg of the three-file rule, both directions.
const FLOW_GUID_A = 'e0000000-0001-4000-8000-000000000001'
const FLOW_GUID_B = 'e0000000-0002-4000-8000-000000000002'
const rootRow = (g) => `<RootComponent type="29" id="{${g}}" behavior="0" />`
expectGlobal('workflow-rootcomponents-match', 'good: JSON + RootComponent agree',
  { flowFiles: [`smkb_x_Flow-${FLOW_GUID_A}.json`], flowSolutionXml: rootRow(FLOW_GUID_A) }, 0)
// THE orphan this rule was added for: the documented "delete the skeleton you don't use" step,
// done without removing its RootComponent row. Nothing caught this once the GUID was real.
expectGlobal('workflow-rootcomponents-match', 'bad: orphaned RootComponent (skeleton deleted, row left)',
  { flowFiles: [], flowSolutionXml: rootRow(FLOW_GUID_A) }, 1)
expectGlobal('workflow-rootcomponents-match', 'bad: flow with no RootComponent row (import would fail)',
  { flowFiles: [`smkb_x_Flow-${FLOW_GUID_A}.json`], flowSolutionXml: '<RootComponents></RootComponents>' }, 1)
// Case and braces must not decide the answer - XML carries {UPPER}, filenames carry lower.
expectGlobal('workflow-rootcomponents-match', 'good: braces and case are normalized',
  { flowFiles: [`smkb_x_Flow-${FLOW_GUID_A}.json`], flowSolutionXml: `<RootComponent type="29" id="{${FLOW_GUID_A.toUpperCase()}}" />` }, 0)
// A Customizations.xml WorkflowId counts as "the flow exists", so a mid-edit repo is not blamed
// on Solution.xml for a gap that belongs to another file.
expectGlobal('workflow-rootcomponents-match', 'good: known via Customizations.xml WorkflowId',
  { flowFiles: [], customizationsXml: `<Workflow WorkflowId="{${FLOW_GUID_B}}">`, flowSolutionXml: rootRow(FLOW_GUID_B) }, 0)
expectGlobal('workflow-rootcomponents-match', 'good: no Solution.xml at all (starter absent) is silent',
  { flowFiles: [`smkb_x_Flow-${FLOW_GUID_A}.json`], flowSolutionXml: '' }, 0)
// REGRESSION. The shipped Customizations.xml documents the three-file rule with the literal text
// `<Workflow WorkflowId="{GUID}">`, and Solution.xml quotes its placeholder rows in a comment. The
// first cut of this rule scanned raw text, read the DOCUMENTATION as data, and reported a missing
// RootComponent for a flow named "guid" - a checker firing on the prose that explains it, which is
// the exact failure check-template-guards.mjs exists to prevent.
expectGlobal('workflow-rootcomponents-match', 'good: prose inside an XML comment is not data',
  { flowFiles: [`smkb_x_Flow-${FLOW_GUID_A}.json`],
    customizationsXml: `<!-- 2. a <Workflow WorkflowId="{GUID}"> entry (this file) -->\n<Workflow WorkflowId="{${FLOW_GUID_A}}">`,
    flowSolutionXml: `<!-- placeholder rows: <RootComponent type="29" id="{${FLOW_GUID_B}}" /> -->\n${rootRow(FLOW_GUID_A)}` }, 0)
expectGlobal('workflow-rootcomponents-match', 'good: a non-GUID id attribute is ignored, not reported',
  { flowFiles: [], flowSolutionXml: '<RootComponent type="29" id="{NOT-A-GUID}" />' }, 0)
expectGlobal('env-var-rootcomponents-complete', 'good: a commented-out RootComponent is not an orphan',
  { envVarSchemaNames: new Set(['smkb_A']),
    envSolutionXml: '<!-- <RootComponent type="380" schemaName="smkb_Gone" /> -->\n<RootComponent type="380" schemaName="smkb_A" />' }, 0)

// env-var-rootcomponents-complete — now bidirectional
expectGlobal('env-var-rootcomponents-complete', 'bad: missing RootComponent',
  { envVarSchemaNames: new Set(['smkb_A']), envSolutionXml: '<RootComponents></RootComponents>' }, 1)
expectGlobal('env-var-rootcomponents-complete', 'good: has RootComponent',
  { envVarSchemaNames: new Set(['smkb_A']), envSolutionXml: '<RootComponent type="380" schemaName="smkb_A" behavior="0" />' }, 0)
// The reverse direction, and the reason it matters: deleting the shipped example variable is a
// DOCUMENTED step, and leaving its row behind was reported by nothing.
expectGlobal('env-var-rootcomponents-complete', 'bad: orphaned RootComponent (definition deleted, row left)',
  { envVarSchemaNames: new Set(['smkb_A']),
    envSolutionXml: '<RootComponent type="380" schemaName="smkb_A" /><RootComponent type="380" schemaName="smkb_Gone" />' }, 1)
// Zero definitions means the starter is absent or not activated - not that every row is orphaned.
expectGlobal('env-var-rootcomponents-complete', 'good: no definitions discovered is silent, not "all orphaned"',
  { envVarSchemaNames: new Set(), envSolutionXml: '<RootComponent type="380" schemaName="smkb_A" />' }, 0)

// xml-no-placeholders
expectGlobal('xml-no-placeholders', 'bad: placeholder in xml',
  { xmlFiles: [{ rel: 's.xml', raw: '<x>YourSolutionName</x>' }] }, 1)
expectGlobal('xml-no-placeholders', 'good: clean xml',
  { xmlFiles: [{ rel: 's.xml', raw: '<x>SMKBPaymentVouchers</x>' }] }, 0)

// xml-ascii-hyphen-only
expectGlobal('xml-ascii-hyphen-only', 'bad: en-dash in xml',
  { xmlFiles: [{ rel: 's.xml', raw: '<n>SOL – Thing</n>' }] }, 1)
expectGlobal('xml-ascii-hyphen-only', 'good: ascii hyphen',
  { xmlFiles: [{ rel: 's.xml', raw: '<n>SOL - Thing</n>' }] }, 0)

// ── Coverage ──────────────────────────────────────────────────────────────────
// The bad-input/good-input convention above is only worth anything if it is enforced:
// before this gate existed, a rule could ship with NO tests and the suite stayed green,
// so "the self-test covers every rule" was believed rather than true.
//
// 'flow-valid-json' is a synthetic id emitted from lint.mjs's JSON.parse catch. It has no rule
// object, so the loop below never sees it and the exclusion set that used to name it was dead
// code that read like a real carve-out. The check that matters is the reverse one further down:
// a tested id that is not a registered rule fails, which is what would catch a typo'd id.
for (const r of [...rules, ...globalRules]) {
  const e = exercised.get(r.id)
  if (!e) {
    results.push(`FAIL ${r.id} :: coverage :: rule has no test - add a bad-input and a good-input assertion`)
    fail++
    continue
  }
  // BOTH directions. The old gate required only a firing assertion, while the summary line
  // claimed "every one with a firing test and a silent test" - so a rule with no silent test
  // (i.e. no evidence it can be satisfied at all) was reported as fully covered.
  if (!e.fired) {
    results.push(`FAIL ${r.id} :: coverage :: no assertion expects a finding - add a bad input that makes it FIRE`)
    fail++
  }
  if (!e.silent) {
    results.push(`FAIL ${r.id} :: coverage :: no assertion expects 0 findings - add a good input it must stay SILENT on`)
    fail++
  }
}
// DEPLOY_TIME_RULE_IDS drives what .githooks/pre-commit skips. A typo there would silently
// stop skipping (commits blocked again) or skip nothing — so pin it to real rule ids.
{
  const all = new Set([...rules, ...globalRules].map((r) => r.id))
  if (!DEPLOY_TIME_RULE_IDS.size) { results.push('FAIL DEPLOY_TIME_RULE_IDS :: is empty'); fail++ }
  else { results.push(`ok   DEPLOY_TIME_RULE_IDS :: non-empty (${DEPLOY_TIME_RULE_IDS.size})`); pass++ }
  for (const id of DEPLOY_TIME_RULE_IDS) {
    if (all.has(id)) { results.push(`ok   DEPLOY_TIME_RULE_IDS :: "${id}" is a registered rule`); pass++ }
    else { results.push(`FAIL DEPLOY_TIME_RULE_IDS :: "${id}" is not a registered rule id`); fail++ }
  }
}

const known = new Set([...rules, ...globalRules].map((r) => r.id))
for (const id of exercised.keys()) {
  if (!known.has(id)) { results.push(`FAIL ${id} :: coverage :: tested id is not a registered rule`); fail++ }
}

// ── Report ──
for (const line of results) console.log(line)
console.log(`\nflow-lint self-test: ${pass} passed, ${fail} failed`)
console.log(fail > 0
  ? `coverage: ${known.size} registered rules - see the FAIL lines above`
  : `coverage: ${known.size} rules, every one with a firing test and a silent test`)
process.exit(fail > 0 ? 1 : 0)
