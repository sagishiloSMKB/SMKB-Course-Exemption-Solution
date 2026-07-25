# ppcs-troubleshoot Reference

## Quick Symptom → Case Map

| What the user says | Case |
|--------------------|------|
| "500 error after promotion" | Case 1 — missing SPA asset upload |
| "Portal header visible" | Case 2 — usewebsiteheaderandfooter = true |
| "Redirected to /Profile" | Case 3 — ProfileRedirectEnabled = true |
| "Route 404 / MIME error" | Case 4 — lazy import or unlisted chunk |
| "Web API 403" | Case 5 — flows-only not opted out, CSRF, missing settings, or table permissions |
| "Cloud flow 403" | Case 6 — web role not assigned in Studio |
| "CSP error in console" | Case 7 — domain missing from CSP directive |
| "Duplicate sites in list" | Case 8 — siteName mismatch or wrong reactivation |
| "does not provide an export named" | Case 9 — stale edge-cached chunk / cache-buster missing |

---

## Exact YAML File Paths

### Case 2 — usewebsiteheaderandfooter

```
.powerpages-site/page-templates/Default-studio-template.pagetemplate.yml
  → field: usewebsiteheaderandfooter  (root-level file)

.powerpages-site/<siteName>/page-templates/Default-studio-template.pagetemplate.yml
  → field: adx_usewebsiteheaderandfooter  (site-specific file)
```

Both must be `false`. Note: `<siteName>` is the directory under `.powerpages-site/`
matching the site's FriendlyName (with URL slug appended).

### Case 3 — ProfileRedirectEnabled

```
.powerpages-site/site-settings/Authentication-Registration-ProfileRedirectEnabled.sitesetting.yml
  → field: value  (must be "false")
```

### Case 5 — Web API site settings

```
.powerpages-site/site-settings/webapi-<tablename>-enabled.sitesetting.yml
  → adx_name: Webapi/<tableName>/enabled
  → adx_value: "true"

.powerpages-site/site-settings/webapi-<tablename>-fields.sitesetting.yml
  → adx_name: Webapi/<tableName>/fields
  → adx_value: "field1,field2,field3"
```

Note: `<tablename>` in the filename = logical name lowercased (e.g. `contact`).
The `adx_name` uses the table logical name too (e.g. `Webapi/contact/enabled`).
API paths use the entity set name (e.g. `/_api/contacts`).

### Case 7 — CSP site settings

```
.powerpages-site/site-settings/security-csp.sitesetting.yml          ← enforced
.powerpages-site/site-settings/security-csp-report-only.sitesetting.yml  ← report-only
```

Both must be updated identically. The `adx_value` field contains the full CSP string.

---

## pac pages list -v — Good vs Bad Output

### Good (SPA site only):

```
Id                                    FriendlyName     Url                                    SinglePageApplication
------------------------------------  ---------------  -------------------------------------  ---------------------
a1b2c3d4-0001-4000-8000-aaaaaaaaaaaa  My App - my-app  https://my-app.powerappsportals.com    Yes
```

### Bad (duplicate — non-SPA orphan present):

```
Id                                    FriendlyName     Url                                    SinglePageApplication
------------------------------------  ---------------  -------------------------------------  ---------------------
a1b2c3d4-0001-4000-8000-aaaaaaaaaaaa  My App - my-app  https://my-app.powerappsportals.com    Yes
b9e8d7c6-0002-4000-8000-bbbbbbbbbbbb  My App           https://my-app.powerappsportals.com    No
```

The `No` row is the orphan to remove.

---

## Duplicate Site Recovery (Case 8) — Portal Management Steps

1. Open Portal Management app:
   `https://<org-url>/main.aspx?appid=<portal-management-app-id>`
   Or: make.powerapps.com → Apps → Portal Management

2. Left nav → **Websites**

3. Find the website record whose `Id` matches the non-SPA row from `pac pages list -v`
   (the GUID in the URL when you open the record)

4. Click **Deactivate** in the top command bar → confirm

5. Click **Delete** → confirm

6. Re-run `pac pages list -v` to verify only the SPA site remains

---

## Case 4 — Detecting Unlisted Chunks

vite.config.ts manualChunks → expected bundleFilePatterns entries:

| `manualChunks` key | Expected entry in `bundleFilePatterns` |
|-------------------|-----------------------------------------|
| `vue`             | `assets/vue.js`                         |
| `smkb`            | `assets/smkb.js`                        |
| `mylib`           | `assets/mylib.js`                       |
| *(entry point)*   | `assets/index.js`, `assets/index.css`   |

If a manualChunks key is missing from bundleFilePatterns, Power Pages will
not clean the old version before upload. The old file persists as a stale
Web File record and may be served instead of the new version.

---

## Common 403 Causes for Dataverse Web API (Case 5)

First check: does `src/services/portalApi.ts` exist? If not, the site is
still **flows-only** (the default) — a `/_api` OData call shouldn't exist at
all. Use a cloud flow (`invokeFlow`) instead, or opt out via
`/ppcs-enable-web-api`. The ESLint `no-restricted-syntax` rule flags raw
`fetch` in flows-only sites.

| Root cause | Evidence | Fix |
|------------|----------|-----|
| Site never opted out of flows-only | `src/services/portalApi.ts` does not exist | Use `invokeFlow()` via a cloud flow, or run `/ppcs-enable-web-api <tableName>` |
| Raw `fetch` bypassing `portalApi.ts` | `grep -rn "fetch('/_api"` in `src/` returns hits | Replace with `apiGet/apiPost/etc.` from `portalApi.ts` |
| Web API not enabled for table | Missing `webapi-<table>-enabled.sitesetting.yml` | Run `/ppcs-enable-web-api <tableName>` |
| Fields not declared | `webapi-<table>-fields.sitesetting.yml` missing or empty | Run `/ppcs-enable-web-api <tableName>` |
| No table permission | `.powerpages-site/table-permissions/` is empty or missing entry | Run `/ppcs-enable-web-api <tableName>` |
| Write op missing CSRF token | POST/PATCH/DELETE using `apiGet()` instead of `apiPost()` | Use the correct method from `portalApi.ts` |

---

## FlowError Code Classification (Case 6)

Per `docs/FLOW-ERROR-CONTRACT.md`, flows always respond HTTP 200 and signal
business errors as `{ "errorCode": "<CODE>" }` in the body:

| `FlowError.code` | Meaning | Where to look |
|------------------|---------|---------------|
| `'ERROR'` | Transport/platform failure: 403 (missing web role), 400 (trigger schema mismatch), network | Studio web role assignment, trigger parameter names, network tab |
| any other code | Business error deliberately returned by the flow body | The flow's logic; UI handling via `useFlowErrorToast()` |

---

## Case 9 — Stale-Chunk Import Error Checks

Symptom: `Uncaught SyntaxError: The requested module ... does not provide an
export named 'X'` right after a deploy — a fresh `index.js` importing a stale
edge-cached `vue.js`/`smkb.js`.

The `cache-buster` plugin in `vite.config.ts` must produce both of these:

```
dist/index.html:
  <script ... src="/assets/index.js?v=1699999999999">   ← ?v= present

dist/assets/index.js:
  import { ... } from "./vue.js?v=1699999999999"        ← ?v= on cross-chunk imports
```

- `?v=` missing → the plugin was removed from `vite.config.ts`; restore it.
- `?v=` present but error persists → purge the CDN edge cache:
  PPAC → Manage → Power Pages → site → **Restart site**.
