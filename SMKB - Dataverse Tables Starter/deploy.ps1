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
$placeholders = @('YourSolutionName', 'Your Solution Name', 'smkb_sol_')
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

# -- Sentinel GUID check ------------------------------------------------------
# Blocks deployment if starter-kit template GUIDs haven't been freshened.
# These GUIDs were deployed to SMKB-Apps-Dev from a template test -- any new
# project with the same GUIDs hits a PRIMARY KEY violation or silently overwrites
# the template records. Run guid-freshen.ps1 once before first deploy.
$SENTINEL_GUIDS = @(
    'c481897d-0ff9-4a3c-9872-1f64ea629903',
    'd43b64b7-302f-4356-afe5-40968a40221a',
    '8595077e-7d34-4620-9a12-517e1faf9243',
    'f3d39362-199b-4b94-a559-4a83e05c4899',
    '4068faef-f780-41e0-b8ab-b249e8289bb5',
    '08f54373-7133-4436-ad7e-b1bbc3cb245f',
    '2b0561cb-7ebf-4958-a382-3007e2d8614c',
    '32813506-bc57-40a3-8bfa-0dc75721a944'
)
$staleFiles = @()
$xmlFiles = Get-ChildItem (Join-Path $scriptDir "Entities") -Recurse -Include "*.xml" -File -ErrorAction SilentlyContinue
foreach ($f in $xmlFiles) {
    $c = [System.IO.File]::ReadAllText($f.FullName)
    foreach ($sg in $SENTINEL_GUIDS) {
        if ($c -match [regex]::Escape($sg)) { $staleFiles += $f.Name; break }
    }
}
if ($staleFiles) {
    Write-Host "`nDEPLOY BLOCKED -- Starter-kit sentinel GUIDs found in:" -ForegroundColor Red
    $staleFiles | Select-Object -Unique | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    Write-Host "`nRun guid-freshen.ps1 before first deploy to prevent collisions with other projects.`n" -ForegroundColor Cyan
    exit 1
}
# -----------------------------------------------------------------------------

if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }
if (Test-Path $zipPath) { Remove-Item $zipPath }

Write-Host "Packing solution..."
pac solution pack --zipFile $zipPath --folder $scriptDir --packageType Unmanaged

Write-Host "Importing to $TargetEnv ..."
pac solution import --path $zipPath --environment $TargetEnv --force-overwrite --async --max-async-wait-time 10

Write-Host "Done." -ForegroundColor Green
