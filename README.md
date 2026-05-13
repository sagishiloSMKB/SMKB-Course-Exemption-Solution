# SMKB – Power Platform Solution Starter Kit

This repository is the source-of-truth for SMKB Power Platform solution components — custom tables, environment variables, Power Automate flows, Power Apps Code Apps, and Power Pages sites. Components are defined as code, version-controlled in Git, and deployed to Dataverse using PAC CLI.

> **Working with AI (Claude)?** Claude will always ask which starters to activate before touching any files, and will refuse to deploy until you confirm all placeholders have been replaced. See `CLAUDE.md` for the full rules.

---

## Sub-Starters

| Folder | What it covers | Use it when… |
|--------|---------------|--------------|
| `SMKB - Dataverse Tables Starter` | Custom table schemas (entities), forms, and views | Your solution needs its own data tables |
| `SMKB - Environmental Variables Starter` | Environment variable definitions | Your solution has configuration values that differ per environment (URLs, keys, settings) |
| `SMKB - Power Automate Flows Starter` | Cloud flow JSON files and deployment scripts | Your solution includes automated workflows or Power Pages–triggered flows |
| `SMKB - Power Apps Starter` | Power Apps Code App SPA (Vue 3 + TypeScript, `pac code push`) | Your solution needs a staff/admin-facing interface inside Power Apps |
| `SMKB - Power Page Starter` | Power Pages site source (client + powerpages folders) | Your solution includes a public-facing or internal web portal |

**Not every solution needs all starters.** A simple data-entry app may only need the Tables Starter. A background-automation solution may only need Flows and Env Vars. Choose only what applies — unused starters stay untouched with their placeholder names and are never deployed.

---

## Git Repository

The entire starter kit lives in **one git repository** — a single root `.git` covers all starter folders. There are no nested repos, no submodules, no per-folder repositories.

### Naming convention for real-solution repos

When you fork or copy this starter kit to start a new solution, name the new repo following the same `SMKB - [Name] - [Type]` convention used for everything else:

```
SMKB - [Solution Name] - Solution
```

| Solution | Local folder / repo name | GitHub repo name |
|----------|--------------------------|-----------------|
| Events & Tickets | `SMKB - Events Tickets - Solution` | `SMKB-Events-Tickets-Solution` |
| Scholarship Applications | `SMKB - Scholarship Applications - Solution` | `SMKB-Scholarship-Applications-Solution` |
| Alumni Network | `SMKB - Alumni Network - Solution` | `SMKB-Alumni-Network-Solution` |

### Gitignore structure

A single root `.gitignore` covers all common patterns across all starters: build artifacts (`_dist/`, `dist/`), `node_modules/`, environment files, logs, and IDE/OS files. The Power Pages Starter has its own additional `.gitignore` only for portal-specific patterns (webfile.yml stubs, font binaries).

> Do not add a per-starter `.gitignore` unless it needs patterns the root cannot express.

### First time cloning this starter kit?

See [`INIT_PROJECT.md`](INIT_PROJECT.md) — the one-time setup guide that walks through disconnecting from the template remote, creating your solution repo, selecting starters, gathering specs, and building an implementation plan. This is different from starting a regular session on an already-initialized project.

---

## Starting a New Solution — 5 Steps

### Step 1 — Decide which starters you need

Answer these questions:

| Question | If yes → activate |
|----------|------------------|
| Does your solution store data in custom Dataverse tables? | Tables Starter |
| Does your solution have config values that change per environment? | Env Vars Starter |
| Does your solution include automated flows or Power Pages–triggered logic? | Flows Starter |
| Does your solution need a staff/admin interface inside Power Apps? | Power Apps Starter |
| Does your solution include a web portal? | Power Pages Starter |

Starters you don't need: **leave them completely alone**. Do not rename files, do not run deploy.ps1, do not change placeholders. They are templates for future use.

### Step 2 — Choose your solution short name and rename the active starter folders

**Short name (component prefix):**  
Pick a short lowercase identifier for your solution. This becomes the **prefix** for every component name.

| Solution | Short name | Example component |
|----------|-----------|-------------------|
| Events & Tickets | `evt` | `evt_sessions`, `evt_PORTAL_URL` |
| Scholarship Applications | `sch` | `sch_applications`, `sch_STATUS_EMAIL` |
| Alumni Network | `alm` | `alm_members`, `alm_send_welcome` |

**Rule:** short names must be 2–5 lowercase letters, no numbers, no underscores.

**Folder rename convention:**  
For each starter you are activating, rename its folder from the template name to the project-specific name:

```
SMKB - [Component Name] - [Type Label]
```

| Type Label | Used for |
|-----------|---------|
| `Dataverse Tables` | Tables Starter |
| `Environmental Variables` | Env Vars Starter |
| `Cloud Flows` | Flows Starter |
| `Power App` | Power Apps Starter |
| `Power Page` | Power Pages Starter |

**Example — Events Tickets solution uses all 5 starters:**
```
SMKB - Events Tickets - Dataverse Tables
SMKB - Events Tickets - Environmental Variables
SMKB - Events Tickets - Cloud Flows
SMKB - Events Backoffice - Power App
SMKB - Events RSVP - Power Page
```

Unused starters keep their original `SMKB - X Starter` name — do not rename them.

### Step 3 — Replace all placeholders in each active starter

Each active starter contains placeholder strings that must be replaced before anything is deployed. See the "Activation Guide" section at the top of each starter's `README.md` for the exact list of what to replace.

**Common placeholders across all starters:**

| Placeholder | Replace with |
|-------------|-------------|
| `YourSolutionName` | Your solution's unique name (e.g. `SMKBEvents`) |
| `Your Solution Name` | Your solution's display name (e.g. `SMKB – Events`) |
| `sol` (prefix) | Your solution short name (e.g. `evt`) |
| `sol_example_*` | Your actual component names |
| `sol_EXAMPLE_*` | Your actual variable names |

### Step 4 — Deploy only the active starters

Run `deploy.ps1` inside each active starter folder. Do this for Dev first, then Stage, then Prod.

```powershell
# Tables Starter
powershell -ExecutionPolicy Bypass -File ".\SMKB - Dataverse Tables Starter\deploy.ps1"

# Env Vars Starter
powershell -ExecutionPolicy Bypass -File ".\SMKB - Environmental Variables Starter\deploy.ps1"

# Flows Starter
powershell -ExecutionPolicy Bypass -File ".\SMKB - Power Automate Flows Starter\deploy.ps1"

# Power Apps Starter (requires pnpm install first)
powershell -ExecutionPolicy Bypass -File ".\SMKB - Power Apps Starter\deploy.ps1"

# Power Pages Starter (uses pnpm deploy, not deploy.ps1 — run from the client/ subfolder)
cd ".\SMKB - Power Page Starter\client"
pnpm deploy
```

> **Power Pages note:** the Power Pages Starter deploys via `pnpm deploy` (not `deploy.ps1`). Run it from inside the `client/` subfolder. See the starter's README for prerequisites and the full first-deploy checklist.

### Step 5 — Leave unused starters untouched

Unused starters keep their placeholder names forever (until another solution activates them). This is intentional — they are reusable templates.

---

## Golden Rule

> **Never deploy a starter that still contains placeholder names.**
>
> If any file still says `YourSolutionName`, `sol_example_*`, or `sol_EXAMPLE_*` — stop and complete the replacement first. Deploying with placeholder names will create components with generic names that may conflict with templates used by future solutions.

---

## Publisher & Environment Reference

| Setting | Value |
|---------|-------|
| Publisher Unique Name | `SKMBCore` |
| Customization Prefix | `smkb` |
| Option Value Prefix | `39041` |

| Environment | Purpose | Dataverse URL |
|-------------|---------|---------------|
| SMKB-Apps-Dev | Development & testing | `https://org229c958d.crm4.dynamics.com/` |
| SMKB-Apps-Stage | Staging / UAT | `https://smkb-apps-stage.crm4.dynamics.com/` |
| SMKB-Apps-Prod | Production | `https://skmb-apps-prod.crm4.dynamics.com/` |

> **PAC CLI auth note:** The profile named "SMKB-Apps-Dev" incorrectly targets `org1dce1895`. Always pass `--environment <url>` explicitly, or rely on the default URL in each `deploy.ps1`.

---

## Repository Structure

```
SMKB - Power Platform Solution Starter Kit/
│
├── CLAUDE.md                                ← AI assistant rules (read before doing anything)
├── README.md                                ← This file
│
├── SMKB - Dataverse Tables Starter/         ← Custom table schemas
│   ├── README.md
│   ├── deploy.ps1
│   ├── Entities/
│   └── Other/
│
├── SMKB - Environmental Variables Starter/  ← Environment variable definitions
│   ├── README.md
│   ├── deploy.ps1
│   ├── environmentvariabledefinitions/
│   └── Other/
│
├── SMKB - Power Automate Flows Starter/     ← Cloud flow JSON files
│   ├── README.md
│   ├── deploy.ps1
│   ├── Workflows/
│   └── Other/
│
├── SMKB - Power Apps Starter/               ← Power Apps Code App SPA
│   ├── README.md
│   ├── deploy.ps1
│   ├── deploy.config.json
│   ├── power.config.json
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│
└── SMKB - Power Page Starter/               ← Power Pages site source
    ├── README.md
    ├── client/
    └── powerpages/
```
