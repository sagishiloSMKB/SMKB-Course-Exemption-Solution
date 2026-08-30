# SMKB – Environmental Variables Starter

This folder is the source-of-truth for Power Platform Environment Variable **definitions** developed for SMKB.  
Definitions are stored as XML files, version-controlled in Git, and pushed to Dataverse using `deploy.ps1`.

---

## Activation Guide — Do This First

> **Only activate this starter if your solution actually needs environment variables.**
> If your solution has no configuration values that change between environments (Dev / Stage / Prod), leave this folder completely untouched — do not rename files, do not change placeholders, do not run deploy.ps1.

> **Orchestrated from the root.** This starter is standalone (it deploys on its own via `deploy.ps1`),
> but its **solution identity** — unique name and display name in `Other/Solution.xml`, and the two
> ALM variable schema names — is authored once in the root [`solution.config.json`](../solution.config.json)
> and applied by [`apply-config.ps1`](../apply-config.ps1) (run from the repo root). Do **not** hand-edit
> `YourSolutionName` / `Your Solution Name`, and you don't rename the ALM vars by hand. What you author
> in *this* folder is the variable content — defining each variable and its `RootComponent`. Global
> naming/environment/deploy-order rules live in the root `CLAUDE.md`.

### Step 0 — Rename this folder

Before anything else, rename this folder from `SMKB - Environmental Variables Starter` to match your solution:

```
SMKB - [Component Name] - Environmental Variables
```

| What to fill in | Example |
|----------------|---------|
| Component Name — describes what solution these variables belong to | `Events Tickets`, `Scholarship Applications` |

Full example rename: `SMKB - Events Tickets - Environmental Variables`

Renaming the folder does not affect `deploy.ps1` — it uses `$PSScriptRoot` to locate files.

### Step 1 — Confirm you need this starter

You need the Env Vars Starter if your solution requires any of:
- API base URLs or endpoint addresses that differ per environment
- Email addresses, sender names, or notification settings
- Feature flags or toggle values
- Any setting you'd rather configure per-environment than hard-code in a flow or page

If none of these apply, skip this starter entirely.

### Step 2 — Choose your solution short name

Pick a 2–5 letter **lowercase** short prefix (e.g. `evt` for Events, `sch` for Scholarships). Every
component's schema name is `smkb_<prefix>_<PascalName>` — the fixed publisher prefix `smkb_`, then your
short prefix, then a PascalCase descriptor (e.g. `smkb_evt_PortalBaseUrl`). The display name is
`<PREFIX_UPPER> - <Human Name>` (e.g. `EVT - Portal Base URL`). See CLAUDE.md → Critical Rule 3.

### Step 3 — Replace all placeholders

#### `Other/Solution.xml`

> `YourSolutionName` and `Your Solution Name` are set automatically by the root `apply-config.ps1` —
> do not edit them by hand. You still add the per-variable `RootComponent` entries (step 6 below).

#### `environmentvariabledefinitions/` folder
For **each variable** your solution needs:

1. Copy the `smkb_sol_ExampleVar` folder.
2. Rename it to `smkb_<prefix>_<PascalName>` (e.g. `smkb_evt_PortalBaseUrl`) — the folder name and the `schemaname` must match exactly.
3. Inside the copied folder, edit `environmentvariabledefinition.xml`:

| Find | Replace with |
|------|-------------|
| `schemaname="smkb_sol_ExampleVar"` | `schemaname="smkb_evt_PortalBaseUrl"` (your variable name) |
| `default="SOL - Example Var"` | `default="EVT - Portal Base URL"` (display name, `PREFIX - Name`) |
| `description="SOL - Example Var"` | `description="EVT - Portal Base URL"` (same display name) |
| `your-default-value-here` | Your actual default value, or remove the `<defaultvalue>` element if there is no universal default |

4. After creating all your real variable folders, **delete** the `smkb_sol_ExampleVar` template folder (it should not be deployed) — **and its `<RootComponent>` line in `Other/Solution.xml` in the same edit.** A RootComponent that outlives its definition makes the import declare a variable that does not ship; flow-lint's `env-var-rootcomponents-complete` now checks both directions, so a half-removal fails the lint instead of surfacing in Stage.
5. The **four shipped variables** — `smkb_sol_EnvironmentName`, `smkb_sol_FlowErrorEmails` (ALM) and `smkb_sol_OtpDailyCap`, `smkb_sol_SecurityAlertEmails` (security baseline) — have their `sol` segment and `SOL - ` display prefix **renamed to your prefix automatically** by the root `apply-config.ps1`, folder and `<RootComponent>` included. **Never hand-rename one.** See "ALM-Required Variables" and "Security Baseline Variables" below.

   **Dropping one is possible but it takes three coordinated edits or none:** the definition folder, its `<RootComponent type="380">` line, **and** its name in `$script:shippedEnvVars` in the root `apply-config.ps1`. Miss the third and `Rename-AlmFolder` reports *"neither name present"* on every run, so `apply-config.ps1 -Check` is permanently red — failing the pre-commit hook and CI's `root-gates` job for the life of the repo.

   **Which are droppable:** `EnvironmentName` and `FlowErrorEmails` are required whenever Cloud Flows is activated — keep them. `OtpDailyCap` and `SecurityAlertEmails` are **feature-scoped** — they exist for a rate-sensitive send path (OTP or similar), and a solution with no such path ships two permanent definitions nothing reads. That is easy to miss for a specific reason: the deploy guard blocks only the `sol` segment, and `apply-config.ps1` renames these *past* it, so they deploy silently — and an unmanaged re-import cannot remove them afterwards. Decide **before the first deploy** (Init Project 8.1a) or accept a hand deletion in the Maker portal. `SecurityAlertEmails` also has a no-delete alternative: leave its value empty, which a flow must treat as "alerting not configured".
6. **For every variable folder you created**, add a `<RootComponent>` entry to `Other/Solution.xml`:

```xml
<RootComponent type="380" schemaName="smkb_evt_PortalBaseUrl" behavior="0" />
```

The `schemaName` must exactly match the folder name under `environmentvariabledefinitions/`. A template comment in `Other/Solution.xml` shows the format.

> **Why this matters:** Without this entry, the definition is imported to Dataverse but is **not linked to the solution**. When the solution is promoted through the pipeline, the env var definition does not travel with it — Stage and Prod environments never receive the definition.

### Step 4 — Verify no placeholders remain

Solution *identity* is verified from the root with `apply-config.ps1 -Check`. This scan covers the
variable *content* you author (`deploy.ps1` also blocks on these):

```powershell
$patterns = 'YourSolutionName','smkb_sol_','your-default-value-here'
Get-ChildItem ".\Other",".\environmentvariabledefinitions" -Recurse -File | ForEach-Object {
    $file = $_
    foreach ($p in $patterns) {
        if ((Get-Content $file.FullName -Raw) -match $p) {
            Write-Host "PLACEHOLDER FOUND: '$p' in $($file.Name)"
        }
    }
}
```

If the command outputs nothing, all placeholders are replaced. You are ready to deploy.

### Step 5 — Deploy

```powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

After deploying, set the **value** for each variable in the Power Platform portal (per environment). The definition is the schema; the value is the actual setting. Never commit values to Git.

---

---

## Naming Convention

Every component's schema name is `smkb_<prefix>_<PascalName>` (fixed publisher prefix + your solution short prefix + PascalCase name), so no two solutions ever share a variable name. The template's placeholder short prefix is **`sol`** — `apply-config.ps1` swaps it for your real prefix.

| Placeholder name | Real example |
|-----------------|--------------|
| `smkb_sol_ExampleVar` | `smkb_evt_PortalBaseUrl` |
| `YourSolutionName` (in Solution.xml) | `SMKBEvents` |

**Rule:** every environment variable is named `smkb_<prefix>_<PascalName>` (schema) with display `<PREFIX> - <Name>`.  
Never use a generic name that could collide with variables in other solutions. See CLAUDE.md → Critical Rule 3.

---

## Core Concept

An **environment variable definition** is a Dataverse record (`environmentvariabledefinition` table).  
Its **default value** is baked into the definition. Each environment can override it with a separate **value record** (not stored here).

```
Git repo (XML)  →  deploy.ps1  →  Dataverse environmentvariabledefinition record  →  reflected in every solution that references it
```

- **Definitions** (type 380) — schema name, display name, default value, data type. Stored here, committed to Git.
- **Values** (type 381) — per-environment overrides. **Never committed to Git.** Set them manually in each environment after deploy.

---

## Project Structure

```
SMKB - Environmental Variables Starter/
│
├── Other/
│   └── Solution.xml          ← solution metadata + one RootComponent (type 380) per variable
│
├── environmentvariabledefinitions/
│   └── smkb_sol_ExampleVar/
│       └── environmentvariabledefinition.xml   ← one folder per variable; this is what you edit
│
├── deploy.ps1                ← runs pac solution pack + pac solution import
└── .gitignore                ← ignores _dist/
```

---

## Development Workflow

### Adding a new variable

1. Copy the `smkb_sol_ExampleVar` folder.
2. Rename it to your variable name: `smkb_<prefix>_<PascalName>`.
3. Update `environmentvariabledefinition.xml` inside:
   - `schemaname` → your variable's schema name (e.g. `smkb_evt_PortalBaseUrl`)
   - `displayname` / `label description` → human-readable name
   - `defaultvalue` → optional default (leave blank if no universal default)
   - `type` → see type reference below
4. Run `deploy.ps1` to push the definition to the environment.
5. Set the actual value in the Power Platform portal per environment.
6. Commit the new XML.

### Variable data types

| `<type>` value | Data type |
|----------------|-----------|
| `100000000` | String |
| `100000001` | Number |
| `100000002` | Boolean |
| `100000003` | JSON |
| `100000004` | Data Source |
| `100000005` | Secret |

> **A Secret env var can NEVER be read via `parameters()`.** Putting one in a flow's
> `definition.parameters` **imports cleanly and then the flow refuses to turn on** — a symptom that
> looks nothing like its cause. Read it at run time through the Dataverse unbound action
> `RetrieveEnvironmentVariableSecretValue` instead. Its value is an Azure Key Vault **resource-ID
> reference**, set per environment, never a literal and never committed.

### Updating an existing variable

1. Edit the relevant XML file.
2. Run `deploy.ps1`.
3. Commit the change.

---

## How This Differs from Cloud Flows

| Aspect | Cloud Flows | Env Var Definitions |
|--------|-------------|---------------------|
| File format | JSON (`Workflows/*.json`) | XML (`environmentvariabledefinitions/<name>/*.xml`) |
| Listed in Solution.xml RootComponents | Yes (`type="29"`) | **Yes** (`type="380"`) — required, or the definition won't travel through the pipeline |
| `pac solution pack` support | **No** — must build zip manually | **Yes** — works natively |

---

## Running `deploy.ps1`

```powershell
# Deploys to SMKB-Apps-Dev (the only allowed target)
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

This script deploys to **SMKB-Apps-Dev only**. Stage and Production are promoted via Power Platform Pipeline — the script will block any other target.

| Environment | Dataverse URL | Deploy method |
|-------------|---------------|---------------|
| Dev | `https://org229c958d.crm4.dynamics.com/` | This script |
| Stage | — | Power Platform Pipeline only |
| Prod | — | Power Platform Pipeline only |

> **Note:** The PAC auth profile named "SMKB-Apps-Dev" incorrectly targets `org1dce1895`.  
> Always rely on the default URL in `deploy.ps1`.

---

## Important: Definitions vs Values

| What | File | Commit to Git? |
|------|------|----------------|
| Variable **definition** (name, type, description, default) | `environmentvariabledefinition.xml` | **Yes** |
| Variable **value** (the actual secret or setting per environment) | set via portal or PAC | **Never** |

Values are per-environment overrides. Committing them would expose environment-specific secrets and settings to source control.

---

## ALM-Required Variables — Always Include With Cloud Flows

When your solution uses the **Flows Starter**, always activate these two variables. They are pre-built templates in this starter — just rename them to your prefix.

### `smkb_sol_EnvironmentName` — Environment identifier

| Setting | Value |
|---------|-------|
| Schema name | `smkb_sol_EnvironmentName` (apply-config renames the `sol` segment → e.g. `smkb_evt_EnvironmentName`) |
| Type | String |
| Default value | `dev` |

**Purpose:** Tells flows which environment they are running in. Flows use this to prefix email subjects with `(DEV)` or `(STAGE)` so non-production emails are clearly distinguishable. In production, no prefix is added.

**Pipeline setup:** After pipeline promotion, set the value to `stage` or `prod` in the environment connection settings — the same place you override any other env var value. Never commit values to Git.

### `smkb_sol_FlowErrorEmails` — Error notification recipients

| Setting | Value |
|---------|-------|
| Schema name | `smkb_sol_FlowErrorEmails` (apply-config renames the `sol` segment → e.g. `smkb_evt_FlowErrorEmails`) |
| Type | String |
| Default value | *(none — must be set per environment)* |

**Purpose:** Semicolon-separated list of email addresses that receive an alert whenever a flow in this solution fails. The list is different per environment — typically the dev team in Dev, and the operations team in Stage and Prod.

**Format (String, semicolon-separated — NOT JSON):** `ops@smkb.ac.il;dev@smkb.ac.il`

> **Do not use the JSON type for email lists.** A String consumed directly in a flow's `To` field needs no `json()` parsing, and a wrong type cannot be changed by reimport once deployed. This matches the Flows starter and CLAUDE.md → Critical Rule 5.

**Pipeline setup:** Set the value for each environment via pipeline connection settings. Do not commit email addresses to Git.

### Why these belong in env vars (not hardcoded in the flow)

| If hardcoded | If in env vars |
|-------------|----------------|
| Changing error recipients requires a code change + redeploy | Change the value in the portal per environment — no redeploy |
| All environments get the same subject prefix | Each environment controls its own name (`dev`, `stage`, `prod`) |
| Dev test emails go to production ops team | Each environment targets the correct audience |

This is the ALM pipeline model: flows are promoted unchanged through Dev → Stage → Prod. Env vars are the mechanism for everything that legitimately differs between environments.

---

## Security Baseline Variables — Abuse Thresholds and Alerting

Two more variables ship for the same reason as the ALM pair: an abuse threshold and an alert recipient list are *exactly* the kind of value that must differ per environment and must be changeable without a redeploy. They back the global-cap and abuse-alert controls described in the root **SECURITY-BASELINE.md** and the Flows starter's [FLOW_SNIPPETS.md](../SMKB%20-%20Power%20Automate%20Flows%20Starter/FLOW_SNIPPETS.md).

Both are renamed to your prefix by `apply-config.ps1` — do not rename them by hand.

### `smkb_sol_OtpDailyCap` — Global send cap

| Setting | Value |
|---------|-------|
| Schema name | `smkb_sol_OtpDailyCap` (apply-config renames the `sol` segment → e.g. `smkb_evt_OtpDailyCap`) |
| Type | **Number** (`100000001`) |
| Default value | `300` |

**Purpose:** A ceiling on how many one-time codes (or any other rate-sensitive send) the solution will issue across **all** identifiers in a rolling window. A per-identifier rate limit alone does not stop a spray across many identifiers; this is the second, global bound. A flow reads it, counts recent rows, and refuses past the threshold.

**Why an env var, not a constant:** Dev wants a low cap to make the control easy to exercise; production wants a realistic one. Tuning must not require a redeploy.

> This is a **Number**, so a flow consumes it directly with no parsing. Set it low in Dev to test that the rejection path actually works — a cap nobody has ever seen trigger is not a verified control.

### `smkb_sol_SecurityAlertEmails` — Security alert recipients

| Setting | Value |
|---------|-------|
| Schema name | `smkb_sol_SecurityAlertEmails` (apply-config renames the `sol` segment → e.g. `smkb_evt_SecurityAlertEmails`) |
| Type | String |
| Default value | *(none — must be set per environment)* |

**Purpose:** Semicolon-separated recipients for **suspicious-activity** alerts — the global cap tripping, or an account locking out. Deliberately separate from `smkb_sol_FlowErrorEmails`: a technical failure and a possible attack are different signals with different audiences and different urgency, and mixing them trains people to ignore both.

**Format (String, semicolon-separated — NOT JSON):** the same rule and the same reasoning as `FlowErrorEmails` above.

**Leave it empty to disable alerting.** A flow should treat an empty value as "no alerting configured" and skip the send rather than fail — the cap still rejects; only the notification is off.

> **Debounce the alert.** An alert that fires per rejected attempt turns an abuse attempt into an outbound mail flood from your own tenant. Alert on the *transition* into a capped/locked state, not on every attempt.

---

## Extracting Variables from an Existing Solution

To pull the current definitions out of an environment for the first time:

```powershell
pac solution export --name YourSolutionName --path .\YourSolutionName.zip --environment "https://org229c958d.crm4.dynamics.com/" --overwrite
pac solution unpack --zipFile .\YourSolutionName.zip --folder .\YourSolutionName_unpacked
# Copy environmentvariabledefinitions/ from the unpacked folder into this project
```
