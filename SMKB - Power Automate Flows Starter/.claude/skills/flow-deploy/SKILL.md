---
name: Cloud Flows — Deploy
description: >-
  Deploys the Cloud Flows solution to SMKB-Apps-Dev: runs flow-lint, then deploy.ps1,
  then confirms the running definition actually changed (looks for "deactivated and
  replaced") and reminds to turn on a newly-imported Inactive flow.
when_to_use: >-
  User says "deploy flows", "deploy the cloud flows", "push the flows", or wants to
  import the Cloud Flows solution.
disable-model-invocation: true
allowed-tools: Read Bash(powershell *) Bash(node *) Grep
---

## Context

Two quiet failure modes make flow deploys deceptive. **Draft vs Published:** an import can update the *draft*
definition while the *Published* (running) one is unchanged — so the deploy "succeeds" but nothing actually
changed; the proof is the line **`The original workflow definition has been deactivated and replaced.`** in
the output. **First-import-is-Inactive:** a newly-imported flow lands **disabled** and must be turned on once
in the portal. `deploy.ps1` runs flow-lint (errors block) and imports with `--force-overwrite`. See the
[README](../../../README.md) "Deploy Behavior: Draft vs Published".

## Steps

1. Lint first (errors block the deploy anyway; catch them early):
   ```powershell
   node ".\tools\flow-lint\lint.mjs"
   ```
2. Deploy to SMKB-Apps-Dev:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\deploy.ps1
   ```
3. **Confirm the running definition changed** — scan the deploy output for:
   `The original workflow definition has been deactivated and replaced.`
   If that line is **absent** for a flow you edited, the Published definition did not update — force a
   round-trip (toggle the trigger `kind` / re-save) and redeploy, per the README.
4. Developer: for any **newly added** flow, turn it on once (Power Automate → Solutions → your solution →
   Cloud Flows → open → confirm connection references → **Turn on**). Trigger-schema changes also deactivate
   a flow on re-import — turn it back on.

## Error Handling

- **flow-lint errors:** fix by rule id (use `/flow-add` guidance / `tools/flow-lint/README.md`) — e.g. `connection-runtime-embedded`, `authenticated-flow-validates-token`, `http-uri-encodes-client-input`.
- **"component not declared … root component":** the three-file registration is incomplete — see `/flow-add` (JSON + Customizations.xml + Solution.xml must share the workflowEntityId).
- **Deploy says success but behavior unchanged:** the "deactivated and replaced" line was missing — the Published definition wasn't updated (Step 3).
- **Recurring 403:** a connection is `"invoker"` not `"embedded"` — fix in the flow JSON.

## Notes

- Flows deploy **after** Tables + Env Vars (they reference them). Full sequence: `/deploy-solution`.
- SMKB-Apps-Dev only; Stage/Prod via pipeline. Authoring a flow is `/flow-add`.
