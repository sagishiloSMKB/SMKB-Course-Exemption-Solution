# guid-freshen.ps1
#
# Run ONCE before the very first pac solution import for a new Tables solution.
# Replaces all 8 starter-kit sentinel form/savedquery GUIDs with fresh random GUIDs
# so this solution never shares primary keys with other projects from the same starter.
#
# SAFETY RULES:
#   - Run ONLY ONCE per project, before the first deploy.
#   - NEVER run after the solution has been imported -- live forms and views break.
#   - Self-enforcing: writes .guid-freshened marker; subsequent runs exit with an error.
#
# USAGE:
#   powershell -ExecutionPolicy Bypass -File ".\guid-freshen.ps1"

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot

# Guard: refuse to run if already freshened
$markerPath = Join-Path $scriptDir ".guid-freshened"
if (Test-Path $markerPath) {
    Write-Error @"
guid-freshen.ps1 has already been run for this project (.guid-freshened exists).

Running it again would generate GUIDs that no longer match the records in Dataverse,
breaking all forms and views for the live solution.

If you are intentionally rebuilding from scratch (no live records in Dataverse):
  1. Delete .guid-freshened manually
  2. Delete the imported solution from Dataverse
  3. Then run guid-freshen.ps1 again
"@
    exit 1
}

# Sentinel GUIDs from the starter template -- one fresh GUID per sentinel.
# These GUIDs were deployed to SMKB-Apps-Dev from a template test; sharing them
# causes PRIMARY KEY violations on import.
$guidMap = [ordered]@{
    'c481897d-0ff9-4a3c-9872-1f64ea629903' = [System.Guid]::NewGuid().ToString().ToLower()  # sol_example_table_a main form
    'd43b64b7-302f-4356-afe5-40968a40221a' = [System.Guid]::NewGuid().ToString().ToLower()  # sol_example_table_a quick-create form
    '8595077e-7d34-4620-9a12-517e1faf9243' = [System.Guid]::NewGuid().ToString().ToLower()  # sol_example_table_a card form
    'f3d39362-199b-4b94-a559-4a83e05c4899' = [System.Guid]::NewGuid().ToString().ToLower()  # sol_example_table_a savedquery (view)
    '4068faef-f780-41e0-b8ab-b249e8289bb5' = [System.Guid]::NewGuid().ToString().ToLower()  # sol_example_table_b main form
    '08f54373-7133-4436-ad7e-b1bbc3cb245f' = [System.Guid]::NewGuid().ToString().ToLower()  # sol_example_table_b quick-create form
    '2b0561cb-7ebf-4958-a382-3007e2d8614c' = [System.Guid]::NewGuid().ToString().ToLower()  # sol_example_table_b card form
    '32813506-bc57-40a3-8bfa-0dc75721a944' = [System.Guid]::NewGuid().ToString().ToLower()  # sol_example_table_b savedquery (view)
}

Write-Host "Replacing $($guidMap.Count) sentinel GUIDs with fresh values..." -ForegroundColor Cyan

$entityDir = Join-Path $scriptDir "Entities"

# Pass 1: update file CONTENT
# Must complete before Pass 2 so renamed files are not re-processed.
$xmlFiles = Get-ChildItem $entityDir -Recurse -Include "*.xml" -File -ErrorAction SilentlyContinue
$contentChanged = 0
foreach ($file in $xmlFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    foreach ($old in $guidMap.Keys) {
        $content = $content -ireplace [regex]::Escape($old), $guidMap[$old]
    }
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "  Content updated: $($file.Name)"
        $contentChanged++
    }
}

# Pass 2: rename files whose names contain a sentinel GUID
# File names follow the pattern {GUID}.xml -- only the GUID portion is replaced.
$xmlFiles = Get-ChildItem $entityDir -Recurse -Include "*.xml" -File -ErrorAction SilentlyContinue
$renamedFiles = 0
foreach ($file in $xmlFiles) {
    $newName = $file.Name
    foreach ($old in $guidMap.Keys) {
        $newName = $newName -ireplace [regex]::Escape($old), $guidMap[$old]
    }
    if ($newName -ne $file.Name) {
        Rename-Item -Path $file.FullName -NewName $newName
        Write-Host "  Renamed: $($file.Name)  ->  $newName"
        $renamedFiles++
    }
}

Write-Host ""
Write-Host "Done. $contentChanged file(s) updated, $renamedFiles file(s) renamed." -ForegroundColor Green
Write-Host ""
Write-Host "GUID assignments:"
foreach ($old in $guidMap.Keys) {
    Write-Host "  $old  ->  $($guidMap[$old])"
}

# Write marker so this script cannot run again against a deployed solution
[System.IO.File]::WriteAllText($markerPath, "Freshened: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`nProject directory: $scriptDir`n")
Write-Host ""
Write-Host "  Marker written: .guid-freshened (prevents accidental second run)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next step: run deploy.ps1 to import the solution into SMKB-Apps-Dev." -ForegroundColor Cyan
