# SMKB – Power Automate Flows Starter

This folder is the source-of-truth for Power Automate Cloud Flows developed for SMKB.  
Flows are stored as JSON files, version-controlled in Git, and pushed to Dataverse using `deploy.ps1`.

**Where to look:**
- **`Workflows/`** — the two flow skeletons you adapt and deploy (Power Pages + Power Apps Code App).
- **`examples/`** — real, production reference flows (OTP, bank list, approvals, …), never deployed. Read them to see the conventions applied end to end.
- **`FLOW_SNIPPETS.md`** — copy-paste JSON for every common pattern + 11 validation pitfalls learned the hard way.
- **`tools/flow-lint/`** — the validator that gates every deploy. Run `node tools/flow-lint/lint.mjs ".\Workflows"` anytime.

---

## Activation Guide — Do This First

> **Only activate this starter if your solution actually needs automated flows.**
> If flows are not part of your solution, leave this folder completely untouched — do not rename files, do not change placeholders, do not run deploy.ps1.

> **Orchestrated from the root.** This starter is standalone (it builds its own solution zip and deploys via `deploy.ps1`), but its **solution identity** — the `Other/Solution.xml` unique/display name, and the two ALM env-var schema names the example flow reads — is authored once in the root [`solution.config.json`](../solution.config.json) and applied by [`apply-config.ps1`](../apply-config.ps1). Do **not** hand-edit `YourSolutionName` / `Your Solution Name`; the ALM env-var `sol` segment is renamed for you. What you author here is the flow content (name it `smkb_<prefix>_<PascalName>`, display `PREFIX - Name`). Global naming/environment/deploy-order rules live in the root `CLAUDE.md`.

### Step 0 — Rename this folder

Before anything else, rename this folder from `SMKB - Power Automate Flows Starter` to match your solution:

```
SMKB - [Component Name] - Cloud Flows
```

| What to fill in | Example |
|----------------|---------|
| Component Name — describes what solution these flows belong to | `Events Tickets`, `Scholarship Applications` |

Full example rename: `SMKB - Events Tickets - Cloud Flows`

Renaming the folder does not affect `deploy.ps1` — it uses `$PSScriptRoot` to locate files.

### Step 1 — Confirm you need this starter

You need the Flows Starter if your solution requires any of:
- Power Pages–triggered logic (form submissions, email confirmations, OTPs, etc.)
- Scheduled background automation
- Automated notifications or approvals

If none of these apply, skip this starter entirely.

### Step 2 — Choose your solution short name

Pick a 2–5 letter lowercase prefix (e.g. `evt` for Events, `sch` for Scholarships).  
This prefix replaces `sol` in every component name.

### Step 3 — Replace all placeholders

Work through every placeholder below before running `deploy.ps1`. Do not skip any.

#### `Other/Solution.xml`

> `YourSolutionName` and `Your Solution Name` are set automatically by the root `apply-config.ps1` — do not edit them by hand.

#### `Workflows/` folder — the two example skeletons

The starter ships two ready-to-adapt skeletons. **Keep the one matching your trigger type and delete the other** (or keep both if your solution needs both), then remove the matching entries in `Customizations.xml` / `Solution.xml` for anything you delete:

- `smkb_sol_ExampleFlowPowerPages-…000001.json` — for flows called from a **Power Pages** portal.
- `smkb_sol_ExampleFlowPowerAppV2-…000002.json` — for flows called from a **Power Apps Code App**.

In the skeleton(s) you keep, replace:

| Find | Replace with |
|------|-------------|
| Filename `smkb_sol_ExampleFlowPowerPages-00000000-…-000000000001.json` | `smkb_<prefix>_YourFlowName-{GUID}.json` (GUID from the environment after first UI creation) |
| `smkb_sol_ExampleFlowPowerPages` / `smkb_sol_ExampleFlowPowerAppV2` (in the error-email text) | Your flow's schema name (e.g. `smkb_evt_SendConfirmation`) |
| `smkb_sol_EnvironmentName`, `smkb_sol_FlowErrorEmails` (env-var params) | Auto-renamed by `apply-config.ps1` to `smkb_<prefix>_…` (see below) |
| `[REPLACE: email subject]` / `[REPLACE: email body HTML]` | Your actual subject / body |
| `[REPLACE: …]` SharePoint `dataset` / `table` (PowerAppV2 skeleton) | Your site URL / list name |
| Trigger schema properties | Your actual input fields — see FLOW_SNIPPETS Snippets 6/7 for the exact format |

> **Connection references are already correct.** The skeletons use the SMKB bank logical names with `runtimeSource: "embedded"`, and the sender is already `noreply@smkb.ac.il`. Do not touch them unless you add a connector that is not in the bank.

#### `Other/Customizations.xml`
| Find | Replace with |
|------|-------------|
| `WorkflowId="{00000000-…-000000000001}"` (and `…0002`) | The real Dataverse workflow GUID(s) — see "How to get the GUID" below |
| `Name="SOL - Example Flow (…)"` | Your flow's display name |
| `/Workflows/smkb_sol_ExampleFlow_*-…json` | Your flow's JSON filename |

#### ALM env vars used by this flow

The example flow reads two environment variables that must also be activated in the Env Vars Starter:

| Env var schema name | Replace with | Purpose |
|---------------------|-------------|---------|
| `smkb_sol_EnvironmentName` | `smkb_<prefix>_EnvironmentName` (auto — apply-config renames the `sol` segment) | Current env name (`dev` / `stage` / `prod`) — used to prefix email subjects |
| `smkb_sol_FlowErrorEmails` | `smkb_<prefix>_FlowErrorEmails` (auto) | **String**, semicolon-separated list of error-report recipients — different per environment |

Replace both `sol_` prefixes in the flow JSON the same way you replace all other `sol_` placeholders.

#### `Other/Solution.xml` — RootComponents
| Find | Replace with |
|------|-------------|
| `id="{00000000-…-000000000001}"` (and `…0002`) | The real Dataverse workflow GUID(s) — one `<RootComponent>` per flow you keep |

> **Note on the workflow GUID:** You cannot get this GUID until the flow exists in Dataverse. Create a stub flow in the Power Automate UI first, export the solution to get the GUID, then come back and replace the placeholder. See the "Development Workflow" section below.

#### Connection Reference Logical Names — How to Find Them

The flow JSON's `connectionReferences` section maps a **local key** (arbitrary, only used inside that JSON) to an environment-level **logical name**. You need the logical name of a connection reference that already exists in the target environment.

> **The bank is pre-filled:** all four SMKB connection-reference logical names are already baked into the skeletons and `Other/Customizations.xml` — see "The SMKB connection-reference bank" below. You do **not** need the lookup below unless you introduce a connector that is not in the bank.

To find logical names from an existing working solution:

```powershell
pac solution export --name <AnExistingSolutionWithFlows> --path .\inspect.zip --environment "https://org229c958d.crm4.dynamics.com/" --overwrite
pac solution unpack --zipFile .\inspect.zip --folder .\inspect_unpacked
# ⚠️ There is NO connectionreferences/ folder — logical names are inside flow JSON files:
Get-ChildItem .\inspect_unpacked\Workflows -Filter "*.json" | ForEach-Object {
    $j = Get-Content $_.FullName | ConvertFrom-Json
    $j.properties.connectionReferences.PSObject.Properties | ForEach-Object {
        [PSCustomObject]@{
            LocalKey    = $_.Name
            ApiName     = $_.Value.api.name
            LogicalName = $_.Value.connection.connectionReferenceLogicalName
        }
    }
} | Sort-Object LogicalName -Unique | Format-Table -AutoSize
Remove-Item .\inspect.zip, .\inspect_unpacked -Recurse -Force
```

Use the `LogicalName` column value as-is — that exact string goes into the flow JSON's `connectionReferenceLogicalName` field.

> **After import:** flows are often left disabled until connection references are confirmed in the portal. Go to Solutions → your solution → Cloud Flows, open each disabled flow, confirm the connection reference assignments, and turn it on.

### Step 4 — Verify no placeholders remain

Run this before deploying:

```powershell
$patterns = 'YourSolutionName','smkb_sol_','00000000-0000-0000-0000-000000000001','\[yourid\]','\[REPLACE','\[sol\]'
Get-ChildItem ".\Other",".\Workflows" -Recurse -File | ForEach-Object {
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

---

---

## Naming Convention

Every component's schema name is `smkb_<prefix>_<PascalName>` (fixed publisher prefix + your solution short prefix + PascalCase name), so no two solutions ever share a component name. The template's placeholder short prefix is **`sol`** — replace it with your solution's short name (`apply-config.ps1` does this for the ALM env vars automatically).

| Placeholder name | Real example |
|-----------------|--------------|
| `smkb_sol_ExampleFlow` | `smkb_evt_SendConfirmation` |
| `YourSolutionName` (in Solution.xml) | `SMKBEvents` |

**Rule:** every flow is named `smkb_<prefix>_<PascalName>` (schema) with display `<PREFIX> - <Name>`.  
Never use a generic name like `SendEmail` that could collide with flows in other solutions. See CLAUDE.md → Critical Rule 3.

---

## Core Concept

In Power Platform, a **solution is a list of references** — it does not own the flow.  
A flow is a single Dataverse record (`workflow` table). Multiple solutions can reference the same record.  
When you push an updated JSON here, the underlying record is updated everywhere it is referenced.

```
Git repo (JSON)  →  deploy.ps1  →  Dataverse workflow record  →  reflected in every solution that references it
```

You **do not need a separate "flows solution"**.  
Assign each flow to its proper main solution once, and every subsequent deploy updates it in place.

---

## Deploy Behavior: Draft vs Published

This is the most common source of confusion when working with flows. Understanding it will save hours of debugging.

Every Power Automate flow has two definitions: a **Draft** (what you see when you click Edit in the portal) and a **Published** (what actually runs when the flow is triggered). `pac solution import` does not always update the Published definition.

### When import updates the Published definition ("deactivated and replaced")

The deploy output shows:
```
The original workflow definition has been deactivated and replaced.
```

This happens when:
- The flow is imported for the **first time** with a given GUID (new to the environment), OR
- The flow's **trigger type** in the JSON differs from the current Published trigger (e.g. `"PowerApps"` → `"PowerAppV2"`)

The import deactivates the existing definition, replaces it with your JSON, and `--activate-plugins` re-activates it. The portal will show the updated logic immediately.

### When import does NOT update the Published definition

If "deactivated and replaced" does **not** appear in the output, the import only wrote to the Draft. The Published definition — and therefore what actually runs — is unchanged. This happens when the trigger type is already correct and the flow was Active.

**Fix:** Change the trigger `kind` in your JSON to force a full replacement. Even a round-trip (`"PowerApps"` → `"PowerAppV2"` or vice versa) forces "deactivated and replaced" and updates the Published definition. Redeploy after the change.

### Newly imported flows are Inactive after first deploy

When a flow is created in the portal and then deployed for the first time via this project, the deploy shows "deactivated and replaced" but the flow ends up **Inactive** (the `--activate-plugins` flag re-activates existing flows but not brand-new imports). 

`pnpm pa list-flows` will show it as `Inactive`. Go to the Power Automate portal → your solution → Cloud Flows → turn it on. This one-time manual activation is not needed for subsequent deploys.

---

## Project Structure

```
SMKB - Power Automate Flows Starter/
│
├── Other/
│   ├── Solution.xml          ← solution metadata + RootComponent entry per flow (type=29)
│   └── Customizations.xml    ← Workflow entry per flow + <connectionreferences> bank — NOT childless
│
├── Workflows/                ← DEPLOYED. One file per flow; this is what you edit.
│   ├── smkb_sol_ExampleFlowPowerPages-…000001.json   ← Power Pages skeleton
│   └── smkb_sol_ExampleFlowPowerAppV2-…000002.json   ← Power Apps Code App skeleton
│
├── examples/                 ← NOT deployed. Real reference flows (OTP, bank list, …) + index README.
│
├── tools/flow-lint/          ← bundled, zero-dependency validator (security + import-error rules)
│
├── deploy.ps1                ← flow-lint gate → builds zip → pac solution import
├── deployment-settings-template.json  ← copy to deployment-settings.json for stage/prod mapping
└── .gitignore                ← ignores _dist/, *.zip, deployment-settings.json
```

The example files are the two skeletons in `Workflows/`. Keep the one matching your trigger type
(delete the other), rename it, update its contents, and replace the placeholder GUID with the real
Dataverse workflow GUID before deploying. The `examples/` folder is reference-only — nothing there is
packed or deployed (`deploy.ps1` only zips `Workflows/*.json`).

### Adding a flow — the three-file rule

Every flow must be registered in **three places**. Missing any one causes a deploy failure with "component not declared in the solution file as a root component."

| File | What to add |
|------|------------|
| `Workflows/<name>-<GUID>.json` | The full flow definition JSON |
| `Other/Customizations.xml` | A `<Workflow WorkflowId="{GUID}">` entry (see template below) |
| `Other/Solution.xml` | A `<RootComponent type="29" id="{GUID}" behavior="0" />` entry |

**Customizations.xml `<Workflow>` entry template** (copy-paste for each new flow):

```xml
<Workflow WorkflowId="{YOUR-GUID-HERE}" Name="PREFIX - Flow Display Name">
  <JsonFileName>/Workflows/prefix_flow_name-YOUR-GUID-HERE.json</JsonFileName>
  <Type>1</Type>
  <Subprocess>0</Subprocess>
  <Category>5</Category>
  <Mode>0</Mode>
  <Scope>4</Scope>
  <OnDemand>0</OnDemand>
  <TriggerOnCreate>0</TriggerOnCreate>
  <TriggerOnDelete>0</TriggerOnDelete>
  <AsyncAutodelete>0</AsyncAutodelete>
  <SyncWorkflowLogOnFailure>0</SyncWorkflowLogOnFailure>
  <StateCode>1</StateCode>
  <StatusCode>2</StatusCode>
  <RunAs>1</RunAs>
  <IsTransacted>1</IsTransacted>
  <IntroducedVersion>1.0.0.0</IntroducedVersion>
  <IsCustomizable>1</IsCustomizable>
  <BusinessProcessType>0</BusinessProcessType>
  <IsCustomProcessingStepAllowedForOtherPublishers>1</IsCustomProcessingStepAllowedForOtherPublishers>
  <PrimaryEntity>none</PrimaryEntity>
  <LocalizedNames>
    <LocalizedName languagecode="1033" description="PREFIX - Flow Display Name" />
  </LocalizedNames>
</Workflow>
```

> The GUID in `WorkflowId`, `JsonFileName`, and the `Solution.xml` `RootComponent id` must all be the **same** Dataverse workflowEntityId (lowercase, with braces in XML).

---

## Development Workflow

### First time: add an existing flow to this project

> **Three files must be updated in lockstep** — JSON + `Customizations.xml` + `Solution.xml`. Missing any one fails the deploy. See the "Adding a flow — the three-file rule" section above for the exact templates.

1. Open the Power Platform portal, go to your main solution, open the flow.
2. Note the solution's **Unique Name** (e.g. `YourSolutionName`).
3. Export that solution via PAC CLI to get the Dataverse workflowEntityId:
   ```powershell
   pac solution export --name YourSolutionName --path .\YourSolutionName.zip --overwrite
   pac solution unpack --zipFile .\YourSolutionName.zip --folder .\YourSolutionName_unpacked
   ```
4. Inside `YourSolutionName_unpacked\Workflows\` find the file named `<FlowName>-<GUID>.json`.  
   The GUID in the filename is the **Dataverse workflowEntityId** — the only ID that works with PAC CLI.  
   ⚠️ This is **not** the same as the flow ID shown in the Power Automate URL.
5. Copy that JSON file into this project's `Workflows\` folder.
6. Add a `<Workflow WorkflowId="{GUID}">` entry to `Other\Customizations.xml` (use the template from the three-file rule section).
7. Add a line to `Other\Solution.xml` inside `<RootComponents>`:
   ```xml
   <RootComponent type="29" id="{YOUR-GUID-HERE}" behavior="0" />
   ```
8. `<UniqueName>` in `Other\Solution.xml` is set from the root `solution.config.json` by `apply-config.ps1` — no manual edit needed (run it from the repo root if you haven't).
9. Run `deploy.ps1` once to verify everything works.
10. Commit the JSON and both updated XML files.

### Ongoing: update a flow

1. Edit `Workflows\<FlowName>-<GUID>.json` locally.
2. Run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File deploy.ps1
   ```
3. Check the deploy output for: `The original workflow definition has been deactivated and replaced.`  
   This message confirms the **Published** (running) definition was updated. See "Deploy Behavior" below for what happens if this message does not appear.
4. The flow is updated in Dataverse and reflected in all solutions that reference it.
5. Commit the changes.

### Creating a brand-new flow

Power Platform does not support creating a new flow purely from JSON — the flow record must exist in Dataverse first. Always choose the correct trigger at creation time (see "Triggers" sections below — you cannot change trigger type purely through the portal UI).

1. Create a stub flow in the Power Automate UI with the correct trigger (e.g. "When Power Apps calls a flow (V2)" for Code App flows, or the Power Pages trigger for portal flows). A single "Compose" stub action is enough.

2. Add it to your solution — **either** from the portal UI (solution → Add existing → Automation) **or** via CLI:
   ```powershell
   pac solution add-solution-component `
       --environment "https://org229c958d.crm4.dynamics.com/" `
       --solutionUniqueName <SolutionUniqueName> `
       --component <workflowEntityId> `
       --componentType 29
   ```
   The `workflowEntityId` comes from step 3.

3. Get the Dataverse workflowEntityId — export the solution and read the filename:
   ```powershell
   pac solution export --name <SolutionUniqueName> --path .\out.zip --overwrite
   pac solution unpack --zipFile .\out.zip --folder .\out_unpacked
   # Filename inside out_unpacked\Workflows\ = <FlowName>-<workflowEntityId>.json
   ```
   Alternatively, run `pnpm pa add-flow --flow-id <portalFlowId> --non-interactive` and read `workflowEntityId` from `power.config.json`.

4. Update the **three files** (see "Adding a flow — the three-file rule"):
   - Create `Workflows/<name>-<workflowEntityId>.json` with your full implementation
   - Add a `<Workflow WorkflowId="{...}">` entry to `Other/Customizations.xml`
   - Add a `<RootComponent type="29" id="{...}">` entry to `Other/Solution.xml`

5. Run `deploy.ps1`. Look for "The original workflow definition has been deactivated and replaced." in the output — this confirms the Published definition was updated.

6. If the flow appears as `Inactive` in `pnpm pa list-flows`, turn it on in the portal once.

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

## How `deploy.ps1` Works

PAC CLI's `solution pack` command **cannot include Cloud Flow JSONs** from scratch (known limitation).  
The script bypasses this by building the solution zip manually, then calling `pac solution import`.

Before building the zip, `deploy.ps1`:
1. Runs an inline **placeholder backstop** (always, no Node needed) — blocks if any `sol_`/`[REPLACE]`/placeholder-GUID token remains in `Other/*.xml` or `Workflows/*.json`.
2. If Node is installed, runs the bundled **flow-lint** (`tools/flow-lint/lint.mjs` over `Workflows/`) — the security + import-error checker — and **aborts on any error**. It enforces the 256-char description limit, `embedded`-only connections, Power Pages field titles, env-var references, and `Workflows`↔`Customizations.xml` consistency, plus the audit's security invariants (auth-token validation, URL-injection encoding). See `tools/flow-lint/README.md`.

> flow-lint is **bundled** in this starter so it works standalone. When this starter is merged into the
> multi-starter solution, the same validator is also wired into the solution's pre-commit hook and CI.
> Run it yourself anytime: `node tools/flow-lint/lint.mjs ".\Workflows"` (add `--strict` to fail on warnings).

Zip structure the platform expects:
```
[Content_Types].xml
customizations.xml    ← must contain a <Workflow WorkflowId="..."> entry for every flow
solution.xml          ← must contain a <RootComponent type="29" id="..."> for every flow
Workflows/
  <FlowName>-<GUID>.json
```

---

## Testing your flows

There is **no local Power Automate engine** — a flow's *behavior* can only be run on cloud Dev. What you *can* do locally is validate a flow's *structure and security invariants* with the bundled `flow-lint`. Plan your testing around that split:

| What | Where | How |
|------|-------|-----|
| Flow **structure** + **security invariants** (schema valid, `embedded` connections only, descriptions ≤256, Power Pages field titles, env-var refs resolve, no placeholders, XML↔JSON consistency, auth-token validation, URL-injection encoding) | **Local** | `node tools/flow-lint/lint.mjs ".\Workflows"` — the same gate `deploy.ps1` runs |
| Flow **behavior** (does the logic do the right thing?) | **Cloud Dev only** | Deploy, trigger the flow (portal / Code App / Power Pages endpoint), inspect the run history |
| End-to-end journeys | **Cloud Dev** | Drive the calling site/app against the deployed flow |

**Keep flow bodies thin:** push pure logic (validation, formatting, error-code mapping) into the calling SPA where it can be unit-tested locally; let the flow orchestrate connectors. When a flow *must* carry logic, add a `flow-lint` rule (`tools/flow-lint/rules.mjs`) so the invariant can never silently regress. See `FLOW_SNIPPETS.md` Snippet 14.

---

## Wiring flow-lint beyond deploy (pre-commit + CI)

`deploy.ps1` already gates on `flow-lint`. To catch problems even earlier, wire the bundled validator into a **pre-commit hook** and **CI**. These are provided as copy-paste rather than committed files, because when this starter is merged into the multi-starter solution the hook/CI live once at the solution root (do not ship competing copies).

**Git pre-commit** (`.githooks/pre-commit`, then `git config core.hooksPath .githooks`):
```sh
#!/bin/sh
# flow-lint on staged cloud-flow JSON / solution XML (skips gracefully if node is absent)
FLOW_STAGED=$(git diff --cached --name-only --diff-filter=ACMR | grep -Ei '(Workflows/.*\.json|Other/.*\.xml)$')
if [ -n "$FLOW_STAGED" ] && command -v node >/dev/null 2>&1; then
  node tools/flow-lint/lint.mjs ".\\Workflows" || exit 1
fi
```

**CI** (e.g. `.github/workflows/ci.yml` — zero-dependency, no cloud auth):
```yaml
jobs:
  flow-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: node tools/flow-lint/lint.mjs "./Workflows"
```

Microsoft's **Solution Checker** (`pac solution check`) is complementary — run it in CI once the `AZURE_*` service-principal secrets are set. It covers documented best-practice/security rules that flow-lint does not, and vice-versa.

---

## Conventions & Defaults

### Connections / Connection References

#### The SMKB connection-reference bank

Connection references are **environment-level shared resources**. Never create a new one per solution — reuse the exact logical names below (this is the SMKB bank). All connect through the **SMKB User1** service accounts; never use a personal-account connection (it breaks when that account's credentials change).

| Logical name | Display name | Connector (`api.name`) | Used for |
|---|---|---|---|
| `new_sharedoffice365_c3167` | SMKB - Outlook | `shared_office365` | All email sending |
| `smkb_SMKBSharePointConnectionUser1` | SMKB - SharePoint | `shared_sharepointonline` | All SharePoint list reads/writes |
| `msdyn_Dataverse` | SMKB - Dataverse | `shared_commondataserviceforapps` | Dataverse actions + reading Secret env vars |
| `smkb_SMKBApprovals` | SMKB - Approvals | `shared_approvals` | Approvals |

These logical names are **already filled in** — in the two example skeletons, in `Other/Customizations.xml`, and in `FLOW_SNIPPETS.md`. You do not need the export/lookup step below unless you introduce a connector that is not in the bank.

#### How connection references work in flow JSON

Every flow JSON has a `properties.connectionReferences` block. Each entry has two distinct names:

- **Local key** (e.g. `shared_sharepointonline_sol`) — an arbitrary string used only inside that JSON file. Every action that calls a connector references this key in its `connectionName` field. Rename the suffix to your prefix if you like; it changes nothing at runtime.
- **Logical name** (e.g. `smkb_SMKBSharePointConnectionUser1`) — the environment-level connection reference from the bank above. This is what actually resolves at runtime.

**Template — copy this into every new flow JSON (keep only the connectors your flow uses):**
```json
"connectionReferences": {
  "shared_office365_sol": {
    "runtimeSource": "embedded",
    "connection": {
      "connectionReferenceLogicalName": "new_sharedoffice365_c3167"
    },
    "api": { "name": "shared_office365" }
  },
  "shared_sharepointonline_sol": {
    "runtimeSource": "embedded",
    "connection": {
      "connectionReferenceLogicalName": "smkb_SMKBSharePointConnectionUser1"
    },
    "api": { "name": "shared_sharepointonline" }
  }
}
```

`runtimeSource: "embedded"` is **required** — it resolves the connection from the solution definition. An `"invoker"` connection has no identity for an anonymous Power Pages call and causes a recurring **403 on every deploy** (FLOW_SNIPPETS Pitfalls 9c/9d/9g). flow-lint blocks any non-`embedded` connection.

Each action using a connector then references the **local key** in its `host.connectionName`:
```json
"host": {
  "connectionName": "shared_sharepointonline_sol",
  "operationId": "GetItems",
  "apiId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"
}
```

#### Connection references in Customizations.xml — required

`Other/Customizations.xml` has a `<connectionreferences>` section that lists the connection-reference metadata deployed to Dataverse alongside the flows. This is the **only** place the solution stores connection references — there is no `connectionreferences/` folder, and they are **not** `RootComponent`s in `Solution.xml` (verified against the live solution). The starter ships **all four** bank connectors here so every flow can reference any of them without re-adding metadata:

> **Trim this list BEFORE the first deploy — a connection reference cannot be removed by re-importing.**
> An unmanaged solution import is an **upsert**, so deleting an entry from this file does *not* delete
> it from the environment, and `pac solution` has `add-solution-component` but **no remove
> counterpart** — so the cleanup cannot be scripted. A real solution shipped with two unused bank
> connectors (Approvals and SharePoint) permanently in its deployed solution, removable only by hand
> in the Maker portal. Delete the connectors your flows will not use *before* you deploy, and they
> never arrive in the first place.

```xml
<connectionreferences>
  <connectionreference connectionreferencelogicalname="new_sharedoffice365_c3167">
    <connectionreferencedisplayname>SMKB - Outlook</connectionreferencedisplayname>
    <connectorid>/providers/Microsoft.PowerApps/apis/shared_office365</connectorid>
    <iscustomizable>1</iscustomizable>
    <promptingbehavior>0</promptingbehavior>
    <statecode>0</statecode>
    <statuscode>1</statuscode>
  </connectionreference>
  <connectionreference connectionreferencelogicalname="smkb_SMKBSharePointConnectionUser1">
    <connectionreferencedisplayname>SMKB - SharePoint</connectionreferencedisplayname>
    <connectorid>/providers/Microsoft.PowerApps/apis/shared_sharepointonline</connectorid>
    <iscustomizable>1</iscustomizable>
    <promptingbehavior>0</promptingbehavior>
    <statecode>0</statecode>
    <statuscode>1</statuscode>
  </connectionreference>
  <connectionreference connectionreferencelogicalname="msdyn_Dataverse">
    <connectionreferencedisplayname>SMKB - Dataverse</connectionreferencedisplayname>
    <connectorid>/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps</connectorid>
    <iscustomizable>1</iscustomizable>
    <promptingbehavior>0</promptingbehavior>
    <statecode>0</statecode>
    <statuscode>1</statuscode>
  </connectionreference>
  <connectionreference connectionreferencelogicalname="smkb_SMKBApprovals">
    <connectionreferencedisplayname>SMKB - Approvals</connectionreferencedisplayname>
    <connectorid>/providers/Microsoft.PowerApps/apis/shared_approvals</connectorid>
    <iscustomizable>1</iscustomizable>
    <promptingbehavior>0</promptingbehavior>
    <statecode>0</statecode>
    <statuscode>1</statuscode>
  </connectionreference>
</connectionreferences>
```

Keep all four (the bank). You *may* delete an entry for a connector your solution's flows genuinely never use, but the default is to keep them. Do NOT add connection references to `Solution.xml` `<RootComponents>` — they are environment-level shared resources, not solution-owned components.

### Email Sender

Always send emails from:
```
NoReply@smkb.ac.il
```

In the Send Email action, always set `emailMessage/From` to `NoReply@smkb.ac.il`.

### Triggers for Power App Code Apps (PowerAppV2)

When a flow is called by a **Power Apps Code App** (a Vue 3 SPA deployed via `pac code push` + `pnpm pa`), it must use the `PowerAppV2` trigger — not Http, not PowerPages.

```json
"triggers": {
  "manual": {
    "type": "Request",
    "kind": "PowerAppV2",
    "inputs": {
      "schema": {
        "type": "object",
        "required": ["paramName"],
        "properties": {
          "paramName": { "type": "string", "description": "..." }
        }
      }
    }
  }
}
```

`pnpm pa list-flows` only lists flows whose **Published** definition has `kind: "PowerApps"` or `kind: "PowerAppV2"`. If a flow doesn't appear, it has an Http trigger in its Published definition.

#### Complete workflow — wiring a new flow to a Code App

1. **Create the flow in the portal** with trigger **"When Power Apps calls a flow (V2)"**. A single "Compose" stub action is fine initially.

2. **Add to solution** (from portal UI or CLI):
   ```powershell
   pac solution add-solution-component `
     --environment "https://org229c958d.crm4.dynamics.com/" `
     --solutionUniqueName <SolutionUniqueName> `
     --component <workflowEntityId> `
     --componentType 29
   ```

3. **Register in the Code App** (run from inside the Power App folder):
   ```powershell
   pnpm pa add-flow --flow-id <PowerAutomateFlowId> --non-interactive
   ```
   `--flow-id` is the **Power Automate flow ID** (from the portal URL) — not the workflowEntityId. After this command, `power.config.json` is populated with both IDs under `workflowDetails`.

4. **Create the local JSON** at `Workflows/<name>-<workflowEntityId>.json` with `kind: "PowerAppV2"` and full action logic. The filename GUID must match the `workflowEntityId` from step 3.

5. **Update Customizations.xml and Solution.xml** (three-file rule — see Project Structure section).

6. **Deploy**: `powershell -ExecutionPolicy Bypass -File deploy.ps1`  
   Verify "The original workflow definition has been deactivated and replaced." appears in output.

7. **Activate if Inactive**: `pnpm pa list-flows --non-interactive` → if the flow shows Inactive, turn it on in the portal (one-time only).

#### Why flows cannot be created purely programmatically

Power Platform does not support creating a flow from a JSON file. The flow **record** must exist in Dataverse first (created in the portal), then the deploy updates its definition. This is why the first step is always manual portal creation — there is no workaround.

#### Changing an existing flow's trigger type

If a flow already exists with an Http trigger, you can change it to PowerAppV2 by updating `kind` in the JSON and redeploying. The trigger type difference forces "deactivated and replaced" (the import replaces the Published definition). After redeploy, the flow will appear in `pnpm pa list-flows`.

---

### Triggers for Power Pages Sites

When a flow is triggered from a Power Pages site, **use the Power Pages trigger** — not the generic HTTP trigger.

| Trigger | Use when |
|---------|----------|
| Power Pages trigger (`kind: PowerPages`) | Flow is called from a Power Pages site |
| HTTP trigger (`kind: Http`) | Flow is called from an external system (non-Power Pages) |

The Power Pages trigger is more secure: it validates the caller is a Power Pages site in the same environment and does not expose a raw public HTTP endpoint.

> **Critical:** The trigger schema must exactly match the format PA designer generates. Hand-written schema property keys cause HTTP 500 with no run appearing in flow history. See `FLOW_SNIPPETS.md` Snippet 7 for the full copy-paste template and Pitfall 9f for the failure mode.

Confirmed working trigger format:
```json
"manual": {
  "metadata": {
    "operationMetadataId": "f8e7d6c5-b4a3-4f21-8e9d-0c1b2a3d4e5f"
  },
  "type": "Request",
  "kind": "PowerPages",
  "inputs": {
    "schema": {
      "type": "object",
      "properties": {
        "text": {
          "title": "phone",
          "type": "string",
          "x-ms-dynamically-added": true,
          "description": "Please enter your input",
          "x-ms-content-hint": "TEXT"
        }
      },
      "required": ["text"]
    }
  }
}
```

**Key rules:**
- `metadata.operationMetadataId` is required — any UUID works, but it must be present
- Schema property keys are PA designer type names (`"text"`, `"text_1"`, `"number"`), NOT the user-defined input labels
- The portal sends `{ phone: "..." }` (by label/title); `triggerBody()?['text']` returns the value; `triggerBody()?['phone']` returns null
- `required` array must list schema keys, not titles: `["text"]` not `["phone"]`

---

## ALM-Aware Flow Patterns

The example flow demonstrates two patterns that every production flow should follow. Both depend on the **Env Vars Starter** being activated alongside this starter.

### Reading an environment variable inside a flow

Do **not** use a `GetEnvironmentVariableValue` action — that operationId does **not** exist on the
`commondataserviceforapps` connector and the flow fails to save. Instead, inject the value as a flow
**parameter** bound to the env var's schema name, and read it with `parameters(...)`.

Declare the parameter inside `definition.parameters` (alongside `$authentication` / `$connections`):

```json
"ENVIRONMENT_NAME (smkb_sol_EnvironmentName)": {
  "defaultValue": "dev",
  "type": "String",
  "metadata": {
    "schemaName": "smkb_sol_EnvironmentName",
    "description": "Logical environment name (dev/stage/prod)."
  }
}
```

Read it anywhere in the flow: `@parameters('ENVIRONMENT_NAME (smkb_sol_EnvironmentName)')`.
See `FLOW_SNIPPETS.md` Snippet 1 for the full pattern — and Snippet 11 for **Secret** env vars, which
cannot use this mechanism and must be fetched at runtime via `RetrieveEnvironmentVariableSecretValue`.

### Environment-prefixed email subjects

Prefix every outgoing email subject with the environment name in Dev and Stage — so non-production emails are immediately recognisable. In production, no prefix is added.

```
Subject expression:
@if(
  equals(parameters('ENVIRONMENT_NAME (smkb_sol_EnvironmentName)'), 'prod'),
  'Your actual subject',
  concat('(', toUpper(parameters('ENVIRONMENT_NAME (smkb_sol_EnvironmentName)')), ') Your actual subject')
)
```

Result: `(DEV) Confirmation email` in Dev, `(STAGE) Confirmation email` in Stage, `Confirmation email` in Prod.

### Error handling with Scope + error notification

Wrap all main logic in a `Scope` action called `Main_Flow`. Add a second `Scope` called `Handle_Flow_Error` that runs only when `Main_Flow` fails:

```json
"Handle_Flow_Error": {
  "type": "Scope",
  "runAfter": {
    "Main_Flow": ["Failed", "TimedOut", "Skipped"]
  },
  "actions": {
    "Send_error_notification": { ... },
    "Respond_with_error": {
      "type": "Response",
      "inputs": { "statusCode": 200, "body": { "errorCode": "ERROR" } },
      "runAfter": { "Send_error_notification": ["Succeeded", "Failed", "Skipped"] }
    }
  }
}
```

The error notification email reads the `smkb_sol_FlowErrorEmails` env var — a **String** of semicolon-separated addresses (e.g. `admin@smkb.ac.il;ops@smkb.ac.il`). Reference it directly in the `To` field; no parsing needed:

```
@parameters('ERROR_EMAILS (smkb_sol_FlowErrorEmails)')
```

> **Do not use JSON type for this env var.** Using JSON type requires `json()` parsing in every expression. The String type works directly and is simpler to maintain.

**Why the error Scope also needs `Respond_with_error`:** For Power Pages–triggered flows, the calling site waits for an HTTP response. If the flow fails without responding, the site hangs until a timeout. Return a **200** response carrying `{ "errorCode": "ERROR" }` — Power Pages discards the body of any non-2xx flow response (handing the caller a generic `00000006` envelope), so a 500 would leave the portal unable to read the error. See `FLOW_SNIPPETS.md` Snippet 8 (Response Contract) for the full rule.

### Required env vars

Both patterns require these env vars in the Env Vars Starter (rename to your prefix):

| Template schema name | Rename to | Purpose |
|---------------------|-----------|---------|
| `smkb_sol_EnvironmentName` | `smkb_<prefix>_EnvironmentName` (auto — apply-config) | Email subject prefix; default `dev` |
| `smkb_sol_FlowErrorEmails` | `smkb_<prefix>_FlowErrorEmails` (auto) | Error recipient list; **String type**, semicolon-separated (e.g. `a@smkb.ac.il;b@smkb.ac.il`); no default — set per env via pipeline |

---

## Three Flow IDs — Important

Power Platform uses three different identifiers for the same flow. They are **not interchangeable**:

| ID | Where it appears | Used for |
|----|-----------------|---------|
| **Dataverse workflowEntityId** | Solution zip filename (`FlowName-{GUID}.json`), `Customizations.xml WorkflowId`, `Solution.xml RootComponent id`, `power.config.json workflowEntityId` | PAC CLI, `pac solution import`, `pac solution add-solution-component --component` |
| **Power Automate flow ID** (workflowName) | Browser URL: `make.powerautomate.com/.../flows/{ID}`, `pnpm pa list-flows` "Flow ID" column, `power.config.json workflowName` | `pnpm pa add-flow --flow-id <this-id>` — **not** the same as workflowEntityId |
| **Connection reference key** | `power.config.json connectionReferences` top-level UUID key | Auto-generated by `pnpm pa add-flow`; do not write manually |

Only the **Dataverse workflowEntityId** works with PAC CLI and solution XML files.  
Only the **Power Automate flow ID** works with `pnpm pa add-flow --flow-id`.

After running `pnpm pa add-flow`, `power.config.json` stores both under `workflowDetails`:
```json
"workflowDetails": {
  "workflowEntityId": "6c504095-...",   ← Dataverse GUID (filename / XML)
  "workflowName": "1a3594a6-...",        ← Power Automate flow ID (pnpm pa / portal URL)
  "workflowDisplayName": "PVCH - Manager Get Lecturers"
}
```

---

## Useful PAC CLI Commands

```powershell
# Add an existing (already-in-Dataverse) flow to a solution — one-time operation
pac solution add-solution-component `
    --environment "https://org229c958d.crm4.dynamics.com/" `
    --solutionUniqueName <SolutionUniqueName> `
    --component <DataverseWorkflowGUID> `
    --componentType 29

# Export a solution to inspect its flow GUIDs (workflowEntityId = filename GUID)
pac solution export --name <SolutionUniqueName> --path .\out.zip --overwrite
pac solution unpack --zipFile .\out.zip --folder .\out_unpacked

# List solutions in an environment
pac solution list --environment "https://org229c958d.crm4.dynamics.com/"
```

## Useful `pnpm pa` Commands (Code App only)

Run these from inside the `SMKB - [App Name] - Power App` folder.

```powershell
# List flows visible to this Code App (only shows PowerApps/PowerAppV2 Published triggers)
pnpm pa list-flows --non-interactive

# Register a flow in power.config.json
# --flow-id is the Power Automate flow ID (from portal URL), NOT the workflowEntityId
pnpm pa add-flow --flow-id <PowerAutomateFlowId> --non-interactive

# Remove a flow registration from power.config.json
pnpm pa remove-flow --flow-id <PowerAutomateFlowId> --non-interactive
```

After `pnpm pa add-flow`, `power.config.json` stores both IDs:
- `workflowEntityId` → use this as the JSON filename GUID and in `Customizations.xml` / `Solution.xml`
- `workflowName` → this is the Power Automate flow ID (same value you passed to `--flow-id`)
