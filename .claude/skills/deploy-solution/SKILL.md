---
name: SMKB Solution — Deploy (ordered)
description: >-
  Deploys every activated starter to SMKB-Apps-Dev in the correct order (Tables ->
  Env Vars -> Flows -> Power Apps -> Power Pages), one at a time, running each
  starter's own deploy, logging each outcome, and pausing for the manual portal steps.
when_to_use: >-
  User says "deploy the solution", "deploy everything", "deploy all starters", "run
  the deploys", or is at Init Project Step 10b.
disable-model-invocation: true
allowed-tools: Read Edit Bash(powershell *) Bash(npm *) Bash(node *)
---

## Context

Deployment **order is load-bearing** (Critical Rule 4): flows reference tables + env vars, and the apps
reference flows — so Tables → Env Vars → Flows → Power Apps → Power Pages, **one at a time**, never proceeding
until the current one is confirmed. This skill also enforces the two things routinely skipped: the **manual
portal handoffs** (set env-var values, confirm connection references, turn flows on) and the **mandatory
outcome log** (`10b.F`) appended to [`STARTER_AGENT_FEEDBACK_AND_NOTES.md`](../../../STARTER_AGENT_FEEDBACK_AND_NOTES.md)
after each starter. All deploys target **SMKB-Apps-Dev only**; Stage/Prod go through the pipeline. See
[INIT_PROJECT.md](../../../INIT_PROJECT.md) Step 10b and CLAUDE.md Critical Rule 4.

## Steps

1. Run `/pre-deploy-verify` first (config drift + doc boundaries + placeholder guards). Do not deploy if it fails.
2. For **each activated** starter, in this order — skip any not activated:

   **① Dataverse Tables** → invoke `/dvt-deploy` (runs `guid-freshen.ps1` once, then `deploy.ps1`).
   Developer: verify tables in make.powerapps.com → Dataverse → Tables. **Log 10b.F.**

   **② Environmental Variables** → run its `deploy.ps1`. **PAUSE** — developer sets each variable's runtime
   **value** (Maker → Solutions → your solution → Environment Variables → Edit → Add current value); Secret
   vars get a Key Vault reference. **Log 10b.F.**

   **③ Cloud Flows** → invoke `/flow-deploy`. **PAUSE** — developer opens each flow (Power Automate →
   Solutions → your solution → Cloud Flows), confirms connection references, Saves, and **turns it on**
   (flows import disabled). **Log 10b.F.**

   **④ Power Apps** → run `/pa-init` first if no app record exists, then its `deploy.ps1`. Developer: confirm
   the app appears in the environment. **Log 10b.F.**

   **⑤ Power Pages Code Site** → drive its own skills: `/ppcs-provision-site` (first time) → `/ppcs-register-flow`
   per flow → `/ppcs-deploy`. Developer: open the site URL. **Log 10b.F.**

3. After each starter, append a dated `10b.F` entry to `STARTER_AGENT_FEEDBACK_AND_NOTES.md`: did the deploy
   complete cleanly? were components visible? any guard false-positives or unclear instructions? **This log is mandatory.**

## Error Handling

- **A deploy guard blocks:** resolve the placeholder it names (never bypass) — usually an un-renamed `smkb_sol_` token or a missing app record / GUID. Fix, re-run that starter, then continue.
- **A starter fails mid-order:** stop. Do not deploy the next starter until the current one is fixed and confirmed (later starters depend on it).
- **Wrong environment:** every `deploy.ps1` hard-codes the Dev URL and blocks other targets — if a script complains about the target, the active `pac auth` profile is wrong (`pac auth list`; see CLAUDE.md PAC note).

## Notes

- Never pass a Stage/Prod URL to any deploy script — those environments are pipeline-only.
- Each starter owns its deploy mechanics; this skill only sequences them and enforces the handoffs + logging.
- Pre-flight only: `/pre-deploy-verify`. Per-starter deploys: `/dvt-deploy`, `/flow-deploy`, `/pa-init`, and the `/ppcs-*` skills.
