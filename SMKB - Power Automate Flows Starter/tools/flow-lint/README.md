# flow-lint

Static checks for the Payment Vouchers **cloud flows** and **solution XML** — the layer that
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
```

Exit code: `0` clean, `1` errors (or warnings with `--strict`), `2` no flows found. Folders are
auto-discovered (`* Cloud Flows/Workflows`, `* Environmental Variables/environmentvariabledefinitions`).

## Rules

| id | sev | catches |
|----|-----|---------|
| `flow-valid-json` | error | JSON that won't parse (BOM-tolerant) |
| `description-max-length` | error | any trigger/action `description` > 256 chars |
| `connection-runtime-embedded` | error | a connection with `runtimeSource` ≠ `embedded` (invoker → recurring 403) |
| `no-placeholders` | error | unreplaced starter placeholders |
| `no-secret-param-default` | error | a password/secret/token-named parameter with a committed default |
| `http-uri-encodes-client-input` | error | `triggerBody()` interpolated into an HTTP URI without `encodeUriComponent` (F1/F4) |
| `authenticated-flow-validates-token` | error | an `authToken` trigger input with no `sessionToken` validation |
| `connection-reference-complete` | warn | connection reference missing logical/api name |
| `no-email-in-defaultvalue` | warn | an email committed in a parameter `defaultValue` (set per-environment instead) |
| `powerpages-trigger-fields-have-title` | warn | Power Pages trigger field missing a `title` (eventData maps by title) |
| `env-var-param-defined` | warn | a `metadata.schemaName` with no matching Environmental Variables definition |
| `xml-ascii-hyphen-only` | warn | Unicode en/em dash in solution/env-var display XML |

## Add a rule

Append to the array in [`rules.mjs`](./rules.mjs):

```js
{ id: 'my-rule', severity: 'error', docs: 'why it matters',
  check(flow, ctx) {
    // flow = { name, path, raw, json }; ctx = { envVarSchemaNames: Set }
    // return [{ location, message }, ...]
  } }
```

Then add a bad-input and good-input assertion in [`test.mjs`](./test.mjs) and run it — every rule
must fire on bad input and stay silent on good input.

## Wiring

- **Deploy gate**: the Cloud Flows `deploy.ps1` runs `node tools/flow-lint/lint.mjs` and aborts on any
  error. It runs *after* the script's own inline placeholder backstop — that backstop is **not**
  retired; it still runs so a machine without Node is never left ungated. (The Environmental Variables
  starter has no flows and does not call flow-lint.)
- **Pre-commit**: the repo-root `.githooks/pre-commit` runs flow-lint on staged cloud-flow JSON / XML
  **once the solution is initialized** — it skips while the template placeholders are still present, so
  the initial template commit is not blocked (deploy.ps1 is the placeholder gate).
- **CI**: not shipped in this starter — the monorepo root owns git/CI. A copy-paste CI job is in the
  Flows starter README under "Wiring flow-lint beyond deploy".
