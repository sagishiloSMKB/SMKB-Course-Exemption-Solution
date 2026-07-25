# ppcs-register-flow Reference

## Studio Registration — Step by Step

### Creating the Flow

1. Open **make.powerautomate.com** → select your Dev environment
2. Create or open a flow → **Add a trigger** → search for
   **"When Power Pages calls a flow"**
3. The flow must be **in a solution** (not "My flows") — create it inside an
   existing solution or use New solution
4. Add flow actions (HTTP calls, Dataverse operations, approvals, email, etc.)
5. Optionally add a **"Return value(s) to Power Pages"** action at the end if
   the SPA needs a response

### Registering in Power Pages Studio

1. Open Power Pages Studio for your site
2. Left nav → **Set up** → **Cloud flows**
3. Click **+ Add cloud flow** → select your flow from the list
4. Assign **Web roles**:
   - **Authenticated Users** — flow callable by signed-in users only
   - **Anonymous Users** — flow callable by anyone (use with caution)
5. Click **Save**
6. Click the flow name to expand it → copy the **Trigger URL**:
   `/_api/cloudflow/v1.0/trigger/4d22a1a2-8a67-e681-9985-3f36acfb8ed4`
7. The UUID at the end is the flow GUID for this site/environment

---

## Trigger URL Format

```
/_api/cloudflow/v1.0/trigger/<flow-guid>
```

Example:
```
/_api/cloudflow/v1.0/trigger/4d22a1a2-8a67-e681-9985-3f36acfb8ed4
```

The GUID is: `4d22a1a2-8a67-e681-9985-3f36acfb8ed4`

---

## src/config/flows.ts Pattern

The file ships with the starter as an empty registry — append entries
(typed `Record<string, string>`, not `as const`):

```typescript
// src/config/flows.ts — site-specific; fill in after Studio setup
// GUIDs change per environment — re-register in Studio after ALM promotion
export const FLOWS: Record<string, string> = {
  submitContactForm: '4d22a1a2-8a67-e681-9985-3f36acfb8ed4',
  requestApproval:  'bb7de2f9-f814-44ef-9ed6-9b1e238b8655',
  sendWelcomeEmail: 'cc8ef3a1-g925-55fg-0fe7-0c2f349c9766',
}
```

The OTP auth module's flows (`createOtp`, `checkOtp`, `getPortalConfig`)
live in `src/modules/otp-auth/otpFlows.ts`, not here.

---

## invokeFlow() Technical Reference

```typescript
// From src/services/cloudFlow.ts
export async function invokeFlow<T = void>(
  flowGuid: string,
  params?: Record<string, unknown>
): Promise<T | undefined>
```

- **Returns `undefined`** if the flow has no "Return value(s) to Power Pages" action
  (fire-and-forget)
- **Returns `T`** if the flow has the return action (HTTP 200 with JSON body)
- **Throws `FlowError`** per the HTTP 200 + errorCode contract
  (docs/FLOW-ERROR-CONTRACT.md): flows always respond 200; a body of
  `{ "errorCode": "<CODE>" }` throws `FlowError` with that `.code` (and `.data`);
  transport/platform failures throw `FlowError('ERROR')`

---

## Parameter Type Constraints

| Type | Supported | Notes |
|------|-----------|-------|
| `string` | ✅ | Directly passed |
| `number` | ✅ | Directly passed |
| `boolean` | ✅ | Directly passed |
| `Date` | ⚠️ | Serialize to ISO string: `.toISOString()` |
| `File` / binary | ⚠️ | Encode as base64 string |
| `object` / `array` | ⚠️ | Serialize with `JSON.stringify()` |

Parameter names are **case-sensitive** and must match the flow trigger exactly.

---

## Per-Environment GUID Management

Flow GUIDs change per environment because each site has its own registration.
Two strategies for managing multiple environments:

**Strategy 1 — Replace on promotion** (simple, one environment at a time):
Keep `flows.ts` with Dev GUIDs in the repo. After promoting, manually update
the file with target-env GUIDs and deploy.

**Strategy 2 — Runtime selection** (more complex, supports multi-env):
```typescript
const ENV = import.meta.env.VITE_ENVIRONMENT ?? 'dev'

export const FLOWS: Record<string, string> = {
  submitContactForm: {
    dev:   '4d22a1a2-8a67-e681-9985-3f36acfb8ed4',
    stage: 'bb7de2f9-f814-44ef-9ed6-9b1e238b8655',
    prod:  'cc8ef3a1-g925-55fg-0fe7-0c2f349c9766',
  }[ENV],
}
```
Requires `VITE_ENVIRONMENT` declared in `src/env.d.ts` and set in each
environment's `.env.*` file.

---

## Security Reminder

**Table permissions are NOT enforced inside cloud flows.**

Any flow that accesses Dataverse records must re-validate the caller:

```
// Inside the Power Automate flow:
1. Get the calling user's contactId from the trigger inputs
2. Query Dataverse: does this contactId own/have access to the requested record?
3. Only if check passes → proceed with the data operation
4. Return error/empty if check fails
```

Never trust client-supplied IDs (contactId, accountId) without server-side validation.
