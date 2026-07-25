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
$placeholders = @(
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    '\[REPLACE',
    'Your App Display Name',
    'sol_exampleflow',
    'your-org\.crm'
)
$violations = @()
$scanFiles = Get-ChildItem $scriptDir -Recurse -File -Include "*.json","*.ts","*.vue" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|\\dist\\|_dist' }
foreach ($file in $scanFiles) {
    $c = [System.IO.File]::ReadAllText($file.FullName)
    foreach ($p in $placeholders) {
        if ($c -match $p) { $violations += "  '$p'  in  $($file.Name)" }
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

if ($solName) {
    Write-Host "Pushing to $envUrl (solution: $solName)..." -ForegroundColor Cyan
    pnpm pa push --solution-id $solName
} else {
    Write-Host "Pushing to $envUrl (standalone -- no solution assigned)..." -ForegroundColor Cyan
    pnpm pa push
}
if ($LASTEXITCODE -ne 0) { throw "pnpm pa push failed (exit $LASTEXITCODE)" }

Write-Host "Deploy complete." -ForegroundColor Green
