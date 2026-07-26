# SMKB – Dataverse Tables Starter

This folder is the source-of-truth for Power Platform custom Dataverse table **schemas** developed for SMKB.  
Table definitions are stored as XML files, version-controlled in Git, and pushed to Dataverse using `deploy.ps1`.

---

## Activation Guide — Do This First

> **Only activate this starter if your solution actually needs custom Dataverse tables.**
> If your solution uses only existing standard tables (Contact, Account, etc.) or no Dataverse data at all, leave this folder completely untouched — do not rename files, do not change placeholders, do not run deploy.ps1.

> **Orchestrated from the root.** This starter is standalone (it builds and deploys on its own via
> `deploy.ps1`), but its **solution identity** — unique name, display name, short prefix, and target
> environment — is authored once in the root [`solution.config.json`](../solution.config.json) and
> written into `Other/Solution.xml` by [`apply-config.ps1`](../apply-config.ps1) (run from the repo
> root). Do **not** hand-edit `YourSolutionName` / `Your Solution Name` here. What you author in *this*
> folder is the table content — the entities, columns, and relationships, named with your solution's
> short prefix (the `shortPrefix` from the root config). Global naming/environment/deploy-order rules
> live in the root `CLAUDE.md`; this README covers only how to define tables.

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

Each table's schema name follows `smkb_<prefix>_<PascalName>` (see CLAUDE.md → Critical Rule 3). The template ships two example tables to rename or delete:

| What you have | What to do |
|--------------|-----------|
| Need Table A equivalent | Rename the `smkb_sol_ExampleTableA` folder + all references |
| Need Table B equivalent | Rename the `smkb_sol_ExampleTableB` folder + all references |
| Need fewer than 2 tables | Delete the unused example entity folder and its `RootComponent` from `Solution.xml` |
| Need more than 2 tables | Copy an existing entity folder, rename, and add a new `RootComponent` to `Solution.xml` |

### Step 3 — Rename each table you keep

Work through this for **each active table**. The example renames `smkb_sol_ExampleTableA` → `smkb_evt_Sessions`.

> **Dataverse case rule (important).** The *schema* name is PascalCase but the *logical* name is its
> lowercased form, so one rename produces **two** tokens you must keep straight:
> - **PascalCase** `smkb_evt_Sessions` — `schemaName`, `entity Name=`, the entity `<Name LocalizedName=…>`, `PhysicalName` (`smkb_evt_SessionsId`), and `optionset Name=` (`smkb_evt_Sessions_statecode`).
> - **lowercase** `smkb_evt_sessions` — `<LogicalName>`, `<EntitySetName>`, the PK `<Name>`/`<LogicalName>` (`smkb_evt_sessionsid`), and SavedQueries fetchxml (`<entity name=…>`, `<attribute name=…>`).

**`Other/Solution.xml`** — `YourSolutionName` / `Your Solution Name` are set by the root `apply-config.ps1`; you only update the table `schemaName` (PascalCase):

| Find | Replace with |
|------|-------------|
| `schemaName="smkb_sol_ExampleTableA"` | `schemaName="smkb_evt_Sessions"` |
| `schemaName="smkb_sol_ExampleTableB"` | `schemaName="smkb_evt_Registrations"` (or delete if not used) |

**Entity folder** — rename `Entities/smkb_sol_ExampleTableA/` → `Entities/smkb_evt_Sessions/` (folder = the PascalCase schema name), then apply the two-token replacement in `Entity.xml` + `SavedQueries/*.xml`. Set the display names (`<LocalizedName>` / `<LocalizedCollectionName>` / `Description`) to `EVT - Sessions` / `EVT - Sessions` (`PREFIX - Name`). Forms reference the shared columns (`smkb_name`, `smkb_description`), not the table name, so they need no change.

> **Tip — the two-token bulk rename.** PowerShell's `-replace` is **case-insensitive**, which would flatten both tokens to one case — use **`-creplace`** (case-sensitive), PascalCase first:
> ```powershell
> $dir = ".\Entities\smkb_sol_ExampleTableA"
> Get-ChildItem $dir -Recurse -File | ForEach-Object {
>     ((Get-Content $_.FullName -Raw) `
>       -creplace 'smkb_sol_ExampleTableA','smkb_evt_Sessions' `   # PascalCase: schema / PhysicalName / optionset / entity Name
>       -creplace 'smkb_sol_exampletablea','smkb_evt_sessions' `   # lowercase: LogicalName / EntitySetName / fetchxml / PK
>       -creplace 'SOL - Example Table As','EVT - Sessions' `      # display: plural (collection name)
>       -creplace 'SOL - Example Table A','EVT - Session' `        # display: singular
>       -creplace 'Example Table A','Session') |                   # display: the PK's UNPREFIXED name
>       Set-Content $_.FullName -NoNewline
> }
> Rename-Item $dir "smkb_evt_Sessions"
> ```
> The last three replacements are the display names, and the unprefixed one is not redundant: the
> primary-key attribute ships `<displayname description="Example Table A">` with no `SOL - ` prefix,
> so without it the new table's PK column stays labelled "Example Table A" everywhere. `deploy.ps1`
> now blocks on `Example Table` as a backstop.
> **GUID files:** when you *copy* an entity folder to create an extra table, also generate fresh GUIDs for every `FormXml/*.xml` + `SavedQueries/*.xml` filename and internal ID (reusing them causes "Cannot insert duplicate key" on import). `[System.Guid]::NewGuid().ToString().ToLower()`. For the shipped example tables, `guid-freshen.ps1` (Step 3b) already does this.

### Step 3b — Freshen the sentinel GUIDs (run once, before first deploy)

The two example tables ship with fixed form/view GUIDs that were used in a template test. `deploy.ps1`
**blocks** until they are replaced, so run this once per new solution (never twice — it writes a
`.guid-freshened` marker and refuses to re-run):

```powershell
powershell -ExecutionPolicy Bypass -File guid-freshen.ps1
```

### Step 4 — Verify no placeholders remain

Solution *identity* is verified from the root with `apply-config.ps1 -Check` (it fails if `Other/Solution.xml`
has drifted from `solution.config.json`). This scan covers the table *content* you author — `deploy.ps1`
also blocks on these, but check early:

```powershell
$patterns = 'YourSolutionName','smkb_sol_'
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

Every table's schema name is `smkb_<prefix>_<PascalName>` (fixed publisher prefix + your solution short prefix + PascalCase name), so no two solutions ever share a table name. The template's placeholder short prefix is **`sol`** — replace it with your solution's short name.

| Placeholder name | Real example |
|-----------------|--------------|
| `smkb_sol_ExampleTableA` | `smkb_evt_Sessions` |
| `smkb_sol_ExampleTableB` | `smkb_evt_Registrations` |
| `YourSolutionName` (in Solution.xml) | `SMKBEvents` |

**Rule:** every custom table is named `smkb_<prefix>_<PascalName>` (schema; logical name is the lowercased form) with display `<PREFIX> - <Name>`. See CLAUDE.md → Critical Rule 3.

The `smkb_name` (primary name column) and `smkb_description` fields use the bare publisher prefix `smkb_` with no solution segment — these are shared column names across all SMKB tables and that's intentional.

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
│   ├── smkb_sol_ExampleTableA/  ← example parent table
│   │   ├── Entity.xml
│   │   ├── FormXml/
│   │   │   ├── main/{aa000001-...}.xml   ← main form
│   │   │   ├── card/{aa000002-...}.xml   ← card form
│   │   │   └── quick/{aa000003-...}.xml  ← quick create form
│   │   └── SavedQueries/{aa000004-...}.xml  ← Active view
│   │
│   └── smkb_sol_ExampleTableB/  ← example child table
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

> Easiest path: run the **`/dvt-add-table`** skill, which does all of this (including the case-sensitive
> two-token replace and fresh form/view GUIDs) for you.

1. Copy an existing entity folder (e.g. `smkb_sol_ExampleTableA`).
2. Rename the folder to the new table's **PascalCase schema name**, `smkb_<prefix>_YourTableName`.
3. In `Entity.xml`, replace the two token forms **case-sensitively**: `smkb_sol_ExampleTableA` →
   `smkb_<prefix>_YourTableName` (schema slots) and `smkb_sol_exampletablea` →
   `smkb_<prefix>_yourtablename` (logical slots). A case-insensitive replace flattens both and breaks the import.
4. Update display names (`PREFIX - Name`), descriptions, `EntitySetName`, and the primary key `PhysicalName`/`Name`/`LogicalName`.
5. Generate **fresh GUIDs** for every `FormXml/*` and `SavedQueries/*` filename and its internal id — reusing the copied ones causes a duplicate-key import failure.
5. Add a RootComponent line in `Other/Solution.xml`:
   ```xml
   <RootComponent type="1" schemaName="smkb_<prefix>_YourTableName" behavior="0" />
   ```
6. Run `deploy.ps1` to push the new table to Dataverse.
7. Commit the new XML files.

### Updating an existing table

1. Edit the relevant `Entity.xml` or form files.
2. Run `deploy.ps1`.
3. Commit the changes.

---

## Adding a Lookup Column Between Tables

To create a lookup column on `smkb_sol_ExampleTableB` pointing to `smkb_sol_ExampleTableA`:

1. Add a lookup attribute to `smkb_sol_ExampleTableB/Entity.xml`:
   ```xml
   <attribute PhysicalName="smkb_sol_ExampleTableAId">
     <Type>lookup</Type>
     <Name>smkb_sol_exampletableaid</Name>
     <LogicalName>smkb_sol_exampletableaid</LogicalName>
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
       <LookupType>smkb_sol_exampletablea</LookupType>
     </LookupTypes>
     <displaynames>
       <displayname description="Example Table A" languagecode="1033" />
     </displaynames>
   </attribute>
   ```
2. Both tables must be in the same solution for the relationship to deploy cleanly.
3. **Declare the relationship** — the lookup attribute alone is not enough. Add the matching `<EntityRelationship>` to `Other/Customizations.xml` (use the template block in `Relationships.xml` as the pattern), then run `deploy.ps1`.

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
| `bit` | Two options (Yes/No) | Use `bit` (not `boolean`) — matches the in-file reference and Dataverse import |
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
