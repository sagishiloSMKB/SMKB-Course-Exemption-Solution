---
name: SMKB Solution — Pre-Deploy Verify
description: >-
  Runs the three-tool identity + boundary gate before any deploy: apply-config
  -Check (config drift), check-doc-boundaries (root docs), and each activated
  starter's placeholder-guard status. Read-only; reports pass/fail per check.
when_to_use: >-
  User says "verify before deploy", "pre-deploy check", "is this safe to ship",
  "check for drift", or is at Init Project Step 10.
allowed-tools: Bash(powershell *) Bash(node *) Read Grep
---

## Context

Before any deploy, three separate gates must pass — each with its own exit semantics. This skill runs all
three and reports a single pass/fail so "is this safe to ship?" is one call. It is **read-only** (it changes
nothing). See [INIT_PROJECT.md](../../../INIT_PROJECT.md) Step 10.

## Steps

1. **Config drift** — the root config vs every activated starter's committed config:
   ```powershell
   powershell -ExecutionPolicy Bypass -File apply-config.ps1 -Check
   ```
   (Exit 0 = no drift. If the solution is still the uninitialized template, `-Check` is a no-op.)
2. **Doc boundaries** — root docs reference no retired architecture and no broken links:
   ```powershell
   node scripts/check-doc-boundaries.mjs
   ```
3. **Per-starter placeholder guards** — for each *activated* starter, dry-check that its deploy guard would
   pass (no un-renamed placeholders). Grep each activated starter for the giveaway tokens rather than running
   a real deploy:
   ```powershell
   Select-String -Path ".\SMKB - *\**\*.xml",".\SMKB - *\**\*.ts",".\SMKB - *\**\*.json" -Pattern "smkb_sol_|YourSolutionName|CHANGEME|sol_exampleflow|00000000-0000-0000-0000-000000000000" -List
   ```
   Any hit in an **activated** starter is a blocker (an inactive starter keeping its placeholders is fine).
4. Report each check as PASS/FAIL with the offending file(s). Deploy only if all three pass.

## Error Handling

- **`-Check` reports drift:** a starter config diverged from `solution.config.json` — run `/solution-config` (apply reconciles) or revert the hand edit.
- **doc-boundaries fails:** a root doc references retired architecture or a dead link — fix the doc.
- **Placeholder hit in an activated starter:** run that starter's authoring skill to finish renaming (`/dvt-add-table`, `/env-add-var`, `/flow-add`, `/pa-add-flow`), or resolve the specific token.

## Notes

- This is a gate, not a deploy — it never mutates anything. Deploy with `/deploy-solution` once it's green.
- The same checks run in the root pre-commit hook, so a clean commit implies a clean gate.
