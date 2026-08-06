# vendor-design-ui.ps1
# Fetches the private @smkbacil/design-ui package from npm and vendors the as-published
# tarball into every consumer, so the solution repo installs and builds with NO credential.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/vendor-design-ui.ps1 -Check
#   powershell -ExecutionPolicy Bypass -File scripts/vendor-design-ui.ps1                 # re-fetch the vendored version
#   powershell -ExecutionPolicy Bypass -File scripts/vendor-design-ui.ps1 -Version 0.17.0 # upgrade
#   powershell -ExecutionPolicy Bypass -File scripts/vendor-design-ui.ps1 -Version 0.17.0 -SkipInstall
#
# WHY THIS EXISTS
# ===============
# @smkbacil/design-ui is a PRIVATE npm package. If a solution depends on it by version, then
# every `npm install` -- local, CI, every new machine, forever -- needs a live NPM_TOKEN. One
# expired org-wide token then turns every consuming repo red at once, even though the DEPLOYED
# site never touches the token (the library is compiled into assets/*.js at build time).
#
# So the token becomes a development-time concern only: this script is the single place it is
# used. It commits the tarball; from then on `npm install` resolves it from disk with no auth.
#
# THIS SCRIPT IS NEVER CALLED BY CI. CI asserts the opposite -- that no consumer depends on the
# registry (see .github/workflows/ci.yml and scripts/check-template-guards.mjs).
#
# WHY A TARBALL AND NOT AN UNPACKED FOLDER
# ========================================
# Two independent reasons, both of which bite silently:
#  1. The root .gitignore has an UNANCHORED `dist/`, so it matches at any depth -- and this
#     package ships all of its code in dist/. Committing an unpacked copy commits package.json
#     and README.md and drops every build artifact. `git add` reports nothing, CI installs a
#     shell package, and the build dies later on missing exports.
#  2. `file:` at a directory is symlinked (npm) / linked (pnpm): no lifecycle scripts run and no
#     integrity hash is recorded. `file:` at a .tgz is extracted like a real package, runs its
#     postinstall, and records an integrity hash of the local file.
# A tarball is also opaque to ESLint, which lints **/*.{ts,tsx,vue} and does not ignore vendor/.
#
# The tarball is stored EXACTLY as published -- never repacked. `npm pack <pkg>@<version>`
# returns the byte-identical registry artifact, so its sha512 can be checked against what the
# registry itself reports. Repacking to strip sourcemaps would save ~200 KB and forfeit that.

param(
  [string]$Version,
  [switch]$Check,
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$PKG = '@smkbacil/design-ui'

# ---------------------------------------------------------------------------------------------
# Run npm/pnpm and return { Out, Code }.
#
# WHY THIS WRAPPER EXISTS: with $ErrorActionPreference = 'Stop', PowerShell turns ANY stderr
# output from a native executable into a terminating NativeCommandError -- even when the command
# succeeded. npm writes `npm notice ...` to stderr routinely, so `npm pack` killed this script
# with a stack trace about node.exe while the exit code was 0. `npm whoami` and `npm view` happen
# to print nothing on success, which is why the failure only appeared at the third call.
#
# So: neutralise the preference for the duration of the call, and gate on $LASTEXITCODE instead,
# which is the only reliable signal here anyway.
# ---------------------------------------------------------------------------------------------
function Invoke-Npm {
  param([string]$Exe = 'npm', [string[]]$Arguments)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $out  = (& $Exe @Arguments 2>&1 | Out-String)
    $code = $LASTEXITCODE
    return [pscustomobject]@{ Out = $out; Code = $code }
  } finally { $ErrorActionPreference = $prev }
}

# ---------------------------------------------------------------------------------------------
# Resolve consumers. Starter folders are RENAMED by apply-config.ps1 at Init Project Phase 6,
# so address them by type suffix and fall back to the template name -- the same resolver
# check-doc-boundaries.mjs uses. Addressing only the template name would make this script
# silently no-op on every real solution.
# ---------------------------------------------------------------------------------------------
function Resolve-Consumer {
  param([string]$TemplateName, [string]$TypeSuffix)
  if ($TypeSuffix) {
    $hits = @(Get-ChildItem -LiteralPath $repoRoot -Directory -ErrorAction SilentlyContinue |
              Where-Object { $_.Name -like 'SMKB - *' -and $_.Name -like "* - $TypeSuffix" } |
              Sort-Object Name)
    if ($hits.Count) { return $hits[0].Name }
  }
  return $TemplateName
}

$consumers = @(
  [pscustomobject]@{
    Name = Resolve-Consumer 'SMKB - Power Apps Starter' 'Power App'
    Pm   = 'pnpm'
  }
  [pscustomobject]@{
    Name = Resolve-Consumer 'SMKB - Power Pages Code Site Starter' 'Power Pages Code Site'
    Pm   = 'npm'
  }
  # Deleted at Init Project Phase 3.2, so it never reaches a solution repo -- but `init
  # onboarding` is the FIRST thing a new developer runs, so vendoring it means a brand-new
  # machine needs no credential at all.
  [pscustomobject]@{
    Name = 'onboarding SMKB Apps Development'
    Pm   = 'pnpm'
  }
)

$present = @($consumers | Where-Object { Test-Path -LiteralPath (Join-Path $repoRoot "$($_.Name)\package.json") })
if (-not $present.Count) {
  Write-Host "No consumer with a package.json found under $repoRoot." -ForegroundColor Red
  exit 1
}

$specPattern = '("' + [regex]::Escape($PKG) + '"\s*:\s*)"([^"]*)"'

function Get-Spec {
  param([string]$PkgJsonPath)
  $text = [System.IO.File]::ReadAllText($PkgJsonPath)
  $m = [regex]::Match($text, $specPattern)
  if (-not $m.Success) { return $null }
  return $m.Groups[2].Value
}

# ---------------------------------------------------------------------------------------------
# -Check : read-only audit. Needs no token.
# ---------------------------------------------------------------------------------------------
if ($Check) {
  Write-Host ""
  Write-Host "Vendored $PKG status:" -ForegroundColor Cyan
  $bad = 0
  foreach ($c in $present) {
    $pj   = Join-Path $repoRoot "$($c.Name)\package.json"
    $spec = Get-Spec $pj
    if (-not $spec) {
      Write-Host ("  {0,-46} no {1} dependency" -f $c.Name, $PKG)
      continue
    }
    if ($spec -notlike 'file:*') {
      Write-Host ("  {0,-46} REGISTRY SPEC '{1}' - needs a token to install" -f $c.Name, $spec) -ForegroundColor Red
      $bad++
      continue
    }
    $rel = $spec.Substring(5)
    $tgz = Join-Path $repoRoot "$($c.Name)\$rel"
    if (Test-Path -LiteralPath $tgz) {
      $kb = [math]::Round((Get-Item -LiteralPath $tgz).Length / 1KB)
      Write-Host ("  {0,-46} {1}  ({2} KB)" -f $c.Name, $rel, $kb) -ForegroundColor Green
    } else {
      Write-Host ("  {0,-46} MISSING TARBALL {1}" -f $c.Name, $rel) -ForegroundColor Red
      $bad++
    }
  }
  Write-Host ""
  if ($bad) {
    Write-Host "$bad consumer(s) cannot install without a credential." -ForegroundColor Red
    Write-Host "Run this script with -Version <x.y.z> (needs NPM_TOKEN) to vendor the package." -ForegroundColor Yellow
    exit 1
  }
  Write-Host "All consumers resolve $PKG from a committed tarball - no credential required." -ForegroundColor Green
  exit 0
}

# ---------------------------------------------------------------------------------------------
# Decide the version: explicit -Version, else re-fetch whatever is already vendored.
# ---------------------------------------------------------------------------------------------
if (-not $Version) {
  foreach ($c in $present) {
    $spec = Get-Spec (Join-Path $repoRoot "$($c.Name)\package.json")
    if ($spec -and $spec -match 'design-ui-([0-9]+\.[0-9]+\.[0-9]+[^./\\]*)\.tgz$') { $Version = $Matches[1]; break }
    if ($spec -and $spec -notlike 'file:*') { $Version = ($spec -replace '^[^0-9]*', ''); break }
  }
}
if (-not $Version) {
  Write-Host "Could not determine a version. Pass -Version <x.y.z>." -ForegroundColor Red
  exit 1
}
Write-Host ""
Write-Host "Vendoring $PKG@$Version" -ForegroundColor Cyan

# ---------------------------------------------------------------------------------------------
# Credential. Verify the CREDENTIAL, not the variable: a warm npm cache serves an install
# indefinitely after the token dies, which is how one initialization twice concluded the token
# was fine while CI -- which has no cache -- failed on every consumer. `npm whoami` is the check.
# ---------------------------------------------------------------------------------------------
if (-not $env:NPM_TOKEN) {
  Write-Host ""
  Write-Host "NPM_TOKEN is not set. This is the one step that needs it." -ForegroundColor Red
  Write-Host '  $env:NPM_TOKEN = "npm_xxx"    # a token with READ access to the @smkbacil scope' -ForegroundColor Yellow
  Write-Host "Everything else in this repo installs and builds without a credential." -ForegroundColor Yellow
  exit 1
}

$cfg = Join-Path ([System.IO.Path]::GetTempPath()) ("npmrc-vendor-" + [System.Guid]::NewGuid().ToString('N'))
# A throwaway userconfig rather than writing the developer's ~/.npmrc.
Set-Content -LiteralPath $cfg -Value "//registry.npmjs.org/:_authToken=$($env:NPM_TOKEN)" -Encoding ASCII

try {
  $r = Invoke-Npm -Arguments @('whoami', '--userconfig', $cfg)
  $who = $r.Out.Trim()
  if ($r.Code -ne 0) {
    Write-Host ""
    Write-Host "The registry rejected NPM_TOKEN (expired or revoked)." -ForegroundColor Red
    Write-Host "It is an ORG-WIDE credential: if it has expired, mint a new one once." -ForegroundColor Yellow
    exit 1
  }
  Write-Host "  credential OK (npm whoami: $who)"

  # The registry's own integrity for this exact version -- the value we verify the download against.
  $r = Invoke-Npm -Arguments @('view', "$PKG@$Version", 'dist.integrity', '--userconfig', $cfg)
  $wantIntegrity = ($r.Out -split "`n" | Where-Object { $_ -match 'sha512-' } | Select-Object -First 1)
  if ($wantIntegrity) { $wantIntegrity = $wantIntegrity.Trim() } else { $wantIntegrity = '' }
  if ($r.Code -ne 0 -or -not $wantIntegrity.StartsWith('sha512-')) {
    Write-Host ""
    Write-Host "Could not read the registry integrity for $PKG@$Version." -ForegroundColor Red
    Write-Host $r.Out -ForegroundColor Yellow
    exit 1
  }
  Write-Host "  registry integrity: $wantIntegrity"

  # Pack once into a temp dir, verify, then copy to each consumer.
  $stage = Join-Path ([System.IO.Path]::GetTempPath()) ("vendor-design-ui-" + [System.Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $stage -Force | Out-Null

  $r = Invoke-Npm -Arguments @('pack', "$PKG@$Version", '--pack-destination', $stage, '--userconfig', $cfg)
  if ($r.Code -ne 0) {
    Write-Host ""
    Write-Host "npm pack failed:" -ForegroundColor Red
    Write-Host $r.Out -ForegroundColor Yellow
    exit 1
  }
  # Wrap in @( ) -- PowerShell unwraps a single-element array on return, and $files[0] would
  # then index the first CHARACTER of the path.
  $files = @(Get-ChildItem -LiteralPath $stage -Filter '*.tgz' -File)
  if ($files.Count -ne 1) {
    Write-Host "Expected exactly one tarball in $stage, found $($files.Count)." -ForegroundColor Red
    exit 1
  }
  $tgz     = $files[0]
  $tgzName = $tgz.Name

  $sha = [System.Security.Cryptography.SHA512]::Create()
  try   { $hash = 'sha512-' + [Convert]::ToBase64String($sha.ComputeHash([System.IO.File]::ReadAllBytes($tgz.FullName))) }
  finally { $sha.Dispose() }

  if ($hash -ne $wantIntegrity) {
    Write-Host ""
    Write-Host "INTEGRITY MISMATCH - refusing to vendor this file." -ForegroundColor Red
    Write-Host "  registry: $wantIntegrity" -ForegroundColor Yellow
    Write-Host "  packed  : $hash" -ForegroundColor Yellow
    exit 1
  }
  Write-Host "  integrity verified: the tarball is byte-identical to the published artifact"
  Write-Host ""

  foreach ($c in $present) {
    $dir     = Join-Path $repoRoot $c.Name
    $pj      = Join-Path $dir 'package.json'
    $vendor  = Join-Path $dir 'vendor'
    $oldSpec = Get-Spec $pj
    if (-not $oldSpec) { Write-Host ("  skip:    {0} (no {1} dependency)" -f $c.Name, $PKG); continue }

    New-Item -ItemType Directory -Path $vendor -Force | Out-Null

    # Remove superseded tarballs so a stale version cannot linger next to the new one.
    foreach ($old in @(Get-ChildItem -LiteralPath $vendor -Filter '*.tgz' -File -ErrorAction SilentlyContinue)) {
      if ($old.Name -ne $tgzName) { Remove-Item -LiteralPath $old.FullName -Force }
    }
    Copy-Item -LiteralPath $tgz.FullName -Destination (Join-Path $vendor $tgzName) -Force

    # Targeted replace, then ASSERT it took. A -replace that fails to match is otherwise
    # indistinguishable from success.
    $newSpec = "file:vendor/$tgzName"
    $text    = [System.IO.File]::ReadAllText($pj)
    $updated = [regex]::Replace($text, $specPattern, ('${1}"' + $newSpec + '"'))
    if ($updated -eq $text -and $oldSpec -ne $newSpec) {
      Write-Host "  FAILED to rewrite the dependency spec in $pj" -ForegroundColor Red
      exit 1
    }
    if ($updated -ne $text) { [System.IO.File]::WriteAllText($pj, $updated) }
    Write-Host ("  updated: {0}" -f $c.Name) -ForegroundColor Green
    Write-Host ("           {0}  ->  {1}" -f $oldSpec, $newSpec)
  }

  Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
}
finally {
  Remove-Item -LiteralPath $cfg -Force -ErrorAction SilentlyContinue
}

# ---------------------------------------------------------------------------------------------
# Lockfiles. A `file:` spec changes the `resolved`/`version` entry, so a stale lockfile is a hard
# CI failure under a frozen install. Regenerate with each consumer's OWN package manager.
# ---------------------------------------------------------------------------------------------
Write-Host ""
if ($SkipInstall) {
  Write-Host "-SkipInstall: lockfiles NOT regenerated. Run the install in each consumer before committing," -ForegroundColor Yellow
  Write-Host "or a frozen install will fail on the stale entry." -ForegroundColor Yellow
} else {
  foreach ($c in $present) {
    $dir = Join-Path $repoRoot $c.Name
    if (-not (Get-Spec (Join-Path $dir 'package.json'))) { continue }
    Write-Host "Regenerating the lockfile in $($c.Name) ($($c.Pm)) ..." -ForegroundColor Cyan
    Push-Location $dir
    try {
      if ($c.Pm -eq 'pnpm') { $r = Invoke-Npm -Exe 'pnpm' -Arguments @('install') }
      else                    { $r = Invoke-Npm -Arguments @('install', '--no-audit', '--no-fund') }
      Write-Host $r.Out
      if ($r.Code -ne 0) {
        Write-Host "  install FAILED in $($c.Name) - fix it before committing." -ForegroundColor Red
      } else {
        Write-Host "  ok: $($c.Name)" -ForegroundColor Green
      }
    } finally { Pop-Location }
  }
}

Write-Host ""
Write-Host "Done. Next:" -ForegroundColor Cyan
Write-Host "  1. powershell -ExecutionPolicy Bypass -File scripts/vendor-design-ui.ps1 -Check"
Write-Host "  2. Commit the vendor/*.tgz, package.json and lockfile changes together."
Write-Host "  3. Prove it: in a consumer, delete node_modules, clear NPM_TOKEN, install, lint, test, build."
Write-Host ""
