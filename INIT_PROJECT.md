# Init Project — Starting a New Solution

## Agent Standing Instruction — Log Everything

> **Read this before starting any step.**

As you work through this flow, **record any of the following in [`STARTER_AGENT_FEEDBACK_AND_NOTES.md`](STARTER_AGENT_FEEDBACK_AND_NOTES.md)**:

- Any step that required a workaround or clarification not covered by these instructions
- Any error or unexpected output you encountered and how you resolved it
- Any instruction that was ambiguous, missing, or wrong
- Any improvement that would make a step smoother for the next agent or developer
- Anything that took more back-and-forth with the user than it should have

**Format for each entry:**

```
## [YYYY-MM-DD] — [Solution name being initialized]

### Issue / Observation
[What happened]

### Phase
[Which Init Project phase this occurred in]

### Resolution
[What you did to fix or work around it]

### Suggested improvement
[What should change in the starter kit or INIT_PROJECT.md to prevent this]
```

Log entries as you encounter them — do not wait until the end. If the init completes with no issues, add a short "No issues" entry so we know the run was clean.

---

This guide covers the **one-time setup** required when you clone this starter kit to build a new solution. It is different from starting a regular Claude session on an already-initialized project.

> **Working with Claude?** Say "init project" and Claude drives this flow.
> **Working manually?** Follow each phase below in order.

---

## Session Start vs Init Project

| | Session Start | Init Project |
|-|--------------|-------------|
| **When** | Every time you open a new Claude session | Once — the first time you clone this starter kit |
| **What happens** | Claude reads project state, reads which starters are active, starts work | Disconnects from the template remote, **creates the new repo and pushes a baseline (Phase 3)**, then captures specs, derives the architecture, builds the solution — committing at each checkpoint |
| **Trigger** | Just open Claude — it reads CLAUDE.md automatically | Say "init project" to Claude, or follow this guide manually |
| **Governed by** | CLAUDE.md Critical Rule 1 (Derive Starter Activation From the Spec) | This file (INIT_PROJECT.md) |

**Rule:** do not run Init Project on a repo that has already been initialized. If the git remote already points to a solution-specific repo (not the starter kit), you are in a regular session — just start working.

---

## How this flow works

**You make three decisions. The agent makes the rest and proceeds.**

| Your decision | Phase | What you give |
|---|---|---|
| **1. Identity** | 2 | The solution's human name plus a sentence of business context. The agent derives the unique name, display name, short prefix, environment values and repo name, checks the short-name registry for collisions, and shows you the filled block to confirm **once**. |
| **2. The specifications** | 4 | What the solution must do — data, rules, screens, audiences, design, any existing artifacts. In your own words; the agent asks and writes it down. |
| **3. Approve the plan** | 5 | The agent states the architecture it derived, **which starters it will activate and why**, the component names, and the build sequence. You confirm it matches what you had in mind. |

Then **two authorisations while it ships** — plus one earlier at **3.4 (H16)**, where you authorise pushes to your own new repo once and for all, covered in the next section. Each is one yes to a list the agent has already prepared — never an item-by-item confirmation, and never asked twice:

| Your authorisation | Phase | What you are saying yes to |
|---|---|---|
| **The first deploy — and the one-way removal list with it** | 8.2 (H5) | the deploy to shared Dev, **plus** removing the components this import would otherwise make **permanent** in the environment. One question, because it is one consequence. |
| **The cleanup removal list** | 9.3 (H14) | deleting from the repo what the solution turned out not to use, now that the deploy is proven. |

Neither is a design question, and both are recoverable from the Phase 3.4 baseline commit. After the deploy authorisation the agent deploys every starter in order without asking again.

### The repository comes third — before the specs

**Phase 3 runs before any of the decisions above except identity**, and it is the phase this overview
used to omit. In order: **3.1** removes the starter kit remote, **3.3** creates the new private repo
(H2), **3.4** adds it and pushes a baseline commit, **3.5** enables the hooks. Only then does Phase 4
ask what the solution must do.

That ordering is deliberate. The clone is severed from the shared template before any solution-specific
work exists, and the new repo is live early enough that **everything after it is committed and pushed as
it happens** — not held on one machine until the end.

The baseline commit at 3.4 carries the whole starter with real identity and template folder names. It is
the only deliberately "unclean" commit in the flow; every commit after it is scoped to one step:

| Checkpoint | Phase | What it protects |
|---|---|---|
| Baseline — the whole starter, real identity | **3.4** | the `git diff <baseline>..HEAD` boundary and the `git reset --hard` recovery point |
| Activation: flags, renames, doc pointers | **6.2a** | the `apply-config.ps1` folder renames — committed *before* the 6.3 restart, so the new session starts from a known-good tree |
| Each component, as it is authored | **7.1** | the build itself; one commit per table / flow / env var / screen |
| Platform-assigned IDs and GUIDs | **8.8** | app IDs, workflow GUIDs, site-setting GUIDs — **generated by Power Platform and not re-derivable by hand** |
| Cleanup removals | **9.4** | the deletions, pushed rather than left local |
| Audit reports + owner annotations | **10.4** | the decision record |
| The drafted `docs/` set | **12** | |
| Final boundary: initialized → active development | **13** | |

Two things follow from this that matter while you work:

- **A commit is never blocked by unfinished work elsewhere.** The pre-commit hook runs `flow-lint`
  with `--pre-commit`, which skips only the placeholder gates. Without it, staging one finished flow
  was refused because *other* skeletons still held `[REPLACE …]` tokens — 11 errors, 9 from files you
  never touched. Placeholders remain a hard **deploy** gate (Critical Rule 2); they are not a commit gate.
- **Pushing is authorised once, at 3.4** (H16), for the solution's own private repo. Phase 13 is then a
  review of the final state, not the moment everything first leaves the machine.

**Everything else the agent decides and does.** Which starters to activate is *not* a menu you pick from —
it is derived from your specs and stated to you. See CLAUDE.md → Critical Rule 1.

### Guided handoffs — the steps only you can perform

Some steps are **manual by definition**: they need a browser, a credential, or a command the agent is not permitted to run. The agent does not simply assign these to you — it walks you through each one and then **verifies the outcome**, rather than trusting "done". Every handoff looks like this:

```
> **YOUR TURN — <action>**  (the agent cannot do this: <reason>)
>  1. <exact portal path or command>
>  2. …
> **Then:** paste the output back, or say "done".
> **Agent verifies:** <the check the agent runs to prove it actually happened>
```

The verification half is the point. Where a check is genuinely impossible from here, the block says so outright instead of implying success.

### Handoff index

| # | Your turn | Phase | Why it must be you | Agent verifies with |
|---|---|---|---|---|
| **H1** | `pac auth create` / `pac auth select` | 1.2 | blocked in agent settings | `pac auth list` — the active `*` profile targets the Dev URL |
| **H2** | Create the private GitHub repo | 3.3 | browser | `git ls-remote` succeeds and returns nothing (empty repo) |
| **H3** | `pnpm install` / `npm install` | 6.4 | blocked in agent settings | `node_modules` exists; `npm run lint` runs |
| **H4** | **Restart Claude Code** after the folder renames | 6.3 | session-level | directory-scoped skills resolve to the new paths |
| **H5** | Authorise the first deploy to shared Dev — **and with it the pass A removal list** | 8.2 | the deploy gate; this deploy is what makes those components permanent | — this is the approval itself. The agent then applies the removals and **re-runs 8.1's three checks** before the first `deploy.ps1`, so the gate proves the removals broke nothing |
| **H6** | `pac code init` — create the Power App record | 8.6 | must run locally before the first push | `power.config.json` exists (`appId` null is expected) |
| **H7** | Set environment-variable **values** in the Maker portal | 8.4 | portal-only data entry | agent lists every definition and confirms each with you |
| **H8** | Confirm flow connection references and **turn each flow on** | 8.5 | portal-only | flows import **disabled** — agent re-checks published state |
| **H9** | Power Pages provisioning / reactivation + typing the web URL slug | 8.7 | browser | `pac pages list` shows the site; slug matches `powerPages.webUrlSlug` |
| **H10** | **Convert the site to Production** | 8.7 | admin role + portal | `pac pages list -v` no longer reports `Trial` |
| **H11** | Run the Power Platform Pipeline for Stage / Prod | 11 | portal-only by policy | **cannot be verified from here** — the agent lists what to check in the target |
| **H12** | Review the drafted `docs/` | 12 | business intent | — |
| **H13** | Approve the final commit and push | 13 | approval | `git status` reviewed before staging |
| **H14** | Approve the cleanup removal list | 9.3 | deleting a starter or a component is a judgement about what this solution *is*, not a fact the repo holds | the cleanup commit succeeds with the hooks enabled — `check-doc-boundaries.mjs` exit 0 (every root-doc link still resolves), `check-template-guards.mjs` naming each removed starter in its skip list, `apply-config.ps1 -Check` no drift |
| **H15** | Annotate the audit findings | 10.3 | accepting a residual risk and declining a UX suggestion are owner decisions; no check can tell whether a risk is *truly* accepted | no finding is left at its default — no `SUGGESTED` rows remain in the UX report, and every security row is `FIXED` / `FIXED [needs deploy]` / `Documented` (rationale non-empty) / `Accepted` / `False positive` |
| **H16** | Authorise pushes to the new repo — **once**, covering every checkpoint | 3.4 | pushing is outward-facing, but it should be asked once rather than at each of seven checkpoints | `git rev-parse --abbrev-ref --symbolic-full-name @{u}` resolves to `origin/main`; the agent re-states the remote URL before the first checkpoint push |

**Everything not in that table is the agent's**: filling `solution.config.json`, running `apply-config.ps1` (identity, folder renames, doc pointers), writing `SOLUTION-SPEC.md`, authoring every table / flow / env var / screen, running the deploy scripts once authorised, running the verification gates, running the cleanup reporter and proposing the removal list, applying the approved removals and re-pointing the root docs, running the security and UX audits and writing their reports, and drafting `docs/`.

Optional paths use the same block format when they come up: the Blocked-Attachments fix in PPAC (a 403 on `.js` upload) and `/ppcs-enable-web-api` table permissions.

---

# Phase 1 — Prerequisites

## 1.1 Confirm this is a fresh clone

Record the current remote so you know exactly what you are removing:

```powershell
git remote get-url origin
```

Expected output for a fresh clone:
```
https://github.com/SMKB-AC-IL/SMKB-Power-Platform-Solution-Starter-Kit.git
```

If it already points to a solution-specific repo (e.g. `SMKB-Events-Tickets-Solution`), Init Project has already been run — stop here and start a regular session instead.

## 1.2 Tools

```powershell
node --version    # Must be 20+
pnpm --version    # Must be 8+  (npm i -g pnpm if missing)
pac auth list     # PAC CLI     (download from Microsoft if missing)
```

> **Do not use `pac --version` as the install check.** In PAC CLI 2.8.1 it prints the version banner
> and *then* fails with `Error: Not a valid command`, exiting **non-zero** — an agent treating that
> exit code as "PAC CLI missing" will wrongly block the whole flow. `pac auth list` is the command
> that actually matters anyway; use `pac help` if you only want to prove the binary is on PATH.

The active profile (`*`) must target `https://org229c958d.crm4.dynamics.com/` (SMKB-Apps-Dev).

> **Warning:** The PAC profile named "SMKB-Apps-Dev" incorrectly targets `org1dce1895` (Seminar Hakibutzim College), NOT SMKB-Apps-Dev. Always verify the active profile URL before proceeding.

> **Note for the agent:** run `pac auth list` using the **PowerShell tool** (not the Bash tool) — PAC CLI is a Windows executable and is only on the Windows PowerShell PATH. If it fails because PAC CLI is not installed, do not skip this — hand off to the developer and read the output they paste back.

> **YOUR TURN — H1: fix the PAC profile** *(only if the active profile is wrong)*
> (the agent cannot do this: `pac auth select` is blocked in agent settings)
>  1. `pac auth list` — note the index of the profile targeting `https://org229c958d.crm4.dynamics.com/`
>  2. `pac auth select --index <N>`
>  3. If no such profile exists: `pac auth create --url https://org229c958d.crm4.dynamics.com/`
> **Then:** paste the new `pac auth list` output back.
> **Agent verifies:** the `*` profile's URL is the Dev URL. Never run a deploy without this confirmed — with the wrong profile active, a deploy silently lands in the wrong environment.

## 1.3 No npm credential is needed

**Nothing in this flow requires an npm token.** The private `@smkbacil/design-ui` package is vendored
into each starter as a committed tarball and resolved with a `file:` spec, so `npm install` / `pnpm
install` work offline and with no authentication — locally, in CI, and on a brand-new machine.

Confirm it if you want to:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/vendor-design-ui.ps1 -Check
```

> **Why it is built this way.** design-ui is compiled into `assets/*.js` at build time, so the deployed
> site never fetches it — but with a version spec, *every* install would need a live token forever, and a
> single expired org-wide credential would turn every consuming solution red at once. The token is now a
> development-time concern only: it is used by `scripts/vendor-design-ui.ps1` when someone deliberately
> updates the library, and nowhere else. `scripts/check-template-guards.mjs` fails the build if a
> consumer ever reverts to a registry spec, so this cannot quietly regress.

---

# Phase 2 — Solution identity

**Your decision #1.** Give the agent the solution's **human name** and a sentence of business context. That is all that is required; the agent derives the rest.

## 2.1 What the agent derives

| Item | Derived how | Example |
|------|-------------|---------|
| **Solution name** | **you provide this** | `Events Tickets` |
| **Solution unique name** | PascalCase of the name, `SMKB` prefixed | `SMKBEventsTickets` |
| **Solution display name** | `SMKB - ` + the name, ASCII hyphen | `SMKB - Events Tickets` |
| **Short name (prefix)** | proposed from the name, 2–5 lowercase letters, **checked against the registry** | `evt` |
| **Target environment URL** | fixed for this kit | `https://org229c958d.crm4.dynamics.com/` |
| **Environment ID** | looked up: `pac env list --filter "SMKB-Apps-Dev"` (the `--name` flag is rejected; `--filter`/`-f` is the only supported one) | `00000000-1111-2222-3333-444444444444` |
| Local folder / repo name | `SMKB - [Name] - Solution` | `SMKB - Events Tickets - Solution` |
| GitHub repo name | from the **human name**, hyphenated | `SMKB-Events-Tickets-Solution` ✓ (NOT `SMKB-EventsTickets-Solution` ✗) |

**Validation the agent applies:**
- Unique name: alphanumeric, PascalCase, max 50 characters
- Short name: 2–5 lowercase letters only — no numbers, underscores or hyphens; **must be unique across every solution in SMKB-Apps-Dev** (CLAUDE.md → Critical Rule 5 holds the registry). The agent checks the registry and proposes an alternative on a collision.
- **Display names use ASCII hyphens only** (` - `), never a Unicode en/em dash — CLAUDE.md → Critical Rule 3

> **Component-level names (Power Pages and Power Apps) are not settled here.** Each is a **Functional Component Name** — a short phrase describing what that specific site or app *does* — so only the specs can supply it. They are derived in Phase 5. A solution may have several sites and several apps, each named differently.

## 2.2 Write the config now

The agent fills [`solution.config.json`](solution.config.json) with the identity **immediately**, leaving every `activate` flag `false`. Run **`/solution-config`** or edit it directly.

This is deliberately safe, and it is what makes identity durable before anything else happens: with all flags false, `apply-config.ps1` writes **zero files**, renames **zero folders**, touches **zero doc pointers**, and `-Check` exits 0 — so the pre-commit hook stays green. Identity is *recorded* here and *applied* in Phase 6, once activation is known.

> **Why not apply it now?** Every identity write in `apply-config.ps1` is gated on an `activate` flag, and the folder renames are too. Applying before activation is decided is not just useless — `-Check` would report "No drift" because it only inspects *activated* starters, which reads as success.

> Confirm the derived block with the developer **once**, then continue. Do not re-ask later.

---

# Phase 3 — Repository

## 3.1 Remove the starter kit remote

The most important step in this phase: removing the origin prevents any solution-specific work from ever being pushed back to the shared template repo.

```powershell
git remote remove origin
git remote -v          # Expected: (no output)
```

> **If you copied files into this folder rather than cloning:** run `git init && git branch -M main` first — there is no remote to remove, but you still need a repository before adding the new one in 3.4.

## 3.2 Remove the onboarding folder

`onboarding SMKB Apps Development/` is a local developer learning tool and must not reach any solution repository. The agent removes it:

```powershell
Remove-Item -Recurse -Force "onboarding SMKB Apps Development"
Test-Path "onboarding SMKB Apps Development"     # Expected: False
```

## 3.3 Create the GitHub repository

> **YOUR TURN — H2: create the GitHub repository**
> (the agent cannot do this: it needs a browser)
>  1. Go to [github.com/SMKB-AC-IL](https://github.com/SMKB-AC-IL) -> **New repository**
>  2. Name: the GitHub name the agent derived in Phase 2 (e.g. `SMKB-Events-Tickets-Solution`)
>  3. Visibility: **Private**
>  4. **Do NOT** add a README, .gitignore or license — the repo must be empty
>  5. **Create repository**, then copy the HTTPS clone URL
>
> **Then:** paste the clone URL back.
> **Agent verifies:** `git ls-remote <url>` succeeds and returns no refs (an empty repo), and the first CI run after 3.4 is green. **No repository secrets are required** — CI needs no credential.

> **GitHub repo names cannot contain spaces.** Type the name already-hyphenated. Pasting a folder-style name like `SMKB - Events Tickets - Solution` yields `SMKB---Events-Tickets-Solution` (triple hyphens), because GitHub silently converts each space.

**No repository secrets to add.** Earlier versions of this flow required an `NPM_TOKEN` secret here, because the private `@smkbacil/design-ui` package was resolved from the registry at install time and CI went red on the very first push without it. The package is now vendored as a committed tarball, so CI authenticates to nothing. If you are looking at an older solution repo that still has the secret, it is harmless but no longer used.

## 3.4 Connect and push the baseline

```powershell
git remote add origin https://github.com/SMKB-AC-IL/SMKB-Events-Tickets-Solution.git
git add -A
git commit -m "Initial commit: Events Tickets initialized from SMKB Power Platform Solution Starter Kit"
git push -u origin main

git remote -v          # Expected: origin  <your new repo>  (fetch/push)
```

This baseline commit carries the **real identity** from Phase 2 with all starters still on their template names. That makes it three useful things at once: proof the remote, CI and credential all work before any real work exists; a clean `git diff <baseline>..HEAD` boundary for "what this solution added"; and the `git reset --hard <baseline>` recovery point if the init goes wrong during the Phase 6 renames.

This is the **only** commit in the flow that stages everything with `git add -A`, and the only one that is deliberately not scoped to a single step — it is the "commit the whole starter once" boundary. Every commit after it stages specific paths.

> **YOUR TURN — H16: authorise pushes to your new repo (once)**
> (the agent cannot decide this: pushing is outward-facing, so it needs your go-ahead — but it should need it *once*, not at every checkpoint)
>  1. Confirm the remote in the output above is **your** solution repo, not the starter kit.
>  2. Say "yes, push at the checkpoints".
>
> **What you are authorising:** commit **and push** at each checkpoint in the table under "How this flow
> works" — 6.2a, 7.1, 8.8, 9.4, 10.4, 12 — to this private repo only. Nothing else changes: the deploy
> to shared Dev is still its own authorisation at 8.2, and Phase 13 still shows you `git status` before
> the final commit.
>
> **Why it is one yes and not seven:** the alternative was the flow's real prior behaviour — nothing
> pushed between 3.4 and Phase 13, so the folder renames, the entire build, and the platform-assigned
> IDs from the deploy all sat uncommitted on one machine for nine phases. A push to your own private
> repo is not a consequential act; losing a deploy's generated GUIDs is.
>
> **Agent verifies:** `git rev-parse --abbrev-ref --symbolic-full-name @{u}` resolves to `origin/main`, and it re-states the remote URL before the first checkpoint push.
>
> **If you decline:** the agent still commits at every checkpoint (local commits need no authorisation) and simply does not push. Say "push now" whenever you want them to leave the machine.

## 3.5 Enable the git hooks

```powershell
git config core.hooksPath .githooks
```

This points Git at the root `.githooks/` folder instead of `.git/hooks/`. The one root hook then, on each commit: lints staged `.vue`/`.ts`/`.tsx` files with each starter's own ESLint; runs `flow-lint` on staged Cloud Flows files (once the solution is initialized); runs `apply-config.ps1 -Check`; and runs `scripts/check-doc-boundaries.mjs`. Steps skip gracefully when their toolchain isn't installed.

> Local git config — every developer who clones this repo runs it once. Installing the starters' dependencies is **6.4**; it waits until the folders have their final names.

---

# Phase 4 — Specifications and design

**Your decision #2.** Everything the agent needs to know about what to build. Answer in plain language — the agent asks the questions and writes the answers down.

## 4.1 What the agent gathers

Ask for what already exists before asking for detail: a spec document, a Figma file, a brand guide, an existing site or app being replaced, screenshots, an email thread describing the process. Then fill the gaps by asking.

Cover:

- **What the solution does, who uses it, and what it replaces** — plus how the owner will judge it worked.
- **Audiences and access** — who is authenticated and how; **which records a given user may see and edit** (this drives the ownership scaffold in every authenticated flow).
- **Data** — the entities, their fields and types, how they relate, which hold personal data, and how long anything is kept.
- **Configuration** — values that differ per environment or that an admin should change without a redeploy.
- **Automation** — every rule, notification, validation and integration; what triggers it; what it reads and writes; what it sends and to whom.
- **Interfaces** — for each app or site: what it is *for* (this becomes its Functional Component Name), its screens or pages, its languages and titles, and its auth model.
- **External systems** — direction, payload, and how each is authenticated.
- **Design** — the design system decision, provided assets, RTL/bilingual and accessibility needs.
- **Constraints** — reviews it must pass, data classification, approval chains, retention obligations.

> **Does this app or site use the SMKB design system, or its own visual identity? Ask now** — it is one
> question with two clean answers, and the agent handles both:
>
> | Answer | What the agent does | Does the developer need anything? |
> |---|---|---|
> | **The SMKB design system** (the default) | Nothing. `@smkbacil/design-ui` is already **part of the project**: the package is committed under each starter's `vendor/` and resolved with a `file:` spec. It installs, builds and passes CI with **no credential**. | **No.** Not on this machine, not in CI, not in any deployed environment. |
> | **Its own visual identity** | Runs **`/ppcs-remove-design-ui`** in Phase 7 and discards the library and *everything* wired to it — the dependency, the vendored tarball, the CSS imports, `createSmkb()`, the `smkb` build chunk, and the components that depend on it. | No. |
>
> The only time anyone needs an npm token is to pull a **newer version** of the library than the one
> vendored here. That is a deliberate maintenance action, not part of building a solution — see
> "Updating the design system" below. If a developer is ever *prompted* to authenticate during a
> normal `npm install`, something has regressed: run `scripts/vendor-design-ui.ps1 -Check`.

> **Rebuilding an existing solution? The deployed artifact is the specification — the repo is only
> evidence for it.** Do not assume the default branch is what is live. On one rebuild `origin/main`
> was 7 commits and 11 days behind production, and the deployed commit existed only as a **deploy
> tag** — porting from `main` would have silently produced a faithful copy of the wrong version
> (a migrated video player, relinked logos, 11 renamed assets), and nothing would have failed a
> build. Enumerate every ref (`git fetch --all --tags`, then
> `git for-each-ref --sort=-committerdate`), identify the deployed commit by correlating with the
> live artifact (a deploy tag, the solution version in Dataverse, the build timestamp of the
> deployed bundle), diff your candidate against the default branch before porting, and verify
> afterwards by hashing the ported files against that commit. Treat any disagreement between repo
> and deployment as a finding, not a rounding error.

## 4.2 Record it in `SOLUTION-SPEC.md`

**The agent writes every answer into [`SOLUTION-SPEC.md`](SOLUTION-SPEC.md) as it arrives** — not at the end of the phase, and not only in the conversation.

This is not bookkeeping. Phase 6.3 **mandates a Claude Code restart** when the folders are renamed, so a flow that keeps the specs only in the transcript guarantees losing them at exactly the point where the most has been decided. Anything not written down is gone.

Mark what you **inferred** rather than were told — suffix the sentence with `[inferred]`, or `[inferred from §N]` where it matters which section you reasoned from. The shape is prescribed on purpose: "mark it" without one produced whatever each run felt like, which reads the same as not marking it. And put every unanswered question under **Open questions** instead of guessing a default.

Naming conventions to apply while recording (CLAUDE.md → Critical Rule 3): schema names `smkb_<prefix>_<PascalName>`, display names `PREFIX - Name`. Environment variables use **String with semicolons for lists, never JSON** (Critical Rule 5). Power Pages-triggered flows follow the HTTP 200 + `errorCode` contract — see the [flow-error contract](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/docs/FLOW-ERROR-CONTRACT.md).

---

# Phase 5 — Architecture, activation and the build plan

**This is the one real gate.** The agent decides what to build and how, states it, and you confirm it matches what you had in mind.

> **Agent instruction:** enter plan mode (`EnterPlanMode`) before writing anything here. Make **no** file changes — no config flags, no renames, no installs — until the developer approves. Everything that acts on the decision is Phase 6.

## 5.1 Derive what the solution needs

From `SOLUTION-SPEC.md`, work out the architecture: does this need custom tables? per-environment configuration? server-side automation? a staff-facing app? a public or internal portal? Decide from the specs, not from a checklist.

## 5.2 Map it to starters and derive the names

| If the solution needs... | Activate... |
|--------------------------|------------|
| Custom Dataverse tables | Dataverse Tables Starter |
| Config values that differ per environment | Environmental Variables Starter |
| Automated flows or Power Pages-triggered logic | Cloud Flows Starter |
| Staff/admin-facing interface inside Power Apps | Power Apps Starter |
| Public-facing or internal web portal | Power Pages Code Site Starter |

Starters that are **not** activated must remain completely untouched **through Phases 6–8** — do not rename them, modify their files, or deploy them. **Two states are legal and no others: pristine, or absent.** While a starter is pristine it is still a template; at the **Phase 9 cleanup audit** it is deleted whole from this solution's repo. What is never allowed is the third state — renaming it, filling in part of its config, deleting some of its files. A partly-configured starter is neither a template nor a component, and **nothing in the kit guards it**: every `apply-config.ps1` write is gated on its `activate` flag, so `-Check` reports no drift and `check-template-guards.mjs` records it as a skip.

Each activated starter's folder becomes `SMKB - [Component Name] - [Type Label]`:

| Starter | Type Label | Component Name comes from | Example |
|---|---|---|---|
| Dataverse Tables | `Dataverse Tables` | the solution name | `SMKB - Events Tickets - Dataverse Tables` |
| Environmental Variables | `Environmental Variables` | the solution name | `SMKB - Events Tickets - Environmental Variables` |
| Power Automate Flows | `Cloud Flows` | the solution name | `SMKB - Events Tickets - Cloud Flows` |
| Power Apps | `Power App` | `powerApps.componentName` — a **Functional** name | `SMKB - Events Backoffice - Power App` |
| Power Pages Code Site | `Power Pages Code Site` | `powerPages.siteName` — a **Functional** name | `SMKB - Events RSVP - Power Pages Code Site` |

Tables, Env Vars and Flows are solution-wide resources, so they take the solution name. A Power App or Code Site is named after **what it does**. Keep each Functional Component Name consistent across all three places it appears:

| Object | Convention | Example |
|--------|-----------|---------|
| Repo folder | `SMKB - [Name] - Power App` / `Power Pages Code Site` | `SMKB - Events Backoffice - Power App` |
| Power Platform display name | `SMKB - [Name] - Dev` | `SMKB - Events Backoffice - Dev` |
| Power Pages `solution.ts` `siteName` (the **bare** name — apply-config derives `[PREFIX] - [Name]`; do not pre-prefix, or it doubles) | `[Name]` | `Events RSVP` → site becomes `EVT - Events RSVP` |

> **Multiple apps or sites:** `apply-config.ps1` derives names for exactly **one** Power App and **one** Code Site. A solution with two of either must name the second folder by hand, and that folder is **not** covered by the `-Check` drift gate. If multi-app solutions become common, a `components: []` array in `solution.config.json` is the clean fix.

> **Do NOT rename a folder by hand.** Decide the names here, put them in `solution.config.json`, and let
> **6.2** (`apply-config.ps1`) perform the renames. Renaming manually breaks every piece of root tooling
> that addresses a starter — and it breaks it *silently*: `apply-config.ps1` writes nothing and `-Check`
> reports "No drift" (it found no files to compare), the pre-commit lint dispatch stops matching any
> staged file, and `check-doc-boundaries.mjs` hard-fails on the now-broken doc links so you cannot commit
> at all. The script renames the folders **and** fixes the doc links in one atomic run.

Record the conclusion and the reasoning in `SOLUTION-SPEC.md` §12, so it survives the 6.3 restart.

## 5.3 Write the plan

Cover:

1. **Solution identity** — the values already in `solution.config.json` from Phase 2
2. **Starters to activate** — each with the reason from the spec, and the folder name it will take
3. **Deliberately not activated** — and why; an explicit "no flows are needed because …" is worth more later than silence
4. **Content authoring checklist** — per starter, the work that is *not* identity: table columns, flow logic, env var defaults, pages and screens
5. **Build sequence** — Critical Rule 4 order: Tables → Env Vars → Flows → Power Apps → Power Pages Code Site
6. **Open questions** from `SOLUTION-SPEC.md` §11 that could change the shape of the build

> **Power Apps — the app record must exist before the first deploy.** `pac code push` does NOT create app records; `pac code init` does, and it has no `--path` flag (run it from inside the folder). This is handoff **H6** at 8.6.

> **Cloud Flows — connection references** are shared, environment-level resources. Use the named SMKB connection-reference bank documented in the [Flows README](SMKB%20-%20Power%20Automate%20Flows%20Starter/README.md); only fall back to the export/unpack lookup (CLAUDE.md → "Connection References") if a needed connector is not already in the bank. Do NOT create a new connection reference per solution.

> **Content display names** follow `[SHORT_NAME_UPPER] - [Name]` (e.g. `EVT - Booking Request`). `apply-config.ps1` handles the ALM env vars; apply the same convention to the tables and flows you author.

## 5.4 State it and get approval

Present the plan — including **which starters you are activating and why** — and call `ExitPlanMode`.

This is a statement of the architecture you derived, not a menu. If the developer disagrees, that is a correction to the plan; fold it in and re-present. Do not begin Phase 6 until they approve.

---

# Phase 6 — Activate the starters

Everything here acts on the approved plan. Nothing in this phase should be a surprise.

## 6.1 Set the flags and names

Add to [`solution.config.json`](solution.config.json): the `activate` flags for the starters in the plan, `powerApps.componentName` / `appDisplayName`, and `powerPages.siteName` / titles / `webUrlSlug`. Identity is already there from Phase 2.

> **Skills ship with the kit.** The starter provides `/slash` skills for the build/deploy/quality steps
> (auto-discovered from `.claude/skills/`, directory-scoped — see CLAUDE.md → "Skills"). Prefer them over
> doing the task by hand. If a skill isn't in the `/` menu yet, restart Claude Code. This phase has
> **`/solution-config`**.

## 6.2 Apply

```powershell
powershell -ExecutionPolicy Bypass -File apply-config.ps1 -DryRun
powershell -ExecutionPolicy Bypass -File apply-config.ps1
```

`apply-config.ps1` does **three** things, in this order:

1. **Writes identity** — solution name, display names, short prefix, environment, Power Apps app display name, Power Pages site name/titles + `SOLUTION_UNIQUE_NAME`, and the ALM env-var schema names (the shipped placeholder-prefixed names become `smkb_<prefix>_…`).
2. **Renames the activated starter folders** — non-activated starters keep their template names, untouched, until the **Phase 9** cleanup audit deletes them whole. `apply-config.ps1` has **no concept of a removed starter**: it rewrites starter links in the root docs on a *rename* (its `$script:DocFiles` list), never on a removal — which is why Phase 9's doc repair is a gated manual step and not a re-run of this script.
3. **Fixes the starter links in the root docs** so `check-doc-boundaries.mjs` still passes.

Renames run **last**, after every content write has addressed each starter at its pre-rename path. `-DryRun` lists the renames and pointer updates before anything moves, and `-Check` reports a pending rename or a stale doc pointer as drift — so the fix is always "run apply-config".

It deliberately leaves platform-assigned placeholders (app IDs, workflow GUIDs, site-setting GUIDs, connection references, table/flow scaffold names) untouched — those are resolved in Phases 7–8. Re-running is safe and idempotent.

> After this, `apply-config.ps1 -Check` reports **no drift**. The pre-commit hook runs the same check, so identity can never silently diverge between the root config and a starter.

> **Rebuilding an existing solution? Seed the version now.** A fresh repo ships `solution.version.json`
> at `1.0.0.0` while the live solution may be at `1.0.0.17`, and a solution version that goes backwards
> is rejected by Pipeline promotion - discovered at promotion time, not at deploy time. Run
> `pac solution list`, take the highest version across Dev/Stage/Prod, and seed the file **above** it.
> `Set-SolutionVersion.ps1` also reconciles against the live version on every deploy, but that depends
> on `pac` being authenticated against the right environment, so do not make it the only defence.
> Record the seeded value in [`SOLUTION-SPEC.md`](SOLUTION-SPEC.md) §10. New solution? Nothing to do.
> See CLAUDE.md -> **Critical Rule 7**.

### 6.2a Checkpoint — commit the activation, before the restart

```powershell
git add -A
git commit -m "chore(init): activate starters and apply solution identity"
git push          # if you authorised pushes at 3.4 (H16)
```

`git add -A` is right here for the same reason it is right at 3.4 and wrong everywhere else: this step is a **whole-tree mechanical rewrite** — folder renames, per-starter config writes and doc-pointer updates, all produced by one `apply-config.ps1` run. Splitting it into paths would misrepresent it.

**Why this checkpoint exists rather than folding into a later one:** **6.3 restarts Claude Code.** A restart is a context boundary — the next session re-discovers the tree from scratch, and the renames are exactly the change that makes every previously-known path wrong. Committing first means the post-restart session starts from a tree that is both known-good and diffable, and that a mistake in the renames is `git revert`-able instead of reconstructable. It is also the last moment the working tree is small enough to review in one `git status`.

The pre-commit hook fires here for the first time on real solution content. All three enforcement gates should pass: `apply-config.ps1 -Check` reports no drift (6.2 just made it true), `check-doc-boundaries.mjs` passes (apply-config rewrote the doc pointers in the same run), and `check-template-guards.mjs` lists each non-activated starter as a skip. If any of them fails, **fix it now** — this is the cheapest point in the whole flow to fix a gate, and the same failure at Phase 13 arrives buried under nine phases of other work.

## 6.3 Restart Claude Code

> **YOUR TURN — H4: restart Claude Code**
> (the agent cannot do this: it is a session-level action)
>  1. Restart Claude Code now that folders have been renamed.
> **Then:** reopen and say "continue init".
> **Agent verifies:** directory-scoped skills resolve to the renamed folders.

Directory-scoped skills are discovered once per session, so `/dvt-*`, `/env-*`, `/flow-*`, `/pa-*` and `/ppcs-*` otherwise keep resolving to the old paths and every relative link inside them points into a folder that no longer exists. `apply-config.ps1` prints this reminder whenever it renames anything.

This restart is survivable because `SOLUTION-SPEC.md` and the approved plan are both on disk.

## 6.4 Install dependencies

> **YOUR TURN — H3: install the toolchains**
> (the agent cannot do this: `install` is blocked in agent settings)
>  1. For the Power Apps starter: `cd "SMKB - [Your App Name] - Power App"` then `pnpm install`
>  2. For the Code Site: `cd "SMKB - [Your Site Name] - Power Pages Code Site"` then `npm install`
>     (a flat project — no `client/` subfolder)
> **Then:** say "done".
> **Agent verifies:** `node_modules` exists in each, and `npm run lint` executes.

Only activated starters with a `package.json` need this — skip Tables, Env Vars and Flows. The lint gate calls each starter's local ESLint, which needs `node_modules`.

**No credential is required.** `@smkbacil/design-ui` resolves from the tarball committed under each starter's `vendor/`, so these installs work offline. If one fails asking for authentication, something has reverted to a registry spec — run `scripts/vendor-design-ui.ps1 -Check`.

---

# Phase 7 — Build

Author the solution content, in Critical Rule 4 order: **Tables → Env Vars → Flows → Power Apps → Power Pages Code Site**. Each starter's own README and skills own the mechanics; `SOLUTION-SPEC.md` is the source of what to build.

What remains here is the work that is *not* identity — table columns and relationships, flow logic, env var defaults, pages and screens — plus the platform-assigned placeholders each starter's `deploy.ps1` guard still blocks on.

The security defaults are already in place and should not be re-litigated per solution: CSP and browser headers, disabled built-in login paths, default-deny table permissions, Secure I/O on secret-handling actions, uniform anti-enumeration responses. Read [SECURITY-BASELINE.md](SECURITY-BASELINE.md) before writing a flow that touches a secret, a token, or personal data.

## 7.1 Commit as you build

**One commit per component, not one commit per phase.** This is the longest phase in the flow and the one that produces the most irreplaceable work, so it is the one that must not accumulate.

```powershell
git add "SMKB - [Name] - Dataverse Tables/..."      # specific paths, not -A
git commit -m "feat(tables): add [PREFIX] - Booking Request with status optionset"
git push                                            # if you authorised pushes at 3.4 (H16)
```

Commit when a unit is **coherent**, not when it is perfect: a table with its columns and relationships; a flow that lints; an env var definition with its `RootComponent` row; a screen that builds. A half-written flow is fine to commit — see below.

Use the same scoped-path discipline as Phase 13, and the same commit-type prefixes the repo already uses (`feat`, `fix`, `chore`, `docs`, `refactor`) with the component as the scope. That makes `git log --oneline` a build narrative, and it makes the Phase 9 cleanup audit's job easier: a removal is far simpler to justify against a commit that says what a component was *for*.

> **Placeholders will not block you, and that is deliberate.** The pre-commit hook runs `flow-lint --pre-commit`, which skips the two placeholder rules. Before that flag existed, staging one finished flow was refused because *other* untouched skeletons still held `[REPLACE …]` tokens — 11 errors, 9 of them from files not staged — so the only way to commit during Phase 7 was not to. Placeholders stay a hard gate at **deploy** time (Critical Rule 2, each starter's `deploy.ps1`), which is where they belong. Everything else still runs on every commit: the three-file rule, `$authentication`, auth-token validation, `secureData`, secrets, and ESLint on staged `.vue`/`.ts`.

> **What still blocks a commit here, correctly:** an identity drift (`apply-config.ps1 -Check`), a broken root-doc link, a guard-tripping comment, or an ESLint error in a staged file. All four are cheap to fix at the moment you caused them and expensive to untangle at Phase 13.

---

# Phase 8 — Deploy to Dev

Everything here targets **SMKB-Apps-Dev only**.

## 8.1 Pre-deploy verification

Run all three; each must pass — or run **`/pre-deploy-verify`**, which runs them together:

```powershell
powershell -ExecutionPolicy Bypass -File apply-config.ps1 -Check
node scripts/check-doc-boundaries.mjs
```

Then, for each activated starter, its own `deploy.ps1` (or deploy flow) runs a placeholder guard that blocks deploy while its platform placeholders remain (app IDs, workflow GUIDs, table/flow scaffold names, site-setting GUIDs). Do not bypass those guards — resolve the placeholders instead. The exact tokens and how to resolve them are documented in each starter's own README.

These three checks are **read-only and stay that way**. The removals live in 8.1a below, and these
same checks are what proves them clean afterwards — a step cannot be its own post-condition, which is
why `/pre-deploy-verify` never deletes anything.

### 8.1a Cleanup audit, pass A — the one-way removals

Run **`/cleanup-audit A`**. It reports; it does not delete. The yes is 8.2.

**8.1a covers only what an import makes permanent.** An unmanaged solution import is an **upsert**:
removing a component from the repo afterwards does *not* remove it from the environment, `pac solution`
has `add-solution-component` and **no remove counterpart**, and one real solution therefore shipped two
unused bank connectors permanently — removable only by hand in the Maker portal. Anything that is merely
repo clutter waits for **Phase 9**, where deleting it is free. One question settles which kind an item
is: *would this exist in Dataverse after the import?*

Candidate kinds, and which of them any gate already catches:

| Candidate | Already blocked by a guard? |
|---|---|
| Example tables and their `RootComponent` rows | **Yes** — the Tables guard blocks on the placeholder segment *and* the display name |
| The example env-var definition and its row | **Yes** — the Env Vars guard blocks on the placeholder segment |
| An unused flow skeleton, its `<Workflow>` block and its row | **Yes** — the Flows guard blocks on the all-zero sentinel GUIDs |
| `OtpDailyCap` / `SecurityAlertEmails` when no rate-sensitive send path exists | **No — invisible to every gate.** `apply-config.ps1` renames these to your real prefix, *past* the guard, so they deploy silently and become permanent definitions nothing reads |
| `<connectionreference>` entries no workflow references | **No — invisible to every gate**, and the case the Flows README documents in bold |

The last two rows are why this step exists. The first three would stop a deploy anyway; those two would
not, and they are the ones that cost a Maker-portal cleanup later. Dropping a shipped env-var definition
takes **three edits or none** — the folder, its `RootComponent` row, and its name in
`$script:shippedEnvVars` in `apply-config.ps1` — or `-Check` goes permanently red.

Present the list with the deploy request in 8.2, not before: it is one consequence, so it is one
question.

## 8.2 Authorise the deploy

> **YOUR TURN — H5: authorise the first deploy**
> (this is a deploy to the shared SMKB-Apps-Dev environment)
>  1. Confirm the plan is still what you want, and that `pac auth list` shows the Dev profile active.
>  2. **Read the pass A removal list from 8.1a, printed with this request.** These components arrive
>     **permanently** if we deploy as-is — an unmanaged import is an upsert, so removing them afterwards
>     leaves them in the environment.
>  3. Say "deploy".
> **Then:** the agent applies the approved removals, **re-runs 8.1's three checks** to prove they broke nothing, and only then deploys every activated starter in Critical Rule 4 order — without asking again, stopping only for the portal handoffs below.

After each starter, the agent **must** log the outcome. Deploy one starter at a time and confirm each is working before the next.

> **What the outcome log means — read this, because it is easy to satisfy by accident and hard to
> satisfy properly.** Logging every *problem* you hit feels like compliance, but the `DEPLOY-LOG`
> prompts ask for something different: **a per-starter statement of outcome**, written even when the
> deploy was completely clean. In the kit's first real run, problem entries existed but per-starter
> outcomes did not, and the Power Pages Code Site had none at all — an absence that is invisible without
> an audit. So:
> - **One entry per activated starter, always** — including "clean, no issues", with what you verified
>   (components visible in the Maker portal, a round-trip export, flows turned on).
> - **Re-deploys need outcomes too.** Later deploys are exactly where the interesting failures live
>   (a false-success import, a "deactivated and replaced" message). A single "deployed" entry per
>   starter understates the history.
> - **Log to the repo-root [`STARTER_AGENT_FEEDBACK_AND_NOTES.md`](STARTER_AGENT_FEEDBACK_AND_NOTES.md)**,
>   never to a starter's own copy — the root file is the only one that is read.

> **`/deploy-solution`** orchestrates this whole ordered sequence (each starter via its own deploy skill,
> the portal handoffs, and the mandatory `DEPLOY-LOG` entries). The per-starter skills it calls —
> **`/dvt-deploy`** (runs `guid-freshen` once), **`/flow-deploy`** (draft-vs-published check),
> **`/pa-init`** (create the app record) — can also be run individually.

## 8.3 Dataverse Tables *(skip if not activated)*

```powershell
powershell -ExecutionPolicy Bypass -File "SMKB - [Solution Name] - Dataverse Tables\deploy.ps1"
```

**Agent verifies:** tables appear in [make.powerapps.com](https://make.powerapps.com) → **Dataverse → Tables**.

> **`DEPLOY-LOG` — Tables:** did `deploy.ps1` complete cleanly? did `guid-freshen.ps1` run once beforehand? are tables visible in the Maker portal? any guard false positives or unclear instructions?

## 8.4 Environment Variables *(skip if not activated)*

```powershell
powershell -ExecutionPolicy Bypass -File "SMKB - [Solution Name] - Environmental Variables\deploy.ps1"
```

> **YOUR TURN — H7: set the environment-variable values**
> (the agent cannot do this: portal-only data entry)
>  1. **Power Apps Maker → Solutions → your solution → Environment Variables**
>  2. For each variable: **Edit → Add current value**
> **Then:** say "done".
> **Agent verifies:** it lists every definition it deployed and confirms each one with you by name — a definition with no current value fails at runtime, not at import.

> **`DEPLOY-LOG` — Env Vars:** did deploy complete? were all definitions visible after import? any `RootComponents`/schema-name issues? anything unclear?

## 8.5 Cloud Flows *(skip if not activated)*

```powershell
powershell -ExecutionPolicy Bypass -File "SMKB - [Solution Name] - Cloud Flows\deploy.ps1"
```

> **YOUR TURN — H8: confirm connections and turn each flow on**
> (the agent cannot do this: portal-only, and there is no `pac` verb to activate a flow)
>  1. **Power Automate portal → Solutions → your solution → Cloud Flows**
>  2. For each flow: **open → Edit → confirm the connection references → Save → Turn on**
> **Then:** say "done".
> **Agent verifies:** flows import **disabled** — the agent re-checks the published state (the draft-vs-published check in `/flow-deploy`) rather than assuming.

> **`DEPLOY-LOG` — Flows:** did deploy complete? were flows visible? did the connection-reference wiring work? any JSON/`Customizations.xml` issues? anything unclear?

## 8.6 Power Apps *(skip if not activated)*

> **YOUR TURN — H6: create the app record** *(first time only)*
> (the agent cannot do this: it must run locally before the first push)
>  1. `Push-Location ".\SMKB - [Component Name] - Power App"`
>  2. Delete `power.config.json` first if it already exists
>  3. `pac code init --environment "https://org229c958d.crm4.dynamics.com/" --displayName "SMKB - [Component Name] - Dev"`
>  4. `Pop-Location`
> **Then:** say "done".
> **Agent verifies:** `power.config.json` exists. `appId` will be `null` — expected; it is populated on the first push. The agent then re-runs `apply-config.ps1` so the display name and environment stay in sync.

```powershell
Push-Location "SMKB - [Component Name] - Power App"
powershell -ExecutionPolicy Bypass -File deploy.ps1
Pop-Location
```

> **`DEPLOY-LOG` — Power Apps:** did `pac code init` populate `power.config.json`? did `deploy.ps1` (build + push) complete? was the app visible in the environment? any build/push errors? anything unclear?

## 8.7 Power Pages Code Site *(skip if not activated)*

The Code Site provisions and deploys through its own skills — the agent drives them; you run the local `pac`/browser steps they require.

1. **Provision (first time):** run **`/ppcs-provision-site`** — creates the site, runs the starter's `scripts/freshen-site-settings.ps1`, and applies the post-provision settings. Follow the [Getting Started guide](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/GETTING-STARTED.md).

   > **YOUR TURN — H9: reactivate the site and type the web URL**
   > (the agent cannot do this: browser, and the URL is typed by hand)
   >  1. In the maker portal, complete the site reactivation the skill pauses for.
   >  2. Type the web address the skill prints: `[prefix]-[kebab-site-name]-dev`.
   > **Then:** say "done".
   > **Agent verifies:** `pac pages list` shows the site, and the slug matches `powerPages.webUrlSlug` in `solution.config.json`.
   >
   > **Why the prefix matters:** `*.powerappsportals.com` is a **global namespace shared with every Microsoft tenant**, with no reservation mechanism. An unprefixed generic slug is liable to be already taken by a stranger — this is not hypothetical; one SMKB site carries a `-new` in its URL only because the natural slug was gone, and a rebuild found its obvious slug held by the very site it replaced.

2. **Register flows:** for each Power Automate flow the site calls, run **`/ppcs-register-flow`** to add its trigger GUID to `src/config/flows.ts`.
3. **(Optional) table access:** to read/write a Dataverse table directly from the SPA, run **`/ppcs-enable-web-api`**.
4. **Deploy:** run **`/ppcs-deploy`**.
5. **Verify:** open the site URL in a browser; the Vue app should load.
6. **Convert the site to Production — now, not later. MANDATORY.**

   > **YOUR TURN — H10: convert the site to Production**
   > (the agent cannot do this: it needs an admin role in the Power Platform Admin Center)
   >  1. [Power Platform Admin Center](https://admin.powerplatform.microsoft.com) → **Manage → Power Pages**
   >  2. Select the site → **Convert to production**
   >  3. **Do NOT tick the CDN box** in that dialog (see below)
   > **Then:** say "done".
   > **Agent verifies:** `pac pages list -v` no longer reports `Trial`.

   Every Power Pages site is created as a **trial in every environment type**, and an unconverted site is suspended at day 90 (30 in a trial environment) with its **host deleted** 7 days later — URL, configuration and web files gone. The clock runs from *site creation*, not last use, so an actively developed site still expires. Requires available Power Pages capacity; a site in a **developer/trial environment cannot be converted** (migrate it first). `/ppcs-provision-site` Phase 5 walks through and verifies this.

   > **Why not the CDN box.** The conversion dialog offers to enable the Azure CDN alongside it.
   > **The two settings are independent** — take the Production conversion (that is what stops the
   > 90-day deletion clock) and leave the CDN **off** unless you specifically need edge caching and are
   > prepared to verify it.
   >
   > Enabling it took a real site **completely offline**: the hostname began serving the CDN's own
   > default certificate (`CN=*.azureedge.net`, which does not cover `*.powerappsportals.com`), and
   > because `powerappsportals.com` is on the **HSTS preload list** the browser refuses to let anyone
   > click through — `net::ERR_CERT_COMMON_NAME_INVALID`, site unreachable, not merely warned about.
   > An HTTPS GET of `/` with validation disabled returned 404, so the origin route was unbound too,
   > while the Dataverse site record stayed perfectly healthy the whole time.
   >
   > **A code-site deploy cannot cause or fix this** — DNS, TLS and edge routing are outside
   > everything this kit touches, so redeploying wastes time. To confirm the diagnosis in one
   > command, check which certificate the hostname actually serves:
   > ```powershell
   > $h = '<your-slug>.powerappsportals.com'
   > $c = [Net.Sockets.TcpClient]::new($h, 443)
   > $s = [Net.Security.SslStream]::new($c.GetStream(), $false, { $true })
   > $s.AuthenticateAsClient($h); $s.RemoteCertificate.Subject; $s.Dispose(); $c.Dispose()
   > ```
   > A subject of `CN=*.azureedge.net` means the CDN binding is incomplete: wait for it to finish
   > provisioning, or disable the CDN. Comparing against a sibling site in the same environment turns
   > an ambiguous symptom into a certainty — every non-CDN site serves a valid certificate.

7. **Reconcile the site into the solution — MANDATORY.**
   `pac pages upload-code-site` creates the site and its components as **loose Dataverse records**; solution membership is a separate act that nothing else performs. A Power Platform Pipeline promotes only what the solution contains, so a missing component means the promotion **succeeds** and delivers a quietly misconfigured site to Stage/Prod — nothing fails at Dev time. `/ppcs-deploy` runs this, and `npm run deploy` chains it as `npm run solution:sync`:
   ```powershell
   powershell -ExecutionPolicy Bypass -File "SMKB - [Solution Name] - Power Pages Code Site\scripts\add-site-to-solution.ps1"
   ```
   Two separate gaps: the **site record** is not in the solution, and neither are its **components** — `--AddRequiredComponents` does *not* pull them in. Re-run before every promotion: any later site-config change (one site setting, one CSP edit, registering a flow) creates components that are born outside the solution. Verify with `npm run solution:check` (exit 1 on drift).
   > **The same gap applies to the Power Apps starter** (`--componentType "canvasapp"`, using the app's *unique* name). That path is **unverified** — it was found on a solution that did not activate the Power Apps starter — so check the app is in the solution before promoting.

> **`DEPLOY-LOG` — Power Pages Code Site:** did provisioning and deploy complete? did flows register? was the site converted to Production and verified? did `solution:check` report the site + all components in the solution? any CSP or 403 errors (see the starter's `/ppcs-troubleshoot`)? anything unclear?

## 8.8 Checkpoint — commit the platform-assigned values

**Do this before anything else in Phase 9.** Deploying is the only step in the flow that writes values into the repo which **no one can retype from knowledge** — Power Platform generated them, and recovering a lost one means going back to the environment to read it, or re-creating the platform object and invalidating everything that referenced the old id.

Stage whichever of these the solution activated:

| File | Holds | Written by |
|---|---|---|
| `SMKB - [Name] - Power App/power.config.json` | `appId`, `environmentId` | `pac code init` (H6) + the first push |
| `SMKB - [Name] - Power App/src/generated/` | connector models + services | the Code Apps generator |
| `SMKB - [Name] - Cloud Flows/Workflows/*.json` + `Other/Customizations.xml` + `Other/Solution.xml` | the **workflow GUIDs** — the same GUID in all three files (the three-file rule) | authored, then confirmed against the imported solution |
| `SMKB - [Name] - Power Pages Code Site/src/config/flows.ts` | each flow's **trigger GUID** | `/ppcs-register-flow` (8.7) |
| `SMKB - [Name] - Power Pages Code Site/.powerpages-site/site-settings/` | per-environment **site-setting GUIDs** | `scripts/freshen-site-settings.ps1` |
| `solution.version.json` (repo root) | the **solution version** each import stamped | `scripts/Set-SolutionVersion.ps1`, once per XML starter deployed |

Each starter's `Other/Solution.xml` will also show a changed `<Version>` - that is expected and auto-managed (CLAUDE.md -> **Critical Rule 7**). Stage those too; the authoritative value is `solution.version.json`, and committing it is what makes the number survive the next clone.

```powershell
git status                        # confirm nothing unexpected was written by the deploys
git add "<the paths above that exist>"
git commit -m "chore(deploy): record platform-assigned ids from the first Dev deploy"
git push                          # if you authorised pushes at 3.4 (H16)
```

**Why it is its own checkpoint and not part of Phase 13:** it is the single highest-value commit in the flow. Everything else between 3.4 and 13 can be re-authored from `SOLUTION-SPEC.md` and the starter docs — these values cannot be authored at all. Leaving them uncommitted through the cleanup audit (which deletes folders), the security and UX audits, and the ALM promotion meant the flow's most expensive artefacts spent its riskiest phases existing only in a working tree.

> **`git status` first, and read it.** A deploy can also write files you do **not** want committed — a `.env`, a PAC auth artefact, a build output that is not ignored. Stage paths explicitly; never `git add -A` here.

---

# Phase 9 — Cleanup audit (pass B)

The deploy is proven. Now remove what the solution turned out not to need — **repo-only** this time;
the one-way removals were pass A at 8.1a, and the two halves are one audit with one scope filter
(*would this exist in Dataverse after an import?*), not two different jobs.

## 9.1 Run the reporter

```powershell
node scripts/cleanup-audit.mjs
```

It reports and never deletes. Read all eight sections — particularly **§C**, the keep-list, and
**§D**, which names what each removal leaves importer-less *and why those files stay*.

> **Why this is a classifier and not "delete what nothing imports".** In the Code Site starter the
> demo home view is the **only** production importer of `src/config/flows.ts`, `useFlowErrorToast.ts`,
> `flowErrors.ts` and — apart from the dormant OTP module — `cloudFlow.ts`. In the Power Apps starter
> the example service is the only importer of `unwrap.ts`. Remove the demo views, as nearly every
> solution should, and a reachability sweep then proposes deleting the flows-only transport layer and
> the flow-result contract. Removals come from an explicit manifest; anything unlisted is **kept**.

## 9.2 The agent decides

Reconcile every candidate against [`SOLUTION-SPEC.md`](SOLUTION-SPEC.md) before proposing it — a
dormant module the spec promises for a later phase is *kept, conditionally*, not removed. Then draft
`audit/cleanup-audit-YYYY-MM-DD.md` from [the template](audit/TEMPLATE-cleanup-audit.md).

**Non-activated starters are deleted here**, whole. In the starter kit they are templates for the next
solution; in *this* repo they are a component the solution never built. `SOLUTION-SPEC.md` §12 becomes
the only surviving record of that decision, so name each one there.

## 9.3 Approve the removal list

> **YOUR TURN — H14: approve the cleanup removal list**
> (the agent cannot do this: deleting a starter or a component is a judgement about what this solution
> *is*, not a fact the repo holds)
>  1. Read the list. §C shows what is deliberately **not** on it.
>  2. Say "remove" — one yes for the whole list.
> **Then:** anything added to the list after this point carries its own approval.
> **Agent verifies:** the cleanup commit succeeds with the hooks enabled — `check-doc-boundaries.mjs`
> exit 0, `check-template-guards.mjs` naming each removed starter in its skip list, and
> `apply-config.ps1 -Check` reporting no drift.
> **What that does *not* prove:** that the list was *right*. Over-deletion passes every gate. The
> defence is the Phase 3.4 baseline commit — `git checkout <baseline> -- "<folder>"` restores anything,
> permanently.

## 9.4 Remove, re-point the docs, prove it

Run **`/cleanup-audit B`**. It uses `git rm`, one commit per category, and puts each removal's wiring
edits in the **same commit** as its deletions. Two rules that are not style preferences:

- **A starter deletion and its root-doc link repairs are one commit.** `check-doc-boundaries.mjs` is a
  pre-commit gate, so a commit that deletes the folder without the doc edits cannot be made at all. The
  reporter's §F gives the exact `doc:line` list. Prune the row or the link; **never rewrite the
  surrounding prose, and leave the Critical Rules whole** — delete the code, keep the rules.
- **Never annotate a removal with the token you removed.** Naming a removed schema name in an XML or
  `.ts` comment makes that starter's own guard *and* `check-template-guards.mjs` fire on the
  explanation, and the pre-commit hook runs the latter. Describe it instead.

Then §G: the prose no gate ever link-checks — skills and READMEs that mention a folder that is now gone.

**Then push them.** `/cleanup-audit B` commits locally, one commit per category; nothing sends them.

```powershell
git log --oneline <baseline>..HEAD    # review the removal commits as a set
git push                             # if you authorised pushes at 3.4 (H16)
```

A deletion is the change most worth having off the machine and reviewable: it is also the one whose per-category commits make `git revert` a real option, which a single squashed cleanup at Phase 13 would have thrown away.

---

# Phase 10 — Pre-go-live audits

`audit/README.md` has always named "before promoting to Stage/Prod" as the trigger for these, and the
flow never invoked them. It does now, **after** the cleanup, so no finding is written about a file that
was about to be deleted and the security audit's coverage section describes the code that actually ships.

## 10.1 Security audit

Run **`/security-audit <component>`** for **every activated component**, one report each, plus a short
`AUDIT-SUMMARY.md` when there is more than one. Read [`SECURITY-BASELINE.md`](SECURITY-BASELINE.md)
first: it says what already ships hardened, so the audit records a *weakened* control as a finding
rather than re-deriving the baseline.

## 10.2 UX audit

Run **`/ux-audit <app>`** — **only for components with a UI** (the Power App, the Code Site). Tables,
Env Vars and Flows have no UX, and inviting a heuristic review of a flow folder produces a fabricated
one. Suggestions only; this audit never changes code.

**If there is nothing to audit, say so and move on.** A Tables-plus-Env-Vars solution has no SPA and no
flow logic; writing an empty report to satisfy a phase is worse than skipping it, so record the
"nothing to audit" conclusion in the log instead.

## 10.3 Owner decisions

> **YOUR TURN — H15: annotate the audit findings**
> (the agent cannot do this: accepting a residual risk and declining a UX suggestion are your calls —
> no check can tell whether a risk is *truly* accepted)
>  1. Read each report and set a decision on every finding.
> **Then:** say "annotated".
> **Agent verifies:** no finding is left at its default — no `SUGGESTED` rows remain in the UX report,
> and every security row reads `FIXED` / `FIXED [needs deploy]` / `Documented` (with a non-empty
> rationale) / `Accepted` / `False positive`.

**Deferral is allowed to Stage, never to Prod.** Stated here so the phase is not something to work
around: an unresolved HIGH may travel to Stage with a recorded decision; it may not reach Production.

> These phases are the **first** run of a recurring review, not an init-only step. Re-run all three
> before every promotion — see "After Init Project" at the end of this file.

## 10.4 Checkpoint — commit the audit reports

```powershell
git add audit/ docs/          # docs/ only if a finding changed it
git commit -m "docs(audit): security + UX audit reports with owner decisions"
git push                      # if you authorised pushes at 3.4 (H16)
```

The reports are the **decision record** — including H15's annotations, where an owner accepted a residual risk or declined a UX suggestion. That is the one artefact here that cannot be regenerated by re-running the audit: a fresh run reproduces the findings, never the decisions about them. Commit it before Phase 11 sends anything to Stage, so the record predates the promotion it justifies.

---

# Phase 11 — Promote through ALM (Stage / Prod)

Everything deployed above went to **SMKB-Apps-Dev only**. Stage and Production are reached through **Power Platform Pipeline**, never a deploy script.

**Phase 10's audits must be green, or their residual risks accepted in writing, before this phase** — that is `audit/README.md`'s stated trigger, and now the flow enforces the order rather than hoping for it.

- **Tables, Env Vars, Flows, Power Apps** travel in the solution — ensure their components are in it (env var `RootComponents`, flow `RootComponents`, the Code App's linked solution) and run the pipeline from the Maker portal.
- **Power Pages Code Site** promotes on its own two-track model: run **`/ppcs-promote-to-env`** and follow the [Code Site ALM guide](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/docs/ALM-CODE-SITES.md). Flow GUIDs are environment-specific, so re-register them (`/ppcs-register-flow`) in each target environment after promotion.

> **YOUR TURN — H11: run the Pipeline**
> (the agent cannot do this: portal-only by policy — the kit's deploy scripts refuse any non-Dev URL)
>  1. Maker portal → your solution → **Pipelines** → run the stage you want.
> **Then:** say "done".
> **Agent cannot verify this from here.** It will instead list what to check in the target environment: the solution imported, env vars have values *in that environment*, flows are on, and for a Code Site that `solution:check` passes and flow GUIDs were re-registered.

There is no manual "add ~200 portal components to the solution" step in the Code Site model — that was the old Liquid-portal workflow and no longer applies.

---

# Phase 12 — Document the solution

The kit ships a [`docs/`](docs/README.md) folder of solution-documentation **templates**. Now — with the solution built and deployed — populate them. Run **`/document-solution`**.

> **Agent instruction:** start from [`SOLUTION-SPEC.md`](SOLUTION-SPEC.md) — it already holds the intent,
> audiences, data model, rules and design decisions in the developer's own words, so `docs/` never has to
> reconstruct intent from code. Then reconcile it against what was actually built, and replace every
> `[FILL IN: …]` prompt with this solution's real details. Keep the general SMKB guidance already in each
> template, **cite the source file** for every non-obvious fact, and remove the `TEMPLATE` callout from the
> top of each file once populated.

- Fill in `docs/README.md` (index + one-paragraph summary) and `docs/00`–`docs/09`.
- Delete any section or row for a starter this solution did **not** activate.
- Keep component-name examples on the `smkb_<prefix>_<PascalName>` / `PREFIX - Name` convention.
- Where `SOLUTION-SPEC.md` and the built solution disagree, that is a **finding** — surface it, don't paper over it.
- The docs are **not** scanned by the deploy guards or `check-doc-boundaries.mjs`, so `[FILL IN]` placeholders never block a deploy — but a half-filled doc set is a review smell. **Phase 11 promotes to Stage; do not run the Production stage of the pipeline until these are complete** — that is the one ordering this phase's position after Phase 11 does not enforce for you.
- **Read the Phase 9 cleanup report first.** It records what was removed and why, so the docs describe what actually ships — the "delete any section for a starter this solution did not activate" rule above is the same decision, and the two must not disagree. If the cleanup removed a dependency (Pinia, the design system), the tech-stack page changes with it.

> **YOUR TURN — H12: review the drafted docs**
> (the agent cannot do this: business intent, retention decisions, approver identities)
>  1. Read the drafted `docs/` and correct anything the agent got wrong or could not know.
> **Then:** say "reviewed".
> **Agent cannot verify this** — whether a business statement is *true* is not checkable from the repo. It
> will instead list every fact it could not source from code or `SOLUTION-SPEC.md`, so the review has a
> definite scope rather than "read all ten files".

Once H12's corrections are in, commit the set:

```powershell
git add docs/ SOLUTION-SPEC.md
git commit -m "docs: solution documentation set, reviewed"
git push                      # if you authorised pushes at 3.4 (H16)
```

`SOLUTION-SPEC.md` goes with it: drafting `docs/` is the last point at which the spec is edited — §12's "removed at the cleanup audit" line is filled from the Phase 9 report — so the input artefact and the output artefact become consistent in one commit.

---

# Phase 13 — Commit the initialized state

```powershell
git status                       # review what will be staged
git add "SMKB - [Solution Name] - Dataverse Tables" solution.config.json SOLUTION-SPEC.md docs ...
git commit -m "chore: activate starters and apply solution config for [Solution Name]"
git push
```

> **YOUR TURN — H13: approve the final commit**
> (the agent cannot do this: it is the last look at the tree before init is declared done)
>  1. Review `git status` and the staged paths. By now this should be a **small** remainder —
>     everything substantial was committed at its own checkpoint (6.2a, 7.1, 8.8, 9.4, 10.4, 12).
>     Anything large or surprising here means a checkpoint was skipped; find out which before committing.
>  2. Confirm `git log --oneline <baseline>..HEAD` reads as the build narrative you expect, and that
>     `git status` shows nothing ahead of the remote that you did not intend to push.
>  3. Say "commit" / "push".
>
> **Agent verifies:** it stages **specific paths** rather than `git add -A`, to avoid committing `.env`/credential files created during setup.

This marks the boundary between "initialized from template" and "active development".

> **This is no longer the first push.** It used to be: the flow committed at 3.4 and then nothing until
> here, so the folder renames, the whole build, the deploy's generated ids, the cleanup deletions and the
> audit reports all left the machine at once, in one commit, at the very end. Phase 13 is now a
> **boundary marker**, not a delivery — if it is doing real work, the checkpoints above were not run.

---

## Updating the design system (the only step that needs an npm token)

Not part of Init Project. Do this when a solution needs a **newer** `@smkbacil/design-ui` than the one
vendored in the repo — otherwise never.

`@smkbacil/design-ui` is a private package, so fetching a new version needs a credential. Fetching is
the *only* thing that does: once the tarball is committed, installs, CI and every deployed environment
resolve it from disk.

> **YOUR TURN — update the vendored library**
> (the agent cannot do this: it needs an npm credential, which only a person can mint)
>  1. Mint an npm token with **read** access to the `@smkbacil` scope.
>  2. In a PowerShell terminal at the repo root:
>     ```powershell
>     $env:NPM_TOKEN = "<your token>"
>     powershell -ExecutionPolicy Bypass -File scripts/vendor-design-ui.ps1 -Version <x.y.z>
>     ```
>  3. Commit the changed `vendor/*.tgz`, `package.json` and lockfiles **together**.
> **Then:** paste the script output back.
> **Agent verifies:** the script refuses to proceed unless the packed tarball's sha512 matches the
> integrity the registry itself reports, so a corrupted or substituted download cannot land. Then
> `scripts/vendor-design-ui.ps1 -Check` (no token needed) and a cold `npm ci` with no credential.

Two things that will otherwise cost you an afternoon:

- **`npm whoami` is the credential check — a successful `npm install` is not.** The npm/pnpm cache
  serves a warm install indefinitely after a token dies. One initialization concluded *twice* that the
  token was fine while CI, which has no cache, failed on every consumer.
- **The token is org-wide.** If it has expired, every consuming repo was already failing, not just this
  one. Mint once and update it wherever it is stored.

---

## After Init Project — Regular Development

From this point on, every new Claude session is a **regular session start**:
- Claude reads CLAUDE.md, **reads** which starters are active (from `solution.config.json` and the folder names — it does not ask), and confirms solution identity
- Claude will NOT offer to run Init Project again (the remote no longer points to the starter kit)
- Development and deployment follow each starter's own README; solution-wide identity changes go through `solution.config.json` + `apply-config.ps1`
- Keep [`SOLUTION-SPEC.md`](SOLUTION-SPEC.md) current as requirements change, and [`docs/`](docs/README.md) current as the solution evolves
- Re-run the pre-go-live reviews — **`/cleanup-audit`, `/security-audit`, `/ux-audit`** (the [audit templates](audit/README.md)) — and re-read [SECURITY-BASELINE.md](SECURITY-BASELINE.md) before **every** promotion to Stage/Prod. Phases 9–10 were the *first* run of a recurring review, not an init-only step

See [CLAUDE.md](CLAUDE.md) for the complete rules governing regular sessions.
