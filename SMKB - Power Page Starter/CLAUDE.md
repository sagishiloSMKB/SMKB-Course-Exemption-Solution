# Power Pages + Vue SPA — Architecture Handbook

## Agent Security Rules

> **Non-negotiable. Apply to ALL sessions on ALL projects using this starter.**

### Autonomy Constraints

NEVER perform these actions without an explicit direct user request in the current message:
- `pnpm deploy` / `pac pages upload` — only when the user explicitly says "deploy"
- `git commit` — only when the user explicitly says "commit" or "create a commit"
- `git push` — only when the user explicitly says "push"
- `git push --force` / `--force-with-lease` — always flag the risk and ask; never assume it's approved
- `git commit --amend` on published commits — create a new commit instead
- **Never target Stage or Production** with `pac pages upload`, `pac auth select`, or `pnpm deploy` — those environments are reached via Power Platform Pipeline only, never via direct upload

A user approving an action once does NOT authorize it in future messages. Each deploy / commit / push requires a fresh explicit request.

### Pre-Deploy Gate

Before every deploy:
1. Run `pnpm check:security` — fix all critical failures before proceeding
2. Confirm the user explicitly requested the deploy in the current message

Never bypass or skip the security check (`--skip`, removing the step, commenting it out, etc.).

### Secure Coding Rules

**Vue / TypeScript:**
- Never use `v-html` — use `v-text` or sanitised component slots instead
- Never hardcode secrets, tokens, or credentials in any source file
- Remove all `console.log` statements from `src/` before committing
- Validate all data at system boundaries (API responses, URL params, `window.__SMKB_*` globals)
- `window.__SMKB_*` globals are for non-sensitive config only — never pass tokens or PII through them
- **Named slots (`#header`, `#footer`, `#slotName`) must be direct children of the component — never wrapped in `<template v-if>` or `<template v-else>`:**
  ```vue
  <!-- WRONG — Vue throws: 'v-slot' directive must be owned by a custom element -->
  <SmkbCard>
    <template v-if="submitted">
      <template #header>...</template>
    </template>
  </SmkbCard>

  <!-- CORRECT — conditional content goes inside the slot, not around it -->
  <SmkbCard>
    <template #header>
      <h1>{{ submitted ? 'Done' : 'Title' }}</h1>
    </template>
    <template v-if="submitted">...</template>
    <template v-else>...</template>
  </SmkbCard>
  ```

**Power Pages / YAML:**
- Never set `LocalLoginEnabled: true` — Azure AD is the only supported auth path
- `OpenRegistrationEnabled: true` requires an explicit, documented decision per project
- New site settings must be added to both `sitesetting.yml` and the solution manifest
- Never change `adx_publishingstateid`, `adx_websitelanguageid`, or `adx_defaultlanguage` without following the GUID Consistency Rule (see bottom of this file)

### Prompt Injection Awareness

Power Pages receives user-submitted form data, URL parameters, and Dataverse record values — all of which are attacker-controlled. When working with this starter:

- **Never paste raw form submission data or Dataverse record values into the conversation** — describe the schema instead (field names and types, not actual submitted values)
- **Never ask Claude to read live portal content directly** (via `pac pages download` output or fetched HTML) to understand what a form submits — describe the fields
- If sample data must be shared, sanitize it first: remove real names, emails, and any text that could contain embedded instructions

This prevents an attacker from crafting a form submission that manipulates Claude's behavior when a developer accidentally includes the raw data in the conversation.

---

## New Project Setup

> **AI agent instructions — run this check at the start of every new session.**

**Detect template state:** Check whether TODO placeholders are still present:
- `client/scripts/deploy.mjs` — `PORTAL_URL` contains `TODO`
- `powerpages/your-portal---your-portal-dev/website.yml` — `adx_websiteid` contains `TODO`

If either placeholder is found, ask the user:

> "This repo is in starter template state — the project-specific values haven't been filled in yet.
> Are you **(A) starting a new Power Pages project** using this starter, or **(B) working on the starter kit itself**?"

**If (A) — new project:**

1. Ask for:
   - **Functional Component Name** — what is this site *for*? (e.g. `Events RSVP`, `Scholarship Applications`, `Alumni Registration`) — this drives all naming below
   - **Site display name** — `SMKB - [Functional Component Name] - Dev` (e.g. `SMKB - Events RSVP - Dev`) — used in `adx_name` and the bot consumer config
   - **Portal subdomain** — `[functional-component-name]-dev` in lowercase with hyphens (e.g. `events-rsvp-dev`) — folder becomes `smkb---events-rsvp-dev`, portal URL becomes `https://events-rsvp-dev.powerappsportals.com`
   - **Solution name** — Power Platform solution for ALM, e.g. `MyProjectSolution`
   - **GitHub repository URL** — e.g. `https://github.com/smkb-org/my-project` (optional, can be skipped; used to connect the repo and set up branching)

2. Run `pac pages list` to check if the site already exists in SMKB-Apps-Dev:
   - If found: use the `WebsiteId` GUID for `adx_websiteid`
   - If not found: instruct the user to create a blank site at https://make.powerpages.microsoft.com first, then re-run

3. Once all details are confirmed, apply the Power Pages config:
   - Rename `powerpages/your-portal---your-portal-dev/` → `powerpages/smkb---<subdomain>-dev/`
   - `powerpages/.../website.yml`: set `adx_websiteid` (GUID from step 2) and `adx_name`
   - `powerpages/.../botconsumer.yml`: update `skillConfigViewName` in `adx_configjson`
   - `client/scripts/deploy.mjs`: set `PORTAL_URL` and `PAGES_SUBDIR`

4. If a GitHub URL was provided, set up the git repository and branching (see **Git & Branching Setup** below).

**If (B) — working on the starter kit:** proceed normally, leave all TODO placeholders in place.

---

## Git & Branching Setup

> Run this whenever the user provides a GitHub repository URL — whether during new project init or at any later point. Also run it if the user asks to "connect to GitHub", "set up git", or "set up branches".

**Steps:**

```bash
# 1. Initialise git if not already a repo
git init

# 2. Create an initial commit if there are no commits yet
git add -A
git commit -m "Initial commit: SMKB Power Pages starter"

# 3. Ensure the default branch is named 'main'
git branch -M main

# 4. Connect to GitHub
git remote add origin <github-url>
# (if a remote already exists, use: git remote set-url origin <github-url>)

# 5. Push main and create the dev integration branch
git push -u origin main
git checkout -b dev
git push -u origin dev

# 6. Return to main for development
git checkout main
```

After pushing, remind the user to:
- In GitHub → Settings → Branches → set **default branch** to `main`
- Optionally add branch protection on `main` (require PR reviews before merge)

---

## Project Overview

Two-layer architecture:

| Layer | Location | Purpose |
|-------|----------|---------|
| Vue SPA | `client/` | Full app UI — Vue 3 + TypeScript, built with Vite |
| Power Pages | `powerpages/` | YAML + Liquid files, uploaded via PAC CLI |

The home page uses the **SMKB App** page template (`adx_usewebsiteheaderandfooter: false`) which renders the `smkb-app` web template — a minimal Liquid shell that loads `app.css` and `app.js`. Vue takes over and renders `SmkbLayout`.

---

## Key GUIDs

> `adx_websiteid` is the only environment-specific GUID — it must be updated for each new environment (see First Deploy). All other GUIDs listed below are starter defaults. **After running `guid-freshen.ps1`, every portal-scoped GUID is replaced with a fresh random GUID — these values will no longer match the live portal.**

| Entity | Starter default GUID | Env-specific? |
|--------|----------------------|---------------|
| Website | TODO — get from `pac pages list` | **Yes** |
| Home page (root) | `a3f1bd7e-2958-45af-90ce-e9d951422a3d` | Replaced by `guid-freshen.ps1` |
| SMKB App page template | `4fc2abf8-23fa-4b2a-8f07-9a5f9e123eab` | Replaced by `guid-freshen.ps1` |
| SMKB App web template | `53cba0bc-bcc7-4b58-ae2b-6fd5b61973d9` | Replaced by `guid-freshen.ps1` |
| Language (English/1033) — both `adx_portallanguageid` AND `adx_websitelanguageid` in `websitelanguage.yml` | `77b70744-951d-4f29-9f99-2e2c8a19db20` | Replaced by `guid-freshen.ps1` — **both fields replaced to the same new GUID** |
| Published state | `498e04fe-0f5f-4a19-b384-3b0470b012b4` | Replaced by `guid-freshen.ps1` |
| Draft state | `ebb208dc-b9f2-4d43-a177-6e28de9092d6` | Replaced by `guid-freshen.ps1` |

---

## Build + Deploy

> `pnpm deploy` deploys to **Dev only** (`SMKB-Apps-Dev`). Stage and Production are reached via Power Platform Pipeline — never via direct upload.

```bash
cd client
pnpm install   # first time only
pnpm dev       # local dev server at :5173
pnpm build     # TypeScript check + Vite build
pnpm deploy    # build + pac pages upload (from main branch only)
```

`deploy.mjs` runs these steps:
1. Checks you are on the `main` branch and that `PORTAL_URL`/`PAGES_SUBDIR` are configured
2. ESLint (`pnpm run lint` — blocks on `v-html`, `console.log`, Vue rule violations)
3. Security gate (`pnpm check:security` — blocks on critical failures)
4. Verifies/selects the SMKB-Apps-Dev PAC auth environment (`org229c958d.crm4.dynamics.com`)
5. Auto-bumps `?v=N` cache version in the Liquid web template
6. Builds the client (`vue-tsc` + Vite → `dist/smkb/`)
7. Copies `dist/smkb/app.js` + `dist/smkb/app.css` to `powerpages/.../web-files/`
8. GUID sentinel check — blocks if the starter sentinel GUID is still present in any YAML file (run `guid-freshen.ps1` first)
9. `pac pages upload --path "powerpages/..." --modelVersion 2`

---

## Branching & Deploy

```
main      → production branch; only branch from which deploys are allowed
dev       → integration branch; open PRs against main
feature/* → short-lived branches off dev (or directly off main for small fixes)
```

**Workflow:**
1. Branch from `dev` (or `main` for hotfixes)
2. Develop and test locally with `pnpm dev`
3. Open PR against `main`
4. After merge, `git checkout main && git pull`
5. Run `pnpm deploy` from `main` — the script enforces this

---

## Pipeline Promotion (Stage & Production)

`pnpm deploy` is Dev-only. Promoting to Stage and Production:

1. After `pnpm deploy`, verify the Dev site looks correct
2. Re-run the `pac solution add-solution-component` loop from INIT_PROJECT.md Step 11 to ensure all current portal components are in the solution — new records added by PAC upload are **not** automatically linked
3. Trigger the pipeline: Dev → Stage → Production via Power Platform Admin Center

**Rule:** Never use `pac pages upload`, `pac auth select`, or any PAC CLI command targeting a Stage or Production org URL. Those environments receive changes through the pipeline only.

**When adding new site settings or Power Pages components:**
1. Add the YAML entry (e.g., in `sitesetting.yml`)
2. Run `pnpm deploy` to upsert to Dev
3. Re-run the `pac solution add-solution-component` component loop (INIT_PROJECT.md Step 11) to capture new component records in the solution
4. Trigger the pipeline

---

## CSS Imports (main.ts)

```ts
import '@smkb/design-ui/tokens-nofonts.css'   // tokens WITHOUT font binaries (CSP-safe)
import '@smkb/design-ui/tokens-dark.css'
import '@smkb/design-ui/styles'
```

`tokens-nofonts.css` is required — Power Pages CSP blocks custom font binary loading.

---

## Cache Busting

`?v=N` on assets in `web-templates/smkb-app/SMKB-App.webtemplate.source.html`. **Auto-bumped by `deploy.mjs`** — no manual edit needed.

```html
<link rel="stylesheet" href="/smkb/app.css?v=N" />
<script type="module" src="/smkb/app.js?v=N"></script>
```

---

## Vue Router

Hash-based routing (`createWebHashHistory`). All client routes are under `/#/...` — no Power Pages URL rewrite rules needed.

Routes:
- `/` → `HomePage`
- `/:pathMatch(.*)* ` → `NotFoundPage`

---

## Adding Features

1. Add Vue views/components to `client/src/views/` or `client/src/components/`
2. Register routes in `client/src/router/index.ts`
3. If a feature needs server-side data from Power Pages:
   - Add a site setting to `sitesetting.yml` (redeploy to sync it to Dataverse)
   - Inject the value as a global in the Liquid shell (`SMKB-App.webtemplate.source.html`):
     ```liquid
     <script>
       window.__SMKB_MY_VALUE = {{ settings['MySetting'] | json }};
     </script>
     ```
   - Read it in Vue via `window.__SMKB_MY_VALUE` (centralise in `src/config.ts`)
4. Build and deploy with `pnpm deploy` (from `main`)

> **When adding site settings:** any new entry in `sitesetting.yml` is uploaded automatically by `pac pages upload`. For Power Platform ALM (managed solutions), also register the setting in your Power Platform solution — see README → "Solution Manifest & Site Settings".

---

## Writing to Dataverse from Power Pages (CSRF Token)

All anonymous POST and PATCH calls to the Dataverse OData API (`/_api/...`) require the `__RequestVerificationToken` header. Without it, Power Pages silently returns 403.

**Step 1 — Inject the token via the Liquid shell** (`SMKB-App.webtemplate.source.html`):

```liquid
<script>
  window.__SMKB_TOKEN = {{ request.request_verification_token | json }};
</script>
```

**Step 2 — Use the scaffold** in `client/src/services/dataService.ts`:

```typescript
import { createRecord, updateRecord } from "./services/dataService";

// Create a Dataverse record (anonymous — no auth required if table allows it)
await createRecord("evt_applications", {
  evt_name: "Jane Doe",
  evt_email: "jane@example.com",
});
```

The `createRecord` and `updateRecord` functions in the scaffold automatically attach `__RequestVerificationToken` to every request.

**Note:** This pattern applies to anonymous writes (public portal users). Authenticated writes for logged-in users follow the same pattern — the token is still required.

---

## First Deploy to a New Environment

```bash
# 1. Authenticate to SMKB-Apps-Dev (all projects use this environment)
pac auth create --url https://org229c958d.crm4.dynamics.com

# 2. Get real website GUID
pac pages list

# 3. Update website.yml
# Set adx_websiteid to the GUID from step 2
# Set adx_name to "<Your Org> - <Project Name> (Dev) - <portal-subdomain>"

# 4. Update deploy.mjs
# Set PORTAL_URL and PAGES_SUBDIR constants
# Rename powerpages/your-portal---your-portal-dev/ to match PAGES_SUBDIR

# 5. Deploy from main
cd client && pnpm deploy
```

---

## Standard Power Pages Pages

Search, Profile, Access Denied, Page Not Found — all use `adx_usewebsiteheaderandfooter: true` (standard Power Pages header/footer). Unchanged from platform defaults.

---

## GUID Consistency Rule

Three GUIDs must be consistent across all YAML files or Power Pages will return "Page Not Found":

1. **Language ID** — `website.yml adx_defaultlanguage` = `websitelanguage.yml adx_portallanguageid` = `websitelanguage.yml adx_websitelanguageid` = all content pages `adx_webpagelanguageid`
2. **Published state ID** — `publishingstate.yml` entry with `adx_isdefault: true` = all content pages `adx_publishingstateid` = all webfile.yml entries `adx_publishingstateid`

If these drift after a `pac pages download --overwrite`, run a bulk replace across all YAML files to restore consistency. See README → "The Phantom GUID Pitfall" for the full recovery procedure.

---

## GUID Isolation — Required Before Every New Portal Deploy

**The problem:** Every portal initialized from this starter kit starts with the same hardcoded GUIDs. `pac pages upload` upserts Dataverse records by primary key — if two portals share the same GUIDs, the second upload sets `adx_websiteid` on records that already belong to the first portal, silently stealing them. Both portals break. This has already happened in production (CIF and Open Day portals, May 2026).

**The fix:** Before the very first `pnpm deploy` for any new portal, run:

```powershell
# 1. Freshen all portal-scoped GUIDs (run ONCE, before first deploy only)
powershell -ExecutionPolicy Bypass -File "powerpages/<portal-folder>/guid-freshen.ps1"

# 2. Verify YAML consistency after freshening
powershell -ExecutionPolicy Bypass -File "powerpages/<portal-folder>/verify-consistency.ps1"

# 3. Then deploy — deploy.mjs blocks upload if the sentinel GUID is still present
pnpm deploy
```

**Rules:**
- Run `guid-freshen.ps1` **exactly once** per portal, before the first deploy. Never again.
- Running it a second time generates GUIDs that no longer match Dataverse — the live site breaks.
- **`guid-freshen.ps1` self-enforces this:** after running, it writes a `.guid-freshened` marker file. On any subsequent invocation, the script reads the marker and exits with an error. To intentionally rebuild from scratch (blank portal, no live records), delete `.guid-freshened` manually first.
- `deploy.mjs` enforces this: it will block upload if the starter-kit sentinel GUID is still present in any YAML file.
- **Never run `pac pages download --overwrite` before freshening.** The download brings back the starter-kit GUIDs from the environment, defeating the freshening.

---

## Blank Portal Orphan Records — Post-First-Deploy Deconflict Required

> **This step is mandatory after every first deploy of a new portal. Skipping it causes "Page Not Found" on the home page.**

### Why the problem exists

When you create a blank portal at make.powerpages.microsoft.com, Power Pages provisions a default set of page records directly in Dataverse:

| Page | `adx_partialurl` |
|------|-----------------|
| Home | `/` |
| Access Denied | `/access-denied` |
| Page Not Found | `/Page-Not-Found` |
| Profile | `/profile` |
| Search | `/search` |

These records are created with platform-assigned GUIDs and your portal's website ID — before you ever run a deploy.

`guid-freshen.ps1` generates fresh GUIDs for all records defined in **your** YAML files. When `pac pages upload` then runs, it upserts records by primary key (`adx_webpageid`). Since your freshened GUIDs are different from the blank portal's GUIDs, your records are inserted as **additional records** alongside the blank portal's originals. Both sets now coexist in Dataverse.

### How this causes "Page Not Found"

Power Pages resolves a URL request for `/` by:
1. Querying for all root pages (`adx_isroot: true`) with `adx_partialurl = /`
2. Finding two records: the blank portal's Home and your Home
3. Picking whichever has the **lexicographically lower `adx_webpageid`**
4. Looking for that page's content page in your portal's language (`adx_webpagelanguageid`)
5. If the blank portal's Home page was picked: its content page has the blank portal's language ID (not yours) → "Page Not Found"

### How to fix it — the deconflict script

Run once, immediately after the first `pnpm deploy`:

```powershell
# From the solution root (adjust portal folder name):
powershell -ExecutionPolicy Bypass -File "powerpages\<portal-folder>\deconflict-portal.ps1"
```

`deconflict-portal.ps1` (in the same folder as `guid-freshen.ps1`) will:
1. Download the current Dataverse portal state via `pac pages download`
2. Compare downloaded page GUIDs with your local YAML page GUIDs
3. For each record in Dataverse that is NOT in your YAML (blank portal's orphan), create override YAML files in `web-pages/blank-portal-default-*/` that change `adx_partialurl` to `z-portal-default-XXXXXXXX` and set `adx_hiddenfromsitemap: true`
4. Print the list of created files

Then deploy again to upload the overrides:

```powershell
cd client && pnpm deploy
```

After this second deploy, your portal's home page (and all other pages) will serve correctly.

### Commit the deconflict output

The `web-pages/blank-portal-default-*/` folders that the script creates are permanent fixtures. Commit them. They ensure the blank portal's pages stay relocated even after future deploys.

### Diagnostic — if still broken after deconflict

If the portal still returns "Page Not Found" after running the deconflict script and deploying:

```powershell
pac pages download --websiteId <your-website-id> --path ./temp-check
```

Inspect `temp-check/<portal>/web-pages/`. If you see two folders for the same page type (e.g. `home_AAAAA/` and `home_BBBBB/`), the overrides didn't upload correctly. Check that the deconflict script ran without errors and that the second `pnpm deploy` completed. Clean up: `Remove-Item ./temp-check -Recurse -Force`

### The GUID Consistency Rule still applies

After deconflict, the GUID chain must remain intact:
- `website.yml adx_defaultlanguage` = `websitelanguage.yml adx_websitelanguageid` = `websitelanguage.yml adx_portallanguageid` = all content pages `adx_webpagelanguageid`

The deconflict script preserves each orphan content page's own `adx_webpagelanguageid` — it does not change it. Your own pages remain unaffected.
