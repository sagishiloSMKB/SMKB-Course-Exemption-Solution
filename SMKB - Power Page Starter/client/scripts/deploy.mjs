/**
 * Build the Vue app and deploy it to Power Pages.
 *
 * Steps:
 *  1. Guard: must be on 'main' branch and config must be set
 *  2. Security check (pnpm check:security — must pass before continuing)
 *  3. Verify/select the SMKB-Apps-Dev PAC auth environment
 *  4. Bump cache-bust version in the Liquid web template (?v=N)
 *  5. Build the client (vue-tsc + vite build)
 *  6. Copy dist/smkb/* → ../powerpages/.../web-files/
 *  7. Upload via pac pages upload --modelVersion 2
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
console.log('   2. In Power Apps Maker: add any new components to the solution')
console.log('      (Add Existing → Power Pages → select your website)')
console.log('   3. Trigger the pipeline: Dev → Stage → Production')
console.log('   Pipeline docs: https://learn.microsoft.com/en-us/power-platform/alm/set-up-pipelines\n')
