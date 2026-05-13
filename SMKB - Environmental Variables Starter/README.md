# SMKB – Environmental Variables Starter

This folder is the source-of-truth for Power Platform Environment Variable **definitions** developed for SMKB.  
Definitions are stored as XML files, version-controlled in Git, and pushed to Dataverse using `deploy.ps1`.

---

## Activation Guide — Do This First

> **Only activate this starter if your solution actually needs environment variables.**
> If your solution has no configuration values that change between environments (Dev / Stage / Prod), leave this folder completely untouched — do not rename files, do not change placeholders, do not run deploy.ps1.

### Step 0 — Rename this folder

Before anything else, rename this folder from `SMKB - Environmental Variables Starter` to match your solution:

```
SMKB - [Component Name] - Environmental Variables
```

| What to fill in | Example |
|----------------|---------|
| Component Name — describes what solution these variables belong to | `Events Tickets`, `Scholarship Applications` |

Full example rename: `SMKB - Events Tickets - Environmental Variables`

Renaming the folder does not affect `deploy.ps1` — it uses `$PSScriptRoot` to locate files.

### Step 1 — Confirm you need this starter

You need the Env Vars Starter if your solution requires any of:
- API base URLs or endpoint addresses that differ per environment
- Email addresses, sender names, or notification settings
- Feature flags or toggle values
- Any setting you'd rather configure per-environment than hard-code in a flow or page

If none of these apply, skip this starter entirely.

### Step 2 — Choose your solution short name

Pick a 2–5 letter uppercase prefix for your variable names (e.g. `EVT` for Events, `SCH` for Scholarships).  
By convention, environment variable names use uppercase: `[SOL]_VAR_NAME`.

### Step 3 — Replace all placeholders

#### `Other/Solution.xml`
| Find | Replace with |
|------|-------------|
| `YourSolutionName` | Your solution's unique name (e.g. `SMKBEvents`) |
| `Your Solution Name` | Your solution's display name (e.g. `SMKB – Events`) |

#### `environmentvariabledefinitions/` folder
For **each variable** your solution needs:

1. Copy the `sol_EXAMPLE_VAR` folder.
2. Rename it to `[SOL]_YOUR_VAR_NAME` (e.g. `EVT_PORTAL_BASE_URL`).
3. Inside the copied folder, edit `environmentvariabledefinition.xml`:

| Find | Replace with |
|------|-------------|
| `schemaname="sol_EXAMPLE_VAR"` | `schemaname="EVT_PORTAL_BASE_URL"` (your variable name) |
| `default="EXAMPLE_VAR"` | `default="PORTAL_BASE_URL"` (display name, no prefix) |
| `description="EXAMPLE_VAR"` | `description="Portal Base URL"` (human-readable label) |
| `your-default-value-here` | Your actual default value, or remove the `<defaultvalue>` element if there is no universal default |

4. After creating all your real variable folders, **delete** the `sol_EXAMPLE_VAR` template folder (it should not be deployed).
5. If your solution uses Cloud Flows, **rename** (do not delete) `sol_ENVIRONMENT_NAME` and `sol_FLOW_ERROR_EMAILS` to your prefix — they are required by the example flow and should be kept. See the "ALM-Required Variables" section below.
6. **For every variable folder you created**, add a `<RootComponent>` entry to `Other/Solution.xml`:

```xml
<RootComponent type="380" schemaName="EVT_PORTAL_BASE_URL" behavior="0" />
```

The `schemaName` must exactly match the folder name under `environmentvariabledefinitions/`. A template comment in `Other/Solution.xml` shows the format.

> **Why this matters:** Without this entry, the definition is imported to Dataverse but is **not linked to the solution**. When the solution is promoted through the pipeline, the env var definition does not travel with it — Stage and Prod environments never receive the definition.

### Step 4 — Verify no placeholders remain

Run this before deploying:

```powershell
$patterns = 'YourSolutionName','sol_EXAMPLE_VAR','your-default-value-here'
Get-ChildItem ".\Other",".\environmentvariabledefinitions" -Recurse -File | ForEach-Object {
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

After deploying, set the **value** for each variable in the Power Platform portal (per environment). The definition is the schema; the value is the actual setting. Never commit values to Git.

---

---

## Naming Convention

All component names use a **solution short-name prefix** so no two solutions ever share a variable name.

The placeholder prefix throughout this starter is **`sol`** — replace it with your solution's short name before deploying.

| Placeholder name | Real example |
|-----------------|--------------|
| `sol_EXAMPLE_VAR` | `evt_PORTAL_BASE_URL` |
| `YourSolutionName` (in Solution.xml) | `SMKBEvents` |

**Rule:** every environment variable in a solution must start with `[SOLUTIONSHORT]_` (uppercase by convention).  
Never use a generic name that could collide with variables in other solutions.

---

## Core Concept

An **environment variable definition** is a Dataverse record (`environmentvariabledefinition` table).  
Its **default value** is baked into the definition. Each environment can override it with a separate **value record** (not stored here).

```
Git repo (XML)  →  deploy.ps1  →  Dataverse environmentvariabledefinition record  →  reflected in every solution that references it
```

- **Definitions** (type 380) — schema name, display name, default value, data type. Stored here, committed to Git.
- **Values** (type 381) — per-environment overrides. **Never committed to Git.** Set them manually in each environment after deploy.

---

## Project Structure

```
SMKB - Environmental Variables Starter/
│
├── Other/
│   └── Solution.xml          ← solution metadata (no RootComponents needed for env vars)
│
├── environmentvariabledefinitions/
│   └── sol_EXAMPLE_VAR/
│       └── environmentvariabledefinition.xml   ← one folder per variable; this is what you edit
│
├── deploy.ps1                ← runs pac solution pack + pac solution import
└── .gitignore                ← ignores _dist/
```

---

## Development Workflow

### Adding a new variable

1. Copy the `sol_EXAMPLE_VAR` folder.
2. Rename it to your variable name: `[SOL]_YOUR_VAR_NAME`.
3. Update `environmentvariabledefinition.xml` inside:
   - `schemaname` → your variable's schema name (e.g. `evt_PORTAL_BASE_URL`)
   - `displayname` / `label description` → human-readable name
   - `defaultvalue` → optional default (leave blank if no universal default)
   - `type` → see type reference below
4. Run `deploy.ps1` to push the definition to the environment.
5. Set the actual value in the Power Platform portal per environment.
6. Commit the new XML.

### Variable data types

| `<type>` value | Data type |
|----------------|-----------|
| `100000000` | String |
| `100000001` | Number |
| `100000002` | Boolean |
| `100000003` | JSON |
| `100000004` | Data Source |
| `100000005` | Secret |

### Updating an existing variable

1. Edit the relevant XML file.
2. Run `deploy.ps1`.
3. Commit the change.

---

## How This Differs from Cloud Flows

| Aspect | Cloud Flows | Env Var Definitions |
|--------|-------------|---------------------|
| File format | JSON (`Workflows/*.json`) | XML (`environmentvariabledefinitions/<name>/*.xml`) |
| Listed in Solution.xml RootComponents | Yes (`type="29"`) | **No** — picked up automatically from folder |
| `pac solution pack` support | **No** — must build zip manually | **Yes** — works natively |

---

## Running `deploy.ps1`

```powershell
# Deploys to SMKB-Apps-Dev (the only allowed target)
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

This script deploys to **SMKB-Apps-Dev only**. Stage and Production are promoted via Power Platform Pipeline — the script will block any other target.

| Environment | Dataverse URL | Deploy method |
|-------------|---------------|---------------|
| Dev | `https://org229c958d.crm4.dynamics.com/` | This script |
| Stage | — | Power Platform Pipeline only |
| Prod | — | Power Platform Pipeline only |

> **Note:** The PAC auth profile named "SMKB-Apps-Dev" incorrectly targets `org1dce1895`.  
> Always rely on the default URL in `deploy.ps1`.

---

## Important: Definitions vs Values

| What | File | Commit to Git? |
|------|------|----------------|
| Variable **definition** (name, type, description, default) | `environmentvariabledefinition.xml` | **Yes** |
| Variable **value** (the actual secret or setting per environment) | set via portal or PAC | **Never** |

Values are per-environment overrides. Committing them would expose environment-specific secrets and settings to source control.

---

## ALM-Required Variables — Always Include With Cloud Flows

When your solution uses the **Flows Starter**, always activate these two variables. They are pre-built templates in this starter — just rename them to your prefix.

### `sol_ENVIRONMENT_NAME` — Environment identifier

| Setting | Value |
|---------|-------|
| Schema name | `sol_ENVIRONMENT_NAME` (rename to e.g. `evt_ENVIRONMENT_NAME`) |
| Type | String |
| Default value | `dev` |

**Purpose:** Tells flows which environment they are running in. Flows use this to prefix email subjects with `(DEV)` or `(STAGE)` so non-production emails are clearly distinguishable. In production, no prefix is added.

**Pipeline setup:** After pipeline promotion, set the value to `stage` or `prod` in the environment connection settings — the same place you override any other env var value. Never commit values to Git.

### `sol_FLOW_ERROR_EMAILS` — Error notification recipients

| Setting | Value |
|---------|-------|
| Schema name | `sol_FLOW_ERROR_EMAILS` (rename to e.g. `evt_FLOW_ERROR_EMAILS`) |
| Type | JSON |
| Default value | *(none — must be set per environment)* |

**Purpose:** JSON array of email addresses that receive an alert whenever a flow in this solution fails. The array is different per environment — typically the dev team in Dev, and the operations team in Stage and Prod.

**Format:** `["ops@smkb.ac.il", "dev@smkb.ac.il"]`

**Pipeline setup:** Set the value for each environment via pipeline connection settings. Do not commit email addresses to Git.

### Why these belong in env vars (not hardcoded in the flow)

| If hardcoded | If in env vars |
|-------------|----------------|
| Changing error recipients requires a code change + redeploy | Change the value in the portal per environment — no redeploy |
| All environments get the same subject prefix | Each environment controls its own name (`dev`, `stage`, `prod`) |
| Dev test emails go to production ops team | Each environment targets the correct audience |

This is the ALM pipeline model: flows are promoted unchanged through Dev → Stage → Prod. Env vars are the mechanism for everything that legitimately differs between environments.

---

## Extracting Variables from an Existing Solution

To pull the current definitions out of an environment for the first time:

```powershell
pac solution export --name YourSolutionName --path .\YourSolutionName.zip --environment "https://org229c958d.crm4.dynamics.com/" --overwrite
pac solution unpack --zipFile .\YourSolutionName.zip --folder .\YourSolutionName_unpacked
# Copy environmentvariabledefinitions/ from the unpacked folder into this project
```
