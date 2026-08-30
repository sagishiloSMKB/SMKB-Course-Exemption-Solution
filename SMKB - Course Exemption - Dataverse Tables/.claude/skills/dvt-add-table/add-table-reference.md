# Add Table — Reference

## The two-token model

The example table ships as two consistent forms. Deriving the new names:

| Form | Example (ships) | New (`prefix=evt`, name=`Session`) | Rule |
|------|-----------------|-------------------------------------|------|
| PascalCase (schema) | `smkb_sol_ExampleTableA` | `smkb_evt_Session` | `smkb_` + prefix (lowercase) + PascalName |
| lowercase (logical) | `smkb_sol_exampletablea` | `smkb_evt_session` | the PascalCase name **fully lowercased**, no underscores added |

Every schema token is a substring of one of these two; a case-sensitive replace of both covers the whole surface:

| Slot in Entity.xml / children | Which form | After replace |
|------|------|------|
| `schemaName="…"`, `<entity Name="…">`, `<Name LocalizedName=… OriginalName="…">` | Pascal | `smkb_evt_Session` |
| `PhysicalName="…Id"` (primary key) | Pascal | `smkb_evt_SessionId` |
| `optionset Name="…_statecode"` / `_statuscode` | Pascal | `smkb_evt_Session_statecode` |
| `<Name>`, `<LogicalName>` (primary key: `…id`) | lower | `smkb_evt_sessionid` |
| `<EntitySetName>` (plural: `…s`) | lower | `smkb_evt_sessions` |
| optionset logical (`…_statecode`) | lower | `smkb_evt_session_statecode` |
| `SavedQueries/*.xml` fetch `entity name=` / `attribute name=` | lower | `smkb_evt_session…` |

> The plural `s` on `<EntitySetName>` and the `Id`/`id` suffix on the primary key are preserved automatically because the replace only touches the base token.

## The rewrite script (run inside the Tables starter folder)

```powershell
$prefix = 'evt'                       # from solution.config.json shortPrefix
$Pascal = 'Session'                   # your PascalName
$new_p  = "smkb_${prefix}_$Pascal"
$new_l  = "smkb_${prefix}_$($Pascal.ToLower())"
$folder = ".\Entities\$new_p"

Copy-Item -Recurse ".\Entities\smkb_sol_ExampleTableA" $folder

$SOURCE_TOKENS = @('smkb_sol_ExampleTableA', 'smkb_sol_exampletablea',
                   'SOL - Example Table As', 'SOL - Example Table A', 'Example Table A')

# CASE-SENSITIVE (-creplace). Pascal first, then lowercase - they never overlap.
$changed = @()
Get-ChildItem $folder -Recurse -File | ForEach-Object {
  # try/catch, NOT bare ReadAllText: on a path over 260 chars Windows PowerShell 5.1 throws a
  # NON-TERMINATING error inside ForEach-Object, so the pipeline continues and the file is
  # silently skipped - read AND write. Measured: in a deep folder only Entity.xml was rewritten
  # and every FormXml/ + SavedQueries/ file kept the old table name, with the script reporting
  # success. Fail loudly instead.
  try   { $t = [System.IO.File]::ReadAllText($_.FullName) }
  catch { throw "Cannot read $($_.FullName): $($_.Exception.Message). If the path is over 260 characters, clone the repo closer to the drive root (e.g. C:\src\<solution>) or enable long paths." }
  $before = $t
  $t = $t -creplace 'smkb_sol_ExampleTableA', $new_p `
          -creplace 'smkb_sol_exampletablea', $new_l `
          -creplace 'SOL - Example Table As', "$($prefix.ToUpper()) - Sessions" `
          -creplace 'SOL - Example Table A',  "$($prefix.ToUpper()) - Session" `
          -creplace 'Example Table A',        'Session'
  if ($t -ne $before) { $changed += $_.Name }
  try   { [System.IO.File]::WriteAllText($_.FullName, $t, (New-Object System.Text.UTF8Encoding($false))) }
  catch { throw "Cannot write $($_.FullName): $($_.Exception.Message)" }
}

# ASSERT: no source token may SURVIVE anywhere in the new table. Wrapped in @() because
# PowerShell unwraps a single-element array, which would make .Count a string length.
$changed = @($changed)
$survivors = @()
foreach ($f in @(Get-ChildItem $folder -Recurse -File)) {
    $t = [System.IO.File]::ReadAllText($f.FullName)
    foreach ($tok in $SOURCE_TOKENS) {
        if ($t -clike "*$tok*") { $survivors += "$($f.Name): $tok" }
    }
}
if ($survivors.Count -gt 0) {
    throw "Token replacement incomplete - these source tokens survived:`n  $($survivors -join "`n  ")"
}
if ($changed -notcontains 'Entity.xml') {
    throw "Entity.xml was not rewritten - check the source tokens match the template you copied."
}
Write-Host "Rewrote $($changed.Count) file(s): $($changed -join ', ')" -ForegroundColor Green
```

> **Why the assertion checks for SURVIVORS rather than counting changed files.** CLAUDE.md is explicit
> that *"a `-replace` that fails to match is indistinguishable from success"* and asks for an assertion.
> Three forms were tried against this template, and only the third works:
>
> | Form | Why it fails |
> |---|---|
> | **Per file — "every file must change"** | `RibbonDiff.xml` ships in every entity folder and legitimately contains **no** table token. Fails on a correct run. |
> | **Per table — "`Entity.xml` changed and ≥2 files changed"** | Passes correctly (this template rewrites `Entity.xml` and one `SavedQueries/` file), but **a mistyped token still passes**: the other four replacements match, so the count is unchanged. Measured — a deliberately corrupted Pascal token reported `PASS - rewrote 2 file(s)`. |
> | **No source token may survive** ✅ | Catches a typo in *any* of the five tokens, catches a partially-applied run, and cannot false-positive on a file that never held a token. |
>
> Measured on this template: `Entity.xml` holds all five tokens; one `SavedQueries/*.xml` holds
> `smkb_sol_exampletablea` and `Example Table A`; the three `FormXml/` files and `RibbonDiff.xml` hold none.
>
> **The `try`/`catch` is not decoration.** `[System.IO.File]::ReadAllText` throws a *non-terminating* error
> inside `ForEach-Object` when a path exceeds 260 characters, so the pipeline continues and that file is
> skipped for both read and write. In a deep clone this produced exactly one rewritten file — `Entity.xml`,
> the only short path — while every `FormXml/` and `SavedQueries/` file kept the old table name and the
> script reported success. That is the same 260-character trap `apply-config.ps1` warns about. Without both
> the try/catch and the survivor check, the failure is invisible until the table is deployed.

> Adjust the `SOL - Example Table A…` display replacements to your real singular/plural human names.
> Use ASCII ` - ` (hyphen) — never a Unicode en-dash (garbles on Hebrew-locale Windows).
>
> **The third, unprefixed `-creplace` is not redundant.** The primary-key attribute carries a bare
> display name — `<displayname description="Example Table A" …>` — with no `SOL - ` prefix. Without
> that line the new table's PK column ships displaying "Example Table A" in every form and view, and
> nothing catches it: the deploy guard scans for schema tokens, not human strings. Run it **after**
> the two prefixed replacements so those are consumed first.

## Fresh GUIDs (only when cloning to a NEW table)

Each `FormXml/*.xml` and `SavedQueries/*.xml` has a GUID in **both** its filename and its body. Replace
each old GUID with a fresh one, content-first then rename (same two-pass order `guid-freshen.ps1` uses):

```powershell
$map = @{}
Get-ChildItem $folder -Recurse -File -Include *.xml | ForEach-Object {
  if ($_.Name -match '([0-9a-fA-F-]{36})') { $map[$Matches[1]] = [guid]::NewGuid().ToString().ToLower() }
}
# Pass 1: content
Get-ChildItem $folder -Recurse -File -Include *.xml | ForEach-Object {
  $t = [System.IO.File]::ReadAllText($_.FullName)
  foreach ($k in $map.Keys) { $t = $t -ireplace [regex]::Escape($k), $map[$k] }
  [System.IO.File]::WriteAllText($_.FullName, $t, (New-Object System.Text.UTF8Encoding($false)))
}
# Pass 2: filenames
Get-ChildItem $folder -Recurse -File -Include *.xml | ForEach-Object {
  $n = $_.Name; foreach ($k in $map.Keys) { $n = $n -ireplace [regex]::Escape($k), $map[$k] }
  if ($n -ne $_.Name) { Rename-Item $_.FullName $n }
}
```

## RootComponent (Other/Solution.xml)

```xml
<RootComponent type="1" schemaName="smkb_evt_Session" behavior="0" />
```

One per table. Without it the table imports to Dataverse but is not linked to the solution — it never
travels through the pipeline to Stage/Prod.

## Column authoring pointers

- Types: `nvarchar` (Text, set `MaxLength`/`Length`), `ntext` (Multiline — **not** `memo`), `int`,
  `decimal`, `datetime` (set `Format`/`Behavior`), `bit` (Yes/No), `lookup` (set `LookupTypes`),
  `picklist` (Choice, include `<optionset>`), `money`.
- Shared columns `smkb_name` / `smkb_description` keep the **bare** publisher prefix (no solution segment).
- Cross-table lookups + relationships are a separate step — use `/dvt-add-lookup`.
