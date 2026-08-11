# [Solution] — Cleanup Audit

> **TEMPLATE.** Copy to `audit/cleanup-audit-YYYY-MM-DD.md` and delete this callout in the copy.
> Unlike the other two audits this one is **solution-wide — one report per pass, not one per
> component**, because its subject is what the solution does *not* contain: a starter deletion touches
> the root docs, and a flows removal touches a Code Site registry.
> Method, vocabulary and the two-pass rule: [audit/README.md](README.md).
> Run it with [`/cleanup-audit`](../.claude/skills/cleanup-audit/SKILL.md).

**Scope:** [FILL IN: the activated starters, and which pass this report covers — A, B, or both.]
**Date:** [FILL IN]
**Method:** reported by `scripts/cleanup-audit.mjs` from an **explicit keep-list**, not a
reachability sweep. Every removal verified against the code before deletion; every keep carries its
reason.

> **Pass A window:** [FILL IN: OPEN or CLOSED, and the evidence.] An unmanaged solution import is an
> **upsert** — `pac solution` has `add-solution-component` and **no remove counterpart** — so once a
> component has been imported, deleting it from the repo does **not** remove it from the environment.
> If the window is closed, every §Pass A row below is `REMOVE [maker action required]` and needs a hand
> deletion, not a commit.

**Headline:** [FILL IN: 2–4 sentences. What was removed, what was deliberately kept and why, and
plainly whether anything now needs a manual deletion in the Maker portal.]

---

## Approval

**Approved:** [FILL IN: date] — [FILL IN: the developer's exact words.]
**The list as approved:** [FILL IN: the IDs.]

> Items added **after** this line carry their own approval. "Approved once" is one yes to a list that
> was presented, not a standing licence for a list that grew.

---

## Pass A — components an import would make permanent

| ID | Category | Item | Guard | Disposition |
|----|----------|------|-------|-------------|
| A1 | [Demo/Dormant] | [FILL IN] | [forced by the deploy guard / **INVISIBLE to every gate**] | [REMOVED / REMOVE [maker action required] / KEPT — … / DEFER] |

> The **Guard** column is the point of this table, not decoration. Most Pass A items are already
> forced — each starter's `deploy.ps1` blocks on their placeholder tokens, so a correct deploy is
> impossible while they exist. The rows that matter are the ones marked *invisible to every gate*:
> `apply-config.ps1` renames the four shipped env-var definitions to the solution's real prefix,
> **past** the guard, so a solution with no rate-sensitive send path deploys `OtpDailyCap` and
> `SecurityAlertEmails` silently and permanently. A Pass A that reads as ceremony over things four
> guards already block is a Pass A that gets skipped — taking those two with it.

## Pass B — repo-only

| ID | Category | Item | Wiring points | Disposition |
|----|----------|------|---------------|-------------|
| B1 | [Demo/Dormant/Style/Dep/Starter/Prose] | [FILL IN] | [FILL IN: n places] | [REMOVED / KEPT — … / DEFER] |

---

## Removals in detail

### A1 / B1 — [Category] · [path or component] — **[DISPOSITION]**

- **What it was:** [FILL IN]
- **Wiring points:** [FILL IN: numbered. Deletions and edits separately — an edit is not a deletion.]
- **Orphans, and why they are kept:** [FILL IN: what lost its last importer, and the keep reason for
  each. If this list is empty, say so — an empty list is information.]
- **Verification:** [FILL IN: the commands and their results.]

---

## Kept by design (the keep-list)

The section that makes this report safe to re-read. A file here has **no importers and that is
correct**; the next agent must read this before touching anything.

| Path | Role | Why it has no importers | Tier |
|------|------|-------------------------|------|
| [FILL IN] | [FILL IN] | [FILL IN] | [PROTECTED / convention] |

> **PROTECTED** entries are the architecture — the flows-only transport, the `unwrap()` contract, the
> generated barrel, the dev-mock target. `scripts/cleanup-audit.mjs --self-test` fails in CI if a
> future version of the kit ever lists one for deletion. **convention** entries are helpers a solution
> may legitimately delete later in its own life; this audit simply never proposes them.
>
> Worth stating plainly: removing the demo views leaves four Code Site files with no production
> importer, and removing the Power Apps example leaves `unwrap.ts` with none. A reachability sweep run
> at that moment would delete the transport layer and the flow-result contract — the two things that
> *are* the architecture. That is why this audit is a classifier and not a sweep.

## Guard interactions

| Guard | What it forbids | How this cleanup stayed clear |
|-------|-----------------|-------------------------------|
| `<starter>/deploy.ps1` placeholder scan | its own `$placeholders` tokens, in **any** `*.xml` / `*.ts` / `*.vue` / `*.json` — comments included | [FILL IN] |
| `scripts/check-template-guards.mjs` | a guarded token written inside a **comment** in a shipped file | [FILL IN] |
| `scripts/check-doc-boundaries.mjs` | a broken relative link in any of the six root docs | [FILL IN] |
| `<CodeSite>/src/router/index.ts` pin | the literal lazy-import arrow form, anywhere in that file | [FILL IN] |

> **Never annotate a removal with the token you removed.** Explaining a Pass A edit by naming the
> schema name you just deleted makes that starter's own guard *and* `check-template-guards.mjs` fire
> on your explanation — and since the pre-commit hook runs the latter, the commit is refused. Describe
> the token instead; `<PowerApps>/src/generated/index.ts` demonstrates the technique.
> Markdown is scanned by no guard, so this report is safe to write plainly.

## Root-doc links repaired

| Doc:line | Pointed at | Action | Commit |
|----------|-----------|--------|--------|
| [FILL IN] | [FILL IN] | [row pruned / de-linked, prose kept] | [FILL IN] |

> A starter deletion and its doc-link repairs must be **one commit** — `check-doc-boundaries.mjs` is a
> pre-commit gate, so a commit that deletes the folder without the edits cannot be made at all.

## Prose that dangled (no gate checks these)

| File:line | What it claimed | Action |
|-----------|-----------------|--------|
| [FILL IN] | [FILL IN] | [FILL IN] |

> `check-doc-boundaries.mjs` link-checks six root docs. It does **not** check `audit/**`,
> `.claude/skills/**`, or prose that merely mentions a folder without linking it. Nothing will ever
> fail because of these — §G of the reporter is the only thing that finds them.

## Owner / environment actions

Cannot be confirmed from the repo.

| Owner action | How to confirm | Status |
|--------------|----------------|--------|
| [FILL IN: e.g. delete the env-var definition in the Maker portal] | [FILL IN] | [open/done] |

## Deferred (with rationale)

| ID | Item | Why deferred | Revisit when |
|----|------|--------------|--------------|
| [FILL IN] | [FILL IN] | [FILL IN: e.g. `SOLUTION-SPEC.md` promises it for phase 2] | [FILL IN] |

## Verified-safe (checked, nothing to remove)

Coverage, not findings — what was inspected and deliberately left alone. Include every keep-list entry
confirmed intact and every dependency confirmed still reachable.

[FILL IN. This section is what shows the review had coverage. It is also what stops the next audit
re-litigating a decision this one already made.]

## Verification

| Check | Command | Result |
|-------|---------|--------|
| manifest coherence | `node scripts/cleanup-audit.mjs --self-test` | [FILL IN] |
| root doc links | `node scripts/check-doc-boundaries.mjs` | [FILL IN] |
| template guards | `node scripts/check-template-guards.mjs` | [FILL IN] |
| config drift | `apply-config.ps1 -Check` | [FILL IN] |
| flow rules | flow-lint `lint.mjs` + `test.mjs` | [FILL IN] |
| XML still packs | `pac solution pack` per XML starter | [FILL IN] |
| SPAs, cold | `lint` + `test` + `build` after a clean install | [FILL IN] |
| the dev mock barrel | `npx vite build --mode development` (Power Apps) | [FILL IN] |
| **the whole set, on the staged change** | **the cleanup commit succeeds with the hooks enabled** | [FILL IN] |

**What could not be verified here:** [FILL IN. At minimum: CSS removal has no type-checker and no
lint rule — it is the one advisory bucket; and a Maker-portal deletion needs the portal.]

> The gates prove that **what remains is consistent**. They cannot prove the removal list was
> *right* — over-deletion passes every check. The defence against that is the Phase 3.4 baseline
> commit: `git checkout <baseline> -- "<folder>"` restores anything, permanently.

## Recommended next steps

1. [FILL IN: the Maker-portal deletions, if any.]
2. [FILL IN: docs pages that must now describe the solution differently — e.g. `docs/02-tech-stack.md`
   names Pinia.]
3. [FILL IN: anything deferred.]
