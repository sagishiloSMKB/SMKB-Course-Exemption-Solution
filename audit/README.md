# Audits

Repeatable pre-go-live reviews for an SMKB Power Platform solution. **Three** kinds, kept separate:

- **[Cleanup audit](TEMPLATE-cleanup-audit.md)** — does the solution still contain things it does not
  use? Findings are **removal candidates** the developer approves as one list. It runs in **two passes**
  because an unmanaged solution import is an *upsert*: what an import made permanent can only be removed
  *before* the import.
- **[Security & clean-code audit](TEMPLATE-security-audit.md)** — is the solution safe and well-built?
  Findings are defects with a severity and a fix status.
- **[UX audit](TEMPLATE-ux-audit.md)** — is the app usable? Findings are **suggestions only** (no code
  changed by the audit) that the owner accepts, defers, or declines.

Run them in that order. Cleanup first, so the other two review only the code that ships and no finding is
written about a file that is about to be deleted.

## When to run

- **Before promoting to Stage/Prod** (the main trigger) — a solution should pass a security audit first.
- After a significant feature or a refactor of a security-relevant flow.
- Periodically, as a health check.

**The cleanup audit runs on its own schedule**, because half of it is irreversible afterwards:

- **Pass A — before the first deploy** (Init Project **8.1a**): only components an import would make
  permanent. An unmanaged import is an upsert and `pac solution` has no remove counterpart, so a
  component deleted from the repo after the import survives in the environment and can only be removed by
  hand in the Maker portal. One real solution shipped two unused bank connectors that way.
- **Pass B — once the deploy is proven** (Init Project **Phase 9**): everything else. Deferring it costs
  nothing, and it means a red first deploy has exactly one candidate cause. It also matters that the Code
  Site's demo home view *is* the end-to-end smoke test, so removing it earlier would discard the only
  such check the kit ships.

Security and UX first run at Init Project **Phase 10** — that is the first firing of the trigger above,
not a separate rule.

## How to run

1. Copy the relevant `TEMPLATE-*.md` to a dated, scoped name, e.g.
   `audit/<component>-audit-YYYY-MM-DD.md` (security) or `audit/<component>-ux-audit-YYYY-MM-DD.md` (UX).
   Audit **one component at a time** (a Cloud Flows folder, a Code App, a Code Site); a solution with several
   components gets several reports plus a short `AUDIT-SUMMARY.md` on top.
   **The cleanup audit is the exception — it is solution-wide:** `audit/cleanup-audit-YYYY-MM-DD.md`, one
   report per pass. Its subject is what the solution does *not* contain, and the evidence crosses component
   boundaries (a starter deletion edits the root docs; removing flows orphans a Code Site registry).
2. **Method — static, code-driven, verify-before-change.** Read the actual source/flow JSON/XML. **Verify
   every claimed finding against the code before proposing or making any change** — a plausible-looking
   issue that the code already handles is a false positive, and must be recorded as one, not "fixed".
3. Anchor the whole review to the SMKB invariant: **all network and data access originates in Power Automate
   flows; the SPAs are UI-only.** A direct Dataverse/HTTP call from an SPA is a finding by definition.
4. **Security audit:** may apply low-risk, locally-verifiable fixes (type-check clean with `vue-tsc`; flow
   JSON still valid); anything risky or behavior-changing is **documented, not auto-changed**. Mark items
   that only take effect after a redeploy as **[needs deploy]**.
5. **UX audit:** **suggestions only — never change code.** The owner annotates each with a decision.
6. **Cleanup audit:** `scripts/cleanup-audit.mjs` reports, the agent decides, the developer approves **one
   list** (never item by item), the agent applies it, and the pre-commit hook proves it — that hook is the
   only thing that runs all three root gates against the actual staged change. Two standing rules:
   - **It is a classifier, not a sweep.** Removals come from an explicit manifest; a file with no entry
     defaults to *keep*. "Delete what nothing imports" would delete the flows-only transport and the
     `unwrap()` contract the moment the demo views go, because the demo views are their only importers.
   - **Never propose one of the six root docs** in `check-doc-boundaries.mjs`'s `DOCS` list — deleting one
     needs a matching code change in two places, and the checker treats a missing root doc as an error.

## Shared vocabulary

**Severity:** `CRITICAL` · `HIGH` · `MED` · `LOW` · `INFO`.

**Security categories:** `Security/Injection` · `Security/Authorization` · `Secrets hygiene` ·
`Clean-code` · `Docs`.

**Security status:** `FIXED` · `FIXED [needs deploy]` · `FIXED [needs install]` · `Documented` (rationale
required) · `Accepted` (mitigated) · `False positive` (why the code is already safe).

**UX decision (owner-annotated):** `SUGGESTED` · `IMPLEMENTED` · `PARTIALLY IMPLEMENTED` · `BY DESIGN` ·
`WITHDRAWN`.

**Cleanup categories:** `Demo` · `Dormant` · `Style` · `Dep` · `Starter` · `Prose`.

**Cleanup disposition:** `REMOVED` · **`REMOVE [maker action required]`** (the repo files are gone but the
Dataverse component survives — name the object and the portal path, and repeat the row under *Owner
actions*) · `KEPT — convention` (on the keep-list; a documented reference the next developer reaches for)
· `KEPT — in use` (it has live importers; recorded so the report proves coverage) ·
`KEPT — conditional (<condition>)` · `DEFER` (an owner decision, with the date) · `ALREADY ABSENT`.

There is deliberately **no** disposition a tool can invent. Every `REMOVE` row exists because a human put
it in the manifest.

**Cleanup pass:** `A` (an import would make it permanent) · `B` (repo-only). The pass is **derived** from
whether the item becomes a Dataverse component, never hand-assigned — so an item cannot drift into the
wrong pass and ship permanently.
