param(
    [string]$TargetEnv = "https://org229c958d.crm4.dynamics.com/"
)
$ErrorActionPreference = "Stop"

# -- Environment guard --------------------------------------------------------
# Direct deployment is allowed to SMKB-Apps-Dev only.
# Stage and Production are promoted via Power Platform Pipeline - never via this script.
$allowedEnv = "https://org229c958d.crm4.dynamics.com/"
if ($TargetEnv -ne $allowedEnv) {
    Write-Host "`nDEPLOY BLOCKED -- This script only deploys to SMKB-Apps-Dev." -ForegroundColor Red
    Write-Host "  Allowed:   $allowedEnv" -ForegroundColor Cyan
    Write-Host "  Attempted: $TargetEnv" -ForegroundColor Yellow
    Write-Host "`nStage and Production are promoted via Power Platform Pipeline only." -ForegroundColor Cyan
    exit 1
}
# -----------------------------------------------------------------------------

$scriptDir = $PSScriptRoot
$distDir   = Join-Path $scriptDir "_dist"
$zipPath   = Join-Path $distDir "solution.zip"

# -- Placeholder safety check -------------------------------------------------
# Blocks deployment if any template placeholders remain unreplaced.
$placeholders = @('YourSolutionName', 'Your Solution Name', 'smkb_sol_', 'your-default-value-here')
$violations   = @()
$scanFiles = Get-ChildItem $scriptDir -Recurse -File -Include "*.xml" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '_dist' }
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

if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }
if (Test-Path $zipPath) { Remove-Item $zipPath }

Write-Host "Packing solution..."
pac solution pack --zipFile $zipPath --folder $scriptDir --packageType Unmanaged

Write-Host "Importing to $TargetEnv ..."
pac solution import --path $zipPath --environment $TargetEnv --async --max-async-wait-time 10

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host ""
Write-Host "REMINDER: This import upserts env var DEFINITIONS only - existing Current Values are preserved." -ForegroundColor Cyan
Write-Host "To set a per-environment value that survives future reimports, use 'Current value':" -ForegroundColor Cyan
Write-Host "  Maker portal -> Solutions -> [solution] -> Environment Variables -> [var] -> Edit -> '+ New value'" -ForegroundColor Cyan
Write-Host "  Do NOT edit 'Default value' in the portal - it is owned by the solution XML and resets on every import." -ForegroundColor Yellow
Write-Host "Values are per-environment and must NEVER be committed to Git." -ForegroundColor Yellow
