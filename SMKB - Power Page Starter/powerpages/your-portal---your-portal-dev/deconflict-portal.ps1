<#
.SYNOPSIS
    Detects blank portal default pages that conflict with this portal's pages and
    creates override YAML files to relocate them to non-conflicting URLs.

.DESCRIPTION
    THE PROBLEM
    -----------
    When a new blank portal is created at make.powerpages.microsoft.com, Power Pages
    provisions a default set of pages (Home, Access Denied, Page Not Found, Profile,
    Search) with platform-assigned GUIDs in Dataverse.

    When guid-freshen.ps1 then generates fresh GUIDs and pac pages upload runs, our
    pages are uploaded as ADDITIONAL records — they do NOT overwrite the blank portal's
    pages. Both sets now coexist in Dataverse with the same website ID.

    Power Pages resolves a URL by querying for root pages with matching adx_partialurl
    and picking whichever record has the lexicographically lowest adx_webpageid value.
    If the blank portal's page wins (lower GUID), Power Pages looks for its content page
    in our portal's language — finds none (wrong language ID) — and returns "Page Not Found".

    WHAT THIS SCRIPT DOES
    ---------------------
    1. Downloads the current Dataverse state for this portal via pac pages download
    2. Collects all adx_webpageid values from our local YAML files
    3. Finds root page records in Dataverse whose GUIDs are NOT in our YAML set
       (these are blank portal orphan records)
    4. For each orphan root page and its content pages, creates override YAML files in
       web-pages/ that set adx_partialurl to a non-conflicting value ("z-portal-default-XXXXXXXX")
       and mark the page as hidden from search and sitemap
    5. After running, you must run "pnpm deploy" to upload the overrides to Dataverse

    WHEN TO RUN
    -----------
    Run ONCE after the very first pnpm deploy. Then deploy again.
    Safe to re-run — it overwrites any previously created override files.
    Does NOT modify, delete, or touch any of our own pages.
    Does NOT run pnpm deploy automatically.

.NOTES
    Requires pac CLI to be authenticated to SMKB-Apps-Dev (org229c958d.crm4.dynamics.com).
    This script lives alongside guid-freshen.ps1 in the portal folder.
#>

param()

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot

Write-Host ""
Write-Host "=== deconflict-portal.ps1 ==="
Write-Host "Detecting blank portal orphan page records..."
Write-Host ""

# ── 1. Read website ID from website.yml ────────────────────────────────────────
$websiteYmlPath = Join-Path $scriptDir "website.yml"
if (-not (Test-Path $websiteYmlPath)) {
    Write-Error "website.yml not found at: $websiteYmlPath"
    exit 1
}

$websiteContent = Get-Content $websiteYmlPath -Raw
if ($websiteContent -notmatch 'adx_websiteid:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') {
    Write-Error "adx_websiteid not found in website.yml or still contains TODO. Set it before running this script."
    exit 1
}
$websiteId = $Matches[1]
Write-Host "Website ID:  $websiteId"

# ── 2. Read our published state ID from publishingstate.yml ───────────────────
$publishingStateYmlPath = Join-Path $scriptDir "publishingstate.yml"
$ourPublishedStateId = $null
if (Test-Path $publishingStateYmlPath) {
    $psContent = Get-Content $publishingStateYmlPath -Raw
    # Find the entry with adx_isdefault: true, then extract its GUID
    if ($psContent -match '(?s)adx_isdefault:\s*true.{0,200}?adx_publishingstateid:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') {
        $ourPublishedStateId = $Matches[1]
    } elseif ($psContent -match 'adx_publishingstateid:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') {
        $ourPublishedStateId = $Matches[1]
    }
}
if ($ourPublishedStateId) {
    Write-Host "Published state ID: $ourPublishedStateId"
} else {
    Write-Warning "Could not read published state ID from publishingstate.yml — override files will use each orphan page's own state."
}

# ── 3. Collect all page GUIDs from our local YAML files ───────────────────────
$ourPageIds = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$webPagesDir = Join-Path $scriptDir "web-pages"

Get-ChildItem $webPagesDir -Recurse -Filter "*.webpage.yml" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match 'adx_webpageid:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') {
        [void]$ourPageIds.Add($Matches[1].ToLower())
    }
}
Write-Host "Our known page GUIDs: $($ourPageIds.Count)"
Write-Host ""

# ── 4. Download current portal state from Dataverse ───────────────────────────
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$tempDir = Join-Path $env:TEMP "portal-deconflict-$timestamp"

Write-Host "Downloading current Dataverse portal state..."
Write-Host "(This may take 30-60 seconds)"
Write-Host ""

$pacArgs = @("pages", "download", "--websiteId", $websiteId, "--path", $tempDir, "--modelVersion", "2", "--overwrite")
& pac @pacArgs 2>&1 | ForEach-Object { Write-Host "  $_" }

if ($LASTEXITCODE -ne 0) {
    Write-Error "pac pages download failed (exit code $LASTEXITCODE). Check PAC auth and verify adx_websiteid is correct."
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

# Find the portal subdirectory created by the download
$downloadPortalDir = Get-ChildItem $tempDir -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $downloadPortalDir) {
    Write-Error "Download completed but no subdirectory found in $tempDir. Unexpected pac pages download output format."
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

$downloadWebPagesDir = Join-Path $downloadPortalDir.FullName "web-pages"
if (-not (Test-Path $downloadWebPagesDir)) {
    Write-Error "No web-pages folder in downloaded portal at: $($downloadPortalDir.FullName)"
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "Downloaded portal: $($downloadPortalDir.Name)"

# ── 5. Build a lookup: root page ID → its content pages (from download) ───────
$contentPagesByRootId = @{}
Get-ChildItem $downloadWebPagesDir -Recurse -Filter "*.webpage.yml" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -notmatch 'adx_isroot:\s*false') { return }
    if ($content -notmatch 'adx_rootwebpageid:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') { return }
    $rootId = $Matches[1].ToLower()
    if (-not $contentPagesByRootId.ContainsKey($rootId)) {
        $contentPagesByRootId[$rootId] = [System.Collections.Generic.List[string]]::new()
    }
    $contentPagesByRootId[$rootId].Add($content)
}

# ── 6. Find orphan root pages and create override files ───────────────────────
Write-Host ""
Write-Host "Scanning for orphan root pages (not in our YAML)..."

$overridesCreated = 0
$createdFiles = [System.Collections.Generic.List[string]]::new()

Get-ChildItem $downloadWebPagesDir -Recurse -Filter "*.webpage.yml" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw

    # Only process root pages
    if ($content -notmatch 'adx_isroot:\s*true') { return }

    # Extract this page's GUID
    if ($content -notmatch 'adx_webpageid:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') { return }
    $pageId = $Matches[1].ToLower()

    # Skip if this is one of our own pages
    if ($ourPageIds.Contains($pageId)) { return }

    # This is an orphan from blank portal provisioning
    $currentUrl    = if ($content -match 'adx_partialurl:\s*(.+)')  { $Matches[1].Trim() } else { "(unknown)" }
    $pageName      = if ($content -match 'adx_name:\s*(.+)')        { $Matches[1].Trim() } else { "Unknown" }
    $templateId    = if ($content -match 'adx_pagetemplateid:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') { $Matches[1] } else { "" }
    $stateId       = if ($ourPublishedStateId) { $ourPublishedStateId } `
                     elseif ($content -match 'adx_publishingstateid:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') { $Matches[1] } `
                     else { "" }

    $shortGuid = $pageId.Substring(0, 8)
    $newUrl    = "z-portal-default-$shortGuid"

    Write-Host ""
    Write-Host "  ORPHAN: '$pageName' ($pageId)"
    Write-Host "    Current URL : '$currentUrl'"
    Write-Host "    Override URL: '$newUrl'"

    # Create override folder for this orphan
    $overrideFolder      = Join-Path $webPagesDir "blank-portal-default-$shortGuid"
    $contentPagesFolder  = Join-Path $overrideFolder "content-pages"
    @($overrideFolder, $contentPagesFolder) | ForEach-Object {
        if (-not (Test-Path $_)) { New-Item -ItemType Directory -Path $_ | Out-Null }
    }

    # Build root page override YAML
    $rootLines = [System.Collections.Generic.List[string]]::new()
    $rootLines.Add("adx_displayorder: 999")
    $rootLines.Add("adx_enablerating: false")
    $rootLines.Add("adx_enabletracking: false")
    $rootLines.Add("adx_excludefromsearch: true")
    $rootLines.Add("adx_feedbackpolicy: 756150005")
    $rootLines.Add("adx_hiddenfromsitemap: true")
    $rootLines.Add("adx_isroot: true")
    $rootLines.Add("adx_name: Blank Portal Default ($shortGuid)")
    if ($templateId) { $rootLines.Add("adx_pagetemplateid: $templateId") }
    $rootLines.Add("adx_partialurl: $newUrl")
    if ($stateId) { $rootLines.Add("adx_publishingstateid: $stateId") }
    $rootLines.Add("adx_sharedpageconfiguration: false")
    $rootLines.Add("adx_title: Blank Portal Default")
    $rootLines.Add("adx_webpageid: $pageId")

    $rootYamlPath = Join-Path $overrideFolder "BlankPortalDefault_$shortGuid.webpage.yml"
    Set-Content -Path $rootYamlPath -Value ($rootLines -join "`n") -Encoding UTF8
    $createdFiles.Add($rootYamlPath)

    # Build content page override YAML(s)
    $cpList = if ($contentPagesByRootId.ContainsKey($pageId)) { $contentPagesByRootId[$pageId] } else { @() }
    $cpIndex = 0
    foreach ($cpContent in $cpList) {
        $cpId     = if ($cpContent -match 'adx_webpageid:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') { $Matches[1] } else { continue }
        $cpLangId = if ($cpContent -match 'adx_webpagelanguageid:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') { $Matches[1] } else { "" }

        $cpLines = [System.Collections.Generic.List[string]]::new()
        $cpLines.Add("adx_displayorder: 999")
        $cpLines.Add("adx_enablerating: false")
        $cpLines.Add("adx_enabletracking: false")
        $cpLines.Add("adx_excludefromsearch: true")
        $cpLines.Add("adx_feedbackpolicy: 756150005")
        $cpLines.Add("adx_hiddenfromsitemap: true")
        $cpLines.Add("adx_isroot: false")
        $cpLines.Add("adx_name: Blank Portal Default ($shortGuid)")
        if ($templateId) { $cpLines.Add("adx_pagetemplateid: $templateId") }
        $cpLines.Add("adx_partialurl: $newUrl")
        if ($stateId) { $cpLines.Add("adx_publishingstateid: $stateId") }
        $cpLines.Add("adx_rootwebpageid: $pageId")
        $cpLines.Add("adx_sharedpageconfiguration: false")
        $cpLines.Add("adx_title: Blank Portal Default")
        $cpLines.Add("adx_webpageid: $cpId")
        if ($cpLangId) { $cpLines.Add("adx_webpagelanguageid: $cpLangId") }

        $suffix = if ($cpList.Count -gt 1) { "-$cpIndex" } else { "" }
        $cpYamlPath = Join-Path $contentPagesFolder "BlankPortalDefault_$shortGuid$suffix.en-US.webpage.yml"
        Set-Content -Path $cpYamlPath -Value ($cpLines -join "`n") -Encoding UTF8
        $createdFiles.Add($cpYamlPath)
        Write-Host "    + Content page: $cpId (lang: $cpLangId)"
        $cpIndex++
    }

    $overridesCreated++
}

# ── 7. Cleanup ─────────────────────────────────────────────────────────────────
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue

# ── 8. Summary ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Summary ==="
if ($overridesCreated -eq 0) {
    Write-Host "No orphan pages found. Portal is already clean — no changes made."
    Write-Host ""
} else {
    Write-Host "Created override files for $overridesCreated orphan page(s)."
    Write-Host ""
    Write-Host "Files written:"
    $createdFiles | ForEach-Object { Write-Host "  $_" }
    Write-Host ""
    Write-Host "NEXT STEP: run 'pnpm deploy' from the client/ folder to upload these overrides."
    Write-Host "After upload, the blank portal's default pages will no longer conflict with your pages."
    Write-Host ""
    Write-Host "NOTE: You may commit the generated web-pages/blank-portal-default-* folders."
    Write-Host "They are permanent fixtures — do not delete them."
}
