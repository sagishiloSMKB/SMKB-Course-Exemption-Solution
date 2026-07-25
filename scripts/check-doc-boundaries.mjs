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
  'powerpagecomponent',
  'SMKB - Power Page Starter',
]

// Pure per-starter build/dev commands that should never be inlined in root prose
// (warning only). PAC deploy commands are intentionally allowed — root references
// them in the deployment-method summary and the init flow.
const FORBIDDEN_PROSE = ['pnpm dev', 'pnpm build', 'npm run dev', 'npm run build']

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

for (const d of DOCS) checkDoc(d)

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
