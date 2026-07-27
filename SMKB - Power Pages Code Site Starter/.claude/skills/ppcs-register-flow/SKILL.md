---
name: Power Pages Code Site — Register Cloud Flow
description: >-
  Appends a new Power Automate flow GUID from Power Pages Studio to the shipped
  src/config/flows.ts registry. Reminds user of Studio setup steps, the HTTP
  200 + errorCode flow error contract, and the re-registration requirement
  after ALM promotion to each environment.
when_to_use: >-
  User says "add a flow", "register a flow", "connect power automate", "cloud flow
  setup", or pastes a trigger URL like /_api/cloudflow/v1.0/trigger/<guid>.
argument-hint: "<flow-guid-or-trigger-url> <FlowConstantName>"
arguments: [flow-guid-or-trigger-url, flow-constant-name]
allowed-tools: Read Edit Write Bash(npm run build)
---

## Context

Cloud flow GUIDs in this project:
- Are **site-specific** — each site has its own GUID for the same flow
- Are **environment-specific** — Dev, Stage, and Prod each get a different GUID
  after flow re-registration in Studio
- Must be stored in `src/config/flows.ts` (never hardcoded in service calls)
- Must be **re-registered manually in Studio** after each ALM promotion

`src/config/flows.ts` **ships with the starter** (an empty
`Record<string, string>` registry with setup instructions in its header) —
append entries to it rather than creating it.

**Exception — OTP auth module:** the OTP module's flows (`createOtp`,
`checkOtp`, `getPortalConfig`) belong in the module's own registry,
`src/modules/otp-auth/otpFlows.ts`, NOT in `FLOWS`. Registering those is
handled by `/ppcs-enable-otp-auth`.

For Studio registration walkthrough and parameter constraints, see
[flow-reference.md](flow-reference.md).

## Steps

### Pre-check: Studio Setup

1. If the user doesn't yet have a flow registered in Power Pages Studio, walk
   through the setup steps first:
   > **One-time Studio setup (required before using a flow):**
   > 1. Build a Power Automate flow with trigger **"When Power Pages calls a flow"**
   >    — the flow must be in a solution (not a personal flow)
   > 2. Power Pages Studio → **Set up** → **Cloud flows** → **+ Add cloud flow**
   > 3. Assign web roles:
   >    - **Authenticated Users** for flows that require sign-in
   >    - Add **Anonymous Users** only for flows callable without authentication
   > 4. Save. You do **not** need to copy the trigger URL — see below.

### Get the GUID — derive it, don't ask for it

2. **The Power Pages trigger GUID *is* the flow's `workflowid`**, which the repo already authored.
   It is the trailing GUID of the flow's own filename under the Cloud Flows starter's `Workflows/`,
   and the same value appears in that starter's `Customizations.xml` (`WorkflowId`) and
   `Solution.xml` (`RootComponent id`). Verified on real flows: the Studio registration record's
   `content` payload carries `"flowapiurl": "/_api/cloudflow/v1.0/trigger/<guid>"` and
   `"processid": "<guid>"` — both the same `workflowid`. So read it from the repo:
   ```powershell
   Get-ChildItem "..\SMKB - <Name> - Cloud Flows\Workflows" -Filter *.json | Select-Object Name
   ```
   Take the trailing GUID of the flow's file name, lowercase it, and validate the 8-4-4-4-12 shape.
   Ask the developer only if the flow is not in this repo.

   *(If the user does paste a trigger URL or a bare UUID, accept it: take everything after the last
   `/`, and cross-check it against the filename GUID — a mismatch means they registered a different
   flow than the one they think.)*

### Update flows.ts

3. Read `src/config/flows.ts` — it ships with the starter as an empty
   `Record<string, string>` registry; you will **append** the new entry to
   the existing `FLOWS` object.
   - Fallback only (file was deleted): recreate it — typed
     `Record<string, string>`, **not** `as const`:
     ```typescript
     // src/config/flows.ts — site-specific flow GUIDs (fill in after Studio setup)
     // GUIDs change per environment — re-register in Studio after ALM promotion
     export const FLOWS: Record<string, string> = {
     }
     ```

4. Determine the constant name from `$flow-constant-name`.
   If not provided, derive it from the flow name or ask the user.
   Use camelCase (e.g. `submitContactForm`, `requestApproval`, `sendNotification`).

5. Add the new constant to the `FLOWS` object:
   ```typescript
   export const FLOWS: Record<string, string> = {
     <flowConstantName>: '<guid>',
   }
   ```
   Preserve any existing constants and the header comment.

### Show Usage Example

6. Show a typed usage example based on whether the flow returns a value:

   **Fire-and-forget** (flow has no "Return value(s) to Power Pages" action):
   ```typescript
   import { invokeFlow } from '@/services/cloudFlow'
   import { FLOWS } from '@/config/flows'

   await invokeFlow(FLOWS.<flowConstantName>, {
     // parameter names must match exactly what the flow trigger expects
     param1: value1,
     param2: value2,
   })
   ```

   **With return value** (flow has "Return value(s) to Power Pages" action):
   ```typescript
   import { invokeFlow } from '@/services/cloudFlow'
   import { FLOWS } from '@/config/flows'

   const result = await invokeFlow<{ approvalId: string }>(
     FLOWS.<flowConstantName>,
     { param1: value1 }
   )
   ```

   **Error contract:** flows always respond HTTP 200; business errors come
   back as `{ "errorCode": "<CODE>" }` in the body. `invokeFlow` throws
   `FlowError` (`.code`, `.data`) for those, and `FlowError('ERROR')` for
   transport/platform failures. Show errors in the UI with
   `useFlowErrorToast()` (`src/composables/useFlowErrorToast.ts`). Full
   contract: [docs/FLOW-ERROR-CONTRACT.md](../../../docs/FLOW-ERROR-CONTRACT.md).

7. Run `npm run build` to confirm `flows.ts` has no TypeScript errors.

### ALM Warning

8. Remind the user of the environment-specific GUID requirement:
   > **Important for ALM:** This flow GUID is specific to the current (Dev)
   > environment. After promoting to Stage or Prod via `/ppcs-promote-to-env`,
   > you must:
   > 1. Re-register the flow in Studio for the target site
   > 2. Copy the new GUID from the target Studio
   > 3. Store the target-env GUID (either replace this one or add an
   >    env-switching mechanism in `flows.ts`)

### Verify the web role, don't trust it

A wrong web role is **invisible until a user hits a 403 at runtime**, so assert it rather than
assuming. The Studio registration record's `content` payload includes the assigned role and its
flags — for a public page you want `"anonymoususersrole": true, "authenticatedusersrole": false`;
for a signed-in-only flow, the reverse. Check this after registering, and re-check after each ALM
promotion (the registration is per-environment).

> **Registration creates new solution components.** Registering two flows added two `Cloud Flow`
> components to the site, neither of them in the solution — a live demonstration that the
> site-to-solution reconcile has to run on *every* deploy, not once. `npm run deploy` chains it; see
> `/ppcs-deploy` step 7.

## Error Handling

- **Invalid UUID format:** Stop and ask the user to copy the trigger URL from
  Studio (it's shown after clicking the flow in the Cloud flows panel).
- **flows.ts has a syntax error after edit:** Show the exact TypeScript error
  from `npm run build` and offer to fix the formatting.
- **Flow parameter 403:** This is a runtime error, not a setup error. The flow
  may have restricted web roles. Refer the user to Studio → Cloud flows →
  check web role assignments.

## Notes

Parameter names passed to `invokeFlow()` must match **exactly** the parameter
names defined in the Power Automate flow trigger. Case-sensitive.

Supported parameter types: string, number, boolean. For file uploads use
base64-encoded strings. Arrays and objects must be serialized as JSON strings.

Table permissions are **not enforced inside cloud flows**. Any flow that reads
or writes Dataverse records must re-validate the caller's identity inside the
flow (check `contactId`, `accountId`, or other scoping values).

See [flow-reference.md](flow-reference.md) for the complete Studio walkthrough
and parameter type constraints.
