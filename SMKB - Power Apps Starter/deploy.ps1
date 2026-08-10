# deploy.ps1
# Builds the Vue SPA and pushes it into the target Power Apps Code App.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File deploy.ps1
#
# HOW IT WORKS
# ============
# 1. Scans all source files for unreplaced template placeholders -- aborts if any are found
#    (this also blocks deploying while the ExampleFlow scaffold is still present).
# 2. Reads solutionName, targetEnv, and allowedEnvs from deploy.config.json.
# 3. Environment guard: refuses to deploy unless targetEnv is listed in allowedEnvs.
# 4. Quality gate: `pnpm run lint` then `pnpm run test` -- any failure aborts.
# 5. Runs `pnpm run build` (TypeScript check + Vite production build -> dist/).
# 6. Runs `pnpm pa push` (npm-based Power Apps CLI) to upload the built app.
#    NOTE: pnpm pa push is used instead of `pac code push` because only the npm CLI
#    supports flows (workflowDetails in power.config.json) and the add-flow workflow.
#
# PREREQUISITES
# =============
# - Node 20+ and pnpm 9+ installed
# - The Power Apps Code App record must already exist in the target environment
#   (pnpm pa push updates an existing app -- it does NOT create one; use `pac code init` first)
# - All placeholders in power.config.json, deploy.config.json, and src/ replaced
# - The ExampleFlow scaffold removed and your real flows wired via `pnpm pa add-flow`

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot

# -- Placeholder safety check -------------------------------------------------
# Blocks deployment if any template placeholders remain unreplaced.
# LITERAL tokens (see the .Contains note below) - they were regex-escaped for a -match scan,
# which also meant the violation message printed the escaped form ('your-org\.crm') at a
# developer who then searched for a backslash that is not in any file.
$placeholders = @(
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    '[REPLACE',
    'Your App Display Name',
    'sol_exampleflow',
    'your-org.crm'
)
$violations = @()
$scanFiles = Get-ChildItem $scriptDir -Recurse -File -Include "*.json","*.ts","*.vue" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|\\dist\\|_dist' }
foreach ($file in $scanFiles) {
    $c = [System.IO.File]::ReadAllText($file.FullName)
    foreach ($p in $placeholders) {
        # .Contains, not -match: the tokens are literal, and the four starters' lists are meant
        # to converge. As a regex, '[sol]' (in the Flows list) matches every file and '[REPLACE'
        # throws on an unterminated character class.
        if ($c.Contains($p)) { $violations += "  '$p'  in  $($file.Name)" }
    }
}
if ($violations) {
    Write-Host "`nDEPLOY BLOCKED -- Unreplaced placeholders found:" -ForegroundColor Red
    $violations | Select-Object -Unique | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
    Write-Host "`nComplete the Activation Guide in README.md before deploying.`n" -ForegroundColor Cyan
    exit 1
}
# -----------------------------------------------------------------------------

# Read deploy config
$cfg     = Get-Content "$scriptDir\deploy.config.json" -Raw | ConvertFrom-Json
$solName = $cfg.solutionName
$envUrl  = $cfg.targetEnv

# -- Environment guard --------------------------------------------------------
# Direct deploy is allowed ONLY to environments listed in deploy.config.json > allowedEnvs
# (your dev environment). Ships empty, so an untouched clone cannot deploy anywhere.
# Stage and Production should be promoted via Power Platform Pipeline, never this script.
$allowed = @($cfg.allowedEnvs | Where-Object { $_ })
if ($allowed.Count -eq 0) {
    Write-Host "`nDEPLOY BLOCKED -- allowedEnvs is empty in deploy.config.json." -ForegroundColor Red
    Write-Host "Add the dev environment URL(s) this script may deploy to." -ForegroundColor Cyan
    Write-Host "Stage/Production are promoted via Power Platform Pipeline, never this script." -ForegroundColor Cyan
    exit 1
}
if ($allowed -notcontains $envUrl) {
    Write-Host "`nDEPLOY BLOCKED -- targetEnv is not in allowedEnvs." -ForegroundColor Red
    Write-Host "  Allowed:   $($allowed -join ', ')" -ForegroundColor Cyan
    Write-Host "  Attempted: $envUrl" -ForegroundColor Yellow
    exit 1
}
# -----------------------------------------------------------------------------

Set-Location $scriptDir

# Quality gate -- lint + unit tests must pass before we build or push. Any failure aborts.
Write-Host "Linting..." -ForegroundColor Cyan
pnpm run lint
if ($LASTEXITCODE -ne 0) { throw "Lint failed (exit $LASTEXITCODE) -- deploy aborted." }

Write-Host "Running unit tests..." -ForegroundColor Cyan
pnpm run test
if ($LASTEXITCODE -ne 0) { throw "Unit tests failed (exit $LASTEXITCODE) -- deploy aborted." }

Write-Host "Building..." -ForegroundColor Cyan
pnpm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed (exit $LASTEXITCODE)" }

# The push wraps the Power Apps CLI, which wraps pac - and pac returns exit code 0 even when the
# operation failed (confirmed for a failed solution import and a rejected --componentType). The exit
# code alone is therefore not a reliable success signal: parse stdout as well, or a failed push
# reports "Deploy complete."
$pushArgs = if ($solName) { @('pa', 'push', '--solution-id', $solName) } else { @('pa', 'push') }
if ($solName) {
    Write-Host "Pushing to $envUrl (solution: $solName)..." -ForegroundColor Cyan
} else {
    Write-Host "Pushing to $envUrl (standalone -- no solution assigned)..." -ForegroundColor Cyan
}
$lines = & pnpm @pushArgs 2>&1
$code  = $LASTEXITCODE
$out   = ($lines | Out-String)
$lines | ForEach-Object { Write-Host $_ }

# Specific patterns on purpose: a bare match on "failed" would fire on benign output such as a
# "0 failed" summary, and a guard that cries wolf gets bypassed.
$pushFailed = ($code -ne 0) -or
              ($out -match '(?im)^\s*Error:') -or
              ($out -match '(?i)\bpush failed\b') -or
              ($out -match '(?i)\b(unauthorized|forbidden)\b') -or
              ($out -match '(?i)\bno\s+active\s+auth')
if ($pushFailed) {
    Write-Host ""
    Write-Host "DEPLOY FAILED -- pnpm pa push did not succeed (exit $code)." -ForegroundColor Red
    Write-Host "Do not treat the deploy as complete. If the app record does not exist yet, run" -ForegroundColor Yellow
    Write-Host "'pac code init' first (see /pa-init); confirm the target with 'pac auth list'." -ForegroundColor Yellow
    exit 1
}

Write-Host "Deploy complete." -ForegroundColor Green
