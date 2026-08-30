# ppcs-promote-to-env Reference

## Environment URL Table

| Environment | URL Pattern | Notes |
|-------------|-------------|-------|
| Dev | `https://org229c958d.crm4.dynamics.com/` | Default target for `npm run deploy` |
| Stage | Set in `PP_ENVIRONMENT_URL` (stage) GitHub secret | Update before use |
| Prod | Set in `PP_ENVIRONMENT_URL` (prod) GitHub secret | Requires explicit confirmation |

Update this table with actual org URLs after promoting to each environment.

---

## Solution Component Type Picker — Locations in make.powerapps.com

To find orphaned components not yet in the solution:

1. Open make.powerapps.com → select **Dev** environment
2. Click **Solutions** → open your solution
3. Click **Add existing** → select component type:

| Component Type | Where to look | Sort by |
|----------------|--------------|---------|
| Site Settings | Add existing → Site Settings | "Site" column |
| Page Templates | Add existing → Other → Page template | "Website" column |
| Web Roles | Add existing → Other → Web role | "Website" column |
| Table Permissions | Add existing → Other → Table permission | "Website" column |
| Content Snippets | Add existing → Other → Content snippet | "Website" column |
| Cloud Flows | Add existing → Automation → Cloud flow | Solution flows only |

**Rule:** Any component that exists in Dev but isn't in the solution will not
transfer via the Pipeline to Stage/Prod.

---

## First-Time vs Subsequent Promotion

### First time to a new environment

1. Import solution via Power Platform Pipeline (or manual `pac solution import`)
2. Verify site appears in `pac pages list -v` for target env
3. If site is inactive → Power Pages home (target) → Inactive Sites → Reactivate
4. `pac auth create --environment <target-url>`
5. `npm run build`
6. `pac pages upload-code-site --rootPath .`
7. Convert Trial to Production (PPAC → Manage → Power Pages → Convert)
8. Set site visibility (Power Pages home → Edit → Security → Site visibility)
9. Re-register all cloud flows in Studio for the target site, then update the
   environment-specific GUIDs in `src/config/flows.ts` — and, if the OTP auth
   module is enabled, in `src/modules/otp-auth/otpFlows.ts`
   (`createOtp` / `checkOtp` / `getPortalConfig`)

### Subsequent promotions (config + code changes)

1. Trigger Pipeline (solution import handles config changes)
2. Wait for Pipeline to complete
3. `pac auth create --environment <target-url>` (or `pac auth select --index <n>`)
4. `npm run build`
5. `pac pages upload-code-site --rootPath .`
6. `pac auth select --index 1` (restore Dev)

### Code-only changes (no config changes)

Skip the Pipeline entirely:
1. `pac auth create --environment <target-url>`
2. `npm run build`
3. `pac pages upload-code-site --rootPath .`
4. `pac auth select --index 1`

---

## Deletion Tracking (ALM Critical)

Deleting a Dataverse record in Dev does not automatically delete it in Stage/Prod.
To propagate deletions, follow these steps before committing:

1. Download current state:
   ```
   pac pages download --path "./.powerpages-site" --webSiteId <GUID> --modelVersion 2
   ```
2. Delete the record in the source environment (Studio or Portal Management)
3. Download again with overwrite:
   ```
   pac pages download --path "./.powerpages-site" --webSiteId <GUID> --modelVersion 2 -o
   ```
4. Commit `manifest.yml` — it now records the deletion
5. Run `pac pages upload-code-site --rootPath .` to target env — deletion propagates

---

## CI/CD Multi-Environment GitHub Actions

The `deploy.yml` workflow uses `environment: development` for the Dev deploy.
To add Stage and Prod jobs:

```yaml
deploy-stage:
  needs: build
  runs-on: ubuntu-latest
  environment: stage                    # create this environment in GitHub repo settings
  steps:
    - uses: actions/checkout@v4
    - uses: actions/download-artifact@v4
      with: { name: dist, path: dist }
    - run: dotnet tool install --global Microsoft.PowerApps.CLI.Tool
    - run: pac auth create --environment ${{ vars.PP_ENVIRONMENT_URL_STAGE }}
             --applicationId ${{ secrets.AZURE_CLIENT_ID }}
             --clientSecret ${{ secrets.AZURE_CLIENT_SECRET }}
             --tenant ${{ secrets.AZURE_TENANT_ID }}
    - run: pac pages upload-code-site --rootPath "."
```

Required GitHub environment secrets/variables per environment:
- `PP_ENVIRONMENT_URL_STAGE` (variable) — Stage org URL
- `PP_ENVIRONMENT_URL_PROD` (variable) — Prod org URL
- Shared secrets: `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`
  (use env-specific service principals if different orgs have different AAD tenants)
- **No npm secret.** `@smkbacil/design-ui` is vendored as a committed tarball and resolved with a
  `file:` spec, so `npm ci` authenticates to nothing — in this repo, a fork, or any target
  environment's workflow. Do not add an `NPM_TOKEN` secret; nothing reads it. (Earlier versions of
  this starter did require one, and every consuming repo went red whenever the org-wide token
  expired. That is the failure vendoring removed.)

Note: `pac pages upload-code-site` (PAC CLI 2.8.1) supports only `--rootPath`,
`--compiledPath`, and `--siteName` — there is no `--deploymentProfile` or
`--forceUploadAll` flag on this command.
