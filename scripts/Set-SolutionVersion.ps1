# -----------------------------------------------------------------------------
# Set-SolutionVersion.ps1 -- bump the ONE solution version, before packing.
#
# WHY THIS EXISTS
# Every XML starter (Dataverse Tables, Environmental Variables, Cloud Flows) imports into the
# SAME solution -- they share a <UniqueName> -- but each ships its OWN Other/Solution.xml with a
# hardcoded <Version>, and each deploy.ps1 used to pack and import that file verbatim. So every
# import re-stamped a hardcoded version onto the environment and whichever starter deployed LAST
# won. All three shipped 1.0.0.0, so the deployed version never increased and could go BACKWARDS.
#
# That breaks Power Platform Pipeline promotion, which requires a monotonically increasing
# version -- and it fails at promotion time, long after the deploy that caused it looked fine.
#
# WHAT IT DOES, in order:
#   1. Reads solution.version.json at the repo root (the single source of truth).
#   2. Derives the solution's UniqueName from the Solution.xml it was handed -- so this script is
#      fully generic and no solution name is ever hardcoded.
#   3. Reconciles with the LIVE version in the target environment via 'pac solution list'. If live
#      is higher, live becomes the base. That makes it self-healing: it can never regress below
#      what is already deployed or promoted, even after a manual bump or a pipeline change.
#   4. Increments the 4th segment (revision).
#   5. Writes the new version back to the JSON, and stamps it into the Solution.xml being packed.
#
# Returns (on the success stream) the new version string, and NOTHING else -- every diagnostic goes
# to Write-Host on purpose. A stray Write-Output here would make the caller's
# `$newVersion = & .\Set-SolutionVersion.ps1 ...` an ARRAY, and the version stamped into the zip
# would then be "1.0.0.5 Reading... Bumping..." or similar.
#
# ASCII ONLY. Windows PowerShell 5.1 reads a UTF-8-without-BOM .ps1 as ANSI, so a single em dash
# becomes mojibake at PARSE time and the whole script fails to load. Enforced by
# scripts/check-template-guards.mjs. Use a plain hyphen.
# -----------------------------------------------------------------------------
[CmdletBinding()]
param(
    # The Other\Solution.xml about to be packed. Its <Version> is rewritten in place.
    [Parameter(Mandatory = $true)][string]$SolutionXmlPath,

    # Environment to reconcile against. Optional: omit to use the active PAC profile's org.
    # The starters' deploy.ps1 pass their own $TargetEnv so the check is deterministic rather
    # than dependent on whichever profile happens to be selected.
    [string]$TargetEnv,

    # Print what would happen and change nothing.
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Get-NextVersion {
    param([version]$Base)
    # A 3-segment version parses with Revision = -1; treat that as 0 so the bump yields .1 not .0.
    $rev = if ($Base.Revision -lt 0) { 0 } else { $Base.Revision }
    $bld = if ($Base.Build -lt 0) { 0 } else { $Base.Build }
    return [version]::new($Base.Major, $Base.Minor, $bld, $rev + 1)
}

# --- Locate the pieces -------------------------------------------------------
$repoRoot    = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$versionFile = Join-Path $repoRoot "solution.version.json"

if (-not (Test-Path $SolutionXmlPath)) {
    Write-Host "Set-SolutionVersion: Solution.xml not found at $SolutionXmlPath" -ForegroundColor Red
    exit 1
}

# Read as raw bytes-preserving text. These files ship WITHOUT a BOM and pac is fussy, so the
# write at the end uses UTF8Encoding($false) to keep it that way.
$xmlText = [System.IO.File]::ReadAllText($SolutionXmlPath)

# The solution's UniqueName is the FIRST one in the file; the SECOND belongs to the <Publisher>
# (SKMBCore). Matching greedily or taking the last would reconcile against the publisher name and
# silently find no solution.
$uniqueName = $null
if ($xmlText -match '<UniqueName>([^<]+)</UniqueName>') { $uniqueName = $Matches[1].Trim() }

# --- The recorded version ----------------------------------------------------
$recorded = $null
if (Test-Path $versionFile) {
    try {
        $json = Get-Content $versionFile -Raw | ConvertFrom-Json
        if ($json.version) { $recorded = [version]$json.version }
    } catch {
        Write-Host "Set-SolutionVersion: solution.version.json is unreadable ($($_.Exception.Message))." -ForegroundColor Yellow
    }
}
if (-not $recorded) {
    # No usable JSON (missing, gitignored, corrupt, or a fresh clone). Seed from the HIGHEST
    # <Version> across every starter's Other/Solution.xml - not just the one being packed.
    #
    # Why the max and not this file's own value: after a deploy each starter holds a DIFFERENT
    # version (Tables .1, Env Vars .2, Flows .3, because each bumps in turn). Seeding from the
    # starter that happens to be packing first would start below what the last import actually
    # stamped on the environment, and if pac is unavailable too there would be nothing left to
    # catch it. The glob is deliberately shape-based so it works before and after the Phase 6
    # folder renames.
    $recorded = [version]'1.0.0.0'
    $seedFrom = 'the 1.0.0.0 floor'
    foreach ($xf in @(Get-ChildItem -Path (Join-Path $repoRoot '*\Other\Solution.xml') -ErrorAction SilentlyContinue)) {
        try {
            $t = [System.IO.File]::ReadAllText($xf.FullName)
            if ($t -match '<Version>([^<]*)</Version>') {
                $v = [version]$Matches[1].Trim()
                if ($v -gt $recorded) { $recorded = $v; $seedFrom = $xf.FullName }
            }
        } catch { }
    }
    Write-Host "Set-SolutionVersion: no usable solution.version.json - seeding from $recorded ($seedFrom)" -ForegroundColor Yellow
}

# --- Reconcile with what is actually deployed --------------------------------
# Never trust a pac exit code (CLAUDE.md): parse stdout. And never let this check FAIL the deploy -
# if pac is missing, unauthenticated, or pointed elsewhere, fall back to the recorded version. The
# worst case then is a version that is merely lower than live, which the next successful run heals.
$live = $null
if ($uniqueName -and $uniqueName -ne 'YourSolutionName') {
    $pac = Get-Command pac -ErrorAction SilentlyContinue
    if (-not $pac) {
        Write-Host "Set-SolutionVersion: pac not on PATH - skipping the live-version check." -ForegroundColor Yellow
    } else {
        $listArgs = @('solution', 'list')
        if ($TargetEnv) { $listArgs += @('--environment', $TargetEnv) }
        try {
            $out = @(& pac @listArgs 2>&1)
            foreach ($line in $out) {
                $text = [string]$line
                # Match the unique name as a whole token, then take the first 3- or 4-part version
                # on that same line. pac renders a table whose column order is not guaranteed.
                if ($text -match ("(?i)(^|\s)" + [regex]::Escape($uniqueName) + "(\s|$)")) {
                    if ($text -match '(\d+\.\d+\.\d+(\.\d+)?)') {
                        try {
                            $candidate = [version]$Matches[1]
                            if (-not $live -or $candidate -gt $live) { $live = $candidate }
                        } catch { }
                    }
                }
            }
            if ($live) {
                Write-Host "Set-SolutionVersion: live '$uniqueName' in the target environment is $live" -ForegroundColor DarkGray
            } else {
                Write-Host "Set-SolutionVersion: '$uniqueName' not found in the environment (first deploy?) - using the recorded version." -ForegroundColor DarkGray
            }
        } catch {
            Write-Host "Set-SolutionVersion: 'pac solution list' failed ($($_.Exception.Message)) - using the recorded version." -ForegroundColor Yellow
        }
    }
}

# --- Decide the new version --------------------------------------------------
$base = $recorded
if ($live -and $live -gt $base) {
    Write-Host "Set-SolutionVersion: live $live is ahead of the recorded $recorded - reconciling to live." -ForegroundColor Yellow
    $base = $live
}
$newVersion = Get-NextVersion -Base $base

if ($DryRun) {
    Write-Host ""
    Write-Host "Set-SolutionVersion (DRY RUN) - nothing was written" -ForegroundColor Cyan
    Write-Host "  solution      : $uniqueName"
    Write-Host "  recorded      : $recorded   ($versionFile)"
    Write-Host "  live          : $(if ($live) { $live } else { '(not found / not checked)' })"
    Write-Host "  base          : $base"
    Write-Host "  would become  : $newVersion"
    Write-Output $newVersion.ToString()
    exit 0
}

# --- Write the JSON ----------------------------------------------------------
$defaultDoc = "Auto-managed by scripts/Set-SolutionVersion.ps1 on every deploy. This is the authoritative solution version - the <Version> in each starter's Other/Solution.xml is stamped FROM here at pack time, so its committed value does not matter. Commit this file after a deploy so the number persists; if it is gitignored, every clone resets and the next import can regress. REBUILDING an existing solution? Seed this ABOVE the highest version across Dev/Stage/Prod before the first deploy - check with 'pac solution list'. See CLAUDE.md -> Critical Rule 7."

# Keep a _doc the solution may have reworded, rather than overwriting it on every deploy.
$doc = $defaultDoc
if ($json -and $json._doc) { $doc = [string]$json._doc }

# Hand-built rather than ConvertTo-Json, deliberately. Windows PowerShell 5.1 escapes '<', '>',
# "'" and '&' as \uXXXX - valid JSON, but this file is committed and read by people, and a note
# explaining the <Version> element rendered as "<Version>" is hostile. 5.1 also indents
# with 4 spaces and a double space after the colon, which matches nothing else in the repo. Four
# fields do not justify a dependency on the formatter's mood.
function ConvertTo-JsonScalar {
    param([string]$Value)
    if ($null -eq $Value) { return 'null' }
    $s = $Value.Replace('\', '\\').Replace('"', '\"')
    $s = $s.Replace("`r", '\r').Replace("`n", '\n').Replace("`t", '\t')
    return '"' + $s + '"'
}
$body = @(
    '{',
    ('  "version": '  + (ConvertTo-JsonScalar $newVersion.ToString()) + ','),
    ('  "solution": ' + (ConvertTo-JsonScalar $uniqueName) + ','),
    ('  "updated": '  + (ConvertTo-JsonScalar ((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))) + ','),
    ('  "_doc": '     + (ConvertTo-JsonScalar $doc)),
    '}'
) -join "`n"
[System.IO.File]::WriteAllText($versionFile, $body + "`n", (New-Object System.Text.UTF8Encoding($false)))

# --- Stamp the Solution.xml being packed -------------------------------------
# A -replace that fails to match is indistinguishable from success (CLAUDE.md), so assert first.
if ($xmlText -notmatch '<Version>[^<]*</Version>') {
    Write-Host "Set-SolutionVersion: no <Version> element in $SolutionXmlPath - refusing to guess." -ForegroundColor Red
    exit 1
}
# Replace only the FIRST occurrence: <Version> also appears inside some manifests for other
# purposes, and a blanket replace would rewrite whatever else matched.
$updated = [regex]::Replace($xmlText, '<Version>[^<]*</Version>', "<Version>$($newVersion.ToString())</Version>", 1)
if ($updated -eq $xmlText) {
    Write-Host "Set-SolutionVersion: the <Version> stamp changed nothing - already $newVersion?" -ForegroundColor Yellow
} else {
    [System.IO.File]::WriteAllText($SolutionXmlPath, $updated, (New-Object System.Text.UTF8Encoding($false)))
}

# Prove it landed, rather than trusting the write.
$check = [System.IO.File]::ReadAllText($SolutionXmlPath)
if ($check -notmatch ('<Version>' + [regex]::Escape($newVersion.ToString()) + '</Version>')) {
    Write-Host "Set-SolutionVersion: verification FAILED - $SolutionXmlPath does not hold $newVersion" -ForegroundColor Red
    exit 1
}

Write-Output $newVersion.ToString()

# Explicit, and load-bearing. Falling off the end of a script invoked with `&` leaves
# $LASTEXITCODE at whatever the last native command set - here the 'pac solution list' above,
# whose exit code is deliberately IGNORED per CLAUDE.md. The callers guard on $LASTEXITCODE, so
# without this a perfectly successful bump could abort the deploy with
# "Could not set the solution version".
exit 0
