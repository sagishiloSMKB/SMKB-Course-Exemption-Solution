# Testing & Quality Gates

> **TEMPLATE** — this is the standard SMKB gate model (keep it). Fill the `[FILL IN: …]` spec/component
> rows for this solution. See the solution-wide [TESTING-STRATEGY.md](../TESTING-STRATEGY.md) for the layered
> method behind these gates. Delete this callout once populated.

Quality is enforced by **automated checks that run in three places** — before a commit, before a deploy, and
in CI — so a release can never ship something the checks would reject.

## What runs

| Check | Covers | Tooling |
|---|---|---|
| **Unit tests** | Pure logic in the SPAs (validation, formatting, result unwrapping, totals) | **Vitest** |
| **SPA lint** | XSS (`no-v-html`), no `console`, **no direct network calls** from the SPA (flows-only) | **ESLint 9** flat config |
| **Type check** | Full TypeScript type safety | **vue-tsc** (in the build) |
| **flow-lint** | Cloud-flow + solution-XML security & import-error rules | `tools/flow-lint/` (zero-dep Node) |
| **Solution Checker** | Microsoft's platform best-practice/security analysis | `pac solution check` (optional/CI) |

## Unit tests (Vitest)

Pure-logic specs live beside the code as `src/**/*.spec.ts`. `[FILL IN: list the solution's spec files and
what each covers — e.g. Israeli-ID/field validation, phone formatting, the flow-result unwrap() helper,
voucher/total round-trips.]`

Run: `npm test` (Code Site) / `pnpm run test` (Code App).

## flow-lint

The cloud flows have no local runtime, so `tools/flow-lint/` asserts over the flow JSON and solution XML
instead of executing them. It catches the two classes of problem Microsoft's own tooling does **not**:
import/activation errors and the SMKB security invariants. The current rule set (see
`tools/flow-lint/README.md` for the authoritative list):

| id | Severity | Catches |
|---|---|---|
| `flow-valid-json` | error | JSON that won't parse (BOM-tolerant) |
| `description-max-length` | error | trigger/action `description` > 256 chars (`TriggerDescriptionTooLong`) |
| `connection-runtime-embedded` | error | a connection with `runtimeSource` ≠ `embedded` (invoker → recurring 403) |
| `no-placeholders` | error | unreplaced starter placeholders |
| `no-secret-param-default` | error | a password/secret/token-named parameter with a committed default |
| `http-uri-encodes-client-input` | error | `triggerBody()` in an HTTP URI without `encodeUriComponent` |
| `authenticated-flow-validates-token` | error | an `authToken` input with no `sessionToken` validation |
| `connection-reference-complete` | warn | connection reference missing logical/api name |
| `no-email-in-defaultvalue` | warn | an email committed in a parameter `defaultValue` |
| `powerpages-trigger-fields-have-title` | warn | Power Pages trigger field missing a `title` (payload maps by title) |
| `env-var-param-defined` | warn | a `schemaName` with no matching env-var definition |
| `xml-ascii-hyphen-only` | warn | Unicode en/em dash in solution/env-var display XML |

- Run: `node "SMKB - [Name] - Cloud Flows/tools/flow-lint/lint.mjs"` (errors block; `--strict` also fails on
  warnings; `--json` for machine output). Self-test: `test.mjs` — every rule must fire on bad input and stay
  silent on good input. Folders are auto-discovered; exit `0` clean / `1` errors / `2` no flows found.

## The three gates

### 1. Pre-commit (`.githooks/pre-commit`)
On `git commit`: runs **ESLint** on staged `.vue`/`.ts`/`.tsx` files, **flow-lint** on staged flow JSON /
solution XML, and the root **config-drift** (`apply-config.ps1 -Check`) + **doc-boundary** checks. Enable
once per clone with `git config core.hooksPath .githooks`.

### 2. Deploy scripts (a failing check aborts the deploy)
| Component | Deploy command | Gates (in order) |
|---|---|---|
| Cloud Flows | `deploy.ps1` | env guard → **flow-lint** (errors block) → build zip → import |
| Environmental Variables | `deploy.ps1` | env guard → placeholder guard → import |
| Power Apps Code App | `deploy.ps1` | placeholder guard → env guard → **lint → unit tests → build (vue-tsc)** → push |
| Power Pages Code Site | `npm run deploy` | **lint → build (vue-tsc)** → upload |

Every direct deploy script also enforces the **SMKB-Apps-Dev-only** environment guard (see
[Deployment & ALM](09-deployment-alm.md)).

### 3. CI (`.github/workflows/ci.yml`)
Runs on every push to `main` and every PR:
- **`flow-lint` job** — runs the flow-lint checker (no install needed).
- **`spa-checks`** — for each code-app folder (auto-discovered): `install` → `lint` → `test`. Needs the
  no repository secrets - `@smkbacil/design-ui` installs from a committed `vendor/` tarball.
- **`solution-check`** — Power Platform Solution Checker, shipped **commented-out**; enable once the
  `AZURE_*` service-principal secrets are set.

## Solution Checker (complementary)

`pac solution check` is Microsoft's static analysis for the packaged solution. It is **complementary** to
flow-lint — it does not cover the flow-specific import/security items above, which is why flow-lint exists.
