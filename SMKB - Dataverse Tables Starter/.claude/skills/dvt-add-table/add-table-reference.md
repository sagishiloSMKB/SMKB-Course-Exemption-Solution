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

# CASE-SENSITIVE (-creplace). Pascal first, then lowercase — they never overlap.
Get-ChildItem $folder -Recurse -File | ForEach-Object {
  $t = [System.IO.File]::ReadAllText($_.FullName)
  $t = $t -creplace 'smkb_sol_ExampleTableA', $new_p `
          -creplace 'smkb_sol_exampletablea', $new_l `
          -creplace 'SOL - Example Table As', "$($prefix.ToUpper()) - Sessions" `
          -creplace 'SOL - Example Table A',  "$($prefix.ToUpper()) - Session"
  [System.IO.File]::WriteAllText($_.FullName, $t, (New-Object System.Text.UTF8Encoding($false)))
}
```

> Adjust the two `SOL - Example Table A…` display replacements to your real singular/plural human names.
> Use ASCII ` - ` (hyphen) — never a Unicode en-dash (garbles on Hebrew-locale Windows).

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
