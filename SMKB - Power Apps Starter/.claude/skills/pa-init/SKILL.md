---
name: Power Apps — Init App Record
description: >-
  Creates the Power Apps Code App record before the first deploy: deletes
  power.config.json, runs pac code init in-folder, fills deploy.config.json
  (targetEnv + non-empty allowedEnvs), and re-runs the root apply-config.
when_to_use: >-
  User says "init the app", "create the app record", "first deploy of the Power App",
  "pac code init", or the deploy fails because no app record exists.
disable-model-invocation: true
argument-hint: "<environment-url> \"<App Display Name>\""
arguments: [environment-url, app-display-name]
allowed-tools: Read Edit Bash(pac *) Bash(powershell *)
---

## Context

`pac code init` **creates** the app record; `pnpm pa push` (in `deploy.ps1`) only **updates** it — there is
no "New Code App" button in the portal, so the very first deploy fails until the record exists. Two gotchas:
`pac code init` has **no `--path` flag** (run it from inside the app folder), and `deploy.config.json` ships
with an **empty `allowedEnvs`** which hard-blocks the deploy until you add your Dev URL. After init, `appId`
in `power.config.json` is `null` — expected; it's filled on the first push. See the [README](../../../README.md)
Step 3 and [INIT_PROJECT.md](../../../../INIT_PROJECT.md) Phase 5.3 (the note) / handoff H6 at Phase 8.6.

## Steps

1. Confirm the active auth targets your environment:
   ```powershell
   pac auth list
   ```
2. Delete any existing `power.config.json` so init starts clean, then init **from inside this folder**:
   ```powershell
   Remove-Item power.config.json -ErrorAction SilentlyContinue
   pac code init --environment "<environment-url>" --displayName "<App Display Name>"
   ```
   (`appId: null` afterwards is expected.)
3. Fill `deploy.config.json`:
   - `targetEnv` = your Dev environment URL
   - `allowedEnvs` = `["<your Dev URL>"]` — **must be non-empty** or the deploy is blocked (Stage/Prod are pipeline-only, never listed here)
   - `solutionName` = the solution unique name to link the app to, or `""` for standalone
4. Re-run the root apply-config so the app display name / environment stay in sync with `solution.config.json`:
   ```powershell
   powershell -ExecutionPolicy Bypass -File ..\apply-config.ps1
   ```
5. **PAUSE** — the app record now exists; deploy with `deploy.ps1` (or `/deploy-solution`).

## Error Handling

- **`pac code init` error about `--path`:** there is no `--path` flag — run it from inside the app folder.
- **Deploy blocked "target not in allowedEnvs":** `allowedEnvs` is empty — add your Dev URL (Step 3).
- **`appId` is null:** expected after init; it populates on the first `pnpm pa push`.
- **Wrong environment:** `pac auth list` shows the active profile — select the Dev one before init (`pac auth select`).

## Notes

- Run this **once** per app, before the first deploy. Subsequent deploys just run `deploy.ps1`.
- Never list a Stage/Prod URL in `allowedEnvs` — those are promoted via pipeline.
- Wiring flows into the app is `/pa-add-flow`.
