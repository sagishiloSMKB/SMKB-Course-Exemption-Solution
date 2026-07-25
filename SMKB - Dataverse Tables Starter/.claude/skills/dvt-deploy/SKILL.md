---
name: Dataverse Tables — Deploy
description: >-
  Safely deploys the Tables solution to SMKB-Apps-Dev: runs guid-freshen.ps1 exactly
  once before the first deploy (respecting the .guid-freshened marker), checks for
  placeholders, then runs deploy.ps1.
when_to_use: >-
  User says "deploy tables", "deploy the Dataverse tables", "push the tables", or
  wants to import the Tables solution.
disable-model-invocation: true
allowed-tools: Read Bash(powershell *) Grep
---

## Context

The Tables deploy has one dangerous, stateful one-shot: **`guid-freshen.ps1` must run exactly once, before
the first import, and NEVER after** — the sentinel form/view GUIDs must be replaced with fresh ones (or
imports across projects collide with duplicate keys), but re-running after a live import regenerates GUIDs
that no longer match Dataverse and **breaks every form and view**. The script self-guards with a
`.guid-freshened` marker; this skill respects it. Then `deploy.ps1` enforces the SMKB-Apps-Dev-only guard +
a sentinel-GUID + placeholder scan. See the [README](../../../README.md) and
[`guid-freshen.ps1`](../../../guid-freshen.ps1).

## Steps

1. Check whether this is the first deploy:
   ```powershell
   Test-Path ".\.guid-freshened"
   ```
2. **If the marker does NOT exist (first deploy):** run guid-freshen once:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\guid-freshen.ps1
   ```
   It writes `.guid-freshened` and refuses to run again. **If the marker already exists, SKIP this step** —
   do not force it.
3. Confirm no template placeholders remain (deploy.ps1 also does this):
   ```powershell
   Select-String -Path ".\Entities\**\*.xml",".\Other\*.xml" -Pattern "smkb_sol_|YourSolutionName" -List
   ```
   Any hit → finish renaming with `/dvt-add-table` before deploying.
4. Deploy to SMKB-Apps-Dev:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\deploy.ps1
   ```
5. Developer: verify the tables in make.powerapps.com → **Dataverse → Tables**.

## Error Handling

- **guid-freshen refuses (marker exists):** correct — it's already been run. Do **not** delete the marker unless you are rebuilding from scratch with **no live records** in Dataverse (then: delete the marker, delete the imported solution, re-run).
- **Import "Cannot insert duplicate key":** a form/view GUID collides — a new table was cloned without fresh GUIDs (`/dvt-add-table` Step 4), or guid-freshen never ran on the first deploy.
- **Deploy guard blocks on `smkb_sol_` / sentinel GUID:** an un-renamed placeholder — resolve it, don't bypass the guard.
- **Wrong environment error:** the active `pac auth` profile doesn't target Dev (`pac auth list`).

## Notes

- guid-freshen is a **one-shot** — the marker is your friend; never re-run against a deployed solution.
- Deploy order matters solution-wide: Tables deploy **first** (flows/apps depend on them). Full sequence: `/deploy-solution`.
