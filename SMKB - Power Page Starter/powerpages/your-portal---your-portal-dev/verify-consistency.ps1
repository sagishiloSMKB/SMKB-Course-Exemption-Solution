# verify-consistency.ps1
#
# Run after guid-freshen.ps1 and before pnpm deploy.
# Validates that the portal YAML is internally consistent:
#   1. adx_websiteid is set (not TODO)
#   2. No starter-kit sentinel GUIDs remain (guid-freshen.ps1 has been run)
#   3. Every content page's adx_rootwebpageid matches a root page in this portal
#   4. Every weblink adx_pageid resolves to a root page in this portal
#   5. Every web-file adx_parentpageid resolves to a root page in this portal
#
# USAGE:
#   powershell -ExecutionPolicy Bypass -File verify-consistency.ps1

param()

$portalDir = $PSScriptRoot
$errorCount = 0

function Fail([string]$msg) {
    Write-Host "  FAIL: $msg" -ForegroundColor Red
    $script:errorCount++
}

function Pass([string]$msg) {
    Write-Host "  PASS: $msg" -ForegroundColor Green
}

$guidRegex = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

Write-Host ""
Write-Host "=== Power Pages Portal Consistency Check ==="
Write-Host ""

# ---- Check 1: adx_websiteid is set ----
Write-Host "[1/4] Checking adx_websiteid..."
$websiteYmlPath = Join-Path $portalDir "website.yml"
if (Test-Path $websiteYmlPath) {
    $websiteContent = Get-Content $websiteYmlPath -Raw -Encoding UTF8
    if ($websiteContent -match 'TODO') {
        Fail "website.yml adx_websiteid still contains a TODO placeholder"
    } else {
        Pass "adx_websiteid is set"
    }
} else {
    Fail "website.yml not found"
}

# ---- Check 2: No starter-kit sentinel GUIDs remain ----
Write-Host ""
Write-Host "[2/4] Checking for starter-kit sentinel GUIDs..."
$sentinelGuids = @{
    'a3f1bd7e-2958-45af-90ce-e9d951422a3d' = 'starter Home page root'
    '4fc2abf8-23fa-4b2a-8f07-9a5f9e123eab' = 'starter SMKB App page template'
    '53cba0bc-bcc7-4b58-ae2b-6fd5b61973d9' = 'starter SMKB App web template'
}
$allFiles = Get-ChildItem $portalDir -Recurse -Include "*.yml" -File -ErrorAction SilentlyContinue
$sentinelFound = $false
foreach ($file in $allFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    foreach ($sg in $sentinelGuids.Keys) {
        if ($content -match [regex]::Escape($sg)) {
            Fail "Sentinel GUID '$sg' ($($sentinelGuids[$sg])) still present in $($file.Name) -- run guid-freshen.ps1 first"
            $sentinelFound = $true
        }
    }
}
if (-not $sentinelFound) {
    Pass "No starter-kit sentinel GUIDs found"
}

# ---- Check 3: Content page rootwebpageid integrity ----
Write-Host ""
Write-Host "[3/4] Checking content page adx_rootwebpageid references..."
$rootPageGuids = @{}
$webPagesDir = Join-Path $portalDir "web-pages"
if (Test-Path $webPagesDir) {
    foreach ($pageDir in Get-ChildItem $webPagesDir -Directory -ErrorAction SilentlyContinue) {
        $rootYmls = Get-ChildItem $pageDir.FullName -Filter "*.webpage.yml" -File -ErrorAction SilentlyContinue |
                    Where-Object { $_.Name -notmatch 'content-pages' }
        foreach ($rootYml in $rootYmls) {
            $c = Get-Content $rootYml.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
            if ($c -match "adx_webpageid:\s*($guidRegex)") {
                $rootPageGuids[$Matches[1].ToLower()] = $pageDir.Name
            }
        }
        $contentDir = Join-Path $pageDir.FullName "content-pages"
        if (Test-Path $contentDir) {
            foreach ($contentYml in Get-ChildItem $contentDir -Filter "*.webpage.yml" -ErrorAction SilentlyContinue) {
                $c = Get-Content $contentYml.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
                if ($c -match "adx_rootwebpageid:\s*($guidRegex)") {
                    $ref = $Matches[1].ToLower()
                    if (-not $rootPageGuids.ContainsKey($ref)) {
                        Fail "Content page '$($contentYml.Name)' has adx_rootwebpageid '$ref' that does not match any root page in this portal"
                    }
                }
            }
        }
    }
    if ($errorCount -eq 0) {
        Pass "$($rootPageGuids.Count) root page(s) found, all content page references valid"
    }
} else {
    Write-Host "  SKIP: web-pages directory not found"
}

# ---- Check 4: Weblink adx_pageid references ----
Write-Host ""
Write-Host "[4/5] Checking weblink adx_pageid references..."
$weblinkFiles = Get-ChildItem $portalDir -Recurse -Filter "*.weblink.yml" -ErrorAction SilentlyContinue
$weblinkErrors = 0
foreach ($wl in $weblinkFiles) {
    $wlContent = Get-Content $wl.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if (-not $wlContent) { continue }
    if ($wlContent -match "adx_pageid:\s*($guidRegex)") {
        $ref = $Matches[1].ToLower()
        if (-not $rootPageGuids.ContainsKey($ref)) {
            Fail "Weblink '$($wl.Name)' has adx_pageid '$ref' that does not resolve to any root page in this portal"
            $weblinkErrors++
        }
    }
}
if ($weblinkErrors -eq 0) {
    Pass "All weblink adx_pageid references resolve"
}

# ---- Check 5: Web-file adx_parentpageid references ----
Write-Host ""
Write-Host "[5/5] Checking web-file adx_parentpageid references..."
$webfileFiles = Get-ChildItem $portalDir -Recurse -Filter "*.webfile.yml" -ErrorAction SilentlyContinue
$webfileErrors = 0
foreach ($wf in $webfileFiles) {
    $wfContent = Get-Content $wf.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if (-not $wfContent) { continue }
    if ($wfContent -match "adx_parentpageid:\s*($guidRegex)") {
        $ref = $Matches[1].ToLower()
        if (-not $rootPageGuids.ContainsKey($ref)) {
            Fail "Web-file '$($wf.Name)' has adx_parentpageid '$ref' that does not resolve to any root page -- the smkb container page may be missing from web-pages/"
            $webfileErrors++
        }
    }
}
if ($webfileErrors -eq 0) {
    Pass "All web-file adx_parentpageid references resolve"
}

# ---- Summary ----
Write-Host ""
Write-Host "============================================"
if ($errorCount -eq 0) {
    Write-Host "All checks passed. Portal YAML is consistent." -ForegroundColor Green
} else {
    Write-Host "$errorCount error(s) found. Fix before deploying." -ForegroundColor Red
    exit 1
}
