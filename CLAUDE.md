# CLAUDE.md

This file guides Claude Code (claude.ai/code) when working in this repository.

This repository is an **orchestrator**. It does not itself build or deploy anything — it walks a
developer through initializing a new Power Platform solution, decides which starters to activate,
holds the one solution-wide config, and enforces the conventions that span all starters. Every
starter is a **self-contained module** that owns its own build, deploy, and framework mechanics in
its own docs. This file never re-documents a starter's internals; it links to them.

---

## Root vs Starters — Ownership Charter

This is the contract that keeps root and the starters from ever contradicting each other. When in
doubt about where a fact belongs, use this.

**ROOT owns (and a starter must never redefine):**
- The init / onboarding flow — `INIT_PROJECT.md`, `INIT ONBOARDING`, and the `SESSION START` pre-flight.
- Which starters are activated, and renaming their folders to solution-specific names.
- The single solution config, `solution.config.json`, and the `apply-config.ps1` script that pushes it down.
- Global cross-starter conventions (below): short-name uniqueness & registry, publisher prefix,
  display-name format, environment reference, deployment order, connection-reference sharing.
- Git & CI — `.gitignore`, `.githooks/`, `.github/workflows/`, and the remote.
- Solution-level documentation & review templates — the root `docs/` set (a per-solution artifact, drafted
  at the end of Init Project), `TESTING-STRATEGY.md`, and the `audit/` templates. (Distinct from a starter's
  *own* `docs/`, which documents that starter's mechanics.)
- The cross-starter **security baseline** — `SECURITY-BASELINE.md`. A house standard spanning every
  starter, so it is root's: what ships hardened by default, what is statically enforced, and which
  trade-offs are accepted. Each starter documents its own half of a control; root owns the map.

**Each STARTER owns (and root must never re-document):**
- Its build / dev / deploy commands and scripts.
- Its architecture and framework mechanics (its own `README.md` / `CLAUDE.md` / `docs/`).
- Its placeholder guard (inside its own `deploy.ps1`) and its local config files — the *targets* of
  `apply-config.ps1`, never hand-edited to a value that disagrees with `solution.config.json`.
- Its framework tooling: skills (`.claude/skills/`), Cursor rules, directory-scoped `.claude/settings.json`.

**Tie-breaker:** For a starter's own build/deploy/naming *mechanics*, the starter's docs are
authoritative. For *cross-starter conventions and solution identity*, root is authoritative and
starters conform. Root never inlines starter internals; a starter never restates a global rule — it
relies on this file.

**Enforced by** (opt-in `git config core.hooksPath .githooks`, and usable in CI):
- `apply-config.ps1 -Check` — fails if any starter's committed config has drifted from `solution.config.json`.
- `scripts/check-doc-boundaries.mjs` — fails if a root doc references retired starter architecture or a broken link.

---

## Where To Find X

Root documents only orchestration and the global rules below. Everything else lives in the starter
that owns it:

| Topic | Lives in |
|-------|----------|
| Power Apps (UI-only, flow-backed) — build, deploy, architecture | [Power Apps README](SMKB%20-%20Power%20Apps%20Starter/README.md) · [CLAUDE.md](SMKB%20-%20Power%20Apps%20Starter/CLAUDE.md) · [design system](SMKB%20-%20Power%20Apps%20Starter/SMKB-UI.md) |
| Cloud Flows — authoring, deploy, ALM patterns | [Flows README](SMKB%20-%20Power%20Automate%20Flows%20Starter/README.md) |
| Flow JSON snippets & pitfalls | [FLOW_SNIPPETS.md](SMKB%20-%20Power%20Automate%20Flows%20Starter/FLOW_SNIPPETS.md) · [reference flows](SMKB%20-%20Power%20Automate%20Flows%20Starter/examples/README.md) · [flow-lint](SMKB%20-%20Power%20Automate%20Flows%20Starter/tools/flow-lint/README.md) |
| Power Pages Code Site — rules, deploy, security/CSP, skills | [PP CLAUDE.md](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/CLAUDE.md) · [Getting Started](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/GETTING-STARTED.md) · [full guide](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/docs/POWER-PAGES-CODE-SITE-GUIDE.md) |
| Code Site ALM / promotion, flow-error contract | [ALM](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/docs/ALM-CODE-SITES.md) · [flow errors](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/docs/FLOW-ERROR-CONTRACT.md) |
| Dataverse tables — schema authoring, deploy | [Tables README](SMKB%20-%20Dataverse%20Tables%20Starter/README.md) |
| Environment variables — definitions, ALM vars | [Env Vars README](SMKB%20-%20Environmental%20Variables%20Starter/README.md) |
| Solution documentation (architecture, security, privacy, ALM …) — templates, filled per solution at init | [docs/](docs/README.md) |
| Testing strategy — the layered testing method | [TESTING-STRATEGY.md](TESTING-STRATEGY.md) |
| **Security baseline** — shipped defaults, enforced invariants, accepted trade-offs (read before any security review) | [SECURITY-BASELINE.md](SECURITY-BASELINE.md) |
| Pre-go-live security / UX audit templates | [audit/](audit/README.md) |

## Skills

The kit ships **agent skills** (`/slash`-invocable, and auto-triggered by their descriptions) for the
build/deploy/quality tasks that are otherwise error-prone. They are **auto-discovered** from
`.claude/skills/*/SKILL.md` — no install step — and **directory-scoped**: a starter's skills surface when you
work in that starter (they travel with the folder even after Init Project renames it); root skills are always
available. *(New skill files need a Claude Code restart to appear in the `/` menu.)* Prefer the matching skill
over doing the task by hand.

| Owner | Skills |
|-------|--------|
| Root (`.claude/skills/`) | `/solution-config` (identity → apply-config) · `/pre-deploy-verify` · `/deploy-solution` (ordered deploy) · `/document-solution` (fill `docs/`) · `/security-audit` · `/ux-audit` · `/create-skill` |
| Dataverse Tables | `/dvt-add-table` · `/dvt-add-lookup` · `/dvt-deploy` |
| Environment Variables | `/env-add-var` |
| Cloud Flows | `/flow-add` · `/flow-deploy` |
| Power Apps | `/pa-add-flow` · `/pa-init` |
| Power Pages Code Site | `/ppcs-*` (provision, deploy, register-flow, enable-web-api, add-csp-domain, troubleshoot, …) |

Each starter owns its own `.claude/skills/`; root owns the root ones (see the Ownership Charter). Add new
skills with `/create-skill`.

---

# SMKB Power Platform Solution Starter Kit — AI Assistant Rules

Mandatory rules for Claude (or any AI assistant) working here. They exist to prevent accidental
deployment of placeholder or colliding components to the shared SMKB Power Platform environment.

---

## Project Overview

Five sub-starter folders, plus the `SMKB - Component Library` (reusable UI recipes — e.g. the OTP Auth
Screen; the `@smkbacil/design-ui` package itself is consumed from the npm registry via `.npmrc`, not built
here) and the `onboarding SMKB Apps Development` learning app:

- `SMKB - Dataverse Tables Starter` — custom table schemas (XML solution).
- `SMKB - Environmental Variables Starter` — environment variable definitions (XML solution).
- `SMKB - Power Automate Flows Starter` — cloud flow JSON packaged into a solution zip.
- `SMKB - Power Apps Starter` — Power Apps Code App SPA (Vue 3 + TS), UI-only, backed by cloud flows.
- `SMKB - Power Pages Code Site Starter` — Power Pages **Code Site** (Vue 3 SPA uploaded via PAC), flows-backed.

Monorepo — one Git root; each starter manages its own `node_modules` / lock file and is not linked at
build time. Each starter is an independent, reusable template. Not every solution uses all starters;
starters you don't activate stay untouched with their template names.

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

## Solution Config + Apply Script

Solution identity is authored in **one** place: [`solution.config.json`](solution.config.json) at the
repo root. It is the single source of truth for the solution's unique name, display name, short prefix,
target environment, and per-starter identity (app display name, Power Pages site name / titles, etc.).

Never hand-edit a starter's own config to a different value. Instead, fill `solution.config.json` and run:

```powershell
powershell -ExecutionPolicy Bypass -File apply-config.ps1 -DryRun   # preview every change + the skip list
powershell -ExecutionPolicy Bypass -File apply-config.ps1           # write identity into every activated starter
powershell -ExecutionPolicy Bypass -File apply-config.ps1 -Check    # fail if any starter has drifted (used in pre-commit)
```

**The script also owns the starter folder renames.** Init Project Step 7 is a *decision*, not a manual
`mv`: `apply-config.ps1` writes identity, then renames each activated starter to
`SMKB - <Component> - <Type>`, then rewrites the starter links in `CLAUDE.md` / `README.md` /
`INIT_PROJECT.md` — one atomic run, renames last. Renaming by hand instead makes all root tooling
silently inert (this script writes nothing and `-Check` reports "No drift"; the pre-commit lint
dispatch matches nothing; `check-doc-boundaries.mjs` hard-fails on the broken links and blocks every
commit). Every starter path is resolved at runtime, so apply / `-DryRun` / `-Check` behave identically
before and after the rename. **Restart Claude Code after a rename** — directory-scoped skills are
discovered once per session and keep pointing at the old paths.

Beyond that the script writes **only identity** (solution name, prefix, display names, site name, env
URL/ID, and the ALM env-var schema names) into each activated starter's own config files. It deliberately does
**not** touch platform-assigned placeholders — app IDs, workflow GUIDs, site-setting GUIDs, connection
references — so each starter's own `deploy.ps1` placeholder guard stays armed for the values a human or
`pac` must still supply. Re-running is safe (idempotent); after a config change, re-running reconciles.

---

## CRITICAL RULE 1 — Always Ask Which Starters to Activate

At the beginning of any new solution engagement, BEFORE touching any files, you MUST ask the user (note: during Init Project, follow the Step 6→7 sequence in INIT_PROJECT.md instead — spec gathering happens before starter selection):

> "Which starters do you want to activate for this solution?
> - Dataverse Tables (custom data tables)
> - Environmental Variables (config values per environment)
> - Power Automate Flows (automated workflows)
> - Power Apps (Code App SPA — staff/admin interface)
> - Power Pages Code Site (web portal — public-facing)
>
> You can activate any combination. Starters you don't need should remain completely untouched."

Do NOT assume all starters are needed. Do NOT modify or deploy any starter the user hasn't explicitly confirmed they want to use.

**Unused starters** must be left with their placeholder names and never deployed. They are templates for future solutions.

---

## CRITICAL RULE 2 — Never Deploy With Placeholder Names

A starter must never be deployed while it still holds template placeholders. This is enforced in two
layers — do not bypass either:

1. **Identity** is filled by the root config + apply script. Fill [`solution.config.json`](solution.config.json)
   and run `apply-config.ps1` (see "Solution Config + Apply Script" above). That clears the solution
   name, prefix, display names, site name, environment, and ALM env-var schema names across every
   activated starter at once.
2. **The remaining placeholders** (app IDs, workflow GUIDs, table/flow scaffold names, site-setting
   GUIDs) are each guarded by that starter's own `deploy.ps1` (or deploy flow), which refuses to deploy
   while its placeholders remain. The specific tokens and how to resolve them live in each starter's docs.

Never disable or bypass a starter's placeholder guard. Do NOT mark a starter deploy complete unless
its identity has been applied and its own guard passes.

**The one exception:** if the user explicitly asks for a test deploy of the placeholder skeleton (e.g.
to verify the template structure works), you may proceed after confirming this is intentional.

### ⚠️ Warning — Placeholder Tables Already Exist in SMKB-Apps-Dev

Under the old naming, `sol_example_table_a` / `sol_example_table_b` were deployed to SMKB-Apps-Dev on 2026-05-13 as a template test and still exist in the environment. The current template ships the example tables as `smkb_sol_ExampleTableA` / `smkb_sol_ExampleTableB` (the `sol` segment is a placeholder you rename).

If the Tables Starter is deployed without renaming the example tables first, the import will *succeed* while pushing empty placeholder components. The Tables `deploy.ps1` guard blocks this (it fails on the un-renamed `smkb_sol_` segment) — do not bypass it, and do not mark a Tables deploy complete unless the solution name and all table names have been replaced.

---

## CRITICAL RULE 3 — Confirm Solution Identity Before Deploying

Before any deployment, you must know and confirm with the user (these are the values you enter into
`solution.config.json`):

| Item | Example |
|------|---------|
| Solution Unique Name | `SMKBEvents` |
| Solution Display Name | `SMKB - Events` |
| Solution Short Name (prefix) | `evt` |
| Activated starter folder names | `SMKB - Events Tickets - Dataverse Tables`, etc. |
| Git repository name | `SMKB - Events Tickets - Solution` (GitHub: `SMKB-Events-Tickets-Solution`) |

The short name is the **middle segment** of every component's schema name and the prefix of every display name; it namespaces this solution within the shared `smkb` publisher, preventing collisions between solutions in the same environment.

**Schema name convention** — every custom Dataverse component (tables, columns you add, env vars, flows) is named `smkb_<prefix>_<PascalName>`:
- `smkb` = the publisher customization prefix, fixed (the publisher is `SKMBCore`).
- `<prefix>` = the solution short name, **lowercase** (e.g. `cfb`).
- `<PascalName>` = a PascalCase descriptor, no separators (e.g. `BookingRequest`).
- **Dataverse forces logical names lowercase.** `schemaName` / `PhysicalName` / `optionset Name=` keep PascalCase; the `<LogicalName>`, `<EntitySetName>`, primary-key, and optionset logical names are the lowercased form — e.g. table `smkb_cfb_BookingRequest` → logical `smkb_cfb_bookingrequest`, PK `smkb_cfb_bookingrequestid`, set `smkb_cfb_bookingrequests`, optionsets `smkb_cfb_bookingrequest_statecode` / `_statuscode`.

**Display name convention:** `[SHORT_NAME_UPPER] - [Human Name]` — uppercase prefix, space-hyphen-space separator (e.g. `CFB - Booking Request`). Applies to Dataverse tables, env var definitions, and cloud flows.

**ASCII hyphens only in XML files:** Never use a Unicode en dash (–, U+2013) or em dash in XML `LocalizedName` or `Solution.xml` display names. Hebrew-locale Windows (Windows-1255) misinterprets the UTF-8 en dash bytes as garbled characters (`ג€"`). Always use space-hyphen-space ` - ` (ASCII 0x2D). This applies to any script the kit ships as well — keep `.ps1` files ASCII-only.

| Component type | Schema name example | Display name example |
|---------------|--------------------|--------------------|
| Dataverse table | `smkb_cfb_BookingRequest` | `CFB - Booking Request` |
| Env var | `smkb_cfb_PortalBaseUrl` | `CFB - Portal Base URL` |
| Cloud flow | `smkb_cfb_BookingSubmitted` | `CFB - Booking Submitted` |

> **Shared columns keep the bare publisher prefix** (`smkb_name`, `smkb_description`) with no solution segment — they are intentionally shared across all SMKB tables. **Connection references** keep their fixed environment-level names (never prefix them). See Critical Rule 5.

**Folder naming:** Before touching a starter, verify its folder has been renamed from the template name to `SMKB - [Component Name] - [Type Label]`, where the type labels are `Dataverse Tables`, `Environmental Variables`, `Cloud Flows`, `Power App`, `Power Pages Code Site`. A folder still named `SMKB - X Starter` means the starter has not been activated. **Do not rename it by hand** — set the name in [`solution.config.json`](solution.config.json) and run `apply-config.ps1`, which renames the folder and fixes the doc links in the same run (see "Solution Config + Apply Script" above).

**Power App and Power Pages Code Site naming:** For these two types the Component Name must describe the **function** of that specific app or site, and be consistent across all three places:

| Object | Convention | Example |
|--------|-----------|---------|
| Repo folder | `SMKB - [Name] - Power App` / `Power Pages Code Site` | `SMKB - Events Backoffice - Power App` |
| Power Platform display name | `SMKB - [Name] - Dev` | `SMKB - Events Backoffice - Dev` |
| Power Pages `solution.ts` `siteName` (the **bare** name) | `[Name]` | `Lecturer Portal` |
| Resulting Power Pages site name (**derived**, `[PREFIX] - [Name]`) | `[PREFIX] - [Name]` | `EVT - Lecturer Portal` |
| Power Pages **web URL** (typed by hand at reactivation) | `[prefix]-[kebab-name]` + `-dev` / `-stage` / bare for prod | `evt-lecturer-portal-dev` |

If in doubt about what to name one of these, ask the user what the app or site is *for* — that answer becomes the Component Name. Enter the Power Pages **bare** site name in the Code Site starter's `src/config/solution.ts` `siteName` field (or `powerPages.siteName` in `solution.config.json`); `apply-config.ps1` derives the prefixed `[PREFIX] - [Name]` form — do NOT type the prefix yourself or it doubles (`EVT - EVT - …`). See the [Power Pages starter docs](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/CLAUDE.md).

---

### Power Pages web URL — prefix it, and record it in the config

The site **name** is derived; the **web address** is typed by hand in the maker at reactivation, and
it is the one that is hard to change afterwards. Convention, so it is collision-proof and derivable
with no judgement call:

| Environment | URL | Display name |
|---|---|---|
| Dev | `[prefix]-[kebab-site-name]-dev` | `[PREFIX] - [Name]` |
| Stage | `[prefix]-[kebab-site-name]-stage` | `[PREFIX] - [Name]` |
| Prod | `[prefix]-[kebab-site-name]` | `[PREFIX] - [Name]` |

The **display name takes no environment suffix** — each environment has its own Dataverse, so
`[PREFIX] - [Name]` is already unambiguous. The environment belongs in the URL.

**Why the prefix matters:** `*.powerappsportals.com` is a **global namespace shared with every
Microsoft tenant**, not a per-tenant one, and there is no reservation mechanism. An unprefixed,
generic slug is liable to be taken by a stranger. This is not hypothetical — across SMKB-Apps-Dev one
site carries a `-new` in its URL only because the natural slug was already gone, and a rebuild found
its obvious slug held by the very site it was replacing.

Record the intended slug in `powerPages.webUrlSlug` in [`solution.config.json`](solution.config.json)
so it lives in version control rather than only in the maker portal; `/ppcs-provision-site` prints
the recommended value right before the reactivation pause so it is copied, not invented.

---

## CRITICAL RULE 4 — Deployment Order

When a solution uses multiple starters, deploy in this order:
1. **Tables Starter** — creates the table schemas first
2. **Environmental Variables Starter** — creates config variables
3. **Flows Starter** — flows may reference tables and env vars
4. **Power Apps Starter** — the app references flows/tables
5. **Power Pages Code Site Starter** — uploaded via PAC (not solution import); promoted to Stage/Prod via Pipeline

Each starter's own deploy steps live in its README (see "Where To Find X").

---

## CRITICAL RULE 5 — Multi-Solution Environment: What Must Be Globally Unique

All SMKB solutions are deployed to the same Power Platform environment (SMKB-Apps-Dev). Some identifiers are **environment-scoped**, not solution-scoped. If two solutions share them, one silently overwrites the other.

### Short Name (prefix) — must be unique across ALL solutions in the environment

The short name (e.g., `evt`) is the **middle segment** of every component's schema name: tables (`smkb_evt_Registration`), env vars (`smkb_evt_PortalBaseUrl`), flows (`smkb_evt_SendConfirmation`). If two solutions share the same short name, their components will collide in Dataverse.

**Before committing to a short name, confirm it is not already in use by another solution deployed to SMKB-Apps-Dev.**

Currently registered short names (update this table when initializing a new solution):

| Short name | Solution |
|-----------|---------|
| `cif` | SMKB - Community Initiatives Fund |

### Environment Variable & Table schema names — environment-scoped

Env var and Dataverse table schema names (e.g., `smkb_evt_PortalBaseUrl`, `smkb_evt_Registration`) are globally unique within the entire environment. If two solutions define one with the same name, the second import overwrites the first. Unique short names prevent this — but only if short names are actually unique.

**Env var data types (global rule):** use **String** with semicolon-separated values for lists (e.g. an email list `admin@smkb.ac.il;ops@smkb.ac.il`) — **never JSON type**, which would force `json()` parsing in every expression and cannot be changed by reimport once deployed. The type codes and per-variable guidance live in the [Env Vars README](SMKB%20-%20Environmental%20Variables%20Starter/README.md).

### Flow names — solution-scoped (NOT a cross-solution conflict risk)

Power Automate flow display names and logical names are scoped within their solution. Two solutions can both contain a flow named `smkb_evt_SendConfirmation` without conflicting. No action needed.

### Publisher prefix — intentionally shared

All SMKB solutions use the **same publisher**: `SKMBCore` (prefix `smkb`). This is correct and by design — a consistent org-wide namespace. Do NOT create a new publisher per solution. Every component therefore carries the `smkb_` publisher prefix; the per-solution short name is the middle segment that namespaces it (`smkb_<prefix>_...`). Shared columns like `smkb_name` use the bare publisher prefix with no solution segment.

### Power Pages Code Sites — isolated by prefix + site name

Code Sites are namespaced by the publisher prefix and their site name — the canonical `[PREFIX] - [Name]` form is derived by `apply-config.ps1` from the **bare** `siteName` in `solution.ts` (do not pre-prefix it). There is no shared-GUID overwrite hazard like the old portal model. Per-environment site-setting GUIDs are freshened by the starter's own `scripts/freshen-site-settings.ps1` (run by its provisioning skill). See the [Power Pages starter docs](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/CLAUDE.md).

---

## Connection References — The One Exception to Solution Isolation

Power Platform has one intentional exception to "each solution owns its own components": **connection references**. A connection reference is an environment-level pointer to a connection (connector credentials). They are **designed to be shared** across solutions — create one per connector type (Office 365 Outlook, Dataverse, etc.) and reuse it in all flows.

**Rules:**
- Do NOT create a new connection reference per solution or per flow — that causes credential sprawl.
- When wiring a flow, use the logical name of an **existing** connection reference already in the environment.
- Connection references of the same connector type point to the same service account; reusing them across solutions is intentional and correct.

The Flows starter ships a named SMKB connection-reference bank and documents how to discover logical names and re-enable flows after import — see the [Flows README](SMKB%20-%20Power%20Automate%20Flows%20Starter/README.md).

---

## Deployment Method Reference

Each starter deploys itself; run its own steps (see "Where To Find X"). High-level methods:

| Starter | Method |
|---------|--------|
| Tables | solution pack + import (its `deploy.ps1`) |
| Env Vars | solution pack + import (its `deploy.ps1`) |
| Flows | manual zip build + solution import (its `deploy.ps1`) — `pac solution pack` cannot embed cloud-flow JSON |
| Power Apps | build + PAC Code Apps push (its `deploy.ps1`) |
| Power Pages Code Site | PAC pages code-site upload (its own deploy flow); Stage/Prod via Pipeline |

---

## PAC CLI Auth Note

The PAC CLI profile named **"SMKB-Apps-Dev" incorrectly targets `org1dce1895`** (Seminar Hakibutzim College), NOT SMKB-Apps-Dev.

Always use the explicit `--environment` flag:
```powershell
--environment "https://org229c958d.crm4.dynamics.com/"
```

Or rely on the default URL already configured in each `deploy.ps1` (which hardcodes the correct URL).

---

## Agent Guidance — Windows PowerShell 5.1 and git

These cost a debugging cycle each, and several fail *silently*.

- **Helper `.ps1` files must be ASCII-only** (or saved with a BOM). Windows PowerShell 5.1 reads a
  UTF-8-without-BOM script as ANSI, so any non-ASCII literal becomes mojibake at parse time. A
  validation script whose character class got corrupted this way matched *every* file and reported
  nine false positives. `scripts/check-template-guards.mjs` enforces this.
- **Express non-ASCII as `[char]0xNNNN` or a regex unicode escape — never the backtick-u brace form.**
  That form is PowerShell 6+ only and fails **silently** in 5.1: the pattern simply never matches, so
  a `-replace` cleanup appears to succeed while changing nothing.
- **A `-replace` that fails to match is indistinguishable from success.** Assert the result.
- **PowerShell unwraps a single-element array on return.** A helper ending in `@(...)` hands back a
  bare string when there is one match, so `$ids[0]` indexes a *character* — the script then runs
  happily on garbage and fails later with an error naming something unrelated. **Wrap every
  collection-returning call site in `@( )`.**
- **The same rule has a second face: a nested single-element array FLATTENS.** `@( @('a','b') )`
  becomes `@('a','b')`, so a `file -> list of [find, replace] pairs` table silently degrades for any
  file with exactly **one** pair: `foreach ($pair in $edits[$f])` then iterates the two *strings*, and
  `$pair[0]`/`$pair[1]` become the first two **characters** of the find string. A real run turned that
  into `.Replace('1', ' ')` across a whole document — **every digit 1 replaced with a space**, which
  corrupted two script filenames while the intended edit silently did not happen. Files with two or
  more pairs were untouched, so it looked like a one-file fluke. Force the shape with `,@('a','b')` or
  `[object[]]`, or use `[pscustomobject]@{ Find=..; Replace=.. }`, which cannot flatten.
- **Prefer a targeted edit over bulk `.Replace()` across a document.** A whole-file replace has no way
  to report "0 matches", so a malformed argument corrupts instead of failing. An edit that errors when
  its anchor is missing is strictly safer.
- **Always `git diff` after any scripted multi-file edit, before committing.** Both this and the
  Windows-1255 em-dash mangling were caught that way and would otherwise have shipped.
- **A scriptblock passed as a parameter resolves its variables in the *invoking* scope**, not where it
  was written — silently producing empty values. Pass a template string with a token instead.
- **Multi-line git commit messages must go through `git commit -F <file>`**, never `-m` with a
  single-quoted here-string. PowerShell re-parses the string when handing it to a native executable,
  so the argument splits at the first double quote and git reports
  `error: pathspec '...' did not match any file(s) known to git`.
- **Never trust a `pac` exit code.** It returns 0 on a failed import, a rejected component type, and
  more. Parse stdout.

---

## Environment Reference

> **Deploy scripts in this starter kit only target SMKB-Apps-Dev.** Never pass a Stage or Production URL to any deploy script — the scripts will block it. Stage and Production are managed through Power Platform Pipeline only.

| Environment | URL | Deploy method |
|-------------|-----|---------------|
| SMKB-Apps-Dev | `https://org229c958d.crm4.dynamics.com/` | Direct (each starter's deploy script) |
| SMKB-Apps-Stage | — | Power Platform Pipeline only |
| SMKB-Apps-Prod | — | Power Platform Pipeline only |
