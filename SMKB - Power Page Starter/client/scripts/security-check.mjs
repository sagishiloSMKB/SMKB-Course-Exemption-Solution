/**
 * Pre-deploy security gate.
 *
 * Exits with code 1 if any critical check fails.
 * Warnings are printed but do not block deployment.
 *
 * Usage (from the client/ directory):
 *   pnpm check:security
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root         = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot     = join(root, '..')        // Power Pages folder (pagesDir reads from here)
const solutionRoot = join(repoRoot, '..')    // solution folder = git repo root
const srcDir       = join(root, 'src')

// Locate the powerpages subfolder (adapts after project rename)
const pagesSubfolders = existsSync(join(repoRoot, 'powerpages'))
  ? readdirSync(join(repoRoot, 'powerpages'), { withFileTypes: true }).filter(d => d.isDirectory())
  : []
const pagesDir        = pagesSubfolders[0] ? join(repoRoot, 'powerpages', pagesSubfolders[0].name) : null
const siteSettingFile = pagesDir ? join(pagesDir, 'sitesetting.yml') : null
const websiteFile     = pagesDir ? join(pagesDir, 'website.yml') : null
const deployFile      = join(root, 'scripts', 'deploy.mjs')
const gitignoreFile   = join(solutionRoot, '.gitignore')

let criticalFailures = 0
let warnings = 0

function pass(msg)  { console.log(`  ✓  ${msg}`) }
function fail(msg)  { console.error(`  ✗  ${msg}`); criticalFailures++ }
function warn(msg)  { console.log(`  ⚠  ${msg}`); warnings++ }
function skip(msg)  { console.log(`  -  ${msg} (file not found — skipped)`) }

console.log('\nSMKB Security Check\n' + '─'.repeat(50))

// ── 1. Dependency vulnerabilities ─────────────────────────────────────────────
console.log('\n[1/10] Dependency vulnerabilities')
try {
  execSync('pnpm audit --audit-level=high', { cwd: root, stdio: 'pipe' })
  pass('No high/critical vulnerabilities')
} catch {
  fail('pnpm audit found high or critical vulnerabilities — run `pnpm audit` for details')
}

// ── 2. No secrets in source files ─────────────────────────────────────────────
console.log('\n[2/10] Secret patterns in source')
const SECRET_PATTERNS = [
  { re: /PRIVATE_KEY\s*[=:]/i,                              label: 'PRIVATE_KEY' },
  { re: /password\s*[=:]\s*['"`][^'"`\s]{3,}/i,             label: 'hardcoded password' },
  { re: /secret\s*[=:]\s*['"`][^'"`\s]{3,}/i,               label: 'hardcoded secret' },
  { re: /api[_-]?key\s*[=:]\s*['"`][^'"`\s]{3,}/i,          label: 'hardcoded API key' },
  { re: /Bearer\s+[A-Za-z0-9\-._~+/]{20,}/,                 label: 'hardcoded Bearer token' },
]
const srcFiles = getAllFiles(srcDir, ['.ts', '.vue', '.js'])
let secretFound = false
for (const file of srcFiles) {
  const content = readFileSync(file, 'utf8')
  for (const { re, label } of SECRET_PATTERNS) {
    if (re.test(content)) {
      fail(`Possible ${label} in ${rel(file)}`)
      secretFound = true
    }
  }
}
if (!secretFound) pass('No secret patterns in source files')

// ── 3. .env* covered by .gitignore ────────────────────────────────────────────
console.log('\n[3/10] .env* in .gitignore')
if (!existsSync(gitignoreFile)) {
  fail('.gitignore not found — create one and add .env* to prevent accidental secret commits')
} else {
  const gitignore = readFileSync(gitignoreFile, 'utf8')
  if (/^\.env/m.test(gitignore)) {
    pass('.env* covered by .gitignore')
  } else {
    fail('.env* is NOT in .gitignore — secrets could be committed accidentally')
  }
}

// ── 4. LocalLoginEnabled = false ──────────────────────────────────────────────
console.log('\n[4/10] LocalLoginEnabled = false')
if (!siteSettingFile || !existsSync(siteSettingFile)) {
  skip('sitesetting.yml')
} else {
  const settings = readFileSync(siteSettingFile, 'utf8')
  const entries = splitEntries(settings)
  const entry = entries.find(e => e.includes('Authentication/LocalLoginEnabled'))
  if (!entry) {
    warn('Authentication/LocalLoginEnabled not found in sitesetting.yml — add it explicitly')
  } else {
    const value = extractValue(entry)
    if (value?.toLowerCase() === 'false') {
      pass('LocalLoginEnabled = false (Azure AD-only auth)')
    } else {
      fail('LocalLoginEnabled is NOT false — local password login enabled, violates SMKB auth policy')
    }
  }
}

// ── 5. Required security headers ─────────────────────────────────────────────
console.log('\n[5/10] Required security headers in sitesetting.yml')
if (!siteSettingFile || !existsSync(siteSettingFile)) {
  skip('sitesetting.yml')
} else {
  const settings = readFileSync(siteSettingFile, 'utf8')
  const requiredHeaders = [
    'HTTP/X-Frame-Options',
    'HTTP/X-Content-Type-Options',
    'HTTP/Referrer-Policy',
    'HTTP/Permissions-Policy',
  ]
  let allPresent = true
  for (const header of requiredHeaders) {
    if (!settings.includes(header)) {
      fail(`Missing security header: ${header}`)
      allPresent = false
    }
  }
  if (allPresent) pass('All 4 required security headers present')
}

// ── 6. LoginTrackingEnabled = true ────────────────────────────────────────────
console.log('\n[6/10] LoginTrackingEnabled = true')
if (!siteSettingFile || !existsSync(siteSettingFile)) {
  skip('sitesetting.yml')
} else {
  const settings = readFileSync(siteSettingFile, 'utf8')
  const entries = splitEntries(settings)
  const trackingEntries = entries.filter(e => e.includes('Authentication/LoginTrackingEnabled'))
  if (trackingEntries.length === 0) {
    warn('Authentication/LoginTrackingEnabled not found in sitesetting.yml')
  } else {
    const allTrue = trackingEntries.every(e => extractValue(e)?.toLowerCase() === 'true')
    if (allTrue) {
      pass('LoginTrackingEnabled = true (audit trail active)')
    } else {
      warn('LoginTrackingEnabled is false — login audit trail disabled; recommended: set to true')
    }
  }
}

// ── 7. No v-html in Vue components ────────────────────────────────────────────
console.log('\n[7/10] No v-html in Vue components')
const vueFiles = getAllFiles(srcDir, ['.vue'])
let vhtmlFound = false
for (const file of vueFiles) {
  const content = readFileSync(file, 'utf8')
  if (content.includes('v-html')) {
    fail(`v-html found in ${rel(file)} — XSS risk; use v-text or sanitised slots instead`)
    vhtmlFound = true
  }
}
if (!vhtmlFound) pass('No v-html directives found')

// ── 8. No console.log in source ───────────────────────────────────────────────
console.log('\n[8/10] No console.log in source')
let consoleFound = false
for (const file of srcFiles) {
  const content = readFileSync(file, 'utf8')
  if (/console\.log/.test(content)) {
    warn(`console.log in ${rel(file)} — remove before production`)
    consoleFound = true
  }
}
if (!consoleFound) pass('No console.log in source files')

// ── 9. PORTAL_URL configured ──────────────────────────────────────────────────
console.log('\n[9/10] PORTAL_URL configured')
if (!existsSync(deployFile)) {
  skip('deploy.mjs')
} else {
  const deploy = readFileSync(deployFile, 'utf8')
  if (deploy.includes("'https://TODO")) {
    warn('PORTAL_URL is still a TODO placeholder in deploy.mjs — configure before deploying')
  } else {
    pass('PORTAL_URL configured')
  }
}

// ── 10. adx_websiteid configured ──────────────────────────────────────────────
console.log('\n[10/10] adx_websiteid configured')
if (!websiteFile || !existsSync(websiteFile)) {
  skip('website.yml')
} else {
  const website = readFileSync(websiteFile, 'utf8')
  if (website.includes('TODO')) {
    warn('adx_websiteid is still a TODO placeholder in website.yml — configure before deploying')
  } else {
    pass('adx_websiteid configured')
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50))
if (criticalFailures === 0 && warnings === 0) {
  console.log('✅ All checks passed.\n')
} else if (criticalFailures === 0) {
  console.log(`✅ Passed with ${warnings} warning(s).\n`)
  process.exit(0)
} else {
  console.error(`\n❌ ${criticalFailures} critical failure(s), ${warnings} warning(s) — fix critical issues before deploying.\n`)
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAllFiles(dir, extensions) {
  const results = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, extensions))
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath)
    }
  }
  return results
}

function splitEntries(yaml) {
  return ('\n' + yaml).split('\n- ').filter(Boolean)
}

function extractValue(entry) {
  const match = entry.match(/adx_value:\s*['"]?([^\s'"#\n]+)['"]?/)
  return match?.[1] ?? null
}

function rel(filePath) {
  return filePath.replace(root, '').replace(/\\/g, '/')
}
