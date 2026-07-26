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

## Verified-safe (checked, no issue)

`[FILL IN: controls you checked and confirmed correct — e.g. secrets are Secret-typed and read via the Key
Vault unbound action; no invoker connections; authenticated flows validate the session token; ownership
checks present. This section shows the review had coverage, not just findings.]`

## Verification

- `[FILL IN: type-check clean — vue-tsc → exit 0 for each SPA touched; all flow JSON still valid; flow-lint
  passes.]`
- `[FILL IN: what could NOT be verified here and why — e.g. ESLint needs a private-registry install; flow
  behavior changes need a redeploy.]`

## Recommended next steps

1. `[FILL IN: redeploy the [needs deploy] items to Dev and smoke-test.]`
2. `[FILL IN: any config to set per environment (e.g. blanked secret defaults).]`
3. `[FILL IN: larger follow-ups deliberately deferred, with rationale.]`
