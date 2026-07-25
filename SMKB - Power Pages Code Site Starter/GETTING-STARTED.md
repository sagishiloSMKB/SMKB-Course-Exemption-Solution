# Getting Started — Power Pages Vue Starter

> **Goal:** Deploy the Hello World page to Power Pages first. Confirm it works. Then start building your Vue app.

---

## Claude Code Skills (pre-installed)

This repo ships 10 Power Pages Code Site–specific skills in `.claude/skills/`.
Open the project in **Claude Code** and they are automatically available — no
installation step needed.

| Task | Skill |
|------|-------|
| First-time site provisioning (all 11 steps) | `/ppcs-provision-site [environment-url]` |
| Deploy with pre-flight checks | `/ppcs-deploy` |
| Diagnose site errors | `/ppcs-troubleshoot [symptom]` |
| Promote to stage or production (ALM) | `/ppcs-promote-to-env [stage\|prod]` |
| Add a new route / page | `/ppcs-add-page <PageName> [/path]` |
| Enable Dataverse Web API for a table (opt-out from flows-only) | `/ppcs-enable-web-api <tableName> [fields]` |
| Register a Power Automate cloud flow | `/ppcs-register-flow <guid-or-url> <Name>` |
| Enable the phone-OTP auth module | `/ppcs-enable-otp-auth` |
| Add an external domain to CSP | `/ppcs-add-csp-domain <domain> [directive]` |
| Scaffold a new PPCS skill | `/ppcs-create-skill <skill-name>` |

> `/ppcs-provision-site`, `/ppcs-deploy`, and `/ppcs-promote-to-env` require
> explicit invocation — Claude will not trigger them automatically during
> conversation.

---

## Table of Contents

- [Part 1 — Get the Hello World Live](#part-1--get-the-hello-world-live)
- [Part 2 — Local Development](#part-2--local-development)
- [Part 3 — Going Further](#part-3--going-further)
- [Reference: All PAC CLI Commands](#reference-all-pac-cli-commands)

---

## Part 1 — Get the Hello World Live

### Step 1 — Prerequisites

Install everything before you start.

#### Node.js LTS

```powershell
winget install OpenJS.NodeJS.LTS
node --version   # must be 18 or later
```

#### Power Platform CLI (PAC CLI)

```powershell
dotnet tool install --global Microsoft.PowerApps.CLI.Tool
pac --version    # must show 1.44.x or later
```

#### VS Code + Power Platform Tools extension

Install **"Power Platform Tools"** from the VS Code Marketplace.
> ⚠️ Do NOT install both "Power Platform Tools" and "Power Platform Tools [PREVIEW]" at the same time — this causes known conflicts.

#### NPM token for the `@smkbacil` scope

`.npmrc` resolves `@smkbacil/design-ui` using an `NPM_TOKEN` environment variable (an npm **read** token). Without it, `npm install` / `npm ci` fails.

```powershell
$env:NPM_TOKEN = "npm_xxx"   # current session
# Or persist it: [Environment]::SetEnvironmentVariable("NPM_TOKEN", "npm_xxx", "User")
```

> For CI/CD, add `NPM_TOKEN` as a **repo-level** GitHub secret — the workflow's build job needs it for `npm ci`.

#### Unblock JavaScript uploads in Dataverse (once per environment)

Power Platform Admin Center → Your Environment → Settings → Product → Privacy + Security → **Blocked Attachments** → remove `js` from the list.

> Without this, `pac pages upload-code-site` will fail with a 403 when uploading the compiled JS bundle.

---

### Step 2 — Fill in `src/config/solution.ts` (the single source of identity)

Fill in `src/config/solution.ts` — the central per-solution identity file. It ships with literal `CHANGEME` sentinel values, and `/ppcs-provision-site` and `/ppcs-deploy` **halt** while any `CHANGEME` remains:

```typescript
export const SOLUTION: SolutionConfig = {
  prefix: 'pvch',                 // Dataverse publisher prefix (lowercase)
  siteName: 'Lecturer Portal',    // human site name, WITHOUT the prefix
  appName: { he: '…', en: '…' },  // shown in the app header
  documentTitle: '…',             // browser tab title
  defaultLanguage: 'he',
  languages: [ /* … */ ],
}
```

**Site-name convention:** the Power Pages site is named `<PREFIX> - <siteName>` — here **`PVCH - Lecturer Portal`** — so every site is namespaced to its solution. You do **not** hand-edit the `siteName` in `powerpages.config.json`: `/ppcs-provision-site` (Step 5 below) derives `` `${prefix.toUpperCase()} - ${siteName}` `` from `solution.ts` and writes it into the config for you (replacing the `MY-SITE-NAME` placeholder). Provisioning without the skill? Set `powerpages.config.json`'s `siteName` to that same string by hand.

> ⚠️ **Power Pages appends a URL slug to your name during provisioning** (e.g. `"PVCH - Lecturer Portal"` → `"PVCH - Lecturer Portal - pvch-lecturer-portal"`). You will verify and update `siteName` to the exact provisioned name in Step 6. If `siteName` does not match exactly, subsequent `npm run deploy` calls will create a new orphan site instead of updating the correct one.

> All new sites default to the **Enhanced Data Model**. This starter is designed for Enhanced Data Model only.

---

### Step 3 — Authenticate PAC CLI

```powershell
pac auth create --environment "https://org229c958d.crm4.dynamics.com/"
# A browser window opens for interactive login
```

For CI/CD or non-interactive auth (service principal):

```powershell
pac auth create `
  --environment "https://org229c958d.crm4.dynamics.com/" `
  --applicationId "<app-id>" `
  --clientSecret  "<secret>" `
  --tenant        "<tenant-id>"
```

Verify:

```powershell
pac auth list   # should show your environment as active (*)
```

---

### Step 4 — Run the GUID freshen script (one-time)

The 8 custom security site settings ship with placeholder GUIDs. Run this script once before your first deploy to replace them with fresh unique GUIDs, preventing collisions if multiple sites are created from this starter in the same Dataverse environment.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/freshen-site-settings.ps1
```

> Run with `-DryRun` first to preview the replacements without writing anything. The script writes a `.guid-freshened` marker when done so it cannot be run twice on the same site by accident.

---

### Step 5 — Install dependencies and first deploy

```powershell
npm install
npm run deploy
```

`npm run deploy` runs `npm run lint && npm run test && npm run build` (ESLint, Vitest, then `vue-tsc && vite build`) and finally `pac pages upload-code-site --rootPath .` — a lint error or failing test aborts the deploy.

When no matching active site is found, the CLI **creates a new inactive site record in Dataverse automatically** — no need to create a site in Power Pages home first. The upload takes ~30–60 seconds.

---

### Step 6 — Reactivate as a Code Site

1. Go to [https://make.powerpages.microsoft.com](https://make.powerpages.microsoft.com)
2. Click **Inactive Sites** in the left sidebar
3. Find your site → click **Reactivate**
4. Wait **2–3 minutes** for provisioning to complete

> ⚠️ **Do not use the Delete + Reactivate pattern.** If you delete an active site and reactivate it, Power Pages provisions a second website record alongside the original, leaving two active records with the same name. Only use Reactivate from Inactive Sites — never Delete — for Code Site mode activation.

> **Already have a duplicate record?** Run `pac pages list -v`. If you see two active records with the same name (one with `Single Page Application: No`), that is the orphan. Open the **Portal Management** app → left nav → **Websites** → find the record whose GUID matches the non-SPA site → **Deactivate** then **Delete**. Cross-check the GUID against `pac pages list -v` output before deleting.

---

### Step 7 — Verify Code Site mode and sync the site name

```powershell
pac pages list -v
```

Look for **`Single Page Application: Yes`** next to your site. If it shows `No`, wait another minute and run the command again. Note the **GUID** — you will need it in Step 8.

> ⚠️ **Power Pages may have appended a URL slug to your site name.** Compare the **Friendly Name** column to what you set in Step 2. If they differ (e.g. `"My App"` → `"My App - my-app"`), update `siteName` in `powerpages.config.json` to match the Friendly Name exactly.

---

### Step 8 — Download site components

This populates `.powerpages-site/` with the correct GUIDs and YAML for **your** environment.

```powershell
# Replace <GUID> with the Website ID from Step 7
pac pages download `
  --path "./.powerpages-site" `
  --webSiteId "<GUID>" `
  --modelVersion 2 `
  -o
```

After this command, `.powerpages-site/` will contain YAML files for web roles, site settings, table permissions, and a `manifest.yml`. **Commit all of these** (except `<org-url>-manifest.yml` which is gitignored).

---

### Step 9 — Set ProfileRedirectEnabled to false

Power Pages provisions `Authentication/Registration/ProfileRedirectEnabled` automatically with a default of `true`, which redirects users to `/Profile` after sign-in instead of staying on the SPA. Change it:

Open:
```
.powerpages-site/site-settings/Authentication-Registration-ProfileRedirectEnabled.sitesetting.yml
```

Change `value: true` to `value: false`, then save.

---

### Step 10 — Disable the portal header/footer in the page templates

`pac pages download` creates **two** page template files. Update both:

**File 1:**
```
.powerpages-site/page-templates/Default-studio-template.pagetemplate.yml
```
Find `usewebsiteheaderandfooter: true` and change to `false`.

**File 2:**
```
.powerpages-site/<siteName>/page-templates/Default-studio-template.pagetemplate.yml
```
Find `adx_usewebsiteheaderandfooter: true` and change to `false`.

> ⚠️ **This step is required.** Without it, Power Pages injects its own header and footer Liquid templates around the SPA content. The Vue app `<div id="app">` is never inserted into the page and the SPA will not load.

---

### Step 11 — Redeploy

```powershell
npm run deploy
```

Subsequent `npm run deploy` calls go live immediately — no reactivation needed.

---

### Step 12 — ✅ Verify it works

Open your site URL in a browser. You should see:

> ✓ **Site is live on Power Pages**
> # Hello World
> Power Pages Vue Starter is running!

If you see this — the starter is working. Continue with Steps 13–14 to finish the site setup.

---

### Step 13 — Convert the site from Trial to Production

New Power Pages sites are provisioned as **Trial** sites. Convert to production before
using the site in earnest.

1. Go to [Power Platform Admin Center](https://admin.powerplatform.microsoft.com)
2. **Manage → Power Pages** → find your site in the list
3. Select the site → click **Convert to production**
4. Wait 2–5 minutes for provisioning to complete

> Trial sites may be subject to resource limits and will expire after 30 days.
> Always convert to production before handing the site to users.

---

### Step 14 — Set site visibility

New sites default to **Private** — only authenticated users with explicit portal access
can reach them. For most environments you want the site publicly accessible.

1. Go to [Power Pages home](https://make.powerpages.microsoft.com)
2. Find your site → click **Edit**
3. In the left panel go to **Security → Site visibility**
4. Change to **Public** → Save

> **When to use Public vs Private:**
> - **Dev:** keep Private — only developers need access
> - **Stage:** set Public when external testers need to reach the site without portal permissions; keep Private otherwise
> - **Prod:** always Public

---

## Part 2 — Local Development

### Step 15 — Configure local proxy

Copy `.env.example` to `.env.local` and fill in your portal URL:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local`:

```
VITE_PORTAL_URL=https://your-site.powerappsportals.com
```

The Vite dev server proxies `/_api`, `/_layout`, and `/Account` requests to the live portal. This means:
- **Anonymous Web API calls** (globally scoped table permissions) work immediately.
- **Authenticated Web API calls** (contact-scoped) require bearer auth — see the note below.

---

### Step 16 — Run locally

```powershell
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

> **Note on authentication in local dev:**
> The portal session cookie is bound to the portal domain, not localhost. So `user.isAuthenticated` will be `false` locally unless you configure bearer token auth (ADAL.js — see [POWER-PAGES-CODE-SITE-GUIDE.md](./docs/POWER-PAGES-CODE-SITE-GUIDE.md) Section 9).

---

### Step 17 — Edit the Vue app

Start here:

| File | What to change |
|---|---|
| [src/config/solution.ts](src/config/solution.ts) | Per-solution identity — prefix, site name, app name, title, languages (done in Step 2) |
| [src/views/HomeView.vue](src/views/HomeView.vue) | Replace with your main UI |
| [src/views/AboutView.vue](src/views/AboutView.vue) | Your about page |
| [src/router/index.ts](src/router/index.ts) | Add new routes |
| [src/App.vue](src/App.vue) | Add nav items (app name comes from `solution.ts`) |
| [src/assets/main.css](src/assets/main.css) | Global styles |
| [src/config/flows.ts](src/config/flows.ts) | Flow GUID registry — fill after Studio registration |
| [src/modules/otp-auth/](src/modules/otp-auth/README.md) | Dormant phone-OTP auth module — enable with `/ppcs-enable-otp-auth` |

Deploy after each significant change:

```powershell
npm run deploy
```

---

## Part 3 — Going Further

### Web API access (opt-out from flows-only)

This starter is **flows-only by default**: all backend work — Dataverse reads/writes included — goes through Power Automate cloud flows via `src/services/cloudFlow.ts`. There is no `portalApi.ts`, and ESLint bans `fetch`/XHR outside the flow client.

If a table genuinely needs direct browser access via the Dataverse Web API, run:

```
/ppcs-enable-web-api <tableName> [fields]
```

It restores `src/services/portalApi.ts`, generates the `Webapi/<table>/enabled` + `Webapi/<table>/fields` site settings and a table permission YAML (fresh UUIDs), and updates the ESLint exceptions.

> Use the table **logical name** in site settings (`contact`) but the **entity set name** in API paths (`contacts`).

Docs: [Power Pages Web API overview](https://learn.microsoft.com/en-us/power-pages/configure/web-api-overview)

---

### Call Power Automate flows

Cloud flows are the starter's **only** backend channel — Dataverse reads/writes, external API calls, email, approvals, and any business logic requiring server-side re-validation all go through `invokeFlow()`.

**Setup (once per site, after deploy):**

1. In Power Automate, create a cloud flow with trigger **"When Power Pages calls a flow"** — it must be in a **solution** (not a personal flow)
2. In Power Pages Studio → **Set up → Cloud flows → + Add cloud flow** → select your flow → assign web roles
3. Copy the GUID from the trigger URL shown in Studio

**Calling a flow from the SPA:**

```typescript
import { invokeFlow } from '@/services/cloudFlow'

// Fire-and-forget
await invokeFlow('<your-flow-guid>', { email: user.value.email })

// With return value
const result = await invokeFlow<{ caseId: string }>('<your-flow-guid>', {
  subject: 'Support request',
  contactId: user.value.contactId,
})
```

`src/config/flows.ts` ships as an empty typed registry — append an entry per flow after Studio registration (or run `/ppcs-register-flow`). GUIDs are site-specific and assigned by Studio after deploy.

**Error contract:** flows always respond HTTP 200; business errors are `{ "errorCode": "<CODE>" }` bodies that `invokeFlow` throws as a typed `FlowError` — see [docs/FLOW-ERROR-CONTRACT.md](./docs/FLOW-ERROR-CONTRACT.md).

Docs: [Configure Power Automate cloud flows in Power Pages](https://learn.microsoft.com/en-us/power-pages/configure/cloud-flow-integration) · [Full reference: POWER-PAGES-CODE-SITE-GUIDE.md §7.5](./docs/POWER-PAGES-CODE-SITE-GUIDE.md)

---

### Configure table permissions

Table permissions control who can call the Web API. Add them to `.powerpages-site/table-permissions/`:

```yaml
# .powerpages-site/table-permissions/contact-read.entitypermission.yml
EntityName: contact
TablePermissionId: <GUID — generate a new UUID: https://uuid.wand.tools>
AccessType: Global
PrivilegeType: Read
WebRoles:
  - Anonymous Users
  - Authenticated Users
```

> ⚠️ **Table permissions are now enforced** on ALL forms and lists regardless of settings. Configure them before using the Web API.

Docs: [Table permissions](https://learn.microsoft.com/en-us/power-pages/security/table-permissions)

---

## Reference: All PAC CLI Commands

```powershell
# Auth
pac auth create --environment "https://org229c958d.crm4.dynamics.com/"
pac auth list

# Site discovery
pac pages list -v                          # list all sites with model version

# Download site components
pac pages download `
  --path "./.powerpages-site" `
  --webSiteId "<GUID>" `
  --modelVersion 2 `
  -o

# Build and deploy
npm run build                              # outputs dist/
pac pages upload-code-site --rootPath .    # upload dist/ + .powerpages-site/

```

---

## Full Reference

See [docs/POWER-PAGES-CODE-SITE-GUIDE.md](./docs/POWER-PAGES-CODE-SITE-GUIDE.md) for:

- Complete Web API documentation with OData examples
- Authentication patterns (sign in/out, bearer auth for local dev)
- Content Security Policy configuration
- All common pitfalls with fixes
