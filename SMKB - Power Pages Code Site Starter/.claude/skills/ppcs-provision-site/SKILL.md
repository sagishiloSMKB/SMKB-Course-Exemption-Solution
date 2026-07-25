---
name: Power Pages Code Site — Provision Site
description: >-
  First-deploy wizard for a new Power Pages Code Site: freshen GUIDs, pac auth,
  npm deploy, reactivate, pac download, fix page templates + ProfileRedirectEnabled,
  redeploy. Run once on a fresh clone before any other deploy.
when_to_use: >-
  User says "provision", "first deploy", "set up site", "initialize site", or
  "start from scratch". Never trigger on a site that already has .guid-freshened.
argument-hint: "[environment-url]"
arguments: [environment-url]
disable-model-invocation: true
allowed-tools: Bash(pac *) Bash(npm *) Bash(powershell *) Read Edit
---

## Context

This is the highest-risk workflow in the repository. Skipping any step leaves
the site permanently broken in subtle ways:

- **ProfileRedirectEnabled not set to false** → every user is redirected to
  `/Profile` after sign-in instead of staying on the SPA.
- **usewebsiteheaderandfooter not set to false** → Power Pages renders its own
  portal template around the SPA; the Vue app never mounts.
- **siteName mismatch after provisioning** → subsequent `npm run deploy` targets
  the wrong site, creating orphan Web File records or a second site.

For detailed recovery procedures, see [provision-reference.md](provision-reference.md).

## Steps

### Pre-flight

1. Check whether `.guid-freshened` exists in the project root.
   If it exists, **stop** — this site is already provisioned. Direct the user
   to `/ppcs-deploy` for subsequent deploys.

2. Grep `src/config/solution.ts` for `CHANGEME`. If any match is found,
   **stop** — ask the user to fill in the real `prefix`, `siteName`, `appName`,
   and `documentTitle` values in `src/config/solution.ts` before continuing.
   (`solution.ts` is the single source of identity — do NOT hand-edit the site
   name in `powerpages.config.json`; the next step derives it.)

3. **Site name convention — derive and sync.** The Power Pages site name must be
   `<PREFIX> - <siteName>` (uppercased prefix), e.g. `PVCH - Lecturer Portal`, so
   every site created from this starter is namespaced to its solution. Read
   `SOLUTION.prefix` and `SOLUTION.siteName` from `src/config/solution.ts`, compute
   `<PREFIX.toUpperCase()> - <siteName>`, and set that exact string as `siteName`
   in `powerpages.config.json` (replacing the `MY-SITE-NAME` placeholder). This is
   the value PAC CLI uses to create the site record. Confirm the written value
   starts with `<PREFIX> - `.

4. Check that the `NPM_TOKEN` environment variable is set (PowerShell:
   `$env:NPM_TOKEN`). The `.npmrc` requires it — without it `npm install`
   fails with "Failed to replace env in config". If not set, **stop** and
   instruct the user:
   ```powershell
   $env:NPM_TOKEN = "npm_xxx"   # npm token with read access to the @smkbacil scope
   ```

### Phase 1 — Auth + First Deploy

5. Run the GUID freshen script (one-time setup, prevents GUID collisions in
   the same Dataverse org):
   ```
   powershell -ExecutionPolicy Bypass -File scripts/freshen-site-settings.ps1
   ```
   Confirm the script reports replacements and writes the `.guid-freshened` marker.

6. Authenticate PAC CLI to the target environment. If `$environment-url` was
   provided use it; otherwise prompt the user for the URL:
   ```
   pac auth create --environment "<environment-url>"
   ```
   Then verify with `pac auth list` that the new profile is active.

7. Install dependencies and deploy:
   ```
   npm install
   npm run deploy
   ```
   `npm run deploy` is gated — it runs `npm run lint && npm run test && npm run build`
   before uploading. Any lint, test, or TypeScript failure must be resolved
   before continuing.
   Expected outcome: PAC CLI creates the site in **Inactive Sites** automatically.

### Phase 2 — Reactivation (Manual Step)

8. **PAUSE.** Tell the user:
   > The site has been uploaded to Power Pages as an inactive site.
   > 1. Go to [make.powerpages.microsoft.com](https://make.powerpages.microsoft.com)
   > 2. Click **Inactive Sites** in the left sidebar
   > 3. Find your site and click **Reactivate**
   > 4. Wait 2–3 minutes — do NOT delete the site, only reactivate it
   > 5. Reply "done" when the site is active

   Wait for confirmation before continuing.

### Phase 3 — Download + Post-Config

9. Get the site GUID and confirm code-site mode:
   ```
   pac pages list -v
   ```
   Look for the row with your site name. Confirm `Single Page Application: Yes`.
   If it shows `No`, wait 1 more minute and retry. Extract the site GUID (`Id` column).

10. Download site components:
   ```
   pac pages download --path "./.powerpages-site" --webSiteId <GUID> --modelVersion 2 -o
   ```

11. **Critical edit 1** — Disable profile redirect:
    File: `.powerpages-site/site-settings/Authentication-Registration-ProfileRedirectEnabled.sitesetting.yml`
    Change: `value: true` → `value: false`

12. **Critical edit 2** — Disable portal header/footer (root-level template):
    File: `.powerpages-site/page-templates/Default-studio-template.pagetemplate.yml`
    Change: `usewebsiteheaderandfooter: true` → `usewebsiteheaderandfooter: false`

13. **Critical edit 3** — Disable portal header/footer (site-specific template):
    File: `.powerpages-site/<siteName>/page-templates/Default-studio-template.pagetemplate.yml`
    Change: `adx_usewebsiteheaderandfooter: true` → `adx_usewebsiteheaderandfooter: false`
    (Replace `<siteName>` with the actual directory name inside `.powerpages-site/`.)

14. **siteName sync** — Re-read `pac pages list -v`. Power Pages often appends a
    URL slug to the name (e.g. "PVCH - Lecturer Portal" → "PVCH - Lecturer Portal -
    pvch-lecturer-portal"). If the friendly name shown differs from `siteName` in
    `powerpages.config.json`, update the config file to match it exactly (PAC CLI
    upserts by this name — a mismatch creates an orphan site). The base name still
    begins with `<PREFIX> - ` from step 3; only the appended slug is new.

### Phase 4 — Redeploy

15. Run the second deploy with the corrected configuration (again gated by
    lint + test + build):
    ```
    npm run deploy
    ```

16. Report success with the site URL and remind the user to verify the SPA loads
    (not the portal template). Ask them to open the site in a browser and confirm.

## Error Handling

- **Build fails (TypeScript errors):** Fix all errors before proceeding. Run
  `npm run build` to surface them. Prefix intentionally unused variables with `_`.
- **pac pages list shows duplicate entries:** See [provision-reference.md](provision-reference.md)
  for the deactivate+delete procedure using Portal Management app.
- **Upload returns 403 on `.js` files:** JavaScript uploads are blocked in
  Dataverse. In PPAC → Environment Settings → Blocked Attachments, remove `js`
  from the blocked list, then retry.
- **npm install fails with "Failed to replace env in config":** `NPM_TOKEN` is
  not set in the current shell. See pre-flight step 4.
- **Step 12 or 13 file not found:** The template files are created by `pac pages download`.
  If only one template file exists (not both), only the one that exists needs editing —
  Power Pages sometimes creates only the root-level or only the site-specific one.

## Notes

- After this workflow completes, all subsequent deploys use `/ppcs-deploy`.
- Flow GUIDs and table permissions are site-specific — set those up separately
  via `/ppcs-register-flow` and `/ppcs-enable-web-api` after provisioning.
- Trial environments: convert to production after provisioning via PPAC →
  Manage → Power Pages → site → **Convert to production**.
