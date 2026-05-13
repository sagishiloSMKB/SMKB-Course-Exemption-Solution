# deploy.ps1
# Builds the solution zip from local flow JSON files and imports it into SMKB-Apps-Dev.
#
# Usage:
#   .\deploy.ps1
#
# HOW IT WORKS
# ============
# PAC solution pack cannot include Cloud Flow JSONs from scratch, so this script
# builds the zip manually and calls pac solution import.
#
# ADDING A NEW FLOW
# =================
# 1. Drop the flow JSON in Workflows\  named  <FlowDisplayName>-<DataverseWorkflowGUID>.json
# 2. Add a RootComponent line in Other\Solution.xml:
#      <RootComponent type="29" id="{GUID}" behavior="0" />
#
# HOW TO GET A FLOW'S DATAVERSE GUID
# ====================================
# The Dataverse workflow GUID appears in the filename when you export a solution
# that contains the flow. It is NOT the same as the Power Automate flow ID in
# the browser URL (v1/{envId}/{flowId}).
# To add an existing (non-solution-aware) flow to this solution without re-importing:
#   pac solution add-solution-component --environment $targetEnv \
#       --solutionUniqueName YourSolutionName \
#       --component <Dataverse-GUID> --componentType 29
#
# PREREQUISITES
# =============
# pac CLI installed and authenticated (pac auth select --name SMKB-Apps-Dev profile).

param(
    [string]$TargetEnv = "https://org229c958d.crm4.dynamics.com/"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$scriptDir = $PSScriptRoot
$distDir   = Join-Path $scriptDir "_dist"
$zipPath   = Join-Path $distDir "solution.zip"

# ── Placeholder safety check ──────────────────────────────────────────────────
# Blocks deployment if any template placeholders remain unreplaced.
$placeholders = @(
    'YourSolutionName',
    'Your Solution Name',
    'sol_example_flow',
    '00000000-0000-0000-0000-000000000001',
    '\[yourid\]',
    '\[REPLACE',
    '\[sol\]'
)
$violations = @()
Get-ChildItem $scriptDir -Recurse -File -Include "*.xml","*.json" |
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

# ---- helper ----
function Add-ZipText($arc, $name, $text) {
    $e = $arc.CreateEntry($name, [System.IO.Compression.CompressionLevel]::Optimal)
    $s = $e.Open()
    $b = [System.Text.Encoding]::UTF8.GetBytes($text)
    $s.Write($b, 0, $b.Length)
    $s.Dispose()
}

Write-Host "Building solution zip..." -ForegroundColor Cyan
$zipStream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create)
$archive   = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create)

# [Content_Types].xml
Add-ZipText $archive "[Content_Types].xml" @'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml"  ContentType="application/xml"  />
  <Default Extension="json" ContentType="application/json" />
</Types>
'@

# customizations.xml — Workflows section MUST be childless for Cloud Flows
Add-ZipText $archive "customizations.xml" @'
<?xml version="1.0" encoding="utf-8"?>
<ImportExportXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Entities /><Roles /><Workflows /><FieldSecurityProfiles /><Templates />
  <EntityMaps /><EntityRelationships /><OrganizationSettings /><optionsets />
  <WebResources /><CustomControls /><EntityDataProviders />
  <Languages><Language>1033</Language></Languages>
</ImportExportXml>
'@

# solution.xml (from Other/)
Add-ZipText $archive "solution.xml" (Get-Content "$scriptDir\Other\Solution.xml" -Raw)

# Cloud Flow JSONs
$flowFiles = Get-ChildItem "$scriptDir\Workflows" -Filter "*.json"
foreach ($f in $flowFiles) {
    Write-Host "  + Workflows/$($f.Name)"
    Add-ZipText $archive "Workflows/$($f.Name)" (Get-Content $f.FullName -Raw -Encoding UTF8)
}

$archive.Dispose(); $zipStream.Dispose()
Write-Host "Zip built: $zipPath" -ForegroundColor Green

# ---- Import ----
Write-Host "Importing into $TargetEnv..." -ForegroundColor Cyan
pac solution import `
    --path      $zipPath `
    --environment $TargetEnv `
    --async `
    --max-async-wait-time 10
if ($LASTEXITCODE -ne 0) { throw "pac solution import failed (exit $LASTEXITCODE)" }
Write-Host "Deploy complete." -ForegroundColor Green
