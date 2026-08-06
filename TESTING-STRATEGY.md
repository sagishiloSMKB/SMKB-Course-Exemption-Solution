# Testing Method — SMKB Power Platform Solutions

> The **method** for testing across an SMKB Power Platform solution: what's testable locally vs only on
> cloud Dev, which tools, and how it wires in. This is a reusable house-standard — a new solution keeps the
> method and fills in its own concrete targets (marked `[FILL IN: …]`) and rollout status.

## Direct answers to the key questions

- **Can we run unit tests locally?** **Yes — for the bulk of the "main logic."** The Code App / Code Site
  are ordinary Vue 3 + Vite + TypeScript projects, so their pure logic (validators, calculations, sanitizers,
  draft serialize/parse, error mapping) and their service-layer input/output mapping run under **Vitest
  locally** with no cloud and no auth.
- **Only on cloud Dev?** **Only the Power Automate *flow logic* can be *executed* on cloud Dev** — there is
  no offline Power Automate engine, so you cannot run a flow locally. **But** the flows' *structure and
  security invariants* CAN be checked locally by asserting over the flow JSON (Layer 4). So: flow *behavior*
  = cloud Dev; flow *structure* = local.
- **How exactly?** A 6-layer pyramid: Layers 1–4 run **locally** (fast, deterministic, no cloud); Layers 5–6
  run **against cloud Dev** (real flow behavior + end-to-end).

## Why Power Platform testing is unusual

| Layer of logic | What it is | How it can be tested |
|---|---|---|
| SPA pure logic | TS functions, transforms, sanitizer | Standard JS unit tests, **local** |
| SPA components | Vue components (props/emits/state) | `@vue/test-utils` + jsdom, **local** |
| SPA → flow calls | thin service wrappers | Mock the flow boundary, **local** |
| **Flow logic** | declarative JSON run by the PA cloud engine | **No local runtime** — execute on Dev (integration) OR statically assert the JSON |
| Dataverse/SharePoint | cloud data | Mock locally; real only on Dev |

The important consequence: **flows are the one layer with no local execution.** Compensate with (a) local
*static* assertions over the flow JSON (flow-lint) and (b) *integration* tests that invoke the deployed
flows on Dev.

## The 6-layer method

### Layer 1 — SPA unit tests (LOCAL · Vitest) — highest ROI
Pure, deterministic logic. `[FILL IN: concrete targets in this solution — e.g. Israeli-ID/phone validators,
the flow-result unwrap() helper, draft serialize/parse round-trips, error-code→message mapping, any totals/
formatting.]`

### Layer 2 — SPA component tests (LOCAL · Vitest + @vue/test-utils + jsdom)
Component behavior with the service layer mocked. `[FILL IN: priority components — e.g. dirty-tracking modals,
status→chip mapping, a rich-text editor that emits sanitized HTML.]`

### Layer 3 — SPA service-contract tests (LOCAL · Vitest, mock the flow boundary)
Assert each service maps request/response correctly and surfaces flow errors. Mock the generated services
(Code App) or `cloudFlow.invokeAuthFlow` (Code Site); no network.

### Layer 4 — Flow static-invariant tests (LOCAL · `tools/flow-lint/`) — security regression guard
Parse every `Workflows/*.json` + the solution XML and assert the SMKB security invariants so they can never
silently regress: every authenticated Power Pages flow validates the session token before any data access;
no connection uses `runtimeSource: "invoker"`; every HTTP action interpolating `triggerBody()` into a URI
wraps it in `encodeUriComponent`; no committed secrets or emails in `defaultValue`; trigger descriptions
≤256 chars. This is a **security linter for flows** — local, fast, zero-dependency. See
`SMKB - [Name] - Cloud Flows/tools/flow-lint/README.md` for the current rule set.

### Layer 5 — Flow integration tests (CLOUD DEV · run from a local runner or CI)
Invoke the **deployed** flows on Dev and assert real behavior: `[FILL IN: e.g. the ownership/IDOR guard
rejects a cross-user record id, an empty-identity session is rejected, OTP locks out after N attempts,
injection payloads are handled.]` Requires Dev auth + seeded test data + teardown. The only way to verify
real server-side logic.

### Layer 6 — E2E smoke journeys (CLOUD DEV · Playwright)
A few critical paths against the deployed sites. `[FILL IN: e.g. portal login → create → submit; back office
create → send.]` Most realistic, most brittle — keep the set small.

Plus **static/native** checks: **ESLint** (per app) and the **Power Platform Solution Checker**
(`pac solution check`).

## Where each layer runs

| Layer | Local | Cloud Dev | Auth | Speed | Priority |
|---|---|---|---|---|---|
| 1 unit | ✅ | — | none | ms | **first** |
| 2 component | ✅ | — | none | ms | med |
| 3 service contract | ✅ | — | none (mocked) | ms | med |
| 4 flow invariants | ✅ | — | none | ms | **first** |
| 5 flow integration | runner local/CI → executes on Dev | ✅ | Dev SPN/user | sec–min | high |
| 6 E2E | runner local/CI → drives Dev site | ✅ | Dev test accounts | min | low |

## Infrastructure & wiring

- **Vitest per SPA:** each app has `vitest` + a `test` script + a standalone `vitest.config.ts` (Node env).
  Specs live beside the code as `src/**/*.spec.ts`. (Add `@vue/test-utils` + jsdom for Layer 2.)
- **flow-lint (Layer 4):** zero-dependency Node ESM at `tools/flow-lint/` — `node lint.mjs` (+ `node test.mjs`
  self-test). Reads the flow JSON + solution XML; no Vue, no install.
- **Local:** `pnpm test` / `npm test` per app runs the SPA specs; flow-lint runs the flow checks. No cloud,
  and no npm credential at all - the private `@smkbacil` package is vendored per starter.
- **Deploy gates:** each `deploy.ps1` / `npm run deploy` runs its checks first and aborts on failure (see
  [docs/08](docs/08-testing-and-quality-gates.md)).
- **Pre-commit + CI:** the root `.githooks/pre-commit` runs ESLint + flow-lint on staged files;
  `.github/workflows/ci.yml` runs flow-lint + per-app lint/test - **no secrets required** - plus an optional
  `pac solution check` (needs `AZURE_*`). Layers 5–6 would run nightly/pre-deploy via a service principal.
- **Flow integration auth/data:** SPN token to the Dataverse Web API, or call the Power Pages cloud-flow
  trigger endpoint with a test session; use a **disposable test user + records** in Dev and clean up after
  each run (integration tests mutate Dev data — isolation matters).

## Rollout status (by ROI)

`[FILL IN: which layers are built/wired for this solution. Recommended order: Layers 1 + 4 first (most value,
no cloud) → Layer 3 → Layer 2 → Layer 5 (security-critical flows) → Layer 6 (a few E2E smoke journeys).]`
