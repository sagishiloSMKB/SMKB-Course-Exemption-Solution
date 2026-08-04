#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// flow-lint — static checks for this solution's cloud flows + solution XML.
//
// Zero-dependency Node ESM (only built-ins), so it runs from a pre-commit hook,
// deploy.ps1, or CI *without* an npm install.
//
// Usage:
//   node tools/flow-lint/lint.mjs [--strict] [--json] [flowsDir]
//     --strict   exit non-zero on warnings too (default: errors only)
//     --json     emit findings as JSON
//     flowsDir   override the auto-discovered Workflows folder
//
// Exit code: 0 = clean (no errors); 1 = errors found (or warnings with --strict).
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rules, globalRules } from './rules.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const argv = process.argv.slice(2)
const strict = argv.includes('--strict')
const asJson = argv.includes('--json')
const flowsDirArg = argv.find((a) => !a.startsWith('--'))

// ── Discovery ────────────────────────────────────────────────────────────────
// This script lives at <repo>/<flows starter>/tools/flow-lint/, but a solution renames
// its starter folders, so never rely on a fixed depth: walk up to the folder that holds
// solution.config.json (the repo root marker).
function findRepoRoot(start) {
  let cur = start
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, 'solution.config.json'))) return cur
    const up = path.dirname(cur)
    if (up === cur) break
    cur = up
  }
  return path.resolve(start, '..', '..')
}
const repoRoot = findRepoRoot(__dirname)

// A starter folder is either still template-named ("... Starter") or renamed by the
// solution ("SMKB - <Name> - Cloud Flows"), so match any of the accepted suffixes.
function findDir(root, ...endsWithAny) {
  let entries
  try { entries = fs.readdirSync(root, { withFileTypes: true }) } catch { return null }
  for (const suffix of endsWithAny) {
    const hit = entries.filter((d) => d.isDirectory() && d.name.endsWith(suffix))
    if (hit.length) return path.join(root, hit[0].name)
  }
  return null
}

const cloudFlowsDir = flowsDirArg
  ? path.dirname(path.resolve(flowsDirArg))
  : findDir(repoRoot, 'Cloud Flows', 'Power Automate Flows Starter')
const workflowsDir = flowsDirArg ? path.resolve(flowsDirArg) : (cloudFlowsDir && path.join(cloudFlowsDir, 'Workflows'))
const envVarsDir = findDir(repoRoot, 'Environmental Variables', 'Environmental Variables Starter')

if (!workflowsDir || !fs.existsSync(workflowsDir)) {
  console.error(`flow-lint: could not find a Workflows folder (looked under ${repoRoot}). Pass one explicitly.`)
  process.exit(2)
}

// ── Shared context: env-var schema names + solution XML files ──────────────────
function collectEnvVarSchemaNames(dir) {
  const set = new Set()
  if (!dir) return set
  const defsRoot = path.join(dir, 'environmentvariabledefinitions')
  if (!fs.existsSync(defsRoot)) return set
  for (const entry of fs.readdirSync(defsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const xml = path.join(defsRoot, entry.name, 'environmentvariabledefinition.xml')
    if (!fs.existsSync(xml)) { set.add(entry.name); continue }
    const raw = fs.readFileSync(xml, 'utf8')
    const m = raw.match(/schemaname="([^"]+)"/i)
    set.add(m ? m[1] : entry.name)
  }
  return set
}

const ctx = { envVarSchemaNames: collectEnvVarSchemaNames(envVarsDir) }

// ── Load flows ─────────────────────────────────────────────────────────────────
const flowFiles = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.json'))
const findings = []
const add = (severity, ruleId, file, location, message) => findings.push({ severity, ruleId, file, location, message })

for (const file of flowFiles) {
  const abs = path.join(workflowsDir, file)
  const raw = fs.readFileSync(abs, 'utf8').replace(/^﻿/, '')
  let json
  try {
    json = JSON.parse(raw)
  } catch (e) {
    add('error', 'flow-valid-json', file, '(file)', `not valid JSON: ${e.message}`)
    continue
  }
  const flow = { name: file.replace(/-[0-9A-Fa-f-]{36}\.json$/, ''), path: abs, raw, json }
  for (const rule of rules) {
    let out = []
    try { out = rule.check(flow, ctx) || [] } catch (e) { add('error', rule.id, file, '(rule)', `rule threw: ${e.message}`) }
    for (const f of out) add(rule.severity, rule.id, file, f.location, f.message)
  }
}

// ── Global rules (whole-solution): gather XML + build context, then run ──────────
function gatherXml(dir, out) {
  if (!dir || !fs.existsSync(dir)) return
  const stack = [dir]
  while (stack.length) {
    const cur = stack.pop()
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const abs = path.join(cur, entry.name)
      if (entry.isDirectory()) {
        if (!/(_dist|node_modules|\.git)/.test(entry.name)) stack.push(abs)
      } else if (entry.name.toLowerCase().endsWith('.xml')) {
        out.push({ rel: path.relative(repoRoot, abs), raw: fs.readFileSync(abs, 'utf8') })
      }
    }
  }
}
const readIf = (p) => (p && fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '')
const xmlFiles = []
gatherXml(cloudFlowsDir, xmlFiles)
gatherXml(envVarsDir, xmlFiles)

const gctx = {
  flowFiles,
  customizationsXml: cloudFlowsDir ? readIf(path.join(cloudFlowsDir, 'Other', 'Customizations.xml')) : '',
  envSolutionXml: envVarsDir ? readIf(path.join(envVarsDir, 'Other', 'Solution.xml')) : '',
  envVarSchemaNames: ctx.envVarSchemaNames,
  xmlFiles,
}
for (const rule of globalRules) {
  let out = []
  try { out = rule.check(gctx) || [] } catch (e) { add('error', rule.id, '(global)', '(rule)', `rule threw: ${e.message}`) }
  // A global rule's `location` IS a file path (Workflows/x.json, Other/Solution.xml, an
  // XML rel path), so it belongs in the file slot - that is what groups these findings
  // per file in the report. There is no sub-location within it, hence '(file)'.
  for (const f of out) add(rule.severity, rule.id, f.location, '(file)', f.message)
}

// ── Report ───────────────────────────────────────────────────────────────────
const errors = findings.filter((f) => f.severity === 'error')
const warns = findings.filter((f) => f.severity === 'warn')

if (asJson) {
  console.log(JSON.stringify({ flows: flowFiles.length, errors: errors.length, warnings: warns.length, findings }, null, 2))
} else {
  const byFile = new Map()
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, [])
    byFile.get(f.file).push(f)
  }
  for (const [file, fs2] of byFile) {
    console.log(`\n${file}`)
    for (const f of fs2) {
      const tag = f.severity === 'error' ? 'ERROR' : 'warn '
      console.log(`  ${tag} [${f.ruleId}] ${f.location}\n        ${f.message}`)
    }
  }
  console.log(`\nflow-lint: ${flowFiles.length} flows · ${errors.length} error(s) · ${warns.length} warning(s)`)
  if (ctx.envVarSchemaNames.size === 0) console.log('  (note: no Environmental Variables folder found — env-var cross-check skipped)')
  if (errors.length === 0 && warns.length === 0) console.log('  ✓ clean')
}

process.exit(errors.length > 0 || (strict && warns.length > 0) ? 1 : 0)
