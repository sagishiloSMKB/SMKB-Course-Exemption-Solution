---
name: Power Pages Code Site — Promote to Environment (ALM)
description: >-
  Two-track ALM promotion for a Power Pages Code Site: verifies solution
  completeness, guides Pipeline run, uploads SPA assets to target env. Prevents
  the HTTP 500 caused by running Pipeline without upload-code-site.
when_to_use: >-
  User says "promote to stage", "promote to prod", "deploy to production",
  "ALM promotion", "release to stage", "release to prod", "promote the site".
argument-hint: "[stage|prod|environment-url]"
arguments: [target-env]
disable-model-invocation: true
allowed-tools: Bash(pac auth *) Bash(pac pages *) Bash(npm run build) Bash(pac pages upload-code-site *)
---

## Context

Power Pages Code Sites use a **two-track deployment model**:

- **Track 1 — Site configuration** (page templates, site settings, web roles,
  table permissions, cloud flows): moves via Power Platform Pipeline
  (solution import).
- **Track 2 — SPA assets** (compiled JS/CSS from `dist/`): moves via
  `pac pages upload-code-site`.

**Both tracks must complete.** Running the Pipeline alone leaves the site with
an HTTP 500 error — the config arrives but the SPA assets don't.

Current PAC auth state (injected at invocation):
```
!`pac auth list`
```

For environment URLs, solution checklist details, and first-time setup steps,
see [alm-reference.md](alm-reference.md).

## Steps

### Phase 1 — Solution Completeness Check

1. Determine the target environment. If `$target-env` is `stage` or `prod`,
   look up the URL in [alm-reference.md](alm-reference.md). If a full URL is
   provided, use it directly.

2. **PAUSE 1 — Solution Completeness.** Present this checklist and ask the
   user to verify each item before the Pipeline is run:
   ```
   In make.powerapps.com (Dev environment) → Solutions → [Your Solution]:
   □ Site Settings — all 8+ security settings + any custom ones visible
   □ Page Templates — Default-studio-template present
   □ Web Roles — Authenticated Users and Anonymous Users visible
   □ Table Permissions — all table permission records present
   □ Content Snippets — any custom snippets included
   □ Cloud Flows — all flows with "When Power Pages calls a flow" trigger included
   ```
   Instructions for finding orphaned components: make.powerapps.com → Dev
   → Solutions → Add existing → select component type → sort by **Site** column
   → look for rows matching your site that aren't already in the solution.

   Ask: "Has the solution been verified complete and the Pipeline run triggered?
   Reply 'yes' to continue."

3. **PAUSE 2 — Pipeline Completion.** Ask the user to confirm:
   "Has the Power Platform Pipeline completed successfully? Reply 'yes' to continue."

### Phase 2 — SPA Asset Upload (Track 2)

4. Authenticate to the target environment:
   ```
   pac auth create --environment "<target-env-url>"
   ```

5. Verify the site is active in the target environment:
   ```
   pac pages list -v
   ```
   Check that the site appears with `Single Page Application: Yes`.
   - If the site is not listed or shows `Single Page Application: No`:
     **PAUSE 3 (conditional)** — instruct the user to go to Power Pages home
     for the target environment → Inactive Sites → Reactivate, wait 2-3 minutes,
     then confirm when done.

6. Build the SPA (local, not affected by auth profile):
   ```
   npm run build
   ```
   If the build fails, stop and resolve TypeScript errors before continuing.

7. Upload SPA assets to the target environment:
   ```
   pac pages upload-code-site --rootPath .
   ```

### Phase 3 — Post-Upload Steps

8. **First-time to this environment only** — check whether this is the first
   promotion and prompt for these manual steps if so:
   - Convert Trial to Production: PPAC → Manage → Power Pages → site →
     **Convert to production**
   - Set site visibility: Power Pages home → Edit site → Security →
     Site visibility → **Public** (for external users) or **Private** (internal)

9. **Flow GUIDs are environment-specific.** After promoting, **every** cloud
   flow must be re-registered in the target site's Studio:
   Power Pages Studio (target env) → Set up → Cloud flows → remove old
   registration → Add cloud flow (re-register from solution).
   The flow GUIDs will change — update `src/config/flows.ts` with the new
   target-env GUIDs, AND (if the OTP auth module is enabled) update
   `src/modules/otp-auth/otpFlows.ts` (`createOtp`, `checkOtp`,
   `getPortalConfig`) as well.

10. **Target-environment CI needs no npm secret.** `@smkbacil/design-ui` is
    vendored as a committed tarball, so `npm ci` authenticates to nothing --
    in this repo, a fork, or any target environment's workflow.

11. **Restore Dev auth.**
    ```
    pac auth select --index 1
    ```
    (Replace `1` with the Dev profile index from `pac auth list`.)

12. Report success. Remind the user to verify the site in the target
    environment before closing.

## Error Handling

- **HTTP 500 after upload:** The Pipeline config and SPA assets may be
  version-mismatched. Verify that the Pipeline completed before the upload.
  If still failing, check that `usewebsiteheaderandfooter` and
  `ProfileRedirectEnabled` are correctly set in the target env (they come
  via the Pipeline — check the Pipeline run logs).
- **pac auth create fails:** Verify the target environment URL is correct
  and the service principal has System Administrator role in the target org.
- **Site not in Inactive Sites:** The solution import may not have created
  the site yet. Check the Pipeline run logs for import errors.
- **Flow 403 in target env:** The flow was not re-registered in Studio for
  the target site. See Step 9.

## Notes

`pac pages upload-code-site` (verified against PAC CLI 2.8.1) supports **only**
`--rootPath`, `--compiledPath`, and `--siteName`. `--deploymentProfile` and
`--forceUploadAll` do **not** exist on this command — do not suggest them.

Deployment profiles (`deployment-profiles/*.deployment.yml`) support
`${OS.VARIABLE_NAME}` substitution for environment-specific site setting
values. Set OS environment variables before running `pac pages upload-code-site`
to have them resolved.

See [alm-reference.md](alm-reference.md) for environment URLs, the solution
completeness checklist expanded, and the full first-time vs subsequent
workflow comparison.
