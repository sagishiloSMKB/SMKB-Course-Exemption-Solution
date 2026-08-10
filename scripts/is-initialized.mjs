#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// is-initialized — THE one answer to "has this repo been through Init Project?"
//
// WHY THIS EXISTS
// Three places asked that question and two of them asked it wrong. `.githooks/pre-commit`
// and `.github/workflows/ci.yml` each ran `grep -q 'YourSolutionName' solution.config.json`,
// while apply-config.ps1 tested the unique name AND the display name AND the prefix. A
// half-filled config — unique name typed, `shortPrefix` still `sol` — therefore read
// INITIALIZED to the hook and to CI, which promptly ran the placeholder-blocking gates
// against what is still a template, and UNINITIALIZED to `apply-config.ps1 -Check`, which
// skipped drift enforcement entirely. Two checkers disagreeing about whether a repo is real
// is worse than either answer, because each one looks green on its own.
//
// This is the single implementation for the shell consumers. apply-config.ps1 keeps a
// PowerShell mirror (it must run with no Node present); check-template-guards.mjs asserts the
// two name the same sentinels, so they cannot drift apart again.
//
// EXIT CODES (chosen so `if node scripts/is-initialized.mjs; then` reads naturally):
//   0 — initialized (a real solution)
//   1 — still the pristine template
//   2 — could not tell (config missing or unparseable) — treated as NOT initialized by callers
//
// Add --explain to print the reason.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONFIG = path.join(repoRoot, 'solution.config.json')

// The shipped template values. A field still holding one of these — or empty — is unfilled.
// Keep this table identical to Test-Initialized in apply-config.ps1.
export const SENTINELS = {
  solutionUniqueName: 'YourSolutionName',
  solutionDisplayName: 'Your Solution Name',
  shortPrefix: 'sol',
}

/** @returns {{ initialized: boolean, reason: string, unreadable?: boolean }} */
export function inspect(configPath = CONFIG) {
  if (!fs.existsSync(configPath)) {
    return { initialized: false, unreadable: true, reason: 'solution.config.json is missing' }
  }
  let cfg
  try {
    cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch (e) {
    return { initialized: false, unreadable: true, reason: `solution.config.json is not valid JSON: ${e.message}` }
  }
  const unfilled = []
  for (const [field, sentinel] of Object.entries(SENTINELS)) {
    const value = cfg[field]
    if (typeof value !== 'string' || value === '' || value === sentinel) {
      unfilled.push(`${field} (${value === '' || value === undefined ? 'empty' : `still "${value}"`})`)
    }
  }
  if (unfilled.length) {
    return { initialized: false, reason: `still the template - unfilled: ${unfilled.join(', ')}` }
  }
  return {
    initialized: true,
    reason: `initialized as "${cfg.solutionUniqueName}" (prefix "${cfg.shortPrefix}")`,
  }
}

// Only act when run directly, so the export above stays importable from a test.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = inspect()
  if (process.argv.includes('--explain')) console.log(result.reason)
  process.exit(result.initialized ? 0 : result.unreadable ? 2 : 1)
}
