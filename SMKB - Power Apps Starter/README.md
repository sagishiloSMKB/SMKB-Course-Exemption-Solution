# SMKB – Power Apps Starter

This folder is the source-of-truth for **Power Apps Code App** SPAs developed for SMKB.  
The app is a Vue 3 + TypeScript SPA that runs inside the Power Apps runtime and talks directly to Dataverse via the `@microsoft/power-apps/data` SDK.  
Source is version-controlled in Git and deployed using `deploy.ps1`.

---

## Activation Guide — Do This First

> **Only activate this starter if your solution actually needs a Power Apps Code App.**
> If your solution uses only Power Pages, flows, or no frontend at all, leave this folder completely untouched — do not rename files, do not change placeholders, do not run deploy.ps1.

### Step 0 — Rename this folder

Before anything else, rename this folder from `SMKB - Power Apps Starter` to match your solution:

```
SMKB - [Component Name] - Power App
```

| What to fill in | Example |
|----------------|---------|
| Component Name — describes the interface this app provides | `Events Backoffice`, `Scholarship Admin` |

Full example rename: `SMKB - Events Backoffice - Power App`

Renaming the folder does not affect `deploy.ps1` — it uses `$PSScriptRoot` to locate files.

### Step 1 — Confirm you need this starter

Use the Power Apps Starter when your solution requires a **staff-facing or internal management interface** that runs inside the Power Apps environment, for example:

- A backoffice management screen for reviewing/editing Dataverse records
- An admin tool for managing events, registrations, applications, etc.
- Any internal SPA with direct Dataverse read/write access

**When NOT to use this starter:**
- Public-facing portals → use the **Power Pages Starter** instead
- Simple model-driven forms → use the built-in Dataverse model-driven app (no code needed)

### Step 2 — Prerequisites

Before activating, confirm you have:

| Prerequisite | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | `node --version` |
| pnpm | 9+ | `pnpm --version` — install via `npm i -g pnpm` |
| PAC CLI | Latest | `pac --version` — download from Microsoft |
| SMKB npm registry | — | Required for `@smkb/design-ui` — see note below |

**SMKB npm registry:** `@smkb/design-ui` is a private scoped package. Your `.npmrc` must include the SMKB registry entry:
```
@smkb:registry=https://<smkb-registry-url>/
```
Contact the platform team if you don't have this configured.

### Step 3 — Create the app record using PAC CLI

> **Critical:** `pac code push` updates an existing app record. It does NOT create one.  
> There is **no "New Code App" option** in the Power Apps portal. The correct way to create a Code App record is via `pac code init`.

Run `pac code init` in the starter folder. This creates the Dataverse app record in SMKB-Apps-Dev and writes values into `power.config.json`:

```powershell
pac auth list
# Confirm the active profile targets https://org229c958d.crm4.dynamics.com/
# If not: pac auth select --index <N>

# Delete power.config.json first — if it exists (it does in the starter), pac code init
# will fail or reuse stale values unless it starts from scratch
Remove-Item power.config.json -ErrorAction SilentlyContinue

pac code init --environment "https://org229c958d.crm4.dynamics.com/" --displayName "SMKB - [Component Name] - Dev"
```

When prompted for solution name, enter your solution's unique name (e.g. `SMKBEventsTickets`).

> **Note:** After `pac code init`, `appId` in `power.config.json` will be `null` — this is expected (known PAC CLI behavior). The GUID is populated automatically on the first `pac code push`. Do not edit `power.config.json` manually.

### Step 4 — `deploy.config.json` and `pac code sync` warning

After `pac code init`, update `deploy.config.json`:

| Find | Replace with |
|------|-------------|
| `"solutionName": "YourSolutionName"` | Your solution's unique name (e.g. `SMKBEventsTickets`) |

> **Warning — `pac code sync` is destructive:** Running `pac code sync` overwrites `power.config.json` with values pulled from the platform. Only run it intentionally (e.g., after the app record is recreated). Never run it as a routine step — it will overwrite any manual edits you have made.

### Step 5 — Replace source-level placeholders and clean up starter files

**Replace placeholder table names** in the service and type files:

| Find | Replace with | Files |
|------|-------------|-------|
| `sol_example_item` | Your table's logical name (e.g. `evt_session`) | `src/services/dataService.ts`, `src/types/ExampleItem.ts` |
| `sol_example_items` | Your table's entity set name (usually logical name + `s`) | `src/services/dataService.ts` |
| `ExampleItem` | Your own type name (e.g. `Session`) | `src/types/ExampleItem.ts` |

You can do the bulk rename with PowerShell:
```powershell
Get-ChildItem ".\src" -Recurse -File -Include "*.ts","*.vue" | ForEach-Object {
    (Get-Content $_.FullName -Raw) -replace 'sol_example_item', 'evt_session' |
    Set-Content $_.FullName -Encoding UTF8 -NoNewline
}
```

**Important — rename or delete placeholder files:**

The deploy.ps1 placeholder guard scans `src/` for the string `sol_example_item`. This means:
- `src/types/ExampleItem.ts` — rename to your real type file (e.g. `Session.ts`), or delete it and create your own
- `src/services/dataService.ts` — update the `TABLE` constant and function signatures to match your schema
- `src/views/HomePage.vue` — update to use your real data types; the starter version has been left as a blank placeholder

Do not leave `sol_example_item` anywhere in `src/` when you run `deploy.ps1` — it will be blocked.

### Step 6 — Install dependencies

```powershell
pnpm install
```

> If `pnpm install` fails with `ERR_PNPM_IGNORED_BUILDS`, delete `pnpm-lock.yaml` and re-run `pnpm install`.

### Step 8 — Verify no placeholders remain

Run this before deploying:

```powershell
$patterns = '00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000001','\[REPLACE','YourSolutionName','Your App Display Name','sol_example_item'
Get-ChildItem "." -Recurse -File -Include "*.json","*.ts","*.vue" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|dist' } | ForEach-Object {
        $file = $_
        foreach ($p in $patterns) {
            if ((Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue) -match $p) {
                Write-Host "PLACEHOLDER FOUND: '$p' in $($file.Name)"
            }
        }
    }
```

If the command outputs nothing, all placeholders are replaced. You are ready to deploy.

### Step 9 — Deploy

```powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

---

---

## Local Development

Run the app locally without a Power Apps runtime or Dataverse connection:

```powershell
pnpm install
pnpm dev
```

In dev mode, Vite's alias swap replaces `src/services/dataService.ts` with `src/services/mock/mockDataService.ts` automatically. The mock returns hardcoded in-memory data, so the app runs fully in a regular browser tab with no PAC auth or environment needed.

---

## Naming Convention

All component names use a **solution short-name prefix** so no two solutions ever share a table name or component name.

The placeholder prefix throughout this starter is **`sol`** — replace it with your solution's short name before deploying.

| Placeholder name | Real example |
|-----------------|--------------|
| `sol_example_item` | `evt_session` |
| `YourSolutionName` (in deploy.config.json) | `SMKBEvents` |

**Rule:** every custom table referenced in this app must start with `[solutionShortName]_`.  
Never use generic names that could collide with tables in other solutions.

---

## Architecture

```
pnpm dev  →  Vite dev server  →  Mock services (in-memory)
pnpm build  →  dist/  →  pac code push  →  Power Apps runtime  →  @microsoft/power-apps/data  →  Dataverse
```

**Key patterns:**

| Pattern | How it works |
|---------|-------------|
| **Hash routing** | `createWebHashHistory()` — required by Power Apps (no server-side URL routing) |
| **Dev/prod service swap** | Vite alias replaces production services with mocks in `development` mode |
| **Dataverse access** | `getClient()` from `@microsoft/power-apps/data` — handles auth automatically inside the Power Apps runtime |
| **Design system** | `@smkb/design-ui` — import CSS in `main.ts`, register plugin via `createSmkb()` |

---

## Project Structure

```
SMKB - Power Apps Starter/
│
├── power.config.json         ← App ID, Environment ID, connection references (PAC CLI file)
├── deploy.config.json        ← Solution name + target env (deploy script config)
├── deploy.ps1                ← Placeholder guard + pnpm build + pac code push
├── package.json
├── vite.config.ts            ← Power Apps plugin + dev mock alias swap
├── tsconfig.json
│
└── src/
    ├── main.ts               ← App bootstrap (design system, router mount)
    ├── App.vue               ← Root component (RouterView)
    ├── router/
    │   └── index.ts          ← Hash-based routing (required for Power Apps)
    ├── views/
    │   ├── HomePage.vue      ← Replace with your views
    │   └── NotFoundPage.vue  ← 404 fallback
    ├── services/
    │   ├── dataService.ts    ← Dataverse OData calls (replace sol_example_item)
    │   └── mock/
    │       └── mockDataService.ts  ← In-memory mock, auto-used in dev
    ├── types/
    │   └── ExampleItem.ts    ← Placeholder Dataverse record type
    └── styles/
        └── main.css          ← Minimal reset
```

---

## Adding Features

### New route

1. Create `src/views/YourPage.vue`
2. Add a route in `src/router/index.ts`:
   ```typescript
   { path: "/your-path", component: YourPage }
   ```

### New Dataverse table call

1. Add a function in `src/services/dataService.ts` (and a matching mock in `mockDataService.ts`).
2. Add the corresponding type in `src/types/`.
3. Call the function from your view using `onMounted`.

---

## Design System

**Guideline: always reach for `@smkb/design-ui` first.**

Before writing a custom component or custom CSS, check whether `@smkb/design-ui` already provides one. Default to the design system for everything — components, colors, spacing, typography, and border-radius. Write custom CSS only when there is no suitable component or style token available.

The library is globally registered in `main.ts` via `app.use(createSmkb())`. All components are available in templates without any per-file import.

### Commonly used components

| Component | When to use |
|-----------|-------------|
| `SmkbTable` | Any list or grid of records |
| `SmkbButton` | All primary, secondary, and ghost actions |
| `SmkbIconButton` + `SmkbTooltip` | Icon-only actions that need a tooltip |
| `SmkbInput` | Text search and form inputs |
| `SmkbField` | Labelled form field wrappers |

**`SmkbTable` example:**

```vue
<SmkbTable :loading="loading" :data="items" :columns="columns">
  <template #empty>No items found.</template>
  <template #cell-name="{ row }">{{ row.name }}</template>
</SmkbTable>
```

```typescript
const columns = [
  { field: "name", label: "Name" },
  { field: "createdAt", label: "Created" },
];
```

**`useSmkbToast()` for notifications:**

```typescript
import { useSmkbToast } from "@smkb/design-ui";
const toast = useSmkbToast();

toast.success("Saved.");
toast.error("Something went wrong.");
```

### CSS tokens

Use token variables in scoped `<style>` blocks instead of raw values:

| Category | Token pattern | Examples |
|----------|---------------|---------|
| Spacing | `--smkb-space-{1–12}` | `--smkb-space-4` (1 rem), `--smkb-space-6` (1.5 rem) |
| Color | `--smkb-color-{name}` | `--smkb-color-primary`, `--smkb-color-text-secondary` |
| Font size | `--smkb-font-size-{size}` | `--smkb-font-size-sm`, `--smkb-font-size-xl` |
| Font weight | `--smkb-font-weight-{weight}` | `--smkb-font-weight-semibold`, `--smkb-font-weight-bold` |
| Border radius | `--smkb-radius-{size}` | `--smkb-radius-md` |

```css
/* Good */
.title {
  font-size: var(--smkb-font-size-xl);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
}

/* Avoid */
.title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}
```

---

## Running `deploy.ps1`

```powershell
# Deploys to SMKB-Apps-Dev (reads targetEnv from deploy.config.json)
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

This script deploys to **SMKB-Apps-Dev only**. Stage and Production are promoted via Power Platform Pipeline — the script will block any other `targetEnv` value.

| Environment | Dataverse URL | Deploy method |
|-------------|---------------|---------------|
| Dev | `https://org229c958d.crm4.dynamics.com/` | This script |
| Stage | — | Power Platform Pipeline only |
| Prod | — | Power Platform Pipeline only |

> **Note:** The PAC CLI profile named "SMKB-Apps-Dev" incorrectly targets `org1dce1895`.  
> Always rely on the `targetEnv` in `deploy.config.json`.

---

## How `deploy.ps1` Works

1. **Placeholder guard** — Scans all `*.json`, `*.ts`, `*.vue` files for unreplaced template strings. Exits immediately if any are found.
2. **Read config** — Reads `solutionName` and `targetEnv` from `deploy.config.json`.
3. **Build** — Runs `pnpm run build` (`vue-tsc` type check + Vite production build → `dist/`).
4. **Push** — Runs `pac code push --solutionName <name> --environment <url>` which uploads `dist/` into the existing Power Apps Code App record.

> **Important:** `pac code push` updates an existing app. If the app record does not exist yet in the target environment, create it first using `pac code init --environment <url>` (see Step 3 in the Activation Guide above). There is no portal UI option to create a Code App — `pac code init` is the only supported method.

---

## Two Different App IDs — Important

Power Apps uses two different identifiers for the same app:

| ID type | Where it appears | Used for |
|---------|-----------------|---------|
| **App GUID** (in `power.config.json`) | Portal URL: `.../apps/{appId}/edit` | `pac code push`, `power.config.json` |
| **Environment App ID** (in portal app list) | Power Apps home → app list | Portal management only |

Only the **App GUID from the edit URL** belongs in `power.config.json`.
