# Init Project — Starting a New Solution

## Agent Standing Instruction — Log Everything

> **Read this before starting any step.**

As you work through this flow, **record any of the following in [`STARTER_AGENT_FEEDBACK_AND_NOTES.md`](STARTER_AGENT_FEEDBACK_AND_NOTES.md)**:

- Any step that required a workaround or clarification not covered by these instructions
- Any error or unexpected output you encountered and how you resolved it
- Any instruction that was ambiguous, missing, or wrong
- Any improvement that would make a step smoother for the next agent or developer
- Anything that took more back-and-forth with the user than it should have

**Format for each entry:**

```
## [YYYY-MM-DD] — [Solution name being initialized]

### Issue / Observation
[What happened]

### Step
[Which Init Project step this occurred in]

### Resolution
[What you did to fix or work around it]

### Suggested improvement
[What should change in the starter kit or INIT_PROJECT.md to prevent this]
```

Log entries as you encounter them — do not wait until the end. If the init completes with no issues, add a short "No issues" entry so we know the run was clean.

---

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

## Who Does What

Init Project is a collaboration between the agent and the developer. The agent handles all file changes and can run deploy commands when you explicitly request them. Some actions require the developer to act locally because they involve browser interaction, credentials, or one-time machine setup.

| Task | Agent | Developer |
|------|-------|-----------|
| Rename starter folders | ✓ | |
| Fill `solution.config.json` + run `apply-config.ps1` (identity) | ✓ | |
| Author schema/flow/content details in each starter | ✓ | |
| `pac --version` / `pac auth list` (verify setup) | Tries first | Run manually + paste output if agent's shell can't find `pac` |
| `pac pages list` (get site GUID) | Tries first | Run manually + paste output if agent's shell can't find `pac` |
| `pac auth select` / `pac auth create` (change active profile) | — | Must run locally — blocked in agent settings |
| `pnpm install` / `npm install` in starter folders (Step 5b) | — | Must run locally — required before first commit touching .vue/.ts |
| Run `deploy.ps1` / a starter's deploy flow | When you say "deploy" | Confirm auth is correct first |
| Provision + deploy the Power Pages Code Site (`/ppcs-provision-site`, `/ppcs-deploy`) | Drives the skills | Runs local PowerShell/`pac`, visits portal in browser |
| Set env var values in Maker portal | — | Power Apps Maker → Solutions → your solution → Env Vars |
| Confirm flow connection references + turn on flows | — | Power Automate portal → Solutions → your solution → Cloud Flows |
| Create app record (`pac code init`) | — | Must run locally before first push |
| Stage and push commits | When you say "commit" / "push" | Confirm each time |

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

> **Note for the agent:** Run `pac --version` and `pac auth list` now using the **PowerShell tool** (not the Bash tool) — PAC CLI is a Windows executable and is only available in the Windows PowerShell PATH, not in the bash shell. Both commands are permitted in agent settings. If they still fail (PAC CLI not installed), do not skip this step — tell the developer, ask them to run the commands in their own PowerShell terminal, and paste the output back so you can read it and continue.
>
> `pac auth select` is blocked in agent settings. If the wrong profile is active, you cannot fix it yourself — stop and ask the developer to run `pac auth select --index <N>` before you proceed.

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

Collect the following from the developer. These are exactly the values you will enter into
[`solution.config.json`](solution.config.json) in Step 7b:

| Item | Format | Example |
|------|--------|---------|
| **Solution name** | Human display name, title case | `Events Tickets` |
| **Solution unique name** | PascalCase, no spaces, no underscores | `SMKBEventsTickets` |
| **Solution display name** | With org prefix and ASCII hyphen | `SMKB - Events Tickets` |
| **Short name (prefix)** | 2–5 lowercase letters only, no numbers | `evt` |
| **Target environment** | Dataverse URL + environment ID | `https://org229c958d.crm4.dynamics.com/` |

Derived values (confirm with the developer):
- Local folder / repo name: `SMKB - [Solution Name] - Solution` — e.g. `SMKB - Events Tickets - Solution`
- GitHub repo name: derived from the **human display name**, not the PascalCase unique name — e.g. "Events Tickets" → `SMKB-Events-Tickets-Solution` ✓ (NOT `SMKB-EventsTickets-Solution` ✗)

**Validation rules:**
- Unique name: alphanumeric, PascalCase, max 50 characters
- Short name: 2–5 lowercase letters only — no numbers, underscores, or hyphens; must be unique across all solutions in SMKB-Apps-Dev (see CLAUDE.md → Critical Rule 5)
- **Display names use ASCII hyphens only** (` - `), never a Unicode en/em dash — see CLAUDE.md → Critical Rule 3

> **Component-level names (Power Pages and Power Apps)** are collected in Step 8. Each Power Pages Code Site and each Power App gets its own **Functional Component Name** — a short phrase describing what that specific site or app does. A single solution can have multiple sites and multiple apps, each with a different name.

---

### Step 3 — Remove the starter kit remote

This is the most important step. Removing the origin prevents any solution-specific work from ever being pushed back to the shared template repo.

> **If you copied files into this folder rather than cloning directly:** Run `git init && git branch -M main` first — there is no remote to remove, but you still need a git repository before adding the new one in Step 5.

```powershell
git remote remove origin
```

Verify it is gone:
```powershell
git remote -v
# Expected: (no output)
```

---

### Step 3b — Remove the onboarding folder

The `onboarding SMKB Apps Development/` folder is a local developer learning tool. It must not be pushed to any solution repository.

Ask the developer to run:
```powershell
Remove-Item -Recurse -Force "onboarding SMKB Apps Development"
```

Verify it is gone:
```powershell
Test-Path "onboarding SMKB Apps Development"
# Expected: False
```

---

### Step 4 — Create the new GitHub repository

Create a **private** repository in the SMKB-AC-IL GitHub organization:

1. Go to [github.com/SMKB-AC-IL](https://github.com/SMKB-AC-IL)
2. Click **New repository**
3. Name: use the GitHub repo name derived in Step 2 (e.g. `SMKB-Events-Tickets-Solution`)
4. Visibility: **Private**
5. **Do NOT** add a README, .gitignore, or license — the repo must be empty
6. Click **Create repository** and copy the HTTPS clone URL

Tell the developer exactly which name to use, then wait for them to confirm the repo is created before moving to Step 5.

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
# Expected: origin  https://github.com/SMKB-AC-IL/SMKB-Events-Tickets-Solution.git (fetch/push)
```

---

### Step 5b — Enable git hooks and install dependencies

Run once to activate the repo-wide pre-commit gate for this working copy:

```powershell
git config core.hooksPath .githooks
```

This tells Git to use the root `.githooks/` folder instead of `.git/hooks/`. The one root hook then, on each commit: lints staged `.vue`/`.ts`/`.tsx` files with each starter's own ESLint; runs `flow-lint` on staged Cloud Flows files (once the solution is initialized); runs `apply-config.ps1 -Check` (fails if a starter config has drifted from `solution.config.json`); and runs `scripts/check-doc-boundaries.mjs` (fails on retired-architecture references or broken doc links). Steps skip gracefully when their toolchain isn't installed.

> **Note:** This is a local git config setting. Every developer who clones this repo runs it once.

**Install dependencies for the activated code starters (required for the lint gate):**

The lint gate calls each starter's local ESLint, which needs `node_modules`. Install in every activated starter that has a `package.json`:

```powershell
# Power Apps — pnpm, at the starter root
cd "SMKB - [Your App Name] - Power App"
pnpm install

# Power Pages Code Site — npm, at the starter root (it is a flat project, no client/ subfolder)
cd "SMKB - [Your Site Name] - Power Pages Code Site"
npm install
```

Skip this for starters without a `package.json` (Tables, Env Vars, Flows).

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
| Public-facing or internal web portal | Power Pages Code Site Starter |

Starters that are NOT activated must remain completely untouched — do not rename them, modify files, or deploy them.

---

### Step 7 — Choose the activated starters' names

Each activated starter's folder becomes `SMKB - [Component Name] - [Type Label]`:

```
SMKB - X Starter  →  SMKB - [Component Name] - [Type Label]
```

> **Do NOT rename a folder by hand.** Decide the names here, put them in `solution.config.json`,
> and let **Step 7b** (`apply-config.ps1`) perform the renames. Renaming manually breaks every
> piece of root tooling that addresses a starter — and it breaks it *silently*: `apply-config.ps1`
> writes nothing and `-Check` reports "No drift" (it found no files to compare), the pre-commit
> lint dispatch stops matching any staged file, and `check-doc-boundaries.mjs` hard-fails on the
> now-broken doc links so you cannot commit at all. The script renames the folders **and** fixes
> the doc links in one atomic run.

**Where each folder name comes from:**

| Starter folder | Component Name is taken from |
|---|---|
| `… - Dataverse Tables` / `… - Environmental Variables` / `… - Cloud Flows` | `solutionDisplayName`, minus the leading `SMKB - ` |
| `… - Power App` | `powerApps.componentName` (falls back to `appDisplayName` minus `SMKB - ` / ` - Dev`) |
| `… - Power Pages Code Site` | `powerPages.siteName` |

> **Multiple apps or sites:** `apply-config.ps1` derives names for exactly **one** Power App and
> **one** Power Pages Code Site. A solution with two of either must name the second folder by hand,
> and that folder is **not** covered by the `-Check` drift gate. If multi-app solutions become
> common, a `components: []` array in `solution.config.json` is the clean fix.

**Tables, Env Vars, and Flows — use the Solution Name as the Component Name** (they are solution-wide resources):

| Starter | Type Label | Example rename |
|---------|-----------|---------------|
| Dataverse Tables Starter | `Dataverse Tables` | `SMKB - Events Tickets - Dataverse Tables` |
| Environmental Variables Starter | `Environmental Variables` | `SMKB - Events Tickets - Environmental Variables` |
| Power Automate Flows Starter | `Cloud Flows` | `SMKB - Events Tickets - Cloud Flows` |

**Power App and Power Pages Code Site — use a Functional Component Name** (named after what they **do**, not the solution):

| Starter | Type Label | Example rename |
|---------|-----------|----------------|
| Power Apps Starter | `Power App` | `SMKB - Events Backoffice - Power App` |
| Power Pages Code Site Starter | `Power Pages Code Site` | `SMKB - Events RSVP - Power Pages Code Site` |

The Component Name must be consistent across:

| Object | Convention | Example |
|--------|-----------|---------|
| Repo folder | `SMKB - [Name] - Power App` / `Power Pages Code Site` | `SMKB - Events Backoffice - Power App` |
| Power Platform display name | `SMKB - [Name] - Dev` | `SMKB - Events Backoffice - Dev` |
| Power Pages `solution.ts` `siteName` (the **bare** name — apply-config derives `[PREFIX] - [Name]`; do not pre-prefix) | `[Name]` | `Events RSVP` → site becomes `EVT - Events RSVP` |

**Multiple sites and apps:** a solution can have more than one of each — give each its own descriptive name; never reuse one folder for two functions. Renaming does not break any deploy script (all use `$PSScriptRoot`).

---

### Step 7b — Fill the solution config and apply it (this performs the Step 7 renames)

> **Skills ship with the kit.** The starter provides `/slash` skills for the build/deploy/quality steps
> below (auto-discovered from `.claude/skills/`, directory-scoped — see CLAUDE.md → "Skills"). Prefer them
> over doing the task by hand. If a skill isn't in the `/` menu yet, restart Claude Code. This step has one:
> **`/solution-config`** (interviews for identity, validates the rules, and runs apply-config for you).

Solution identity lives in one file: [`solution.config.json`](solution.config.json). Fill it with the
values from Step 2 (and the app/site names from Steps 7–8), set the `activate` flags for the starters
you renamed, then push everything into the starters at once (or just run **`/solution-config`**):

```powershell
# 1. Edit solution.config.json — set solutionUniqueName, solutionDisplayName, shortPrefix,
#    targetEnvUrl, environmentId, activate flags, powerApps.appDisplayName, powerPages.* names.

# 2. Preview, then apply
powershell -ExecutionPolicy Bypass -File apply-config.ps1 -DryRun
powershell -ExecutionPolicy Bypass -File apply-config.ps1
```

`apply-config.ps1` does **three** things, in this order:

1. **Writes identity** — solution name, display names, short prefix, environment, Power Apps app
   display name, Power Pages site name/titles + `SOLUTION_UNIQUE_NAME`, and the ALM env-var schema
   names (`smkb_sol_EnvironmentName` / `smkb_sol_FlowErrorEmails` → `smkb_<prefix>_…`).
2. **Renames the activated starter folders** (the Step 7 names) — non-activated starters keep their
   template names, untouched.
3. **Fixes the starter links in the root docs** so `check-doc-boundaries.mjs` still passes.

Renames run **last**, after every content write has addressed each starter at its pre-rename path.
`-DryRun` lists the renames and pointer updates before anything moves, and `-Check` reports a
pending rename or a stale doc pointer as drift — so the fix is always "run apply-config".

> **Restart Claude Code after a run that renames folders.** Directory-scoped skills are discovered
> once per session, so `/dvt-*`, `/env-*`, `/flow-*`, `/pa-*` and `/ppcs-*` keep resolving to the
> old paths and every relative link inside them points into a folder that no longer exists. The
> script prints this reminder when it renames anything.

It deliberately
leaves platform-assigned placeholders (app IDs, workflow GUIDs, site-setting GUIDs, connection
references, table/flow scaffold names) untouched — those are resolved in Steps 9–10b. Re-running is
safe and idempotent.

> After this step, `apply-config.ps1 -Check` should report **no drift**. The pre-commit hook runs the
> same check, so identity can never silently diverge between the root config and a starter.

---

### Step 8 — Gather solution specifications

For each activated starter, collect enough detail to drive implementation. Ask the developer:

**For each Table:** schema name `smkb_<prefix>_<PascalName>` (e.g. `smkb_evt_Session`) and display name `EVT - Session`, key fields (name, type, required/optional), relationships to other tables. (See CLAUDE.md → Critical Rule 3 for the naming rule + the Dataverse lowercase-logical-name nuance.)

**For each Environment Variable:** schema name `smkb_<prefix>_<PascalName>` (e.g. `smkb_evt_PortalBaseUrl`), display `EVT - Portal Base URL`, type (String / Number / Boolean — **use String + semicolons for lists, never JSON**; see CLAUDE.md → Critical Rule 5), default value (or none if environment-specific), purpose.

**For each Cloud Flow:** schema name `smkb_<prefix>_<PascalName>` (e.g. `smkb_evt_SendConfirmation`), display `EVT - Send Confirmation`, trigger type (Power Pages request, scheduled, Dataverse row), what it does (logic, recipients, subject/body), input parameters. Power Pages-triggered flows follow the HTTP 200 + `errorCode` contract — see the Power Pages starter's [flow-error contract](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/docs/FLOW-ERROR-CONTRACT.md).

**For each Power App:** Functional Component Name (Step 7), app display name `SMKB - [Name] - Dev`, which Dataverse tables it reads/writes, key screens.

**For each Power Pages Code Site:** Functional Component Name (Step 7), the **bare** site name (goes into `src/config/solution.ts` `siteName`; apply-config derives `[PREFIX] - [Name]`), app title(s) and languages, which tables/flows it uses, and auth requirements. See the [Power Pages Getting Started guide](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/GETTING-STARTED.md).

---

### Step 9 — Build the implementation plan (Plan Mode)

> **Agent instruction:** Enter plan mode now using the `EnterPlanMode` tool before writing anything. Do not make file changes until the developer approves the plan.

Using the Step 8 specs, build a structured plan covering:

1. **Solution identity summary** — the values now in `solution.config.json` (already applied in Step 7b)
2. **Starters to activate** — derived from the specs, with the folder rename for each
3. **Content authoring checklist** — per starter, the work that is *not* identity: table column definitions, flow logic, env var defaults, Power Pages pages/flows. Identity placeholders are already handled by `apply-config.ps1`; what remains is the platform-assigned values below and the actual solution content.
4. **Development sequence** — Critical Rule 4 order: Tables → Env Vars → Flows → Power Apps → Power Pages Code Site

> **Power Apps — app record must exist before first deploy.** `pac code push` does NOT create app records. `pac code init` has no `--path` flag — run it from inside the Power App folder:
> ```powershell
> Push-Location ".\SMKB - [Component Name] - Power App"
> # Delete power.config.json first if it already exists
> pac code init --environment "https://org229c958d.crm4.dynamics.com/" --displayName "SMKB - [Component Name] - Dev"
> Pop-Location
> ```
> After `pac code init`, `appId` in `power.config.json` will be `null` — expected; it is populated on the first push. Then re-run `apply-config.ps1` so the app display name / environment stay in sync.

> **Cloud Flows — connection references** are shared, environment-level resources. Use the named SMKB connection-reference bank documented in the [Flows README](SMKB%20-%20Power%20Automate%20Flows%20Starter/README.md); only fall back to the export/unpack lookup (CLAUDE.md → "Connection References") if a needed connector is not already in the bank. Do NOT create a new connection reference per solution.

> **Content display names** follow `[SHORT_NAME_UPPER] - [Name]` (e.g. `EVT - Booking Request`). `apply-config.ps1` already set the `SOL - ` prefix on the ALM env vars; apply the same convention to the table/flow display names you author.

Write the full plan to the plan file, then call `ExitPlanMode`. Do not begin Steps 10–12 until the developer approves.

---

### Step 10 — Pre-deploy verification

Identity and boundaries are enforced by tooling — run all three; each must pass (or run **`/pre-deploy-verify`**, which runs them together):

```powershell
# 1. No config drift between solution.config.json and any starter
powershell -ExecutionPolicy Bypass -File apply-config.ps1 -Check

# 2. Root docs stay within their boundary (no retired architecture, no broken links)
node scripts/check-doc-boundaries.mjs
```

Then, for each activated starter, its own `deploy.ps1` (or deploy flow) runs a placeholder guard that
blocks deploy while its platform placeholders remain (app IDs, workflow GUIDs, table/flow scaffold
names, site-setting GUIDs). Do not bypass those guards — resolve the placeholders instead. The exact
tokens and how to resolve them are documented in each starter's own README.

---

### Step 10b — Deploy each activated starter

Deploy **one starter at a time**, in Critical Rule 4 order (Tables → Env Vars → Flows → Power Apps → Power Pages Code Site). Do not proceed to the next until the current is confirmed working. After each deploy, the agent must log the outcome (mandatory).

> **`/deploy-solution`** orchestrates this entire ordered sequence (each starter via its own deploy skill,
> the manual portal handoffs, and the mandatory `10b.F` logging). The per-starter skills it calls —
> **`/dvt-deploy`** (runs `guid-freshen` once), **`/flow-deploy`** (draft-vs-published check),
> **`/pa-init`** (create the app record) — can also be run individually.

> **Env vars and flows must be configured before Power Pages or Power Apps can use them.**

#### Dataverse Tables (skip if not activated)

```powershell
powershell -ExecutionPolicy Bypass -File "SMKB - [Solution Name] - Dataverse Tables\deploy.ps1"
```

Developer action: Verify tables appear in [make.powerapps.com](https://make.powerapps.com) → **Dataverse → Tables**.

> **10b.F — Tables:** Append an entry to [`STARTER_AGENT_FEEDBACK_AND_NOTES.md`](STARTER_AGENT_FEEDBACK_AND_NOTES.md): did `deploy.ps1` complete cleanly? did `guid-freshen.ps1` run once beforehand? are tables visible in the Maker portal? any guard false positives or unclear instructions?

#### Environmental Variables (skip if not activated)

```powershell
powershell -ExecutionPolicy Bypass -File "SMKB - [Solution Name] - Environmental Variables\deploy.ps1"
```

Developer action: Set runtime values — **Power Apps Maker → Solutions → your solution → Environment Variables → each → Edit → Add current value**.

> **10b.F — Env Vars:** Append an entry: did deploy complete? were all definitions visible after import? any `RootComponents`/schema-name issues? anything unclear?

#### Cloud Flows (skip if not activated)

```powershell
powershell -ExecutionPolicy Bypass -File "SMKB - [Solution Name] - Cloud Flows\deploy.ps1"
```

Developer action: For each flow — **Power Automate portal → Solutions → your solution → Cloud Flows → open → Edit → confirm connection references → Save → Turn on**. Flows import disabled; enable each manually.

> **10b.F — Flows:** Append an entry: did deploy complete? were flows visible? did the connection-reference wiring work? any JSON/`Customizations.xml` issues? anything unclear?

#### Power Apps (skip if not activated)

```powershell
Push-Location "SMKB - [Component Name] - Power App"
# First time only — developer must run locally:
# pac code init --environment "https://org229c958d.crm4.dynamics.com/" --displayName "SMKB - [Component Name] - Dev"
powershell -ExecutionPolicy Bypass -File deploy.ps1
Pop-Location
```

> **10b.F — Power Apps:** Append an entry: did `pac code init` populate `power.config.json`? did `deploy.ps1` (build + push) complete? was the app visible in the environment? any build/push errors? anything unclear?

#### Power Pages Code Site (skip if not activated)

The Code Site provisions and deploys through its own skills — the agent drives them; the developer runs the local `pac`/browser steps they require:

1. **Provision (first time):** run **`/ppcs-provision-site`** — creates the site, runs the starter's `scripts/freshen-site-settings.ps1`, and applies the post-provision settings. Follow the [Getting Started guide](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/GETTING-STARTED.md).
2. **Register flows:** for each Power Automate flow the site calls, run **`/ppcs-register-flow`** to add its trigger GUID to `src/config/flows.ts`.
3. **(Optional) table access:** to read/write a Dataverse table directly from the SPA, run **`/ppcs-enable-web-api`**.
4. **Deploy:** run **`/ppcs-deploy`** (builds and uploads via `pac pages upload-code-site`).
5. **Verify:** open the site URL in a browser; the Vue app should load.
6. **Convert the site to Production — do this now, not later. MANDATORY.**
   Every Power Pages site is created as a **trial in every environment type**, and an unconverted
   site is suspended at day 90 (30 in a trial environment) with its **host deleted** 7 days later —
   URL, configuration and web files gone. The clock runs from *site creation*, not last use, so an
   actively developed site still expires.
   [Power Platform Admin Center](https://admin.powerplatform.microsoft.com) →
   **Manage → Power Pages** → select the site → **Convert to production**, then confirm with
   `pac pages list -v` that it no longer reports `Trial`. Requires an admin role and available
   Power Pages capacity; a site in a **developer/trial environment cannot be converted** (migrate
   it first). `/ppcs-provision-site` Phase 5 walks through and verifies this.
7. **Reconcile the site into the solution — MANDATORY.**
   `pac pages upload-code-site` creates the site and its components as **loose Dataverse records**;
   solution membership is a separate act that nothing else performs. A Power Platform Pipeline
   promotes only what the solution contains, so a missing component means the promotion
   **succeeds** and delivers a quietly misconfigured site to Stage/Prod — nothing fails at Dev
   time. `/ppcs-deploy` step 7 runs this (and `npm run deploy` chains it as `npm run solution:sync`):
   ```powershell
   powershell -ExecutionPolicy Bypass -File "SMKB - [Solution Name] - Power Pages Code Site\scripts\add-site-to-solution.ps1"
   ```
   Two separate gaps: the **site record** is not in the solution, and neither are its
   **components** — `--AddRequiredComponents` does *not* pull them in. Re-run before every
   promotion: any later site-config change (one site setting, one CSP edit, registering a flow)
   creates components that are born outside the solution. Verify with `npm run solution:check`
   (exit 1 on drift).
   > **The same gap applies to the Power Apps starter** (`--componentType "canvasapp"`, using the
   > app's *unique* name). That path is **unverified** — this was found on a solution that did not
   > activate the Power Apps starter — so check the app is in the solution before promoting.

> **10b.F — Power Pages Code Site:** Append an entry: did provisioning and deploy complete? did flows register? was the site converted to Production and verified? did `solution:check` report the site + all components in the solution? any CSP or 403 errors (see the starter's `/ppcs-troubleshoot`)? anything unclear?

---

### Step 11 — Promote through ALM (Stage / Prod)

Everything deployed above went to **SMKB-Apps-Dev only**. Stage and Production are reached through
**Power Platform Pipeline**, never a deploy script.

- **Tables, Env Vars, Flows, Power Apps** travel in the solution — ensure their components are in the
  solution (env var `RootComponents`, flow `RootComponents`, the Code App's linked solution) and run
  the pipeline from the Maker portal.
- **Power Pages Code Site** promotes on its own two-track model: run **`/ppcs-promote-to-env`** and
  follow the [Code Site ALM guide](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/docs/ALM-CODE-SITES.md).
  Flow GUIDs are environment-specific, so re-register them (`/ppcs-register-flow`) in each target
  environment after promotion.

There is no manual "add ~200 portal components to the solution" step in the Code Site model — that was
the old Liquid-portal workflow and no longer applies.

---

### Step 12 — Document the solution

The starter ships a [`docs/`](docs/README.md) folder of solution-documentation **templates** (executive
summary, architecture, tech stack, cloud flows, integrations, data model, data privacy, security, testing,
deployment/ALM). Now — with the whole solution built and deployed — populate them. Run **`/document-solution`**
(it drafts each doc from the built solution); then review.

> **Agent instruction:** You have full context of the solution you just built. Draft each `docs/NN-*.md`
> by replacing every `[FILL IN: …]` prompt with this solution's real details (tables, columns, flows,
> integrations, env vars, external systems, auth model, and the design decisions made). Keep the general
> SMKB guidance already in each template, **cite the source file** for every non-obvious fact, and remove
> the `TEMPLATE` callout from the top of each file once populated. Then hand the drafts to the developer to review.

- Fill in `docs/README.md` (index + one-paragraph summary) and `docs/00`–`docs/09`.
- Delete any section or row for a starter this solution did **not** activate.
- Keep component-name examples on the `smkb_<prefix>_<PascalName>` / `PREFIX - Name` convention (CLAUDE.md → Critical Rule 3).
- The docs are **not** scanned by the deploy guards or `check-doc-boundaries.mjs`, so `[FILL IN]` placeholders never block a deploy — but a half-filled doc set is a review smell; complete them before promoting to Production.

Developer action: read the drafted `docs/` and correct anything the agent got wrong or could not know
(business intent, retention decisions, approver identities).

---

### Step 13 — Commit the initialized state

After folder renames (Step 7), config applied (Step 7b), verification clean (Step 10), deploys done, and the docs drafted (Step 12):

```powershell
git status                       # review what will be staged
git add "SMKB - [Solution Name] - Dataverse Tables" "SMKB - [Solution Name] - Environmental Variables" solution.config.json docs ...
git commit -m "chore: activate starters and apply solution config for [Solution Name]"
git push
```

> **Prefer staging specific paths over `git add -A`** — it avoids accidentally committing `.env`/credential files created during setup. Run `git status` first and stage only what you intentionally changed.

This marks the boundary between "initialized from template" and "active development".

---

## After Init Project — Regular Development

From this point on, every new Claude session is a **regular session start**:
- Claude reads CLAUDE.md, checks which starters are active, confirms solution identity
- Claude will NOT offer to run Init Project again (the remote no longer points to the starter kit)
- Development and deployment follow each starter's own README; solution-wide identity changes go through `solution.config.json` + `apply-config.ps1`
- Keep [`docs/`](docs/README.md) current as the solution evolves, and run the [audit templates](audit/README.md) before promoting to Stage/Prod

See [CLAUDE.md](CLAUDE.md) for the complete rules governing regular sessions.
