# Power Pages + Vue SPA Starter

A production-ready starter template that hosts a **Vue 3 SPA** inside a **Microsoft Power Pages** portal. The home page renders a full-viewport Vue app; standard Power Pages pages (Search, Profile, Access Denied, Page Not Found) use the platform's built-in header/footer.

Use this as a starting point for any new Power Pages project.

---

## Architecture

| Layer | Technology | Location | Purpose |
|-------|-----------|----------|---------|
| SPA Frontend | Vue 3 + TypeScript + Vite | `client/` | Full UI — routing, components, design system |
| Power Pages Host | YAML + Liquid + PAC CLI | `powerpages/` | Portal infrastructure, auth, search, standard pages |

### Request flow

```
User visits https://<portal>/
        │
        ▼
Power Pages routing
  → finds root web page (adx_isroot: true)
  → applies SMKB App page template (no header/footer)
  → renders smkb-app Liquid web template
        │
        ▼
Liquid shell loads:
  /smkb/app.css?v=N   (design system + app styles)
  /smkb/app.js?v=N    (Vue bundle)
        │
        ▼
Vue app mounts on <div id="app">
  → Vue Router (hash-based: /#/...)
  → renders SmkbLayout + page components
```

All client-side routes live under `/#/...` — no Power Pages URL rewrites needed.

---

## Project Structure

```
├── README.md                          This file
├── CLAUDE.md                          AI assistant context (architecture, conventions)
├── .gitignore
│
├── client/                            Vue 3 SPA
│   ├── src/
│   │   ├── main.ts                    App entry: mounts Vue, registers router + design system
│   │   ├── App.vue                    Root component (RouterView)
│   │   ├── router/index.ts            Hash-based router — add new routes here
│   │   ├── views/
│   │   │   ├── HomePage.vue           Rendered at /#/
│   │   │   └── NotFoundPage.vue       Rendered for unknown /#/... routes
│   │   └── styles/main.css            HTML/body reset (100% height, no overflow)
│   ├── scripts/
│   │   ├── deploy.mjs                 Build + auto-bump version + PAC upload
│   │   └── clean.mjs                  Remove dist/
│   ├── vite.config.ts                 Fixed output: dist/smkb/app.js + app.css
│   ├── tsconfig.app.json
│   └── package.json
│
└── powerpages/
    └── your-portal---your-portal-dev/          ← rename this folder to match your site
        ├── website.yml                Master site record — contains adx_websiteid (env-specific)
        ├── websitelanguage.yml        Language configuration (English)
        ├── publishingstate.yml        Published + Draft states
        ├── sitesetting.yml            Auth, search, theme, and hundreds of platform settings
        ├── sitemarker.yml             Named page references (Home, Search, Profile, etc.)
        ├── webrole.yml                Anonymous, Authenticated, Administrator roles
        ├── websiteaccess.yml          Page permission rules
        ├── .portalconfig/
        │   └── org*.crm4.dynamics.com-manifest.yml   PAC CLI sync manifest (checksums)
        ├── page-templates/
        │   ├── SMKB-App.pagetemplate.yml    Full-viewport SPA (no header/footer)
        │   └── *.pagetemplate.yml           Standard Power Pages templates
        ├── web-templates/
        │   ├── smkb-app/
        │   │   ├── SMKB-App.webtemplate.yml
        │   │   └── SMKB-App.webtemplate.source.html   Liquid loader shell (favicon + CSS + JS)
        │   └── *.webtemplate.*              Standard templates (header, footer, search, etc.)
        ├── web-pages/
        │   ├── home/
        │   │   ├── Home.webpage.yml                   Root page (adx_isroot: true)
        │   │   └── content-pages/Home.en-US.webpage.yml
        │   ├── search/
        │   ├── page-not-found/
        │   ├── access-denied_*/
        │   └── profile_*/
        ├── web-files/
        │   ├── app.js + app.js.webfile.yml            Vue bundle (auto-copied by deploy.mjs)
        │   ├── app.css + app.css.webfile.yml           Design system styles
        │   ├── favicon.webp + favicon.webp.webfile.yml
        │   └── *.css / *.png / *.txt                   Standard portal assets
        └── content-snippets/                           Localizable text fragments
```

---

## Prerequisites

- **Node.js 20+**
- **pnpm 9+** — `npm install -g pnpm`
- **PAC CLI** — [install guide](https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction)
  - Windows: `winget install Microsoft.PowerAppsCLI`
  - Verify: `pac --version`

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Always reflects what is deployed to production |
| `dev` | Integration branch — open pull requests against `main` from here |
| `feature/*` | Short-lived feature branches — branch off `dev`, PR back to `dev` |

Deployments run from `main` only. `deploy.mjs` enforces this with a branch check — it exits with an error if you are not on `main`.

---

## Deployment Model

> **Only the Dev environment is ever deployed to directly. Stage and Production are reached via Power Platform Pipelines only.**

| Environment | How to deploy | Who triggers |
|-------------|--------------|--------------|
| **Dev** (`SMKB-Apps-Dev`) | `pnpm deploy` from `main` | Developer |
| **Stage** | Power Platform Pipeline: Dev → Stage | Developer / Tech Lead |
| **Production** | Power Platform Pipeline: Stage → Production | Tech Lead / release process |

Never run `pnpm deploy` or `pac pages upload` against a Stage or Production environment URL. This bypasses the pipeline gate, skips solution validation, and risks inconsistent state between environments.

The pipeline promotes the **Power Platform solution** — not raw YAML files. Every Power Pages component that should reach Stage/Prod must be registered as a solution component. See [Power Platform Pipeline](#power-platform-pipeline--stage--production) below.

---

## Local Development

```bash
cd client
pnpm install        # first time only
pnpm dev            # starts Vite at http://localhost:5173
```

The dev server serves the Vue SPA directly — no Power Pages required. Design system tokens and components work the same as in production.

---

## Deploying to Power Pages

### First deploy to a brand-new environment

Follow these steps exactly. Order matters.

**Step 1 — Authenticate with SMKB-Apps-Dev**

All SMKB projects use the same Power Platform environment. If you haven't authenticated yet:

```bash
pac auth create --url https://org229c958d.crm4.dynamics.com
```

`deploy.mjs` automatically selects this environment before every upload — no manual `pac auth select` needed once the profile exists.

**Step 2 — Create a blank Power Pages portal** (if one does not exist)

In [Power Pages Make](https://make.powerpages.microsoft.com/), create a new site using the blank template. Wait for provisioning to complete (can take 5–10 minutes).

**Step 3 — Get the real website GUID**

```bash
pac pages list
```

Copy the `SiteId` (a GUID) for your new portal.

**Step 4 — Set the website GUID in `website.yml`**

Open `powerpages/<your-pages-subdir>/website.yml` and set:

```yaml
adx_websiteid: <paste-guid-from-step-3>
```

**Step 5 — Update the deploy config**

Open `client/scripts/deploy.mjs` and update the two constants at the top:

```js
const PORTAL_URL   = 'https://<your-portal-url>.powerappsportals.com'
const PAGES_SUBDIR = '<your-portal-folder-name>'
```

`PAGES_SUBDIR` is the folder name under `powerpages/`. You can rename this folder to match your site if you prefer — just keep `PAGES_SUBDIR` in sync.

**Step 6 — Deploy**

```bash
cd client
pnpm install    # if not already done
pnpm deploy
```

The script will:
1. Auto-bump `?v=N` in the Liquid web template
2. Build the Vue bundle (`vue-tsc` + Vite)
3. Copy `dist/smkb/*` to `powerpages/.../web-files/`
4. Upload all YAML files via `pac pages upload --modelVersion 2`

**Step 7 — Verify**

Navigate to `https://<your-portal-url>.powerappsportals.com`. You should see the Vue SPA render `SmkbLayout`.

If you see "Page Not Found", see the [Troubleshooting](#troubleshooting) section.

---

### Subsequent deploys (after code changes)

```bash
cd client
pnpm deploy
```

That's it. Cache busting (`?v=N`) is automatic.

---

## GUID Reference

Every GUID that appears across the YAML files and what it refers to:

| GUID | Entity type | What it is | Env-specific? |
|------|-------------|-----------|---------------|
| TODO — get from `pac pages list` | Website | Master site record | **Yes — update on new env** |
| `a3f1bd7e-2958-45af-90ce-e9d951422a3d` | Web page (root) | Home page (`/`) | No |
| `4fc2abf8-23fa-4b2a-8f07-9a5f9e123eab` | Page template | SMKB App (no header/footer) | No |
| `53cba0bc-bcc7-4b58-ae2b-6fd5b61973d9` | Web template | smkb-app Liquid shell | No |
| `77b70744-951d-4f29-9f99-2e2c8a19db20` | Portal language | English (LCID 1033) | No |
| `498e04fe-0f5f-4a19-b384-3b0470b012b4` | Publishing state | Published (default) | No |
| `ebb208dc-b9f2-4d43-a177-6e28de9092d6` | Publishing state | Draft | No |
| `cb724c8d-9ad1-4afc-ab62-c6c1887d1114` | Web template | Standard header | No |
| `d8d5e749-aa73-4c4d-9a69-5e791eb35794` | Web template | Standard footer | No |

Only `adx_websiteid` is environment-specific. All other GUIDs are portable — they are upserted into Dataverse on first deploy and remain stable across environments.

---

## Understanding the GUID System

Power Pages resolves page content through a chain of foreign-key lookups:

```
website.yml
  adx_defaultlanguage: 77b70744   ← portal language GUID
        │
        ▼
websitelanguage.yml
  adx_portallanguageid: 77b70744  ← must match adx_defaultlanguage
  adx_websitelanguageid: 77b70744 ← this ID is used as a filter
        │
        ▼
Home.en-US.webpage.yml
  adx_webpagelanguageid: 77b70744 ← must match adx_websitelanguageid
  adx_publishingstateid: 498e04fe ← must match the default published state
        │
        ▼
publishingstate.yml
  adx_publishingstateid: 498e04fe
  adx_isdefault: true             ← marks this as the active published state
```

**The invariant:** these three values must be identical in all YAML files:
- `website.yml adx_defaultlanguage`
- `websitelanguage.yml adx_portallanguageid` and `adx_websitelanguageid`
- All `*.en-US.webpage.yml` files: `adx_webpagelanguageid`

And this pair must be consistent:
- `publishingstate.yml` entry where `adx_isdefault: true` → its `adx_publishingstateid`
- All `*.webpage.yml`, `*.webfile.yml`, and `*.contentsnippet.yml` files: `adx_publishingstateid`

---

## The Phantom GUID Pitfall

**Do not run `pac pages download --overwrite` after your first deploy.**

### What happens if you do

When you first create a Power Pages portal, Dataverse auto-generates its own records (websitelanguage, publishingstate, etc.) with Dataverse-assigned GUIDs. When you then run `pac pages download --overwrite`, PAC CLI replaces your hand-crafted GUIDs with those Dataverse-generated ones — but only in the YAML files it downloads. Your other YAML files (webpages, content snippets, webfiles) still reference your original GUIDs. Now you have two sets of GUIDs in Dataverse and two sets in your YAML files, and they don't match. Result: "Page Not Found" on every page.

### How to detect it

If `websitelanguage.yml` has more than one entry, or `publishingstate.yml` has more than two entries, or any of the GUID invariants above are broken — you have phantom records.

### Recovery

Run a bulk replacement across all YAML files to restore consistency. The correct GUIDs to target are those in `websitelanguage.yml` and `publishingstate.yml` (the IDs that are referenced by the most files).

```powershell
$dir   = "powerpages\<your-pages-subdir>"
$files = Get-ChildItem -Path $dir -Recurse -Include "*.yml" |
         Where-Object { $_.FullName -notlike "*\.portalconfig\*" }

foreach ($file in $files) {
  $c = [System.IO.File]::ReadAllText($file.FullName)
  $n = $c -replace "<old-language-guid>",    "<correct-language-guid>"
  $n = $n -replace "<old-publishstate-guid>", "<correct-publishstate-guid>"
  if ($c -ne $n) {
    [System.IO.File]::WriteAllText($file.FullName, $n, [System.Text.Encoding]::UTF8)
    Write-Host "Fixed: $($file.Name)"
  }
}
```

Replace `<old-*>` with the Dataverse-generated GUIDs and `<correct-*>` with the GUIDs in this repo (`77b70744`, `498e04fe`). Then redeploy.

---

## Cache Busting

Assets are served from Power Pages with fixed filenames (`app.js`, `app.css`). To force browsers to fetch new versions, the Liquid template uses query-string versioning:

```html
<link rel="stylesheet" href="/smkb/app.css?v=N" />
<script type="module" src="/smkb/app.js?v=N"></script>
```

**`deploy.mjs` automatically increments `N` on every deploy.** No manual edits needed.

---

## Security Best Practices

Security headers are pre-configured in `sitesetting.yml` as `adx_sitesetting` records. Power Pages applies these as HTTP response headers on every page.

| Header | Value | Purpose |
|--------|-------|---------|
| `HTTP/X-Frame-Options` | `DENY` | Prevents clickjacking |
| `HTTP/X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `HTTP/Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer information leakage |
| `HTTP/Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Restricts browser feature access — adjust per project |

**CSP**: Power Pages manages Content Security Policy at the platform level. The `tokens-nofonts.css` import in `main.ts` is required — Power Pages CSP blocks custom font binary loading.

**Authentication**: Azure AD external auth is pre-configured; local password auth is disabled by default. Review `Authentication/Registration/OpenRegistrationEnabled` in `sitesetting.yml` — it is annotated with a TODO to decide per project.

---

## Solution Manifest & Site Settings

All YAML in `powerpages/` is the source of truth. The YAML files are the configuration — there is no separate config file.

**Adding a new site setting:**
1. Add an entry to `sitesetting.yml` (follow the existing `adx_sitesetting` format)
2. Run `pnpm deploy` — PAC CLI upserts all records including the new setting
3. In Power Apps Maker, add the new setting to the project solution (see [Power Platform Pipeline](#power-platform-pipeline--stage--production)) so it is promoted by the next pipeline run

> **Every new `adx_sitesetting` entry must be added to the Power Platform solution in Power Apps Maker before the next pipeline run — PAC CLI does not do this automatically.**

The `.portalconfig/manifest.yml` controls which entity types PAC CLI syncs. The default `{}` syncs all entity types. Restrict it to specific types for tighter control over what `pac pages upload` touches.

---

## Power Platform Pipeline — Stage & Production

### Prerequisites

- A Power Platform Pipeline linking Dev → Stage → Production must be configured in [Power Platform Admin Center](https://admin.powerplatform.microsoft.com/)
- The Power Pages website must be added to the project solution in Power Apps Maker (see below)

### Registering Power Pages components in the solution

After the first `pnpm deploy` (or after adding new components), register all Power Pages components so the pipeline can promote them.

**In Power Apps Maker (make.powerapps.com):**
1. Open **Solutions** → select your project solution (the one matching `SOLUTION_NAME` from setup)
2. Click **Add Existing → More → Power Pages** → select your website
3. This includes the website record and all its child components (pages, templates, settings, roles, files, etc.)
4. Click **Save**

**When you add new components** (new site settings, web pages, web files):
- After `pnpm deploy`, re-add the website via Add Existing (or add the specific new component type) to capture new records
- New `adx_sitesetting` records are **not** automatically added to the solution — always add them manually before triggering the pipeline

### Component types that must be in the solution

| Component | Dataverse table |
|-----------|----------------|
| Website | `adx_website` |
| Web templates | `adx_webtemplate` |
| Page templates | `adx_pagetemplate` |
| Web pages | `adx_webpage` |
| Web files | `adx_webfile` |
| Site settings | `adx_sitesetting` |
| Web roles | `adx_webrole` |
| Website access | `adx_websiteaccess` |
| Publishing states | `adx_publishingstate` |
| Content snippets | `adx_contentsnippet` |
| Site markers | `adx_sitemarker` |
| Table permissions | `adx_entitypermission` |

### Triggering the pipeline

1. Verify `pnpm deploy` completed successfully from `main` and the Dev site looks correct
2. Open [Power Platform Admin Center](https://admin.powerplatform.microsoft.com/) → Pipelines → your pipeline
3. Run **Dev → Stage** — verify the Stage site functions correctly before continuing
4. Run **Stage → Production**

### What the pipeline does NOT handle automatically

- **Binary web files** — `app.js`, `app.css`, and other binaries are stored as annotations on webfile records in Dataverse. Adding webfiles to the solution includes the binary, but verify the correct `?v=N` version is present in Stage/Prod after promotion.
- **Environment-specific settings** — `adx_websiteid` is environment-specific. The pipeline environment mapping handles this; do not set it manually in Stage or Prod YAML.

---

## Adding Features

### Add a new Vue route

1. Create a view in `client/src/views/MyFeature.vue`
2. Register it in `client/src/router/index.ts`:
   ```ts
   { path: '/my-feature', component: () => import('../views/MyFeature.vue') }
   ```
3. Run `pnpm deploy`

The feature is accessible at `https://<portal>/#/my-feature`.

### Inject server-side data from Power Pages

For features that need data from Dataverse (e.g. current user, site settings):

1. Add a site setting in `sitesetting.yml`
2. Inject it as a global in the Liquid shell (`SMKB-App.webtemplate.source.html`):
   ```liquid
   <script>
     window.__SMKB_MY_VALUE = {{ settings['MySetting'] | json }};
   </script>
   ```
3. Read it in Vue via `window.__SMKB_MY_VALUE` (add a `src/config.ts` to centralise these)

### Use design system components

See the `@smkb/design-ui` package for the full component reference.

The design system CSS must be imported in this order in `main.ts` (CSP constraint — no font binaries):

```ts
import '@smkb/design-ui/tokens-nofonts.css'  // tokens without font binaries
import '@smkb/design-ui/tokens-dark.css'
import '@smkb/design-ui/styles'
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Page Not Found" on every URL | GUID mismatch between websitelanguage, publishingstate, and content pages | Follow the [GUID Consistency](#understanding-the-guid-system) check; use bulk replace to fix; redeploy |
| "Page Not Found" only on home | `adx_isroot: true` missing or home page uses wrong template | Check `Home.webpage.yml` — must have `adx_pagetemplateid: 4fc2abf8-...` and `adx_isroot: true` |
| PAC CLI delete errors during upload | Orphaned Dataverse records that were created on a previous deploy and can't be deleted | Safe to ignore — these are cosmetic errors. The upload still succeeds |
| `inject-hashes` CSP warning in console | Platform-level Power Pages bug | Safe to ignore — not related to your code |
| White screen / `app.js` 404 | `smkb` container web page missing from Dataverse | Ensure `web-pages/smkb/smkb.webpage.yml` is committed and redeploy. This page acts as the parent for all `/smkb/*` assets. |
| Stale assets after deploy | Browser cached old `app.js` / `app.css` | Hard-refresh (Ctrl+Shift+R); or check `?v=N` incremented in the Liquid template |
| `pac pages upload` fails — "website not found" | `adx_websiteid` in `website.yml` is wrong | Run `pac pages list`, copy the correct GUID, update `website.yml` |
| `PAC_CLI_PATH` error | PAC CLI not in the default `%LOCALAPPDATA%` path | Set the env var: `$env:PAC_CLI_PATH = "C:\path\to\pac.cmd"` |
