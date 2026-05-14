# Init Project — Starting a New Solution

This guide walks through the **one-time setup** required when you clone this starter kit to build a new solution. It is different from starting a regular Claude session on an already-initialized project.

> **Working with Claude?** Say "init project" and Claude will follow this guide step by step.  
> **Working manually?** Follow each step below in order.

---

## Session Start vs Init Project

| | Session Start | Init Project |
|-|--------------|-------------|
| **When** | Every time you open a new Claude session | Once — the first time you clone this starter kit |
| **What happens** | Claude reads project state, confirms active starters, starts work | Disconnects from template remote, gathers specs, creates new repo, builds plan |
| **Trigger** | Just open Claude — it reads CLAUDE.md automatically | Say "init project" to Claude, or follow this guide manually |
| **Governed by** | CLAUDE.md Critical Rule 1 | This file (INIT_PROJECT.md) |

**Rule:** do not run Init Project on a repo that has already been initialized. If the git remote already points to a solution-specific repo (not the starter kit), you are in a regular session — just start working.

---

## Before You Start — Prerequisites

Verify all tools are installed before beginning:

```powershell
node --version    # Must be 20+
pnpm --version    # Must be 8+  (npm i -g pnpm if missing)
pac --version     # PAC CLI     (download from Microsoft if missing)
```

**PAC CLI authentication:**

```powershell
pac auth list
```

The active profile (`*`) must target `https://org229c958d.crm4.dynamics.com/` (SMKB-Apps-Dev). If no profile exists:

```powershell
pac auth create --url https://org229c958d.crm4.dynamics.com/
```

> **Warning:** The PAC profile named "SMKB-Apps-Dev" incorrectly targets `org1dce1895` (Seminar Hakibutzim College), NOT SMKB-Apps-Dev. Always verify the active profile URL before proceeding. If the wrong profile is active: `pac auth select --index <N>` where N is the index from `pac auth list`.

---

## The Steps

### Step 1 — Confirm this is a fresh clone

First, record the current remote URL so you know exactly what you're removing:

```powershell
git remote get-url origin
```

Expected output for a fresh clone:
```
https://github.com/SMKB-AC-IL/SMKB-Power-Platform-Solution-Starter-Kit.git
```

If the output already points to a solution-specific repo (e.g. `SMKB-Events-Tickets-Solution`), Init Project has already been run — stop here and start a regular session instead.

---

### Step 2 — Gather solution identity

Collect the following from the developer:

| Item | Format | Example |
|------|--------|---------|
| **Solution name** | Human display name, title case | `Events Tickets` |
| **Solution unique name** | PascalCase, no spaces, no underscores | `SMKBEventsTickets` |
| **Solution display name** | With org prefix and dash | `SMKB – Events Tickets` |
| **Short name (prefix)** | 2–5 lowercase letters only, no numbers | `evt` |

Derived values (confirm with the developer):
- Local folder / repo name: `SMKB - [Solution Name] - Solution`  
  Example: `SMKB - Events Tickets - Solution`
- GitHub repo name: `SMKB-[SolutionName]-Solution`  
  Example: `SMKB-Events-Tickets-Solution`

**Validation rules:**
- Unique name must be alphanumeric, PascalCase, max 50 characters
- Short name must be 2–5 lowercase letters only — no numbers, no underscores, no hyphens
- Short name drives ALL component naming for this solution — every table, flow, and env var will be prefixed with it

> **Component-level names (Power Pages and Power Apps)** are collected in Step 8 when you gather specifications. Each Power Pages site and each Power App gets its own **Functional Component Name** — a short phrase describing what that specific site or app does, not just the solution name repeated. A single solution can have multiple sites and multiple apps, each with a different name.

---

### Step 3 — Remove the starter kit remote

This is the most important step. Removing the origin prevents any solution-specific work from ever being pushed back to the shared template repo.

```powershell
git remote remove origin
```

Verify it is gone:
```powershell
git remote -v
# Expected: (no output)
```

---

### Step 4 — Create the new GitHub repository

Create a **private** repository in the SMKB-AC-IL GitHub organization.

**Option A — using the `gh` CLI (recommended if installed):**
```powershell
# Replace SMKB-Events-Tickets-Solution with your derived repo name
gh repo create SMKB-AC-IL/SMKB-Events-Tickets-Solution --private
```

**Option B — manually on GitHub:**
1. Go to [github.com/SMKB-AC-IL](https://github.com/SMKB-AC-IL)
2. Click **New repository**
3. Name: `SMKB-Events-Tickets-Solution` (use the derived GitHub repo name from Step 2)
4. Visibility: **Private**
5. **Do NOT** add a README, .gitignore, or license — the repo must be empty
6. Copy the HTTPS clone URL

---

### Step 5 — Connect to the new repo and push

```powershell
# Replace the URL with your new repo's HTTPS URL
git remote add origin https://github.com/SMKB-AC-IL/SMKB-Events-Tickets-Solution.git

# Stage everything (all starter folders + root governance files)
git add -A

# Initial commit
git commit -m "Initial commit: Events Tickets initialized from SMKB Power Platform Solution Starter Kit"

# Push and set tracking branch
git push -u origin main
```

Verify the remote is set correctly:
```powershell
git remote -v
# Expected: origin  https://github.com/SMKB-AC-IL/SMKB-Events-Tickets-Solution.git (fetch)
#           origin  https://github.com/SMKB-AC-IL/SMKB-Events-Tickets-Solution.git (push)
```

---

### Step 6 — Starters are determined by specifications

Do NOT select starters before gathering specifications — choosing starters from a generic checklist before understanding the solution leads to wrong activations (e.g. activating Flows before confirming any flows are actually needed).

**Starters are activated in Step 9, after specifications are gathered in Step 8.** The agent derives which starters to activate from the spec content:

| If the solution needs... | Activate... |
|--------------------------|------------|
| Custom Dataverse tables | Dataverse Tables Starter |
| Config values that differ per environment | Environmental Variables Starter |
| Automated flows or Power Pages-triggered logic | Cloud Flows Starter |
| Staff/admin-facing interface inside Power Apps | Power Apps Starter |
| Public-facing or internal web portal | Power Pages Starter |

Starters that are NOT activated must remain completely untouched — do not rename them, do not modify any files, do not deploy them.

---

### Step 7 — Rename activated starter folders

For each selected starter, rename its folder from the template name to the solution-specific name:

```
SMKB - X Starter  →  SMKB - [Component Name] - [Type Label]
```

### Tables, Env Vars, and Flows — use the Solution Name as the Component Name

These are solution-wide resources. Their Component Name is simply the solution name:

| Starter | Type Label | Example rename |
|---------|-----------|---------------|
| Dataverse Tables Starter | `Dataverse Tables` | `SMKB - Events Tickets - Dataverse Tables` |
| Environmental Variables Starter | `Environmental Variables` | `SMKB - Events Tickets - Environmental Variables` |
| Power Automate Flows Starter | `Cloud Flows` | `SMKB - Events Tickets - Cloud Flows` |

### Power App and Power Pages — use a Functional Component Name

These components are NOT named after the solution — they are named after what they **do**. The Component Name must describe the specific purpose of that app or site.

| Starter | Type Label | Component Name | Example rename |
|---------|-----------|---------------|----------------|
| Power Apps Starter | `Power App` | What the app is for (e.g. staff backoffice) | `SMKB - Events Backoffice - Power App` |
| Power Page Starter | `Power Page` | What the site is for (e.g. public RSVP form) | `SMKB - Events RSVP - Power Page` |

The Component Name you choose here must be consistent across three places:

| Object | Convention | Example |
|--------|-----------|---------|
| Repo folder | `SMKB - [Name] - Power App` / `Power Page` | `SMKB - Events Backoffice - Power App` |
| Power Platform display name | `SMKB - [Name] - Dev` | `SMKB - Events Backoffice - Dev` |
| Portal subdomain (Power Pages only) | `[name-lowercase]-dev` | `events-backoffice-dev` → `events-backoffice-dev.powerappsportals.com` |

**Multiple sites and apps:** A solution can have more than one Power Pages starter and more than one Power Apps starter. Each gets its own descriptive name — never reuse the same folder for two different functions:

```
SMKB - Events RSVP - Power Page          <- public registration form
SMKB - Events Admin Portal - Power Page  <- staff event management portal
SMKB - Events Backoffice - Power App     <- internal management app
```

Renaming does not break any deploy script — all scripts use `$PSScriptRoot`.

---

### Step 7b — Freshen Power Pages GUIDs (Power Pages only)

> **Skip this step if the Power Pages starter was NOT activated.**

**Why this step exists:** Every portal initialized from this starter kit starts with identical hardcoded GUIDs. When `pac pages upload` runs, it upserts Dataverse records by primary key. If two portals share the same GUIDs, the second upload silently steals records from the first portal, breaking both. This has already happened in production (May 2026). This step replaces every portal-scoped GUID with fresh random GUIDs so your portal is completely isolated.

**Before running these scripts**, make sure:
1. The portal folder has been renamed (Step 7 is complete)
2. `adx_websiteid` in `website.yml` has been set to the real GUID from `pac pages list`

```powershell
# Replace <your-portal-folder> with the renamed folder (e.g. smkb---events-rsvp-dev)
powershell -ExecutionPolicy Bypass -File "SMKB - Events RSVP - Power Page\powerpages\<your-portal-folder>\guid-freshen.ps1"
powershell -ExecutionPolicy Bypass -File "SMKB - Events RSVP - Power Page\powerpages\<your-portal-folder>\verify-consistency.ps1"
```

If `verify-consistency.ps1` reports errors, fix them before continuing.

> **Warning:** Run `guid-freshen.ps1` exactly once per portal — before the first deploy and never again. Running it a second time generates new GUIDs that no longer match what is in Dataverse, breaking the live site.

---

### Step 8 — Gather solution specifications

For each activated starter, collect enough detail to drive placeholder replacements and implementation. Ask the developer:

**For each Table:**
- Entity name and display name (e.g., `evt_session`, "CIF Session" — include a solution prefix in the display name to avoid ambiguity in shared environments)
- Key fields: name, type, required/optional
- Relationships to other tables (if any)

**For each Environment Variable:**
- Variable name following `[PREFIX]_VAR_NAME` convention (e.g., `EVT_PORTAL_BASE_URL`)
- Type: String / Number / Boolean / JSON / Secret
- Default value (or none if environment-specific)
- Purpose

**For each Cloud Flow:**
- Flow name following `[prefix]_flow_name` convention (e.g., `evt_send_confirmation`)
- Trigger type: Power Pages form submission, scheduled, or other
- What it does: the logic, recipients, subject/body
- Input parameters (if triggered from Power Pages)

**For each Power App:**
- **Functional Component Name** — the name chosen in Step 7 (e.g. `Events Backoffice`)
- **App display name in Power Platform** — `SMKB - [Functional Component Name] - Dev` (e.g. `SMKB - Events Backoffice - Dev`)
- Which Dataverse tables it reads and writes
- Key screens and their purpose

**For each Power Pages site:**
- **Functional Component Name** — the name chosen in Step 7 (e.g. `Events RSVP`)
- **Portal display name in Power Platform** — `SMKB - [Functional Component Name] - Dev` (e.g. `SMKB - Events RSVP - Dev`)
- **Portal subdomain** — `[functional-component-name]-dev` in lowercase with hyphens (e.g. `events-rsvp-dev`)
- **Site address** — `[subdomain].powerappsportals.com` (e.g. `events-rsvp-dev.powerappsportals.com`)
- Key pages and forms
- Auth requirements: public access vs Azure AD

---

### Step 9 — Build the implementation plan

Using the specifications from Step 8, build a structured plan covering:

1. **Solution identity summary** — all the values gathered in Step 2 in one place
2. **Starters to activate** — derived from Step 8 specs, with the folder rename for each
3. **Per-starter replacement checklist** — exact string-by-string placeholder replacements for each activated starter
4. **Schema details** — table column definitions, flow logic pseudocode, env var defaults
5. **Development sequence** — which starter to implement first (follow Critical Rule 4 in CLAUDE.md: Tables -> Env Vars -> Flows -> Power Pages)

Present the complete plan to the developer for confirmation before beginning any implementation.

---

### Step 10 — Post-implementation placeholder scan

After all placeholder replacements are done for every activated starter, run a full scan to verify nothing was missed:

```powershell
$patterns = @(
    'YourSolutionName', 'Your Solution Name',
    'sol_example_table', 'sol_EXAMPLE_VAR', 'your-default-value-here',
    'sol_example_flow', '00000000-0000-0000-0000-000000000001',
    '\[yourid\]', '\[REPLACE', '\[sol\]',
    'sol_example_item', 'Your App Display Name',
    'TODO-your-portal', 'TODO-get-from-pac-pages-list'
)
Get-ChildItem "." -Recurse -File -Include "*.xml","*.json","*.ts","*.vue","*.ps1","*.html","*.yml" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '_dist|node_modules|\.git' } |
    ForEach-Object {
        $file = $_
        foreach ($p in $patterns) {
            if ((Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue) -match $p) {
                Write-Host "PLACEHOLDER FOUND: '$p' in $($file.Name)"
            }
        }
    }
```

If the command outputs nothing, all placeholders are replaced.

---

### Step 11 — Add Power Pages site to solution (if Power Pages was activated)

After `pnpm deploy` for the Power Pages starter, the site record exists in Dataverse but is NOT yet linked to the Power Platform solution. Without this step, the site will not travel through the pipeline to Stage and Prod.

In Power Apps Maker ([make.powerapps.com](https://make.powerapps.com)):
1. Open your solution
2. Click **Add Existing**
3. Select **Power Pages** -> select your newly deployed site
4. Save

This links the site record to the solution so it is included in the next pipeline promotion.

---

### Step 12 — Commit the initialized state

After folder renames are done (Step 7), the scan is clean (Step 10), and the Power Pages linkage is done (Step 11):

```powershell
git add -A
git commit -m "chore: activate starters and rename folders for [Solution Name]"
git push
```

This marks the boundary between "initialized from template" and "active development". All future commits are solution-specific work.

---

## After Init Project — Regular Development

From this point on, every new Claude session is a **regular session start**:
- Claude reads CLAUDE.md, checks which starters are active, confirms solution identity
- Claude will NOT offer to run Init Project again (the remote no longer points to the starter kit)
- Development, placeholder replacement, and deployment follow the normal workflow in each starter's README

See [CLAUDE.md](CLAUDE.md) for the complete rules governing regular sessions.
