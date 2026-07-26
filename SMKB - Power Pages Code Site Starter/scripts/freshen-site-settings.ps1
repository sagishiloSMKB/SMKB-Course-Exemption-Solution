# scripts/freshen-site-settings.ps1
#
# Run ONCE before the very first deploy to give the 8 custom security site
# settings unique GUIDs. Prevents same-org GUID collisions when multiple
# sites are created from this starter in the same Dataverse environment.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/freshen-site-settings.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/freshen-site-settings.ps1 -DryRun

param([switch]$DryRun)

$ErrorActionPreference = 'Stop'

$projectRoot = Join-Path $PSScriptRoot ".."
$settingsDir = Join-Path (Join-Path $projectRoot ".powerpages-site") "site-settings"
$markerPath  = Join-Path $projectRoot ".guid-freshened"

# Safety gate - refuse to run twice on the same site
if (Test-Path $markerPath) {
    Write-Error "Already freshened. See .guid-freshened to reset for a brand-new site."
    exit 1
}

# Pattern that identifies the 8 placeholder GUIDs we own.
# Real downloaded GUIDs never match this, so the script cannot
# accidentally touch files PAC CLI has already assigned GUIDs to.
$placeholderPattern = 'aaaaaaaa-[0-9a-f]{4}-4000-8000-[0-9a-f]{12}'

# Collect only files that still contain placeholder GUIDs
$targetFiles = Get-ChildItem $settingsDir -Filter "*.sitesetting.yml" |
    Where-Object { (Get-Content $_.FullName -Raw -Encoding UTF8) -match $placeholderPattern }

if ($targetFiles.Count -eq 0) {
    Write-Host "No placeholder GUIDs found. Nothing to do."
    exit 0
}

# Build a 1:1 replacement map - one fresh GUID per unique placeholder
$guidMap = @{}
foreach ($file in $targetFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    foreach ($m in [regex]::Matches($content, $placeholderPattern)) {
        $old = $m.Value.ToLower()
        if (-not $guidMap.ContainsKey($old)) {
            $guidMap[$old] = [System.Guid]::NewGuid().ToString().ToLower()
        }
    }
}

Write-Host "Found $($guidMap.Count) placeholder GUID(s) across $($targetFiles.Count) file(s)."

if ($DryRun) {
    Write-Host "`nDry run - no files written:"
    foreach ($old in $guidMap.Keys | Sort-Object) {
        Write-Host "  $old  ->  $($guidMap[$old])"
    }
    exit 0
}

# Apply replacements
foreach ($file in $targetFiles) {
    $content  = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content
    foreach ($old in $guidMap.Keys) {
        $content = $content -replace [regex]::Escape($old), $guidMap[$old]
    }
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "  Updated: $($file.Name)"
    }
}

# Write marker to prevent re-runs on the same site
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
[System.IO.File]::WriteAllText($markerPath, "Freshened: $timestamp`n", [System.Text.Encoding]::UTF8)

Write-Host "`nDone. Marker written to .guid-freshened"
Write-Host "Next step: npm run deploy"
