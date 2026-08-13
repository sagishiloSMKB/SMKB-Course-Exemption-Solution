# flow-lint

Static checks for this solution's **cloud flows** and **solution XML** — the layer that
has no local runtime, so we assert over the JSON/XML instead of executing it. Zero-dependency
Node ESM (built-ins only): it runs from a pre-commit hook, `deploy.ps1`, or CI **without an
`npm install`**.

It enforces two things that keep biting us and that Microsoft's own tooling does **not** catch:
1. **Import/activation-error prevention** — e.g. trigger/action `description` ≤ 256 chars
   (`TriggerDescriptionTooLong`), Power Pages trigger fields titled correctly (`IncorrectPayload`
   400s), env-var references that actually resolve, no leftover placeholders.
2. **Security invariants** from the audit — auth-token validation, URL-injection encoding, no
   `invoker` connections, no committed secrets/emails.

> Microsoft's **Solution Checker** (`pac solution check`) is complementary — run it in CI for the
> documented best-practice/security rules. It does **not** cover the flow-specific items above,
> which is why this linter exists.

## Run it

```bash
node tools/flow-lint/lint.mjs            # lint all flows + solution XML (errors block, warnings don't)
node tools/flow-lint/lint.mjs --strict   # also fail on warnings
node tools/flow-lint/lint.mjs --json     # machine-readable output
node tools/flow-lint/test.mjs            # self-test: prove each rule fires on bad input

# One rule over a folder that legitimately fails the others (a template folder still holds
# placeholders by design), e.g. the OTP recipe's flow templates:
node tools/flow-lint/lint.mjs --only=description-max-length "<path>/flow-templates"

# What .githooks/pre-commit runs: everything EXCEPT the placeholder gates, so a half-built
# solution stays committable. Never use this to clear a deploy.
node tools/flow-lint/lint.mjs --pre-commit "<flows>/Workflows"
```

Exit code: `0` clean, `1` errors (or warnings with `--strict`), `2` no flows found. A positional
argument overrides the flows folder; otherwise it is auto-discovered.

### `--pre-commit`: why a commit and a deploy are gated differently

Placeholders are what a template **is** — `smkb_sol_`, `[REPLACE …]`, the `00000000-…-0001` GUIDs —
and CLAUDE.md → **Critical Rule 2** puts the placeholder gate in each starter's own `deploy.ps1`.
Running those two rules at *commit* time made the entire Init Project build phase uncommittable, for
a reason that is not obvious: the hook's initialized-check flips at **Phase 2.2**, and `lint.mjs`
scans the **whole** `Workflows` folder rather than the staged files. So staging one finished flow was
rejected by placeholders in the *other*, still-untouched skeletons and in `Other/*.xml`. Measured on
a clone: **11 errors, 9 of them from files the developer never staged.** A developer who cannot
commit stops committing, which is how a whole build ends up in one commit at the end.

`--pre-commit` therefore skips exactly `DEPLOY_TIME_RULE_IDS` (declared in `rules.mjs`, next to the
rules, so a future placeholder rule joins the set instead of silently re-blocking commits). Nothing
is weakened — `deploy.ps1`, `/pre-deploy-verify` and Init Project 8.1 all run the full set, and the
run prints which gates it skipped so a clean commit-time result is never mistaken for
"no placeholders left". Every other rule still runs at commit time, including the three-file rule
and every security invariant.

### Which folders' XML is scanned

`xml-no-placeholders` / `xml-ascii-hyphen-only` cover the **Cloud Flows**, **Environmental
Variables** and **Dataverse Tables** starters - but only the ones that are **activated**, read the
way the root `CLAUDE.md` prescribes: a folder still named `SMKB - <X> Starter` has not been
activated and is skipped, with a printed note saying so.

That scoping is not cosmetic. A solution that activates Cloud Flows but not Environmental
Variables used to have its **Flows** deploy blocked by placeholders in a pristine Env Vars
template it is required to leave untouched - naming a file the developer had never opened. The
Tables starter, meanwhile, was never scanned at all despite this README claiming it was.

A **fragment** file (an action tree with no `properties.definition` wrapper, like the OTP recipe's
`VALIDATE_AUTH_TOKEN_SNIPPET.json`) is walked as-is, so its actions are linted rather than
silently reported clean.

## Rules

### Per-flow

| id | sev | catches |
|----|-----|---------|
| `flow-valid-json` | error | JSON that won't parse (BOM-tolerant). **Not a rule object** - `lint.mjs` emits this id from its `JSON.parse` catch, so it has no entry in `rules.mjs` and the self-test cannot exercise it |
| `description-max-length` | error | any trigger/action `description` > 256 chars |
| `connection-runtime-embedded` | error | a connection with `runtimeSource` ≠ `embedded` (invoker → recurring 403) |
| `no-placeholders` | error | unreplaced starter placeholders |
| `no-secret-param-default` | error | a password/secret/token-named parameter with a committed default |
| `http-uri-encodes-client-input` | error | `triggerBody()` interpolated into an HTTP URI without `encodeUriComponent` |
| `authenticated-flow-validates-token` | error | a token-titled trigger input (`authToken`, `auth token`, `sessionToken`, `token` - matched after normalizing case and separators) with no `sessionToken` reference in any **action input**. A mention in a `description` does not satisfy it |
| `securedata-only-on-connector-actions` | error | `secureData` anywhere other than an `OpenApiConnection`/`Http` **action** — imports fine, then fails activation and stays in **Draft** |
| `keyvault-secret-read-is-secured` | error | a Secret env-var read that doesn't mark its **outputs** secure (secret lands in run history) |
| `openapi-action-has-authentication` | error | an `OpenApiConnection` action missing `"authentication": "@parameters('$authentication')"` (or holding a different value). Without it the action doesn't bind the solution's connection reference — **imports clean, fails at runtime**. All 30 such actions in the kit's harvested production flows carry it; every omission found was hand-typed JSON |
| `no-undeclared-trigger-reference` | error | an action reading a trigger input the schema doesn't declare. **The failure mode with no symptom** — it evaluates to `null`, the column is written empty, the run says Succeeded. The mirror of `no-unused-trigger-inputs`, which only catches the harmless direction. Skips `description`/`metadata`, which the runtime never evaluates |
| `connection-reference-complete` | warn | connection reference missing logical/api name |
| `no-email-in-defaultvalue` | warn | an email committed in a parameter `defaultValue`, or hardcoded in an **action input** (set per-environment instead). The org-wide mandated sender is exempt - it is a convention every flow must use, not per-solution data |
| `powerpages-trigger-fields-have-title` | warn | Power Pages trigger field missing a `title` (eventData maps by title) |
| `env-var-param-defined` | warn | any `metadata.schemaName` with no matching Environmental Variables definition (no publisher-prefix filter - that field has exactly one meaning) |
| `no-unused-trigger-inputs` | warn | a Power Pages trigger input the flow never reads — dead surface a reviewer can't distinguish from a record selector |
| `sharepoint-data-action` | warn | a SharePoint data action while [`SOLUTION-SPEC.md`](../../../SOLUTION-SPEC.md) §7 declares no SharePoint dependency (CLAUDE.md → **Critical Rule 6**: Dataverse is the data platform, SharePoint is a declared legacy carve-out). Declaring the list and why the data cannot move silences it for the whole solution |

### Whole-solution (global)

These block a deploy just as hard as the per-flow errors — they were previously undocumented here.

| id | sev | catches |
|----|-----|---------|
| `workflow-json-matches-customizations` | error | a `Workflows/*.json` not referenced in `Other/Customizations.xml` (or a stale reference to a file that no longer exists) |
| `env-var-rootcomponents-complete` | error | an env-var definition with no `<RootComponent type="380">` entry — imports unlinked and never reaches Stage/Prod |
| `xml-no-placeholders` | error | unreplaced placeholders in any shipped solution/env-var XML |
| `xml-ascii-hyphen-only` | warn | Unicode en/em dash in solution/env-var display XML |

## Add a rule

Append to the array in [`rules.mjs`](./rules.mjs):

```js
{ id: 'my-rule', severity: 'error', docs: 'why it matters',
  check(flow, ctx) {
    // flow = { name, path, raw, json }; ctx = { envVarSchemaNames: Set }
    // return [{ location, message }, ...]   // no line numbers - there is no line machinery
  } }
```

Useful in-module helpers: `walk(node, cb, path)` (exported) and the private `nodesOfType`,
`def`/`params`/`triggers`/`connRefs`. `nodesOfType` takes the **whole `flow.json`** — it descends into
`properties.definition` itself.

Then add a bad-input and good-input assertion in [`test.mjs`](./test.mjs) and run it. This is
**enforced, not just asked for**: the self-test fails unless a registered rule has **both** a
firing assertion (expects >0 findings) and a silent one (expects 0). Before that gate existed a
rule could ship with no tests at all and the suite stayed green; before it required both
directions, a rule with no silent test - no evidence it can be satisfied at all - was still
reported as fully covered, which is the half that catches a rule broad enough to flag correct
files.

## Wiring

- **Deploy gate**: the Cloud Flows `deploy.ps1` runs `node tools/flow-lint/lint.mjs` and aborts on any
  error. It runs *after* the script's own inline placeholder backstop — that backstop is **not**
  retired; it still runs so a machine without Node is never left ungated. (The Environmental Variables
  starter has no flows and does not call flow-lint.)
- **Pre-commit**: the repo-root `.githooks/pre-commit` runs flow-lint on staged cloud-flow JSON / XML
  **once the solution is initialized** — it skips while the template placeholders are still present, so
  the initial template commit is not blocked (deploy.ps1 is the placeholder gate).
- **CI**: the monorepo root owns git/CI. Root's `.github/workflows/ci.yml` runs the self-test
  (`flow-lint-selftest`, always), the full lint (`flow-lint`, once the solution is initialized), and
  a `--only=description-max-length` pass over `examples/` and the OTP `flow-templates/` — folders
  that carry placeholders by design and so cannot take the full lint, but whose over-long
  descriptions would fail flow **activation** the moment someone copies one into `Workflows/`.
