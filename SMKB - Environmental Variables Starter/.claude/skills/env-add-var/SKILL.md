---
name: Environment Variables — Add Variable
description: >-
  Adds an environment-variable definition end-to-end: clones the example, renames
  the folder AND schemaname to smkb_<prefix>_<PascalName>, sets the type (String,
  never JSON for lists), and adds the required type=380 RootComponent.
when_to_use: >-
  User says "add an env var", "environment variable", "add a config value",
  "add a URL/email/secret setting", or wants a per-environment configurable value.
argument-hint: "<PascalName> \"<Human Display Name>\" <String|Secret|Number|Boolean>"
arguments: [pascal-name, display-name, type]
allowed-tools: Read Edit Write Grep Bash(powershell *) Bash(git mv *)
---

## Context

An environment-variable definition has **three** things that must line up, each a silent failure if wrong:
(1) the **folder name and the `schemaname=` attribute must be identical** (`smkb_<prefix>_<PascalName>`);
(2) a **`<RootComponent type="380">`** in `Other/Solution.xml` — without it the definition imports but is
never linked to the solution, so it does **not** travel to Stage/Prod; (3) the **type** — for a list (e.g.
emails) use **String with `;`-separated values, never the JSON type**, which forces `json()` parsing in
every expression and **cannot be changed by reimport once deployed**. Env var schema names are PascalCase
(`smkb_<prefix>_PortalBaseUrl`) per root [CLAUDE.md](../../../../CLAUDE.md) Critical Rule 3/5. Type codes +
Key Vault setup: [add-var-reference.md](add-var-reference.md) and the [README](../../../README.md).

## Steps

1. Read `shortPrefix` from the root [`solution.config.json`](../../../../solution.config.json). If it is
   still `sol`, stop and have the user run `/solution-config` first.
2. Clone the example definition folder to the new name (folder name = schema name):
   ```powershell
   Copy-Item -Recurse ".\environmentvariabledefinitions\smkb_sol_ExampleVar" ".\environmentvariabledefinitions\smkb_<prefix>_<PascalName>"
   ```
3. Edit the new `environmentvariabledefinition.xml`:
   - `schemaname="smkb_<prefix>_<PascalName>"` (must equal the folder name exactly)
   - `<displayname default="PREFIX - Human Name">` and `<label description="PREFIX - Human Name">` (ASCII hyphen)
   - `<type>` — from `$type`: String `100000000` · Number `100000001` · Boolean `100000002` · **Secret `100000005`** (never JSON `100000003` for lists — see Notes)
   - `<defaultvalue>` — a universal default, **or remove the element** if the value is environment-specific
4. Add the RootComponent to `Other/Solution.xml` inside `<RootComponents>`:
   ```xml
   <RootComponent type="380" schemaName="smkb_<prefix>_<PascalName>" behavior="0" />
   ```
5. If you copied from the example (rather than adding alongside real vars), **delete** the
   `smkb_sol_ExampleVar` folder so it isn't deployed.
6. **Secret vars only** — after deploy, the value is an **Azure Key Vault Resource ID** (not a literal),
   set per environment; flows read it via `RetrieveEnvironmentVariableSecretValue`. See the reference for
   the Resource-ID format + RBAC prerequisites.
7. Verify folder name == schemaname and the RootComponent exists:
   ```powershell
   Select-String -Path ".\environmentvariabledefinitions\smkb_<prefix>_<PascalName>\*.xml",".\Other\Solution.xml" -Pattern "smkb_<prefix>_<PascalName>"
   ```
   **PAUSE** — deploy is a separate step (the Env Vars `deploy.ps1`).

## Error Handling

- **Definition imports but is missing in Stage/Prod:** no `type="380"` RootComponent — add it (Step 4).
- **Definition doesn't import / not found:** folder name ≠ `schemaname` — make them identical.
- **Deploy guard blocks on `smkb_sol_`:** a token wasn't renamed, or the example folder wasn't deleted.
- **A list value needs `json()` everywhere / type won't change:** it was created as JSON type — recreate as String with `;`-separated values (JSON type is not reimport-changeable once deployed).

## Notes

- The two ALM vars `smkb_sol_EnvironmentName` / `smkb_sol_FlowErrorEmails` are renamed to your prefix
  automatically by the root `apply-config.ps1` — don't hand-rename or delete them.
- **Definitions** (type 380) live here and are committed; **values** (type 381) are per-environment and are **never** committed.
- Type codes, the Key Vault Resource-ID format, and RBAC prerequisites: [add-var-reference.md](add-var-reference.md).
