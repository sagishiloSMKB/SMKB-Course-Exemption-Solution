<#
.SYNOPSIS
    Runs `pac pages upload-code-site` and FAILS LOUDLY when it does not succeed.

.DESCRIPTION
    pac CLI returns exit code 0 even when the operation failed. This is confirmed for a failed
    solution import, for a rejected --componentType, and it is why `npm run deploy` previously
    called `pac pages upload-code-site` directly: the npm `&&` chain only looks at the exit code,
    so a failed upload would fall straight through to the solution reconcile and the deploy would
    report success having shipped nothing.

    This wrapper captures stdout, treats any error signal in the text as a failure regardless of
    the exit code, and exits 1 so the npm chain stops.

    Scope note - what this does and does not catch:
      * It catches pac printing an error while exiting 0 (the observed failure mode).
      * It does NOT prove the assets actually landed. The only real proof of that is opening the
        site, which /ppcs-deploy asks for. Treat a clean run as "pac reported no error", not as
        "verified deployed".

.PARAMETER RootPath
    Passed through to pac as --rootPath. Defaults to the starter root (the parent of scripts/),
    which is what `npm run deploy` wants regardless of the caller's working directory.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/upload-code-site.ps1
#>
[CmdletBinding()]
param(
    [string]$RootPath
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $RootPath) { $RootPath = Split-Path -Parent $scriptDir }

Write-Host "Uploading code site from: $RootPath" -ForegroundColor Cyan

$lines = & pac pages upload-code-site --rootPath $RootPath 2>&1
$code  = $LASTEXITCODE
$out   = ($lines | Out-String)
$lines | ForEach-Object { Write-Host $_ }

# Failure signals. Deliberately specific: a bare match on "failed" would fire on benign output
# such as a "0 failed" summary, and a guard that cries wolf gets bypassed.
$failed = ($code -ne 0) -or
          ($out -match '(?im)^\s*Error:') -or
          ($out -match '(?i)\bupload failed\b') -or
          ($out -match '(?i)\b(unauthorized|forbidden)\b') -or
          ($out -match '(?i)\bmissing\s+(privilege|permission)') -or
          ($out -match '(?i)\bno\s+active\s+auth')

if ($failed) {
    Write-Host ""
    Write-Host "DEPLOY FAILED -- pac pages upload-code-site did not succeed (pac exit $code)." -ForegroundColor Red
    Write-Host "Do not treat the deploy as complete. Check the output above; confirm the active" -ForegroundColor Yellow
    Write-Host "profile targets the intended environment with 'pac auth list'." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Upload reported no errors." -ForegroundColor Green
exit 0
