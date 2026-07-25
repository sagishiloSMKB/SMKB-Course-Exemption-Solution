# Audits

Repeatable pre-go-live reviews for an SMKB Power Platform solution. Two kinds, kept separate:

- **[Security & clean-code audit](TEMPLATE-security-audit.md)** — is the solution safe and well-built?
  Findings are defects with a severity and a fix status.
- **[UX audit](TEMPLATE-ux-audit.md)** — is the app usable? Findings are **suggestions only** (no code
  changed by the audit) that the owner accepts, defers, or declines.

## When to run

- **Before promoting to Stage/Prod** (the main trigger) — a solution should pass a security audit first.
- After a significant feature or a refactor of a security-relevant flow.
- Periodically, as a health check.

## How to run

1. Copy the relevant `TEMPLATE-*.md` to a dated, scoped name, e.g.
   `audit/<component>-audit-YYYY-MM-DD.md` (security) or `audit/<component>-ux-audit-YYYY-MM-DD.md` (UX).
   Audit **one component at a time** (a Cloud Flows folder, a Code App, a Code Site); a solution with several
   components gets several reports plus a short `AUDIT-SUMMARY.md` on top.
2. **Method — static, code-driven, verify-before-change.** Read the actual source/flow JSON/XML. **Verify
   every claimed finding against the code before proposing or making any change** — a plausible-looking
   issue that the code already handles is a false positive, and must be recorded as one, not "fixed".
3. Anchor the whole review to the SMKB invariant: **all network and data access originates in Power Automate
   flows; the SPAs are UI-only.** A direct Dataverse/HTTP call from an SPA is a finding by definition.
4. **Security audit:** may apply low-risk, locally-verifiable fixes (type-check clean with `vue-tsc`; flow
   JSON still valid); anything risky or behavior-changing is **documented, not auto-changed**. Mark items
   that only take effect after a redeploy as **[needs deploy]**.
5. **UX audit:** **suggestions only — never change code.** The owner annotates each with a decision.

## Shared vocabulary

**Severity:** `CRITICAL` · `HIGH` · `MED` · `LOW` · `INFO`.

**Security categories:** `Security/Injection` · `Security/Authorization` · `Secrets hygiene` ·
`Clean-code` · `Docs`.

**Security status:** `FIXED` · `FIXED [needs deploy]` · `FIXED [needs install]` · `Documented` (rationale
required) · `Accepted` (mitigated) · `False positive` (why the code is already safe).

**UX decision (owner-annotated):** `SUGGESTED` · `IMPLEMENTED` · `PARTIALLY IMPLEMENTED` · `BY DESIGN` ·
`WITHDRAWN`.
