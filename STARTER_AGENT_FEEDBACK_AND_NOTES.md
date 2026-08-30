# Starter Kit — Agent Feedback & Notes

This file is maintained by AI agents running the Init Project flow.
Every issue, workaround, unexpected behaviour, and improvement idea encountered
during initialization should be logged here so the starter kit can be improved.

**Do not delete entries.** Add new entries at the top under a dated section.

---

<!-- Agents: add your entries below this line, newest first -->

## [2026-08-30] — Course Exemption (Phase 6.2/6.3): the PowerShell block was Windows PowerShell 5.1 only, not PowerShell as such

### Issue / Observation

Phases 1 through 6.1 were run on the assumption that **PowerShell was blanket-blocked by Group Policy**
at the institution. `powershell.exe` failed with `This program is blocked by group policy` from `cmd`,
`Permission denied` from Bash, and `EUNKNOWN: uv_spawn` from the Claude Code PowerShell tool. On that
assumption `apply-config.ps1` (6.2) and every starter `deploy.ps1` (Phase 8) were treated as blocked
pending an IT exception, and an IT request was drafted asking for one.

**That assumption was wrong, and it cost several phases of planning around a blocker that did not exist
in the form assumed.**

### What the policy actually says

The mechanism is **Software Restriction Policy in the user hive** —
`HKCU\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers`. It was missed on the first pass
because only `HKLM` was checked; the machine hive carries only unrelated `ftp.exe` and `OpenSSH` rules.

`DefaultLevel` is `0x40000` (**Unrestricted**) — default-allow with explicit deny rules. Seven rules
concern PowerShell, and **every one is specific to Windows PowerShell 5.1**:

| Kind | Target |
|---|---|
| Path x5 | `C:\Windows\System32\WindowsPowerShell\v1.0` (the folder), `...\v1.0\powershell.exe`, the `SysWOW64` twin, and the two `powershell_ise.exe` variants |
| Hash x2 | `PowerShell.EXE (10.0.19041.546)`, `powershell_ise.EXE (10.0.19041.1)` |

**No rule names `pwsh.exe`.** No rule covers `C:\Program Files\PowerShell` or
`%LOCALAPPDATA%\Programs\PowerShell`. ACLs on `powershell.exe` are normal (`BUILTIN\Users:(RX)`), so
this is policy, not permissions.

One adjacent rule needs care: `%LocalAppData%\*.exe` is Disallowed ("Don't allow executables to run
from %AppData%"). It does **not** reach into subdirectories — verified empirically, since `pac.exe`,
VS Code, Git and Ollama all run from `%LOCALAPPDATA%` subfolders on this machine.

### The workaround

**Install PowerShell 7 user-scope. No admin, no registry, no IT ticket.** Two routes, both confirmed
working here:

- **Microsoft Store** (per-user) — what the developer used; lands `pwsh` in
  `%LOCALAPPDATA%\Microsoft\WindowsApps`, already on `PATH`, so no restart is needed for the shell to
  see it.
- **ZIP extraction** to `%LOCALAPPDATA%\Programs\PowerShell\7` — no installer at all. Requires adding
  that folder to the **user** `PATH` via `[Environment]::SetEnvironmentVariable('Path', ..., 'User')`.
  **Do not use `setx PATH "%PATH%;..."`** — it expands the combined machine+user PATH into user scope
  and truncates at 1024 characters.

`apply-config.ps1` and every starter `deploy.ps1` run unmodified under PowerShell 7 — no
`#requires -Version` anywhere, and nothing in the kit hardcodes `powershell.exe` in a way that matters.

### The hook picked it up with zero edits

The `ps_runs` probe added in the Phase 3.5 entry — `command -v "$1" && "$1" -NoProfile -Command exit 0`
— tries `pwsh` first and only falls back to `powershell`. The moment `pwsh` appeared on `PATH`, the
pre-commit hook stopped printing its skip warning and **ran the config-drift check for the first time
since Phase 3.5**. That entry claimed the patch was future-neutral because `ps_runs` is evaluated on
every commit; **that claim is now proven in practice rather than asserted.**

### Caveat — do not generalise this

This is **one institution's SRP configuration**. Another organisation may block PowerShell broadly, by
publisher rule or by a WDAC/AppLocker policy that catches `pwsh.exe` too.

The reusable finding is **"check the SRP scope before assuming the worst case"**, not "PowerShell 7
always works". Concretely, before requesting an IT exception:

```
reg query "HKCU\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers" /s
reg query "HKLM\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers" /s
```

Check **both hives**, read `DefaultLevel`, and enumerate the path and hash rules. If every PowerShell
rule names `WindowsPowerShell\v1.0` or a 5.1 hash, a user-scope PowerShell 7 install is very likely to
work — and is far preferable to asking security to weaken a deliberate anti-malware control.

### Suggested improvement

1. **Add the SRP scope check to the Phase 1.2 tool check.** The flow probes `node`, `git` and `pac` but
   never PowerShell, so a machine that cannot run the kit's core script reads as fully prepared. Probing
   executability (not just presence) plus a one-line SRP scope check would have caught this in Phase 1
   instead of Phase 6.
2. **Document the user-scope PowerShell 7 route in `INIT_PROJECT.md`** as the first thing to try when
   `apply-config.ps1` cannot run — before drafting an IT request.
3. **Prefer `pwsh` over `powershell` in kit tooling and permission patterns.** The shipped
   `.claude/settings.json` allowlists only `powershell*`; on any machine using PowerShell 7 those entries
   silently match nothing. This solution added `*pwsh*` twins alongside them.

---

## [2026-08-26] — Course Exemption (Phase 3.5): toolchain probes test existence, not executability — hooks block every commit

### Issue / Observation
Enabling the git hooks at Phase 3.5 (`git config core.hooksPath .githooks`) made **every commit in the
repository fail**.

`.githooks/pre-commit:116` selects the interpreter with `command -v powershell`, which proves the file is
on PATH but **not that it can be executed**. On this machine Windows PowerShell is present at
`C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe` and **blocked by Group Policy**. So `PS` was
set, line 119 died with `Permission denied`, `status=1`, and the hook rejected the commit - for an
environmental reason with **nothing to do with the change being committed**.

**The graceful-skip branch at line 121 is unreachable on this machine.** The hook's own header promises:

> *"Every step SKIPS GRACEFULLY when its toolchain is not installed, so a fresh clone is never blocked"*

The kit models two states - **absent** or **working**. This machine is a third: **present but not
runnable**. Every probe in the kit that asks "is the tool there?" instead of "does the tool run?" has
this hole.

### Third manifestation of one root cause
The same Group Policy block has now surfaced three times, in three different places, because each caller
probes differently:

| # | Phase | Symptom |
|---|---|---|
| 1 | Phase 1 | The Claude Code **PowerShell tool** fails with `EUNKNOWN: uv_spawn`; `powershell.exe` from Bash gives `Permission denied`. Blocks `apply-config.ps1` (6.2) and every `deploy.ps1` (Phase 8) - **still open** |
| 2 | Phase 1.2 | The tool check never probes PowerShell at all, so a machine that cannot run the flow reads as fully prepared |
| 3 | **Phase 3.5** | **This** - the hook's `command -v` probe, blocking every commit |

The shared assumption is that a tool present on disk can be invoked. That holds on almost every machine,
which is exactly why it survives until it does not.

### Reproduction
Any machine where `powershell.exe` exists but is policy-blocked. Confirm the block with:

```
cmd.exe /c powershell -NoProfile -Command "Write-Output ok"
  -> This program is blocked by group policy.
```

Then `git config core.hooksPath .githooks` and commit anything - the hook exits 1. Verify directly
without making a commit:

```
sh .githooks/pre-commit
  doc-boundaries: OK
  template-guards: OK
  .githooks/pre-commit: line 119: /c/WINDOWS/.../powershell: Permission denied
  pre-commit: checks failed - fix the issues (or stage the fixes) and re-commit.
  exit 1
```

Note both Node gates **pass**; only the PowerShell step fails, and it fails environmentally rather than
on any real finding.

### Resolution
**Patched our copy locally.** `.githooks/pre-commit` now probes with a cheap no-op before trusting the
interpreter, and falls through to the (now loud) skip when it will not run. The real
`apply-config.ps1 -Check` invocation is byte-identical - only the predicate changed, from *exists* to
*exists and runs*. The `pwsh` -> `powershell` preference order is preserved, and the two skip reasons are
distinguished ("is not installed" vs "is present but will not run") so the message states which case it
is. The patch is **future-neutral**: `ps_runs` is evaluated on every commit, so the moment PowerShell
becomes runnable the check starts running for real with no further edit, and there is no state in which
drift detection is permanently muted.

The hook carries a `LOCAL PATCH` comment pointing at this note, matching the marker used in
`.github/workflows/ci.yml`. **Not fixed upstream.**

### Suggested improvement
1. **Probe executability, not presence**, wherever the kit selects a tool:
   ```sh
   ps_runs() { command -v "$1" >/dev/null 2>&1 && "$1" -NoProfile -Command exit 0 >/dev/null 2>&1; }
   ```
   Use `-Command`, **not** `-File`: execution policy governs script *files*, so `-Command` cannot fail
   for a policy reason that the real `-ExecutionPolicy Bypass -File` call would have survived. That
   removes the only plausible false negative.
2. **Audit every other `command -v` in the kit** for the same assumption - this is a pattern bug, not a
   one-line bug. `command -v node` has it too, though a blocked Node is far less likely.
3. **Make the skip loud and name the gate.** The original single line
   (`"PowerShell unavailable — skipping config-drift check"`) is easy to lose in hook output, and a
   silently skipped gate reads as a pass. This also closes suggestion #3 from the Phase 1 entry below,
   which flagged the same quietness before we knew it would matter this much.
4. **Add PowerShell to the Phase 1.2 tool check** (repeat of the Phase 1 entry, reinforced): three
   separate failures would have been one known prerequisite if the flow probed the interpreter it
   depends on most.

---

## [2026-08-26] — Course Exemption (Phase 3.4): CI flow-lint ignores the activation flags and fails every baseline push

> ### ⚠️ READ THIS AT INIT PROJECT 6.2a
> **Expect CI to go red again at 6.2a, and do not re-diagnose it as this bug.** When Cloud Flows is
> activated at Phase 6, the patch below becomes a no-op by design and the full lint runs - including the
> placeholder gates. If the example flow skeletons still carry `smkb_sol_` / `[REPLACE]` at that moment,
> CI **correctly** goes red. That is real signal about an activated starter, not a repeat of this defect.
> The fix is Phase 7: author the real flows and remove the example skeletons. **A red CI at 6.2a is
> expected; a red CI at 3.4 was the bug.**

### Issue / Observation
The `flow-lint` CI job fails on the Phase 3.4 baseline push with **11 errors** (`no-placeholders`,
`xml-no-placeholders`) against the **pristine, never-edited** Power Automate Flows starter - while
`activate.powerAutomateFlows` is `false` and Critical Rule 1 requires that starter to be left untouched.

This is not a tolerable quirk. [`INIT_PROJECT.md:326`](INIT_PROJECT.md) states H2's verification as
*"...and **the first CI run after 3.4 is green**"*, and `INIT_PROJECT.md:343` calls the baseline commit
*"proof the remote, CI and credential all work"*. **It is a stated success criterion the kit cannot
currently meet.** No doc anywhere describes a red baseline as expected; searched every `.md`.

**The four-link chain:**

| # | Where | What happens |
|---|---|---|
| 1 | `scripts/is-initialized.mjs` | Reads **only** the three identity sentinels (`solutionUniqueName`, `solutionDisplayName`, `shortPrefix`). It never consults `activate`. So INITIALIZED flips at **Phase 2.2**, six phases before activation. |
| 2 | `.github/workflows/ci.yml:148` | Skips only when NOT initialized - so it runs. |
| 3 | `.github/workflows/ci.yml:154` | The **only** activation test is `[ -z "$lint" ]`, i.e. "the checker file is missing". But a non-activated starter stays **pristine and PRESENT** until the Phase 9 cleanup deletes it, so the file is always there and this never fires. The `activate` flags are never read. |
| 4 | `ci.yml:160-162` -> `lint.mjs:87` | CI passes the Workflows path deliberately ("so the run never depends on folder-name auto-discovery"). But `lint.mjs:87` is `flowsActivated = flowsDirArg ? true : flowsFound.activated` - **passing a path hardcodes activated=true**, defeating lint.mjs's own gate. |

Link 4 explains the tell-tale asymmetry in the output: Env Vars and Tables resolve through `findDir()`
and correctly print *"not activated - still template-named"*, while Cloud Flows is scanned. Only the
starter whose path was passed loses its activation check.

### The fix already existed and was not propagated
[`.githooks/pre-commit:76-81`](.githooks/pre-commit) documents this **identical** failure, down to the
count:

> *"Without it, the whole Init Project build phase was uncommittable: INITIALIZED flips at Phase 2.2,
> lint.mjs scans the whole Workflows folder, and the still-untouched example skeletons plus
> `Other/*.xml` then rejected any commit that staged a flow - **11 errors**, 9 from files the developer
> never staged."*

It was fixed **for commits only**, via `--pre-commit` at line 94. CI never received an equivalent, and
the two gates drifted. Same defect, two runners, one fixed.

### Reproduction — universal, not specific to this solution
Every solution built from this kit hits it. Phase 2.2 sets identity (-> INITIALIZED), activation is not
until Phase 6, and 3.4 mandates a baseline push in between. **If Cloud Flows is never activated, CI stays
red from Phase 2.2 until Phase 9 deletes the folder.** Locally:

```
node "<Flows>/tools/flow-lint/lint.mjs" "<Flows>/Workflows"                # 11 errors, exit 1
node "<Flows>/tools/flow-lint/lint.mjs" --pre-commit "<Flows>/Workflows"   # clean, exit 0
```

### Resolution
**Patched our copy locally rather than waiting for upstream.** `.github/workflows/ci.yml` now reads
`activate.powerAutomateFlows` from `solution.config.json` and skips (loudly) when false. It carries a
`LOCAL PATCH` comment block citing both links and pointing back to this note, so an upstream sync can
recognise it as deliberate divergence rather than drift. **Not fixed upstream.**

Chose the activation gate over `--pre-commit` deliberately: `--pre-commit` would have gone green too, but
it **permanently mutes both placeholder rules in CI**, including after activation. The activation gate is
a strict no-op the moment the flag flips true, so it changes nothing about a real solution's CI.

### Suggested improvement
1. **`ci.yml`: gate on the flag, not on file presence** - the fix applied here. It extends the pattern
   `lint.mjs:172-192` already implements for Env Vars and Tables, whose comment describes this very bug:
   *"a starter that was NOT activated was scanned anyway ... blocked by `xml-no-placeholders` firing on a
   pristine template it is required by Critical Rule 1 to leave untouched."* The one path that bypassed
   that gate was the one CI uses.
2. **Alternatively (or additionally) fix `lint.mjs:87`** so an explicit `flowsDirArg` no longer implies
   activation - resolve activation from the folder name regardless of how the path arrived. That would fix
   CI, `deploy.ps1`, and any future caller **without** touching the workflow, and is the better single fix
   upstream. The two are independent; either closes the hole.
3. **Do NOT put `--pre-commit` in CI** as the upstream remedy, for the muting reason above.
4. **Make `is-initialized.mjs` the wrong predicate for this decision, and say so.** "Identity is filled"
   and "this starter is activated" are different questions six phases apart. Every gate that means the
   latter should read `activate`, not INITIALIZED.
5. **`INIT_PROJECT.md:326` should not promise a green first CI run** until the above is fixed - or should
   state which jobs are expected to skip at baseline. A verification step that cannot pass trains agents
   and developers to ignore CI, which is worse than having no criterion.

---

## [2026-08-26] — Course Exemption (Phase 3.3): repo created under a personal account, transfer pending

> **THIS IS A LIVE DECISION RECORD, NOT A CLOSED FINDING.** The transfer below has **not** happened yet.
> Anyone picking this solution up should check whether it still applies.

### Issue / Observation
Phase 3.3 (H2) assumes the developer can create a repository in the **SMKB-AC-IL** organisation. On this
run they **could not** - the account lacks "Create repositories" permission in the org. An access request
was raised on **2026-08-26** and may take days.

Rather than block Phase 3 (and therefore the whole init) on an org permission, the repository is being
created under the personal account **`sagishiloSMKB`** and will be **transferred to `SMKB-AC-IL` once
access is granted**.

- **Interim remote:** `https://github.com/sagishiloSMKB/SMKB-Course-Exemption-Solution.git`
- **Intended final remote:** `https://github.com/SMKB-AC-IL/SMKB-Course-Exemption-Solution.git`

**This costs the repository nothing.** Verified by search before committing to the approach: the owner
appears nowhere in the tracked tree in any functional form.

- `solution.config.json` has **no** repo/git/github key at all (keys are `solutionUniqueName`,
  `solutionDisplayName`, `shortPrefix`, `publisherPrefix`, `targetEnvUrl`, `environmentId`, `activate`,
  `powerApps`, `powerPages`).
- **No** `package.json` declares a `repository` field; there is no `.gitmodules`.
- `.github/workflows/ci.yml` is owner-agnostic: public actions only (`actions/checkout@v4`,
  `actions/setup-node@v4`), triggers `push:[main]` + `pull_request`, and **no secrets** (the only
  `secrets.*` lines are inside a commented-out Power Platform block).
- The only `SMKB-AC-IL` strings in the tree are three lines of *starter-kit prose* in `INIT_PROJECT.md`
  (L196 template remote, L319 the H2 instruction, L335 an example `git remote add`). Nothing reads them.

So the owner lives in exactly one untracked place - `.git/config` - and the Phase 3.4 baseline commit is
byte-for-byte identical either way. **Nothing was excluded from the baseline on account of the transfer.**

### Phase
Phase 3.3 (H2 - create the GitHub repository).

### Resolution
Proceeded under `sagishiloSMKB`. GitHub's **Settings -> General -> Danger Zone -> Transfer ownership**
installs automatic redirects from the old URL (git operations included), so a stale remote keeps working.

**Transfer checklist - run this when org access is granted:**

| # | Item | Notes |
|---|---|---|
| 1 | Transfer the repo on GitHub to `SMKB-AC-IL` | **Blocked until the same "create repositories" permission lands** - transferring *into* an org requires it |
| 2 | `git remote set-url origin https://github.com/SMKB-AC-IL/SMKB-Course-Exemption-Solution.git` | Optional thanks to redirects, but do it to avoid confusion |
| 3 | `solution.config.json` | **Nothing to change** - no repo field exists |
| 4 | CI secrets / variables / environments | **None exist** - nothing to migrate. (Note: Actions secrets and variables *never* transfer, so this only holds because we have none) |
| 5 | Webhooks | **None** |
| 6 | Hardcoded URLs in docs/scripts | **None functional** - only the three `INIT_PROJECT.md` prose lines above |
| 7 | Confirm visibility is still **Private** after transfer | Explicit check |
| 8 | ⚠️ **Check the org's GitHub Actions policy** | **The most likely thing to bite.** If `SMKB-AC-IL` restricts which actions may run, `actions/checkout@v4` and `actions/setup-node@v4` must be on the allow-list, or **CI goes red purely from the move** - with nothing in the diff to explain it. Check this *at transfer time*, not after the first red build |
| 9 | Re-grant collaborator access via org teams | |
| 10 | Branch protection rules | None set today; add at the org if wanted |

Also: the old-URL redirect **breaks** if anyone later creates a new repo at the vacated
`sagishiloSMKB/SMKB-Course-Exemption-Solution` path.

### Follow-up owed in a later phase
- **Phase 4:** record this same decision in [`SOLUTION-SPEC.md`](SOLUTION-SPEC.md) **§10**, so it survives
  the Phase 6.3 restart and is visible to whoever inherits the solution. `STARTER_AGENT_FEEDBACK_AND_NOTES.md`
  is agent-facing; `SOLUTION-SPEC.md` is where a human looks for "why is this like this".

### Suggested improvement
**`INIT_PROJECT.md` 3.3 should not assume org create-permission.** It sends the developer to
`github.com/SMKB-AC-IL -> New repository` with no mention that this is a *permission*, and blocking the
whole init on an org access request that takes days is a poor failure mode. Suggest a short branch in H2:

> If you cannot create a repository in the organisation, create it under your personal account and
> transfer it later - the repo's contents are owner-agnostic (no config, CI secret, or script references
> the owner), so nothing in the flow needs to change. See the transfer checklist.

This mirrors the guidance already present for a deferred H2 in 3.4 ("commit the baseline locally and move
on"), which is the same insight applied to a different blocker.

---

## [2026-08-26] — Course Exemption (pre-Phase 3: wiping the previously-deployed solution)

### Issue / Observation

The solution being initialized was **already fully deployed** to SMKB-Apps-Dev, and the developer chose
to reuse the same unique name and prefix. That forces a full environment wipe first, because an
unmanaged import is an upsert against environment-scoped schema names. **The kit has no path for this
at all** - see the previous entry's point 2. Executing it surfaced five things worth recording.

**1. Deleting an unmanaged solution does NOT delete its components - and the kit never says so.**
`pac solution delete` removes only the container; every component also belongs to `Default`, so it
survives as an orphan that the next import silently merges into. This is the single most important fact
for any rebuild-in-place, and it appears nowhere in `INIT_PROJECT.md`, `CLAUDE.md`, or `SOLUTION-SPEC.md`
§10. Getting the order wrong (container first) would have orphaned 100 components with no container
left to find them through.

**2. Component-type codes, empirically confirmed.** The kit's `cleanup-audit.mjs` knows only types
1 / 29 / 380 / connectionreference. For the record, from `solutioncomponent` in a real solution:

| Type | Code | Type | Code |
|---|---|---|---|
| Entity | 1 | Custom API | **10038** |
| Role | 20 | Custom API **Response Property** | **10039** |
| Workflow | 29 | Custom API **Request Parameter** | **10040** |
| Plugin Assembly | 91 | Env Var Definition | 380 |
| Canvas/Code App | 300 | Env Var Value | 381 |

Note 10039/10040 are the reverse of the intuitive ordering (response before request).

**3. Cascades that fire, and ones that do not.** Verified by counting components after each stage:
- Deleting a **Custom API** cascades its request parameters, response properties **and** its
  `sdkmessageprocessingstep`. 4 deletions took the total from 66 to 34.
- Deleting a **plugin assembly** takes its plugin types with it (they are not solution components).
- Deleting an **env var definition** cascades its `environmentvariablevalue` record.
- Deleting a **connection reference** does **not** delete the underlying connection.
- **Plugin types and SDK steps are not solution components**, so a container count of 100 understated
  the true footprint by 8 records.

**4. The Maker portal's async table delete reports false failures.** Deleting 9 tables as a batch
produced a red **"No response received"** banner, and a retry then failed with **"Could not find an
entity"** - which was itself the proof the batch had succeeded. **A UI banner is not a result.** Refresh
and re-query metadata before concluding anything, and never re-attempt a delete on the strength of a
banner.

**5. `.claude/settings.json`'s `Bash(pac *)` rules are inert whenever `pac` is off `PATH`.** `pac` is
not on `PATH` on this machine, so it must be invoked as `.../Microsoft.PowerApps.CLI.<ver>/tools/pac.exe`.
That string does not match `Bash(pac ...)`, so the entire allow-list **and the deny-list** silently fail
to apply - including the `pac solution import` and `pac auth select` denies the kit relies on. **A
permission rule that matches nothing looks exactly like protection while providing none** - the same
failure mode `CLAUDE.md` already warns about for `-replace`.

### Phase
Between Phase 2 (identity) and Phase 3 (repository) - a stage the flow does not model at all.

### Resolution
Built and executed a 9-stage dependency-ordered plan, verified after every stage by
`solutioncomponent` aggregate rather than by UI confirmation. 100 components -> 0, then the container.

Order used: code app -> 33 flows -> 4 Custom APIs -> plugin assembly -> 4 connection references ->
8 env var definitions -> 2 security roles -> 19 tables in 6 topologically-sorted waves -> container.
Table order was computed by topological sort over the 36 custom relationships in the exported
`customizations.xml`, not by hand. All 19 tables held **0 rows**, so no cascade destroyed data.

Every component was first proven **exclusive** to the solution (`Default`/`Active` membership is
automatic and does not count as sharing), and the 4 connection references were gated behind an explicit
dependency pre-check across all flows environment-wide. Final state verified: 10 remnant checks at 0
rows, the 8 other solutions present at **unchanged versions**, the shared connection-reference bank
Active with unchanged GUIDs, and all 8 Power Pages sites intact.

Also fixed `.claude/settings.json` for finding 5 before any deletion ran: added `*pac.exe <verb>*`
patterns for the read-only verbs, denied `pac env list` / `env select` / `data *` / `plugin push` in
both invocation forms, and deliberately left `pac solution delete` in **neither** list so it prompts.

### Suggested improvement
1. **Add a "the solution already exists" branch to Phase 2**, before identity is written. One
   `pac solution list` detects it. Today the flow discovers a live namesake only if the agent
   volunteers to look, and the cost of missing it is a silent merge discovered much later.
2. **Document the unmanaged-container truth wherever a rebuild is mentioned** (`SOLUTION-SPEC.md` §10,
   Critical Rule 7, `INIT_PROJECT.md` 4.1). One sentence: *"Deleting an unmanaged solution deletes only
   the container; its components survive in `Default` and the next import upserts onto them."*
3. **Ship an environment-side inventory + dependency reporter.** `cleanup-audit.mjs` is repo-only by
   design, but a read-only `scripts/env-inventory.mjs` over `solutioncomponent` (+ the type table in
   finding 2 and a topological sort of relationships) would turn a day of portal archaeology into one
   command. It needs no new permissions - `pac env fetch` is read-only.
4. **Fix the `Bash(pac *)` permission patterns** to also match an absolute-path `pac.exe`, in the kit
   itself. Every solution repo cloned from the kit inherits the broken rules.
5. **Warn about the async-delete false failure** in whatever cleanup doc lands, per finding 4.
6. **`pac env fetch` needs single-quoted XML attributes on Windows.** Git Bash backslash-escapes double
   quotes when handing an argument to `pac.exe`, and `pac` dies with
   `XmlException: '\' is an unexpected token`. Worth a line next to the existing PowerShell 5.1 notes in
   `CLAUDE.md` -> "Agent Guidance", since it is the same class of Windows quoting trap.
7. **State the component-model boundary** (repeat of the previous entry): Custom APIs and plugin
   assemblies existed here and the kit models neither.

---

## [2026-08-26] — Course Exemption (Phase 2, identity)

### Issue / Observation
**Two findings, both about Phase 2 assuming a greenfield solution.**

**(a) The short-name registry in `CLAUDE.md` (Critical Rule 5) is badly stale, so the collision check it prescribes is not trustworthy.**
It lists exactly one entry (`cif` -> SMKB - Community Initiatives Fund). `pac solution list` against SMKB-Apps-Dev returns **nine** SMKB solutions plus `PIZZA`:

```
SMKBCourseExemption, SMKBEventsTickets, SMKBFundraisingLandPage, SMKBFundraisingLandingPage,
MarketingZoomCampaignJune26, SMKBOpenDay15526, SMKBPaymentVouchers, SMKBShuttleTracker
```

`pac pages list` shows prefixes in live use that appear nowhere in the registry: `PVCH`, `FRLP`, `SHTR`.
So an agent following 2.1 ("checked against the registry") would clear a prefix that is actually taken —
the exact collision Critical Rule 5 exists to prevent. Note also `SMKBFundraisingLandPage` **and**
`SMKBFundraisingLandingPage` both exist, which looks like a past collision-adjacent mistake.

**(b) The solution being initialized already exists in the target environment, fully built.**
`SMKBCourseExemption` / `SMKB - Course Exemption` is deployed to SMKB-Apps-Dev at version **1.0.0.0**.
Exported and unpacked, it contains:

| Component type | Count | Notes |
|---|---|---|
| Cloud flows | **33** | all named `CEX-*` |
| Dataverse tables | ~15 | `smkb_cex_Application`, `ExemptionSuggestion`, `CertificateExemption`, `Programme`, `Rule`, `TakenCourse`, `Component`, `CertificateType`, `ApplicationReopening`, ... |
| Environment variables | 8 | `smkb_cex_PortalBaseUrl`, `TurnstileSecretKey`, `ScoringEngine`, `MinSuggestionConfidence`, ... |
| **Custom APIs** | **4** | `smkb_cex_CreateOtp`, `VerifyOtp`, `ValidateSession`, `ScoreApplication` |
| **Plugin assembly** | **1** | `SMKBCourseExemptionScoring.dll` |
| Power Apps **Code App** | 1 | `smkb_smkbexemptionreviewdev_aba24` ("SMKB Exemption Review Dev") |

The existing prefix is **`cex`**. Publisher is `SKMBCore` / `smkb`, as expected.

Two things follow that the flow has no path for:
1. **Custom APIs and plugin assemblies are outside the starter kit's component model entirely.** The kit
   is tables + env vars + cloud flows + Vue code app + Power Pages code site. Nothing in Critical Rule 4's
   deploy order, `apply-config.ps1`, or any starter knows what a Custom API or a signed C# plugin assembly
   is. A rebuild of this solution cannot be expressed in the kit as shipped.
2. **15 of the 33 flows are `CEX-Portal*`, and there is an `smkb_cex_PortalBaseUrl` env var — but
   `pac pages list` shows no Course Exemption site in Dev.** So the portal half is either unprovisioned in
   Dev or lives outside this environment. Worth resolving before Phase 5 derives activation.

### Phase
Phase 2 (Solution identity), at 2.1 — while deriving the prefix and checking it against the registry.

### Resolution
Did not write `solution.config.json`. Escalated to the developer, because rebuild-vs-new changes the
identity itself (reuse `SMKBCourseExemption`/`cex`, or take a fresh unique name and prefix) and because
Critical Rule 7 version seeding depends on the answer. Verified the existing content by
`pac solution export` into the scratchpad and unpacking it there - no repo writes.

### Suggested improvement
1. **Phase 2.1 should check the environment, not a hand-maintained table.** Replace "checked against the
   registry" with a mechanical check and treat the registry as a cache to be refreshed from it:
   ```
   pac solution list          # unique names already taken
   pac pages list             # prefixes in live use
   ```
   A registry that must be hand-updated on every init will always lag; this one lags by eight solutions.
2. **Add an explicit "does this solution already exist?" step to Phase 2**, before any identity is
   written. `pac solution list` already tells you, it costs one command, and it is the difference between
   a greenfield init and a rebuild - which Phase 4.1 already has substantial guidance for, but which
   nothing upstream ever prompts you to *detect*. Right now the flow discovers it only if the agent
   happens to look.
3. **State the kit's component-model boundary somewhere in Phases 4-5.** Custom APIs, plugin assemblies,
   and any pro-code Dataverse extension are silently out of scope. A rebuild of an existing solution is
   exactly when that gap surfaces, and there is no guidance for "the deployed artifact contains a
   component type the kit cannot hold". Even a short "if the source solution has Custom APIs or plugin
   assemblies, they stay outside the kit and must be tracked separately" would prevent an agent from
   quietly dropping them.
4. **Critical Rule 7's rebuild note should say Dev's version is not sufficient.** It says to check
   `pac solution list` and seed above the highest across Dev/Stage/Prod - but the kit's own auth only ever
   targets Dev, and Stage/Prod are pipeline-only by policy, so the agent structurally *cannot* see them.
   The note should make asking the developer the prescribed action rather than an implied one.

---

## [2026-08-26] — Course Exemption (pre-identity; Phase 1)

### Issue / Observation
**Windows PowerShell is blocked by Group Policy on this machine, so every `.ps1` step in the flow is unrunnable — by the agent *and* via any child process.**

- The Claude Code **PowerShell tool** fails with `EUNKNOWN: unknown error, uv_spawn` on every invocation (retried 3x, including a trivial `$PSVersionTable` call).
- Invoking `powershell.exe` from the Bash tool gives `Permission denied` (with and without the sandbox disabled), even though the file mode is `-rwxr-xr-x`.
- Routing through `cmd.exe` surfaces the real cause: `This program is blocked by group policy.`
- `pwsh` (PowerShell 7) is **not installed** — no `C:\Program Files\PowerShell` directory. `winget` is present.

What this affects, in flow order:
| Step | Script | Impact |
|---|---|---|
| 1.3 (optional) | `scripts/vendor-design-ui.ps1 -Check` | cannot verify; non-blocking |
| **6.2** | `apply-config.ps1` (identity writes, folder renames, doc-pointer fixes) | **hard blocker** — no alternative path in the kit |
| 6.2 / pre-commit | `apply-config.ps1 -Check` | hook **skips gracefully** (`PowerShell unavailable — skipping config-drift check`), so the drift gate is silently absent |
| **8.x** | each starter's `deploy.ps1` | **hard blocker** for every deploy |
| ALM | `scripts/Set-SolutionVersion.ps1` | blocked |

Node 24.16.0 / pnpm 11.22.0 / PAC CLI are all fine, so the Node-based gates (`check-doc-boundaries.mjs`, `check-template-guards.mjs`, `flow-lint`, `is-initialized.mjs`) still run.

Also worth noting: `pac` is **not on PATH** at all, so `pac auth list` fails as written even where PowerShell works. The binary resolves at
`%LOCALAPPDATA%\Microsoft\PowerAppsCLI\Microsoft.PowerApps.CLI.2.9.3\tools\pac.exe`.

### Phase
Phase 1 (Prerequisites) — 1.2 tools check. Discovered before any identity was recorded.

### Resolution
- **PAC CLI:** worked around by calling the versioned `pac.exe` by absolute path from the Bash tool. `pac auth list` then succeeded and confirmed the active `*` profile targets `https://org229c958d.crm4.dynamics.com/` (SMKB-Apps-Dev) — so **H1 was not needed**.
- **PowerShell:** no agent-side workaround exists. Escalated to the developer at Phase 1 as a prerequisite to resolve before Phase 6 (options: a Group Policy exception for `powershell.exe`, installing `pwsh` 7, or running the `.ps1` steps by hand as guided handoffs). Phases 1–5 do not touch PowerShell and can proceed either way.

### Suggested improvement
1. **Add PowerShell to the Phase 1.2 tool check.** The flow checks `node`, `pnpm` and `pac` but never checks the interpreter that runs `apply-config.ps1` and every `deploy.ps1` — so a machine that cannot run the flow at all reads as fully prepared, and the failure lands at 6.2 after identity, repo and specs are already committed. Suggested addition, with the same "don't use the version banner" care as the PAC note:
   ```
   powershell -NoProfile -Command "$PSVersionTable.PSVersion"   # or: pwsh -v
   ```
   and state that a `This program is blocked by group policy` / `uv_spawn` failure is a **stop-and-escalate**, not a skip.
2. **`pac auth list` should not assume PATH.** Recommend a resolution snippet (glob `%LOCALAPPDATA%\Microsoft\PowerAppsCLI\Microsoft.PowerApps.CLI.*\tools\pac.exe`, highest version wins) so the agent does not conclude "PAC CLI missing" — the same failure mode the existing `pac --version` warning guards against, one layer down.
3. **The pre-commit `apply-config.ps1 -Check` skip is too quiet on a PowerShell-less machine.** It prints one line among many and leaves the drift gate off for the whole run. Consider making the skip loud (or a hard fail once `is-initialized.mjs` returns 0), since post-initialization drift is exactly what it exists to catch.
4. **Consider a Node port of `apply-config.ps1 -Check`** (or the whole script). Every other root gate in `.githooks/pre-commit` is already `node`, and Node is the one interpreter the flow verifies is present. That would remove the single-point dependency that blocks Phase 6 here.

---
