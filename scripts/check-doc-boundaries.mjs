#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// check-doc-boundaries — enforces the root/starter documentation boundary.
//
// Zero-dependency Node ESM (built-ins only) so it runs from the pre-commit hook
// or CI without an npm install. Checks the three ROOT orchestrator docs:
//   CLAUDE.md · README.md · INIT_PROJECT.md
//
//   ERROR (exit 1):
//     • Old-architecture / obsolete tokens — these describe starters that no
//       longer exist and would contradict the new starters (see the refactor
//       plan's Contradiction Register).
//     • Broken relative links — a link from a root doc into a starter must point
//       at a file that actually exists (anti-rot).
//   WARNING (does not fail):
//     • Starter build/deploy commands inlined in prose — root should reference a
//       starter's own docs for these, not re-document them.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = ['CLAUDE.md', 'README.md', 'INIT_PROJECT.md']

// Obsolete tokens from the retired Power Pages Liquid model + old Power Apps
// direct-Dataverse model. None may appear in root docs.
const FORBIDDEN_ALWAYS = [
  'deploy.mjs',
  'deconflict-portal',
  'verify-consistency',
  '__RequestVerificationToken',
  'check:security',
  'SMKB-App.webtemplate',
  'sol_example_item',
  'SMKB - Power Page Starter',
  // NOTE: 'powerpagecomponent' was listed here as retired Liquid-portal vocabulary. It is NOT
  // retired - it is the enhanced-data-model (modelVersion 2) Dataverse table that Code Sites
  // use, and the literal `--componentType` value the site-to-solution reconcile requires. The
  // ban made the kit structurally unable to document its own fix: the pre-commit hook rejected
  // the Step 10b text as an "obsolete token". Do not re-add it.
]

// Pure per-starter build/dev commands that should never be inlined in root prose
// (warning only). PAC deploy commands are intentionally allowed — root references
// them in the deployment-method summary and the init flow.
const FORBIDDEN_PROSE = ['pnpm dev', 'pnpm build', 'npm run dev', 'npm run build']

// ── Retired component-naming shape ──────────────────────────────────────────
// The canonical schema name is smkb_<prefix>_<PascalName> (CLAUDE.md Critical Rule 3).
// A bare `sol_x` / `[sol]_x` token with no `smkb_` publisher segment is the retired
// pre-canonical shape. These files are the ones developers copy from, so a stale example
// here propagates the wrong convention into real solutions.
const RETIRED_NAMING = /(?<!smkb_)(?<!\w)(?:sol_[a-z]|\[sol\]_)/
const NAMING_FILES = [
  ...DOCS,
  'SMKB - Dataverse Tables Starter/README.md',
  'SMKB - Dataverse Tables Starter/Other/Customizations.xml',
  'SMKB - Dataverse Tables Starter/Relationships.xml',
  'SMKB - Environmental Variables Starter/README.md',
  'SMKB - Environmental Variables Starter/Other/Solution.xml',
  'SMKB - Power Automate Flows Starter/README.md',
]
// Legitimate exceptions:
//   • a line that documents the retirement itself (CLAUDE.md's deployed-placeholder warning)
//   • sol_exampleflow — a live, tool-generated data-source token in the Power Apps starter
//     scaffold that `pnpm pa add-flow` regenerates; its deploy guard blocks on it by design.
const NAMING_ALLOW = [/old naming/i, /sol_exampleflow/]

const errors = []
const warnings = []

function checkDoc(rel) {
  const abs = path.join(repoRoot, rel)
  if (!fs.existsSync(abs)) { warnings.push(`${rel}: not found (skipped)`); return }
  const text = fs.readFileSync(abs, 'utf8')
  const lines = text.split(/\r?\n/)

  // 1) Forbidden tokens (line-scanned; track fenced code blocks for prose rule).
  let inFence = false
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) { inFence = !inFence; return }
    for (const tok of FORBIDDEN_ALWAYS) {
      if (line.includes(tok)) errors.push(`${rel}:${i + 1}  obsolete token "${tok}"`)
    }
    if (!inFence) {
      for (const tok of FORBIDDEN_PROSE) {
        // Word-boundary match so e.g. "npm run dev" does not fire inside "pnpm run dev".
        if (new RegExp('\\b' + tok).test(line)) warnings.push(`${rel}:${i + 1}  starter command "${tok}" in prose — link to the starter instead`)
      }
    }
  })

  // 2) Relative-link integrity: [text](target) and [text](<target>).
  const linkRe = /\]\(\s*(<[^>]+>|[^)\s]+)([^)]*)\)/g
  let m
  while ((m = linkRe.exec(text)) !== null) {
    let target = m[1].replace(/^<|>$/g, '')
    if (/^(https?:|mailto:|#)/i.test(target)) continue
    target = target.split('#')[0]
    if (!target) continue
    const decoded = decodeURIComponent(target)
    const resolved = path.resolve(repoRoot, decoded)
    if (!fs.existsSync(resolved)) {
      const line = text.slice(0, m.index).split(/\r?\n/).length
      errors.push(`${rel}:${line}  broken link -> ${decoded}`)
    }
  }
}

function checkNaming(rel) {
  const abs = path.join(repoRoot, rel)
  if (!fs.existsSync(abs)) return
  fs.readFileSync(abs, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (!RETIRED_NAMING.test(line)) return
    if (NAMING_ALLOW.some((re) => re.test(line))) return
    errors.push(`${rel}:${i + 1}  retired naming shape (use smkb_<prefix>_<PascalName>) -> ${line.trim().slice(0, 80)}`)
  })
}

for (const d of DOCS) checkDoc(d)
for (const f of NAMING_FILES) checkNaming(f)

if (warnings.length) {
  console.log('doc-boundaries: warnings')
  warnings.forEach((w) => console.log('  ! ' + w))
}
if (errors.length) {
  console.error('doc-boundaries: FAILED')
  errors.forEach((e) => console.error('  x ' + e))
  console.error(`\n${errors.length} error(s). Root docs must not reference retired starter architecture, and every relative link must resolve.`)
  process.exit(1)
}
console.log('doc-boundaries: OK' + (warnings.length ? ` (${warnings.length} warning(s))` : ''))
