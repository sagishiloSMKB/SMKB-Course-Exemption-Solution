# deploy.ps1
# Builds the Vue SPA and pushes it into the target Power Apps Code App.
#
# Usage:
#   .\deploy.ps1
#
# HOW IT WORKS
# ============
# 1. Scans all source files for unreplaced template placeholders — aborts if any are found.
# 2. Reads solutionName and targetEnv from deploy.config.json.
# 3. Runs `pnpm build` (TypeScript check + Vite production build → dist/).
# 4. Runs `pac code push` to upload the built app into the existing Power Apps record.
#
# PREREQUISITES
# =============
# - Node 20+ and pnpm 9+ installed
# - PAC CLI installed and authenticated for the target environment
# - The Power Apps Code App record must already exist in the target environment
#   (pac code push updates an existing app — it does NOT create one)
# - All placeholders in power.config.json, deploy.config.json, and src/ replaced

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot

# ── Placeholder safety check ──────────────────────────────────────────────────
# Blocks deployment if any template placeholders remain unreplaced.
$placeholders = @(
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    '\[REPLACE',
    'YourSolutionName',
    'Your App Display Name',
    'sol_example_item'
)
$violations = @()
Get-ChildItem $scriptDir -Recurse -File -Include "*.json","*.ts","*.vue" |
    Where-Object { $_.FullName -notmatch 'node_modules|\\dist\\|_dist' } | ForEach-Object {
        $c = Get-Content $_.FullName -Raw
        foreach ($p in $placeholders) {
            if ($c -match $p) { $violations += "  '$p'  in  $($_.Name)" }
        }
    }
if ($violations) {
    Write-Host "`nDEPLOY BLOCKED — Unreplaced placeholders found:" -ForegroundColor Red
    $violations | Select-Object -Unique | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
    Write-Host "`nComplete the Activation Guide in README.md before deploying.`n" -ForegroundColor Cyan
    exit 1
}
# ─────────────────────────────────────────────────────────────────────────────

# Read deploy config
$cfg     = Get-Content "$scriptDir\deploy.config.json" -Raw | ConvertFrom-Json
$solName = $cfg.solutionName
$envUrl  = $cfg.targetEnv

Write-Host "Building..." -ForegroundColor Cyan
Set-Location $scriptDir
pnpm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed (exit $LASTEXITCODE)" }

Write-Host "Pushing to $envUrl (solution: $solName)..." -ForegroundColor Cyan
pac code push --solutionName $solName --environment $envUrl
if ($LASTEXITCODE -ne 0) { throw "pac code push failed (exit $LASTEXITCODE)" }

Write-Host "Deploy complete." -ForegroundColor Green
