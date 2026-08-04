# scripts/freshen-site-settings.ps1
#
# Run before the very first deploy to give the custom security site settings unique
# GUIDs. Prevents same-org GUID collisions when multiple sites are created from this
# starter in the same Dataverse environment.
#
# Safe to run again later: it only ever touches a file that STILL holds a placeholder
# GUID, so a setting added to the starter after you first freshened (a new CSP header,
# a new auth lockdown) gets a real GUID on the next run, and an already-assigned GUID
# is never re-randomized. Without that, a late-added setting would deploy with the
# literal placeholder GUID from the template.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/freshen-site-settings.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/freshen-site-settings.ps1 -DryRun

param([switch]$DryRun)

$ErrorActionPreference = 'Stop'

$projectRoot = Join-Path $PSScriptRoot ".."
$settingsDir = Join-Path (Join-Path $projectRoot ".powerpages-site") "site-settings"
$markerPath  = Join-Path $projectRoot ".guid-freshened"

$alreadyFreshened = Test-Path $markerPath
if ($alreadyFreshened) {
    Write-Host "This site was already freshened - checking for settings added since." -ForegroundColor Cyan
}

# Pattern that identifies the placeholder GUIDs we own.
# Real downloaded GUIDs never match this, so the script cannot accidentally touch
# files PAC CLI has already assigned GUIDs to - which is also what makes a re-run
# safe rather than destructive.
#
# (?i) matters: the file filter below uses -match (case-insensitive) while
# [regex]::Matches is case-sensitive. Without it, an uppercase placeholder would
# pass the filter, produce no map entry, and be SILENTLY left in place.
$placeholderPattern = '(?i)aaaaaaaa-[0-9a-f]{4}-4000-8000-[0-9a-f]{12}'

# Collect only files that still contain placeholder GUIDs
$targetFiles = Get-ChildItem $settingsDir -Filter "*.sitesetting.yml" |
    Where-Object { (Get-Content $_.FullName -Raw -Encoding UTF8) -match $placeholderPattern }

# Wrap in @( ) - PowerShell unwraps a single-element array on assignment, which would
# make .Count return the string length of the one filename instead of 1.
$targetFiles = @($targetFiles)

if ($targetFiles.Count -eq 0) {
    if ($alreadyFreshened) {
        Write-Host "No placeholder GUIDs remain - every site setting already has a real GUID."
    } else {
        Write-Host "No placeholder GUIDs found. Nothing to do."
    }
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

# Append to the marker so the history of freshen runs is visible. Each later run
# corresponds to site settings that were added to the starter after the first one.
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$line = "Freshened: $timestamp  ($($guidMap.Count) GUID(s) in $($targetFiles.Count) file(s))`n"
if ($alreadyFreshened) {
    [System.IO.File]::AppendAllText($markerPath, $line, [System.Text.Encoding]::UTF8)
} else {
    [System.IO.File]::WriteAllText($markerPath, $line, [System.Text.Encoding]::UTF8)
}

Write-Host "`nDone. Recorded in .guid-freshened"
Write-Host "Next step: npm run deploy"
