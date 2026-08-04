# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vue 3 + TypeScript + Vite SPA deployed as a **Power Pages Code Site** (Model A, GA February 2026).
Power Pages hosts the SPA — no separate web server. Every route returns `index.html`; Vue Router handles client-side navigation.

**Deploy-first workflow:** fill `src/config/solution.ts` (`prefix` + `siteName` → site named `<PREFIX> - <Site Name>`) → `npm run deploy` → reactivate from Inactive Sites → `pac pages download` → redeploy → then edit the Vue app.

---

## Commands

```bash
npm run dev         # Vite dev server at http://localhost:5173 (proxies /_api to live portal)
npm run build       # vue-tsc type check + Vite build → dist/
npm run preview     # Preview the production build locally
npm run lint        # ESLint (flat config — eslint.config.js)
npm run test        # Vitest, single run
npm run test:watch  # Vitest in watch mode
npm run deploy      # lint + test + build + pac pages upload-code-site --rootPath .
```

**Vitest is configured** (`vitest.config.ts` — node environment, picks up `src/**/*.spec.ts`). Add specs next to the code they test (see `src/services/flowErrors.spec.ts` and `src/utils/sessionCache.spec.ts`). `npm run deploy` refuses to upload if lint or tests fail.

TypeScript strict mode is enabled. `npm run build` runs `vue-tsc` — fix all type errors before deploying. `noUnusedLocals` and `noUnusedParameters` are both on; prefix intentionally unused variables with `_` to suppress the error.

**Optional pre-commit hook:** `.githooks/pre-commit` runs ESLint on staged `.vue`/`.ts` files (skips gracefully before `npm install`). It is **not** auto-installed — enable it per clone with `git config core.hooksPath .githooks`.

**Permission guardrails (`.claude/settings.json`):** the starter ships a deny-list that blocks destructive/high-blast-radius commands from running unprompted — `pac pages upload*`, `pac solution import*`, `pac code push*`, `pac auth select*`, and force-push / hard-reset / amend git ops. Deliberate deploys still work through `npm run deploy` (the wrapper is not denied); the deny only stops an agent from invoking a raw upload/import/push directly. Adjust the lists per project as needed.

---

## Architecture

- **Entry:** `src/main.ts` — creates Vue app, installs Pinia + Router, calls `createSmkb()` (global component registration), mounts to `#app`
- **Shell:** `src/App.vue` — `SmkbLayout` wrapper with `SmkbAppHeader` (branding, language/theme toggles, user menu) and `<RouterView />`. The `lang` ref here drives the active language and document direction (RTL/LTR).
- **Pages:** `src/views/` — one `.vue` file per route. `HomeView.vue` and `AboutView.vue` are demo starters; replace or delete them. Add a view here, then register it in `src/router/index.ts`.
- **Routing:** `createWebHistory()` — HTML5 history mode required (hash mode breaks Power Pages auth redirects)
- **State:** `src/stores/` — create Pinia stores here (directory not pre-created; add it when needed)
- **Domain data:** `src/data/` — pure domain constants / lookups / formatters (typed constant tables, option lists, format helpers). Not pre-created; add it when business logic needs constants, kept separate from `config/` (identity/registry) and `services/` (flow calls). These modules are easy to unit-test in isolation.
- **UI:** All components from `@smkbacil/design-ui`, registered globally — `src/components/` is intentionally empty
- **Backend (flows-only):** ALL backend work goes through Power Automate cloud flows via `src/services/cloudFlow.ts` (`invokeFlow()`, `FlowError`, `SessionExpiredError`, `unwrapFlowResult`). Primary transport in the deployed runtime is `window.shell.ajaxSafePost`; a fetch + CSRF fallback (`src/services/csrf.ts`) covers local dev. ESLint bans `fetch`/XHR/WebSocket outside those two files. The Dataverse Web API is the opt-out path — run `/ppcs-enable-web-api` to restore `portalApi.ts`.
- **Solution identity:** `src/config/solution.ts` — central per-solution constants (`SOLUTION.prefix`, `appName`, `documentTitle`, `defaultLanguage`, `languages[]`). Ships with `CHANGEME` sentinels; fill it first (see "Solution identity" below).
- **Flow registry:** `src/config/flows.ts` — ships empty; add each flow GUID after Studio registration (`/ppcs-register-flow`)
- **Utils:** `src/utils/` — `sessionCache.ts` (`createSessionCache`: sessionStorage cache + inflight dedup for flow reads), `safeJson.ts` (`safeJsonParse`), `fileUtils.ts` (`buildNamedFilePayload` — base64 + naming for flow file uploads)
- **Auth:** Server-managed OAuth (Power Pages portal) — `src/services/auth.ts` only redirects; no client-side token handling
- **OTP auth (optional):** `src/modules/otp-auth/` — dormant phone-OTP auth module, zero bundle bytes until wired; enable with `/ppcs-enable-otp-auth`
- **User context:** `src/composables/usePortalUser.ts` — reads `window.Microsoft.Dynamic365.Portal.User`
- **Error UX:** `src/composables/useFlowErrorToast.ts` — localized toast for failed flow calls; messages live in `src/services/flowErrors.ts` (he/en maps keyed by `SOLUTION.defaultLanguage`). `useFormValidation` is also available.

### Adding a new page

```typescript
// 1. Create src/views/MyNewView.vue
// 2. Add to src/router/index.ts — use a direct import, not a lazy one:
import MyNewView from '../views/MyNewView.vue'
{ path: '/my-new-page', name: 'my-new-page', component: MyNewView }
```

The router already has a catch-all `/:pathMatch(.*)*` route → `NotFoundView`; register new routes above it. Routes listed in `STANDALONE_ROUTES` in `src/App.vue` (currently `'not-found'`) render outside `SmkbLayout`.

---

## Solution identity (`src/config/solution.ts`)

Fill this file **first** on any new project — it is the single source for per-solution identity:

- `SOLUTION.prefix` — Dataverse publisher prefix (lowercase, no underscore, e.g. `pvch`); also derives the exported `SESSION_STORAGE_KEY` and the site name (below)
- `SOLUTION.siteName` — the human site name **without** the prefix (e.g. `Lecturer Portal`)
- `SOLUTION.appName` (`{ he, en }`), `documentTitle`, `defaultLanguage`, `languages[]`

`App.vue` and `main.ts` read from it (header app name, `<html lang>`/`dir` set before mount, `document.title` override). The shipped values are the literal sentinel `CHANGEME` — `/ppcs-provision-site` and `/ppcs-deploy` grep for it and **halt** while any `CHANGEME` remains. Never hardcode these values elsewhere.

### Naming convention — `<PREFIX> - <Site Name>`

Every site created from this starter is namespaced to its solution by the publisher prefix. The exported `POWER_PAGES_SITE_NAME` derives the canonical site name as `` `${SOLUTION.prefix.toUpperCase()} - ${SOLUTION.siteName}` `` → e.g. **`PVCH - Lecturer Portal`**. That exact string must be the `siteName` in `powerpages.config.json` (PAC CLI reads that file directly to create/find the `adx_website` record): `/ppcs-provision-site` step 3 derives and writes it, and `/ppcs-deploy` verifies `siteName` still starts with `<PREFIX> - `. Do not hand-set the site name in `powerpages.config.json` — set `prefix` + `siteName` in `solution.ts` and let the skill sync it. (Power Pages may append a URL slug during provisioning, e.g. `PVCH - Lecturer Portal - pvch-lecturer-portal`; the base name still leads with the prefix.)

Custom Dataverse components a solution adds later (tables, columns, flows) follow the kit-wide convention `smkb_<prefix>_<PascalName>` — the publisher prefix `smkb_` plus this solution's short prefix, e.g. `smkb_evt_Registration` (see the root `CLAUDE.md` → Critical Rule 3; `SOLUTION.prefix` here is that short-prefix segment). **Exception:** the 16 shipped security site settings keep their platform-reserved names (`HTTP/Content-Security-Policy`, etc.) — recognized by Power Pages by exact name; never prefix them.

---

## OTP auth module (optional)

`src/modules/otp-auth/` ships **dormant** — phone OTP + Cloudflare Turnstile + sessionStorage session + `smkb:session-expired` event + router guard. Nothing imports it, so it adds zero bundle bytes until wired. Enable with `/ppcs-enable-otp-auth`, which adds the login/locked-out routes, router guard, App.vue session-expired wiring, and `challenges.cloudflare.com` to `script-src`/`frame-src`/`connect-src` in **both** CSP site settings. The module README (`src/modules/otp-auth/README.md`) documents the 3 required flows (`createOtp` / `checkOtp` / `getPortalConfig`, Anonymous Users role). Authenticated calls use the module's `invokeAuthFlow`, which passes `authToken` for server-side re-validation. Dev mock: leave the GUIDs in `otpFlows.ts` empty and run `npm run dev` — any phone number works with OTP `123456`.

---

## Power Pages Integration Rules

### No hand-authored GUIDs
Never invent GUIDs by hand. The `.powerpages-site/site-settings/` folder ships 16 settings with **placeholder** GUIDs (`aaaaaaaa-00NN-…`) that `scripts/freshen-site-settings.ps1` replaces with fresh ones during provisioning; the other `.powerpages-site/` folders (web-roles, table-permissions) are populated per-environment by `pac pages download`. Do not add or edit GUIDs manually.

### Stable Vite output filenames (critical)
`vite.config.ts` uses `[name]` (no hash) for all output files. Hashed filenames create a new Dataverse Web File record on every build, accumulating stale records. Do not add `[hash]` to output patterns. `base: "/"` is also required.

### Cache-buster plugin (critical — do not remove)
`vite.config.ts` includes a custom `cache-buster` plugin that appends `?v=<buildTimestamp>` to asset URLs in `index.html` **and** rewrites cross-chunk import specifiers (`from"./vue.js"`, `import("./x.js")`) inside the emitted chunks. Because filenames are stable (see above), the URLs never change between builds — without the query-string versioning, an edge cache can serve a fresh `index.js` alongside a stale `vue.js`, producing runtime errors like `"does not provide an export named X"`. This fixed a real production bug. **Do not remove the plugin or strip the `?v=` rewrites.**

### `powerpages.config.json` — `bundleFilePatterns`
Per [Microsoft's docs](https://learn.microsoft.com/power-pages/configure/create-code-sites), this is a **delete-before-upload cleanup list**: wildcard patterns identifying files in the site's `web-files` that the CLI **removes before uploading** the new build, so old content-hashed bundles don't accumulate as stale Web File records. Entries are **wildcard patterns**, not literal filenames.

The starter ships `assets/*.js`, `assets/*.css` and `favicon.ico` — extension wildcards rather than a literal list, so the config keeps covering the build after a `manualChunks` rename or a new chunk. **Static files copied from `public/` land at the `dist/` root (not under `assets/`) and need their own entry** (that is why `favicon.ico` is listed); add a pattern for any new root-level asset type you ship.

> An unlisted output file is **not** blocked from being served — it simply isn't cleaned up, so a stale copy can linger. The runtime 404/MIME failures come from the separate problem below: a chunk that the deployed `index.html` references but that was never uploaded.

### No lazy-loaded route imports
Always use direct imports for route components — never `() => import('../views/Foo.vue')`. Dynamic imports cause Vite to emit a separate chunk file per view. Power Pages only serves files listed in `bundleFilePatterns`; any unlisted output file returns `index.html` instead, causing 404s and MIME-type errors at runtime.

If the app is large enough to warrant splitting view code into a separate chunk, list all view files explicitly under a named `manualChunks` entry in `vite.config.ts` and add the output filename to `bundleFilePatterns` in `powerpages.config.json`.

**Migrating away from lazy imports?** `pac pages upload-code-site` never *deletes* Web File records that no longer exist in `dist/` — it only upserts. If a project ever shipped per-view chunks (e.g. `MyView.js`) and later switched to direct imports, those orphaned records linger in Dataverse and in the downloaded `.powerpages-site/web-files/`. Clean them up manually: delete the stale local `web-files/<name>/` folders and the matching records via Portal Management → Web Files, then re-run `pac pages download`.

### `window.Microsoft.Dynamic365.Portal.User`
Always read inside `onMounted()`, never at module top level — the portal injects this global after page load. See `src/composables/usePortalUser.ts`.

### Flow transport and CSRF
In the deployed runtime, `invokeFlow()` posts via `window.shell.ajaxSafePost` — the Power Pages shell handles the CSRF token and form-urlencoded encoding automatically. In local dev (no `window.shell`), it falls back to `fetch` with a `__RequestVerificationToken` header supplied by `src/services/csrf.ts` (token fetched from `/_layout/tokenhtml`, cached per session). Do not bypass `src/services/cloudFlow.ts` — ESLint enforces this by banning `fetch`/XHR/WebSocket everywhere except `cloudFlow.ts` and `csrf.ts`.

### Authentication
The SPA never handles OAuth tokens directly. Sign-in redirects to `/Account/Login/ExternalLogin`. Sign-out to `/Account/Login/LogOff`. Encode `#` as `%23` in `returnUrl` to preserve hash-based routes through the server redirect.

### Local dev proxy
Copy `.env.example` to `.env.local`. Any new `VITE_*` variable must also be declared in `src/env.d.ts` under `ImportMetaEnv`, or TypeScript will reject it.
- `VITE_PORTAL_URL` — enables proxy for `/_api`, `/_layout`, `/Account`. Without it, API calls from localhost hit CORS errors.
- `VITE_TENANT_ID` / `VITE_CLIENT_ID` — optional; only needed for bearer token auth (ADAL.js).

The portal session cookie does not transfer to localhost, so `user.isAuthenticated` is always `false` in local dev.

---

## Deployment

> **Deployment target: SMKB Apps Dev only** (`https://org229c958d.crm4.dynamics.com/`).
> Never deploy to another environment without an explicit user request. When asked to deploy elsewhere, raise a concern and ask for confirmation before proceeding.

> **NPM_TOKEN prerequisite:** `.npmrc` resolves the `@smkbacil` scope with an `NPM_TOKEN` environment variable (npm read token). `npm install` / `npm ci` fails without it — set `$env:NPM_TOKEN = "npm_xxx"` locally; in CI it comes from the repo-level `NPM_TOKEN` secret.

### First deploy (new project)
1. Fill in `src/config/solution.ts` — including `prefix` and `siteName`; the site is named `<PREFIX> - <Site Name>` and `/ppcs-provision-site` writes that into `powerpages.config.json` for you (the provision/deploy skills halt while any `CHANGEME` remains)
2. `pac auth create --environment "https://org229c958d.crm4.dynamics.com/"`
3. Run the GUID freshen script (one-time, before first deploy):
   `powershell -ExecutionPolicy Bypass -File scripts/freshen-site-settings.ps1`
4. `npm install && npm run deploy` — CLI creates the site in Inactive Sites automatically
5. Power Pages home → Inactive Sites → **Reactivate** (wait 2–3 min) — do **not** delete first
6. `pac pages list -v` → note GUID; confirm `Single Page Application: Yes`; update `siteName` if Power Pages appended a URL slug
7. `pac pages download --path "./.powerpages-site" --webSiteId <GUID> --modelVersion 2 -o`
8. Set `usewebsiteheaderandfooter: false` in both downloaded page template files:
   - `.powerpages-site/page-templates/Default-studio-template.pagetemplate.yml` — field `usewebsiteheaderandfooter`
   - `.powerpages-site/<siteName>/page-templates/Default-studio-template.pagetemplate.yml` — field `adx_usewebsiteheaderandfooter`
9. In `.powerpages-site/site-settings/Authentication-Registration-ProfileRedirectEnabled.sitesetting.yml`,
   change `value: true` to `value: false`
10. `npm run deploy`

### Subsequent deploys
```bash
npm run deploy
```

### CI/CD (`.github/workflows/deploy.yml`)
Auto-deploys to **SMKB Apps Dev** on push to `main`. The build job runs lint + test before building. The workflow uses `environment: development` for secret isolation — all variables and secrets must be set under the **`development` GitHub environment** (not as repo-level vars/secrets): **variable** `PP_ENVIRONMENT_URL` (`https://org229c958d.crm4.dynamics.com/`) and **secrets** `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`. One exception: `NPM_TOKEN` is a **repo-level** secret (needed by `npm ci` before any environment is selected).

### Promoting to stage or production
Code sites use a **two-track** deployment model — compiled SPA assets and site configuration move independently. Running a Power Platform Pipeline alone leaves the site with a 500 error (config arrives, assets don't). Always run `pac pages upload-code-site --rootPath .` against the target environment after the pipeline completes. See [docs/ALM-CODE-SITES.md](./docs/ALM-CODE-SITES.md) for the full workflow.

---

## `.powerpages-site/` Commit Rules

| File | Commit? |
|---|---|
| `manifest.yml` | **Yes** — tracks deletions for propagation to other environments |
| All `*.yml` component files | **Yes** — populated by `pac pages download` |
| `deployment-profiles/*.yml` | **Yes** — no real secrets; use `${OS.VAR}` |
| `<org-url>-manifest.yml` | **No** — gitignored (per-developer state) |

After deleting a record in the source environment, re-run `pac pages download` before committing — this records the deletion in `manifest.yml` so it propagates to target environments.

---

## Security Configuration

The starter ships 16 custom security site settings in `.powerpages-site/site-settings/` that deploy automatically with `npm run deploy`. No manual portal setup required. They are the shipped half of the solution-wide security baseline (root **SECURITY-BASELINE.md**).

### What's pre-configured

**Response headers and CSP**

| File | `name` | Value | Effect |
|---|---|---|---|
| `security-x-content-type-options.sitesetting.yml` | `HTTP/X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing attacks |
| `security-x-xss-protection.sitesetting.yml` | `HTTP/X-XSS-Protection` | `0` | Disables the legacy browser XSS filter — leaving it on can introduce bypass vectors; CSP replaces it |
| `security-csp-report-only.sitesetting.yml` | `HTTP/Content-Security-Policy-Report-Only` | Baseline CSP | Logs CSP violations to the browser console without blocking anything — safe to ship in a starter |
| `security-csp.sitesetting.yml` | `HTTP/Content-Security-Policy` | Enforced CSP | Blocks disallowed sources; ships alongside report-only |
| `security-csp-inject-unsafe-eval.sitesetting.yml` | `HTTP/Content-Security-Policy/Inject-unsafe-eval` | `false` | Prevents Power Pages from auto-injecting `unsafe-eval` |
| `security-referrer-policy.sitesetting.yml` | `HTTP/Referrer-Policy` | `strict-origin-when-cross-origin` | Full path same-origin, origin only cross-origin, nothing on an HTTPS→HTTP downgrade |
| `security-permissions-policy.sitesetting.yml` | `HTTP/Permissions-Policy` | `geolocation=(), camera=(), microphone=()` | Denies browser features this SPA does not use, for the document and every embedded frame |

**Authentication cookie and password policy**

| File | `name` | Value | Effect |
|---|---|---|---|
| `auth-cookie-httponly.sitesetting.yml` | `Authentication/ApplicationCookie/CookieHttpOnly` | `true` | Prevents JavaScript from reading the auth cookie |
| `auth-cookie-secure.sitesetting.yml` | `Authentication/ApplicationCookie/CookieSecure` | `Always` | Auth cookie sent over HTTPS only |
| `auth-password-policy.sitesetting.yml` | `Authentication/UserManager/PasswordValidator/EnforcePasswordPolicy` | `true` | Requires passwords to satisfy 3 of 4 character categories |

**Built-in login and registration surface — shipped disabled**

Every one of these defaults to **`true`** on the platform, so leaving them out means shipping a sign-in and sign-up surface this starter never uses. That is a real audit finding, not a theoretical one.

| File | `name` | Value | Effect |
|---|---|---|---|
| `auth-registration-disabled.sitesetting.yml` | `Authentication/Registration/Enabled` | `false` | Master switch for every built-in sign-up path |
| `auth-local-login-disabled.sitesetting.yml` | `Authentication/Registration/LocalLoginEnabled` | `false` | No built-in username/password sign-in |
| `auth-external-login-disabled.sitesetting.yml` | `Authentication/Registration/ExternalLoginEnabled` | `false` | No built-in external/social sign-in or registration |
| `auth-open-registration-disabled.sitesetting.yml` | `Authentication/Registration/OpenRegistrationEnabled` | `false` | No open sign-up form for anonymous visitors |
| `auth-invitation-disabled.sitesetting.yml` | `Authentication/Registration/InvitationEnabled` | `false` | No invitation-code redemption — a second sign-up path that survives disabling the first |
| `auth-reset-password-disabled.sitesetting.yml` | `Authentication/Registration/ResetPasswordEnabled` | `false` | No password-reset page; it applies only to local accounts and its "check your email" response is an account-enumeration oracle |

> **If this solution adopts a Power Pages identity provider** (Entra External ID, Azure AD B2C, any OIDC/SAML provider) instead of the SMKB custom OTP model, re-enable **only** the path it needs — normally `Authentication/Registration/ExternalLoginEnabled` — and leave the rest disabled. Do not delete the files; set the value to `true`, so the intent stays recorded in version control.

### Headers the platform owns — verify, don't fake

`HTTP/X-Frame-Options` and `Authentication/Registration/ProfileRedirectEnabled` are **not** shipped — Power Pages provisions them automatically. After `pac pages download`, set `ProfileRedirectEnabled` to `false` in the downloaded file (step 9 in first-deploy above) — its default of `true` redirects users to `/Profile` after sign-in instead of keeping them on the SPA.

`Strict-Transport-Security` (HSTS) is also **platform-provided** — `powerappsportals.com` is on the browser HSTS preload list, and the platform emits the header itself. **Confirm it rather than assuming it:**

```bash
curl -I https://<your-site>.powerappsportals.com | grep -i strict-transport-security
```

Do **not** create a site setting for HSTS. A hand-written `HTTP/Strict-Transport-Security` competes with the platform's own header and gives a false sense of ownership; if the header is genuinely missing, that is a platform issue to raise, not a YAML file to add.

The CSP value is tailored for this SPA — all Vite bundles are served from `'self'`, Power Pages platform scripts come from `content.powerapps.com` (and the other Microsoft CDN domains included), styles require `'unsafe-inline'` for `@smkbacil/design-ui`'s Vue style injection. The `'nonce'` token is a Power Pages placeholder replaced with a cryptographically unique nonce on every request. `object-src 'none'` and `base-uri 'self'` close plugin embedding and `<base>` hijacking; `upgrade-insecure-requests` rewrites any stray `http://` subresource to HTTPS.

The CSP report-only value is tailored for this SPA — all Vite bundles are served from `'self'`, Power Pages platform scripts come from `content.powerapps.com` (and the other Microsoft CDN domains included), styles require `'unsafe-inline'` for `@smkbacil/design-ui`'s Vue style injection. The `'nonce'` token is a Power Pages placeholder replaced with a cryptographically unique nonce on every request.

### Placeholder GUIDs and the freshen script

The 16 custom security settings files ship with placeholder GUIDs (`aaaaaaaa-00NN-*`).
Run `scripts/freshen-site-settings.ps1` before first deploy — it replaces each
placeholder with a fresh random GUID unique to this site, preventing collisions if
multiple sites are created from this starter in the same Dataverse org.

The script is **safe to run again**. It only ever touches a file that still holds a
placeholder, so if the starter later ships another setting (a new header, a new auth
lockdown), a re-run gives that one a real GUID and leaves every assigned GUID alone.
Without that, a late-added setting would deploy carrying the literal template placeholder.
Placeholders must be **lowercase** — the replacement scan is case-sensitive.

After `pac pages download`, PAC CLI overwrites these files with the system-assigned
Dataverse GUIDs. Subsequent deploys are fully idempotent.

### GUID lifecycle after first deploy

```bash
npm run deploy              # creates settings with system-generated GUIDs in Dataverse
pac pages download ...      # GUIDs are written back into the YAML files
git add .powerpages-site/ && git commit  # commit site-specific GUIDs
npm run deploy              # subsequent deploys upsert by GUID — fully idempotent
```

### Known accepted findings

After first deploy, two Power Pages site checker findings remain and cannot be resolved:

| Finding | Risk | Why accepted |
|---|---|---|
| `style-src unsafe-inline` | Moderate | `@smkbacil/design-ui` uses Vue runtime style injection. Removing `unsafe-inline` breaks all component styling. |
| `script-src unsafe-hashes` | Low | Injected by the Power Pages platform itself — not configurable via site settings. |

> If you add a library that uses `eval` at runtime (some charting or PDF libraries), set `HTTP/Content-Security-Policy/Inject-unsafe-eval` to `true` in the downloaded site settings file and redeploy.

> If you add external resources (analytics, fonts, maps, Azure Blob images), add their domains to the relevant directives in both `security-csp.sitesetting.yml` and `security-csp-report-only.sitesetting.yml` before deploying.

### What's intentionally absent

Each of these is a deliberate decision, not an oversight. A security review that flags one should be answered with the reasoning here, and the answer recorded under "Verified-safe" in the audit report rather than re-litigated.

- **Table permissions** — Power Pages denies all Dataverse access by default, and this starter enables the Web API for **no** table, so there is no browser-facing data surface for a table permission to protect. `table-permissions/` is intentionally empty. Permissions become necessary only when you enable the Web API for a table; when you do add them, generate a fresh UUID per permission (see the Web API section below) — never copy GUIDs from another site.
- **Web roles** — Anonymous Users and Authenticated Users roles are auto-created by Power Pages during site provisioning, so `web-roles/` is intentionally empty. The **Anonymous** role is the correct role for this starter's flow endpoints and does not mean "unauthenticated": every authenticated flow re-validates the session token server-side and scopes data by ownership. That is Microsoft's documented model for Power-Pages-invoked cloud flows, and table permissions are **not** enforced inside a flow.
- **CORS headers** (`HTTP/Access-Control-Allow-Origin` etc.) — site-specific; only add if your SPA calls cross-origin APIs.
- **HSTS** — platform-provided and preloaded; verify with `curl -I` as above rather than shipping a competing site setting.
- **`X-Frame-Options`** — platform-provided, and `frame-ancestors 'self'` in the CSP already covers framing for modern browsers.
- **A `frame-src` directive** — absent on purpose. With `default-src 'self'` as the fallback, no third-party frame can load until you add one deliberately (for example `/ppcs-add-turnstile`, which adds `challenges.cloudflare.com`).

---

## Cloud Flows (Power Automate Integration)

**All backend work goes through cloud flows** — Dataverse reads/writes, external HTTP calls, sending email, approvals, and any business rule that needs server-side re-validation. Use `invokeFlow()` from `src/services/cloudFlow.ts`.

### One-time Studio setup (per site)

1. Build a Power Automate flow with trigger **"When Power Pages calls a flow"** — the flow must be in a solution (not a personal flow)
2. Power Pages Studio → **Set up → Cloud flows → + Add cloud flow**
3. Assign web roles: **Authenticated Users** for private flows; add **Anonymous Users** only for flows callable without sign-in
4. Copy the GUID from the trigger URL shown in Studio — it looks like:
   `/_api/cloudflow/v1.0/trigger/4d22a1a2-8a67-e681-9985-3f36acfb8ed4`
5. Store that GUID in your own `src/config/flows.ts` constants file (never hardcode in service calls)

### Usage

```typescript
import { invokeFlow } from '@/services/cloudFlow'

// Fire-and-forget (flow has no "Return value(s) to Power Pages" action)
await invokeFlow('4d22a1a2-8a67-e681-9985-3f36acfb8ed4', {
  email: user.value.email,
  message: formData.message,
})

// With return value (flow has "Return value(s) to Power Pages" action)
const result = await invokeFlow<{ approvalId: string }>(
  '4d22a1a2-8a67-e681-9985-3f36acfb8ed4',
  { contactId: user.value.contactId, amount: 500 },
)
```

Parameter names must match **exactly** the names defined in the flow trigger.

### Error contract — HTTP 200 + `errorCode`

Flows **always** respond with HTTP 200. Power Pages discards the body of any non-2xx flow response and returns a generic `{ErrorCode:'00000006'}` envelope, so a non-2xx status cannot carry business meaning. Business errors are 200 bodies of the form `{ "errorCode": "<CODE>", ...optionalFields }`; `invokeFlow` converts them to a thrown `FlowError` with `.code` (the errorCode) and `.data` (the full body). Genuine transport/platform failures (network, 403 web-role-not-assigned, 400 schema mismatch) throw `FlowError('ERROR')`. Full contract, including the flow-side Response action pattern and standard code vocabulary: [docs/FLOW-ERROR-CONTRACT.md](./docs/FLOW-ERROR-CONTRACT.md).

```typescript
import { FlowError } from '@/services/cloudFlow'
import { useFlowErrorToast } from '@/composables/useFlowErrorToast'

const showFlowError = useFlowErrorToast()   // call inside setup()

try {
  await invokeFlow(FLOWS.submitContactForm, { email, message })
} catch (e) {
  if (e instanceof FlowError && e.code === 'NOT_FOUND') {
    // handle a specific business code locally
  } else {
    showFlowError(e)  // localized toast via src/services/flowErrors.ts
  }
}
```

### Flow GUID management

Flow GUIDs are site-specific — they are assigned by Power Pages Studio. `src/config/flows.ts` ships as an **empty typed registry**; append an entry per flow after Studio setup (or run `/ppcs-register-flow`):

```typescript
// src/config/flows.ts  (shipped file — append entries after Studio setup)
export const FLOWS: Record<string, string> = {
  submitContactForm: '4d22a1a2-8a67-e681-9985-3f36acfb8ed4',
  requestApproval: 'bb7de2f9-f814-44ef-9ed6-9b1e238b8655',
}
```

### Flows vs Web API

There is no choice to make: **all backend work goes through flows** in this starter. The Dataverse Web API client (`portalApi.ts`) no longer ships.
Opt-out: run `/ppcs-enable-web-api` if a table genuinely needs direct browser access — it restores `portalApi.ts` and generates the required site settings and table permissions.

### Critical security rule

**Table permissions are NOT enforced inside cloud flows.** Any flow that reads or writes Dataverse records must re-validate the caller's identity and permissions inside the flow (check `contactId`, `accountId`, or other scoping values before accessing data).

### ALM note

After promoting a solution containing the flow to a new environment, **manually re-register the flow** in the target site via Studio → Cloud flows. It does not auto-register on solution import.

---

## Enabling the Web API for a Table

The starter is **flows-only by default** — the Web API is not used and `portalApi.ts` does not exist.
To opt out, run `/ppcs-enable-web-api <tableName> [fields]` — it restores `src/services/portalApi.ts`, generates the `Webapi/<table>/enabled` + `Webapi/<table>/fields` site settings and a table permission YAML, and updates the ESLint fetch-ban exceptions.

---

## @smkbacil/design-ui Component Library

### Registration
`createSmkb()` in `src/main.ts` registers all `SmkbXxx` components globally. Only import composables or types explicitly:
```typescript
import { useSmkbToast } from '@smkbacil/design-ui'
import type { SmkbColumn, SmkbOption } from '@smkbacil/design-ui'
```

### CSS import order (in `src/main.ts`)
```typescript
import '@smkbacil/design-ui/tokens-nofonts.css'  // design tokens — load first
import '@smkbacil/design-ui/style.css'           // component styles
import './assets/main.css'                       // app overrides — load last
```
`tokens-nofonts.css` is the default: `tokens.css` pulls in bundled `.woff2` files that Vite emits as `assets/*.woff2`, and the starter keeps the shipped build free of binary font assets.

> The original rationale here was that unlisted files "are served as `index.html`". That rested on reading `bundleFilePatterns` as an upload allow-list, which Microsoft's docs contradict (see above) — `upload-code-site` uploads all of `dist/`. **Treat the font question as unverified:** if you want the bundled fonts, switch to `tokens.css`, add `assets/*.woff2` to `bundleFilePatterns` (so superseded font bundles are cleaned up), confirm `font-src` in both CSP files still covers them, and check the fonts actually load on the deployed site before relying on it.

### Key components
`SmkbButton` (variants: `primary`, `secondary`, `ghost`, `danger`), `SmkbInput`, `SmkbSelect`, `SmkbTable` (sortable + paginated), `SmkbDialog`, `SmkbNotification`, `SmkbIcon` (kebab-case icon name), `SmkbCard`, `SmkbLoading`, `SmkbEmpty`, `SmkbSkeleton`

### Toast
```typescript
const toast = useSmkbToast()
toast.add({ message: 'Done!', variant: 'success', duration: 3000 })
toast.add({ message: 'Error!', variant: 'danger', closable: true })
```
`SmkbLayout` renders `SmkbToast` automatically — no need to add it manually.

### Theme and direction
Both managed automatically by `SmkbAppHeader`. Use CSS tokens in styles so they react:
```css
color: var(--smkb-color-text);
background: var(--smkb-color-surface);
border-color: var(--smkb-color-border);
```

### Vite config
`optimizeDeps: { exclude: ['@smkbacil/design-ui'] }` — do not remove. Without it Vite's pre-bundler mishandles the library's named exports.

`resolve.alias: { '@': 'src/' }` is configured — use `@/services/cloudFlow`, `@/composables/usePortalUser`, etc. in import paths.

---

## References

- [GETTING-STARTED.md](./GETTING-STARTED.md) — step-by-step first-deploy guide
- [docs/POWER-PAGES-CODE-SITE-GUIDE.md](./docs/POWER-PAGES-CODE-SITE-GUIDE.md) — full reference: Web API, auth, CSP, pitfalls
- [docs/ALM-CODE-SITES.md](./docs/ALM-CODE-SITES.md) — two-track deployment, promoting to stage/prod, CI/CD patterns
- [docs/FLOW-ERROR-CONTRACT.md](./docs/FLOW-ERROR-CONTRACT.md) — HTTP 200 + `errorCode` flow response contract (flow side + portal side)
- [MS Docs: Create and deploy a code site](https://learn.microsoft.com/en-us/power-pages/configure/create-code-sites)
- [MS Docs: PAC CLI pages reference](https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/pages)
- [MS Docs: Power Pages Web API](https://learn.microsoft.com/en-us/power-pages/configure/web-api-overview)
