# [Component] — Security & Clean-Code Audit

> **TEMPLATE** — copy to `audit/<component>-audit-YYYY-MM-DD.md` and fill in. See [audit/README.md](README.md)
> for method and vocabulary. Delete this callout in the copy.

**Scope:** `[FILL IN: the component folder + what's in it — e.g. N flows (X PowerPages, Y PowerAppV2), or a
Code App / Code Site]`.
**Date:** `[FILL IN: YYYY-MM-DD]` · **Method:** static analysis of every source/flow JSON/env-var/Solution.xml;
**each finding verified against the actual action/expression before any change**. Anchored to the SMKB
invariant: **all network/data access originates in flows; the SPAs are UI-only.**

**Headline:** `[FILL IN: 2–4 sentences — the overall posture, what held up well, and the real issues. State
plainly if there are no Critical issues.]`

> **Deploy note:** fixes that edit flow JSON / env-var XML / site settings take effect only after a
> re-import / re-deploy. Items marked **[needs deploy]** change runtime behavior. `[FILL IN: state whether a
> deploy was performed.]`

## Severity-ranked findings

| ID | Sev | Category | Finding | Status |
|----|-----|----------|---------|--------|
| `[F1]` | HIGH | Security/Injection | `[FILL IN: one line]` | FIXED [needs deploy] |
| `[…]` | `[…]` | `[…]` | `[…]` | `[…]` |

## Findings & fixes

`[FILL IN: repeat this block per finding. Cite the exact file + action/expression. For a "Documented" or
"Accepted" item, give the rationale; for "False positive", show why the code is already safe.]`

### F1 — HIGH · Security/Injection · [short title] — **[STATUS]**
`[FILL IN: source file → action/expression]`. `[FILL IN: what the code does and why it's a problem.]`
- **Risk:** `[FILL IN]`.
- **Fix applied:** `[FILL IN — or "Recommendation:" / "Rationale:" for not-changed items]`.

## Deployment-readiness one-glance checks

`[FILL IN: confirm each. These are cheap to check and each one prevents a silent outage or a
half-delivered promotion.]`

| Check | Why it matters | Status |
|---|---|---|
| Power Pages site type is **Production**, not Trial (`pac pages list -v`) | Every site is created as a trial; unconverted, it is suspended at day 90 and its **host deleted** 7 days later | `[FILL IN]` |
| Site + all its components are in the solution (`npm run solution:check`) | A Pipeline promotes only what the solution holds, so a gap makes the promotion *succeed* with a misconfigured target | `[FILL IN]` |
| Env var definitions all have a `type="380"` RootComponent | Without it a definition imports but never travels to Stage/Prod | `[FILL IN]` |
| Secret env vars hold a Key Vault reference, not a literal | `[FILL IN]` | `[FILL IN]` |
| Flows are **On** in the target (imports land them Draft/Inactive) | `[FILL IN]` | `[FILL IN]` |

## Security baseline intact

The kit ships a hardened default posture — see [SECURITY-BASELINE.md](../SECURITY-BASELINE.md). Confirm
each control is still in place; a **weakened** one is a finding, and the baseline is what a reviewer is
entitled to assume was true before this solution was built on top of it.

| Baseline control | How to confirm | Status |
|---|---|---|
| The 6 built-in login/registration paths are still `false` | grep `.powerpages-site/site-settings/auth-*-disabled.sitesetting.yml` | `[FILL IN]` |
| CSP still carries `object-src 'none'`, `base-uri 'self'`, `upgrade-insecure-requests`, `frame-ancestors 'self'`, `form-action 'self'` | both CSP files, and they are still **byte-identical** to each other | `[FILL IN]` |
| `Referrer-Policy` + `Permissions-Policy` settings present | site-settings folder | `[FILL IN]` |
| HSTS is emitted by the platform | `curl -I https://<site>` — do **not** add a competing site setting | `[FILL IN]` |
| Every site setting has a real GUID, not a placeholder | grep for `aaaaaaaa-` → zero matches | `[FILL IN]` |
| flow-lint passes with no error, incl. the `secureData` rules | `node "<flows>/tools/flow-lint/lint.mjs"` | `[FILL IN]` |
| `vue/no-v-html` and the no-direct-network rules are intact | each SPA's `eslint.config.js` | `[FILL IN]` |
| Unauthenticated endpoints return one generic code (no not-found / expired / wrong split) | read the OTP flows' Response bodies | `[FILL IN]` |
| Every record operation is scoped by a **session-resolved** owner | read each authenticated flow's `$filter` / `recordId` | `[FILL IN]` |
| Uploads validated server-side (extension + magic bytes + size + generated filename) | read the upload flow | `[FILL IN]` |
| Global cap + abuse alert env vars are set in this environment | `smkb_<prefix>_OtpDailyCap`, `smkb_<prefix>_SecurityAlertEmails` | `[FILL IN]` |
| OTP/session tables are restricted to the service account | Dataverse security roles | `[FILL IN]` |
| Run-history access is limited (the fallback for values that cannot be secured) | flow owners/co-owners + environment admins | `[FILL IN]` |

## Verified-safe (checked, no issue)

`[FILL IN: controls you checked and confirmed correct — including the baseline rows above that passed.
Do NOT re-raise an accepted trade-off from SECURITY-BASELINE.md as a finding (style-src 'unsafe-inline',
response timing, no hash for a 6-digit code or session token, a value in a Compose output, no per-IP
limiting in a flow, first-bytes-only file checks) — each has documented reasoning. If you think one is
wrong, raise it as a recommendation with new evidence. This section shows the review had coverage, not
just findings.]`

## Verification

- `[FILL IN: type-check clean — vue-tsc → exit 0 for each SPA touched; all flow JSON still valid; flow-lint
  passes.]`
- `[FILL IN: what could NOT be verified here and why — e.g. ESLint needs a private-registry install; flow
  behavior changes need a redeploy.]`

## Recommended next steps

1. `[FILL IN: redeploy the [needs deploy] items to Dev and smoke-test.]`
2. `[FILL IN: any config to set per environment (e.g. blanked secret defaults).]`
3. `[FILL IN: larger follow-ups deliberately deferred, with rationale.]`
