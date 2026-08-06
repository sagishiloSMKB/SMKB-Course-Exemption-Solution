#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// check-template-guards — assert the pristine template does not trip its own guards.
//
// WHY THIS EXISTS
// A real initialization hit the same bug four separate times: a shipped file documents
// the very sentinel token that a guard greps that file for, so the guard fires on its own
// documentation and blocks a correctly configured solution. Two of the four made a starter
// undeployable on the first attempt, and the message pointed at a comment as though it
// were a misconfiguration. A guard that fires on prose teaches people to bypass guards.
//
// Each rule below pairs a shipped file with the token its own guard forbids, and asserts
// the token does not appear. Describe the token in prose instead of writing it (the
// starter's own comments now say so explicitly).
//
// Also checks: no non-ASCII byte in any .ps1 or shipped solution XML. Windows PowerShell
// 5.1 reads a UTF-8-without-BOM .ps1 as ANSI, so a non-ASCII literal becomes mojibake at
// parse time - and a `-replace` that then fails to match is indistinguishable from success.
// The same Windows-1255 corruption garbles XML display names.
//
// ERROR (exit 1) on any violation. Run standalone, from .githooks/pre-commit, and in CI.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Resolve a starter folder by its type suffix, so this keeps working after Init Project
// renames it (`SMKB - <Name> - Cloud Flows`). Prefer the renamed form over the template.
function starterDir(templateName, typeSuffix) {
  let entries = []
  try {
    entries = fs.readdirSync(repoRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('SMKB - ') && d.name.endsWith(` - ${typeSuffix}`))
      .map((d) => d.name)
      .sort()
  } catch { /* fall through to the template name */ }
  if (entries.length) return entries[0]
  return templateName
}

const TABLES = starterDir('SMKB - Dataverse Tables Starter', 'Dataverse Tables')
const ENVVAR = starterDir('SMKB - Environmental Variables Starter', 'Environmental Variables')
const FLOWS = starterDir('SMKB - Power Automate Flows Starter', 'Cloud Flows')
const CODESITE = starterDir('SMKB - Power Pages Code Site Starter', 'Power Pages Code Site')

// file → the token its own guard greps for, and where that guard lives.
// `allowReal` marks tokens that legitimately appear as configuration in the pristine
// template (not prose); for those we require every occurrence to be OUTSIDE a comment.
const GUARD_RULES = [
  {
    file: `${ENVVAR}/Other/Solution.xml`,
    token: 'smkb_sol_',
    guard: `${ENVVAR}/deploy.ps1 placeholder guard + flow-lint xml-no-placeholders`,
    comment: 'xml',
    allowReal: true, // the shipped RootComponent entries genuinely carry the placeholder prefix
  },
  {
    file: `${FLOWS}/Other/Solution.xml`,
    token: 'smkb_sol_',
    guard: `${FLOWS}/deploy.ps1 placeholder guard + flow-lint xml-no-placeholders`,
    comment: 'xml',
  },
  {
    file: `${FLOWS}/Other/Customizations.xml`,
    token: 'smkb_sol_',
    guard: `${FLOWS}/deploy.ps1 placeholder guard + flow-lint xml-no-placeholders`,
    comment: 'xml',
    allowReal: true, // the shipped <Workflow> skeletons genuinely reference the example flows
  },
  {
    file: `${CODESITE}/src/config/solution.ts`,
    token: 'CHANGEME',
    guard: `${CODESITE}/.claude/skills/ppcs-deploy step 1 (grep for the sentinel)`,
    comment: 'js',
    allowReal: true, // the shipped placeholder values are the sentinel
  },
  {
    file: `${CODESITE}/src/router/index.ts`,
    token: '() => import',
    guard: `${CODESITE}/.claude/skills/ppcs-deploy step 3 (grep for a lazy route import)`,
    comment: 'js',
  },
]

// Strip comments so a token described in prose is not confused with real configuration.
function stripComments(text, kind) {
  if (kind === 'xml') return text.replace(/<!--[\s\S]*?-->/g, '')
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

const errors = []
const warnings = []

for (const rule of GUARD_RULES) {
  const abs = path.join(repoRoot, rule.file)
  if (!fs.existsSync(abs)) { warnings.push(`${rule.file}: not found (skipped)`); continue }
  const text = fs.readFileSync(abs, 'utf8')
  if (!text.includes(rule.token)) continue

  const stripped = stripComments(text, rule.comment)
  const inCommentOnly = !stripped.includes(rule.token)

  if (inCommentOnly || !rule.allowReal) {
    // Report the offending comment lines so the fix is obvious.
    const lines = text.split(/\r?\n/)
    const strippedLines = stripComments(text, rule.comment).split(/\r?\n/)
    lines.forEach((line, i) => {
      if (!line.includes(rule.token)) return
      const stillThere = (strippedLines[i] || '').includes(rule.token)
      if (stillThere && rule.allowReal) return // real config, fine
      errors.push(
        `${rule.file}:${i + 1}  writes the token "${rule.token}" that its own guard forbids` +
        `\n      guard: ${rule.guard}` +
        `\n      line:  ${line.trim().slice(0, 100)}` +
        `\n      fix:   describe the token in prose instead of writing it literally`
      )
    })
  }
}

// ── No consumer may depend on the private registry ────────────────────────────
// The generated solution must install and build with NO credential. @smkbacil/design-ui is a
// PRIVATE package, so a version spec ("^0.16.1") makes every install -- local, CI, every new
// machine, forever -- depend on a live NPM_TOKEN. One expired org-wide token then turns every
// consuming repo red at once, even though the DEPLOYED site never touches the token (the library
// is compiled into assets/*.js at build time).
//
// So the invariant is inverted from the obvious one: rather than checking that a token works, we
// check that no token is NEEDED. Every @smkbacil dependency must be a `file:` spec pointing at a
// committed tarball that actually exists. Vendor or re-vendor with scripts/vendor-design-ui.ps1
// (the one place the token is used, on a developer machine only).
const PRIVATE_SCOPE = '@smkbacil/'
function collectPackageJsons(dir, out = []) {
  let entries = []
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '_dist' || e.name === '.git') continue
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) collectPackageJsons(abs, out)
    else if (e.name === 'package.json') out.push(abs)
  }
  return out
}

for (const abs of collectPackageJsons(repoRoot)) {
  const rel = path.relative(repoRoot, abs).replace(/\\/g, '/')
  let pkg
  try { pkg = JSON.parse(fs.readFileSync(abs, 'utf8')) } catch { continue }
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
      if (!name.startsWith(PRIVATE_SCOPE)) continue
      if (typeof spec !== 'string') continue
      if (!spec.startsWith('file:')) {
        errors.push(
          `${rel}  ${field}.${name} is "${spec}" - a registry spec for a PRIVATE package` +
          `\n      effect: every install (local, CI, new machine) needs a live NPM_TOKEN` +
          `\n      fix:    powershell -File scripts/vendor-design-ui.ps1 -Version <x.y.z>`
        )
        continue
      }
      // A file: spec pointing at a missing tarball fails at install time with a confusing
      // error, so catch it here where the message can say what actually happened.
      const target = path.resolve(path.dirname(abs), spec.slice('file:'.length))
      if (!fs.existsSync(target)) {
        errors.push(
          `${rel}  ${field}.${name} points at a tarball that does not exist` +
          `\n      missing: ${path.relative(repoRoot, target).replace(/\\/g, '/')}` +
          `\n      cause:   it was never committed (check .gitignore) or the version changed` +
          `\n      fix:     powershell -File scripts/vendor-design-ui.ps1`
        )
      }
    }
  }
}

// ── ASCII-only: every .ps1, and the solution XML the kit ships ────────────────
const ASCII_TARGETS = []
function collect(dir, test) {
  let entries = []
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '_dist' || e.name === 'dist' || e.name === '.git') continue
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) collect(abs, test)
    else if (test(e.name)) ASCII_TARGETS.push(abs)
  }
}
collect(repoRoot, (n) => n.endsWith('.ps1'))
for (const starter of [TABLES, ENVVAR, FLOWS]) {
  collect(path.join(repoRoot, starter), (n) => n.endsWith('.xml'))
}

for (const abs of ASCII_TARGETS) {
  const rel = path.relative(repoRoot, abs).replace(/\\/g, '/')
  const text = fs.readFileSync(abs, 'utf8')
  text.split(/\r?\n/).forEach((line, i) => {
    // Ignore a leading UTF-8 BOM: harmless here, and required by some XML tooling.
    const probe = i === 0 ? line.replace(/^﻿/, '') : line
    const bad = [...probe].filter((ch) => ch.codePointAt(0) > 0x7f)
    if (!bad.length) return
    const codes = [...new Set(bad.map((ch) => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')))]
    errors.push(
      `${rel}:${i + 1}  non-ASCII ${codes.join(' ')} - Windows PowerShell 5.1 / Windows-1255 corrupt these` +
      `\n      line:  ${line.trim().slice(0, 100)}` +
      `\n      fix:   use ASCII (- for dashes, = for rules, <- for arrows), or [char]0xNNNN in a .ps1`
    )
  })
}

if (warnings.length) {
  console.log('template-guards: warnings')
  warnings.forEach((w) => console.log('  ! ' + w))
}
if (errors.length) {
  console.error('template-guards: FAILED')
  errors.forEach((e) => console.error('  x ' + e))
  console.error(
    `\n${errors.length} violation(s). A shipped file must never contain a token its own guard ` +
    `forbids, and .ps1 / solution XML must stay ASCII-only.`
  )
  process.exit(1)
}
console.log('template-guards: OK' + (warnings.length ? ` (${warnings.length} warning(s))` : ''))
