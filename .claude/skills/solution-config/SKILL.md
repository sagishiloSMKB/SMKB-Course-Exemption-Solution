---
name: SMKB Solution — Configure Identity
description: >-
  Interviews for the solution identity, writes solution.config.json, and pushes it
  into every activated starter via apply-config.ps1. Validates the prefix, unique
  name, env URL/ID, and the BARE Power Pages site name before applying.
when_to_use: >-
  User says "configure the solution", "set the solution identity", "run apply-config",
  "set the prefix", "fill solution.config", or is at Init Project Step 7b.
disable-model-invocation: true
allowed-tools: Read Edit Bash(powershell *)
---

## Context

Solution identity lives in **one** file — [`solution.config.json`](../../../solution.config.json) — and is
pushed into every activated starter by [`apply-config.ps1`](../../../apply-config.ps1). This skill prevents
the silent, expensive identity mistakes: **doubling the Power Pages prefix** (`EVT - EVT - …` — apply-config
*derives* `PREFIX - Name`, so `siteName` must be the **bare** name), a **Unicode en-dash** that garbles on
Hebrew-locale Windows, and a **short prefix collision** with a solution already in SMKB-Apps-Dev. It mirrors
`apply-config.ps1`'s own `Assert-Valid` rules so validation fails *before* anything is written. See root
[CLAUDE.md](../../../CLAUDE.md) Critical Rule 3 and [INIT_PROJECT.md](../../../INIT_PROJECT.md) Steps 2/7b.

## Steps

1. Read the current `solution.config.json`. Interview for any unset fields and **validate each** (these are
   the exact `apply-config.ps1` rules — a violation blocks apply):
   - `shortPrefix` — `^[a-z]{2,5}$`, **not** `sol`, and **not already registered** (check CLAUDE.md → Critical Rule 5 short-name table).
   - `solutionUniqueName` — PascalCase, no spaces (e.g. `SMKBEventsTickets`).
   - `solutionDisplayName` — `SMKB - <Name>` with an **ASCII** hyphen.
   - `environmentId` — a GUID; `targetEnvUrl` — must end with `/`.
   - `powerApps.appDisplayName` — `SMKB - <Name> - Dev`.
   - `powerPages.siteName` — the **BARE** site name (no prefix); apply-config derives `PREFIX - Name`. Also `appNameHe/En`, `documentTitle`, `defaultLanguage`.
   - `activate.*` — set `true` only for the starters this solution uses.
2. Write the validated values into `solution.config.json` (edit only — never hand-edit a starter's own config).
3. Preview every change + the skip list:
   ```powershell
   powershell -ExecutionPolicy Bypass -File apply-config.ps1 -DryRun
   ```
   Show the developer the diff. **PAUSE** for confirmation.
4. Apply:
   ```powershell
   powershell -ExecutionPolicy Bypass -File apply-config.ps1
   ```
5. Confirm no drift:
   ```powershell
   powershell -ExecutionPolicy Bypass -File apply-config.ps1 -Check
   ```

## Error Handling

- **apply-config refuses to run / "not initialized":** a placeholder (`YourSolutionName`, `sol`, `CHANGEME…`) remains, or a field failed a rule — fix the flagged field.
- **`EVT - EVT - …` doubled site name:** `powerPages.siteName` was pre-prefixed — set it to the bare name.
- **`-Check` reports drift after apply:** a starter's config was hand-edited to disagree with the root config — re-run apply (it reconciles), or revert the hand edit.
- **Prefix collision:** the chosen `shortPrefix` is already registered — pick another and update CLAUDE.md's short-name table when you commit.

## Notes

- `apply-config.ps1` writes **identity only** — it deliberately leaves platform-assigned placeholders (app IDs, workflow GUIDs, site-setting GUIDs, connection references, table/flow content names) for the per-starter guards.
- Re-running is idempotent. After any later identity change, re-run this skill.
- Deploy is a separate step (`/deploy-solution`, or each starter's deploy skill).
