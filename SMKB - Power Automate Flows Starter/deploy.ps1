# deploy.ps1
# Builds the solution zip from local flow JSON files and imports it into SMKB-Apps-Dev.
#
# Usage:
#   .\deploy.ps1
#   powershell -ExecutionPolicy Bypass -File deploy.ps1
#
# HOW IT WORKS
# ============
# PAC solution pack cannot include Cloud Flow JSONs from scratch, so this script
# builds the zip manually (Content_Types + customizations.xml + solution.xml + Workflows/*.json)
# and calls pac solution import.
#
# THE THREE-FILE RULE (add a flow -> update all three, in lockstep)
# ================================================================
# 1. Workflows\<FlowName>-<DataverseWorkflowGUID>.json   the flow definition
# 2. Other\Customizations.xml   a <Workflow WorkflowId="{GUID}"> entry
# 3. Other\Solution.xml         a <RootComponent type="29" id="{GUID}" behavior="0" /> entry
# Missing any one fails the import. See README.md.
#
# HOW TO GET A FLOW'S DATAVERSE GUID
# ====================================
# The Dataverse workflow GUID appears in the filename when you export a solution that contains the
# flow. It is NOT the Power Automate flow ID in the browser URL. See README.md "Two/Three Flow IDs".
#
# PREREQUISITES
# =============
# - pac CLI installed and authenticated to https://org229c958d.crm4.dynamics.com/
# - Node.js (optional but recommended): enables the full flow-lint gate. Without it, only the
#   inline placeholder backstop runs.

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

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$scriptDir = $PSScriptRoot
$distDir   = Join-Path $scriptDir "_dist"
$zipPath   = Join-Path $distDir "solution.zip"

# -- Placeholder backstop (always runs, no Node needed) -----------------------
# flow-lint (below) is the full gate, but it needs Node. This inline scan guarantees that even on a
# machine without Node we never ship an unreplaced starter placeholder. Scans only what goes in the
# zip: Other\*.xml and Workflows\*.json.
$placeholders = @(
    'YourSolutionName',
    'Your Solution Name',
    'smkb_sol_',
    '[yourid]',
    '[REPLACE',
    '[sol]',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002'
)
$violations = @()
$scanFiles = Get-ChildItem (Join-Path $scriptDir "Other"),(Join-Path $scriptDir "Workflows") -Recurse -File -Include "*.xml","*.json" -ErrorAction SilentlyContinue
foreach ($file in $scanFiles) {
    $c = [System.IO.File]::ReadAllText($file.FullName)
    foreach ($p in $placeholders) {
        if ($c.Contains($p)) { $violations += "  '$p'  in  $($file.Name)" }
    }
}
if ($violations) {
    Write-Host "`nDEPLOY BLOCKED -- Unreplaced placeholders found:" -ForegroundColor Red
    $violations | Select-Object -Unique | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
    Write-Host "`nComplete the Activation Guide in README.md before deploying.`n" -ForegroundColor Cyan
    exit 1
}
# -----------------------------------------------------------------------------

# -- flow-lint: full security + import-error gate (bundled, zero-dependency) ---
# Runs the bundled tools\flow-lint over Workflows\. Enforces the audit's security invariants plus
# import/activation-error rules (256-char descriptions, embedded connections, Power Pages field
# titles, env-var refs, workflow<->customizations consistency). Errors block; warnings print.
$lintScript = Join-Path $scriptDir "tools\flow-lint\lint.mjs"
if (Get-Command node -ErrorAction SilentlyContinue) {
    if (Test-Path $lintScript) {
        Write-Host "Running flow-lint..." -ForegroundColor Cyan
        node $lintScript (Join-Path $scriptDir "Workflows")
        if ($LASTEXITCODE -ne 0) {
            Write-Host "`nDEPLOY BLOCKED -- flow-lint reported errors (fix them before deploying)." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "flow-lint not found at tools\flow-lint\lint.mjs -- skipping (placeholder backstop already passed)." -ForegroundColor Yellow
    }
} else {
    Write-Host "Node.js not found -- skipping full flow-lint gate (placeholder backstop already passed)." -ForegroundColor Yellow
    Write-Host "  Install Node to enable the security + import-error checks. See tools\flow-lint\README.md." -ForegroundColor DarkGray
}
# -----------------------------------------------------------------------------

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

# customizations.xml -- from Other/Customizations.xml (has <Workflow> entries + <connectionreferences>).
# Without <Workflow> entries the flow JSONs ship in the zip but Dataverse never creates Workflow records.
Add-ZipText $archive "customizations.xml" ([System.IO.File]::ReadAllText("$scriptDir\Other\Customizations.xml"))

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
# --settings-file    : maps connection references / env vars per environment (optional in dev with
#                      --force-overwrite, since the connection-reference bank already exists there).
# --activate-plugins : re-activates existing flows after import (brand-new imports still land Inactive
#                      once - turn them on in the portal). Watch for "deactivated and replaced" in the
#                      output: it confirms the PUBLISHED (running) definition was updated. See README.
# --force-overwrite  : overwrite the unmanaged solution in place.
$importArgs = @(
    "solution", "import",
    "--path",        $zipPath,
    "--environment", $TargetEnv,
    "--activate-plugins",
    "--force-overwrite",
    "--async",
    "--max-async-wait-time", "10"
)
$settingsFile = Join-Path $scriptDir "deployment-settings.json"
if (Test-Path $settingsFile) {
    $importArgs += @("--settings-file", $settingsFile)
    Write-Host "Using settings file: deployment-settings.json" -ForegroundColor DarkGray
} else {
    Write-Host "No deployment-settings.json (copy deployment-settings-template.json to create one for stage/prod). Proceeding without it." -ForegroundColor DarkGray
}

Write-Host "Importing into $TargetEnv..." -ForegroundColor Cyan
pac @importArgs
if ($LASTEXITCODE -ne 0) { throw "pac solution import failed (exit $LASTEXITCODE)" }
Write-Host "Deploy complete." -ForegroundColor Green
