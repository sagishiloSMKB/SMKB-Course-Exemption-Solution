param(
    [string]$TargetEnv = "https://org229c958d.crm4.dynamics.com/"
)
$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
$distDir   = Join-Path $scriptDir "_dist"
$zipPath   = Join-Path $distDir "solution.zip"

# ── Placeholder safety check ──────────────────────────────────────────────────
# Blocks deployment if any template placeholders remain unreplaced.
$placeholders = @('YourSolutionName', 'Your Solution Name', 'sol_example_table')
$violations   = @()
Get-ChildItem $scriptDir -Recurse -File -Include "*.xml" |
    Where-Object { $_.FullName -notmatch '_dist' } | ForEach-Object {
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

if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }
if (Test-Path $zipPath) { Remove-Item $zipPath }

Write-Host "Packing solution..."
pac solution pack --zipFile $zipPath --folder $scriptDir --packageType Unmanaged

Write-Host "Importing to $TargetEnv ..."
pac solution import --path $zipPath --environment $TargetEnv --async --max-async-wait-time 10

Write-Host "Done."
