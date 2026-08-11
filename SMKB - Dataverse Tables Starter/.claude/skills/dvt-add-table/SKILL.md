---
name: Dataverse Tables — Add Table
description: >-
  Scaffolds a new Dataverse table by cloning an example entity and rewriting its
  schema tokens with the correct dual case (PascalCase schema names, lowercase
  logical names), fresh GUIDs, PREFIX - Name display, and a type=1 RootComponent.
when_to_use: >-
  User says "add a table", "new Dataverse table", "create an entity", "add a
  table for X", or wants a new custom table in the Tables starter.
argument-hint: "<PascalName> \"<Human Display Name>\""
arguments: [pascal-name, display-name]
allowed-tools: Read Edit Write Grep Bash(powershell *) Bash(git mv *)
---

## Context

Adding a Dataverse table by hand is the single most error-prone edit in this kit, because one table
name expands into **two case forms** across `Entity.xml`, `FormXml/*`, and `SavedQueries/*`:

- **PascalCase** (case preserved): `schemaName`, `PhysicalName`, `<entity Name=>`, `<Name LocalizedName …>`, `optionset Name=`.
- **lowercase** (Dataverse forces it): `<LogicalName>`, `<EntitySetName>`, the primary-key id, optionset logical names, and the `SavedQueries` fetchxml entity/attribute.

The starter's example tables already ship in exactly this shape — `smkb_sol_ExampleTableA` (PascalCase)
and `smkb_sol_exampletablea` (lowercase) — so adding a table is a **clean two-token, case-sensitive**
replace. The traps this skill avoids: PowerShell's default `-replace` is **case-insensitive** and would
flatten both forms into one (breaking the import); reused form/view **GUIDs** cause "Cannot insert
duplicate key"; a missing `<RootComponent type="1">` means the table imports but never travels the
pipeline. Naming rule: `smkb_<prefix>_<PascalName>` / display `PREFIX - Name` — root
[CLAUDE.md](../../../../CLAUDE.md) Critical Rule 3. Full token map + scripts:
[add-table-reference.md](add-table-reference.md).

## Steps

### 1 — Resolve names
1. Read `shortPrefix` from the root [`solution.config.json`](../../../../solution.config.json). If it is
   still `sol`, **stop** and tell the user to run `/solution-config` (or set the prefix) first — a table
   named `smkb_sol_…` trips the deploy guard.
2. From `$pascal-name`, derive the four tokens (see reference for the rule):
   - schema (PascalCase): `smkb_<prefix>_<PascalName>`
   - logical (lowercase): `smkb_<prefix>_<pascalname-lowercased>`
   - display: `<PREFIX_UPPER> - <Human Display Name>` (singular) and its plural for the collection name.

### 2 — Clone an existing entity
3. Copy an existing entity folder to the new folder name. **Prefer a real table the solution already has;
   the shipped example is only the first-time source.** The example entities are deleted at the cleanup audit
   — and they must be, because the deploy guard blocks on their placeholder segment and on their display name
   — so a skill that can only clone the example stops working the moment the solution is tidy. Every entity
   folder has the same shape (`Entity.xml`, `FormXml/{main,quick,card}`, `SavedQueries/`, `RibbonDiff.xml`),
   so cloning a real one is equivalent and usually closer to what you want:
   ```powershell
   # What is available to clone from:
   Get-ChildItem ".\Entities" -Directory | Select-Object -ExpandProperty Name
   ```
   ```powershell
   # Clone the nearest real sibling:
   Copy-Item -Recurse ".\Entities\<an existing entity>" ".\Entities\smkb_<prefix>_<PascalName>"
   ```
   Only if this is the solution's **first** table and the examples are still present, clone the parent
   example (use `_B` only for a second table):
   ```powershell
   Copy-Item -Recurse ".\Entities\smkb_sol_ExampleTableA" ".\Entities\smkb_<prefix>_<PascalName>"
   ```
   Cloning a real table has one extra consequence, handled in step 5 either way: its GUIDs are already live
   in Dataverse, so they must be freshened exactly as the example's sentinels are.

### 3 — Rewrite the tokens (CASE-SENSITIVE — use -creplace)
4. Run the two-token replace over the new folder, **PascalCase then lowercase**, with `-creplace`
   (case-sensitive) so the two forms never collide. Then the display strings. The exact script is in
   [add-table-reference.md](add-table-reference.md) — do not use a case-insensitive `-replace`.

### 4 — Fresh GUIDs (new table only)
5. The copied `FormXml/*.xml` and `SavedQueries/*.xml` carry the **source table's** GUIDs (filename **and**
   internal `id`/`formid`/`savedqueryid`) — the example's shipped sentinels if you cloned the example, or a
   real table's live GUIDs if you cloned a sibling. Either way they must not be reused: generate a fresh
   `[System.Guid]::NewGuid()` for each and replace it in both the filename and the file body (script in the
   reference). Reused GUIDs → duplicate-key import failure, and cloning a **live** table is the worse case —
   the import would target the source table's own forms and views. *(Renaming the example in place instead of
   cloning? Skip this — `guid-freshen.ps1` does it once before first deploy.)*

### 5 — Register the RootComponent
6. Add the table to `Other/Solution.xml` inside `<RootComponents>`:
   ```xml
   <RootComponent type="1" schemaName="smkb_<prefix>_<PascalName>" behavior="0" />
   ```

### 6 — Author columns + verify
7. Add your columns inside `<entity>/<attributes>` (types: see the Tables [README](../../../README.md)
   "Common Column Types"; Yes/No is `<Type>bit</Type>`). Shared columns stay bare-publisher (`smkb_name`).
8. Confirm no example token remains:
   ```powershell
   powershell -File .\deploy.ps1   # its guard scans for smkb_sol_ and sentinel GUIDs — or grep first
   ```
   **PAUSE** — deploy is a separate step (`/dvt-deploy`); this skill only authors the XML.

## Error Handling

- **Import error "duplicate key" / "Cannot insert duplicate":** a GUID was reused — you skipped Step 4, or two files share a GUID. Regenerate all form/view GUIDs.
- **Import error "attribute type … not found":** a wrong `<Type>` (use `ntext` not `memo`; `bit` for Yes/No). See README.
- **Deploy guard blocks on `smkb_sol_`:** a token wasn't replaced (often a lowercase occurrence a case-insensitive replace missed). Re-run the case-sensitive script; grep for both `smkb_sol_` and the example PascalCase token.
- **Logical/EntitySetName has wrong case:** you replaced with a PascalCase value into a lowercase slot — the lowercase token must map to the fully-lowercased name.

## Notes

- Case rule is non-negotiable: Dataverse lowercases logical names on import; a PascalCase `<LogicalName>` silently becomes lowercase and then won't match your fetchxml/refs.
- Deploy is `/dvt-deploy` (runs `guid-freshen.ps1` once, then `deploy.ps1`). Lookups/relationships are `/dvt-add-lookup`.
- Full derived-token map, the exact `-creplace` script, and the GUID-refresh script: [add-table-reference.md](add-table-reference.md).
