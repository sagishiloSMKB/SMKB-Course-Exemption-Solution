# guid-freshen.ps1
#
# Run ONCE before the very first pac pages upload for a new portal.
# Replaces every portal-scoped GUID in all YAML files with a fresh random GUID
# so this portal never shares primary keys with any other portal initialized
# from the same starter kit.
#
# SAFETY RULES:
#   - Run ONLY ONCE per portal, before the first deploy.
#   - NEVER run after the portal has been uploaded -- it changes all PKs and breaks the live site.
#   - NEVER run on a portal that was already initialized from another source.
#
# USAGE:
#   powershell -ExecutionPolicy Bypass -File guid-freshen.ps1
#   powershell -ExecutionPolicy Bypass -File guid-freshen.ps1 -DryRun

param(
    [switch]$DryRun
)

$portalDir = $PSScriptRoot

# Guard: adx_websiteid must already be set (not TODO)
$websiteYmlPath = Join-Path $portalDir "website.yml"
if (-not (Test-Path $websiteYmlPath)) {
    Write-Error "website.yml not found at $websiteYmlPath"
    exit 1
}
$websiteYml = Get-Content $websiteYmlPath -Raw -Encoding UTF8
if ($websiteYml -match 'TODO') {
    Write-Error "website.yml still contains a TODO placeholder. Set adx_websiteid first (from pac pages list), then run this script."
    exit 1
}

# Collect all YAML files
$files = Get-ChildItem $portalDir -Recurse -Include "*.yml" -File -ErrorAction SilentlyContinue

# Find every unique GUID across all files
$guidRegex = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
$guidMap = @{}

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    $found = [regex]::Matches($content, $guidRegex)
    foreach ($m in $found) {
        $guid = $m.Value.ToLower()
        if (-not $guidMap.ContainsKey($guid)) {
            $guidMap[$guid] = [System.Guid]::NewGuid().ToString().ToLower()
        }
    }
}

# Remove the live adx_websiteid from the map so it is never replaced
$liveWebsiteIdMatch = [regex]::Match($websiteYml, "adx_websiteid:\s*($guidRegex)")
if ($liveWebsiteIdMatch.Success) {
    $liveId = $liveWebsiteIdMatch.Groups[1].Value.ToLower()
    $guidMap.Remove($liveId) | Out-Null
}

Write-Host "Found $($guidMap.Count) unique GUIDs to replace."

if ($DryRun) {
    Write-Host ""
    Write-Host "[DRY RUN] No files will be modified. Replacement map:"
    foreach ($old in $guidMap.Keys | Sort-Object) {
        Write-Host "  $old  ->  $($guidMap[$old])"
    }
    exit 0
}

# Apply all replacements
$changedFiles = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    $original = $content
    foreach ($old in $guidMap.Keys) {
        $content = $content -replace [regex]::Escape($old), $guidMap[$old]
    }
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "  Updated: $($file.Name)"
        $changedFiles++
    }
}

Write-Host ""
Write-Host "Done. $changedFiles file(s) updated. Every portal-scoped GUID is now unique to this portal."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Run verify-consistency.ps1 to confirm YAML integrity"
Write-Host "  2. Run pnpm deploy from the client/ folder"
