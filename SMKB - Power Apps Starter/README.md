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

### Step 3 — Create the app record in Power Apps portal

> **Critical:** `pac code push` updates an existing app record. It does NOT create one.
> If you skip this step and run `deploy.ps1`, it will fail.

1. Go to [make.powerapps.com](https://make.powerapps.com) and select the **SMKB-Apps-Dev** environment.
2. Open your main solution (or create one if this is a new solution).
3. Click **New → App → Canvas app** → name it (e.g. `SMKB Events Backoffice`) → Create.
4. Close the Power Apps Studio — you don't need to build anything here.
5. Get the **App ID** from the URL:
   ```
   https://make.powerapps.com/environments/{environmentId}/apps/{appId}/edit
   ```
   Copy `{appId}` (the GUID after `/apps/`).

### Step 4 — Run `pac code sync` (recommended) or manually update config

**Recommended path — `pac code sync`:**

After creating the app and connecting Dataverse to it, run:
```powershell
pac auth select --environment "https://org229c958d.crm4.dynamics.com/"
pac code sync
```
This rewrites `power.config.json` automatically with the real `appId`, `environmentId`, and `connectionReferences` values. No manual editing needed.

**Manual path — edit `power.config.json` directly:**

Replace every `[REPLACE: ...]` and placeholder GUID in `power.config.json`:

| Find | Replace with |
|------|-------------|
| `"appId": "00000000-0000-0000-0000-000000000000"` | Your App GUID from Step 3 |
| `"appDisplayName": "Your App Display Name"` | Your app's display name (e.g. `SMKB Events Backoffice`) |
| `"environmentId": "00000000-0000-0000-0000-000000000001"` | Your environment GUID |
| `"00000000-0000-0000-0000-000000000002"` (connection key) | Your Dataverse connection reference key |
| `[REPLACE: connection-id]` in `sharedConnectionId` | Your Dataverse connection instance ID |

### Step 5 — Update `deploy.config.json`

Replace the solution name placeholder:

| Find | Replace with |
|------|-------------|
| `"solutionName": "YourSolutionName"` | Your solution's unique name (e.g. `SMKBEvents`) |

The `targetEnv` default is already set to `https://org229c958d.crm4.dynamics.com/` (SMKB-Apps-Dev). Change it only if deploying to a different environment.

### Step 6 — Replace source-level placeholders

In the service and type files, replace the placeholder table name:

| Find | Replace with | Files |
|------|-------------|-------|
| `sol_example_item` | Your table's logical name (e.g. `evt_session`) | `src/services/dataService.ts`, `src/types/ExampleItem.ts` |
| `sol_example_items` | Your table's entity set name (usually logical name + `s`) | `src/services/dataService.ts` |
| `sol_example_itemid` | Your table's primary key column name | `src/services/dataService.ts` |
| `ExampleItem` | Your own type name (e.g. `Session`) | `src/types/ExampleItem.ts`, `src/views/HomePage.vue` |

You can do the bulk rename with PowerShell:
```powershell
Get-ChildItem ".\src" -Recurse -File -Include "*.ts","*.vue" | ForEach-Object {
    (Get-Content $_.FullName -Raw) -replace 'sol_example_item', 'evt_session' |
    Set-Content $_.FullName -Encoding UTF8 -NoNewline
}
```

### Step 7 — Install dependencies

```powershell
pnpm install
```

### Step 8 — Verify no placeholders remain

Run this before deploying:

```powershell
$patterns = '00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000001','\[REPLACE','YourSolutionName','Your App Display Name','sol_example_item'
Get-ChildItem "." -Recurse -File -Include "*.json","*.ts","*.vue" |
    Where-Object { $_.FullName -notmatch 'node_modules|dist' } | ForEach-Object {
        $file = $_
        foreach ($p in $patterns) {
            if ((Get-Content $file.FullName -Raw) -match $p) {
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
# Default: deploys to SMKB-Apps-Dev (reads targetEnv from deploy.config.json)
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

To deploy to a different environment, edit `deploy.config.json` before running, or temporarily override:
```powershell
# Edit deploy.config.json targetEnv, then:
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

| Environment | Dataverse URL |
|-------------|---------------|
| Dev | `https://org229c958d.crm4.dynamics.com/` |
| Stage | `https://smkb-apps-stage.crm4.dynamics.com/` |
| Prod | `https://skmb-apps-prod.crm4.dynamics.com/` |

> **Note:** The PAC CLI profile named "SMKB-Apps-Dev" incorrectly targets `org1dce1895`.  
> Always rely on the `targetEnv` in `deploy.config.json` or pass `--environment` explicitly.

---

## How `deploy.ps1` Works

1. **Placeholder guard** — Scans all `*.json`, `*.ts`, `*.vue` files for unreplaced template strings. Exits immediately if any are found.
2. **Read config** — Reads `solutionName` and `targetEnv` from `deploy.config.json`.
3. **Build** — Runs `pnpm run build` (`vue-tsc` type check + Vite production build → `dist/`).
4. **Push** — Runs `pac code push --solutionName <name> --environment <url>` which uploads `dist/` into the existing Power Apps Code App record.

> **Important:** `pac code push` updates an existing app. If the app record does not exist yet in the target environment, create it first (Step 3 in the Activation Guide above).

---

## Two Different App IDs — Important

Power Apps uses two different identifiers for the same app:

| ID type | Where it appears | Used for |
|---------|-----------------|---------|
| **App GUID** (in `power.config.json`) | Portal URL: `.../apps/{appId}/edit` | `pac code push`, `power.config.json` |
| **Environment App ID** (in portal app list) | Power Apps home → app list | Portal management only |

Only the **App GUID from the edit URL** belongs in `power.config.json`.
