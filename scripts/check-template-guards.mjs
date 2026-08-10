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
// Also checks two charset rules with deliberately different strictness (see below):
// .ps1 must be pure ASCII (PowerShell 5.1 reads UTF-8-without-BOM as ANSI, so a non-ASCII
// literal is mojibake at parse time, and a `-replace` that then fails to match is
// indistinguishable from success); shipped solution XML may carry any script - Hebrew is
// first-class here - but not confusable punctuation, which Windows-1255 tooling garbles.
// Plus: no consumer may depend on the private npm registry.
//
// ERROR (exit 1) on any violation. Run standalone, from .githooks/pre-commit, and in CI.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
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
  // See the note in check-doc-boundaries.mjs: returning entries[0] with two folders of the same
  // type silently leaves the second one unguarded, which reads as green.
  if (entries.length > 1) {
    console.error(
      `template-guards: FAILED\n  x more than one "${typeSuffix}" starter folder: ${entries.join(', ')}` +
      `\n      Only one per type is supported; the extra would go unguarded.` +
      `\n      fix:   keep one per type, or extend starterDir()/apply-config.ps1 to a list.`
    )
    process.exit(1)
  }
  if (entries.length) return entries[0]
  return templateName
}

const POWERAPP = starterDir('SMKB - Power Apps Starter', 'Power App')
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

// ── Directory-wide guard scan ────────────────────────────────────────────────
// GUARD_RULES above pairs ONE file with ONE token, which left most of the surface unchecked: the
// Tables starter had no rule at all, Power Apps had none, and each deploy.ps1 actually scans its
// whole tree - so any shipped .xml/.ts/.vue comment that mentions a guarded token blocks a
// correct deploy. That is the exact failure this file exists to prevent, on four more starters.
//
// The token lists are READ OUT OF each deploy.ps1's own $placeholders array rather than copied
// here. A copy drifts the moment a starter adds a token, and the drift is invisible - the check
// keeps passing while guarding less. Failing to parse the array is an ERROR for the same reason.
//
// Semantics: a token INSIDE a comment is an error (the guard would fire on prose). A token in
// real configuration is fine - guards are supposed to fire on those until the developer renames
// them. Files with no comment syntax (.json) are skipped: they cannot hold prose.
function readGuardTokens(deployRel) {
  const abs = path.join(repoRoot, deployRel)
  if (!fs.existsSync(abs)) return { tokens: null, why: 'deploy.ps1 not found' }
  const text = fs.readFileSync(abs, 'utf8')
  const m = text.match(/\$placeholders\s*=\s*@\(([\s\S]*?)\)/)
  if (!m) return { tokens: null, why: 'no $placeholders = @( ... ) array found' }
  const tokens = [...m[1].matchAll(/'((?:[^']|'')*)'/g)].map((x) => x[1].replace(/''/g, "'"))
  if (!tokens.length) return { tokens: null, why: '$placeholders array parsed as empty' }
  return { tokens, why: '' }
}

const COMMENT_KIND = { '.xml': 'xml', '.ts': 'js', '.vue': 'js', '.mjs': 'js' }

const DIR_GUARD_RULES = [
  { starter: TABLES, deploy: `${TABLES}/deploy.ps1`, roots: [TABLES], exts: ['.xml'] },
  { starter: ENVVAR, deploy: `${ENVVAR}/deploy.ps1`, roots: [ENVVAR], exts: ['.xml'] },
  { starter: FLOWS, deploy: `${FLOWS}/deploy.ps1`, roots: [`${FLOWS}/Other`, `${FLOWS}/Workflows`], exts: ['.xml', '.json'] },
  { starter: POWERAPP, deploy: `${POWERAPP}/deploy.ps1`, roots: [POWERAPP], exts: ['.json', '.ts', '.vue'] },
]

// Is this starter present at all? A solution may legitimately delete a starter it never
// activated, and every check below must then be a recorded SKIP - not a failure. But a starter
// folder that IS present and has lost a file the checker addresses is a real problem, and the
// distinction is the whole difference between a warning that means nothing and one that means
// something. Every "not found" path below decides between the two on this predicate.
const starterPresent = (name) => fs.existsSync(path.join(repoRoot, name))
const skipped = []

// Strip comments so a token described in prose is not confused with real configuration.
//
// LINE-PRESERVING on purpose. Every caller compares `lines[i]` against `strippedLines[i]` to
// decide "comment or real config", so deleting a comment outright shifts every line after it and
// the two arrays stop describing the same line. A multi-line `<!-- ... -->` near the top of a
// solution XML made this checker report real <RootComponent> and <optionset> elements as comments
// - 20 false positives that all read like genuine violations. Blanking the comment's characters
// while keeping its newlines makes the index meaningful again.
const blankOut = (s) => s.replace(/[^\n]/g, ' ')
function stripComments(text, kind) {
  if (kind === 'xml') return text.replace(/<!--[\s\S]*?-->/g, blankOut)
  return text
    .replace(/\/\*[\s\S]*?\*\//g, blankOut)
    // The [^:] guard keeps `https://` from reading as a line comment.
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + blankOut(m.slice(p1.length)))
}

const errors = []
const warnings = []

for (const rule of DIR_GUARD_RULES) {
  if (!starterPresent(rule.starter)) { skipped.push(`${rule.starter} (starter folder absent)`); continue }
  const { tokens, why } = readGuardTokens(rule.deploy)
  if (!tokens) {
    // Not a warning. The starter IS here, so a guard whose token list cannot be read is a guard
    // this checker silently stopped checking - and printing OK afterwards is how that gap stays
    // invisible for as long as it takes someone to trip over it in a real deploy.
    errors.push(
      `${rule.deploy}  cannot read its $placeholders guard list - ${why}` +
      `\n      effect: the shipped files it guards are NOT checked for the tokens it forbids` +
      `\n      fix:    restore the array, or drop this entry from DIR_GUARD_RULES here`
    )
    continue
  }
  const files = []
  for (const r of rule.roots) {
    collectGuardFiles(path.join(repoRoot, r), rule.exts, files)
  }
  for (const abs of files) {
    const kind = COMMENT_KIND[path.extname(abs).toLowerCase()]
    if (!kind) continue // .json and friends: no comment syntax, so no prose to fire on
    const rel = path.relative(repoRoot, abs).replace(/\\/g, '/')
    const text = fs.readFileSync(abs, 'utf8')
    if (!tokens.some((t) => text.includes(t))) continue
    const lines = text.split(/\r?\n/)
    const strippedLines = stripComments(text, kind).split(/\r?\n/)
    lines.forEach((line, i) => {
      for (const token of tokens) {
        if (!line.includes(token)) continue
        if ((strippedLines[i] || '').includes(token)) continue // real config, fine
        errors.push(
          `${rel}:${i + 1}  a COMMENT writes "${token}", a token its own guard forbids` +
          `\n      guard: ${rule.deploy} placeholder scan (whole tree, *${rule.exts.join(' *')})` +
          `\n      line:  ${line.trim().slice(0, 100)}` +
          `\n      fix:   describe the token in prose instead of writing it literally`
        )
      }
    })
  }
}

for (const rule of GUARD_RULES) {
  const abs = path.join(repoRoot, rule.file)
  if (!fs.existsSync(abs)) {
    // "not found (skipped)" as a warning was indistinguishable from a pass, which is the same
    // silent-skip class of bug the resolvers above exist to prevent. Split it: a whole starter
    // that is gone is a legitimate skip; a file gone from a starter that is still here is an error.
    const starter = rule.file.split('/')[0]
    if (starterPresent(starter)) {
      errors.push(
        `${rule.file}  not found, but "${starter}" is present - this guard was NOT checked` +
        `\n      guard: ${rule.guard}` +
        `\n      fix:   restore the file, or drop this rule from GUARD_RULES`
      )
    } else {
      skipped.push(`${rule.file} (starter folder absent)`)
    }
    continue
  }
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
  // overrides / resolutions / pnpm.overrides can each reintroduce a registry spec for the private
  // scope, and peerDependencies is declared alongside them. Checking only the three obvious fields
  // left four ways to regress past this gate.
  const FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies',
                  'overrides', 'resolutions']
  const nested = [pkg.pnpm?.overrides, pkg.pnpm?.peerDependencyRules?.allowedVersions]
  for (const extra of nested) {
    for (const [name, spec] of Object.entries(extra ?? {})) {
      if (name.startsWith(PRIVATE_SCOPE) && typeof spec === 'string' && !spec.startsWith('file:')) {
        errors.push(`${rel}  pnpm override ${name} is "${spec}" - a registry spec for a PRIVATE package`)
      }
    }
  }
  for (const field of FIELDS) {
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
      // Tracked-ness, not just existence. The message below names "never committed" as the likely
      // cause, yet checking the filesystem is precisely what CANNOT detect it: vendor the tarball,
      // forget `git add`, and this passed locally while CI failed on a file that was not there.
      if (fs.existsSync(target)) {
        const relTarget = path.relative(repoRoot, target).replace(/\\/g, '/')
        const r = spawnSync('git', ['ls-files', '--error-unmatch', '--', relTarget],
                            { cwd: repoRoot, encoding: 'utf8' })
        // status 0 = tracked. A non-zero status with git present means untracked; if git itself is
        // unavailable (r.error), stay silent rather than inventing a failure.
        if (!r.error && r.status !== 0) {
          errors.push(
            `${rel}  ${field}.${name} points at a tarball that exists but is NOT git-tracked` +
            `\n      path:   ${relTarget}` +
            `\n      effect: it works on this machine and fails on every clone and in CI` +
            `\n      fix:    git add the tarball (check .gitignore), then commit it with the lockfile`
          )
        }
      }
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

// ── The initialized predicate must not fork ──────────────────────────────────
// scripts/is-initialized.mjs is the implementation for the shell consumers; apply-config.ps1
// keeps a PowerShell mirror because it must run with no Node present. Two implementations means
// they can drift, and the drift is silent: the hook and CI ran the placeholder gates against a
// half-filled template while `-Check` skipped drift enforcement on the same repo. So assert
// mechanically that both name the same sentinel values.
{
  const isInitAbs = path.join(repoRoot, 'scripts/is-initialized.mjs')
  const applyAbs = path.join(repoRoot, 'apply-config.ps1')
  if (!fs.existsSync(isInitAbs)) {
    errors.push('scripts/is-initialized.mjs is missing - .githooks/pre-commit and CI depend on it')
  } else if (fs.existsSync(applyAbs)) {
    const isInit = fs.readFileSync(isInitAbs, 'utf8')
    const apply = fs.readFileSync(applyAbs, 'utf8')
    const sentinels = [...isInit.matchAll(/^\s*(\w+):\s*'([^']*)',/gm)].map((m) => m[2])
    const predicate = apply.match(/function Test-Initialized \{([\s\S]*?)\n\}/)
    if (!sentinels.length) {
      errors.push('scripts/is-initialized.mjs  could not parse its SENTINELS table')
    } else if (!predicate) {
      errors.push('apply-config.ps1  Test-Initialized not found - the mirrored predicate is gone')
    } else {
      for (const s of sentinels) {
        if (!predicate[1].includes(`'${s}'`)) {
          errors.push(
            `apply-config.ps1  Test-Initialized does not test the sentinel "${s}"` +
            `\n      effect: this repo reads INITIALIZED to one checker and not the other` +
            `\n      fix:    keep Test-Initialized in step with SENTINELS in scripts/is-initialized.mjs`
          )
        }
      }
    }
  }
}

// ── Charset rules: STRICT for .ps1, targeted for shipped XML ─────────────────
// Two different problems were being solved by one rule, and conflating them broke Hebrew.
//
//  .ps1  -> ASCII ONLY. Windows PowerShell 5.1 reads a UTF-8-without-BOM script as ANSI, so ANY
//           non-ASCII literal becomes mojibake at PARSE time. This is about the parser.
//
//  .xml  -> only CONFUSABLE PUNCTUATION is banned. The original failure was a Unicode en dash in
//           a display name arriving as `ג€"` through Hebrew-locale Windows-1255 tooling - a
//           punctuation problem, never a "no other scripts" problem. Dataverse solution XML is
//           UTF-8 and carries Hebrew correctly, and this kit treats Hebrew as first-class
//           (powerPages.appNameHe). Banning all non-ASCII here meant apply-config.ps1 would write
//           a Hebrew solutionDisplayName into three Solution.xml files and then this very check
//           hard-failed every commit, pointing at a line the kit itself had just written.
const ASCII_TARGETS = []
const XML_TARGETS = []
// Characters that look like ASCII punctuation but are not, and that locale-dependent tooling
// mangles. Each maps to the ASCII form the author almost certainly meant.
const CONFUSABLES = new Map([
  ['\u2013', "en dash - use '-'"],
  ['\u2014', "em dash - use '-'"],
  ['\u2018', "left single quote - use \"'\""],
  ['\u2019', "right single quote / apostrophe - use \"'\""],
  ['\u201C', 'left double quote - use \'"\''],
  ['\u201D', 'right double quote - use \'"\''],
  ['\u00A0', 'non-breaking space - use a normal space'],
])
// Walk a guarded tree, honouring the same exclusions the deploy scripts use.
function collectGuardFiles(dir, exts, out) {
  let entries = []
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    if (['node_modules', 'dist', '_dist', '.git', 'vendor'].includes(e.name)) continue
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) collectGuardFiles(abs, exts, out)
    else if (exts.includes(path.extname(e.name).toLowerCase())) out.push(abs)
  }
  return out
}

function collect(dir, test, into) {
  let entries = []
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '_dist' || e.name === 'dist' || e.name === '.git') continue
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) collect(abs, test, into)
    else if (test(e.name)) into.push(abs)
  }
}
collect(repoRoot, (n) => n.endsWith('.ps1'), ASCII_TARGETS)
for (const starter of [TABLES, ENVVAR, FLOWS]) {
  collect(path.join(repoRoot, starter), (n) => n.endsWith('.xml'), XML_TARGETS)
}

function eachLine(abs, cb) {
  const rel = path.relative(repoRoot, abs).replace(/\\/g, '/')
  const text = fs.readFileSync(abs, 'utf8')
  text.split(/\r?\n/).forEach((line, i) => {
    // Ignore a leading UTF-8 BOM: harmless here, and required by some XML tooling.
    cb(rel, i === 0 ? line.replace(/^﻿/, '') : line, i, line)
  })
}

// .ps1 - any non-ASCII byte is a parse-time hazard.
for (const abs of ASCII_TARGETS) {
  eachLine(abs, (rel, probe, i, line) => {
    const bad = [...probe].filter((ch) => ch.codePointAt(0) > 0x7f)
    if (!bad.length) return
    const codes = [...new Set(bad.map((ch) => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')))]
    errors.push(
      `${rel}:${i + 1}  non-ASCII ${codes.join(' ')} in a .ps1 - PowerShell 5.1 reads UTF-8-without-BOM as ANSI,` +
      `\n             so this becomes mojibake at parse time` +
      `\n      line:  ${line.trim().slice(0, 100)}` +
      `\n      fix:   use ASCII (- for dashes, = for rules, <- for arrows), or [char]0xNNNN`
    )
  })
}

// Shipped solution XML - Hebrew and any other script are fine; confusable punctuation is not.
for (const abs of XML_TARGETS) {
  eachLine(abs, (rel, probe, i, line) => {
    const hits = [...new Set([...probe].filter((ch) => CONFUSABLES.has(ch)))]
    if (!hits.length) return
    for (const ch of hits) {
      const cp = 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')
      errors.push(
        `${rel}:${i + 1}  ${cp} ${CONFUSABLES.get(ch)}` +
        `\n             Hebrew-locale Windows-1255 tooling renders these as garbage in Dataverse` +
        `\n      line:  ${line.trim().slice(0, 100)}`
      )
    }
  })
}

if (warnings.length) {
  console.log('template-guards: warnings')
  warnings.forEach((w) => console.log('  ! ' + w))
}
if (skipped.length) {
  // Printed separately, and always, so "OK" is never read as "checked everything".
  console.log(`template-guards: ${skipped.length} check(s) skipped - nothing to scan`)
  skipped.forEach((s) => console.log('  - ' + s))
}
if (errors.length) {
  console.error('template-guards: FAILED')
  errors.forEach((e) => console.error('  x ' + e))
  console.error(
    `\n${errors.length} violation(s). A shipped file must never contain a token its own guard ` +
    `forbids; .ps1 must stay ASCII; shipped XML must avoid confusable punctuation; and no ` +
    `consumer may depend on the private registry.`
  )
  process.exit(1)
}
console.log('template-guards: OK' + (warnings.length ? ` (${warnings.length} warning(s))` : ''))
