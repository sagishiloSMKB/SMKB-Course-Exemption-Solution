/**
 * Build the Vue app and deploy it to Power Pages.
 *
 * Steps:
 *  1. Guard: must be on 'main' branch and config must be set
 *  2. ESLint (pnpm run lint — blocks on errors: v-html, console.log, Vue rules)
 *  3. Security check (pnpm check:security — blocks on critical failures)
 *  4. Verify/select the SMKB-Apps-Dev PAC auth environment
 *  5. Bump cache-bust version in the Liquid web template (?v=N)
 *  6. Build the client (vue-tsc + vite build)
 *  7. Copy dist/smkb/* → ../powerpages/.../web-files/
 *  8. GUID sentinel check (blocks if starter sentinel GUID still present in any YAML file)
 *  9. Upload via pac pages upload --modelVersion 2
 *
 * Usage (from the client/ directory):
 *   pnpm deploy
 */

import { execSync } from 'node:child_process'
import { copyFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── Per-environment config ─────────────────────────────────────────────────────
// TODO: Set these values before deploying to a new environment.
// PORTAL_URL  : public URL of the Power Pages site (used in the post-deploy message)
// PAGES_SUBDIR: folder name under powerpages/ — rename that folder to match your site,
//               then set this to the new name.
const PORTAL_URL   = 'https://TODO-your-portal.powerappsportals.com'
const PAGES_SUBDIR = 'your-portal---your-portal-dev'
// ──────────────────────────────────────────────────────────────────────────────

// ── SMKB organisation environment — fixed for all projects ────────────────────
// All SMKB Power Pages projects deploy to this single Power Platform environment.
const ORG_URL = 'https://org229c958d.crm4.dynamics.com'
// ──────────────────────────────────────────────────────────────────────────────

// ── Guard: must be on main branch ─────────────────────────────────────────────
const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
if (branch !== 'main') {
  console.error(`\n❌  Deploy from 'main' only. Current branch: '${branch}'\n`)
  process.exit(1)
}

// ── Guard: config must be filled in ───────────────────────────────────────────
if (PORTAL_URL.includes('TODO') || PAGES_SUBDIR === 'your-portal---your-portal-dev') {
  console.error(
    '\n❌  Not configured. Set PORTAL_URL and PAGES_SUBDIR in client/scripts/deploy.mjs,' +
    '\n    and rename the powerpages/ subfolder to match PAGES_SUBDIR.\n',
  )
  process.exit(1)
}

const root        = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot    = join(root, '..')
const distAssets  = join(root, 'dist', 'smkb')
const webFilesDir = join(repoRoot, 'powerpages', PAGES_SUBDIR, 'web-files')
const pagesDir    = join(repoRoot, 'powerpages', PAGES_SUBDIR)

// Resolve pac CLI: prefer PAC_CLI_PATH env var, fall back to the default LOCALAPPDATA install path.
const PAC = process.env.PAC_CLI_PATH
  ?? join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'PowerAppsCLI', 'pac.cmd')

// ── Pre-deploy lint ───────────────────────────────────────────────────────────
console.log('\n▶ Running ESLint...')
execSync('pnpm run lint', { cwd: root, stdio: 'inherit' })

// ── Pre-deploy security check ─────────────────────────────────────────────────
console.log('\n▶ Running security checks...')
execSync('node scripts/security-check.mjs', { cwd: root, stdio: 'inherit' })

// ── 0. Ensure SMKB-Apps-Dev is the active PAC auth environment ────────────────
console.log('\n▶ Verifying PAC environment...')
const authListOutput = execSync(`"${PAC}" auth list`, { encoding: 'utf8' })
const alreadyActive = authListOutput.split('\n').some(
  line => line.includes('*') && line.includes('org229c958d')
)
if (!alreadyActive) {
  const match = authListOutput.match(/\[(\d+)\][^\n]*org229c958d/)
  if (!match) {
    console.error(
      `\n❌  No PAC auth profile found for SMKB-Apps-Dev.\n` +
      `   Run: pac auth create --url ${ORG_URL}\n`
    )
    process.exit(1)
  }
  console.log(`   Switching to SMKB-Apps-Dev (profile index ${match[1]})...`)
  execSync(`"${PAC}" auth select --index ${match[1]}`, { stdio: 'inherit' })
}
console.log('   Environment: SMKB-Apps-Dev ✓')

// ── 1. Bump cache-bust version in web template ────────────────────────────────
const templateFile = join(pagesDir, 'web-templates', 'smkb-app', 'SMKB-App.webtemplate.source.html')
const templateSrc  = readFileSync(templateFile, 'utf8')
const curVer       = parseInt(templateSrc.match(/\?v=(\d+)/)?.[1] ?? '0')
const newVer       = curVer + 1
writeFileSync(templateFile, templateSrc.replace(/\?v=\d+/g, `?v=${newVer}`))
console.log(`\n▶ Cache version: v${curVer} → v${newVer}`)

// ── 2. Build ──────────────────────────────────────────────────────────────────
console.log('\n▶ Building client...')
execSync('pnpm run build', { cwd: root, stdio: 'inherit' })

// ── 3. Copy assets to web-files ───────────────────────────────────────────────
console.log('\n▶ Copying dist/smkb/* → web-files...')
const files = readdirSync(distAssets)
for (const file of files) {
  copyFileSync(join(distAssets, file), join(webFilesDir, file))
  console.log('  Copied', file)
}

// ── 3b. Guard: block if starter-kit sentinel GUIDs haven't been freshened ──────
console.log('\n▶ Checking for unfreshened starter-kit GUIDs...')
const SENTINEL_GUID = 'a3f1bd7e-2958-45af-90ce-e9d951422a3d'
function findYamlFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const results = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findYamlFiles(fullPath))
    } else if (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) {
      results.push(fullPath)
    }
  }
  return results
}
const yamlFiles = findYamlFiles(pagesDir)
const staleFiles = yamlFiles.filter(f => readFileSync(f, 'utf8').includes(SENTINEL_GUID))
if (staleFiles.length > 0) {
  console.error('\n❌  Starter-kit GUIDs detected in portal YAML files:')
  staleFiles.forEach(f => console.error(`   ${f}`))
  console.error('\n   Run guid-freshen.ps1 in the portal folder before deploying.')
  console.error('   This prevents this portal from colliding with other portals built from the same starter.\n')
  process.exit(1)
}
console.log('   No starter-kit GUIDs found ✓')

// ── 4. Upload to Power Pages ──────────────────────────────────────────────────
console.log('\n▶ Uploading to Power Pages...')
execSync(
  `"${PAC}" pages upload --path "${pagesDir}" --modelVersion 2`,
  { stdio: 'inherit' },
)

console.log('\n✅ Deployment complete.')
console.log(`   Clear server cache: ${PORTAL_URL}/_services/about`)

console.log('\n📋 Next step — promote to Stage/Production:')
console.log('   1. Verify the Dev site looks correct')
console.log('   2. Re-run the pac solution add-solution-component loop (INIT_PROJECT.md Step 11)')
console.log('      to ensure all portal components are linked to the solution')
console.log('   3. Trigger the pipeline: Dev → Stage → Production')
console.log('   Pipeline docs: https://learn.microsoft.com/en-us/power-platform/alm/set-up-pipelines\n')
