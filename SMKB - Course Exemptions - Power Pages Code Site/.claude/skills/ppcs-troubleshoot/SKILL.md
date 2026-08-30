---
name: Power Pages Code Site — Troubleshoot
description: >-
  Diagnoses the 10 most common Power Pages Code Site failures: 500 on promotion,
  portal template visible, /Profile redirect, route 404, Web API 403, flow 403,
  CSP blocks, duplicate sites, stale-chunk import errors after deploy, and a site
  made unreachable by a CDN certificate mismatch.
when_to_use: >-
  User reports: site showing error, "something went wrong", portal header visible,
  redirected to /Profile, 404 on a route, 403 from API or flow, CSP error in
  console, duplicate sites in pac pages list, "does not provide an export named"
  error after a deploy, or ERR_CERT_COMMON_NAME_INVALID / "site unreachable" /
  HSTS after enabling the CDN.
argument-hint: "[symptom description]"
arguments: [symptom]
context: fork
agent: Explore
allowed-tools: Read Grep Bash(pac pages list *) Bash(pac auth list)
---

## Context

This skill is read-only. It diagnoses by reading files and running safe CLI
queries, then reports findings without modifying anything.

The 10 known failure modes have distinct diagnostic signatures. Match the
symptom to the correct case before proposing a fix.

For YAML file paths and `pac pages list -v` output examples, see
[troubleshoot-reference.md](troubleshoot-reference.md).

## Steps

### Intake

1. If `$symptom` is provided, classify it against the 10 cases below.
   If no symptom was provided, ask the user to describe what they're seeing
   (error message, HTTP status code, which page, what was last deployed).

2. Run context queries immediately:
   ```
   pac auth list
   pac pages list -v
   ```

---

### Case 1 — HTTP 500 on Promoted Site

**Trigger phrases:** "500 error", "something went wrong after promotion",
"500 on stage", "500 on prod"

**Diagnosis:**
- Check `pac auth list` — note which environment is currently active
- Check `pac pages list -v` — confirm the site in the target environment
  shows `Single Page Application: Yes`

**Conclusion:** The Power Platform Pipeline completed (config arrived) but
`pac pages upload-code-site --rootPath .` was never run against the target
environment (SPA assets never arrived). A Pipeline alone is not enough.

**Fix:**
1. `pac auth create --environment <target-env-url>`
2. `npm run build`
3. `pac pages upload-code-site --rootPath .`
4. `pac auth select --index 1` (restore Dev auth)

---

### Case 2 — Portal Header/Footer Visible Around SPA

**Trigger phrases:** "portal template showing", "header visible", "footer visible",
"Power Pages header around my app", "site renders portal layout"

**Diagnosis:**
Read both page template files and check the relevant fields:
- `.powerpages-site/page-templates/Default-studio-template.pagetemplate.yml`
  → field: `usewebsiteheaderandfooter`
- `.powerpages-site/<siteName>/page-templates/Default-studio-template.pagetemplate.yml`
  → field: `adx_usewebsiteheaderandfooter`

**Conclusion:** One or both fields is `true`. The portal injects its own
header/footer around the SPA instead of rendering it alone.

**Fix:** Set both fields to `false`, then run `npm run deploy`
(or `/ppcs-deploy`).

---

### Case 3 — Users Redirected to /Profile After Sign-In

**Trigger phrases:** "redirected to /Profile", "/Profile redirect after login",
"users sent to profile page", "sign-in goes to /Profile"

**Diagnosis:**
Read: `.powerpages-site/site-settings/Authentication-Registration-ProfileRedirectEnabled.sitesetting.yml`
Check field: `value`

**Conclusion:** `value: true` means Power Pages redirects every user to
`/Profile` after sign-in. This is the default and must be disabled.

**Fix:** Change `value: true` → `value: false`, then run `npm run deploy`.

---

### Case 4 — Route Returns 404 or MIME-Type Error

**Trigger phrases:** "404 on route", "route not found", "MIME type error",
"Failed to fetch dynamically imported module", "ERR_ABORTED"

**Diagnosis:**
1. Grep `src/router/index.ts` for `() => import` — any match indicates a
   lazy/dynamic import:
   ```
   grep -n "() => import" src/router/index.ts
   ```
2. Read `vite.config.ts` — extract all `manualChunks` keys, build expected
   filenames: `assets/<key>.js`
3. Read `powerpages.config.json` — extract `bundleFilePatterns`
4. Cross-reference: any chunk not listed in `bundleFilePatterns` will be
   served as `index.html` by Power Pages instead, causing the MIME error

**Conclusion:**
- If lazy import found → the dynamic chunk is not in `bundleFilePatterns`
- If manualChunks key not in bundleFilePatterns → stale record or 404

**Fix:**
- Replace lazy import with direct import in `src/router/index.ts`
- OR add the missing chunk filename to `bundleFilePatterns` in
  `powerpages.config.json` and redeploy

---

### Case 5 — Dataverse Web API Returns 403

**Trigger phrases:** "web api 403", "api returns 403", "unauthorized web api",
"CSRF error", "fetch 403", "403 on /_api"

**Diagnosis:**
1. **First question: has this site opted out of flows-only via
   `/ppcs-enable-web-api`?** Check whether `src/services/portalApi.ts` exists.
   - If it does **not** exist, the site is still flows-only — a `/_api` OData
     call shouldn't exist at all. The fix is usually to use a cloud flow
     instead (`invokeFlow` from `src/services/cloudFlow.ts`), and the ESLint
     `no-restricted-syntax` rule should have flagged the raw `fetch`
     (`npm run lint`).
2. If opted out, grep `src/` for raw fetch calls bypassing `portalApi.ts`:
   ```
   grep -rn "fetch('/_api\|fetch(\"/_api" src/
   ```
3. Check site settings for the affected table:
   - `.powerpages-site/site-settings/webapi-<tablename>-enabled.sitesetting.yml`
   - `.powerpages-site/site-settings/webapi-<tablename>-fields.sitesetting.yml`
4. Check table permissions:
   - `.powerpages-site/table-permissions/` for a matching entity permission YAML

**Conclusion:**
- Not opted out of flows-only → the OData call itself is the problem
- Raw fetch → missing CSRF token (must use `apiPost/apiPatch/apiDelete` from `portalApi.ts`)
- Missing site settings → Web API not enabled for that table
- Missing table permission → Power Pages denies all access by default

**Fix:**
- Flows-only site → replace the `/_api` call with a cloud flow via
  `invokeFlow()` (`/ppcs-register-flow`)
- Genuinely need direct OData → run `/ppcs-enable-web-api <tableName>` (it
  restores `portalApi.ts`, allowlists it in ESLint, and creates the YAMLs)
- Replace raw `fetch` with `apiGet/apiPost/apiPatch/apiDelete` from `src/services/portalApi.ts`

---

### Case 6 — Cloud Flow Returns 403

**Trigger phrases:** "flow 403", "cloud flow unauthorized", "403 from flow",
"invokeFlow returns 403"

**Diagnosis:**
First classify the error via the flow error contract
(docs/FLOW-ERROR-CONTRACT.md):
- `FlowError` with code `'ERROR'` = transport/platform failure — 403 missing
  web role, 400 trigger schema mismatch, or network failure
- `FlowError` with any **other** code = a business error deliberately returned
  by the flow body (HTTP 200 + `errorCode`) — not a platform problem; look at
  the flow's logic and the UI handling via `useFlowErrorToast()`

For the 403/platform case, the failure cannot be diagnosed from code. The web
role assignment is configured in Power Pages Studio, not in source files.

**Conclusion:** The flow was not assigned the correct web role in Studio.
Anonymous Users role is needed for unauthenticated callers; Authenticated Users
for signed-in callers.

**Fix (manual — Studio required):**
1. Go to make.powerpages.microsoft.com → Edit this site
2. Set up → Cloud flows
3. Find the affected flow → Edit web role assignments
4. Add **Authenticated Users** (and optionally **Anonymous Users**)
5. Save

---

### Case 7 — CSP Blocks an External Script, Font, or Image

**Trigger phrases:** "CSP error", "content security policy blocks", "refused to load",
"ERR_BLOCKED_BY_RESPONSE", "violates Content Security Policy"

**Diagnosis:**
1. Identify the blocked domain from the browser console error
2. Read `.powerpages-site/site-settings/security-csp.sitesetting.yml`
3. Read `.powerpages-site/site-settings/security-csp-report-only.sitesetting.yml`
4. Identify which CSP directive is missing the domain:
   - Scripts → `script-src`
   - Fonts → `font-src`
   - Images → `img-src`
   - API calls → `connect-src`
   - Styles → `style-src`

**Fix:** Use `/ppcs-add-csp-domain <domain> <directive>` — it updates both
files simultaneously and checks for drift between them.

---

### Case 8 — Duplicate Sites in pac pages list

**Trigger phrases:** "two sites", "duplicate site", "wrong site deployed to",
"pac pages list shows duplicates"

**Diagnosis:**
Run `pac pages list -v`. Look for two rows with the same or similar names —
one with `Single Page Application: Yes` and one with `No`.

**Conclusion:** The non-SPA record is an orphan, typically caused by a
`siteName` mismatch during deploy or a Delete + Reactivate anti-pattern.

**Fix (manual — Portal Management required):**
See [troubleshoot-reference.md](troubleshoot-reference.md) for the
deactivate + delete procedure in the Portal Management app.

---

### Case 9 — "does not provide an export named" After a Deploy

**Trigger phrases:** "does not provide an export named", "Uncaught SyntaxError:
The requested module", "export named error after deploy", "app broken right
after deploying"

**Diagnosis:**
The classic cause: a fresh `assets/index.js` importing a **stale edge-cached**
chunk (`vue.js` / `smkb.js`) that no longer has the expected export. The
`cache-buster` plugin in `vite.config.ts` prevents this by stamping
`?v=<buildTimestamp>` on asset URLs and cross-chunk imports.
1. Check `dist/index.html` — asset URLs should carry `?v=<timestamp>`
2. Check `dist/assets/index.js` — cross-chunk import specifiers
   (e.g. `from "./vue.js?v=..."`) should carry `?v=<timestamp>`

**Conclusion:**
- `?v=` missing from either → the `cache-buster` plugin was removed or broken
  in `vite.config.ts`
- `?v=` present but error persists → the CDN edge cache is still serving stale
  chunks

**Fix:**
- Plugin missing → restore the `cache-buster` plugin in `vite.config.ts`,
  rebuild, redeploy
- Plugin present → restart the site from the Power Pages admin center
  (PPAC → Manage → Power Pages → site → **Restart site**) to purge the CDN cache

### Case 10 — Site Unreachable With a Certificate Error (CDN)

**Trigger phrases:** "ERR_CERT_COMMON_NAME_INVALID", "certificate error", "the
website uses HSTS", "can't visit the site", "site went down after converting to
production", unexplained **404 at the site root**

**Diagnosis:**
Enabling the **Azure CDN** — commonly ticked by accident in the same dialog as
*Convert to production* — can leave the hostname serving the CDN's own default
certificate instead of a Power Pages one. Because `powerappsportals.com` is on
the **HSTS preload list**, the browser refuses to let anyone click through, so
the site is unreachable rather than merely warned about.

Check which certificate the hostname actually serves — do not guess:
```powershell
$h = '<slug>.powerappsportals.com'
$c = [Net.Sockets.TcpClient]::new($h, 443)
$s = [Net.Security.SslStream]::new($c.GetStream(), $false, { $true })
$s.AuthenticateAsClient($h); $s.RemoteCertificate.Subject; $s.Dispose(); $c.Dispose()
```
Then **compare against a sibling site in the same environment** — that single
comparison turns an ambiguous symptom into a certainty.

**Conclusion:**
- Subject is `CN=*.azureedge.net` (or any cert not covering
  `*.powerappsportals.com`) → the **CDN binding is incomplete**. A 404 from an
  HTTPS GET of `/` with validation disabled confirms the origin route is unbound
  too. Sibling non-CDN sites in the same environment will serve a valid cert.
- Subject covers the hostname → the problem is **not** TLS; rule this case out.

**Fix:**
- Disable the CDN for the site (PPAC → Manage → Power Pages → site), or wait for
  the CDN binding to finish provisioning.
- **A code-site deploy cannot cause or fix this.** DNS, TLS and edge routing sit
  outside everything this kit touches, so redeploying only wastes time — and the
  Dataverse site record stays `Active` / `Code Site` throughout, which makes the
  record look healthy while the site is dark.
- Converting to Production and enabling the CDN are **independent** settings:
  keep the conversion (it stops the 90-day deletion clock), drop the CDN.

## Error Handling

If the symptom doesn't match any of the 10 cases, report which cases were ruled
out and what diagnostic evidence was found. Ask the user for more context:
browser console errors, HTTP response body, last action taken before the issue.

## Notes

This skill runs in an isolated subagent (`context: fork`) — it cannot modify
files or run `npm run deploy`. For fixes that require code changes, exit
troubleshoot mode and invoke the appropriate skill (`/ppcs-deploy`,
`/ppcs-enable-web-api`, `/ppcs-add-csp-domain`, etc.).
