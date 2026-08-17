---
name: SMKB Solution — Security Audit
description: >-
  Runs a repeatable pre-go-live security and clean-code review of one component from
  the audit template: static, verify-before-change, anchored to the UI-only/flows-only
  invariant. Applies only low-risk vue-tsc-clean fixes; tags runtime changes [needs deploy].
when_to_use: >-
  User says "security audit", "review for security", "audit before go-live",
  "pre-prod review", or before promoting a component to Stage/Prod.
argument-hint: "<component-folder>"
arguments: [component]
allowed-tools: Read Edit Write Grep Glob Bash(pnpm *) Bash(npm *) Bash(node *)
---

## Context

A security audit is method-heavy, and its discipline is what keeps it honest: **static analysis, one
component at a time, and every claimed finding verified against the actual code before any change** — a
plausible issue the code already handles is a **False positive**, recorded as such, not "fixed". The whole
review is anchored to the SMKB invariant: **all network/data access originates in Power Automate flows; the
SPAs are UI-only** — a direct Dataverse/HTTP call from an SPA is a finding by definition. The skill produces
a dated report from [`audit/TEMPLATE-security-audit.md`](../../../audit/TEMPLATE-security-audit.md); it may
apply **low-risk, locally-verifiable** fixes (`vue-tsc` clean, flow JSON still valid) but **documents**
anything risky or behavior-changing, tagging runtime changes **[needs deploy]**. See
[audit/README.md](../../../audit/README.md) for the vocabulary.

## Steps

1. Copy the template to a dated, scoped report:
   `audit/<component>-audit-YYYY-MM-DD.md` (audit **one** component per report).
1b. **Read [`SECURITY-BASELINE.md`](../../../SECURITY-BASELINE.md) first.** It is the **expected** state of
   any solution from this kit: the shipped defaults, the statically-enforced invariants, and the accepted
   trade-offs — each with its reasoning. Use it two ways:
   - **Verify the baseline is intact**, and record what you confirmed under **Verified-safe** (step 3).
     A control that has been weakened *is* a finding — e.g. a login site setting flipped back to `true`,
     a CSP directive dropped, `secureData` removed from a secret read.
   - **Do not re-raise an accepted trade-off as a finding.** The document lists them explicitly
     (`style-src 'unsafe-inline'`, response timing, no hash for a code/token, a value in a `Compose`
     output, no per-IP limiting in a flow, first-bytes-only file checks). If you believe one is wrong,
     say so as a **recommendation with new evidence** — not as a rediscovered defect.

   Your value is in what *this* solution added on top of the baseline. Spend the effort there.

2. **Static pass** — read the actual source / flow JSON / XML. For each candidate finding, **prove it against
   the code before writing it down.** Check at least:
   - the UI-only boundary (no direct `fetch`/XHR/OData from the SPA; ESLint bans intact),
   - injection escaping in flows (OData `$filter` quote-escape; URL `encodeUriComponent`),
   - authorization (session-token validation before data access, and the acting user resolved from the
     **session row** — a client-supplied id must never select the target record),
   - secrets (Secret-typed env vars read via `RetrieveEnvironmentVariableSecretValue`; no committed
     defaults/emails; Secure I/O on the fetch **and** on whatever consumes it),
   - safe error handling (HTTP-200 `errorCode`; `Handle_Flow_Error` leaks nothing),
   - anti-enumeration on unauthenticated endpoints (one generic code — a distinct not-found/expired/wrong
     response is an account-existence oracle),
   - server-side validation of any upload (extension + magic bytes + size cap + server-generated filename).
3. Record findings with `ID · Severity · Category · Status`. Categories: Security/Injection,
   Security/Authorization, Secrets hygiene, Clean-code, Docs. For **False positive**, show why the code is
   already safe. Fill the **Verified-safe** section (coverage, not just findings) — including the baseline
   controls you confirmed, so a reader can see what was checked and passed, not only what failed.
4. **Apply only low-risk fixes** and verify locally:
   ```powershell
   pnpm run build   # or npx vue-tsc --noEmit - must exit 0 for any SPA touched
   node "<component>/tools/flow-lint/lint.mjs"   # if flows
   ```
   Tag any fix that only takes effect after a redeploy **[needs deploy]**. Leave risky/behavior-changing
   items **Documented** with rationale.
5. Fill Verification + Recommended-next-steps. **PAUSE** — present the report; the owner decides on the
   Documented/[needs deploy] items.

## Error Handling

- **Can't run ESLint (private registry):** note it in Verification as not-run-here; don't claim the lint gate passed.
- **A "finding" the code already handles:** record it as **False positive** with evidence — do not change working code.
- **A fix would change runtime behavior:** do not auto-apply — Document it, tag **[needs deploy]**, and let the owner decide.

## Notes

- Findings stay project-specific (they live in the dated report, not the template).
- UX is a **separate** review — `/ux-audit` (suggestions-only). Run both before Stage/Prod promotion.
