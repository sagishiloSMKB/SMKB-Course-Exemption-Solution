# Technology Stack

> **TEMPLATE** — this is mostly the standard SMKB stack (keep as-is). Adjust only the `[FILL IN: …]`
> app-specific rows and drop any starter this solution didn't activate. Delete this callout once populated.

## Front-end applications (Code App / Code Site)

| Area | Technology | Notes |
|---|---|---|
| Language | **TypeScript** (strict mode) | `noUnusedLocals` / `noUnusedParameters` on |
| Framework | **Vue 3** (`<script setup>`) | Composition API |
| Build tool | **Vite 6** | Production build → `dist/` |
| Type-check | **vue-tsc** | Runs in the build; must pass before deploy |
| Design system | **`@smkbacil/design-ui`** | Private npm package (`@smkbacil` scope) — the shared SMKB component library + tokens; registered globally via `createSmkb()` |
| Linting | **ESLint 9** (flat config) | `vue/no-v-html`, `no-console`, no-direct-network rules |
| Unit tests | **Vitest 2** | Pure-logic specs (`src/**/*.spec.ts`) |

### Power Pages Code Site specifics (`SMKB - [Name] - Power Pages Code Site`)
- Hosted as a **Power Pages Code Site** (serves `index.html` for every route).
- Routing: **HTML5 history** (`createWebHistory()`).
- State: **Pinia**, routing: **Vue Router 4**.
- Design tokens use `tokens-nofonts.css` (Power Pages CSP blocks font binaries).
- Client-side flow calls: `src/services/cloudFlow.ts`; CSRF helper: `src/services/csrf.ts`.

### Power Apps Code App specifics (`SMKB - [Name] - Power App`)
- Hosted as a **Power Apps Code App** (`@microsoft/power-apps` SDK).
- Routing: **hash-based** (`createWebHashHistory()`) — required by the Power Apps player.
- Data access: **generated flow-service classes** in `src/generated/` (via `@microsoft/power-apps/data`),
  wrapped by thin services in `src/services/` using a shared `unwrap()` result helper.

## Automation & platform

| Area | Technology |
|---|---|
| Workflow engine | **Power Automate** cloud flows (Logic Apps workflow-definition JSON) |
| Data platform | **Microsoft Dataverse** (custom `smkb_<prefix>_*` tables + environment variables) |
| Document/list store (if used) | **SharePoint Online** |
| Connectors | `[FILL IN: e.g. SharePoint Online, Office 365 Outlook, Microsoft Dataverse, Approvals]` |
| Secrets | **Azure Key Vault** (referenced by Secret-type environment variables) |
| Solution packaging | Power Platform **solution** (unmanaged in Dev), promoted via **pipeline** |

## Tooling & engineering

| Purpose | Tool |
|---|---|
| Cloud-flow static checks | **`tools/flow-lint/`** — a zero-dependency Node ESM checker (rules + self-test) for the flows + solution XML |
| SPA lint | ESLint (per app) |
| SPA unit tests | Vitest (per app) |
| Pre-commit gate | `.githooks/pre-commit` — ESLint on staged Vue/TS, flow-lint on staged flow JSON/XML, config-drift + doc-boundary checks |
| CI | GitHub Actions (`.github/workflows/ci.yml`) — flow-lint + each app's lint & tests |
| Platform static analysis | **Power Platform Solution Checker** (`pac solution check`) |
| CLI | **PAC CLI** (`pac`) for solution import, code push, pages upload |
| Package manager | pnpm (Power Apps Code App) / npm (Power Pages Code Site); Node 20+ |

See [Testing & Quality Gates](08-testing-and-quality-gates.md) and the solution-wide
[TESTING-STRATEGY.md](../TESTING-STRATEGY.md) for how these run and what they enforce.
