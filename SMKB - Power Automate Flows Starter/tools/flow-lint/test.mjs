#!/usr/bin/env node
// Self-test for the flow-lint rules: each rule must FIRE on a crafted bad input and
// stay silent on a good one. Run: node tools/flow-lint/test.mjs   (exit 0 = all pass)
import { rules, globalRules } from './rules.mjs'

const byId = Object.fromEntries(rules.map((r) => [r.id, r]))
const globalById = Object.fromEntries(globalRules.map((r) => [r.id, r]))
let pass = 0, fail = 0
const results = []

/** Assert `rule(flow, ctx)` returns exactly `expected` findings. */
function expect(id, label, flow, ctx, expected) {
  const rule = byId[id]
  if (!rule) { results.push(`FAIL ${id} :: ${label} :: rule not found`); fail++; return }
  const n = (rule.check(flow, ctx) || []).length
  if (n === expected) { results.push(`ok   ${id} :: ${label} (${n})`); pass++ }
  else { results.push(`FAIL ${id} :: ${label} :: expected ${expected} findings, got ${n}`); fail++ }
}

/** Assert a global rule returns exactly `expected` findings for `gctx`. */
function expectGlobal(id, label, gctx, expected) {
  const rule = globalById[id]
  if (!rule) { results.push(`FAIL ${id} :: ${label} :: global rule not found`); fail++; return }
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

// ── Global rules ──
// workflow-json-matches-customizations
expectGlobal('workflow-json-matches-customizations', 'bad: flow not referenced',
  { flowFiles: ['pvch_x-GUID.json'], customizationsXml: '<Workflows></Workflows>' }, 1)
expectGlobal('workflow-json-matches-customizations', 'bad: stale reference',
  { flowFiles: [], customizationsXml: '<JsonFileName>/Workflows/pvch_y-GUID.json</JsonFileName>' }, 1)
expectGlobal('workflow-json-matches-customizations', 'good: referenced + exists',
  { flowFiles: ['pvch_x-GUID.json'], customizationsXml: '<JsonFileName>/Workflows/pvch_x-GUID.json</JsonFileName>' }, 0)

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
  { xmlFiles: [{ rel: 's.xml', raw: '<n>PVCH – Thing</n>' }] }, 1)
expectGlobal('xml-ascii-hyphen-only', 'good: ascii hyphen',
  { xmlFiles: [{ rel: 's.xml', raw: '<n>PVCH - Thing</n>' }] }, 0)

// ── Report ──
for (const line of results) console.log(line)
console.log(`\nflow-lint self-test: ${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
