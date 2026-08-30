<#
.SYNOPSIS
    Reconciles a Power Pages site and its components into a Dataverse solution.

.DESCRIPTION
    Nothing about a Power Pages site enters a solution on its own. `pac pages
    upload-code-site` creates the site and its components as loose Dataverse records;
    solution membership is a separate act. A Power Platform Pipeline then promotes only
    what the solution contains - so a missing component means the pipeline SUCCEEDS and
    the target site is quietly misconfigured.

    Two distinct gaps, and fixing the first does not fix the second:
      1. The site record itself is not in the solution.
      2. Its components are not either. `--AddRequiredComponents` on the site record does
         NOT pull them in (verified by round-trip export: powerpagecomponents/ came back
         empty). Each one needs its own add call.

    This script diffs what exists against what the solution already holds and adds only
    the difference, so it is cheap enough to run on every deploy. A clean site costs two
    queries and no writes.

    POLICY: every component belonging to the site goes in the solution, Web Files included.

    It is tempting to exclude Web Files as "just the compiled SPA that upload-code-site
    delivers anyway". That was tried and it is wrong. Most of them are build output, but
    Power Pages also creates theme assets at provisioning (bootstrap.min.css, theme.css,
    portalbasictheme.css, Cat-PC.png, Logo-sm-64.png, and whatever a future platform
    version adds) which exist in `dist/` nowhere - the uploader never recreates them, so
    excluding them means they reach no other environment ever.

    Rather than depend on a rule that has to correctly classify every present and future
    file, the default is simply ALL. The solution is then self-contained and a promotion
    cannot silently lose a component. -WebFiles NonBuildOutput|None remain available for a
    strict two-track setup, but they are opt-outs, not the default.

.PARAMETER SolutionUniqueName
    Target solution's unique name. Defaults to SOLUTION_UNIQUE_NAME in
    src/config/solution.ts, then to solutionUniqueName in the repo-root
    solution.config.json.

.PARAMETER SiteName
    Power Pages site display name. Defaults to `siteName` in powerpages.config.json.

.PARAMETER Check
    Report drift and exit 1 if anything is missing. Changes nothing. For pre-deploy
    gates and CI.

.PARAMETER DryRun
    Report what would be added and exit 0. Changes nothing.

.PARAMETER WebFiles
    Which Web File components to track in the solution:
      All (default)  - every Web File. The solution is self-contained and a promotion
                       cannot lose a component.
      NonBuildOutput - only those with no matching file in dist/, leaving build output to
                       `pac pages upload-code-site`. Strict two-track ALM. Needs dist/ to
                       classify; without it the script skips Web Files and says so rather
                       than guessing.
      None           - no Web Files at all. Loses the platform theme assets on promotion;
                       use only if you have verified the target provisions its own.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/add-site-to-solution.ps1
    Reconcile using the names resolved from config. Adds only what is missing.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/add-site-to-solution.ps1 -Check
    Gate a deploy: non-zero exit means the solution is incomplete.

.NOTES
    Requires an active `pac auth` profile pointed at the environment owning the site.

    pac CLI exits 0 even when add-solution-component fails, so this script parses stdout
    and never trusts $LASTEXITCODE.
#>
[CmdletBinding()]
param(
    [string]$SolutionUniqueName,
    [string]$SiteName,
    [switch]$Check,
    [switch]$DryRun,
    [ValidateSet('All', 'NonBuildOutput', 'None')]
    [string]$WebFiles = 'All'
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

# powerpagecomponenttype 3 = Web File. Filtering uses the numeric code, never the display
# label: the label is localized, so "Web File" is not what a Hebrew-language Dataverse
# user gets back. Codes probed against this entity, since they are not documented:
#   1 Publishing State   2 Web Page      3 Web File     4 Web Link Set   5 Web Link
#   6 Page Template      7 Content Snippet              8 Web Template   9 Site Setting
#  10 Web Page Access Control Rule      11 Web Role    12 Website Access
#  13 Site Marker        (types above 13 exist, e.g. Bot Consumer - `ne 3` keeps them)
$WEB_FILE_TYPE = 3

# FetchXML page size. Non-Web-File component counts are in the low hundreds; the script
# pages anyway and warns rather than silently truncating.
$PAGE_SIZE = 5000
$MAX_PAGES = 20

function Invoke-Fetch {
    param([string]$Xml)
    $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("pac-fetch-{0}.xml" -f [guid]::NewGuid())
    try {
        Set-Content -LiteralPath $tmp -Value $Xml -Encoding UTF8
        $out = pac env fetch --xmlFile $tmp 2>&1 | Out-String
        if ($out -match '(?m)^\s*Error:') {
            throw ("pac env fetch failed: " + (($out -split "`r?`n" | Where-Object { $_ -match 'Error:' }) -join ' '))
        }
        return $out
    }
    finally {
        Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
}

# First GUID on each row = the first requested attribute. pac appends the primary key as a
# trailing column, so anchoring to line start is what keeps the two apart.
function Get-FirstColumnGuids {
    param([string]$Text)
    return @([regex]::Matches($Text, '(?m)^\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})') |
        ForEach-Object { $_.Groups[1].Value.ToLowerInvariant() })
}

# Rows of "<guid> <name>". The id is requested first precisely because a GUID is
# fixed-width and a file name is not - splitting on whitespace from the left is
# unambiguous, splitting from the right is not.
function Get-IdNamePairs {
    param([string]$Text)
    return @([regex]::Matches($Text, '(?m)^\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\s+(\S.*?)\s*$') |
        ForEach-Object { [pscustomobject]@{ Id = $_.Groups[1].Value.ToLowerInvariant(); Name = $_.Groups[2].Value } })
}

# Takes an XML template containing the literal token {{PAGE}}. A template string rather
# than a scriptblock on purpose: a scriptblock would resolve its variables in whatever
# scope invoked it, which silently produced empty values inside the paging loop.
function Get-PagedGuids {
    param([string]$XmlTemplate, [string]$Label)
    $all = New-Object System.Collections.Generic.List[string]
    for ($page = 1; $page -le $MAX_PAGES; $page++) {
        $xml = $XmlTemplate.Replace('{{PAGE}}', "$page")
        $ids = Get-FirstColumnGuids (Invoke-Fetch $xml)
        foreach ($id in $ids) { if (-not $all.Contains($id)) { $all.Add($id) } }
        if ($ids.Count -lt $PAGE_SIZE) { return $all }
    }
    Write-Warning "$Label hit the $MAX_PAGES-page cap - results may be incomplete."
    return $all
}

function Get-XmlEscaped {
    param([string]$Value)
    return $Value.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;').Replace('"', '&quot;')
}

# --- Resolve the solution unique name -------------------------------------------------
if (-not $SolutionUniqueName) {
    $solTs = Join-Path $rootDir 'src\config\solution.ts'
    if (Test-Path -LiteralPath $solTs) {
        $m = [regex]::Match((Get-Content -LiteralPath $solTs -Raw), "SOLUTION_UNIQUE_NAME\s*=\s*'([^']*)'")
        if ($m.Success -and $m.Groups[1].Value -and $m.Groups[1].Value -notlike 'CHANGEME*') {
            $SolutionUniqueName = $m.Groups[1].Value
        }
    }
}
if (-not $SolutionUniqueName) {
    $rootCfg = Join-Path (Split-Path -Parent $rootDir) 'solution.config.json'
    if (Test-Path -LiteralPath $rootCfg) {
        $SolutionUniqueName = (Get-Content -LiteralPath $rootCfg -Raw | ConvertFrom-Json).solutionUniqueName
    }
}
if (-not $SolutionUniqueName -or $SolutionUniqueName -like 'CHANGEME*') {
    throw "Could not resolve the solution unique name. Set SOLUTION_UNIQUE_NAME in src/config/solution.ts (run the root apply-config.ps1), or pass -SolutionUniqueName."
}

# --- Resolve the site name ------------------------------------------------------------
if (-not $SiteName) {
    $cfgPath = Join-Path $rootDir 'powerpages.config.json'
    if (-not (Test-Path -LiteralPath $cfgPath)) {
        throw "No -SiteName given and powerpages.config.json not found at $cfgPath"
    }
    $SiteName = (Get-Content -LiteralPath $cfgPath -Raw | ConvertFrom-Json).siteName
    if (-not $SiteName) { throw "powerpages.config.json has no 'siteName' - pass -SiteName explicitly." }
}

$mode = if ($Check) { 'CHECK' } elseif ($DryRun) { 'DRYRUN' } else { 'SYNC' }
Write-Host "Solution : $SolutionUniqueName"
Write-Host "Site     : $SiteName"
Write-Host "Mode     : $mode"
Write-Host ""

# --- Resolve solution id ----------------------------------------------------------------
$solIds = @(Get-FirstColumnGuids (Invoke-Fetch @"
<fetch>
  <entity name="solution">
    <attribute name="solutionid" />
    <filter>
      <condition attribute="uniquename" operator="eq" value="$(Get-XmlEscaped $SolutionUniqueName)" />
    </filter>
  </entity>
</fetch>
"@))
if ($solIds.Count -eq 0) { throw "No solution with unique name '$SolutionUniqueName' in this environment." }
$solutionId = $solIds[0]

# --- Resolve site id --------------------------------------------------------------------
$siteIds = @(Get-FirstColumnGuids (Invoke-Fetch @"
<fetch>
  <entity name="powerpagesite">
    <attribute name="powerpagesiteid" />
    <filter>
      <condition attribute="name" operator="eq" value="$(Get-XmlEscaped $SiteName)" />
    </filter>
  </entity>
</fetch>
"@))
if ($siteIds.Count -eq 0) { throw "No Power Pages site named '$SiteName' in this environment." }
if ($siteIds.Count -gt 1) { throw "More than one site named '$SiteName' - pass -SiteName to disambiguate." }
$siteId = $siteIds[0]
Write-Host "Solution id : $solutionId"
Write-Host "Site id     : $siteId"

# --- Resolve solution component type codes ----------------------------------------------
# Discovered at runtime, never hardcoded: the ids are environment-specific and the MS docs
# contradict themselves (prose 10319, example 10463 on the same page; this environment
# reports 10424). The add calls pass the type NAME - pac rejects the numeric id - but the
# solutioncomponent membership query needs the number.
$typeOut = Invoke-Fetch @"
<fetch>
  <entity name="solutioncomponentdefinition">
    <attribute name="name" />
    <attribute name="solutioncomponenttype" />
    <filter type="or">
      <condition attribute="name" operator="eq" value="powerpagesite" />
      <condition attribute="name" operator="eq" value="powerpagecomponent" />
    </filter>
  </entity>
</fetch>
"@
function Get-TypeCode {
    param([string]$Name)
    # Row shape is "<name> <number> <definition guid>". The number carries the current
    # culture's thousands separator - "10,423" here, a space in some locales - so match up
    # to the trailing GUID and strip non-digits rather than assuming one separator char.
    $m = [regex]::Match($typeOut, "(?m)^\s*$Name\s+(.+?)\s+[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-")
    if (-not $m.Success) { throw "Could not resolve the solution component type code for '$Name'." }
    $digits = ($m.Groups[1].Value -replace '[^\d]', '')
    if (-not $digits) { throw "Parsed an empty component type code for '$Name'." }
    return [int]$digits
}
$siteTypeCode = Get-TypeCode 'powerpagesite'
$compTypeCode = Get-TypeCode 'powerpagecomponent'
Write-Host "Type ids : powerpagesite=$siteTypeCode  powerpagecomponent=$compTypeCode"

# --- What exists on the site --------------------------------------------------------------
# Everything that is NOT a Web File, always. Filtering with `ne 3` rather than an allowlist
# of known types means a component type the platform introduces later is picked up
# automatically instead of being silently skipped.
$nonWebFile = @(Get-PagedGuids -Label 'site components' -XmlTemplate @"
<fetch count="$PAGE_SIZE" page="{{PAGE}}">
  <entity name="powerpagecomponent">
    <attribute name="powerpagecomponentid" />
    <filter>
      <condition attribute="powerpagesiteid" operator="eq" value="$siteId" />
      <condition attribute="powerpagecomponenttype" operator="ne" value="$WEB_FILE_TYPE" />
    </filter>
    <order attribute="powerpagecomponentid" />
  </entity>
</fetch>
"@)

# Web Files, classified. A web file is build output if and only if a file of the same name
# exists in dist/ - that is precisely what `pac pages upload-code-site` uploads. Anything
# else (the theme assets Power Pages creates at provisioning, or a file added by hand) is
# delivered by NOTHING on the asset track, so leaving it out of the solution means it never
# reaches Stage or Prod.
$webFileRows = @()
for ($page = 1; $page -le $MAX_PAGES; $page++) {
    $rows = Get-IdNamePairs (Invoke-Fetch @"
<fetch count="$PAGE_SIZE" page="$page">
  <entity name="powerpagecomponent">
    <attribute name="powerpagecomponentid" />
    <attribute name="name" />
    <filter>
      <condition attribute="powerpagesiteid" operator="eq" value="$siteId" />
      <condition attribute="powerpagecomponenttype" operator="eq" value="$WEB_FILE_TYPE" />
    </filter>
    <order attribute="powerpagecomponentid" />
  </entity>
</fetch>
"@)
    $webFileRows += $rows
    if ($rows.Count -lt $PAGE_SIZE) { break }
}

$distDir = Join-Path $rootDir 'dist'
$distNames = $null
if (Test-Path -LiteralPath $distDir) {
    $distNames = [System.Collections.Generic.HashSet[string]]::new(
        [string[]]@(Get-ChildItem -LiteralPath $distDir -Recurse -File | ForEach-Object { $_.Name }),
        [System.StringComparer]::OrdinalIgnoreCase)
}

$buildOutput = @()
$notBuildOutput = @()
if ($null -eq $distNames) {
    # Only NonBuildOutput needs the classification. 'All' and 'None' are decided without it,
    # so a missing dist/ is not their problem. Where it IS needed, say so rather than guess:
    # guessing "build output" would silently drop the platform assets, which is the exact
    # failure this script exists to prevent.
    if ($WebFiles -eq 'NonBuildOutput') {
        Write-Warning "dist/ not found - cannot tell build output from platform web files. Run 'npm run build' first. Web Files are being skipped this run."
    }
} else {
    foreach ($row in $webFileRows) {
        if ($distNames.Contains($row.Name)) { $buildOutput += $row } else { $notBuildOutput += $row }
    }
}

$webFilesToInclude = switch ($WebFiles) {
    'All'  { @($webFileRows | ForEach-Object { $_.Id }) }
    'None' { @() }
    default {
        if ($null -eq $distNames) { @() } else { @($notBuildOutput | ForEach-Object { $_.Id }) }
    }
}

$existingComponents = @($nonWebFile) + @($webFilesToInclude)

$memberComponents = @(Get-PagedGuids -Label 'solution components' -XmlTemplate @"
<fetch count="$PAGE_SIZE" page="{{PAGE}}">
  <entity name="solutioncomponent">
    <attribute name="objectid" />
    <filter>
      <condition attribute="solutionid" operator="eq" value="$solutionId" />
      <condition attribute="componenttype" operator="eq" value="$compTypeCode" />
    </filter>
    <order attribute="objectid" />
  </entity>
</fetch>
"@)

$memberSites = @(Get-PagedGuids -Label 'solution sites' -XmlTemplate @"
<fetch count="$PAGE_SIZE" page="{{PAGE}}">
  <entity name="solutioncomponent">
    <attribute name="objectid" />
    <filter>
      <condition attribute="solutionid" operator="eq" value="$solutionId" />
      <condition attribute="componenttype" operator="eq" value="$siteTypeCode" />
    </filter>
    <order attribute="objectid" />
  </entity>
</fetch>
"@)

$siteMissing = -not ($memberSites -contains $siteId)
$existingSet = [System.Collections.Generic.HashSet[string]]::new([string[]]$existingComponents)
$memberSet = [System.Collections.Generic.HashSet[string]]::new([string[]]$memberComponents)
$missing = @($existingComponents | Where-Object { -not $memberSet.Contains($_) })
$foreign = @($memberComponents | Where-Object { -not $existingSet.Contains($_) })

Write-Host ""
Write-Host ("Site record : {0}" -f $(if ($siteMissing) { 'MISSING from the solution' } else { 'in the solution' }))
Write-Host ("Components  : {0} tracked, {1} in the solution, {2} missing" -f `
    $existingComponents.Count, $memberComponents.Count, $missing.Count)
Write-Host ("  non-Web-File : {0}" -f $nonWebFile.Count)
Write-Host ("  Web Files    : {0} total  ->  mode '{1}', {2} tracked" -f `
    $webFileRows.Count, $WebFiles, $webFilesToInclude.Count)
if ($null -ne $distNames) {
    Write-Host ("     {0} are build output (in dist/, delivered by pac pages upload-code-site)" -f $buildOutput.Count)
    Write-Host ("     {0} are NOT build output (platform theme assets or hand-added)" -f $notBuildOutput.Count)
    if ($WebFiles -eq 'NonBuildOutput' -and $notBuildOutput.Count -gt 0) {
        # These are the ones nothing else delivers - naming them makes the choice reviewable
        # instead of a silent policy buried in a switch.
        $notBuildOutput | ForEach-Object { Write-Host ("       - {0}" -f $_.Name) }
    }
}
if ($foreign.Count -gt 0) {
    # Not removed: they may legitimately belong to a second site in the same solution.
    Write-Warning ("{0} powerpagecomponent(s) in the solution do not belong to this site. If this solution owns only one site, they are leftovers from another and will be promoted with it." -f $foreign.Count)
}

$totalMissing = $missing.Count + $(if ($siteMissing) { 1 } else { 0 })

if ($totalMissing -eq 0) {
    Write-Host ""
    Write-Host "Solution is complete - nothing to add." -ForegroundColor Green
    exit 0
}

if ($Check) {
    Write-Host ""
    Write-Host "CHECK FAILED - $totalMissing component(s) are missing from the solution." -ForegroundColor Red
    Write-Host "Run this script without -Check to add them, or 'npm run deploy' which does it for you."
    exit 1
}

if ($DryRun) {
    Write-Host ""
    Write-Host "DryRun - nothing was changed. Would add:"
    if ($siteMissing) { Write-Host "  powerpagesite       $siteId" }
    $missing | ForEach-Object { Write-Host "  powerpagecomponent  $_" }
    exit 0
}

# --- Add the difference -------------------------------------------------------------------
$failed = @()

function Add-Component {
    param([string]$Id, [string]$Type)
    # --componentType takes the type NAME. The numeric id is rejected outright:
    # "The provided Component Type Id (10424) is not known, Please provide the Component Type name".
    $out = pac solution add-solution-component `
        --solutionUniqueName $SolutionUniqueName `
        --component $Id `
        --componentType $Type 2>&1 | Out-String
    # pac exits 0 on failure here - stdout is the only reliable signal.
    if ($out -match 'has been added to the') { return $true }
    if ($out -match 'already exists|already a member|already in the solution') { return $true }
    Write-Host ""
    Write-Host "  FAILED $Type $Id" -ForegroundColor Red
    Write-Host ("    {0}" -f (($out -split "`r?`n" | Where-Object { $_ -match 'Error' }) -join ' | '))
    return $false
}

Write-Host ""
if ($siteMissing) {
    Write-Host "Adding the site record..."
    if (-not (Add-Component -Id $siteId -Type 'powerpagesite')) { $failed += "powerpagesite:$siteId" }
}
if ($missing.Count -gt 0) {
    Write-Host "Adding $($missing.Count) missing component(s)..."
    $i = 0
    foreach ($id in $missing) {
        $i++
        Write-Progress -Activity "Adding site components to $SolutionUniqueName" `
            -Status "$i of $($missing.Count)" -PercentComplete (($i / $missing.Count) * 100)
        if (-not (Add-Component -Id $id -Type 'powerpagecomponent')) { $failed += "powerpagecomponent:$id" }
    }
    Write-Progress -Activity "Adding site components" -Completed
}

Write-Host ""
Write-Host ("Added  : {0} of {1}" -f ($totalMissing - $failed.Count), $totalMissing)
if ($failed.Count -gt 0) {
    Write-Host ("Failed : {0}" -f $failed.Count) -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  $_" }
    exit 1
}
Write-Host "Solution is complete." -ForegroundColor Green
exit 0

