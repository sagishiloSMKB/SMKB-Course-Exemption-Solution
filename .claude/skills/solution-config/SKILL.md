---
name: SMKB Solution — Configure Identity
description: >-
  Derives the solution identity from the solution's human name, writes
  solution.config.json, and (once starters are activated) pushes it into each one via
  apply-config.ps1. Validates the prefix, unique name, env URL/ID, and the BARE Power
  Pages site name before applying.
when_to_use: >-
  User says "configure the solution", "set the solution identity", "run apply-config",
  "set the prefix", "fill solution.config", or is at Init Project Phase 2 (identity)
  or Phase 6.1 (activation flags + component names).
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
[CLAUDE.md](../../../CLAUDE.md) Critical Rule 3 and [INIT_PROJECT.md](../../../INIT_PROJECT.md) Phases 2 and 6.

**Two distinct calls.** At **Phase 2** you write *identity only*, with every `activate` flag still `false` —
that is provably inert (zero writes, zero renames, `-Check` exits 0) and it makes identity durable before
anything else happens. At **Phase 6.1**, after the plan is approved, you add the activation flags and
component names and *then* apply. Do not apply at Phase 2: every identity write is gated on an `activate`
flag, so an apply with all flags false does nothing while `-Check` still reports "No drift" — which reads as
success.

## Steps

1. **Derive, don't interrogate.** Ask only for the solution's **human name** plus a sentence of business
   context, then propose the rest and show the filled block for a single confirmation:
   - `solutionUniqueName` ← PascalCase of the name, `SMKB`-prefixed · `solutionDisplayName` ← `SMKB - <Name>`
   - `shortPrefix` ← 2–5 lowercase letters from the name; **check the registry** and propose an alternative on a collision
   - `targetEnvUrl` ← the Dev URL (fixed for this kit) · `environmentId` ← `pac env list --filter "SMKB-Apps-Dev"`
     (the `--name` flag is rejected; `--filter`/`-f` is the only supported one)

   Then **validate each** (these are the exact `apply-config.ps1` rules — a violation blocks apply):
   - `shortPrefix` — `^[a-z]{2,5}$`, **not** `sol`, and **not already registered** (check CLAUDE.md → Critical Rule 5 short-name table).
   - `solutionUniqueName` — PascalCase, no spaces (e.g. `SMKBEventsTickets`).
   - `solutionDisplayName` — `SMKB - <Name>` with an **ASCII** hyphen.
   - `environmentId` — a GUID; `targetEnvUrl` — must end with `/`.
   - `powerApps.appDisplayName` — `SMKB - <Name> - Dev`.
   - `powerPages.siteName` — the **BARE** site name (no prefix); apply-config derives `PREFIX - Name`. Also `appNameHe/En`, `documentTitle`, `defaultLanguage`.
   - `activate.*` — **not an interview question.** These come from the Phase 5 plan, where activation is
     derived from the spec and stated to the developer (CLAUDE.md → Critical Rule 1). Never present the
     five starters as a menu. At Phase 2 they stay `false`.
2. Write the validated values into `solution.config.json` (edit only — never hand-edit a starter's own config).
3. **If no starter is activated yet (Phase 2): stop here.** Identity is recorded; applying is Phase 6.
4. Preview every change + the skip list:
   ```powershell
   powershell -ExecutionPolicy Bypass -File apply-config.ps1 -DryRun
   ```
   Show the developer the diff. During Init Project that is informational — the Phase 5 plan already
   covered it, so do **not** re-request approval. Pause for confirmation only when this skill is invoked
   standalone to change identity on a live solution.
5. Apply:
   ```powershell
   powershell -ExecutionPolicy Bypass -File apply-config.ps1
   ```
6. Confirm no drift:
   ```powershell
   powershell -ExecutionPolicy Bypass -File apply-config.ps1 -Check
   ```
7. If the run renamed any folder, tell the developer to **restart Claude Code** (Init Project H4) —
   directory-scoped skills are discovered once per session and otherwise keep resolving to the old paths.

## Error Handling

- **apply-config refuses to run / "not initialized":** a placeholder (`YourSolutionName`, `sol`, `CHANGEME…`) remains, or a field failed a rule — fix the flagged field.
- **`EVT - EVT - …` doubled site name:** `powerPages.siteName` was pre-prefixed — set it to the bare name.
- **`-Check` reports drift after apply:** a starter's config was hand-edited to disagree with the root config — re-run apply (it reconciles), or revert the hand edit.
- **Prefix collision:** the chosen `shortPrefix` is already registered — pick another and update CLAUDE.md's short-name table when you commit.

## Notes

- `apply-config.ps1` writes **identity only** — it deliberately leaves platform-assigned placeholders (app IDs, workflow GUIDs, site-setting GUIDs, connection references, table/flow content names) for the per-starter guards.
- Re-running is idempotent. After any later identity change, re-run this skill.
- Deploy is a separate step (`/deploy-solution`, or each starter's deploy skill).
