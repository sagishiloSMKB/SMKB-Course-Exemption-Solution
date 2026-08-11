#!/usr/bin/env node
// Self-test for the flow-lint rules: each rule must FIRE on a crafted bad input and
// stay silent on a good one. Run: node tools/flow-lint/test.mjs   (exit 0 = all pass)
import { rules, globalRules } from './rules.mjs'

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
