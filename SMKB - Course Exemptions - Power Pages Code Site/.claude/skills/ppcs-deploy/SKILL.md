---
name: Power Pages Code Site — Deploy
description: >-
  Pre-flight validated deploy for a Power Pages Code Site: checks bundleFilePatterns
  vs manualChunks sync, no lazy route imports, no unreplaced placeholder sentinels,
  active pac auth profile targets Dev, lint + test + TypeScript clean — then runs
  npm run deploy and reconciles the site + its components into the Dataverse solution.
when_to_use: >-
  User says "deploy", "push to Power Pages", "upload", "publish", "redeploy".
  Not for first-ever deploy — use /ppcs-provision-site instead.
disable-model-invocation: true
allowed-tools: Bash(pac auth list) Bash(npm run lint) Bash(npm run test) Bash(npm run build) Bash(npm run upload) Bash(npm run solution:sync) Bash(npm run solution:check) Read Grep
---

## Context

Two silent failures can pass `npm run build` yet break the site at runtime:

1. **bundleFilePatterns drift** — a new `manualChunks` entry in `vite.config.ts`
   without a matching entry in `powerpages.config.json` causes PAC CLI to leave
   the old chunk as a stale Dataverse Web File record, which may be served
   instead of the new file.

2. **Lazy route import** — `() => import('../views/Foo.vue')` causes Vite to
   emit a separate dynamic chunk not listed in `bundleFilePatterns`. Power Pages
   serves `index.html` for any unlisted file, producing a MIME-type error at
   runtime. Vite does NOT warn about this.

This skill catches both before bytes are pushed to Power Pages.

Current config state (injected at invocation):
```
!`powershell -Command "Get-Content powerpages.config.json | ConvertFrom-Json | ConvertTo-Json"`
```

## Steps

### Pre-flight Checks (stop at first failure)

1. **CHANGEME placeholder check.**
   Grep `src/config/solution.ts` for `CHANGEME`. If any match is found → **STOP.**
   Ask the user to fill in the real `prefix`, `siteName`, `appName`, and
   `documentTitle` values in `src/config/solution.ts` before deploying.

1b. **Site-name convention check.**
   Read `SOLUTION.prefix` from `src/config/solution.ts` and `siteName` from
   `powerpages.config.json`. The config `siteName` must begin with
   `<PREFIX.toUpperCase()> - ` (e.g. prefix `evt` → starts with `EVT - `) — the
   naming convention every site from this starter follows. If it does not (still
   `MY-SITE-NAME`, or the prefix drifted from `solution.ts`) → **STOP** and tell the
   user to re-run `/ppcs-provision-site` step 3, or fix `siteName` to
   `<PREFIX> - <name>`. (A Power-Pages-appended URL slug after the base name is fine.)

2. **bundleFilePatterns sync check.**
   Read `vite.config.ts` and extract all `manualChunks` keys.
   Expected `bundleFilePatterns` entries for each key: `assets/<key>.js`
   Also expect `assets/index.js` and `assets/index.css` (the entry point).
   Read `powerpages.config.json` and extract the `bundleFilePatterns` array.
   Compare the two lists:
   - If any manualChunks key is missing from bundleFilePatterns → **STOP.**
     Show the exact missing entry and instruct the user to add it to
     `powerpages.config.json` before deploying.
   - If any bundleFilePatterns entry has no corresponding chunk → warn (stale
     entry, harmless but worth cleaning up).

3. **Lazy import scan.**
   Grep `src/router/index.ts` for `() => import`:
   ```
   grep -n "() => import" src/router/index.ts
   ```
   If any match is found → **STOP.** Show the matching lines and explain:
   > Dynamic imports create separate chunk files that Power Pages will serve as
   > `index.html`. Change to a direct import:
   > `import MyView from '../views/MyView.vue'`

4. **Auth profile check.**
   Run `pac auth list`. Identify the active profile (marked with `*`).
   If the active profile's environment URL contains `stage`, `prod`, or any
   non-Dev URL → warn:
   > The active PAC auth profile targets a non-Dev environment. Deploying will
   > push to that environment. Switch to Dev with `pac auth select --index <n>`
   > or confirm you intend to deploy to that environment.
   Ask the user to confirm before continuing.

5. **Quality gates.**
   `npm run deploy` runs `npm run lint && npm run test && npm run build`
   before uploading. Run the gates individually so failures are isolated:
   - Run `npm run lint`. If it fails → **STOP.** Show the error output.
   - Run `npm run test`. If it fails → **STOP.** Show the failing tests.
   - Run `npm run build`. If it fails → **STOP.** Show the TypeScript errors.
   - If all succeed → continue (the `dist/` output is now ready).

### Deploy

6. Upload to Power Pages — go through the wrapper, **not** a raw `pac` call:
   ```
   npm run upload
   ```
   (`npm run deploy` already chains this.) The wrapper is
   `scripts/upload-code-site.ps1`, and it exists because **pac returns exit code 0 even when the
   operation failed** — a raw `pac pages upload-code-site` in an npm `&&` chain would fall straight
   through to the reconcile and report a successful deploy having shipped nothing. The wrapper parses
   stdout and exits 1 on any error signal.

   A clean run means "pac reported no error" — it is not proof the assets landed. Step 9's browser
   check is what proves that.

7. **Reconcile the site into the solution — part of the deploy, not an afterthought.**
   ```
   powershell -ExecutionPolicy Bypass -File scripts/add-site-to-solution.ps1
   ```
   `npm run deploy` already chains this as `npm run solution:sync`; run it explicitly only if
   you uploaded with a raw `pac pages upload-code-site`.

   Why it must run every time: `upload-code-site` creates the site and its components as loose
   Dataverse records. **Solution membership is a separate act that nothing else performs.** A
   Power Platform Pipeline promotes only what the solution contains, so a component left out
   means the pipeline *succeeds* and the target site is quietly misconfigured. Any deploy that
   adds a site setting, web role, page template or CSP edit creates new components — which is
   exactly why this belongs in the deploy rather than a checklist someone remembers.

   The script diffs and adds only what is missing, so a clean site costs two queries and no
   writes. Expected output on a healthy site:
   ```
   Site record : in the solution
   Solution is complete - nothing to add.
   ```
   If it reports additions, that is normal after a config change — not an error.

   **Web Files are included** (`-WebFiles All`, the default) — every component belonging to the
   site goes in the solution. Excluding them as "build output the uploader delivers anyway" was
   tried and lost 5 real components: the theme assets Power Pages creates at provisioning
   (`bootstrap.min.css`, `theme.css`, `portalbasictheme.css`, and two images) exist in `dist/`
   nowhere, so nothing would ever deliver them to Stage or Prod. `-WebFiles NonBuildOutput|None`
   exist for a strict two-track setup; they are opt-outs, not the default.

8. Report the site URL from `powerpages.config.json` (`siteName` field).
   The `cache-buster` plugin in `vite.config.ts` stamps `?v=<buildTimestamp>`
   on asset URLs in `index.html` and on cross-chunk imports, so browsers and
   the CDN pick up fresh chunks after a normal deploy. If changes still don't
   appear, a hard refresh (`Ctrl+Shift+R`) remains the fallback.

## Error Handling

- **403 on .js upload:** Blocked Attachments in Dataverse. See
  `provision-reference.md` for the PPAC fix.
- **siteName not found:** The `siteName` in `powerpages.config.json` doesn't
  match the Power Pages site. Run `pac pages list -v` to find the exact
  FriendlyName and update the config.
- **Build fails with "noUnusedLocals":** Prefix unused variables with `_`
  (e.g. `_unusedVar`) to suppress the TypeScript error.
- **Lint fails with no-restricted-syntax (fetch/XHR/WebSocket):** The SPA is
  flows-only — route the call through `invokeFlow()` from
  `src/services/cloudFlow.ts` instead of raw `fetch`.

## Notes

For the **first-ever deploy** of a new site, use `/ppcs-provision-site` instead.
This skill assumes the site already exists and was previously deployed.

Stale-cache issues after a deploy are normally handled by the `cache-buster`
plugin in `vite.config.ts` (`?v=<buildTimestamp>` on index.html asset URLs and
cross-chunk imports). If the live site still doesn't reflect changes, purge the
cache: Power Platform Admin Center → Manage → Power Pages → site → **Restart site**.
