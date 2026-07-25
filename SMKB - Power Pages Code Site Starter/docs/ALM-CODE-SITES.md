# ALM for Power Pages SPA Code Sites

Everything learned from live debugging and Microsoft documentation about how Application
Lifecycle Management (ALM) works for **Power Pages Code Sites** (Single Page Application /
Model A sites). Applies to this project and the SMKB Vue starter template.

---

## SMKB Environment URLs

| Environment | URL |
|---|---|
| Dev | `https://org229c958d.crm4.dynamics.com/` |
| Stage | `https://smkb-apps-stage.crm4.dynamics.com/` |
| Prod | `https://skmb-apps-prod.crm4.dynamics.com/` |

> Per CLAUDE.md policy: always deploy to Dev by default. Promotion to Stage or Prod
> requires an explicit user request — raise a concern and confirm before proceeding.

---

## The Core Concept: Two-Track Deployment

A Code Site has two completely independent layers that must be deployed separately to
every environment. Neither track carries the other automatically.

| Track | What it contains | How it moves |
|---|---|---|
| **Solution track** | Site settings, page templates, web roles, table permissions, cloud flow registrations, content snippets | Power Platform Pipelines or manual solution export/import |
| **SPA assets track** | Compiled JS/CSS bundles (`dist/`), public assets (images, fonts, icons) as Dataverse Web File records | `pac pages upload-code-site` — must run per environment |

This is by design, not a limitation. Microsoft's own Power Pages plugin for Claude Code
is built around this same two-track model.

---

## Why Power Platform Pipelines Alone Cause a 500 Error

When you promote a Code Site solution to a new environment via a Power Platform Pipeline:

- Page templates, site settings, web roles arrive in the target environment
- Site is created (or updated) as a Code Site with `Single Page Application: Yes`
- `index.js`, `vue.js`, `index.css`, images, fonts — **none of these transfer**

Power Pages finds the configuration shell but no content to serve — HTTP 500
"Something went wrong".

**Fix:** run `pac pages upload-code-site` against the target environment after the
pipeline completes.

---

## Correct Command Syntax

### `pac pages upload-code-site`

```powershell
pac pages upload-code-site --rootPath .
```

**Supported flags (PAC CLI v2.8.1):**

| Flag | Description |
|---|---|
| `--rootPath` / `-rp` | Root of the project (where `powerpages.config.json` is) |
| `--compiledPath` / `-cp` | Custom location of compiled output (defaults to `compiledPath` in config) |
| `--siteName` / `-sn` | Override site name (defaults to `siteName` in `powerpages.config.json`) |

> **`--deploymentProfile` and `--forceUploadAll` do NOT exist on this command.**
> Those flags belong to `pac pages upload` (the traditional portal command) — they
> throw "unknown argument" errors on `upload-code-site`. The target environment is
> controlled entirely by which PAC auth profile is active.

### Authenticate to a Specific Environment

```powershell
# Interactive (browser login) — for local developer machines
pac auth create --environment "https://<org>.crm4.dynamics.com/"

# Service principal — for CI/CD (no browser)
pac auth create \
  --environment    "https://<org>.crm4.dynamics.com/" \
  --applicationId  "<client-id>" \
  --clientSecret   "<client-secret>" \
  --tenant         "<tenant-id>"
```

### Switch Between Auth Profiles

```powershell
pac auth list                  # see all profiles with their index numbers
pac auth select --index 1      # switch active profile by index
```

---

## Per-Environment Deployment Workflow

### Initial Setup for a New Environment (e.g. first time to stage)

> **Before running the Pipeline for the first time:** verify the solution contains all
> site components — see [Before Promoting — Verify Complete Solution Coverage](#before-promoting--verify-complete-solution-coverage)
> below. Missing components won't transfer and will cause errors on the target environment.

1. **Promote solution** via Power Platform Pipeline — wait for completion
2. **Authenticate and verify site state:**
   ```powershell
   pac auth create --environment "https://smkb-apps-stage.crm4.dynamics.com/"
   pac pages list -v
   # Confirm: Single Page Application: Yes, Is Site Active: Yes
   ```
3. **If site is Inactive:** go to Power Pages home → switch to target environment →
   **Inactive Sites** → **Reactivate** → wait 2–3 min
4. **Upload SPA assets:**
   ```powershell
   pac pages upload-code-site --rootPath .
   ```
5. **Re-register cloud flows and update GUIDs** — flows do **not** auto-register on
   solution import:
   - Power Pages Studio (target env) → **Set up → Cloud flows → + Add cloud flow** →
     select each promoted flow → re-assign web roles
   - Update the new environment's GUIDs in `src/config/flows.ts` and, if the OTP auth
     module is enabled, in `src/modules/otp-auth/otpFlows.ts`
   - Redeploy (`pac pages upload-code-site --rootPath .`) so the SPA bundle carries the
     new GUIDs
6. **Convert to production** (first time only — new sites start as Trial):
   - [Power Platform Admin Center](https://admin.powerplatform.microsoft.com) →
     **Manage → Power Pages** → select the site → **Convert to production**
   - Wait 2–5 minutes for provisioning to complete
7. **Set site visibility:**
   - Power Pages home → switch to target environment → find site → **Edit** →
     **Security → Site visibility** → set as appropriate:
     - Stage: **Public** if external testers need access without portal permissions; Private otherwise
     - Prod: always **Public**
8. **Switch back to dev:**
   ```powershell
   pac auth select --index 1
   ```

### Subsequent Deploys (code changes only, no config changes)

```powershell
# 1. Build
npm run build

# 2. Authenticate to target environment
pac auth create --environment "https://<target-org>.crm4.dynamics.com/"

# 3. Upload
pac pages upload-code-site --rootPath .

# 4. Switch back to dev
pac auth select --index 1
```

> If both code AND config changed (new site settings, table permissions, web roles):
> run the Power Platform Pipeline first, then run the upload.

---

## Before Promoting — Verify Complete Solution Coverage

Power Pages creates site components (site settings, page templates, web roles, table
permissions, content snippets, cloud flow registrations) in Dataverse when you configure
them, but it does **not** always add them to the active solution automatically. Components
that exist in Dataverse but are not in the solution will not transfer to the target
environment when the Pipeline runs — the pipeline succeeds, but the target site is missing
config and behaves incorrectly.

This is most likely to cause problems on the **first** dev-to-stage promotion. Subsequent
promotions are safer once the solution is known-complete.

### How to check and fix before promoting

1. Open [make.powerapps.com](https://make.powerapps.com) → switch to the **Dev**
   environment → open your solution
2. Click **Add existing** → browse the component types below
3. For each component type, sort the picker list by the **Site** column and look for
   components belonging to your site that are not yet in the solution
   _(components already in the solution are hidden from the picker — an empty list means
   you're complete for that type)_
4. Select all orphaned components → **Add**

**Component types to check:**

| Type | Where in "Add existing" |
|---|---|
| Site settings | **More → Other → Site Setting** |
| Page templates | **More → Other → Page Template** |
| Web roles | **More → Other → Web Role** |
| Table permissions | **More → Other → Table Permission** |
| Content snippets | **More → Other → Content Snippet** |
| Cloud flow registrations | **More → Other → Cloud Flow** |

5. Once the solution is complete, run the Power Platform Pipeline

---

## Deployment Profiles (`deployment-profiles/*.yml`)

Deployment profiles define **environment-specific site setting values** — they override
Dataverse record field values at upload time. They do **not** control which environment
is targeted (that is `pac auth`).

```yaml
# .powerpages-site/deployment-profiles/stage.deployment.yml
adx_sitesetting:
  - adx_sitesettingid: <GUID>
    adx_name: Authentication/OpenAuth/AzureAD/ClientId
    adx_value: ${OS.STAGE_AZURE_AD_CLIENT_ID}   # reads from OS env var at upload time
```

> As of PAC CLI v2.8.1, `--deploymentProfile` is NOT a valid flag for
> `pac pages upload-code-site`. Deployment profiles may be applied through the Power
> Pages plugin's deploy-pipeline skill or a future CLI update. For now,
> environment-specific overrides must be handled through separate site settings records
> per environment or the Power Platform Pipeline variable substitution.

---

## CI/CD with GitHub Actions

### The Deploy Step (Correct)

The target environment is set by `pac auth create`, not by any upload flag:

```yaml
- name: Authenticate PAC CLI
  run: |
    pac auth create \
      --environment "${{ vars.PP_ENVIRONMENT_URL }}" \
      --applicationId "${{ secrets.AZURE_CLIENT_ID }}" \
      --clientSecret  "${{ secrets.AZURE_CLIENT_SECRET }}" \
      --tenant        "${{ secrets.AZURE_TENANT_ID }}"

- name: Upload Code Site
  run: |
    pac pages upload-code-site \
      --rootPath "."
# --deploymentProfile is NOT a valid flag here — do not add it
```

### Adding a Stage Deployment Job

Add a new job to `.github/workflows/deploy.yml`. The only differences from the dev job
are the GitHub environment name and the `PP_ENVIRONMENT_URL` variable value:

```yaml
  deploy-stage:
    name: Deploy to SMKB Apps Stage
    needs: build
    runs-on: ubuntu-latest
    environment: stage
    if: github.ref == 'refs/heads/stage' || github.event_name == 'workflow_dispatch'

    steps:
      - uses: actions/checkout@v4

      - name: Download dist artifact
        uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - name: Install PAC CLI
        run: |
          dotnet tool install --global Microsoft.PowerApps.CLI.Tool
          echo "$HOME/.dotnet/tools" >> $GITHUB_PATH

      - name: Authenticate PAC CLI to Stage
        run: |
          pac auth create \
            --environment "${{ vars.PP_ENVIRONMENT_URL }}" \
            --applicationId "${{ secrets.AZURE_CLIENT_ID }}" \
            --clientSecret  "${{ secrets.AZURE_CLIENT_SECRET }}" \
            --tenant        "${{ secrets.AZURE_TENANT_ID }}"

      - name: Upload Code Site to Stage
        run: |
          pac pages upload-code-site \
            --rootPath "."

# GitHub environment "stage" requires:
#   vars.PP_ENVIRONMENT_URL   https://smkb-apps-stage.crm4.dynamics.com/
#   secrets.AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID
```

> **NPM_TOKEN:** the build job's `npm ci` needs the repo-level `NPM_TOKEN` secret
> (npm read token for the `@smkbacil` scope). If the target environment's deploy runs
> in a separate repo or fork, set `NPM_TOKEN` there too.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| HTTP 500 "Something went wrong" on a promoted site | `pac pages upload-code-site` was never run against the target environment — config arrived, assets did not | `pac auth create --environment <target>` then `pac pages upload-code-site --rootPath .` |
| "Unknown argument --deploymentProfile" | Passing `--deploymentProfile` to `upload-code-site` — that flag only exists on the older `pac pages upload` command | Remove the flag; target environment is set by `pac auth` |
| Site appears under Inactive Sites after solution import | Normal after Pipeline import — Power Pages doesn't auto-activate | Power Pages home → target environment → **Inactive Sites** → **Reactivate** → wait 2–3 min |
| `pac pages list -v` shows `Single Page Application: No` | Site not promoted as a Code Site; SPA flag didn't transfer | Re-run solution import or verify site type in Power Pages Studio |
| `.js` uploads blocked (403) | Fresh Dataverse environments block `.js` uploads by default | PPAC → target environment → Settings → Product → Features → **Blocked Attachments** → remove `js` |
| Pipeline succeeds but target site has missing features or config errors (not a 500) | Some site components exist in Dev but were never added to the solution — they don't transfer via Pipeline | In Dev: solution → **Add existing** → check each component type, sort by Site, add all missing components → re-run Pipeline |

---

## ALM Flow Summary

```
+-------------------------------------------------------+
|  Developer has changes to deploy                      |
+----------------------+--------------------------------+
                       |
           +-----------+-----------+
           |                       |
           v                       v
   Config changed?           Code changed?
   (site settings,           (Vue app, CSS,
    web roles, etc.)          assets, images)
           |                       |
           v                       v
   Power Platform           pac pages
   Pipeline                 upload-code-site
   (solution import)        --rootPath .
           |                       |
           +-----------+-----------+
                       |
         Both must complete for a working deployment.
         Running only one track leaves the site broken.
```

---

## Resources

| Resource | URL |
|---|---|
| Create and deploy a Code Site | https://learn.microsoft.com/en-us/power-pages/configure/create-code-sites |
| Power Pages ALM overview | https://learn.microsoft.com/en-us/power-pages/configure/portals-alm |
| PAC CLI for Power Pages | https://learn.microsoft.com/en-us/power-pages/configure/power-platform-cli |
| Power Pages plugin for Claude Code | https://learn.microsoft.com/en-us/power-pages/configure/create-code-site-using-claude-code |
| Power Platform Pipelines overview | https://learn.microsoft.com/en-us/power-platform/alm/pipelines |
| PAC CLI reference: pages | https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/pages |
| Use solutions with Power Pages | https://learn.microsoft.com/en-us/power-pages/configure/power-pages-solutions |
| Reactivate a Power Pages site | https://learn.microsoft.com/en-us/power-pages/admin/reactivate-website |
