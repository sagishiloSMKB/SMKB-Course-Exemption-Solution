# SMKB Power Platform Solution Starter Kit — AI Assistant Rules

This file contains mandatory rules for Claude (or any AI assistant) working in this repository. These rules exist to prevent accidental deployment of placeholder components to the SMKB Power Platform environments, which has previously caused conflicts with live solutions.

---

## Project Overview

This repository contains 5 sub-starter folders:
- `SMKB - Dataverse Tables Starter` — custom table schemas
- `SMKB - Environmental Variables Starter` — environment variable definitions
- `SMKB - Power Automate Flows Starter` — cloud flow JSON files
- `SMKB - Power Apps Starter` — Power Apps Code App SPA (Vue 3 + TypeScript)
- `SMKB - Power Page Starter` — Power Pages site source

Each starter is an independent, reusable template. Not every solution uses all starters.

---

## SESSION START — Pre-Flight Check

At the very start of every session, before applying any Critical Rule, run both checks:

**Check 1 — Git remote:**
```powershell
git remote get-url origin
```

**If the output contains `SMKB-Power-Platform-Solution-Starter-Kit`:**
→ This repo has NOT been initialized for a specific solution yet — it is still connected to the shared template.
→ Tell the user immediately:

> "This repository is still connected to the starter kit template remote. You need to run **Init Project** before starting any development work. Say 'init project' to begin."

→ Do NOT proceed with Critical Rule 1 or any other work until Init Project is complete.

**If the output is a solution-specific repo (or no remote is configured):**
→ The repo is initialized — proceed to Check 2.

**Check 2 — PAC CLI auth target:**
```powershell
pac auth list
```

The active profile (`*`) must target `https://org229c958d.crm4.dynamics.com/` (SMKB-Apps-Dev).

> **Warning:** The PAC profile named "SMKB-Apps-Dev" incorrectly targets `org1dce1895` (Seminar Hakibutzim College). If that profile is active, select the correct one before any deploy:
> ```powershell
> pac auth select --index <N>   # N from pac auth list
> ```

Never run a deploy without confirming the auth target. If the wrong profile is active and a deploy runs, changes go to the wrong environment silently.

**Windows-only — WebDAV:** Do not enable WebDAV or allow Claude Code to access `\\*` network paths. WebDAV is deprecated by Microsoft and may allow Claude Code to make unintended network requests that bypass the permission system. If VS Code or any tool offers to mount a WebDAV share, decline.

---

## INIT ONBOARDING COMMAND

**Trigger:** User says `init onboarding`, `onboarding`, or `/init-onboarding`

**When triggered:**
1. Check if `onboarding SMKB Apps Development/node_modules` exists; if not, run `pnpm install` inside that folder first
2. Run `pnpm run dev` inside `onboarding SMKB Apps Development/`
3. Tell the user: "Onboarding app is running at **http://localhost:5173** — open it in your browser to begin."

**Note:** `init onboarding` is meant to run before `init project`. It does not require the repo to be initialized. The onboarding folder is removed in Init Project Step 3b and will not be part of any solution repository.

---

## INIT PROJECT COMMAND

**Trigger conditions:**
- User says `init project`, `initialize project`, `/init-project`, or similar
- OR the pre-session check above finds the starter kit remote (proactively offer to run Init Project)

**When triggered:** follow [`INIT_PROJECT.md`](INIT_PROJECT.md) step by step.
- Confirm with the user after each step before moving to the next
- Do NOT skip steps or reorder them
- The git remote removal (Step 3) is mandatory — never proceed past Step 5 without it

**This is a one-time operation.** Once Init Project has been completed and the remote points to the new solution repo, this command will not be triggered again in future sessions.

---

## CRITICAL RULE 1 — Always Ask Which Starters to Activate

At the beginning of any new solution engagement, BEFORE touching any files, you MUST ask the user (note: during Init Project, follow the Step 8→9 sequence in INIT_PROJECT.md instead — spec gathering happens before starter selection):

> "Which starters do you want to activate for this solution?
> - Dataverse Tables (custom data tables)
> - Environmental Variables (config values per environment)
> - Power Automate Flows (automated workflows)
> - Power Apps (Code App SPA — staff/admin interface)
> - Power Pages (web portal — public-facing)
>
> You can activate any combination. Starters you don't need should remain completely untouched."

Do NOT assume all starters are needed. Do NOT modify or deploy any starter the user hasn't explicitly confirmed they want to use.

**Unused starters** must be left with their placeholder names and never deployed. They are templates for future solutions.

---

## CRITICAL RULE 2 — Never Deploy With Placeholder Names

Before running `deploy.ps1` in ANY starter folder, you MUST scan that folder for unreplaced placeholders. The following strings are placeholders that MUST NOT exist in any deployed starter:

| Placeholder string | Appears in |
|--------------------|-----------|
| `YourSolutionName` | All starters — `Other/Solution.xml` |
| `Your Solution Name` | All starters — `Other/Solution.xml` |
| `sol_example_table_a` | Tables Starter — `Entity.xml`, `Solution.xml`, form/view XMLs |
| `sol_example_table_b` | Tables Starter — `Entity.xml`, `Solution.xml`, form/view XMLs |
| `sol_EXAMPLE_VAR` | Env Vars Starter — folder name, `environmentvariabledefinition.xml` |
| `your-default-value-here` | Env Vars Starter — `environmentvariabledefinition.xml` |
| `sol_example_flow` | Flows Starter — `Workflows/*.json`, `Customizations.xml`, `Solution.xml` |
| `00000000-0000-0000-0000-000000000001` | Flows Starter — flow filename and XML (placeholder GUID) |
| `[yourid]` | Flows Starter — connection reference names in flow JSON |
| `[sol]` | Flows Starter — placeholder prefix in connection reference logical names in flow JSON |
| `[REPLACE` | Flows Starter — placeholder content in flow JSON; Power Apps Starter — `power.config.json` connection ID |
| `sol_example_item` | Power Apps Starter — `src/services/dataService.ts`, `src/types/ExampleItem.ts` |
| `00000000-0000-0000-0000-000000000000` | Power Apps Starter — `power.config.json` App ID |
| `00000000-0000-0000-0000-000000000001` | Power Apps Starter — `power.config.json` Environment ID |
| `Your App Display Name` | Power Apps Starter — `power.config.json` appDisplayName |
| `sol_ENVIRONMENT_NAME` | Env Vars Starter + Flows Starter — env var definition folder name and flow action `schemaName` |
| `sol_FLOW_ERROR_EMAILS` | Env Vars Starter + Flows Starter — env var definition folder name and flow action `schemaName` |
| `TODO-your-portal` | Power Pages Starter — `client/scripts/deploy.mjs` (`PORTAL_URL`) |
| `TODO-get-from-pac-pages-list` | Power Pages Starter — `powerpages/.../website.yml` (`adx_websiteid`) |

> **Power Pages note:** The Power Pages Starter's own `CLAUDE.md` detects these TODOs automatically at session start and prompts the developer to fill them in. The entries above are for reference — the Power Pages deploy script (`deploy.mjs`) also guards against deploying when `PORTAL_URL` still contains `TODO`.

**If any of these strings are found:**
1. STOP immediately — do not run deploy.ps1
2. Report exactly which files contain unreplaced placeholders
3. Ask the user to confirm they have replaced all placeholders before proceeding
4. Only proceed after explicit user confirmation

**The one exception:** if the user explicitly asks to do a test deploy of the placeholder skeleton (e.g. to verify the template structure works), you may proceed after confirming this is intentional.

### ⚠️ Warning — Placeholder Tables Already Exist in SMKB-Apps-Dev

`sol_example_table_a` and `sol_example_table_b` were deployed to SMKB-Apps-Dev on 2026-05-13 under the `YourSolutionName` solution as a template test. They currently exist in the environment.

**If a developer deploys the Tables Starter without renaming the tables first, the import will SUCCEED** — but this is NOT a success. It means they just pushed placeholder components (with no real schema) to the environment. The deploy.ps1 placeholder guard will block this, but if the guard is bypassed or disabled, the deployment will silently succeed while doing nothing useful.

Do NOT bypass the placeholder guard in `deploy.ps1`. Do NOT mark a Tables Starter deploy as complete unless the solution name and all table names have been replaced.

### Env Vars — RootComponents must be populated

After activating the Env Vars Starter, the `Other/Solution.xml` `<RootComponents>` block must contain a `type="380"` entry for every env var definition folder:

```xml
<RootComponent type="380" schemaName="EVT_PORTAL_BASE_URL" behavior="0" />
```

If `<RootComponents />` is self-closing or empty, env var definitions will be upserted to Dataverse but will **not be linked to the solution** — they will not travel through the pipeline to Stage and Prod. A template comment in `Other/Solution.xml` shows the format.

### Env Vars — Type Codes and the JSON Type Trap

Env var type codes in `environmentvariabledefinition.xml`:
- `100000000` = String
- `100000001` = Number
- `100000002` = Boolean
- `100000003` = JSON

**Never use JSON type for email lists.** Use String with semicolon-separated addresses (e.g. `admin@smkb.ac.il;ops@smkb.ac.il`). JSON-type env vars require `json()` parsing in every expression that reads them. If a wrong-type var is already deployed, reimport cannot change its type — the only fix is: create a replacement var with a new schema name → migrate all references → redeploy → delete the old var.

### Placeholder Detection Command

Run this before any deploy to check a specific starter folder:

```powershell
# Replace $starterPath with the starter folder path
$starterPath = ".\SMKB - Dataverse Tables Starter"
$patterns = 'YourSolutionName','sol_example_table','sol_EXAMPLE_VAR','your-default-value-here','sol_example_flow','00000000-0000-0000-0000-000000000001','\[yourid\]','\[REPLACE','\[sol\]'
Get-ChildItem $starterPath -Recurse -File -Include "*.xml","*.json","*.ts","*.vue","*.yml" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '_dist|node_modules|\.git' } |
    ForEach-Object {
        $file = $_
        try { $c = [System.IO.File]::ReadAllText($file.FullName) } catch { return }
        foreach ($p in $patterns) {
            if ($c -match $p) { Write-Host "PLACEHOLDER FOUND: '$p' in $($file.Name)" }
        }
    }
```

> **Note:** `.ps1` files are excluded to prevent deploy scripts from flagging themselves.

---

## CRITICAL RULE 3 — Confirm Solution Identity Before Deploying

Before any deployment, you must know and confirm with the user:

| Item | Example |
|------|---------|
| Solution Unique Name | `SMKBEvents` |
| Solution Display Name | `SMKB – Events` |
| Solution Short Name (prefix) | `evt` |
| Activated starter folder names | `SMKB - Events Tickets - Dataverse Tables`, etc. |
| Git repository name | `SMKB - Events Tickets - Solution` (GitHub: `SMKB-Events-Tickets-Solution`) |

The short name drives ALL component naming: every table, flow, env var, and related component must be named `[shortName]_component_name`. This prefix prevents collisions between different solutions in the same environment.

**Display name convention:** Every component's human-facing display name must follow `[SHORT_NAME_UPPER] - [Component Display Name]` — uppercase abbreviation, space-hyphen-space separator (e.g. `CFB - Booking Request`, `CFB - Portal Base URL`, `CFB - Booking Submitted`). This applies to Dataverse tables, env var definitions, and cloud flows. Power Apps and Power Pages sites have their own naming conventions — do not apply this pattern to them.

**ASCII hyphens only in XML files:** Never use Unicode en dash (–, U+2013) or em dash in XML `LocalizedName` or `Solution.xml` display names. Hebrew-locale Windows (Windows-1255) misinterprets the UTF-8 en dash bytes as garbled characters (`ג€"`). Always use space-hyphen-space ` - ` (ASCII 0x2D).

| Component type | Schema name example | Display name example |
|---------------|--------------------|--------------------|
| Dataverse table | `cfb_booking_request` | `CFB - Booking Request` |
| Env var | `CFB_PORTAL_BASE_URL` | `CFB - Portal Base URL` |
| Cloud flow | `cfb_booking_submitted` | `CFB - Booking Submitted` |

**Folder naming check:** Before touching any files in a starter, verify the folder has been renamed from its template name to the convention name:
```
SMKB - [Component Name] - [Type Label]
```
where type labels are: `Dataverse Tables`, `Environmental Variables`, `Cloud Flows`, `Power App`, `Power Page`.

If the folder is still named `SMKB - X Starter`, that means the starter has not been activated yet — rename it first, then proceed with the other activation steps.

**Power App and Power Pages naming:** For these two types, the Component Name must describe the **function** of that specific site or app — not just repeat the solution name. The same Component Name must be consistent across all three places:

| Object | Convention | Example |
|--------|-----------|---------|
| Repo folder | `SMKB - [Name] - Power App` / `Power Page` | `SMKB - Events Backoffice - Power App` |
| Power Platform display name | `SMKB - [Name] - Dev` | `SMKB - Events Backoffice - Dev` |
| Portal subdomain (Power Pages only) | `[name-lowercase]-dev` | `events-backoffice-dev` |

If in doubt about what to name a component, ask the user what the site or app is *for* — that answer becomes the Component Name.

---

## CRITICAL RULE 4 — Deployment Order

When a solution uses multiple starters, deploy in this order:
1. **Tables Starter** — creates the table schemas first
2. **Environmental Variables Starter** — creates config variables
3. **Flows Starter** — flows may reference tables and env vars
4. **Power Pages Starter** — uses PAC CLI powerpages commands, not solution import

---

## CRITICAL RULE 5 — Multi-Solution Environment: What Must Be Globally Unique

All SMKB solutions are deployed to the same Power Platform environment (SMKB-Apps-Dev). Some identifiers are **environment-scoped**, not solution-scoped. If two solutions share them, one silently overwrites the other.

### Short Name (prefix) — must be unique across ALL solutions in the environment

The short name (e.g., `evt`) determines the schema name prefix of every component in the solution: tables (`evt_registration`), env vars (`EVT_PORTAL_BASE_URL`), flows (`evt_send_confirmation`). If two solutions share the same short name, their components will collide in Dataverse.

**Before committing to a short name, confirm it is not already in use by another solution deployed to SMKB-Apps-Dev.**

Currently registered short names (update this table when initializing a new solution):

| Short name | Solution |
|-----------|---------|
| `cif` | SMKB – Community Initiatives Fund |

### Environment Variable schema names — environment-scoped

Environment variable `schemaName` values (e.g., `EVT_PORTAL_BASE_URL`) are globally unique within the entire Power Platform environment. If two solutions define an env var with the same schema name, the second import overwrites the first definition. Unique short names prevent this — but only if short names are actually unique.

### Table schema names — environment-scoped

Dataverse table logical names (e.g., `evt_registration`) are globally unique within the environment. Same protection: unique short names prevent collisions.

### Flow names — solution-scoped (NOT a cross-solution conflict risk)

Power Automate flow display names and logical names are scoped within their solution. Two solutions can both contain a flow named `evt_send_confirmation` without conflicting — they live in separate solution containers. No action needed.

### Publisher prefix — intentionally shared

All SMKB solutions use the **same publisher**: `SKMBCore` (prefix `smkb`). This is correct and by design — it provides a consistent org-wide namespace. Do NOT create a new publisher for each solution. The publisher prefix (`smkb_`) is used for shared column names like `smkb_name`.

### Power Pages portals — require GUID freshening before first deploy

Every portal initialized from this starter shares identical hardcoded GUIDs. If two portals are deployed without freshening, the second upload silently overwrites the first portal's records.

Run `guid-freshen.ps1` exactly **once**, before the first deploy, for every new portal. See the Power Pages starter's CLAUDE.md → "GUID Isolation" section for full details.

---

## Connection References — The One Exception to Solution Isolation

Power Platform has one intentional exception to the "each solution owns its own components" rule: **connection references**.

A connection reference is an environment-level pointer to a connection (credentials for a connector). They are **designed to be shared** across solutions. Creating one connection reference per connector type (e.g. one for Office 365 Outlook, one for Dataverse) and reusing it in all flows is correct Power Platform architecture.

**Rules:**
- Do NOT create a new connection reference for every solution or every flow — this creates credential sprawl and maintenance burden
- When replacing the `[yourid]` placeholder in a flow JSON, use the logical name of an **existing** connection reference already in the environment
- Connection references with the same connector type point to the same service account; reusing them across solutions is intentional and correct

**How to find the logical name of an existing connection reference:**

```powershell
# Step 1: find a solution with working flows
pac solution list

# Step 2: export and unpack
pac solution export --name <SolutionUniqueName> --path .\inspect.zip --overwrite
pac solution unpack --zipFile .\inspect.zip --folder .\inspect_unpacked

# Step 3: extract logical names from flow JSON files
Get-ChildItem .\inspect_unpacked\Workflows -Filter "*.json" | ForEach-Object {
    $j = Get-Content $_.FullName | ConvertFrom-Json
    $j.properties.connectionReferences.PSObject.Properties | ForEach-Object {
        [PSCustomObject]@{ Key = $_.Name; ApiName = $_.Value.api.name; LogicalName = $_.Value.connection.connectionReferenceLogicalName }
    }
} | Format-Table -AutoSize

# Step 4: clean up
Remove-Item .\inspect.zip, .\inspect_unpacked -Recurse -Force
```

The `LogicalName` column value (e.g. `shared_office365_abc123def`) is what to use in the flow JSON's `connectionReferences` section.

> **Note:** The `connectionreferences/` folder does NOT exist in unpacked solutions. Connection reference logical names are embedded in the flow JSON under `connectionReferences[*].connection.connectionReferenceLogicalName`.

**After import — if flows are disabled:**
When a solution containing flows is imported, flows are often left in a disabled state until connection references are confirmed. To enable:
1. Go to the Power Automate portal → Solutions → your solution → Cloud Flows
2. For each disabled flow, open it and click "Edit"
3. Confirm the connection reference assignments
4. Save and turn on

---

## Deployment Method Reference

| Starter | Method | Command |
|---------|--------|---------|
| Tables | `pac solution pack` + `pac solution import` | `powershell -ExecutionPolicy Bypass -File deploy.ps1` |
| Env Vars | `pac solution pack` + `pac solution import` | `powershell -ExecutionPolicy Bypass -File deploy.ps1` |
| Flows | Manual zip build + `pac solution import` | `powershell -ExecutionPolicy Bypass -File deploy.ps1` |
| Power Apps | `pnpm build` + `pac code push` | `powershell -ExecutionPolicy Bypass -File deploy.ps1` |
| Power Pages | `pac powerpages upload` | See Power Pages Starter README |

**For Flows:** Do NOT use `pac solution pack` directly — it cannot include Cloud Flow JSONs. Always use the `deploy.ps1` script which builds the zip manually.

**For Power Apps:** Do NOT use `pac solution pack/import`. Code Apps are deployed with `pac code push`. Requires Node 20+ and pnpm 9+. The app record must exist before the first push — `pac code push` updates an existing record, it does NOT create one. **There is no "New Code App" option in the portal.** Use `pac code init --environment "https://org229c958d.crm4.dynamics.com/" --displayName "SMKB - [Component Name] - Dev"` to create the app record and populate `power.config.json` in a single step (delete any existing `power.config.json` first). Never try to create a Code App via the Power Apps portal UI.

`deploy.ps1` also reads **`deploy.config.json`** (in the Power Apps starter folder) for `solutionName` and `targetEnv`. This file ships with `"solutionName": "YourSolutionName"` as a placeholder — replace it with the solution's unique name (e.g. `"SMKBEvents"`) before running `deploy.ps1` for the first time.

**For Power Pages — linking site to solution (after first upload):** The Maker portal "Add Existing → Power Pages" button only adds the site record and silently omits ~200 child components. Use `pac solution add-solution-component` instead:

```powershell
# 1. Add site record
pac solution add-solution-component --solution-unique-name YourSolutionName --component-type powerpagesite --component-id <site-guid>

# 2. Add all child components (extract GUIDs from portal YAML files)
$guids = Get-ChildItem ".\<portal-folder>" -Recurse -Include "*.yml" |
    Select-String -Pattern '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' |
    ForEach-Object { $_.Matches.Value } | Sort-Object -Unique
foreach ($guid in $guids) {
    pac solution add-solution-component --solution-unique-name YourSolutionName --component-type powerpagecomponent --component-id $guid
}

# 3. Add language component
pac solution add-solution-component --solution-unique-name YourSolutionName --component-type powerpagesitelanguage --component-id <site-guid>
```

See INIT_PROJECT.md Step 11 for the full annotated version of this command sequence.

---

## PAC CLI Auth Note

The PAC CLI profile named **"SMKB-Apps-Dev" incorrectly targets `org1dce1895`** (Seminar Hakibutzim College), NOT SMKB-Apps-Dev.

Always use the explicit `--environment` flag:
```powershell
--environment "https://org229c958d.crm4.dynamics.com/"
```

Or rely on the default URL already configured in each `deploy.ps1` (which hardcodes the correct URL).

---

## Environment Reference

> **Deploy scripts in this starter kit only target SMKB-Apps-Dev.** Never pass a Stage or Production URL to any deploy script — the scripts will block it. Stage and Production are managed through Power Platform Pipeline only.

| Environment | URL | Deploy method |
|-------------|-----|---------------|
| SMKB-Apps-Dev | `https://org229c958d.crm4.dynamics.com/` | Direct (`deploy.ps1` / `pnpm deploy`) |
| SMKB-Apps-Stage | — | Power Platform Pipeline only |
| SMKB-Apps-Prod | — | Power Platform Pipeline only |
