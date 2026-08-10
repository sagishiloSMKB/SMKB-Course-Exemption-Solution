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
# -- Escaping: the DESTINATION grammar decides, not just the regex ------------
# Esc used to escape only '$' (the .NET replacement group-ref). That is necessary but not
# sufficient: these values land in XML attributes, JSON strings and single-quoted TypeScript
# literals. A solution named "SMKB - Registration & Payments" wrote a raw '&' into three
# Other/Solution.xml files - malformed XML, pac import fails - and -Check then reported "No
# drift", because the write itself had succeeded. An apostrophe in documentTitle broke
# solution.ts the same way. Escape for the target grammar FIRST, then for the replacement
# grammar (content escaping never introduces a '$', so the order is safe).
function EscRe([string]$s) { if ($null -eq $s) { '' } else { $s.Replace('$', '$$') } }

# XML: covers both attribute values and element text.
function EscXml([string]$s) {
  if ($null -eq $s) { return '' }
  EscRe ($s.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;').Replace('"', '&quot;'))
}

# JSON string body.
function EscJson([string]$s) {
  if ($null -eq $s) { return '' }
  EscRe ($s.Replace('\', '\\').Replace('"', '\"'))
}

# Single-quoted TypeScript/JavaScript literal.
function EscTs([string]$s) {
  if ($null -eq $s) { return '' }
  EscRe ($s.Replace('\', '\\').Replace("'", "\'"))
}

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

# -- Derived starter folder names (INIT_PROJECT Phase 6) ------------------------
# An activated starter is renamed from its template name to 'SMKB - <Component> - <Type>'.
# Tables / Env Vars / Flows are solution-wide, so their Component is the solution name; the
# Power App and the Power Pages site are named after what they DO (Critical Rule 3).
$solutionName = ($displayName -replace '^\s*SMKB\s*-\s*', '').Trim()
$paComponent  = "$($cfg.powerApps.componentName)".Trim()
if ($paComponent -eq '' -or $paComponent -like 'CHANGEME*') {
  # Fall back to the app display name, which is 'SMKB - <Component> - Dev'.
  $paComponent = (($appDisplay -replace '^\s*SMKB\s*-\s*', '') -replace '\s*-\s*Dev\s*$', '').Trim()
}

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
  if ($cfg.activate.powerApps -and $paComponent -eq '') { $errs += 'powerApps.componentName is unset and could not be derived from appDisplayName (it names the Power App folder).' }
  if ($cfg.activate.powerPages) {
    foreach ($pair in @(@('siteName',$ppSite),@('appNameHe',$ppHe),@('appNameEn',$ppEn),@('documentTitle',$ppTitle))) {
      if ($pair[1] -like 'CHANGEME*' -or $pair[1] -eq '') { $errs += "powerPages.$($pair[0]) is unset (still CHANGEME)." }
    }
  }
  # Values that become FOLDER NAMES must be legal path segments. Without this the run writes
  # every content change and only then throws at Rename-Item, leaving a half-applied repo whose
  # symptom is a doc-boundaries failure rather than a config error.
  foreach ($seg in @(
      @('solutionDisplayName (folder segment)', $solutionName),
      @('powerApps.componentName',              $(if ($cfg.activate.powerApps)  { $paComponent } else { '' })),
      @('powerPages.siteName',                  $(if ($cfg.activate.powerPages) { $ppSite }      else { '' })))) {
    $name = $seg[0]; $val = "$($seg[1])"
    if ($val -eq '') { continue }
    if ($val -match '[\\/:*?"<>|]') { $errs += "$name '$val' contains a character illegal in a folder name (\\ / : * ? "" < > |)." }
    if ($val -match '\.\s*$')       { $errs += "$name '$val' must not end with a dot - Windows silently strips it." }
    if ($val -match '^\s|\s$')      { $errs += "$name '$val' must not start or end with whitespace." }
  }

  # Confusable punctuation is the one charset rule that matters here: Hebrew and other scripts are
  # fine in a display name (Dataverse XML is UTF-8), but an en/em dash or a smart quote is mangled
  # by Hebrew-locale Windows-1255 tooling into visible garbage. Reject it at the source, with the
  # ASCII replacement named, rather than shipping a corrupted display name.
  foreach ($pair in @(
      @('solutionDisplayName', $displayName), @('powerApps.appDisplayName', $appDisplay),
      @('powerPages.appNameHe', $ppHe), @('powerPages.appNameEn', $ppEn),
      @('powerPages.documentTitle', $ppTitle), @('powerPages.siteName', $ppSite))) {
    $val = "$($pair[1])"
    if ($val -match '[\u2013\u2014]')       { $errs += "$($pair[0]) contains an en/em dash - use an ASCII hyphen '-'." }
    if ($val -match '[\u2018\u2019\u201C\u201D]') { $errs += "$($pair[0]) contains a smart quote - use a plain ' or ""." }
    if ($val -match '\u00A0')               { $errs += "$($pair[0]) contains a non-breaking space - use a normal space." }
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
  # A missing target used to return silently in EVERY mode, so -Check reported "No drift" and
  # exited 0 for an activated starter whose config file had been deleted, moved, or pushed past
  # MAX_PATH (where Test-Path returns $false rather than throwing). -Check is what the pre-commit
  # hook and /pre-deploy-verify rely on, so that was a false pass on the load-bearing gate.
  if (-not (Test-Path -LiteralPath $Path)) {
    if ($Check) { $script:drift += "$Label  (MISSING FILE: $Path)" }
    else { Write-Host "  MISSING: $Label - $Path" -ForegroundColor Yellow; $script:warned = $true }
    return
  }
  $orig = Read-Text $Path
  $new  = [regex]::Replace($orig, $Pattern, $Replacement)
  $changed = ($new -ne $orig)
  if ($Check)  { if ($changed) { $script:drift += "$Label  ($Path)" }; return }
  if ($DryRun) { Write-Host ("  {0} {1}" -f $(if($changed){'WOULD UPDATE'}else{'ok         '}), $Label); return }
  if ($changed) { Write-Text $Path $new; $script:writes++; Write-Host "  updated: $Label" -ForegroundColor Green }
  else { Write-Host "  ok:      $Label" }
}

# -- ALM env-var rename (exact-token; sentinel-based one-shot) -----------------
# Every env-var definition this starter SHIPS. Each one's 'sol' segment is swapped to the
# solution prefix here, so add a name to this list whenever the starter ships another
# definition - the Env Vars deploy.ps1 guard refuses to deploy while any 'sol' segment
# remains, so a definition missing from this list silently blocks the whole starter.
$script:shippedEnvVars = @('EnvironmentName', 'FlowErrorEmails', 'OtpDailyCap', 'SecurityAlertEmails')

function Invoke-AlmToken {
  param([string]$Path, [string]$Label)
  # See Invoke-Op: a missing file must be drift under -Check, never a silent pass.
  if (-not (Test-Path -LiteralPath $Path)) {
    if ($Check) { $script:drift += "$Label  (MISSING FILE: $Path)" }
    else { Write-Host "  MISSING: $Label - $Path" -ForegroundColor Yellow; $script:warned = $true }
    return
  }
  $orig = Read-Text $Path
  $new  = $orig
  foreach ($v in $script:shippedEnvVars) {
    $new = $new.Replace("smkb_sol_$v", "smkb_${prefix}_$v")
  }
  # Display-name convention prefix inside the shipped env-var definition files only.
  if ($Path -match 'environmentvariabledefinition\.xml$') { $new = $new.Replace('SOL - ', "$prefixUpper - ") }
  $changed = ($new -ne $orig)
  if ($Check)  { if ($changed) { $script:drift += "$Label  ($Path)" }; return }
  if ($DryRun) { Write-Host ("  {0} {1}" -f $(if($changed){'WOULD UPDATE'}else{'ok         '}), $Label); return }
  if ($changed) { Write-Text $Path $new; $script:writes++; Write-Host "  updated: $Label" -ForegroundColor Green }
  else { Write-Host "  ok:      $Label" }
}

# Detect a shortPrefix that was changed AFTER a successful apply. That case is otherwise invisible:
# Invoke-AlmToken and Rename-AlmFolder both rewrite only from the literal 'sol' segment, so an
# already-renamed smkb_<old>_EnvironmentName matches neither the 'sol' source nor the new target -
# both no-op, and -Check records nothing. The result is a split identity: solution.ts carries the new
# prefix while the Dataverse schema names keep the old one.
#
# This reports; it deliberately does NOT rename. Once a definition has been deployed its schema name
# is fixed in Dataverse, so re-prefixing the folder would import a NEW variable and orphan the live
# one (taking its value with it). The prefix is effectively single-shot after the first deploy, which
# is why identity is settled at INIT_PROJECT Phase 2, before anything is applied.
function Test-EnvVarPrefix {
  param([string]$Base)
  if (-not (Test-Path -LiteralPath $Base)) { return }
  $stale = @()
  foreach ($d in @(Get-ChildItem -LiteralPath $Base -Directory -ErrorAction SilentlyContinue)) {
    if ($d.Name -match '^smkb_([a-z]{2,5})_(.+)$') {
      $found = $Matches[1]
      $leaf  = $Matches[2]
      if (($script:shippedEnvVars -contains $leaf) -and ($found -ne 'sol') -and ($found -ne $prefix)) {
        $stale += "$($d.Name) carries prefix '$found', but solution.config.json says '$prefix'"
      }
    }
  }
  if (-not $stale.Count) { return }
  if ($Check) {
    foreach ($s in $stale) { $script:drift += "EnvVars prefix mismatch: $s  ($Base)" }
    return
  }
  Write-Host ""
  Write-Host "  WARNING: shortPrefix was changed after these env-var definitions were already renamed:" -ForegroundColor Yellow
  foreach ($s in $stale) { Write-Host "           - $s" -ForegroundColor Yellow }
  Write-Host "           Nothing was rewritten. If they have NOT been deployed yet, rename the folders and" -ForegroundColor Yellow
  Write-Host "           their schemaname/displayname to the new prefix by hand, then re-run -Check." -ForegroundColor Yellow
  Write-Host "           If they HAVE been deployed, keep the old prefix: a Dataverse schema name is fixed" -ForegroundColor Yellow
  Write-Host "           once imported, so a new prefix creates a second variable and orphans the live one." -ForegroundColor Yellow
  $script:warned = $true
}

function Rename-AlmFolder {
  param([string]$Base, [string]$OldName, [string]$NewName, [string]$Label)
  $old = Join-Path $Base $OldName
  $new = Join-Path $Base $NewName
  if ($OldName -eq $NewName) { return }
  if ($Check) {
    if (Test-Path -LiteralPath $old) { $script:drift += "$Label (folder still '$OldName')  ($Base)" }
    # Neither name present is NOT clean: the definition folder vanished (deleted, moved, or past
    # MAX_PATH) while Other/Solution.xml was already re-prefixed, so the definitions would import
    # unlinked from the solution. Invoke-StarterRename already treats this as a real condition;
    # this one used to pass silently.
    elseif (-not (Test-Path -LiteralPath $new)) { $script:drift += "$Label (MISSING: neither '$OldName' nor '$NewName')  ($Base)" }
    return
  }
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
  # BOTH names present. This used to Remove-Item the old folder outright, destroying whatever was
  # in it - including a hand-edited environmentvariabledefinition.xml - with no prompt and no
  # warning. Invoke-StarterRename warns and refuses for the identical collision; match that.
  # Deleting data is never the safe default for an ambiguous state.
  if (Test-Path -LiteralPath $new) {
    Write-Host "  WARNING: $Label - both '$OldName' and '$NewName' exist under" -ForegroundColor Yellow
    Write-Host "           $Base" -ForegroundColor Yellow
    Write-Host "           Refusing to guess. Merge whatever you need out of '$OldName', delete it," -ForegroundColor Yellow
    Write-Host "           then re-run. (Nothing was changed.)" -ForegroundColor Yellow
    $script:warned = $true
    return
  }
  Rename-Item -LiteralPath $old -NewName $NewName
  $script:writes++; Write-Host "  renamed: $Label -> $NewName" -ForegroundColor Green
}

# -- Starter folder renames + the doc pointers that follow them ----------------
# INIT_PROJECT Phase 6 renaming used to be a MANUAL step, and every piece of root tooling addressed the
# starters by their TEMPLATE names - so renaming broke all of it, mostly silently:
#   * this script wrote nothing and -Check reported "No drift" (it found no files to compare),
#   * the pre-commit lint dispatch stopped matching any staged file,
#   * check-doc-boundaries.mjs hard-failed on 21 now-broken links and blocked every commit.
# Renaming and pointer-fixing are therefore one atomic operation owned by this script.
$script:DocFiles = @('CLAUDE.md', 'README.md', 'INIT_PROJECT.md')
$script:renames  = @()

# Resolve a starter to wherever it currently lives: the renamed form once applied, the
# template form before that.
function Get-StarterRoot {
  param([hashtable]$S)
  $t = Join-Path $root $S.Target
  if (Test-Path -LiteralPath $t) { return $t }
  return (Join-Path $root $S.Template)
}

function Invoke-StarterRename {
  param([hashtable]$S)
  if ($S.Template -eq $S.Target) { return }
  $old = Join-Path $root $S.Template
  $new = Join-Path $root $S.Target
  $oldThere = Test-Path -LiteralPath $old
  $newThere = Test-Path -LiteralPath $new
  if ($Check) {
    if ($oldThere) { $script:drift += "$($S.Label) folder still '$($S.Template)' (expected '$($S.Target)')" }
    # Neither name present is NOT "nothing to do" - it means the path was unreadable, almost
    # always MAX_PATH on Windows PowerShell 5.1 (Test-Path returns $false instead of throwing).
    # -Check is the mode the pre-commit hook and /pre-deploy-verify run, so staying silent here
    # would let a truncated or hand-renamed tree pass the gate.
    elseif (-not $newThere) { $script:drift += "$($S.Label) folder: neither '$($S.Template)' nor '$($S.Target)' found (path too long, or renamed by hand?)" }
    return
  }
  if ($DryRun) {
    if ($oldThere) { Write-Host "  WOULD RENAME $($S.Label) -> $($S.Target)" }
    elseif ($newThere) { Write-Host ("  ok:      {0} folder (already '{1}')" -f $S.Label, $S.Target) }
    else { Write-Host "  WARNING: $($S.Label) - neither folder name found (path too long?)" -ForegroundColor Yellow }
    return
  }
  if (-not $oldThere) {
    if ($newThere) { Write-Host ("  ok:      {0} folder (already '{1}')" -f $S.Label, $S.Target) }
    else {
      Write-Host "  WARNING: $($S.Label) - neither '$($S.Template)' nor '$($S.Target)' found under" -ForegroundColor Yellow
      Write-Host "           $root" -ForegroundColor Yellow
      Write-Host "           Nothing renamed. If that path is longer than 260 characters, clone the repo" -ForegroundColor Yellow
      Write-Host "           closer to the drive root (or enable Windows long paths) and re-run." -ForegroundColor Yellow
      $script:warned = $true
    }
    return
  }
  if ($newThere) {
    Write-Host "  WARNING: $($S.Label) - both '$($S.Template)' and '$($S.Target)' exist; not renaming." -ForegroundColor Yellow
    $script:warned = $true
    return
  }
  Rename-Item -LiteralPath $old -NewName $S.Target
  $script:writes++
  Write-Host "  renamed: $($S.Label) -> $($S.Target)" -ForegroundColor Green
}

# Rewrite folder pointers inside markdown LINK TARGETS only - '](...)' and '](<...>)'. Root docs
# URL-encode spaces, so both the raw and the %20 form are rewritten. Prose is left alone
# deliberately: INIT_PROJECT.md names the template folders as instructions, and rewriting those
# would turn the guide into nonsense. The link grammar here matches what
# scripts/check-doc-boundaries.mjs validates, so the rewriter can never miss a link the checker
# will then fail on.
function Invoke-DocPointers {
  if (-not $script:renames.Count) { return }
  foreach ($doc in $script:DocFiles) {
    $p = Join-Path $root $doc
    if (-not (Test-Path -LiteralPath $p)) { continue }
    $orig = Read-Text $p
    $new  = [regex]::Replace($orig, '\]\(\s*(<[^>]*>|[^)\s]*)([^)]*)\)', {
      param($m)
      $t = $m.Groups[1].Value
      $rest = $m.Groups[2].Value
      # Only relative links point at a starter folder. Leave absolute/anchor targets alone - the
      # same set check-doc-boundaries.mjs skips - so a URL that merely contains a starter name is
      # never rewritten.
      if ($t -match '^\s*<?\s*(https?:|mailto:|#)') { return $m.Value }
      foreach ($r in $script:renames) {
        $t = $t.Replace(($r.Template -replace ' ', '%20'), ($r.Target -replace ' ', '%20'))
        $t = $t.Replace($r.Template, $r.Target)
      }
      return '](' + $t + $rest + ')'
    })
    $changed = ($new -ne $orig)
    $lbl = "root doc starter links ($doc)"
    if ($Check)  { if ($changed) { $script:drift += $lbl }; continue }
    if ($DryRun) { Write-Host ("  {0} {1}" -f $(if($changed){'WOULD UPDATE'}else{'ok         '}), $lbl); continue }
    if ($changed) { Write-Text $p $new; $script:writes++; Write-Host "  updated: $lbl" -ForegroundColor Green }
    else { Write-Host "  ok:      $lbl" }
  }
}

# -- Guard: refuse destructive prefix re-map after platform GUIDs were freshened -
function Test-PrefixGuard {
  $markers = Get-ChildItem -Path $root -Recurse -Filter '.guid-freshened' -Force -ErrorAction SilentlyContinue
  if ($markers -and -not $Force -and -not $Check -and -not $DryRun) {
    # Only a concern if a starter still holds the OLD 'sol_' ALM tokens (i.e. a prefix change is pending).
    # Resolved from the starter's CURRENT folder, never a hardcoded template name.
    $envBase = Join-Path $evRoot 'environmentvariabledefinitions'
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

# Resolve every starter to its CURRENT folder before anything reads a starter path. A
# non-activated starter is never renamed, so its Target is its Template.
$starters = @(
  @{ Key='dataverseTables';      Template='SMKB - Dataverse Tables Starter';        Target="SMKB - $solutionName - Dataverse Tables";        Label='Dataverse Tables' },
  @{ Key='environmentVariables'; Template='SMKB - Environmental Variables Starter'; Target="SMKB - $solutionName - Environmental Variables"; Label='Environmental Variables' },
  @{ Key='powerAutomateFlows';   Template='SMKB - Power Automate Flows Starter';    Target="SMKB - $solutionName - Cloud Flows";             Label='Cloud Flows' },
  @{ Key='powerApps';            Template='SMKB - Power Apps Starter';              Target="SMKB - $paComponent - Power App";                Label='Power App' },
  @{ Key='powerPages';           Template='SMKB - Power Pages Code Site Starter';   Target="SMKB - $ppSite - Power Pages Code Site";         Label='Power Pages Code Site' }
)
$byKey = @{}
foreach ($s in $starters) {
  if (-not $cfg.activate.($s.Key)) { $s.Target = $s.Template }
  $s.Current = Get-StarterRoot $s
  $byKey[$s.Key] = $s
  if ($s.Template -ne $s.Target) { $script:renames += $s }
}
$tbRoot = $byKey['dataverseTables'].Current
$evRoot = $byKey['environmentVariables'].Current
$flRoot = $byKey['powerAutomateFlows'].Current
$paRoot = $byKey['powerApps'].Current
$ppRoot = $byKey['powerPages'].Current

Test-PathHeadroom
if ($initialized) { Test-PrefixGuard }

$mode = if ($Check) { 'CHECK (drift)' } elseif ($DryRun) { 'DRY RUN' } else { 'APPLY' }
Write-Host ""
Write-Host "solution.config.json -> starters   [$mode]" -ForegroundColor Cyan
Write-Host ("  solution: {0} ({1})   prefix: {2}   env: {3}" -f $displayName, $uniqueName, $prefix, $targetUrl)
Write-Host ""

# (Starter roots are resolved above via Get-StarterRoot - never hardcoded to a template name,
#  or every write below silently becomes a no-op once Phase 6 renames the folders.)

# Solution.xml identity (UniqueName + solution display name) - the 3 XML starters.
$solXmlPattern = '(<SolutionManifest>\s*<UniqueName>)[^<]*(</UniqueName>\s*<LocalizedNames>\s*<LocalizedName description=")[^"]*(")'
$solXmlRepl    = '${1}' + (EscXml $uniqueName) + '${2}' + (EscXml $displayName) + '${3}'
foreach ($s in @(
    @{ on = $cfg.activate.dataverseTables;       path = (Join-Path $tbRoot 'Other\Solution.xml'); lbl = 'Tables Solution.xml identity' },
    @{ on = $cfg.activate.environmentVariables;  path = (Join-Path $evRoot 'Other\Solution.xml'); lbl = 'EnvVars Solution.xml identity' },
    @{ on = $cfg.activate.powerAutomateFlows;    path = (Join-Path $flRoot 'Other\Solution.xml'); lbl = 'Flows Solution.xml identity' })) {
  if ($s.on) { Invoke-Op -Path $s.path -Pattern $solXmlPattern -Replacement $solXmlRepl -Label $s.lbl }
}

# Power Apps - deploy.config.json + power.config.json (identity only; appId left to pac code init).
if ($cfg.activate.powerApps) {
  $dc = Join-Path $paRoot 'deploy.config.json'
  Invoke-Op -Path $dc -Pattern '("solutionName":\s*)"[^"]*"' -Replacement ('${1}"' + (EscJson $uniqueName) + '"') -Label 'PowerApps deploy.config solutionName'
  Invoke-Op -Path $dc -Pattern '("targetEnv":\s*)"[^"]*"'    -Replacement ('${1}"' + (EscJson $targetUrl)  + '"') -Label 'PowerApps deploy.config targetEnv'
  Invoke-Op -Path $dc -Pattern '("allowedEnvs":\s*)\[[^\]]*\]' -Replacement ('${1}["' + (EscJson $targetUrl) + '"]') -Label 'PowerApps deploy.config allowedEnvs'
  $pc = Join-Path $paRoot 'power.config.json'
  Invoke-Op -Path $pc -Pattern '("appDisplayName":\s*)"[^"]*"' -Replacement ('${1}"' + (EscJson $appDisplay) + '"') -Label 'PowerApps power.config appDisplayName'
  Invoke-Op -Path $pc -Pattern '("environmentId":\s*)"[^"]*"'  -Replacement ('${1}"' + (EscJson $envId)      + '"') -Label 'PowerApps power.config environmentId'
}

# Power Pages - src/config/solution.ts + powerpages.config.json.
if ($cfg.activate.powerPages) {
  $st = Join-Path $ppRoot 'src\config\solution.ts'
  Invoke-Op -Path $st -Pattern "(prefix:\s*)'[^']*'"        -Replacement ("`${1}'" + (EscTs $prefix)  + "'") -Label 'PowerPages solution.ts prefix'
  Invoke-Op -Path $st -Pattern "(siteName:\s*)'[^']*'"      -Replacement ("`${1}'" + (EscTs $ppSite)  + "'") -Label 'PowerPages solution.ts siteName'
  Invoke-Op -Path $st -Pattern "(appName:\s*\{\s*he:\s*)'[^']*'(,\s*en:\s*)'[^']*'" -Replacement ("`${1}'" + (EscTs $ppHe) + "'`${2}'" + (EscTs $ppEn) + "'") -Label 'PowerPages solution.ts appName'
  Invoke-Op -Path $st -Pattern "(documentTitle:\s*)'[^']*'" -Replacement ("`${1}'" + (EscTs $ppTitle) + "'") -Label 'PowerPages solution.ts documentTitle'
  Invoke-Op -Path $st -Pattern "(defaultLanguage:\s*)'[^']*'" -Replacement ("`${1}'" + (EscTs $ppLang) + "'") -Label 'PowerPages solution.ts defaultLanguage'
  # Deploy tooling only (scripts/add-site-to-solution.ps1 reconciles the site's components
  # against this solution on every deploy). The starter cannot learn the name any other way -
  # powerpages.config.json follows a Microsoft schema and must not carry custom keys.
  # NOTE the variable is $uniqueName: PowerShell expands an undefined variable to an empty
  # string, so a typo here would silently write '' and still pass every gate.
  Invoke-Op -Path $st -Pattern "(SOLUTION_UNIQUE_NAME\s*=\s*)'[^']*'" -Replacement ("`${1}'" + (EscTs $uniqueName) + "'") -Label 'PowerPages solution.ts SOLUTION_UNIQUE_NAME'
  $ppc = Join-Path $ppRoot 'powerpages.config.json'
  Invoke-Op -Path $ppc -Pattern '("siteName":\s*)"[^"]*"' -Replacement ('${1}"' + (EscJson $derivedSite) + '"') -Label 'PowerPages powerpages.config siteName'
}

# Shipped env vars - swap the 'sol' segment of every definition this starter ships
# (see $script:shippedEnvVars) to the solution prefix, and rename its folder to match.
if ($cfg.activate.environmentVariables) {
  $evBase = Join-Path $evRoot 'environmentvariabledefinitions'
  foreach ($v in $script:shippedEnvVars) {
    $oldFolder = "smkb_sol_$v"; $newFolder = "smkb_${prefix}_$v"
    $xmlOld = Join-Path (Join-Path $evBase $oldFolder) 'environmentvariabledefinition.xml'
    $xmlNew = Join-Path (Join-Path $evBase $newFolder) 'environmentvariabledefinition.xml'
    if (Test-Path -LiteralPath $xmlOld) { Invoke-AlmToken -Path $xmlOld -Label "EnvVars $oldFolder schema/display" }
    elseif (Test-Path -LiteralPath $xmlNew) { Invoke-AlmToken -Path $xmlNew -Label "EnvVars $newFolder schema/display" }
    Rename-AlmFolder -Base $evBase -OldName $oldFolder -NewName $newFolder -Label "EnvVars folder $oldFolder"
  }
  # Catch a prefix changed after a previous successful apply (neither branch above can see it).
  Test-EnvVarPrefix -Base $evBase
  # The shipped vars are also declared as RootComponents in Solution.xml - keep those
  # schemaNames in lockstep with the folder/schemaname rename above, or the definitions
  # import unlinked from the solution and never reach Stage/Prod.
  Invoke-AlmToken -Path (Join-Path $evRoot 'Other\Solution.xml') -Label 'EnvVars Solution.xml RootComponents'
}
if ($cfg.activate.powerAutomateFlows) {
  $wf = Join-Path $flRoot 'Workflows'
  if (Test-Path -LiteralPath $wf) {
    Get-ChildItem -LiteralPath $wf -Filter '*.json' -File | ForEach-Object {
      Invoke-AlmToken -Path $_.FullName -Label "Flows $($_.Name) env-var refs"
    }
  }
}

# -- Folder renames + doc pointers (LAST) -------------------------------------
# Every content write above addressed each starter at its pre-rename path, so the renames run
# only once all of them are done. The doc pointers follow, in the same run, so the repo is never
# left in the state where the folders moved but the links still point at the old names.
foreach ($s in $script:renames) { Invoke-StarterRename $s }
Invoke-DocPointers

if ($script:renames.Count -and -not $Check -and -not $DryRun) {
  Write-Host ""
  Write-Host "Starter folders were renamed. RESTART Claude Code before continuing:" -ForegroundColor Yellow
  Write-Host "  directory-scoped skills are discovered once per session, so /dvt-*, /env-*, /flow-*," -ForegroundColor Yellow
  Write-Host "  /pa-* and /ppcs-* still resolve to the OLD paths - every relative link inside them" -ForegroundColor Yellow
  Write-Host "  (reference files, READMEs, CLAUDE.md) points into a folder that no longer exists." -ForegroundColor Yellow
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
