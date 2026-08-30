# Power Pages Code Site — Modern Development & ALM Guide (2026)

> **Model A: Native SPA / "Code Site"** — GA February 2026.
> This guide covers the complete lifecycle: scaffold → develop → manage components → promote via ALM pipeline.

## Documentation References

| Topic | URL |
|---|---|
| Create and deploy a code site | https://learn.microsoft.com/en-us/power-pages/configure/create-code-sites |
| PAC CLI `pages` command reference | https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/pages |
| PAC CLI tutorial for Power Pages | https://learn.microsoft.com/en-us/power-pages/configure/power-platform-cli-tutorial |
| Power Pages Web API overview | https://learn.microsoft.com/en-us/power-pages/configure/web-api-overview |
| Web API HTTP requests & error handling | https://learn.microsoft.com/en-us/power-pages/configure/web-api-http-requests-handle-errors |
| Power Pages ALM overview | https://learn.microsoft.com/en-us/power-pages/configure/portals-alm |
| Use solutions with Power Pages | https://learn.microsoft.com/en-us/power-pages/configure/power-pages-solutions |
| Enhanced data model | https://learn.microsoft.com/en-us/power-pages/admin/enhanced-data-model |
| Environment variables for site settings | https://learn.microsoft.com/en-us/power-pages/configure/environment-variables-for-site-settings |
| Deployment profiles | https://learn.microsoft.com/en-us/power-pages/configure/deployment-profiles |
| Content Security Policy | https://learn.microsoft.com/en-us/power-pages/security/manage-content-security-policy |
| Table permissions | https://learn.microsoft.com/en-us/power-pages/security/table-permissions |
| Power Platform Build Tools (DevOps) | https://learn.microsoft.com/en-us/power-platform/alm/devops-build-tools |
| GitHub Actions for Power Platform | https://learn.microsoft.com/en-us/power-platform/alm/devops-github-available-actions |
| Power Pages plugin for Claude Code / Copilot CLI | https://learn.microsoft.com/en-us/power-pages/configure/create-code-site-using-claude-code |
| Official samples (React + Vue) | https://github.com/microsoft/power-pages-samples |
| pac solution unpack/pack | https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/solution |

---

## Table of Contents

1. [Prerequisites & Tooling](#1-prerequisites--tooling)
2. [Scaffold a New Code Site](#2-scaffold-a-new-code-site)
3. [Project Structure (Canonical)](#3-project-structure-canonical)
4. [Vite Configuration](#4-vite-configuration)
5. [`powerpages.config.json`](#5-powerpagesconfigjson)
6. [Managing Site Components](#6-managing-site-components-non-spa-artifacts)
7. [Power Pages Web API](#7-power-pages-web-api)
7.5. [Cloud Flows (Power Automate Integration)](#75-cloud-flows-power-automate-integration)
8. [Authentication](#8-authentication)
9. [Local Development](#9-local-development)
10. [ALM: Promoting Between Environments](#10-alm-promoting-between-environments)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Gitignore & Source Control Rules](#12-gitignore--source-control-rules)
13. [Common Pitfalls](#13-common-pitfalls)
14. [Quick-Reference Cheat Sheet](#14-quick-reference-cheat-sheet)

---

## 1. Prerequisites & Tooling

### Install

```powershell
# 1. Node.js LTS - https://nodejs.org
winget install OpenJS.NodeJS.LTS

# 2. Power Platform CLI
dotnet tool install --global Microsoft.PowerApps.CLI.Tool
# verify
pac --version   # must show 1.44.x or later

# 3. VS Code + Power Platform Tools extension
# Marketplace: https://marketplace.visualstudio.com/items?itemName=microsoft-IsvExpTools.powerplatform-vscode
# Install ONE of these - NOT both:
#   "Power Platform Tools"  (stable)
#   "Power Platform Tools [PREVIEW]"  <- do not mix
```

### Unblock JavaScript uploads in Dataverse (one-time per environment)

Power Platform Admin Center → Environment → Settings → Product → Privacy + Security → **Blocked Attachments** — remove `js` from the list.

### Authenticate PAC CLI

```powershell
# Interactive (developer machine)
pac auth create --environment "https://org229c958d.crm4.dynamics.com/"

# Service Principal (CI/CD - preferred)
pac auth create `
  --environment "https://org229c958d.crm4.dynamics.com/" `
  --applicationId "<app-id>" `
  --clientSecret  "<secret>" `
  --tenant        "<tenant-id>"

pac auth list              # view profiles
pac auth select --index 1  # switch active profile
```

> Docs: [Install PAC CLI](https://learn.microsoft.com/en-us/power-platform/developer/howto/install-cli-msi) · [pac auth](https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/auth)

---

## 2. Scaffold a New Code Site

### Option A — PAC CLI plugin (recommended, 2026)

The Power Pages plugin for Claude Code / GitHub Copilot CLI scaffolds the full project interactively.

```powershell
# Install the plugin (run once)
iwr https://raw.githubusercontent.com/microsoft/power-platform-skills/main/scripts/install.js `
  -OutFile install.js; node install.js; del install.js

# In Claude Code terminal, run:
/create-site
# Then choose: Vue | React | Angular | Astro
```

> Docs: [Power Pages plugin for Claude Code](https://learn.microsoft.com/en-us/power-pages/configure/create-code-site-using-claude-code)

### Option B — Vite manually (Vue 3)

```powershell
npm create vite@latest my-site -- --template vue-ts
cd my-site
npm install
```

### Option C — Vite manually (React)

```powershell
npm create vite@latest my-site -- --template react-ts
cd my-site
npm install
```

> Official samples: [microsoft/power-pages-samples](https://github.com/microsoft/power-pages-samples) — contains complete Vue and React starter projects.

---

## 3. Project Structure (Canonical)

```
my-repo/
│
├── src/                              ← Vue/React SPA source
│   ├── components/
│   │   ├── AuthButton.vue
│   │   └── RecordList.vue
│   ├── composables/                  ← (or hooks/ for React)
│   │   ├── usePortalUser.ts
│   │   ├── useFlowErrorToast.ts      ← localized toast for FlowError
│   │   └── useFormValidation.ts
│   ├── config/
│   │   ├── solution.ts               ← per-solution identity (prefix, app name, languages)
│   │   └── flows.ts                  ← flow GUID registry (ships empty)
│   ├── services/
│   │   ├── cloudFlow.ts              ← invokeFlow / FlowError — the only backend channel
│   │   ├── csrf.ts                   ← CSRF token cache (dev fetch fallback only)
│   │   └── flowErrors.ts             ← errorCode → user message maps (he/en)
│   ├── utils/
│   │   ├── sessionCache.ts           ← session cache + inflight dedup for flow reads
│   │   ├── safeJson.ts
│   │   └── fileUtils.ts              ← base64 file payloads for flow uploads
│   ├── modules/
│   │   └── otp-auth/                 ← dormant phone-OTP auth module (opt-in)
│   ├── router/
│   │   └── index.ts
│   ├── stores/                       ← Pinia (or Zustand/Redux)
│   ├── App.vue
│   └── main.ts
│
├── public/
│   └── favicon.ico
│
├── dist/                             ← Vite build output — GITIGNORE
│
├── .powerpages-site/                 ← pac pages download output — COMMIT
│   ├── table-permissions/
│   │   └── contact-read.entitypermission.yml
│   ├── web-roles/
│   │   ├── anonymous-users.webrole.yml
│   │   └── authenticated-users.webrole.yml
│   ├── site-settings/
│   │   └── webapi-contact-enabled.sitesetting.yml
│   ├── .portalconfig/
│   │   ├── manifest.yml              ← COMMIT (deletion tracking)
│   │   └── <org-url>-manifest.yml   ← GITIGNORE (per-env state)
│   └── deployment-profiles/
│       ├── dev.deployment.yml
│       ├── test.deployment.yml
│       └── prod.deployment.yml
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── powerpages.config.json            ← PAC CLI code site config
├── .env.example                      ← committed (template, no secrets)
├── .env.local                        ← GITIGNORE (local secrets)
└── .gitignore
```

> **Key rule:** The SPA source and the Power Pages site components (`.powerpages-site/`) live in the same repository. The SPA code builds into `dist/`. The `dist/` output plus the `.powerpages-site/` artifacts are what PAC CLI uploads together in a single command.

---

## 4. Vite Configuration

### Why stable filenames

Vite's default content-hashed filenames (`index-C0cDBgFa.js`) create a new Dataverse Web File record on every build, accumulating orphaned records indefinitely. Stable filenames mean each deploy **overwrites** the same record.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'; // swap for react() if using React

export default defineConfig({
  plugins: [vue()],

  // base: '/' is correct for a full-site code site
  base: '/',

  build: {
    outDir: 'dist',
    emptyOutDir: true,                // wipe dist/ before each build
    rollupOptions: {
      output: {
        // Stable, predictable filenames — no content hashes
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',

        // Explicit chunk boundaries — prevents cascading renames
        manualChunks: {
          vue:    ['vue', 'vue-router', 'pinia'],
          // react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },

  // Local dev: proxy API calls to the live portal (avoids CORS on localhost)
  server: {
    proxy: {
      '/_api':    { target: 'https://your-site.powerappsportals.com', changeOrigin: true, secure: true },
      '/_layout': { target: 'https://your-site.powerappsportals.com', changeOrigin: true, secure: true },
    },
  },
});
```

> Docs: [Vite build options](https://vitejs.dev/config/build-options)

### The cache-buster plugin — the flip side of stable filenames

Stable filenames solve the stale-Web-File-record problem but create a caching one: the asset URLs never change between builds, so a CDN/edge cache can keep serving an old chunk after a deploy. The dangerous case is a **mixed** cache — fresh `index.js` importing a stale `vue.js` — which surfaces at runtime as `"The requested module ... does not provide an export named X"` (a real production incident with this starter).

The starter's `vite.config.ts` therefore includes a small `cache-buster` plugin that stamps a per-build version onto every asset URL:

- `transformIndexHtml` — appends `?v=<buildTimestamp>` to `src`/`href` asset URLs in `index.html`
- `generateBundle` — rewrites cross-chunk import specifiers inside the emitted chunks (`from"./vue.js"` and `import("./x.js")` become `...?v=<buildTimestamp>`)

The filenames stay stable (same Dataverse Web File records), but every build's URLs carry a fresh query string, so caches always miss after a deploy. **Do not remove this plugin.**

---

## 5. `powerpages.config.json`

```json
{
  "siteName": "My Power Pages App",
  "defaultLandingPage": "index.html",
  "compiledPath": "./dist",
  "bundleFilePatterns": [
    "assets/index.js",
    "assets/vue.js",
    "assets/index.css",
    "assets/FluentSystemIcons-*.woff2"
  ]
}
```

| Field | Purpose |
|---|---|
| `siteName` | Must match the exact site name in Power Pages home |
| `defaultLandingPage` | Entry point returned for every server-side route (SPA root) |
| `compiledPath` | Path to Vite `dist/` output |
| `bundleFilePatterns` | Files PAC CLI **deletes before uploading** — prevents stale record accumulation |

The config is read automatically when you run `pac pages upload-code-site --rootPath "."` from the project root.

---

## 6. Managing Site Components (Non-SPA Artifacts)

These are the Dataverse records that control security, configuration, and data access — they travel with your source code in `.powerpages-site/` and are promoted between environments alongside your SPA assets.

### Download all components

```powershell
# Find website GUID and confirm Enhanced Data Model
pac pages list -v

# First download
pac pages download `
  --path "./.powerpages-site" `
  --webSiteId "<GUID>" `
  --modelVersion 2

# Refresh (pull changes made in Design Studio back to local)
pac pages download `
  --path "./.powerpages-site" `
  --webSiteId "<GUID>" `
  --modelVersion 2 `
  --overwrite
```

### Component folder map

```
.powerpages-site/
├── table-permissions/      ← WHO can read/write WHAT Dataverse data
├── web-roles/              ← Access groupings (Anonymous, Authenticated, custom)
├── site-settings/          ← Feature flags, Web API enablement, auth config
├── entity-forms/           ← Basic form definitions
├── entity-lists/           ← Grid/list view definitions
├── page-templates/
├── web-link-sets/
├── site-markers/
├── redirects/
└── .portalconfig/
    ├── manifest.yml        ← COMMIT: tracks deletions for propagation
    └── <org-url>-manifest.yml  ← GITIGNORE: per-developer/env state
```

### Table permissions — examples

```yaml
# .powerpages-site/table-permissions/contact-read.entitypermission.yml
EntityName: contact
TablePermissionId: 11112222-aaaa-3333-bbbb-444455556666
AccessType: Global
PrivilegeType: Read
WebRoles:
  - Anonymous Users
  - Authenticated Users
```

```yaml
# .powerpages-site/table-permissions/cr7ae_order-self.entitypermission.yml
EntityName: cr7ae_order
TablePermissionId: aaaabbbb-1111-cccc-2222-dddd33334444
AccessType: Self          # user can only access their own records
PrivilegeType: Create,Read,Write
WebRoles:
  - Authenticated Users
```

> **Table permissions are now enforced on all forms and lists** regardless of the "Enable Table Permissions" flag. Audit all sites.
> Docs: [Table permissions](https://learn.microsoft.com/en-us/power-pages/security/table-permissions)

### Site settings — enable Web API per table

```yaml
# .powerpages-site/site-settings/webapi-contact-enabled.sitesetting.yml
adx_name: Webapi/contact/enabled
adx_value: "true"
```

```yaml
# .powerpages-site/site-settings/webapi-contact-fields.sitesetting.yml
adx_name: Webapi/contact/fields
adx_value: "firstname,lastname,emailaddress1,telephone1"
```

### Deployment profiles — environment-specific values without secrets in code

```yaml
# .powerpages-site/deployment-profiles/prod.deployment.yml
adx_sitesetting:
  - adx_sitesettingid: 4ad86900-b5d7-43ac-1234-482529724970
    adx_name: Authentication/OpenAuth/Facebook/AppId
    adx_value: ${OS.FACEBOOK_APP_ID}        # resolved from pipeline secret at upload time

  - adx_sitesettingid: 5ad86900-b5d7-43ac-8359-482529724979
    adx_name: Authentication/OpenAuth/Facebook/Secret
    adx_value: ${OS.FACEBOOK_APP_SECRET}

adx_contentsnippet:
  - adx_contentsnippetid: b0a1bc03-0df1-4688-86e8-c67b34476510
    adx_name: Browser Title Suffix
    adx_value: " · Contoso (Production)"
```

`${OS.VARIABLE_NAME}` is substituted from OS environment variables at upload time. Never put actual secret values in `.deployment.yml` files.

> Docs: [Deployment profiles](https://learn.microsoft.com/en-us/power-pages/configure/deployment-profiles)

### Upload everything together (SPA assets + site components)

```powershell
npm run build
pac pages upload-code-site --rootPath "."
```

One command uploads both `dist/` and `.powerpages-site/` contents.

> **Note:** `pac pages upload-code-site` has no `--deploymentProfile` flag (that
> flag exists only on the traditional `pac pages upload`). The target environment
> is chosen entirely by the active `pac auth` profile — see [ALM-CODE-SITES.md](./ALM-CODE-SITES.md).

---

## 7. Power Pages Web API

> **This starter is flows-only by default.** All backend work goes through cloud flows (§7.5) via `src/services/cloudFlow.ts`; `portalApi.ts` does not ship, and ESLint bans `fetch`/XHR outside the flow client. The Web API is the **opt-out path**: run `/ppcs-enable-web-api <tableName> [fields]` to restore `portalApi.ts`, generate the site settings + table permission YAMLs, and update the ESLint exceptions. The rest of this section is reference material for that opt-out.

### Enable per table (site settings — see Section 6)

### Fetch wrapper with CSRF token

```typescript
// src/services/portalApi.ts
let _csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (_csrfToken) return _csrfToken;
  const res = await fetch('/_layout/tokenhtml');
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  _csrfToken =
    doc.querySelector<HTMLInputElement>('input[name="__RequestVerificationToken"]')?.value ?? '';
  return _csrfToken;
}

const BASE_HEADERS = {
  Accept: 'application/json',
  'OData-MaxVersion': '4.0',
  'OData-Version': '4.0',
};

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin', headers: BASE_HEADERS });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getCsrfToken();
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      ...BASE_HEADERS,
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function apiPatch(path: string, body: unknown): Promise<void> {
  const token = await getCsrfToken();
  const res = await fetch(path, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: {
      ...BASE_HEADERS,
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const token = await getCsrfToken();
  const res = await fetch(path, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { ...BASE_HEADERS, '__RequestVerificationToken': token },
  });
  if (!res.ok) throw await res.json();
}
```

> GET requests do not require the CSRF token. POST / PATCH / DELETE do.
> No CORS issues when deployed — SPA and `/_api/` are on the same origin.

### OData query examples

```
# Read with select + filter
/_api/contacts?$select=firstname,lastname,emailaddress1&$filter=statuscode eq 1

# Read single record
/_api/contacts(00000000-0000-0000-0000-000000000001)

# Read with expand
/_api/cr7ae_orders?$select=cr7ae_total&$expand=cr7ae_contact_id($select=fullname)

# Create  → POST  /_api/contacts             body: { "firstname": "Jane", "lastname": "Doe" }
# Update  → PATCH /_api/contacts(<guid>)     body: { "telephone1": "555-1234" }
# Delete  → DELETE /_api/contacts(<guid>)
```

> Use the table **logical name** in site settings (`contact`) but the **entity set name** in API URLs (`contacts`).
> Find entity set name: make.powerapps.com → Dataverse → Tables → your table → Advanced → Tools → Copy set name.

> Docs: [Web API overview](https://learn.microsoft.com/en-us/power-pages/configure/web-api-overview) · [HTTP requests & errors](https://learn.microsoft.com/en-us/power-pages/configure/web-api-http-requests-handle-errors)

### Vue 3 composable example

```typescript
// src/composables/useContacts.ts
import { ref, onMounted } from 'vue';
import { apiGet } from '../services/portalApi';

interface Contact {
  contactid: string;
  firstname: string;
  lastname: string;
  emailaddress1: string;
}

export function useContacts() {
  const contacts = ref<Contact[]>([]);
  const loading  = ref(false);
  const error    = ref<string | null>(null);

  async function load() {
    loading.value = true;
    try {
      const data = await apiGet<{ value: Contact[] }>(
        '/_api/contacts?$select=contactid,firstname,lastname,emailaddress1'
      );
      contacts.value = data.value;
    } catch {
      error.value = 'Failed to load contacts';
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);
  return { contacts, loading, error, reload: load };
}
```

---

## 7.5 Cloud Flows (Power Automate Integration)

Use cloud flows for any logic that must not run in the browser: external HTTP APIs (REST, OAuth), email, approvals, Teams notifications, or complex data transformations with server-side re-validation.

> Docs: [Configure Power Automate cloud flows in Power Pages](https://learn.microsoft.com/en-us/power-pages/configure/cloud-flow-integration)

---

### Create and register a flow

**In Power Automate:**
1. Create a new cloud flow — use trigger **"When Power Pages calls a flow"**
2. The flow **must be in a solution** (Personal/non-solution flows cannot be attached to a Power Pages site)
3. Add your actions, then optionally add the **"Return value(s) to Power Pages"** action if the SPA needs a response

**In Power Pages Studio:**
1. **Set up → Cloud flows → + Add cloud flow** → select your solution flow
2. **Assign web roles** (mandatory — without this the endpoint returns 403):
   - *Authenticated Users* — for flows that require sign-in
   - *Anonymous Users* — only for flows callable without sign-in
3. Copy the GUID from the trigger URL shown:
   `/_api/cloudflow/v1.0/trigger/<guid-here>`

---

### Calling a flow from the SPA

Use `invokeFlow()` from `src/services/cloudFlow.ts` — it handles CSRF token, headers, and response parsing.

```typescript
import { invokeFlow } from '@/services/cloudFlow'
import { FLOWS } from '@/config/flows'

// Fire-and-forget (flow has no return action → 202 Accepted)
await invokeFlow(FLOWS.submitContactForm, {
  email: 'user@example.com',
  message: 'Hello',
})

// With return value (flow has "Return value(s) to Power Pages" action → 200 OK)
const result = await invokeFlow<{ approvalId: string; status: string }>(
  FLOWS.requestApproval,
  { contactId: user.value.contactId, amount: 500 },
)
```

---

### Error contract — HTTP 200 + `errorCode`

Power Pages **discards the body of any non-2xx flow response** and returns a generic `{ "ErrorCode": "00000006" }` envelope, so a 400/404/500 from the flow can never carry business meaning. Every flow Response action therefore uses `statusCode: 200`; business errors are bodies of the form `{ "errorCode": "<CODE>", ...optionalFields }`. `invokeFlow` converts such a body into a thrown `FlowError` with `.code` (the errorCode) and `.data` (the full body); genuine transport/platform failures (network, 403 web-role-not-assigned, 400 schema mismatch) throw `FlowError('ERROR')`. In the UI, `useFlowErrorToast()` maps codes to localized messages via `src/services/flowErrors.ts`.

Full contract — flow-side Response/Terminate pattern, standard code vocabulary, portal-side handling: [FLOW-ERROR-CONTRACT.md](./FLOW-ERROR-CONTRACT.md).

---

### Technical reference

**Endpoint:** `POST /_api/cloudflow/v1.0/trigger/<guid>`

**Required headers:**
```
__RequestVerificationToken: <token from /_layout/tokenhtml>
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
x-requested-with: XMLHttpRequest
```

**Body format** — `URLSearchParams` with one key, `eventData`, whose value is the JSON-stringified parameters:
```
eventData={"paramName1":"value1","paramName2":42}
```

> **Note:** in the deployed code-site runtime, `window.shell.ajaxSafePost` **is** available and is the primary transport used by `cloudFlow.ts` — the shell handles the CSRF token and form-urlencoded encoding itself (do not set a `contentType`). The raw headers/body above describe the **fetch fallback** used in local dev, where `window.shell` does not exist: `URLSearchParams` with `application/x-www-form-urlencoded` plus the CSRF token from `src/services/csrf.ts`.

**Response codes:**

| Code | Meaning |
|---|---|
| `200 OK` | Flow has a "Return value(s) to Power Pages" action — body is JSON |
| `202 Accepted` | Fire-and-forget — flow runs async, no body |
| `403 Forbidden` | Web role not assigned to this flow in Studio |
| `400 Bad Request` | Parameter names don't match flow trigger definition |

---

### Flow GUID management

Flow GUIDs are site-specific and environment-specific — assigned by Studio. The starter ships `src/config/flows.ts` as an empty typed registry; append entries after Studio setup (or run `/ppcs-register-flow`):

```typescript
// src/config/flows.ts  (ships empty — append entries after Studio setup)
export const FLOWS: Record<string, string> = {
  submitContactForm: '4d22a1a2-8a67-e681-9985-3f36acfb8ed4',
  requestApproval: 'bb7de2f9-f814-44ef-9ed6-9b1e238b8655',
}
```

---

### Security

- The CSRF token + session cookie blocks external callers — only the browser session of an authenticated (or explicitly anonymous-permitted) user can invoke the flow
- **Table permissions are NOT enforced inside cloud flows.** Re-validate `contactId`, `accountId`, or other scoping values within the flow before accessing Dataverse records
- Do not trust input params from the SPA as authoritative — re-fetch and validate inside the flow

---

### ALM: promoting flows across environments

After importing a solution to a target environment:
1. The flow is present in the org, but **not registered** in the Power Pages site yet
2. Go to Power Pages Studio (target env) → **Set up → Cloud flows → + Add cloud flow**
3. Select the promoted flow and re-assign web roles
4. Update the GUID in `src/config/flows.ts` to the new environment's GUID

---

### Flows vs Web API

In this starter there is no per-task choice: **all backend work goes through cloud flows** — Dataverse reads/writes, external APIs, email/Teams, approvals, and multi-step server-side logic.
Opt-out: if a table genuinely needs direct, low-latency browser access, run `/ppcs-enable-web-api` (restores `portalApi.ts` and the required site settings/permissions — see §7).

---

## 8. Authentication

### Read the current user — no OAuth needed in production

When a user signs into the Power Pages site, the platform injects user context as a global JS object. Your SPA reads it directly — no MSAL, no token exchange.

```typescript
// src/composables/usePortalUser.ts

declare global {
  interface Window {
    Microsoft: {
      Dynamic365: {
        Portal: {
          User: {
            userName:  string;   // empty string = anonymous
            firstName: string;
            lastName:  string;
            email:     string;
            contactId: string;
          };
          tenant: string;        // Azure AD tenant GUID
        };
      };
    };
  }
}

export function usePortalUser() {
  const u = window?.Microsoft?.Dynamic365?.Portal?.User;
  return {
    isAuthenticated: !!(u?.userName),
    userName:  u?.userName  ?? '',
    firstName: u?.firstName ?? '',
    lastName:  u?.lastName  ?? '',
    email:     u?.email     ?? '',
    contactId: u?.contactId ?? '',
    tenantId:  window?.Microsoft?.Dynamic365?.Portal?.tenant ?? '',
  };
}
```

> Read the user object inside `onMounted` / `useEffect` — not at module top level.

### Sign in / sign out

```typescript
// src/services/auth.ts

export function signIn(returnPath?: string): void {
  const tenantId  = window?.Microsoft?.Dynamic365?.Portal?.tenant ?? '';
  const returnUrl = encodeURIComponent(
    (returnPath ?? window.location.pathname + window.location.search) +
    window.location.hash.replace('#', '%23')  // preserve hash-based routes through redirect
  );
  window.location.href =
    `/Account/Login/ExternalLogin` +
    `?provider=${encodeURIComponent(`https://login.windows.net/${tenantId}/`)}` +
    `&returnUrl=${returnUrl}`;
}

export function signOut(): void {
  window.location.href = '/Account/Login/LogOff?returnUrl=%2F';
}
```

### AuthButton component (Vue 3)

```vue
<!-- src/components/AuthButton.vue -->
<template>
  <div class="auth-bar">
    <template v-if="isAuthenticated">
      <span>{{ firstName }} {{ lastName }}</span>
      <button @click="signOut">Sign Out</button>
    </template>
    <template v-else>
      <button @click="() => signIn()">Sign In</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { signIn, signOut } from '../services/auth';

const isAuthenticated = ref(false);
const firstName       = ref('');
const lastName        = ref('');

onMounted(() => {
  const u = window?.Microsoft?.Dynamic365?.Portal?.User;
  isAuthenticated.value = !!(u?.userName);
  firstName.value       = u?.firstName ?? '';
  lastName.value        = u?.lastName  ?? '';
});
</script>
```

---

## 9. Local Development

```powershell
npm run dev   # Vite dev server at http://localhost:5173
```

The Vite proxy forwards `/_api` and `/_layout` to the live portal. The portal session cookie is not present on localhost, so:

- **Anonymous calls** (read-only, globally scoped table permissions) — work fine.
- **Authenticated calls** (write, contact-scoped) — return 401.

### Bearer auth for authenticated local testing

Power Pages uses Entra **v1** endpoints. Use **ADAL.js** — not MSAL.js (MSAL v2 tokens are rejected by the portal).

1. Add `http://localhost:5173/` as a redirect URI in the Entra app registration → Single-Page Application platform.
2. In Portal Management App, set these site settings:
   ```
   Authentication/BearerAuthentication/Enabled  = true
   Authentication/BearerAuthentication/Protocol = OpenIdConnect
   Authentication/BearerAuthentication/Provider = AzureAD
   ```
3. Set site visibility to **Public** in Power Pages home.
4. Install `adal-angular` and acquire a token for `https://login.windows.net/<tenant-id>/`.
5. Add `Authorization: Bearer <id_token>` to fetch calls in development mode only.

`.env.local` (gitignored):
```
VITE_TENANT_ID=your-tenant-guid
VITE_CLIENT_ID=your-app-registration-client-id
VITE_PORTAL_URL=https://your-site.powerappsportals.com
```

`.env.example` (committed — no real values):
```
VITE_TENANT_ID=
VITE_CLIENT_ID=
VITE_PORTAL_URL=
```

---

## 10. ALM: Promoting Between Environments

### The Two-Track Model

Every promotion moves two kinds of content:

| Track | Content | Managed by |
|---|---|---|
| **SPA assets** | Compiled JS / CSS / HTML from `dist/` | `pac pages upload-code-site` |
| **Site components** | Table permissions, web roles, site settings, forms | `pac pages upload-code-site` (reads `.powerpages-site/`) or solution import |

Both tracks travel together in one command when `.powerpages-site/` is co-located in the project.

### Option 1: Direct Upload — Recommended for Code Sites

No solution packaging required. Best when Power Pages is the primary deliverable.

```
feature/* → develop (DEV env) → merge → main → pipeline:
  1. npm run build
  2. pac auth create --environment <TEST>  → pac pages upload-code-site --rootPath "."   → TEST env
  3. [approval gate]
  4. pac auth create --environment <PROD>  → pac pages upload-code-site --rootPath "."   → PROD env
```

The target environment is selected by the active `pac auth` profile — `upload-code-site` has no `--deploymentProfile` flag.

### Option 2: Solution-Based — Required when Dataverse tables/flows also need promotion

```powershell
# Export from DEV (unmanaged)
pac solution export `
  --name MyPortalSolution `
  --path "./solutions" `
  --managed false

# Unpack into source control
pac solution unpack `
  --zipfile "./solutions/MyPortalSolution.zip" `
  --folder  "./solutions/MyPortalSolution" `
  --packagetype Unmanaged

# ── In release pipeline ──────────────────────────────────────────────────────

# Pack as managed
pac solution pack `
  --zipfile "./solutions/MyPortalSolution_managed.zip" `
  --folder  "./solutions/MyPortalSolution" `
  --packagetype Managed

# Import to target
pac solution import `
  --path "./solutions/MyPortalSolution_managed.zip" `
  --async true `
  --max-async-wait-time 120

# Upload SPA assets after solution import (target env = active pac auth profile)
pac pages upload-code-site --rootPath "."
```

> Docs: [Use solutions with Power Pages](https://learn.microsoft.com/en-us/power-pages/configure/power-pages-solutions) · [pac solution reference](https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/solution)

### Deletion tracking — the 5-step process

Deletions (e.g., removing a table permission) must be explicitly tracked to propagate:

```powershell
# 1. Download to establish baseline
pac pages download --path "./.powerpages-site" --webSiteId "<GUID>" --modelVersion 2

# 2. Delete the record in the source environment (Portal Management App or Design Studio)

# 3. Download again - deletion is recorded in manifest.yml
pac pages download --path "./.powerpages-site" --webSiteId "<GUID>" --modelVersion 2 --overwrite

# 4. Commit manifest.yml

# 5. Upload to target - deletion is applied
pac pages upload-code-site --rootPath "."
```

Skipping step 1 or 3 means the deletion will **not** propagate to the target environment.

### Environment variables for site settings (cleanest approach for Enhanced Data Model)

Instead of deployment profiles, link site settings to Dataverse environment variables:

1. Create an environment variable definition in the Power Pages Management App.
2. Link it to the site setting (Source = "Environment Variable").
3. Include the site + environment variables in a solution.
4. Assign environment-specific values during solution import in each target environment.

No secrets in source control at all.

> Docs: [Environment variables for site settings](https://learn.microsoft.com/en-us/power-pages/configure/environment-variables-for-site-settings)

---

## 11. CI/CD Pipeline

### GitHub Actions (complete workflow)

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy Power Pages Code Site

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: Target environment
        required: true
        default: production
        type: choice
        options: [development, test, production]

env:
  NODE_VERSION: '20'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - run: npm ci

      - run: npm run build
        env:
          VITE_APP_ENV: ${{ github.event.inputs.environment || 'production' }}

      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment || 'production' }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - name: Install PAC CLI
        run: |
          dotnet tool install --global Microsoft.PowerApps.CLI.Tool
          echo "$HOME/.dotnet/tools" >> $GITHUB_PATH

      - name: Authenticate PAC CLI
        run: |
          pac auth create \
            --environment "${{ vars.PP_ENVIRONMENT_URL }}" \
            --applicationId "${{ secrets.AZURE_CLIENT_ID }}" \
            --clientSecret  "${{ secrets.AZURE_CLIENT_SECRET }}" \
            --tenant        "${{ secrets.AZURE_TENANT_ID }}"

      # The pac auth create step above targets the environment; upload-code-site
      # takes no --deploymentProfile flag.
      - name: Upload Code Site
        run: pac pages upload-code-site --rootPath "."
```

**GitHub repository settings per environment:**

| Type | Name |
|---|---|
| Secret | `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` |
| Secret | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` (env-specific) |
| Variable | `PP_ENVIRONMENT_URL` (`https://org229c958d.crm4.dynamics.com/`) |

### Azure DevOps

Not used by SMKB — see [Power Platform Build Tools docs](https://learn.microsoft.com/en-us/power-platform/alm/devops-build-tools) if needed.

> Docs: [Power Platform Build Tools](https://learn.microsoft.com/en-us/power-platform/alm/devops-build-tools) · [GitHub Actions for Power Platform](https://learn.microsoft.com/en-us/power-platform/alm/devops-github-available-actions)

---

## 12. Gitignore & Source Control Rules

### `.gitignore`

```gitignore
# SPA build output — never commit
dist/
node_modules/

# Power Pages per-developer/per-environment manifests
.powerpages-site/**/.portalconfig/*-manifest.yml

# Local secrets — never commit
.env.local
.env.*.local

# VS Code user settings
.vscode/settings.json
.vscode/*.code-workspace

# OS
.DS_Store
Thumbs.db
Desktop.ini
```

### Commit checklist

| Item | Commit |
|---|---|
| All `src/` SPA source files | Yes |
| `vite.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json` | Yes |
| `powerpages.config.json` | Yes |
| `index.html` | Yes |
| `.powerpages-site/**/*.yml` — all component metadata | Yes |
| `.powerpages-site/.portalconfig/manifest.yml` | **Yes — critical for deletion tracking** |
| `.powerpages-site/deployment-profiles/*.deployment.yml` | Yes (no real secret values — use `${OS.VAR}`) |
| `.env.example` | Yes (placeholder values only) |
| `.powerpages-site/.portalconfig/<org-url>-manifest.yml` | **No — gitignore** |
| `dist/` | **No — gitignore** |
| `.env.local` | **No — gitignore** |

---

## 13. Common Pitfalls

| Pitfall | Fix |
|---|---|
| JS uploads blocked (403) | Remove `js` from Dataverse Blocked Attachments in PPAC |
| Stale Web File records accumulate | Stable Vite filenames + `bundleFilePatterns` in `powerpages.config.json` |
| Route component 404 at runtime (MIME type error in console) | Never use `() => import(...)` for route components — direct imports only. Dynamic imports create per-view chunk files that are not in `bundleFilePatterns`; Power Pages returns `index.html` for them instead of JS, causing blank views and MIME errors. |
| Large app needs view code in a separate chunk | Add a named `manualChunks` entry in `vite.config.ts` listing all view files, then add the output filename to `bundleFilePatterns` in `powerpages.config.json`. |
| Changes invisible after upload | Clear cache: Design Studio → **Sync** button, OR Power Platform Admin Center → Manage → Power Pages → site → **Purge cache** / **Restart site**. Note: `/_services/about` does **not** work for Power Pages. |
| SPA never loads — portal renders its own template | Go to Power Pages home → **Inactive Sites** → **Reactivate** the site. Verify with `pac pages list -v` → **Single Page Application: Yes**. Do **not** use Delete + Reactivate — see duplicate record pitfall below. |
| Portal header/footer still visible after first deploy | After `pac pages download`, update **both** page template files: (1) `.powerpages-site/page-templates/Default-studio-template.pagetemplate.yml` — set `usewebsiteheaderandfooter: false`; (2) `.powerpages-site/<siteName>/page-templates/Default-studio-template.pagetemplate.yml` — set `adx_usewebsiteheaderandfooter: false`. Then redeploy. |
| `pac pages upload-code-site` creates a duplicate/orphan site | `siteName` in `powerpages.config.json` must match the **exact** Friendly Name from `pac pages list -v` — Power Pages appends a URL slug during provisioning (e.g. `"My App"` → `"My App - my-app"`). |
| Two active site records with the same name (one `SPA: No`, one `SPA: Yes`) | Caused by Delete + Reactivate on an already-active site. The `SPA: No` record is the orphan. To clean up: Portal Management app → left nav → **Websites** → find the record whose GUID matches the non-SPA site from `pac pages list -v` → **Deactivate** then **Delete**. Cross-check the GUID before deleting. |
| Windows path too long (MAX_PATH 260) | `Set-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem LongPathsEnabled 1` |
| `window.Microsoft...User` is `undefined` | Read inside `onMounted` / `useEffect`, not at module top level |
| Hash route (`/#/page`) lost after login redirect | Encode `#` as `%23` in `returnUrl` before triggering sign-in |
| MSAL tokens rejected by portal Web API | Use **ADAL.js** (Entra v1) for local dev bearer auth — not MSAL |
| CSP blocks external scripts (analytics, fonts) | Add the domain to the `HTTP/Content-Security-Policy` site setting |
| New site not visible after first upload | Appears under "Inactive Sites" — activate once in Power Pages home |
| Deletion not propagated to target env | Follow the 5-step deletion tracking process (§10) |
| Solution unmanaged layer blocks future imports | Remove the unmanaged layer in the target env before re-importing |
| Table permissions not configured | Table permissions are enforced on all forms/lists — audit and configure now |

---

## 14. Quick-Reference Cheat Sheet

```powershell
# ── Setup ─────────────────────────────────────────────────────────────────────
pac auth create --environment "https://org.crm.dynamics.com"
pac pages list -v                         # find site GUIDs + confirm model version 2

# ── Download site components ──────────────────────────────────────────────────
pac pages download --path "./.powerpages-site" --webSiteId "<GUID>" --modelVersion 2 --overwrite

# ── Build ─────────────────────────────────────────────────────────────────────
npm run build

# ── Upload (target env = active pac auth profile) ─────────────────────────────
# upload-code-site has no --deploymentProfile flag; switch envs with pac auth.
pac pages upload-code-site --rootPath "."

# ── Download back from environment ────────────────────────────────────────────
pac pages download-code-site --path "./downloaded" --webSiteId "<GUID>" --overwrite

# ── Solution export → unpack → pack → import ──────────────────────────────────
pac solution export   --name MySolution --path "./solutions" --managed false
pac solution unpack   --zipfile "./solutions/MySolution.zip" --folder "./solutions/MySolution" --packagetype Unmanaged
pac solution pack     --zipfile "./solutions/MySolution_managed.zip" --folder "./solutions/MySolution" --packagetype Managed
pac solution import   --path "./solutions/MySolution_managed.zip" --async true
```
