# SMKB Power Apps Code App Starter

A starter for building **Power Apps Code Apps** — Vue 3 + TypeScript SPAs that run inside the Power Apps runtime. This starter is **flow-based (UI-only)**: the app never calls Dataverse or any network API directly. All backend work is done by **Power Automate flows**, which the app calls through generated services and a single `unwrap()` boundary. Source is version-controlled in Git and deployed with `deploy.ps1`.

The starter ships **Hebrew / RTL by default** (`lang="he" dir="rtl"`), matching SMKB apps.

---

## Why flow-based (UI-only)?

| | |
|---|---|
| **Security boundary is the server** | Flows run under the authenticated connection. The client is never trusted with a data-access key, and there are no client-side role checks to bypass. |
| **One shape for every call** | `generated Service.Run(input)` → `unwrap<T>()` → a clean domain type. Every service looks the same. |
| **Enforced, not just documented** | ESLint bans `fetch` / `XMLHttpRequest` / `WebSocket` and `v-html`, so a direct network call fails `pnpm lint` (and the deploy gate). |

---

## Setup Guide — Do This First

### Step 1 — Prerequisites

| Prerequisite | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | `node --version` |
| pnpm | 9+ | `pnpm --version` — install via `npm i -g pnpm` |
| PAC CLI | Latest | `pac --version` — [download](https://aka.ms/PowerAppsCLI). Needed once for `pac code init`. |
| npm credential | **not needed** | `@smkbacil/design-ui` is vendored — see below |

**No npm credential:** `@smkbacil/design-ui` is a **private** package, but it is **vendored**: the as-published tarball is committed under `vendor/` and resolved with a `file:` spec, so installs need **no credential** at all. A token is used only by the root `scripts/vendor-design-ui.ps1` when someone deliberately updates the library. `pnpm install` therefore works offline, on a
brand-new machine, and in CI with no secret configured.

The npm-based Power Apps CLI (`@microsoft/power-apps-cli`, used for flows) is installed automatically as a dev dependency and exposed via the `pnpm pa` script.

### Step 2 — Install dependencies

```powershell
pnpm install
```

> If `pnpm install` fails with `ERR_PNPM_IGNORED_BUILDS`, delete `pnpm-lock.yaml` and re-run.

### Step 3 — Create the app record in Power Apps

> **Critical:** `pac code init` **creates** the app record; `pnpm pa push` only **updates** it. There is no "New Code App" button in the portal.

```powershell
pac auth list   # confirm the active profile targets your environment

# Delete power.config.json first so pac code init starts clean
Remove-Item power.config.json -ErrorAction SilentlyContinue

pac code init --environment "https://your-org.crm.dynamics.com/" --displayName "Your App Display Name"
```

> After `pac code init`, `appId` in `power.config.json` may be `null` — expected; it is populated on the first push.

### Step 4 — Configure `deploy.config.json`

| Field | Value |
|-------|-------|
| `targetEnv` | Your dev environment URL (e.g. `https://your-org.crm.dynamics.com/`) |
| `allowedEnvs` | Array of environment URL(s) this script may deploy to. **Ships empty — you must add your dev URL** or the deploy is blocked. Stage/Prod are promoted via Power Platform Pipeline, never this script. |
| `solutionName` | Solution unique name to link the app to, or `""` for standalone |

### Step 5 — Wire your flows

For each Power Automate flow the app needs, run:

```powershell
pnpm pa add-flow
```

This regenerates `src/generated/` (a barrel + one model + one service per flow) and the `.power/` connector schemas. **Both `src/generated/` and `.power/` are committed** — they are part of the app's contract and the build needs them to type-check.

> `pnpm pa add-flow` overwrites `src/generated/index.ts`. When you add your first real flow, **delete the ExampleFlow scaffold** (see [Removing the example](#removing-the-example)).

### Step 6 — Write your domain services

Follow the pattern in `src/services/exampleService.ts`:

```typescript
import { MyFlowService } from '../generated'
import { unwrap } from './unwrap'

export interface MyThing { id: number; name: string }   // type lives WITH its service

export async function getThings(): Promise<MyThing[]> {
  const data = unwrap<{ items: MyThing[] }>(await MyFlowService.Run({ /* input */ }))
  return data?.items ?? []
}
```

Add a matching dev-mock export in `src/services/mock/generated.ts` so `pnpm dev` keeps working offline (see [Local Development](#local-development)).

### Step 7 — Verify & deploy

```powershell
# Confirm nothing is left unreplaced (deploy.ps1 does this too):
$patterns = '00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000001','\[REPLACE','Your App Display Name','sol_exampleflow','your-org\.crm'
Get-ChildItem "." -Recurse -File -Include "*.json","*.ts","*.vue" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|dist' } | ForEach-Object {
        $file = $_
        foreach ($p in $patterns) {
            if ((Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue) -match $p) {
                Write-Host "PLACEHOLDER FOUND: '$p' in $($file.Name)"
            }
        }
    }

powershell -ExecutionPolicy Bypass -File deploy.ps1
```

---

## Local Development

```powershell
pnpm dev
```

In dev mode, `vite.config.ts` aliases every `from '../generated'` **barrel** import to `src/services/mock/generated.ts` — an in-memory mock. So the app runs fully in a browser tab with no PAC auth, no environment, and no network. The example table on the home page is populated this way.

**Mock a new flow** = add **one export** to `src/services/mock/generated.ts`:

```typescript
export const MyFlowService = {
  async Run(_input?: unknown) {
    return { success: true, data: { items: [{ id: 1, name: 'דוגמה' }] } }
  },
}
```

No new file and no new alias entry — that is the whole point of aliasing the barrel rather than each service. Component and service code is byte-identical between dev and prod; only the barrel is swapped.

---

## Hebrew / RTL

- `index.html` sets `lang="he" dir="rtl"`; the design system and browser handle the rest.
- Write **direction-agnostic CSS**: use logical properties (`margin-inline-start`, `inset-inline-end`, `padding-block`, `border-inline-end`) instead of physical `left`/`right`.
- Dates: `toLocaleDateString('he-IL')`. Sorting Hebrew strings: `a.localeCompare(b, 'he')`.
- Force LTR only on inherently-LTR fields (email, phone, ID) with `dir="ltr"` on that input.
- **Scrollbar-on-the-right trick** (RTL scroll containers put the scrollbar on the left by default): set `direction: ltr` on the scroller and `direction: rtl` on its inner content, and add `scrollbar-gutter: stable`.

To build an LTR/English app instead, revert `index.html` to `lang="en"` (drop `dir="rtl"`) and translate the starter strings.

---

## Data & Service Layer

```
Vue component → domain service (src/services/*) → generated flow service (src/generated) → Power Automate flow → Dataverse / external API
                          │
                          └─ unwrap<T>(result): returns data, or throws the flow's error code on { success: false }
```

- **`src/services/unwrap.ts`** — the single place that decides success vs. failure for a flow result. Keep the contract here so it can't drift between services. Unit-tested in `unwrap.spec.ts`.
- **`src/services/*Service.ts`** — thin domain services. They call the generated `Service.Run()`, `unwrap()` the result, and return clean domain types. Domain types live **with their service** (there is no shared `src/types/`).
- **`src/generated/`** — auto-generated by `pnpm pa add-flow`; never edited by hand; committed.
- **Reusable helpers** shipped in the starter:
  - `src/utils/validators.ts` — `isValidEmail`, `isValidIsraeliPhone`, `isValidIsraeliId` (Luhn).
  - `src/utils/phone.ts` — `normalizePhone` (+972 → 0).
  - `src/composables/useFormValidation.ts` — field-validator map → `{ errors, validateField, isFormValid, validateAll }`.
  - `src/composables/useSessionCache.ts` — wrap an async fetcher for a session-scoped cache with in-flight de-dup and retry-on-failure (use for reference lists like cities/approvers).

---

## Quality Gates

```powershell
pnpm lint   # ESLint - bans direct network calls & v-html, no stray console.log
pnpm test   # Vitest - every src/**/*.spec.ts. Node environment by default; jsdom for
            # src/composables/**/*.spec.ts and any *.dom.spec.ts (a spec that needs
            # window/sessionStorage/a Vue ref). Without that escape hatch a module
            # touching window at import time is untestable, not merely untested.
```

`deploy.ps1` runs **lint → test → build → push** and aborts on the first failure, so nothing ships that fails a gate. Colocate a `*.spec.ts` next to any pure-logic module you add.

---

## Removing the example

The starter ships a runnable example flow so `pnpm dev`/`pnpm build` work on day one. When you wire your first real flow, delete all of it:

- `src/services/exampleService.ts`
- `src/generated/index.ts` entries + `src/generated/services/ExampleFlowService.ts` + `src/generated/models/ExampleFlowModel.ts` (`pnpm pa add-flow` rewrites `index.ts`)
- the `sol_exampleflow` entry in `.power/schemas/appschemas/dataSourcesInfo.ts`
- the `ExampleFlowService` export in `src/services/mock/generated.ts`
- the example wiring in `src/views/HomePage.vue`

The deploy placeholder guard blocks on `sol_exampleflow`, so you can't accidentally ship the example.

---

## Project Structure

```
├── power.config.json         ← App ID, Environment ID, flow connection refs (pac code init + pnpm pa add-flow)
├── deploy.config.json        ← targetEnv + allowedEnvs + optional solutionName
├── deploy.ps1                ← placeholder guard + env guard + lint + test + build + pnpm pa push
├── vendor/                   ← committed @smkbacil/design-ui tarball (no credential needed)
├── eslint.config.js          ← UI-only security rules (no fetch/XHR/WS, no v-html)
├── vitest.config.ts          ← unit-test runner (node env; jsdom by path glob)
├── vite.config.ts            ← Power Apps plugin + dev "../generated" → mock alias
├── .power/schemas/           ← generated connector schemas (committed)
└── src/
    ├── main.ts               ← bootstrap (design system CSS + createSmkb() + router)
    ├── App.vue               ← layout + nav + RouterView
    ├── router/index.ts       ← hash routing (required for Power Apps)
    ├── generated/            ← auto-generated flow barrel/models/services (committed; do not edit)
    ├── services/
    │   ├── unwrap.ts         ← the flow-result boundary (+ unwrap.spec.ts)
    │   ├── exampleService.ts ← example domain service (delete when wiring real flows)
    │   └── mock/generated.ts ← dev-only mock of the generated barrel
    ├── composables/          ← useFormValidation, useSessionCache
    ├── utils/                ← validators, phone (each with a *.spec.ts)
    ├── views/                ← HomePage, NotFoundPage
    ├── components/           ← AppNav (RTL-safe)
    └── styles/main.css       ← minimal reset
```

---

## Adding Features

### New route
1. Create `src/views/YourPage.vue`
2. Add a route in `src/router/index.ts`: `{ path: "/your-path", component: YourPage }`
3. Add a nav entry to `navItems` in `src/App.vue`

### New flow call
1. `pnpm pa add-flow` to generate the service
2. Add a domain service in `src/services/` (`Service.Run()` → `unwrap()` → domain type)
3. Add a matching mock export in `src/services/mock/generated.ts`
4. Call it from your view (e.g. in `onMounted`) with loading/error handling and a toast on failure

---

## Design System

**Default to `@smkbacil/design-ui` for everything** — components, colors, spacing, typography, radius. Write custom CSS only when no component or token fits. All components are globally registered in `main.ts`; use them directly with no per-file import.

| Component | When to use |
|-----------|-------------|
| `SmkbTable` | Any list or grid of records |
| `SmkbButton` | Primary, secondary, and ghost actions |
| `SmkbIconButton` + `SmkbTooltip` | Icon-only actions |
| `SmkbInput` / `SmkbField` | Text inputs and labelled field wrappers |
| `SmkbDialog` / `SmkbTabs` | Modals and tabbed panels |

**`SmkbTable` example:**

```vue
<SmkbTable :loading="loading" :data="items" :columns="columns" row-key="id" hoverable>
  <template #empty>לא נמצאו פריטים.</template>
</SmkbTable>
```

```typescript
const columns = [
  { field: "name", label: "שם" },
  { field: "createdAt", label: "נוצר" },
]
```

**`useSmkbToast()` for notifications** (use for every caught service error):

```typescript
import { useSmkbToast } from "@smkbacil/design-ui"
const toast = useSmkbToast()
toast.success("נשמר.")
toast.error("משהו השתבש.")
```

### CSS tokens

| Category | Token pattern | Examples |
|----------|---------------|---------|
| Spacing | `--smkb-space-{1–16}` | `--smkb-space-4` |
| Color | `--smkb-color-{name}` | `--smkb-color-primary`, `--smkb-color-text-secondary` |
| Font size | `--smkb-font-size-{size}` | `--smkb-font-size-sm`, `--smkb-font-size-xl` |
| Font weight | `--smkb-font-weight-{weight}` | `--smkb-font-weight-semibold` |
| Radius | `--smkb-radius-{size}` | `--smkb-radius-md` |

> The design-system reference is in `SMKB-UI.md` (auto-generated — do not hand-edit).

---

## How `deploy.ps1` Works

1. **Placeholder guard** — scans `*.json`/`*.ts`/`*.vue` for unreplaced template strings (incl. `sol_exampleflow`); exits if any remain.
2. **Read config** — `solutionName`, `targetEnv`, `allowedEnvs` from `deploy.config.json`.
3. **Environment guard** — refuses to deploy unless `targetEnv` is listed in `allowedEnvs` (empty ships → hard block).
4. **Quality gate** — `pnpm run lint` then `pnpm run test`; aborts on failure.
5. **Build** — `pnpm run build` (`vue-tsc` type check + Vite build → `dist/`).
6. **Push** — `pnpm pa push` (adds `--solution-id <solutionName>` when set).

> `pnpm pa push` updates an existing app. Run `pac code init` first if the app record does not exist yet. Stage/Production are promoted via Power Platform Pipeline, not this script.
