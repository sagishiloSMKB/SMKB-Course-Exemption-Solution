<#
.SYNOPSIS
  Apply the single root solution.config.json into every activated starter's own
  config files. The ONE place solution identity is authored; this script pushes it down.

.DESCRIPTION
  Root owns solution identity (solution.config.json). Each starter keeps its own local
  config files as the *targets*. This script is the bridge and the drift guard:

    apply-config.ps1            Validate, then write identity into activated starters.
    apply-config.ps1 -DryRun    Show what would change; write nothing.
    apply-config.ps1 -Check     Fail (exit 1) if any starter config has drifted from
                                 the root config. Used by the pre-commit hook / CI.
    apply-config.ps1 -Force     Allow re-applying a changed shortPrefix even after a
                                 .guid-freshened marker exists (normally destructive).

  Design: every identity field is written with a KEY-anchored regex that rewrites the
  value in place. That makes apply idempotent (re-run = no-op), re-appliable after a
  config change, and - because "already applied" is exactly "regex produces no change" -
  lets the same code detect drift. The script writes ONLY identity; it never touches
  platform-assigned placeholders (app GUIDs, workflow GUIDs, site-setting GUIDs,
  connection references), so each starter's own deploy.ps1 placeholder guard stays armed.
#>
[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$Check,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$configPath = Join-Path $root 'solution.config.json'

# -- I/O helpers (UTF-8, no BOM, Hebrew-safe) ---------------------------------
function Read-Text([string]$Path) { [System.IO.File]::ReadAllText($Path) }
function Write-Text([string]$Path, [string]$Text) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Text, $utf8NoBom)
}
# Escape a substituted value so literal $ in it is not read as a .NET group ref.
function Esc([string]$s) { if ($null -eq $s) { '' } else { $s.Replace('$', '$$') } }

$script:drift  = @()
$script:writes = 0
$script:warned = $false

# -- Pre-flight: MAX_PATH headroom ---------------------------------------------
# The deepest file this kit writes is roughly
#   <root>\SMKB - <Name> - Environmental Variables\environmentvariabledefinitions\smkb_<prefix>_<PascalName>\environmentvariabledefinition.xml
# which needs ~150 characters below <root>. Windows PowerShell 5.1 silently fails Test-Path past
# 260 chars, so a deep clone makes writes disappear instead of erroring. Warn early and loudly.
function Test-PathHeadroom {
  $needed = 150
  if (($root.Length + $needed) -gt 260) {
    Write-Host ""
    Write-Host "WARNING: this repo is $($root.Length) characters deep:" -ForegroundColor Yellow
    Write-Host "  $root" -ForegroundColor Yellow
    Write-Host "  Some paths will exceed the Windows 260-character limit, and Windows PowerShell then" -ForegroundColor Yellow
    Write-Host "  skips files SILENTLY. Clone closer to the drive root (e.g. C:\src\<solution>) or enable" -ForegroundColor Yellow
    Write-Host "  long paths, then re-run. Verify afterwards with: apply-config.ps1 -Check" -ForegroundColor Yellow
    Write-Host ""
  }
}

# -- Load config --------------------------------------------------------------
if (-not (Test-Path -LiteralPath $configPath)) { throw "solution.config.json not found at $configPath" }
$cfg = Read-Text $configPath | ConvertFrom-Json

$uniqueName  = "$($cfg.solutionUniqueName)"
$displayName = "$($cfg.solutionDisplayName)"
$prefix      = "$($cfg.shortPrefix)"
$prefixUpper = $prefix.ToUpperInvariant()
$targetUrl   = "$($cfg.targetEnvUrl)"
$envId       = "$($cfg.environmentId)"
$appDisplay  = "$($cfg.powerApps.appDisplayName)"
$ppSite      = "$($cfg.powerPages.siteName)"
$ppHe        = "$($cfg.powerPages.appNameHe)"
$ppEn        = "$($cfg.powerPages.appNameEn)"
$ppTitle     = "$($cfg.powerPages.documentTitle)"
$ppLang      = "$($cfg.powerPages.defaultLanguage)"
$derivedSite = "$prefixUpper - $ppSite"

function Test-Initialized {
  return ($uniqueName -ne 'YourSolutionName' -and
          $displayName -ne 'Your Solution Name' -and
          $prefix -ne 'sol' -and $prefix -ne '')
}

function Assert-Valid {
  $errs = @()
  if ($uniqueName -eq '' -or $uniqueName -eq 'YourSolutionName') { $errs += 'solutionUniqueName is unset (still "YourSolutionName").' }
  if ($uniqueName -match '\s') { $errs += 'solutionUniqueName must not contain spaces.' }
  if ($displayName -eq '' -or $displayName -eq 'Your Solution Name') { $errs += 'solutionDisplayName is unset (still "Your Solution Name").' }
  if ($prefix -notmatch '^[a-z]{2,5}$') { $errs += "shortPrefix '$prefix' must be 2-5 lowercase letters." }
  if ($prefix -eq 'sol') { $errs += 'shortPrefix is still the template default "sol".' }
  if ($envId -notmatch '^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$') { $errs += 'environmentId must be a GUID.' }
  if ($envId -eq '00000000-0000-0000-0000-000000000000') { $errs += 'environmentId is still all-zeros.' }
  if ($targetUrl -notmatch '^https://.+/$') { $errs += 'targetEnvUrl must be an https URL ending in "/".' }
  if ($cfg.activate.powerApps -and ($appDisplay -eq 'Your App Display Name' -or $appDisplay -eq '')) { $errs += 'powerApps.appDisplayName is unset.' }
  if ($cfg.activate.powerPages) {
    foreach ($pair in @(@('siteName',$ppSite),@('appNameHe',$ppHe),@('appNameEn',$ppEn),@('documentTitle',$ppTitle))) {
      if ($pair[1] -like 'CHANGEME*' -or $pair[1] -eq '') { $errs += "powerPages.$($pair[0]) is unset (still CHANGEME)." }
    }
  }
  if ($errs.Count) {
    Write-Host "solution.config.json is not ready:" -ForegroundColor Red
    $errs | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
  }
}

# -- Keyed-regex op: rewrite value in place; unifies apply / dry-run / check ---
function Invoke-Op {
  param([string]$Path, [string]$Pattern, [string]$Replacement, [string]$Label)
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $orig = Read-Text $Path
  $new  = [regex]::Replace($orig, $Pattern, $Replacement)
  $changed = ($new -ne $orig)
  if ($Check)  { if ($changed) { $script:drift += "$Label  ($Path)" }; return }
  if ($DryRun) { Write-Host ("  {0} {1}" -f $(if($changed){'WOULD UPDATE'}else{'ok         '}), $Label); return }
  if ($changed) { Write-Text $Path $new; $script:writes++; Write-Host "  updated: $Label" -ForegroundColor Green }
  else { Write-Host "  ok:      $Label" }
}

# -- ALM env-var rename (exact-token; sentinel-based one-shot) -----------------
function Invoke-AlmToken {
  param([string]$Path, [string]$Label)
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $orig = Read-Text $Path
  $new  = $orig.Replace('smkb_sol_EnvironmentName', "smkb_${prefix}_EnvironmentName").Replace('smkb_sol_FlowErrorEmails', "smkb_${prefix}_FlowErrorEmails")
  # Display-name convention prefix inside the two ALM env-var definition files only.
  if ($Path -match 'environmentvariabledefinition\.xml$') { $new = $new.Replace('SOL - ', "$prefixUpper - ") }
  $changed = ($new -ne $orig)
  if ($Check)  { if ($changed) { $script:drift += "$Label  ($Path)" }; return }
  if ($DryRun) { Write-Host ("  {0} {1}" -f $(if($changed){'WOULD UPDATE'}else{'ok         '}), $Label); return }
  if ($changed) { Write-Text $Path $new; $script:writes++; Write-Host "  updated: $Label" -ForegroundColor Green }
  else { Write-Host "  ok:      $Label" }
}

function Rename-AlmFolder {
  param([string]$Base, [string]$OldName, [string]$NewName, [string]$Label)
  $old = Join-Path $Base $OldName
  $new = Join-Path $Base $NewName
  if ($OldName -eq $NewName) { return }
  if ($Check)  { if (Test-Path -LiteralPath $old) { $script:drift += "$Label (folder still '$OldName')  ($Base)" }; return }
  if (-not (Test-Path -LiteralPath $old)) {
    # Distinguish "already renamed" from "neither name is there". The latter means the path was
    # unreadable - on Windows PowerShell 5.1 that is almost always MAX_PATH (>260 chars), where
    # Test-Path returns $false instead of throwing. Reporting it as 'ok' would hide a real desync
    # (Solution.xml gets rewritten while the folders do not).
    if (Test-Path -LiteralPath $new) { if (-not $DryRun) { Write-Host "  ok:      $Label (already '$NewName')" } }
    else {
      Write-Host "  WARNING: $Label - neither '$OldName' nor '$NewName' found under" -ForegroundColor Yellow
      Write-Host "           $Base" -ForegroundColor Yellow
      Write-Host "           Nothing renamed. If that path is longer than 260 characters, clone the repo" -ForegroundColor Yellow
      Write-Host "           closer to the drive root (or enable Windows long paths) and re-run." -ForegroundColor Yellow
      $script:warned = $true
    }
    return
  }
  if ($DryRun) { Write-Host "  WOULD RENAME $Label -> $NewName"; return }
  if (Test-Path -LiteralPath $new) { Remove-Item -LiteralPath $old -Recurse -Force }
  else { Rename-Item -LiteralPath $old -NewName $NewName }
  $script:writes++; Write-Host "  renamed: $Label -> $NewName" -ForegroundColor Green
}

# -- Guard: refuse destructive prefix re-map after platform GUIDs were freshened -
function Test-PrefixGuard {
  $markers = Get-ChildItem -Path $root -Recurse -Filter '.guid-freshened' -Force -ErrorAction SilentlyContinue
  if ($markers -and -not $Force -and -not $Check -and -not $DryRun) {
    # Only a concern if a starter still holds the OLD 'sol_' ALM tokens (i.e. a prefix change is pending).
    $envBase = Join-Path $root 'SMKB - Environmental Variables Starter\environmentvariabledefinitions'
    if (Test-Path (Join-Path $envBase 'smkb_sol_EnvironmentName')) {
      Write-Host "Refusing to re-map shortPrefix: a .guid-freshened marker exists and renaming schema names post-deploy is destructive. Re-run with -Force if you are sure." -ForegroundColor Red
      exit 1
    }
  }
}

# -- Main -------------------------------------------------------------------
$initialized = Test-Initialized

if ($Check -and -not $initialized) {
  Write-Host "solution.config.json is still the uninitialized template - nothing to enforce."
  exit 0
}
if (-not $Check) { Assert-Valid }
Test-PathHeadroom
if ($initialized) { Test-PrefixGuard }

$mode = if ($Check) { 'CHECK (drift)' } elseif ($DryRun) { 'DRY RUN' } else { 'APPLY' }
Write-Host ""
Write-Host "solution.config.json -> starters   [$mode]" -ForegroundColor Cyan
Write-Host ("  solution: {0} ({1})   prefix: {2}   env: {3}" -f $displayName, $uniqueName, $prefix, $targetUrl)
Write-Host ""

$paRoot = Join-Path $root 'SMKB - Power Apps Starter'
$ppRoot = Join-Path $root 'SMKB - Power Pages Code Site Starter'
$flRoot = Join-Path $root 'SMKB - Power Automate Flows Starter'
$tbRoot = Join-Path $root 'SMKB - Dataverse Tables Starter'
$evRoot = Join-Path $root 'SMKB - Environmental Variables Starter'

# Solution.xml identity (UniqueName + solution display name) - the 3 XML starters.
$solXmlPattern = '(<SolutionManifest>\s*<UniqueName>)[^<]*(</UniqueName>\s*<LocalizedNames>\s*<LocalizedName description=")[^"]*(")'
$solXmlRepl    = '${1}' + (Esc $uniqueName) + '${2}' + (Esc $displayName) + '${3}'
foreach ($s in @(
    @{ on = $cfg.activate.dataverseTables;       path = (Join-Path $tbRoot 'Other\Solution.xml'); lbl = 'Tables Solution.xml identity' },
    @{ on = $cfg.activate.environmentVariables;  path = (Join-Path $evRoot 'Other\Solution.xml'); lbl = 'EnvVars Solution.xml identity' },
    @{ on = $cfg.activate.powerAutomateFlows;    path = (Join-Path $flRoot 'Other\Solution.xml'); lbl = 'Flows Solution.xml identity' })) {
  if ($s.on) { Invoke-Op -Path $s.path -Pattern $solXmlPattern -Replacement $solXmlRepl -Label $s.lbl }
}

# Power Apps - deploy.config.json + power.config.json (identity only; appId left to pac code init).
if ($cfg.activate.powerApps) {
  $dc = Join-Path $paRoot 'deploy.config.json'
  Invoke-Op -Path $dc -Pattern '("solutionName":\s*)"[^"]*"' -Replacement ('${1}"' + (Esc $uniqueName) + '"') -Label 'PowerApps deploy.config solutionName'
  Invoke-Op -Path $dc -Pattern '("targetEnv":\s*)"[^"]*"'    -Replacement ('${1}"' + (Esc $targetUrl)  + '"') -Label 'PowerApps deploy.config targetEnv'
  Invoke-Op -Path $dc -Pattern '("allowedEnvs":\s*)\[[^\]]*\]' -Replacement ('${1}["' + (Esc $targetUrl) + '"]') -Label 'PowerApps deploy.config allowedEnvs'
  $pc = Join-Path $paRoot 'power.config.json'
  Invoke-Op -Path $pc -Pattern '("appDisplayName":\s*)"[^"]*"' -Replacement ('${1}"' + (Esc $appDisplay) + '"') -Label 'PowerApps power.config appDisplayName'
  Invoke-Op -Path $pc -Pattern '("environmentId":\s*)"[^"]*"'  -Replacement ('${1}"' + (Esc $envId)      + '"') -Label 'PowerApps power.config environmentId'
}

# Power Pages - src/config/solution.ts + powerpages.config.json.
if ($cfg.activate.powerPages) {
  $st = Join-Path $ppRoot 'src\config\solution.ts'
  Invoke-Op -Path $st -Pattern "(prefix:\s*)'[^']*'"        -Replacement ("`${1}'" + (Esc $prefix)  + "'") -Label 'PowerPages solution.ts prefix'
  Invoke-Op -Path $st -Pattern "(siteName:\s*)'[^']*'"      -Replacement ("`${1}'" + (Esc $ppSite)  + "'") -Label 'PowerPages solution.ts siteName'
  Invoke-Op -Path $st -Pattern "(appName:\s*\{\s*he:\s*)'[^']*'(,\s*en:\s*)'[^']*'" -Replacement ("`${1}'" + (Esc $ppHe) + "'`${2}'" + (Esc $ppEn) + "'") -Label 'PowerPages solution.ts appName'
  Invoke-Op -Path $st -Pattern "(documentTitle:\s*)'[^']*'" -Replacement ("`${1}'" + (Esc $ppTitle) + "'") -Label 'PowerPages solution.ts documentTitle'
  Invoke-Op -Path $st -Pattern "(defaultLanguage:\s*)'[^']*'" -Replacement ("`${1}'" + (Esc $ppLang) + "'") -Label 'PowerPages solution.ts defaultLanguage'
  # Deploy tooling only (scripts/add-site-to-solution.ps1 reconciles the site's components
  # against this solution on every deploy). The starter cannot learn the name any other way -
  # powerpages.config.json follows a Microsoft schema and must not carry custom keys.
  # NOTE the variable is $uniqueName: PowerShell expands an undefined variable to an empty
  # string, so a typo here would silently write '' and still pass every gate.
  Invoke-Op -Path $st -Pattern "(SOLUTION_UNIQUE_NAME\s*=\s*)'[^']*'" -Replacement ("`${1}'" + (Esc $uniqueName) + "'") -Label 'PowerPages solution.ts SOLUTION_UNIQUE_NAME'
  $ppc = Join-Path $ppRoot 'powerpages.config.json'
  Invoke-Op -Path $ppc -Pattern '("siteName":\s*)"[^"]*"' -Replacement ('${1}"' + (Esc $derivedSite) + '"') -Label 'PowerPages powerpages.config siteName'
}

# ALM env vars - swap the 'sol' segment of smkb_sol_EnvironmentName / smkb_sol_FlowErrorEmails to the solution prefix.
if ($cfg.activate.environmentVariables) {
  $evBase = Join-Path $evRoot 'environmentvariabledefinitions'
  foreach ($v in @('EnvironmentName','FlowErrorEmails')) {
    $oldFolder = "smkb_sol_$v"; $newFolder = "smkb_${prefix}_$v"
    $xmlOld = Join-Path (Join-Path $evBase $oldFolder) 'environmentvariabledefinition.xml'
    $xmlNew = Join-Path (Join-Path $evBase $newFolder) 'environmentvariabledefinition.xml'
    if (Test-Path -LiteralPath $xmlOld) { Invoke-AlmToken -Path $xmlOld -Label "EnvVars $oldFolder schema/display" }
    elseif (Test-Path -LiteralPath $xmlNew) { Invoke-AlmToken -Path $xmlNew -Label "EnvVars $newFolder schema/display" }
    Rename-AlmFolder -Base $evBase -OldName $oldFolder -NewName $newFolder -Label "EnvVars folder $oldFolder"
  }
  # The two ALM vars are also declared as RootComponents in Solution.xml - keep those
  # schemaNames in lockstep with the folder/schemaname rename above, or the definitions
  # import unlinked from the solution and never reach Stage/Prod.
  Invoke-AlmToken -Path (Join-Path $evRoot 'Other\Solution.xml') -Label 'EnvVars Solution.xml ALM RootComponents'
}
if ($cfg.activate.powerAutomateFlows) {
  $wf = Join-Path $flRoot 'Workflows'
  if (Test-Path -LiteralPath $wf) {
    Get-ChildItem -LiteralPath $wf -Filter '*.json' -File | ForEach-Object {
      Invoke-AlmToken -Path $_.FullName -Label "Flows $($_.Name) env-var refs"
    }
  }
}

# -- Report -----------------------------------------------------------------
if ($Check) {
  if ($script:drift.Count) {
    Write-Host ""
    Write-Host "CONFIG DRIFT - these starter files disagree with solution.config.json:" -ForegroundColor Red
    $script:drift | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "Run 'apply-config.ps1' to reconcile." -ForegroundColor Yellow
    exit 1
  }
  Write-Host "No drift: all activated starters match solution.config.json." -ForegroundColor Green
  exit 0
}

Write-Host ""
Write-Host "Not written by apply (platform-assigned / per-developer - handle via each starter's docs):" -ForegroundColor Yellow
if ($cfg.activate.powerApps)          { Write-Host "  - Power Apps appId          -> 'pac code init' populates power.config.json.appId" }
if ($cfg.activate.powerAutomateFlows) { Write-Host "  - Flow workflow GUIDs + connection references -> environment-assigned (see Flows README)" }
if ($cfg.activate.dataverseTables)    { Write-Host "  - Table schema names (smkb_sol_ExampleTable*) + guid-freshen.ps1 (run once)" }
if ($cfg.activate.powerPages)         { Write-Host "  - Site-setting GUIDs -> scripts/freshen-site-settings.ps1 (/ppcs-provision-site); .env.local VITE_PORTAL_URL (per-dev); flows.ts GUIDs (/ppcs-register-flow)" }
if ($targetUrl -ne 'https://org229c958d.crm4.dynamics.com/') {
  Write-Host "  - NOTE: Tables/EnvVars/Flows deploy.ps1 hardcode the SMKB-Apps-Dev URL by design; they will block a non-Dev targetEnvUrl. Stage/Prod go through Pipeline only." -ForegroundColor Yellow
}
Write-Host ""
if ($DryRun) { Write-Host "Dry run complete - no files changed." -ForegroundColor Cyan }
else { Write-Host "Apply complete - $($script:writes) file(s) updated. Review 'git diff', then continue with each starter's deploy steps." -ForegroundColor Cyan }
