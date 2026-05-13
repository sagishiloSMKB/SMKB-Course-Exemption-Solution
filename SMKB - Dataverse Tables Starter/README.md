# SMKB – Dataverse Tables Starter

This folder is the source-of-truth for Power Platform custom Dataverse table **schemas** developed for SMKB.  
Table definitions are stored as XML files, version-controlled in Git, and pushed to Dataverse using `deploy.ps1`.

---

## Activation Guide — Do This First

> **Only activate this starter if your solution actually needs custom Dataverse tables.**
> If your solution uses only existing standard tables (Contact, Account, etc.) or no Dataverse data at all, leave this folder completely untouched — do not rename files, do not change placeholders, do not run deploy.ps1.

### Step 0 — Rename this folder

Before anything else, rename this folder from `SMKB - Dataverse Tables Starter` to match your solution:

```
SMKB - [Component Name] - Dataverse Tables
```

| What to fill in | Example |
|----------------|---------|
| Component Name — describes what this instance manages | `Events Tickets`, `Scholarship Applications` |

Full example rename: `SMKB - Events Tickets - Dataverse Tables`

Renaming the folder does not affect `deploy.ps1` — it uses `$PSScriptRoot` to locate files.

### Step 1 — Confirm you need this starter

You need the Tables Starter if your solution requires any of:
- Custom data storage (registrations, applications, schedules, records specific to your app)
- Custom forms or views for that data
- Relationships between your custom records

If none of these apply, skip this starter entirely.

### Step 2 — Decide how many tables you need and name them

Each table needs a name following the pattern `[sol]_table_name`.

| What you have | What to do |
|--------------|-----------|
| Need Table A equivalent | Rename `sol_example_table_a` folder + all references |
| Need Table B equivalent | Rename `sol_example_table_b` folder + all references |
| Need fewer than 2 tables | Delete the unused example entity folder and its `RootComponent` from `Solution.xml` |
| Need more than 2 tables | Copy an existing entity folder, rename, and add a new `RootComponent` to `Solution.xml` |

### Step 3 — Replace all placeholders

Work through the checklist below for **each active table**. The example below uses `sol_example_table_a` → `evt_sessions` as an illustration.

#### `Other/Solution.xml`
| Find | Replace with |
|------|-------------|
| `YourSolutionName` | Your solution's unique name (e.g. `SMKBEvents`) |
| `Your Solution Name` | Your solution's display name (e.g. `SMKB – Events`) |
| `schemaName="sol_example_table_a"` | `schemaName="evt_sessions"` |
| `schemaName="sol_example_table_b"` | `schemaName="evt_registrations"` (or delete if not used) |

#### Entity folders — rename first, then update contents

**For each active table:**

1. **Rename the folder:** `sol_example_table_a` → `evt_sessions`
2. **In `Entity.xml`**, replace ALL occurrences of `sol_example_table_a` with `evt_sessions`:
   - `<Name ...>sol_example_table_a</Name>`
   - `<entity Name="sol_example_table_a">`
   - `PhysicalName="sol_example_table_aId"` → `PhysicalName="evt_sessionsId"`
   - `<Name>sol_example_table_aid</Name>` → `<Name>evt_sessionsid</Name>`
   - `<LogicalName>sol_example_table_aid</LogicalName>` → `<LogicalName>evt_sessionsid</LogicalName>`
   - `<EntitySetName>sol_example_table_as</EntitySetName>` → `<EntitySetName>evt_sessionss</EntitySetName>`
   - `optionset Name="sol_example_table_a_statecode"` → `optionset Name="evt_sessions_statecode"`
   - `optionset Name="sol_example_table_a_statuscode"` → `optionset Name="evt_sessions_statuscode"`
3. **Update display names** in `Entity.xml`:
   - `"Example Table A"` → `"CIF Application"` (singular — include a solution-short prefix in the display name to avoid ambiguity in shared environments, e.g. `CIF Application` not just `Application`)
   - `"Example Table A Records"` → `"CIF Applications"` (plural)
4. **In form files** (`FormXml/main/`, `FormXml/card/`, `FormXml/quick/`): update `datafieldname` attributes that reference the old primary key field name (e.g. `sol_example_table_aid` -> `evt_sessionsid`). The bulk `-replace` command in Step 3 handles this automatically.
5. **In `SavedQueries/`**: update the entity name and primary key attribute in the fetchxml. The bulk `-replace` covers this too.
6. **GUID files**: When copying an entity folder to create a new table, generate fresh random GUIDs for all `FormXml/*.xml` and `SavedQueries/*.xml` filenames and their internal ID elements. Re-using the same GUIDs causes "Cannot insert duplicate key" on re-import. Use PowerShell to generate: `[System.Guid]::NewGuid().ToString()`

> **Tip:** Use PowerShell's `-replace` to do the bulk rename in a single command:
> ```powershell
> Get-ChildItem ".\Entities\sol_example_table_a" -Recurse -File | ForEach-Object {
>     (Get-Content $_.FullName -Raw) -replace 'sol_example_table_a', 'evt_sessions' |
>     Set-Content $_.FullName -Encoding UTF8 -NoNewline
> }
> Rename-Item ".\Entities\sol_example_table_a" "evt_sessions"
> ```

### Step 4 — Verify no placeholders remain

Run this before deploying:

```powershell
$patterns = 'YourSolutionName','sol_example_table'
Get-ChildItem ".\Other",".\Entities" -Recurse -File | ForEach-Object {
    $file = $_
    foreach ($p in $patterns) {
        if ((Get-Content $file.FullName -Raw) -match $p) {
            Write-Host "PLACEHOLDER FOUND: '$p' in $($file.Name)"
        }
    }
}
```

If the command outputs nothing, all placeholders are replaced. You are ready to deploy.

### Step 5 — Deploy

```powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

> **IMPORTANT:** Before deploying for the first time, verify no tables with the same schema name already exist in the target environment. If they do, you will need a different name.

---

---

## Naming Convention

All component names use a **solution short-name prefix** so no two solutions ever share a table name.

The placeholder prefix throughout this starter is **`sol`** — replace it with your solution's short name before deploying.

| Placeholder name | Real example |
|-----------------|--------------|
| `sol_example_table_a` | `evt_sessions` |
| `sol_example_table_b` | `evt_registrations` |
| `YourSolutionName` (in Solution.xml) | `SMKBEvents` |

**Rule:** every custom table in a solution must start with `[solutionShortName]_`.  
Never use a generic name that could collide with tables in other solutions.

The `smkb_name` field (primary name column) and `smkb_description` field use the publisher prefix `smkb_` directly — these are shared column names across all SMKB tables and that's intentional.

---

## Core Concept

A **Dataverse table definition** (entity) is stored as an XML file under `Entities/<tablename>/Entity.xml`.  
PAC CLI's `pac solution pack` picks it up automatically — no manual zip building required.

```
Git repo (XML)  →  deploy.ps1  →  pac solution pack + import  →  table schema in Dataverse
```

---

## Project Structure

```
SMKB - Dataverse Tables Starter/
│
├── Other/
│   ├── Solution.xml          ← solution metadata + RootComponents listing each table
│   └── Customizations.xml    ← minimal; <Entities /> stays empty
│
├── Entities/
│   ├── sol_example_table_a/  ← example parent table
│   │   ├── Entity.xml
│   │   ├── FormXml/
│   │   │   ├── main/{aa000001-...}.xml   ← main form
│   │   │   ├── card/{aa000002-...}.xml   ← card form
│   │   │   └── quick/{aa000003-...}.xml  ← quick create form
│   │   └── SavedQueries/{aa000004-...}.xml  ← Active view
│   │
│   └── sol_example_table_b/  ← example child table
│       ├── Entity.xml
│       ├── FormXml/ ...
│       └── SavedQueries/ ...
│
├── deploy.ps1                ← pac solution pack + import
└── .gitignore                ← ignores _dist/
```

---

## Development Workflow

### Adding a new table

1. Copy an existing entity folder (e.g. `sol_example_table_a`).
2. Rename the folder to `[sol]_your_table_name`.
3. In `Entity.xml`, replace all occurrences of `sol_example_table_a` with `sol_your_table_name`.
4. Update display names, descriptions, EntitySetName, and the primary key `PhysicalName`/`Name`/`LogicalName`.
5. Add a RootComponent line in `Other/Solution.xml`:
   ```xml
   <RootComponent type="1" schemaName="sol_your_table_name" behavior="0" />
   ```
6. Run `deploy.ps1` to push the new table to Dataverse.
7. Commit the new XML files.

### Updating an existing table

1. Edit the relevant `Entity.xml` or form files.
2. Run `deploy.ps1`.
3. Commit the changes.

---

## Adding a Lookup Column Between Tables

To create a lookup column on `sol_example_table_b` pointing to `sol_example_table_a`:

1. Add a lookup attribute to `sol_example_table_b/Entity.xml`:
   ```xml
   <attribute PhysicalName="sol_example_table_aId">
     <Type>lookup</Type>
     <Name>sol_example_table_aid</Name>
     <LogicalName>sol_example_table_aid</LogicalName>
     <RequiredLevel>none</RequiredLevel>
     <DisplayMask>ValidForAdvancedFind|ValidForForm|ValidForGrid</DisplayMask>
     <ImeMode>auto</ImeMode>
     <ValidForUpdateApi>1</ValidForUpdateApi>
     <ValidForReadApi>1</ValidForReadApi>
     <ValidForCreateApi>1</ValidForCreateApi>
     <IsCustomField>1</IsCustomField>
     <IsAuditEnabled>1</IsAuditEnabled>
     <IsSecured>0</IsSecured>
     <IntroducedVersion>1.0</IntroducedVersion>
     <IsCustomizable>1</IsCustomizable>
     <IsRenameable>1</IsRenameable>
     <LookupStyle>single</LookupStyle>
     <LookupTypes>
       <LookupType>sol_example_table_a</LookupType>
     </LookupTypes>
     <displaynames>
       <displayname description="Example Table A" languagecode="1033" />
     </displaynames>
   </attribute>
   ```
2. Both tables must be in the same solution for the relationship to deploy cleanly.
3. Run `deploy.ps1` — PAC CLI will automatically handle the `EntityRelationship` definition from the lookup attribute.

> **Note**: Cross-entity lookups are complex to define from scratch in XML. The simplest workflow is: create the lookup in the Dataverse portal UI first, then export → unpack the solution to get the correct XML structure for source control.

---

## Running `deploy.ps1`

```powershell
# Deploys to SMKB-Apps-Dev (the only allowed target)
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

This script deploys to **SMKB-Apps-Dev only**. Stage and Production are promoted via Power Platform Pipeline — the script will block any other target.

> **IMPORTANT:** Before deploying for the first time, ensure no tables with the same schema name already exist in the target environment. If they do, rename your table (step 2 in "Adding a new table").

| Environment | Dataverse URL | Deploy method |
|-------------|---------------|---------------|
| Dev | `https://org229c958d.crm4.dynamics.com/` | This script |
| Stage | — | Power Platform Pipeline only |
| Prod | — | Power Platform Pipeline only |

> **Note:** The PAC auth profile named "SMKB-Apps-Dev" incorrectly targets `org1dce1895`.  
> Always rely on the default URL in `deploy.ps1`.

---

## Common Column Types Reference

| XML `<Type>` | Dataverse type | Notes |
|-------------|----------------|-------|
| `nvarchar` | Text | Set `<MaxLength>` and `<Length>` |
| `ntext` | Multiline text (Memo) | Use `ntext`, **not** `memo` or `Memo` — wrong value causes "Unable to find attribute type by name" on import |
| `int` | Whole number | |
| `decimal` | Decimal | |
| `datetime` | Date/Time | Set `<Format>` and `<Behavior>` |
| `boolean` | Two options (Yes/No) | |
| `lookup` | Lookup | Set `<LookupTypes>` |
| `picklist` | Choice | Include `<optionset>` |
| `money` | Currency | |

---

## Extracting a Table from an Existing Solution

To pull the current table definition out of an environment for the first time:

```powershell
pac solution export --name YourSolutionName --path .\YourSolutionName.zip --environment "https://org229c958d.crm4.dynamics.com/" --overwrite
pac solution unpack --zipFile .\YourSolutionName.zip --folder .\YourSolutionName_unpacked
# Copy Entities/<tablename>/ from the unpacked folder into this project
```
