# SMKB – Power Automate Flows Starter

This folder is the source-of-truth for Power Automate Cloud Flows developed for SMKB.  
Flows are stored as JSON files, version-controlled in Git, and pushed to Dataverse using `deploy.ps1`.

---

## Activation Guide — Do This First

> **Only activate this starter if your solution actually needs automated flows.**
> If flows are not part of your solution, leave this folder completely untouched — do not rename files, do not change placeholders, do not run deploy.ps1.

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
| Find | Replace with |
|------|-------------|
| `YourSolutionName` | Your solution's unique name (e.g. `SMKBEvents`) |
| `Your Solution Name` | Your solution's display name (e.g. `SMKB – Events`) |

#### `Workflows/` folder
| Find | Replace with |
|------|-------------|
| Filename `sol_example_flow-00000000-0000-0000-0000-000000000001.json` | `[sol]_your_flow_name-{GUID}.json` (GUID comes from the environment after first UI creation) |
| `sol_example_flow` in flow JSON `displayName` field | Your flow's display name (e.g. `evt_send_confirmation`) |
| `[sol]NoReply@yourdomain.com` | `NoReply@smkb.ac.il` |
| `shared_office365_[yourid]` | The real connection reference logical name from your environment |
| `shared_commondataserviceforapps_[yourid]` | The real connection reference logical name from your environment |
| `[REPLACE: email subject]` | Your actual email subject |
| `[REPLACE: email body HTML]` | Your actual email body |
| Trigger schema properties (`recipient`, `exampleParam`) | Your actual input parameters |

#### `Other/Customizations.xml`
| Find | Replace with |
|------|-------------|
| `WorkflowId="{00000000-0000-0000-0000-000000000001}"` | The real Dataverse workflow GUID (see "How to get the GUID" below) |
| `Name="sol_example_flow"` | Your flow's name |
| `/Workflows/sol_example_flow-00000000-0000-0000-0000-000000000001.json` | Your flow's JSON filename |

#### `Other/Solution.xml` — RootComponents
| Find | Replace with |
|------|-------------|
| `id="{00000000-0000-0000-0000-000000000001}"` | The real Dataverse workflow GUID |

> **Note on the workflow GUID:** You cannot get this GUID until the flow exists in Dataverse. Create a stub flow in the Power Automate UI first, export the solution to get the GUID, then come back and replace the placeholder. See the "Development Workflow" section below.

#### Connection Reference Logical Names — How to Find Them

The flow JSON's `connectionReferences` section contains entries like:
```json
"shared_office365_[yourid]": { ... },
"shared_commondataserviceforapps_[yourid]": { ... }
```

Replace `[yourid]` with the **logical name** of an existing connection reference in the target environment. Connection references are environment-level shared resources — do NOT create a new one per solution. Find existing ones by exporting any solution that already has a working flow:

```powershell
pac solution export --name <AnExistingSolutionWithFlows> --path .\inspect.zip --environment "https://org229c958d.crm4.dynamics.com/" --overwrite
pac solution unpack --zipFile .\inspect.zip --folder .\inspect_unpacked
# Each folder name under inspect_unpacked\connectionreferences\ is a logical name
# e.g. shared_office365_abc123def  or  shared_commondataserviceforapps_xyz789
```

Use the folder name as-is — that exact string goes into the flow JSON.

> **After import:** flows are often left disabled until connection references are confirmed in the portal. Go to Solutions → your solution → Cloud Flows, open each disabled flow, confirm the connection reference assignments, and turn it on.

### Step 4 — Verify no placeholders remain

Run this before deploying:

```powershell
$patterns = 'YourSolutionName','sol_example','00000000-0000-0000-0000-000000000001','\[yourid\]','\[REPLACE','\[sol\]'
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

All component names use a **solution short-name prefix** so no two solutions ever share a component name.

The placeholder prefix throughout this starter is **`sol`** — replace it with your solution's short name before deploying.

| Placeholder name | Real example |
|-----------------|--------------|
| `sol_example_flow` | `evt_send_confirmation` |
| `YourSolutionName` (in Solution.xml) | `SMKBEvents` |

**Rule:** every flow name in a solution must start with `[solutionShortName]_`.  
Never use a generic name like `send_email` that could collide with flows in other solutions.

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

## Project Structure

```
SMKB - Power Automate Flows Starter/
│
├── Other/
│   ├── Solution.xml          ← solution metadata + list of flows (RootComponents)
│   └── Customizations.xml    ← keep as-is (minimal, Workflows element must be childless)
│
├── Workflows/
│   └── <FlowName>-<DataverseGUID>.json   ← one file per flow; this is what you edit
│
├── deploy.ps1                ← builds zip + runs pac solution import
└── .gitignore                ← ignores _dist/
```

The example file is `Workflows/sol_example_flow-00000000-0000-0000-0000-000000000001.json`.  
Rename it, update its contents, and replace the placeholder GUID with the real Dataverse workflow GUID before deploying.

---

## Development Workflow

### First time: add an existing flow to this project

1. Open the Power Platform portal, go to your main solution, open the flow.
2. Note the solution's **Unique Name** (e.g. `YourSolutionName`).
3. Export that solution via PAC CLI to get the Dataverse GUID:
   ```powershell
   pac solution export --name YourSolutionName --path .\YourSolutionName.zip --overwrite
   pac solution unpack --zipFile .\YourSolutionName.zip --folder .\YourSolutionName_unpacked
   ```
4. Inside `YourSolutionName_unpacked\Workflows\` find the file named `<FlowName>-<GUID>.json`.  
   The GUID in the filename is the **Dataverse workflow GUID** — the only ID that works with PAC CLI.  
   ⚠️ This is **not** the same as the flow ID shown in the Power Automate URL.
5. Copy that JSON file into this project's `Workflows\` folder.
6. Add a line to `Other\Solution.xml` inside `<RootComponents>`:
   ```xml
   <RootComponent type="29" id="{YOUR-GUID-HERE}" behavior="0" />
   ```
7. Update `<UniqueName>` in `Other\Solution.xml` to match your main solution's unique name.
8. Run `deploy.ps1` once to verify everything works.
9. Commit the JSON and the updated `Solution.xml`.

### Ongoing: update a flow

1. Edit `Workflows\<FlowName>-<GUID>.json` locally.
2. Run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File deploy.ps1
   ```
3. The flow is updated in Dataverse and reflected in all solutions that reference it.
4. Commit the changes.

### Creating a brand-new flow

Power Platform does not support creating a new flow purely from JSON — the flow record must exist first.  
Minimal process:
1. Create a stub flow in the Power Automate UI (just a trigger, no actions).
2. Add it to your main solution from the portal.
3. Export → unpack → get the Dataverse GUID (step 3–4 above).
4. Replace the stub JSON content with your full implementation.
5. Run `deploy.ps1` to push the real definition.

---

## Running `deploy.ps1`

```powershell
# Default: deploys to SMKB-Apps-Dev
powershell -ExecutionPolicy Bypass -File deploy.ps1

# Target a different environment
powershell -ExecutionPolicy Bypass -File deploy.ps1 -TargetEnv "https://smkb-apps-stage.crm4.dynamics.com/"
```

> **Note:** The PAC auth profile named "SMKB-Apps-Dev" incorrectly targets `org1dce1895`.  
> Always use the `-TargetEnv` URL explicitly or rely on the default in `deploy.ps1`.

| Environment   | Dataverse URL                                    |
|---------------|--------------------------------------------------|
| Dev           | `https://org229c958d.crm4.dynamics.com/`         |
| Stage         | `https://smkb-apps-stage.crm4.dynamics.com/`     |
| Prod          | `https://skmb-apps-prod.crm4.dynamics.com/`      |

---

## How `deploy.ps1` Works

PAC CLI's `solution pack` command **cannot include Cloud Flow JSONs** from scratch (known limitation).  
The script bypasses this by building the solution zip manually, then calling `pac solution import`.

Zip structure the platform expects:
```
[Content_Types].xml
customizations.xml    ← <Workflows /> must be childless — flows are not listed here
solution.xml
Workflows/
  <FlowName>-<GUID>.json
```

---

## Conventions & Defaults

### Connections / Connection References

Always use the **"Power Pages User 1"** connection for all connectors:
- Microsoft Dataverse
- Office 365 Outlook
- Excel Online
- Any other standard connector

This is the shared service account connection used across SMKB flows. Using it ensures consistent permissions and avoids personal-account dependencies.

When the flow's JSON references a connection reference logical name (inside `properties.connectionReferences`), verify it matches the connection reference that points to "Power Pages User 1" in the target environment.

### Email Sender

Always send emails from:
```
NoReply@smkb.ac.il
```

In the Send Email action, always set `emailMessage/From` to `NoReply@smkb.ac.il`.

### Triggers for Power Pages Sites

When a flow is triggered from a Power Pages site, **use the Power Pages trigger** — not the generic HTTP trigger.

| Trigger | Use when |
|---------|----------|
| Power Pages trigger (`kind: PowerPages`) | Flow is called from a Power Pages site |
| HTTP trigger (`kind: Http`) | Flow is called from an external system (non-Power Pages) |

The Power Pages trigger is more secure: it validates the caller is a Power Pages site in the same environment and does not expose a raw public HTTP endpoint.

Example trigger definition for a Power Pages–triggered flow:
```json
"manual": {
  "type": "Request",
  "kind": "PowerPages",
  "inputs": {
    "schema": { ... }
  }
}
```

---

## Two Different Flow IDs — Important

Power Platform uses two different GUIDs for the same flow. They are **not interchangeable**:

| ID type | Where it appears | Used for |
|---------|-----------------|---------|
| **Dataverse workflow GUID** | Solution export filename: `FlowName-{GUID}.json` | PAC CLI, solution import, `add-solution-component` |
| **Power Automate flow ID** | Browser URL: `make.powerautomate.com/.../flows/{ID}` | Power Automate portal only |

Only the **Dataverse workflow GUID** works with PAC CLI commands.

---

## Useful PAC CLI Commands

```powershell
# Add an existing (already-in-Dataverse) flow to a solution — one-time operation
pac solution add-solution-component `
    --environment "https://org229c958d.crm4.dynamics.com/" `
    --solutionUniqueName <SolutionUniqueName> `
    --component <DataverseWorkflowGUID> `
    --componentType 29

# Export a solution to inspect its flow GUIDs
pac solution export --name <SolutionUniqueName> --path .\out.zip --overwrite
pac solution unpack --zipFile .\out.zip --folder .\out_unpacked

# List solutions in an environment
pac solution list --environment "https://org229c958d.crm4.dynamics.com/"
```
