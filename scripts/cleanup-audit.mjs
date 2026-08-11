#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// cleanup-audit — REPORTS what this solution no longer needs. It never deletes anything.
//
// WHY THIS IS A CLASSIFIER AND NOT A SWEEP
// The obvious design — "list files nothing imports, offer to delete them" — destroys this kit.
// Verified import graphs: in the Code Site starter `src/views/HomeView.vue` is the ONLY production
// importer of `src/config/flows.ts`, `src/composables/useFlowErrorToast.ts`,
// `src/services/flowErrors.ts` and (apart from the dormant OTP module) `src/services/cloudFlow.ts`.
// In the Power Apps starter `src/services/exampleService.ts` is the only importer of
// `src/services/unwrap.ts`. Remove the demo views — which every solution should — and a reachability
// sweep then proposes deleting the flows-only transport layer and the unwrap() contract: the two
// files that ARE the architecture.
//
// So the polarity is inverted on purpose. Removals are an ALLOW-LIST (`REMOVE` below). There is no
// code path in this file from "importer count" to "removal candidate". A file with no manifest entry
// is UNCLASSIFIED, which means keep. Adding a removal takes a reviewed edit to a shipped script;
// keeping something is the default. Importer counting exists in exactly one function,
// `projectOrphans`, whose output is a REPORT SECTION (== D) and never an input to the candidate list
// — so the demo-view scenario above produces four lines of reassurance naming the four files and
// their roles, which is the opposite of a deletion proposal. `--self-test` asserts that negative
// directly, so a regression cannot leak a protected path into the candidates.
//
// Usage:
//   node scripts/cleanup-audit.mjs                 # the report
//   node scripts/cleanup-audit.mjs --json          # same data, machine-readable
//   node scripts/cleanup-audit.mjs --pass=A|B      # filter the report (never a claim about state)
//   node scripts/cleanup-audit.mjs --starter=<Type Label>
//   node scripts/cleanup-audit.mjs --self-test     # manifest coherence; safe on the pristine kit
//   node scripts/cleanup-audit.mjs --census        # one line, for CI; never changes the exit code
//
// Exit codes (house shape, cf. scripts/is-initialized.mjs):
//   0  report produced. CANDIDATES DO NOT CHANGE THIS — it is a report, not a gate.
//   1  the report cannot be trusted (manifest incoherent, a guard list unparseable, two folders of
//      one type). Same discipline as check-template-guards: a check that cannot run is an error,
//      not a warning.
//   2  could not tell — config missing/unparseable, or the repo is still the pristine template.
//      On a pristine kit every demo artefact is present, so the report would read "delete thirty
//      things" and someone would act on it. Refusing is the only safe answer.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspect } from './is-initialized.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ── Starter resolution ───────────────────────────────────────────────────────
// A fourth copy of this resolver (check-doc-boundaries.mjs, check-template-guards.mjs and
// flow-lint's lint.mjs each carry one). Duplicated deliberately rather than extracted: pulling a
// shared module out from under two pre-commit gates is a bigger risk than one more copy, and the
// extraction deserves to be its own change. If you extract it, all four move together.
function starterDir(templateName, typeSuffix) {
  let renamed = []
  try {
    renamed = fs.readdirSync(repoRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('SMKB - ') && d.name.endsWith(` - ${typeSuffix}`))
      .map((d) => d.name).sort()
  } catch { /* fall through */ }
  if (renamed.length > 1) {
    fail(`more than one "${typeSuffix}" starter folder: ${renamed.join(', ')}. This tool addresses one of each type.`)
  }
  if (renamed.length) return { name: renamed[0], activated: true }
  return { name: templateName, activated: false }
}

const errors = []
const fail = (m) => { errors.push(m) }

const STARTERS = {
  'Dataverse Tables': starterDir('SMKB - Dataverse Tables Starter', 'Dataverse Tables'),
  'Environmental Variables': starterDir('SMKB - Environmental Variables Starter', 'Environmental Variables'),
  'Cloud Flows': starterDir('SMKB - Power Automate Flows Starter', 'Cloud Flows'),
  'Power App': starterDir('SMKB - Power Apps Starter', 'Power App'),
  'Power Pages Code Site': starterDir('SMKB - Power Pages Code Site Starter', 'Power Pages Code Site'),
}
const present = (label) => fs.existsSync(path.join(repoRoot, STARTERS[label].name))
const rel = (label, p) => `${STARTERS[label].name}/${p}`
const abs = (label, p) => path.join(repoRoot, STARTERS[label].name, p)

// ═════════════════════════════════════════════════════════════════════════════
// THE MANIFEST — two arrays, one file, reviewed in one diff.
//
// KEEP and REMOVE live together on purpose. The one invariant that matters is
// `KEEP ∩ REMOVE = ∅`, and splitting them across two files (or into per-file annotations) turns
// that into a cross-file check nobody sees while editing either half. This kit already has one
// cross-file predicate — is-initialized.mjs vs Test-Initialized — and had to grow a checker
// specifically to stop it drifting. One is enough.
// ═════════════════════════════════════════════════════════════════════════════

// `protected: true` is the architecture: a tripwire, asserted by --self-test. If a future version of
// this kit ever lists one of these for removal, the self-test fails in CI. That is what makes the
// central constraint structural instead of advisory.
// `protected: false` is a convention carrier — never proposed here, but a solution may legitimately
// delete it in month six, and a gate that then went red forever would teach the bypass habit
// check-template-guards' own header warns about.
const KEEP = [
  // ── Power Pages Code Site ──
  { starter: 'Power Pages Code Site', path: 'src/services/cloudFlow.ts', protected: true,
    role: 'the flows-only transport. eslint.config.js names this and csrf.ts as the ONLY files permitted to call fetch',
    groundedIn: 'CLAUDE.md' },
  { starter: 'Power Pages Code Site', path: 'src/services/csrf.ts', protected: true,
    role: 'the CSRF half of that transport, for local dev', groundedIn: 'CLAUDE.md' },
  { starter: 'Power Pages Code Site', path: 'src/config/flows.ts', protected: true,
    role: 'the shipped EMPTY flow registry that /ppcs-register-flow appends GUIDs to', groundedIn: 'CLAUDE.md' },
  { starter: 'Power Pages Code Site', path: 'src/services/flowErrors.ts', protected: true,
    role: 'the localized flow-error map; the error-UX convention', groundedIn: 'CLAUDE.md' },
  { starter: 'Power Pages Code Site', path: 'src/composables/useFlowErrorToast.ts', protected: true,
    role: 'the toast half of that convention', groundedIn: 'CLAUDE.md' },
  { starter: 'Power Pages Code Site', path: 'src/utils/sessionCache.ts',
    role: 'session cache + in-flight dedup, with an invalidate() that cancels a load already in flight',
    groundedIn: 'CLAUDE.md' },
  { starter: 'Power Pages Code Site', path: 'src/utils/safeJson.ts',
    role: 'the safe JSON parse every stored-session read goes through', groundedIn: 'CLAUDE.md' },
  { starter: 'Power Pages Code Site', path: 'src/utils/fileUtils.ts', zeroImportersEver: true,
    role: 'base64 + naming for flow file uploads; spreadsheet-style attachment labels past 26 files',
    groundedIn: 'CLAUDE.md' },
  { starter: 'Power Pages Code Site', path: 'src/composables/useFormValidation.ts', zeroImportersEver: true,
    role: 'the form-validation helper the next form is supposed to reach for', groundedIn: 'CLAUDE.md' },
  { starter: 'Power Pages Code Site', path: 'src/composables/useTurnstile.ts',
    role: 'standalone captcha composable; /ppcs-remove-design-ui step 6 explicitly preserves it, and /ppcs-add-turnstile targets it',
    groundedIn: 'CLAUDE.md' },
  { starter: 'Power Pages Code Site', path: 'src/composables/useLanguage.ts', protected: true,
    role: 'the one shared active-language ref; also mirrors <html lang>/<dir>', groundedIn: 'CLAUDE.md' },

  // ── Power App ──
  { starter: 'Power App', path: 'src/services/unwrap.ts', protected: true,
    role: 'the ONE place a flow { success, data, error } becomes data or throws. Do not inline this contract elsewhere',
    groundedIn: 'CLAUDE.md' },
  { starter: 'Power App', path: 'src/utils/validators.ts', zeroImportersEver: true,
    role: 'isValidEmail / isValidIsraeliPhone / isValidIsraeliId — spec-only importers today, by design',
    groundedIn: 'CLAUDE.md' },
  { starter: 'Power App', path: 'src/utils/phone.ts', zeroImportersEver: true,
    role: 'normalizePhone. validators.ts imports it, but that chain has no production entry point yet',
    groundedIn: 'CLAUDE.md' },
  { starter: 'Power App', path: 'src/composables/useFormValidation.ts', zeroImportersEver: true,
    role: 'validator-map to { errors, validateField, isFormValid, validateAll }', groundedIn: 'CLAUDE.md' },
  { starter: 'Power App', path: 'src/composables/useSessionCache.ts', zeroImportersEver: true,
    role: 'session cache + in-flight dedup for reference lists — spec-only importer today, by design',
    groundedIn: 'CLAUDE.md' },
  { starter: 'Power App', path: 'src/generated/index.ts', protected: true,
    role: 'the generated barrel. Removing the example strips two export lines from it; pnpm pa add-flow rewrites it wholesale. Deleting the file breaks that regeneration',
    groundedIn: 'CLAUDE.md' },
  { starter: 'Power App', path: '.power/schemas/appschemas/dataSourcesInfo.ts',
    role: 'the generated connector-schema registry. Removing the example empties it to `{}`; the next pnpm pa add-flow writes into it',
    groundedIn: 'CLAUDE.md' },
  { starter: 'Power App', path: 'src/services/mock/generated.ts', protected: true,
    role: 'the dev-mode barrel alias target. vite.config.ts rewrites every bare-barrel import here in development, so it must never be emptied',
    groundedIn: 'CLAUDE.md' },
]

// Removal candidates. `becomesComponent` decides the pass — nobody hand-assigns one, so an item
// cannot drift into the wrong pass. `--self-test` asserts the biconditional with `componentType`.
const REMOVE = [
  {
    id: 'CS-DEMO-VIEWS', starter: 'Power Pages Code Site', category: 'Demo',
    becomesComponent: false, componentType: null,
    paths: ['src/views/HomeView.vue', 'src/views/AboutView.vue'],
    edits: [
      { file: 'src/router/index.ts', what: 'the two demo import lines and their two route objects' },
      { file: 'src/assets/main.css', what: 'the demo-only selector groups (.home*, .about*, .status-badge, .subtitle, .user-section*, .anon-message, .user-details, .next-steps*) — KEEP the reset block and .main-content' },
    ],
    invariants: ['CS-ROOT-ROUTE', 'CS-NOTFOUND-NAME', 'CS-SMOKE-TEST'],
    why: 'a demo landing page and an about page, shipped so the SPA runs on day one',
  },
  {
    id: 'CS-OTP-MODULE', starter: 'Power Pages Code Site', category: 'Dormant',
    becomesComponent: false, componentType: null,
    paths: ['src/modules/otp-auth/'],
    edits: [
      { file: 'src/services/cloudFlow.ts', what: 'the doc comment naming the module (prose only)' },
      { file: 'src/composables/useTurnstile.ts', what: 'the comment explaining why it sits outside the module (prose only)' },
    ],
    orphans: ['src/utils/safeJson.ts', 'src/utils/sessionCache.ts', 'src/composables/useTurnstile.ts'],
    invariants: ['CS-OTP-CSP-NOOP'],
    why: 'phone-OTP auth, shipped dormant. Nothing outside src/modules/ imports it, so it is zero bundle bytes — but vue-tsc, ESLint and vitest all still process it',
  },
  {
    id: 'CS-PINIA', starter: 'Power Pages Code Site', category: 'Dep',
    becomesComponent: false, componentType: null,
    paths: [],
    edits: [
      { file: 'package.json', what: 'the pinia dependency' },
      { file: 'src/main.ts', what: 'the createPinia import and the .use(createPinia()) call' },
      { file: 'vite.config.ts', what: 'the pinia entry in the vue manualChunks group' },
    ],
    why: 'wired but storeless — zero defineStore calls anywhere and no src/stores/. Three lines to remove, three to restore',
    docsFollowUp: 'root docs/02-tech-stack.md and the starter CLAUDE.md both name Pinia',
  },
  {
    id: 'PA-EXAMPLE-FLOW', starter: 'Power App', category: 'Demo',
    becomesComponent: false, componentType: null,
    paths: [
      'src/services/exampleService.ts',
      'src/generated/services/ExampleFlowService.ts',
      'src/generated/models/ExampleFlowModel.ts',
    ],
    edits: [
      { file: 'src/generated/index.ts', what: 'the two ExampleFlow export lines and the starter NOTE header' },
      { file: '.power/schemas/appschemas/dataSourcesInfo.ts', what: 'the example data-source object' },
      { file: 'src/services/mock/generated.ts', what: 'the ExampleFlowService export ONLY — never empty this file' },
      { file: 'src/views/HomePage.vue', what: 'the example script block, the table, the retry button and the demo intro copy' },
    ],
    orphans: ['src/services/unwrap.ts', '.power/schemas/appschemas/dataSourcesInfo.ts', 'src/generated/index.ts'],
    invariants: ['PA-MOCK-BARREL', 'PA-ROOT-ROUTE'],
    why: 'the runnable example flow, shipped so pnpm dev and pnpm build work on day one. Its own README has a "Removing the example" section',
  },
  {
    id: 'EV-EXAMPLE-VAR', starter: 'Environmental Variables', category: 'Demo',
    becomesComponent: true, componentType: 'envvardefinition (type=380)',
    paths: ['environmentvariabledefinitions/smkb_sol_ExampleVar/'],
    edits: [{ file: 'Other/Solution.xml', what: 'its RootComponent row' }],
    guardForced: true,
    why: 'the template definition /env-add-var clones. The deploy guard blocks on its placeholder segment, so it cannot ship',
  },
  {
    id: 'EV-FEATURE-VARS', starter: 'Environmental Variables', category: 'Dormant',
    becomesComponent: true, componentType: 'envvardefinition (type=380)',
    paths: ['environmentvariabledefinitions/<prefix>_OtpDailyCap/', 'environmentvariabledefinitions/<prefix>_SecurityAlertEmails/'],
    edits: [
      { file: 'Other/Solution.xml', what: 'each RootComponent row' },
      { file: '../apply-config.ps1', what: 'the matching names in $script:shippedEnvVars — MISS THIS AND -Check IS PERMANENTLY RED' },
    ],
    guardForced: false,
    conditional: 'only when no flow reads them, i.e. no OTP or other rate-sensitive send path',
    why: 'THE reason Pass A exists. apply-config.ps1 renames these to the real prefix, PAST the deploy guard, so a solution with no rate-sensitive send deploys two permanent definitions nothing reads and no gate says a word',
  },
  {
    id: 'TB-EXAMPLE-TABLES', starter: 'Dataverse Tables', category: 'Demo',
    becomesComponent: true, componentType: 'entity (type=1)',
    paths: ['Entities/smkb_sol_ExampleTableA/', 'Entities/smkb_sol_ExampleTableB/'],
    edits: [
      { file: 'Other/Solution.xml', what: 'each RootComponent row' },
      { file: 'guid-freshen.ps1', what: 'the matching sentinel-GUID map entries (tidiness only — a no-op run writes no marker)' },
    ],
    guardForced: true,
    invariants: ['TB-CLONE-SOURCE'],
    why: 'the two example tables /dvt-add-table clones. The deploy guard blocks on their placeholder segment AND their display name, so they cannot ship',
  },
  {
    id: 'FL-EXAMPLE-SKELETONS', starter: 'Cloud Flows', category: 'Demo',
    becomesComponent: true, componentType: 'workflow (type=29)',
    paths: ['Workflows/<the skeleton whose trigger type this solution does not use>'],
    edits: [
      { file: 'Other/Customizations.xml', what: 'its <Workflow> block' },
      { file: 'Other/Solution.xml', what: 'its RootComponent row' },
    ],
    guardForced: true,
    why: 'two trigger-type skeletons; the README says keep the one matching your trigger type. All three files or none — flow-lint checks every pairing now',
  },
  {
    id: 'FL-CONNECTION-REFS', starter: 'Cloud Flows', category: 'Dormant',
    becomesComponent: true, componentType: 'connectionreference',
    paths: [],
    edits: [{ file: 'Other/Customizations.xml', what: 'each <connectionreference> no workflow references' }],
    guardForced: false,
    why: 'the shipped four-connector bank. The README states the consequence in bold: a connection reference cannot be removed by re-importing, and one real solution shipped two unused bank connectors permanently',
  },
]

// Invariants a removal must not break. Reported alongside the item, in == E.
const INVARIANTS = {
  'CS-ROOT-ROUTE': 'a route must still match path: "/" — the catch-all produces a 404, not a landing page',
  'CS-NOTFOUND-NAME': 'the catch-all route must keep name: "not-found" — it is the sole member of STANDALONE_ROUTES in App.vue, so renaming it renders the 404 inside the layout shell',
  'CS-SMOKE-TEST': 'HomeView.vue IS the deploy smoke test (portal user + first flow via invokeFlow + the error toast). Never remove it before the deploy is proven — this is why it is a Pass B item and not Pass A',
  'CS-OTP-CSP-NOOP': 'removal is a no-op on CSP: the shipped site settings contain no Cloudflare or Turnstile host. /ppcs-enable-otp-auth adds them',
  'PA-MOCK-BARREL': 'src/services/mock/generated.ts must keep at least one export — vite.config.ts aliases every bare-barrel import to it in development mode, so an empty barrel breaks pnpm dev',
  'PA-ROOT-ROUTE': 'a route must still match "/" — createWebHashHistory sends #/ to NotFoundPage otherwise. The Power Apps routes carry no names; the equivalent is App.vue navItems, which hardcodes to: "/"',
  'TB-CLONE-SOURCE': '/dvt-add-table now clones the nearest real sibling and falls back to the example only for the first table — so keep an example until the solution has one real table',
}

// The six root docs check-doc-boundaries.mjs treats as undeletable. Never propose one.
const NEVER_PROPOSE = ['CLAUDE.md', 'README.md', 'INIT_PROJECT.md', 'SOLUTION-SPEC.md',
                       'SECURITY-BASELINE.md', 'TESTING-STRATEGY.md']

// ── Guard token lists, read from each deploy.ps1 (never copied) ──────────────
// Ported from check-template-guards.mjs, including its discipline: a list that cannot be parsed is
// an ERROR, because the Guard column would otherwise be silently empty and the report would imply
// no gate covers an item that one does.
function readGuardTokens(label) {
  const p = abs(label, 'deploy.ps1')
  if (!fs.existsSync(p)) return null
  const m = fs.readFileSync(p, 'utf8').match(/\$placeholders\s*=\s*@\(([\s\S]*?)\)/)
  if (!m) { fail(`${rel(label, 'deploy.ps1')}: cannot parse its $placeholders guard list`); return null }
  return [...m[1].matchAll(/'((?:[^']|'')*)'/g)].map((x) => x[1].replace(/''/g, "'"))
}

// ── Importer map — for == D ONLY. Never an input to the candidate list. ──────
function collectSources(dir, out = []) {
  let entries = []
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    if (['node_modules', 'dist', '_dist', '.git', 'vendor'].includes(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) collectSources(p, out)
    else if (/\.(ts|vue)$/.test(e.name) && !/\.spec\.ts$/.test(e.name)) out.push(p)
  }
  return out
}

function importerMap(label) {
  const root = abs(label, 'src')
  const map = new Map()
  for (const file of collectSources(root)) {
    const text = fs.readFileSync(file, 'utf8')
    for (const m of text.matchAll(/from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]/g)) {
      const spec = m[1] || m[2]
      if (!spec.startsWith('.') && !spec.startsWith('@/')) continue
      const from = spec.startsWith('@/') ? path.join(root, spec.slice(2)) : path.resolve(path.dirname(file), spec)
      // Record only the resolution that EXISTS. Adding every candidate extension invented phantom
      // paths (`src/config/flows`, `src/views/HomeView.vue.ts`, `…/index.ts`) and then reported them
      // as UNCLASSIFIED files needing classification — noise a reader could act on.
      const isFile = (c) => { try { return fs.statSync(c).isFile() } catch { return false } }
      // isFile, not existsSync: a barrel import (`from '../generated'`) matches the DIRECTORY first,
      // which then appeared in the report as a file called `src/generated` needing classification.
      const resolved = [from, from + '.ts', from + '.vue', path.join(from, 'index.ts')].find(isFile)
      if (!resolved) continue
      const key = path.relative(abs(label, ''), resolved).replace(/\\/g, '/')
      if (!map.has(key)) map.set(key, new Set())
      map.get(key).add(path.relative(abs(label, ''), file).replace(/\\/g, '/'))
    }
  }
  return map
}

/**
 * What would have no importer left if this entry were removed?
 *
 * THE OUTPUT OF THIS FUNCTION IS A REPORT SECTION. It is never consulted when building the
 * candidate list, and --self-test asserts that. Its whole purpose is the reverse: to name the
 * convention carriers a removal orphans, so a reader mid-cleanup does not mistake them for dead code.
 */
function projectOrphans(entry, map) {
  // `paths` ONLY. `edits[]` names files the removal MODIFIES, and counting them as gone was wrong in
  // a way the report made obvious: removing the demo views edits `src/router/index.ts`, so treating
  // that as deleted made `NotFoundView.vue` — still imported by the router that survives — look
  // orphaned. Same deletion-vs-modification conflation the self-test caught in check 1.
  const removed = new Set()
  for (const p of entry.paths) removed.add(p.replace(/\/$/, ''))
  const out = []
  for (const [target, importers] of map) {
    const survivors = [...importers].filter((i) => ![...removed].some((r) => i === r || i.startsWith(r + '/')))
    if (importers.size > 0 && survivors.length === 0 && ![...removed].some((r) => target === r || target.startsWith(r + '/'))) {
      const keep = KEEP.find((k) => k.starter === entry.starter && k.path === target)
      out.push({ path: target, keep })
    }
  }
  // Declared orphans always appear, even when the crude importer scan misses them.
  for (const p of entry.orphans ?? []) {
    if (!out.some((o) => o.path === p)) out.push({ path: p, keep: KEEP.find((k) => k.starter === entry.starter && k.path === p) })
  }
  return out.sort((a, b) => a.path.localeCompare(b.path))
}

// ── Root-doc links into a starter (ported regex from check-doc-boundaries.mjs) ─
function docLinksInto(starterName) {
  const hits = []
  for (const doc of NEVER_PROPOSE) {
    const p = path.join(repoRoot, doc)
    if (!fs.existsSync(p)) continue
    const text = fs.readFileSync(p, 'utf8')
    const re = /\]\(\s*(<[^>]+>|[^)\s]+)([^)]*)\)/g
    let m
    while ((m = re.exec(text)) !== null) {
      let target = m[1].replace(/^<|>$/g, '')
      if (/^(https?:|mailto:|#)/i.test(target)) continue
      const decoded = decodeURIComponent(target.split('#')[0])
      if (!decoded.startsWith(starterName + '/')) continue
      hits.push(`${doc}:${text.slice(0, m.index).split(/\r?\n/).length}`)
    }
  }
  return hits
}

// Prose surfaces no gate ever link-checks.
function proseMentions(starterName) {
  const hits = []
  const walk = (dir) => {
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (['node_modules', '.git', 'dist', '_dist', 'vendor'].includes(e.name)) continue
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.md')) {
        const r = path.relative(repoRoot, p).replace(/\\/g, '/')
        if (r.startsWith(starterName + '/')) continue // goes with the folder
        const text = fs.readFileSync(p, 'utf8')
        text.split(/\r?\n/).forEach((line, i) => {
          if (line.includes(starterName)) hits.push(`${r}:${i + 1}`)
        })
      }
    }
  }
  walk(repoRoot)
  return hits
}

// ── Deploy evidence — observable signals, never a claim ─────────────────────
//
// COMMENTS ARE STRIPPED BEFORE ANY SIGNAL IS READ. The shipped `flows.ts` carries a
// commented-out sample entry with a realistic GUID, and the first version of this function read it
// as a real registration — so a freshly-initialised clone that had never deployed anything was told
// "Pass A window: LIKELY CLOSED", which would have downgraded every one-way removal to a manual
// Maker-portal chore for no reason. That is the third time in this feature that reading
// documentation as data produced a confident wrong answer; treat any "does this file contain X"
// signal as suspect until comments are gone.
const stripJsComments = (s) => String(s || '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1')

function deployEvidence() {
  const signals = []
  const pa = abs('Power App', 'power.config.json')
  if (fs.existsSync(pa)) {
    // JSON has no comments, so this one needs no stripping — but it does need the all-zero and
    // all-one sentinels excluded, which are what the template ships.
    const m = fs.readFileSync(pa, 'utf8').match(/"appId":\s*"([^"]*)"/)
    if (m && m[1] && !/^0{8}-/.test(m[1])) signals.push(['power.config.json appId is set', m[1]])
  }
  const flows = abs('Power Pages Code Site', 'src/config/flows.ts')
  if (fs.existsSync(flows) && /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(stripJsComments(fs.readFileSync(flows, 'utf8')))) {
    signals.push(['flows.ts holds a registered flow GUID', 'implies a provisioned, deployed site'])
  }
  const settings = abs('Power Pages Code Site', '.powerpages-site/site-settings')
  if (fs.existsSync(settings)) {
    const anyPlaceholder = fs.readdirSync(settings).some((f) => /aaaaaaaa-/i.test(fs.readFileSync(path.join(settings, f), 'utf8')))
    if (!anyPlaceholder) signals.push(['no placeholder site-setting GUIDs remain', 'implies pac pages download ran'])
  }
  for (const label of Object.keys(STARTERS)) {
    if (fs.existsSync(abs(label, '_dist/solution.zip'))) signals.push([`${label}: _dist/solution.zip exists`, 'a solution was packed'])
  }
  return signals
}

// ── Report ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const has = (f) => argv.some((a) => a === f || a.startsWith(f + '='))
const val = (f) => { const a = argv.find((x) => x.startsWith(f + '=')); return a ? a.split('=')[1] : null }

if (has('--self-test')) { selfTest(); }
else { report() }

function report() {
  const state = inspect()
  if (state.unreadable) { console.error(`cleanup-audit: ${state.reason}`); process.exit(2) }
  if (!state.initialized) {
    console.error('cleanup-audit: this repo is still the pristine starter kit template.')
    console.error(`  ${state.reason}`)
    console.error('  Refusing to report: on a pristine kit every demo artefact is present by design, so the')
    console.error('  report would read "delete thirty things" and someone would act on it. Run this after')
    console.error('  Init Project has set the solution identity.')
    process.exit(2)
  }

  const cfg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'solution.config.json'), 'utf8'))
  const onlyPass = val('--pass')
  const onlyStarter = val('--starter')
  const out = { solution: cfg.solutionDisplayName, prefix: cfg.shortPrefix, starters: {}, evidence: [], A: [], B: [], keep: [], orphans: {}, guards: [], docLinks: {}, prose: {}, unclassified: [] }

  for (const [label, s] of Object.entries(STARTERS)) {
    out.starters[label] = { folder: s.name, state: !present(label) ? 'absent' : s.activated ? 'activated' : 'not activated' }
  }
  out.evidence = deployEvidence()

  const candidates = REMOVE
    .filter((e) => present(e.starter))
    .filter((e) => !onlyStarter || e.starter === onlyStarter)
  const maps = {}
  for (const e of candidates) {
    if (!maps[e.starter] && ['Power App', 'Power Pages Code Site'].includes(e.starter)) maps[e.starter] = importerMap(e.starter)
  }
  for (const e of candidates) {
    const pass = e.becomesComponent ? 'A' : 'B'
    if (onlyPass && onlyPass.toUpperCase() !== pass) continue
    const tokens = readGuardTokens(e.starter)
    const row = { ...e, pass, guard: e.guardForced ? 'forced by the deploy guard' : 'INVISIBLE to every gate' }
    out[pass].push(row)
    if (maps[e.starter]) out.orphans[e.id] = projectOrphans(e, maps[e.starter])
    // One row per STARTER, not per entry - two removals in the same starter share one guard list.
    if (tokens && !out.guards.some((g) => g.starter === e.starter)) {
      out.guards.push({ starter: e.starter, tokenCount: tokens.length })
    }
  }
  // Non-activated starters are themselves Pass B candidates.
  for (const [label, s] of Object.entries(STARTERS)) {
    if (s.activated || !present(label)) continue
    if (onlyStarter && onlyStarter !== label) continue
    if (onlyPass && onlyPass.toUpperCase() !== 'B') continue
    out.B.push({ id: `STARTER-${label.replace(/\s+/g, '-').toUpperCase()}`, starter: label, category: 'Starter',
      pass: 'B', becomesComponent: false, paths: [s.name + '/'], edits: [], guard: 'INVISIBLE to every gate',
      why: 'a starter this solution never activated' })
    out.docLinks[s.name] = docLinksInto(s.name)
    out.prose[s.name] = proseMentions(s.name)
  }
  out.keep = KEEP.filter((k) => present(k.starter)).filter((k) => !onlyStarter || k.starter === onlyStarter)

  if (errors.length) { console.error('cleanup-audit: FAILED'); errors.forEach((e) => console.error('  x ' + e)); process.exit(1) }

  if (has('--json')) { console.log(JSON.stringify(out, null, 2)); process.exit(0) }
  if (has('--census')) {
    console.log(`cleanup-audit: ${out.A.length + out.B.length} removal candidate(s) remain (run node scripts/cleanup-audit.mjs)`)
    process.exit(0)
  }

  const L = (s = '') => console.log(s)
  L(`cleanup-audit  ·  ${out.solution} (prefix ${out.prefix})`)
  for (const [label, s] of Object.entries(out.starters)) L(`  ${label.padEnd(26)} ${s.folder}  [${s.state}]`)
  L()
  if (out.evidence.length) {
    L('  deploy-evidence  =>  Pass A window: LIKELY CLOSED')
    out.evidence.forEach(([k, v]) => L(`    - ${k}: ${v}`))
    L('    A repo-side removal of a Pass A item is now a NO-OP on the environment. Each becomes')
    L('    "REMOVE [maker action required]" — name the Dataverse object and delete it by hand.')
  } else {
    L('  deploy-evidence  =>  Pass A window: OPEN (no signal that anything has been deployed)')
  }

  const block = (title, rows) => {
    L(); L(`== ${title}`)
    if (!rows.length) { L('  (none)'); return }
    for (const r of rows) {
      L(`  ${r.id}  [${r.category}]  ${r.guard}`)
      L(`     why: ${r.why}`)
      for (const p of r.paths ?? []) L(`     delete: ${p}`)
      for (const e of r.edits ?? []) L(`     edit:   ${e.file} — ${e.what}`)
      if (r.componentType) L(`     becomes: ${r.componentType}`)
      if (r.conditional) L(`     ONLY IF: ${r.conditional}`)
      if (r.docsFollowUp) L(`     docs:   ${r.docsFollowUp}`)
      for (const k of r.invariants ?? []) L(`     !! ${INVARIANTS[k]}`)
    }
  }
  block('A. Permanent components — decide BEFORE the first deploy', out.A)
  block('B. Repo-only — decide AFTER the deploy is proven', out.B)

  L(); L('== C. Keep-list — zero importers BY DESIGN, never candidates')
  for (const k of out.keep) {
    L(`  ${k.protected ? '[PROTECTED]' : '[convention]'} ${k.starter}/${k.path}`)
    L(`     ${k.role}`)
  }

  L(); L('== D. Orphan projection — what each B removal leaves importer-less')
  L('  (Reassurance, not proposals. Nothing here is ever a candidate.)')
  L('  Limit worth knowing: this is projected PER ENTRY, so it cannot see a combination. cloudFlow.ts')
  L('  and flowErrors.ts become importer-less only when the demo views AND the OTP module are both')
  L('  gone, and neither entry alone predicts it. What actually protects them is [PROTECTED] in == C,')
  L('  not this projection.')
  for (const [id, orphans] of Object.entries(out.orphans)) {
    if (!orphans.length) continue
    L(`  ${id}:`)
    for (const o of orphans) L(`     ${o.path}  ->  ${o.keep ? `orphaned by design — KEEP (${o.keep.role.slice(0, 70)})` : 'UNCLASSIFIED — defaults to keep; classify it'}`)
  }

  L(); L('== E. Guard interactions — what an edit must not spell')
  L('  Every starter guard scans code files, INCLUDING COMMENTS. Never annotate a removal with the')
  L('  token you removed: the starter\'s own deploy.ps1 and check-template-guards.mjs both fire on the')
  L('  explanation, and the pre-commit hook runs the latter — so the commit is refused. Describe it.')
  L('  (Markdown is NOT scanned by any guard, so this report and the audit write-up are safe.)')
  for (const g of out.guards) L(`  ${g.starter}: ${g.tokenCount} guarded token(s) read from its deploy.ps1`)

  L(); L('== F. Root-doc links into a starter proposed for deletion')
  if (!Object.keys(out.docLinks).length) L('  (none)')
  for (const [name, links] of Object.entries(out.docLinks)) {
    L(`  ${name}  ${links.length} link(s) — each breaks check-doc-boundaries.mjs, which the pre-commit hook runs`)
    L(`     ${links.join(', ') || '(none)'}`)
  }

  L(); L('== G. Prose that will dangle (no gate link-checks these)')
  for (const [name, hits] of Object.entries(out.prose)) {
    L(`  ${name}  ${hits.length} mention(s) outside the folder`)
    if (hits.length) L(`     ${hits.slice(0, 12).join(', ')}${hits.length > 12 ? ` … +${hits.length - 12} more` : ''}`)
  }

  L(); L(`== summary: A=${out.A.length} (guard-forced ${out.A.filter((r) => r.guardForced).length}, invisible-to-guards ${out.A.filter((r) => !r.guardForced).length}) · B=${out.B.length} · keep=${out.keep.length}`)
  L('   Never propose: ' + NEVER_PROPOSE.join(', ') + ' (deleting one needs a code change in two places)')
  process.exit(0)
}

// ── Self-test — manifest coherence. Pure data; safe on the pristine kit. ─────
function selfTest() {
  const problems = []
  const keyOf = (starter, p) => `${starter}::${p.replace(/\/$/, '')}`

  // DELETION and MODIFICATION are different relations, and conflating them is wrong in a way the
  // first version of this self-test proved: `edits[]` names files a removal MODIFIES, and three of
  // them are keep-list entries on purpose — removing the OTP module edits a prose comment in
  // cloudFlow.ts, and removing the Power Apps example deletes one export from mock/generated.ts.
  // Editing a protected file is not only legal, it is sometimes the requirement: mock/generated.ts is
  // protected precisely by an EDIT constraint ("never empty it"), not a deletion one. So the
  // invariant is about `paths` alone.
  const deletedPaths = new Set()
  for (const e of REMOVE) for (const p of e.paths) deletedPaths.add(keyOf(e.starter, p))

  // 1. Nothing on the keep-list may be DELETED by a removal entry.
  for (const k of KEEP) {
    if (deletedPaths.has(keyOf(k.starter, k.path))) problems.push(`KEEP and REMOVE both name ${k.starter}/${k.path} as a deletion`)
  }
  // 2. THE TRIPWIRE: a protected path may never be deleted. Stated separately from check 1 so the
  //    message names the stakes — these are the files that ARE the architecture.
  for (const k of KEEP.filter((x) => x.protected)) {
    for (const e of REMOVE) {
      if (e.paths.some((p) => keyOf(e.starter, p) === keyOf(k.starter, k.path))) {
        problems.push(`PROTECTED ${k.starter}/${k.path} is listed for DELETION by ${e.id} — this is the architecture`)
      }
    }
  }
  // 3. Every removal is reachable — a dead manifest row is a row nobody maintains.
  for (const e of REMOVE) {
    if (!STARTERS[e.starter]) problems.push(`${e.id} names an unknown starter "${e.starter}"`)
    if (!e.paths.length && !(e.edits ?? []).length) problems.push(`${e.id} removes nothing`)
  }
  // 4. Every keep entry needs a REASON TO BE ON THE LIST — otherwise the list accumulates entries
  //    nobody can justify, which is how a keep-list stops being read. Two valid reasons:
  //      * a removal orphans it (so it needs protecting from anyone who then sweeps for dead code), or
  //      * it declares `zeroImportersEver` (so the list is what explains why an unused file is there).
  //    A `protected` entry needs no separate justification: it is load-bearing infrastructure, and
  //    the tripwire in check 2 is its reason.
  //    (The first cut of this check had the polarity inverted — it read a correct
  //    `zeroImportersEver: true` as "no evidence" and failed the three entries that declared
  //    themselves properly.)
  for (const k of KEEP) {
    if (k.protected || k.zeroImportersEver) continue
    const orphanedBySomething = REMOVE.some((e) => e.starter === k.starter && (e.orphans ?? []).includes(k.path))
    if (!orphanedBySomething) {
      problems.push(`KEEP ${k.starter}/${k.path} has no reason on the list: nothing orphans it, it is not protected, and it does not declare zeroImportersEver`)
    }
  }
  // 5. Pass is derived, never authored.
  for (const e of REMOVE) {
    if (e.becomesComponent !== (e.componentType != null)) problems.push(`${e.id}: becomesComponent and componentType disagree — the pass would be wrong`)
  }
  // 6. Paths stay inside their starter.
  for (const e of REMOVE) {
    for (const p of [...e.paths, ...(e.edits ?? []).map((x) => x.file)]) {
      if (path.isAbsolute(p)) problems.push(`${e.id}: "${p}" is absolute`)
      if (p.includes('..') && !p.startsWith('../apply-config.ps1')) problems.push(`${e.id}: "${p}" escapes its starter`)
    }
  }
  // 7. Every invariant referenced exists.
  for (const e of REMOVE) for (const k of e.invariants ?? []) {
    if (!INVARIANTS[k]) problems.push(`${e.id} references unknown invariant ${k}`)
  }
  // 8. The candidate list cannot contain a protected path, for ANY starter/pass combination.
  //    This is the negative control for "it is a classifier, not a sweep".
  const allCandidatePaths = new Set()
  for (const e of REMOVE) for (const p of e.paths) allCandidatePaths.add(keyOf(e.starter, p))
  for (const k of KEEP.filter((x) => x.protected)) {
    if (allCandidatePaths.has(keyOf(k.starter, k.path))) problems.push(`negative control failed: ${k.path} is reachable as a candidate`)
  }

  if (problems.length) {
    console.error('cleanup-audit --self-test: FAILED')
    problems.forEach((p) => console.error('  x ' + p))
    process.exit(1)
  }
  console.log(`cleanup-audit --self-test: OK — ${REMOVE.length} removal entries, ${KEEP.length} keep entries `
    + `(${KEEP.filter((k) => k.protected).length} protected), ${Object.keys(INVARIANTS).length} invariants, 8 checks`)
  process.exit(0)
}
