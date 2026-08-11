---
name: SMKB Solution — Cleanup Audit
description: >-
  Removes what this solution does not need, in two passes: components an import would make
  permanent in Dataverse (before the first deploy) and repo-only removals (after the deploy is
  proven). Reports from an explicit keep-list — never a sweep for unused files. One approval,
  one commit per category, every root gate green before it lands.
when_to_use: >-
  User says "cleanup audit", "remove the demo code", "delete the example scaffold", "trim the
  starter", "what can we delete", "remove the starters we don't use", or is at Init Project
  8.1a (pass A) or Phase 9 (pass B).
argument-hint: "[A|B]"
arguments: [pass]
disable-model-invocation: true
allowed-tools: Read Edit Write Grep Glob Bash(node *) Bash(git *) Bash(npm *) Bash(pnpm *) Bash(npx *) Bash(powershell *) Bash(pac *)
---

## Context

**Why two passes, and why the order is not negotiable.** An unmanaged solution import is an
**upsert**: `pac solution` has `add-solution-component` and **no remove counterpart**, so a component
deleted from the repo *after* it has been imported stays in the environment forever, removable only by
hand in the Maker portal. The Flows starter README records the real case — a solution that shipped two
unused bank connectors permanently. So anything that becomes a Dataverse component must be resolved
**before the first deploy** (pass A), and everything else waits until the deploy is **proven** (pass
B), where deleting it is free and where a red deploy has exactly one candidate cause.

**Where the wiring is, and why `grep import` finds the wrong things.** One removal touches 2–6 places,
and most of them are not import lines: a route object, a `manualChunks` entry, a `<RootComponent>` row,
a `<Workflow>` block, a mock-barrel export, a CSS selector group, a root-doc link. Two specific traps:
`@smkbacil/design-ui` components are registered globally, so a template can use `<SmkbButton>` with no
import at all — grep the **usage** (`@smkbacil|<Smkb|useSmkbToast|createSmkb`); and the guard tokens
live in each starter's own `deploy.ps1`, which the reporter reads rather than copying.

**This is a classifier, not a sweep — and that is the whole design.** In the Code Site starter
`src/views/HomeView.vue` is the *only* production importer of `src/config/flows.ts`,
`useFlowErrorToast.ts`, `flowErrors.ts` and (apart from the dormant OTP module) `cloudFlow.ts`. In the
Power Apps starter `exampleService.ts` is the only importer of `unwrap.ts`. Remove the demo views —
which nearly every solution should — and "delete what nothing imports" then proposes deleting the
flows-only transport layer and the flow-result contract: the two things that *are* the architecture.
So removals come from an **explicit manifest** in `scripts/cleanup-audit.mjs`; a file with no entry
defaults to **keep**; and there is no code path in that script from importer count to removal
candidate. `--self-test` asserts it. **Nothing in this skill may propose a removal the manifest does
not name** — if something ought to go and is not listed, add it to the manifest in a reviewed edit,
never by hand at audit time.

## Steps

1. **Run the reporter and read all eight sections.**
   ```powershell
   node scripts/cleanup-audit.mjs                     # the report
   node scripts/cleanup-audit.mjs --json              # the same data, for precision
   ```
   Exit **2** means the repo is still the pristine template — stop, there is nothing to clean.
   Exit **1** means the manifest is incoherent — fix the script, not the solution.
   §A and §B are the candidates, §C the keep-list, §D what each removal orphans (reassurance, never a
   proposal), §E the guards, §F the exact root-doc links a starter deletion breaks, §G prose no gate
   checks.

2. **Copy the template** to `audit/cleanup-audit-YYYY-MM-DD.md` and delete its `> **TEMPLATE**`
   callout. One report per pass, solution-wide — not one per component.

3. **Establish the pass A window from evidence, not from the phase number.** Read the reporter's
   `deploy-evidence` block and write the conclusion into the Scope line. Confirm with `pac solution
   list` if a profile is active. **If the window is closed, every §A row becomes
   `REMOVE [maker action required]`** and needs a named Maker-portal object — repo deletion is then a
   no-op on the environment. Never assume the window is open just because this is 8.1a.

4. **Reconcile every candidate against `SOLUTION-SPEC.md` before proposing it.** A dormant module the
   spec promises for a later phase is `KEPT — conditional (spec: "<quote>")`, not `REMOVE`. For the two
   feature-scoped env-var definitions, check mechanically rather than guessing — grep the Cloud Flows
   `Workflows/*.json` for each definition's schema name:
   ```powershell
   Select-String -Path "<flows>\Workflows\*.json" -Pattern "OtpDailyCap|SecurityAlertEmails"
   ```
   A hit is `KEPT — in use`. Zero hits **and** no OTP module is `REMOVE`, in **pass A**.

5. **Fill the report, then PAUSE for the single approval.** Present §A and §B together, each row with
   its disposition, **and §C visible** so the developer can see what is deliberately *not* on the
   table. Frame pass A as the default — "these arrive permanently if we deploy as-is". If the list runs
   past ~10 items, split it and say why. Record the date and the developer's exact words under
   *Approval*. **Any item added after that point carries its own approval.**

6. **Execute with `git rm`, one category per commit.** Never a plain `rm`: `git rm` stages the
   deletion, refuses when the file has uncommitted edits, and keeps each category revertible on its
   own. Put each removal's **wiring edits in the same commit as its deletions** — step 12 explains why
   that is not a style preference. Tag the pre-cleanup state first if you want a single anchor:
   ```powershell
   git tag pre-cleanup-pass-a        # or pre-cleanup-pass-b
   ```

7. **Pass A, XML starters — the folder and its RootComponent row are one edit.** Delete
   `Entities/<name>/` or the definition folder **and** its `<RootComponent>` line in
   `Other/Solution.xml` together; for a flow skeleton, also its `<Workflow>` block in
   `Other/Customizations.xml` — all three files or none. Then prove the package still builds, before
   the import rather than during it:
   ```powershell
   pac solution pack --zipfile "<starter>\_dist\verify.zip" --folder "<starter>" --packagetype Unmanaged
   ```
   `_dist/` is gitignored, so this leaves nothing behind. flow-lint now checks every pairing in both
   directions, so a half-removal fails the lint instead of surfacing in Stage.

8. **Dropping one of the four shipped env-var definitions is three edits or none:** the folder, its
   `<RootComponent>` row, **and** its name in `$script:shippedEnvVars` in the root `apply-config.ps1`.
   Miss the third and `Rename-AlmFolder` reports "neither name present" on every run, so
   `apply-config.ps1 -Check` is **permanently red** — failing the pre-commit hook and CI's `root-gates`
   job for the life of the repo. Only `OtpDailyCap` and `SecurityAlertEmails` are droppable;
   `EnvironmentName` and `FlowErrorEmails` stay whenever Cloud Flows is activated.

9. **Do not annotate a removal with the name you removed.** Describe it: *"the example table entities
   shipped with the starter were removed"*. Writing the schema name or data-source name into an XML,
   `.ts`, `.vue` or `.json` comment makes that starter's own `deploy.ps1` placeholder scan **and**
   `check-template-guards.mjs` fire on your explanation — and since the pre-commit hook runs the
   latter, **the commit is refused**. `<PowerApps>/src/generated/index.ts` demonstrates the technique
   in its own header; read it before writing any note. (Markdown is scanned by no guard, so the audit
   report itself can name things plainly.)

10. **Pass B, Code Site — the order is fixed.** Demo views + their route objects and imports → the CSS
    selector groups → the dormant OTP module → the dormant dependency. Never reorder: removing the
    module first leaves three keep-list files looking orphaned to anyone reading mid-cleanup.

11. **The two route invariants.** After removing the demo routes, **a route must still match
    `path: '/'`** — the catch-all yields a 404, not a landing page — and the catch-all must keep
    `name: 'not-found'`, because it is the sole member of `STANDALONE_ROUTES` in `src/App.vue` and
    renaming it renders the 404 *inside* the layout shell. The Power Apps router carries no route
    names; its equivalent is `App.vue`'s `navItems`, which hardcodes `to: '/'`.

12. **The mock-barrel invariant.** Removing the Power Apps example deletes the `ExampleFlowService`
    export from `src/services/mock/generated.ts` — **but never empty that file.** `vite.config.ts`
    aliases every bare-barrel import to it in `mode === 'development'`, so an empty barrel breaks
    `pnpm dev` for every mocked flow. If this is the last export, wire the real flow's mock in the same
    commit.

13. **A starter deletion and its root-doc repairs are one commit.** `check-doc-boundaries.mjs` is a
    pre-commit gate, so a commit that deletes the folder without the doc edits **cannot be made at
    all**. Use §F's exact `doc:line` list and keep the edit mechanical — prune the row or the link,
    **never rewrite the surrounding prose**. Scope: only (i) links, rows and tree lines pointing at
    removed paths, and (ii) enumerations asserting what the repo contains ("Five sub-starter
    folders…"). **Leave the Critical Rules whole** — delete the code, keep the rules; they are the
    house standard and must read the same in every SMKB repo. Both checkers already treat an absent
    starter as a legitimate skip, so nothing else needs touching. Then act on §G, which no gate covers.

14. **Verify like CI does, not like a developer does.**
    ```powershell
    node scripts/cleanup-audit.mjs --self-test
    node scripts/check-doc-boundaries.mjs
    node scripts/check-template-guards.mjs
    powershell -ExecutionPolicy Bypass -File apply-config.ps1 -Check
    node "<flows>\tools\flow-lint\lint.mjs" "<flows>\Workflows"
    node "<flows>\tools\flow-lint\test.mjs"
    ```
    Then each SPA **cold**, so a stale `node_modules` cannot make a broken removal look fine:
    ```powershell
    # Code Site
    Remove-Item -Recurse -Force node_modules; Remove-Item -Force package-lock.json
    npm install --no-audit --no-fund; npm run lint; npm run test; npm run build
    ```
    ```powershell
    # Power Apps
    pnpm install --frozen-lockfile; pnpm lint; pnpm test; pnpm build
    npx vite build --mode development     # the ONLY check that exercises the dev mock alias
    ```
    Both SPAs set `noUnusedLocals`, so `build` (vue-tsc) catches a half-removal that left an import
    behind. `vue-tsc` resolves through tsconfig and **not** vite aliases, which is why the
    development-mode build is a separate line rather than redundant.

15. **CSS is the one bucket no tool can prove.** Grep each class across `src/**/*.vue` before editing;
    after, compare `dist/assets/index.css` size and load the remaining routes. Keep the reset block and
    `.main-content` — `App.vue` uses it. Say in the report that this bucket is advisory.

16. **Record the outcomes back into the report** — every disposition updated, *Kept by design*,
    *Guard interactions*, *Root-doc links repaired*, *Verified-safe*, *Verification*, and every
    Maker-portal action under *Owner actions*. The report is the decision log, amended in place across
    both passes; it is what stops the next audit re-litigating this one.

## Error Handling

- **The pre-commit hook refuses the deletion commit** — the root-doc repairs are in a different
  commit. Squash them together (step 13).
- **`check-template-guards.mjs` fails naming a comment** — a removal note spelled a guarded token
  (step 9). Describe it instead.
- **`apply-config.ps1 -Check` reports "neither name present"** — an env-var definition was dropped
  without its `$shippedEnvVars` entry (step 8).
- **`pac solution import` fails on an undeclared component** — a `<RootComponent>` row outlived its
  folder, or a new one was never added (step 7). `pac solution pack` catches this locally.
- **`pnpm dev` fails with "does not provide an export named …"** — the mock barrel was emptied (step 12).
- **The site root shows the 404 page** — no route matches `/` (step 11).
- **The 404 renders inside the header and layout** — the catch-all lost `name: 'not-found'` (step 11).
- **A keep-list file looks unused** — it is, by design. §C says why; §D says what orphaned it.
- **The reporter exits 2** — the solution identity is still the template's. Run this after Init
  Project Phase 2, and pass B only after the deploy is proven.

## Notes

- **One-way doors.** A **deployed** Dataverse component is not removed by deleting its repo files —
  entities, env-var definitions, workflows, connection references and site settings each need a hand
  deletion, and an entity with rows may refuse. A **deleted starter folder** cannot come back from the
  kit (Phase 3.1 removed that remote) but *is* recoverable from this repo's own history, because the
  deletion happens after the Phase 3.4 baseline commit: `git checkout <baseline> -- "<folder>"`. Say
  that rather than "irreversible" — a false warning gets ignored.
- **Removing the OTP module retires `/ppcs-enable-otp-auth`** for this solution. It is a no-op on CSP
  (the shipped site settings contain no Cloudflare or Turnstile host), and it orphans three keep-list
  files — `useTurnstile.ts`, `safeJson.ts`, `sessionCache.ts` — which stay.
- **Removing Pinia is three lines**, and the root `docs/02-tech-stack.md` plus the Code Site
  `CLAUDE.md` both name it, so the documentation phase must change with it.
- **When NOT to run this.** A solution still in active build; a spec with a promised later phase; or a
  repo where the first deploy has not been *proven* (imported **and** smoke-tested). Keeping a demo
  view for another week costs nothing. Deleting the transport layer costs a rebuild.
- **The gates prove consistency, not correctness.** Over-deletion passes every check. The baseline
  commit is the only real defence, which is why step 6 tags and commits per category.
- Sibling reviews: [`/security-audit`](../security-audit/SKILL.md) and
  [`/ux-audit`](../ux-audit/SKILL.md) run **after** this one (Init Project Phase 10), so they never
  write a finding about a file that is about to be deleted. Vocabulary and method:
  [`audit/README.md`](../../../audit/README.md).
