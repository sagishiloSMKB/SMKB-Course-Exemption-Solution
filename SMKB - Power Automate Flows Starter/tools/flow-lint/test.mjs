#!/usr/bin/env node
// Self-test for the flow-lint rules: each rule must FIRE on a crafted bad input and
// stay silent on a good one. Run: node tools/flow-lint/test.mjs   (exit 0 = all pass)
import { rules, globalRules } from './rules.mjs'

const byId = Object.fromEntries(rules.map((r) => [r.id, r]))
const globalById = Object.fromEntries(globalRules.map((r) => [r.id, r]))
let pass = 0, fail = 0
const results = []

// Every rule id an assertion below actually exercised, and whether it was asserted to
// FIRE (>0 findings) at least once. Checked at the end - see "Coverage".
const exercised = new Map()
const note = (id, expected) => exercised.set(id, (exercised.get(id) ?? false) || expected > 0)

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

// authenticated-flow-validates-token (raw-based session check)
const authTrigger = { triggers: { manual: { kind: 'PowerPages', inputs: { schema: { properties: { text: { title: 'authToken', type: 'string' } } } } } } }
expect('authenticated-flow-validates-token', 'bad: authToken input, no session lookup',
  flow(authTrigger, {}, 'no session ref here'), {}, 1)
expect('authenticated-flow-validates-token', 'good: authToken input + sessionToken',
  flow(authTrigger, {}, "$filter: sessionToken eq '...'"), {}, 0)
expect('authenticated-flow-validates-token', 'good: public flow (no authToken)',
  flow({ triggers: { manual: { kind: 'PowerPages', inputs: { schema: { properties: { text: { title: 'bankCode' } } } } } } }, {}, ''), {}, 0)

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

// env-var-rootcomponents-complete
expectGlobal('env-var-rootcomponents-complete', 'bad: missing RootComponent',
  { envVarSchemaNames: new Set(['smkb_A']), envSolutionXml: '<RootComponents></RootComponents>' }, 1)
expectGlobal('env-var-rootcomponents-complete', 'good: has RootComponent',
  { envVarSchemaNames: new Set(['smkb_A']), envSolutionXml: '<RootComponent type="380" schemaName="smkb_A" behavior="0" />' }, 0)

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
// 'flow-valid-json' is excluded deliberately: it is a synthetic id emitted from
// lint.mjs's JSON.parse catch and has no rule object, so it cannot be unit-tested here.
const SYNTHETIC_IDS = new Set(['flow-valid-json'])
for (const r of [...rules, ...globalRules]) {
  if (SYNTHETIC_IDS.has(r.id)) continue
  if (!exercised.has(r.id)) {
    results.push(`FAIL ${r.id} :: coverage :: rule has no test - add a bad-input and a good-input assertion`)
    fail++
  } else if (!exercised.get(r.id)) {
    results.push(`FAIL ${r.id} :: coverage :: every assertion expects 0 findings - add a bad input that makes it FIRE`)
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
