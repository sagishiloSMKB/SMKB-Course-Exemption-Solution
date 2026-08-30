# Flow Error Contract — HTTP 200 + `errorCode`

The single response contract shared by every cloud flow in this starter and the portal client
(`src/services/cloudFlow.ts`). Both sides must follow it — a flow that returns errors any other
way produces unreadable generic failures in the SPA.

---

## 1. Why: Power Pages discards non-2xx flow response bodies

When a flow triggered by "When Power Pages calls a flow" responds with any non-2xx status
(400/401/404/500…), Power Pages **throws away the response body** and hands the caller a generic
envelope:

```json
{ "ErrorCode": "00000006", "Message": "IncorrectPayload" }
```

A non-2xx response therefore **cannot carry any business meaning** to the portal. The only channel
that reaches the SPA intact is a 200 body.

**Rule: every `Response` action in every flow — success AND error — uses `statusCode: 200`.**

## 2. Business errors: `{ "errorCode": "<CODE>" }` + Terminate(Succeeded)

- **Success** → `200` with the data payload (e.g. `{ "items": [...] }`, `{ "status": "ok" }`) and
  **no** `errorCode` field.
- **Business or technical error** → `200` with `{ "errorCode": "<CODE>" }`, plus optional extra
  fields (e.g. `attemptsRemaining`). Follow each error Response with a `Terminate` action with
  `runStatus: "Succeeded"` — it is a controlled exit, not a flow failure, so error-handling scopes
  (`runAfter: Failed`) do not fire.

## 3. Standard `errorCode` vocabulary

| Code | Meaning |
|---|---|
| `INVALID_INPUT` | Caller-supplied data failed validation inside the flow |
| `UNAUTHORIZED` | Caller identity/token invalid, expired, or not permitted for this record |
| `NOT_FOUND` | Requested record does not exist (or is not visible to this caller) |
| `EXTERNAL_API_ERROR` | A downstream external service call failed |
| `ERROR` | Unexpected technical failure (also the code the client uses for transport/platform failures) |

Add **solution-specific codes** as needed and document them next to the flow. The OTP auth module
(`src/modules/otp-auth/`) defines: `WRONG_OTP` (with `attemptsRemaining`), `RATE_LIMITED`,
`EXPIRED`, `LOCKED`, `ACCOUNT_ARCHIVED`, `OTP_SEND_FAILED`, `CAPTCHA_FAILED`.

## 4. Canonical Response action (flow side)

Business-error exit inside the main scope:

```json
"Respond_not_found": {
  "type": "Response", "kind": "PowerPages",
  "inputs": {
    "statusCode": 200,
    "headers": { "Content-Type": "application/json" },
    "body": { "errorCode": "NOT_FOUND" }
  },
  "runAfter": {}
},
"Terminate_not_found": {
  "type": "Terminate",
  "inputs": { "runStatus": "Succeeded" },
  "runAfter": { "Respond_not_found": ["Succeeded"] }
}
```

The catch-all error handler scope (`runAfter: Main_Flow ["Failed", "TimedOut", "Skipped"]`) ends the
same way, responding `200` with `{ "errorCode": "ERROR" }` — never a 500.

## 5. Portal side: `invokeFlow` → `FlowError`

`invokeFlow()` (`src/services/cloudFlow.ts`) inspects every 200 body:

- Body contains a non-empty string `errorCode` → throws **`FlowError`** with `.code` set to that
  errorCode and `.data` set to the full body (so extra fields like `attemptsRemaining` are
  reachable via `e.data`).
- Transport/platform failure — network error, `403` (web role not assigned to the flow in Studio),
  `400` (parameter names don't match the trigger schema) → throws **`FlowError('ERROR')`**.
  A specific business code always means the flow itself ran.
- Success body (no `errorCode`) → resolves normally.

In components, show errors with `useFlowErrorToast()` — it maps `.code` to a localized message via
the he/en maps in `src/services/flowErrors.ts` (language keyed by `SOLUTION.defaultLanguage`), and
ignores `SessionExpiredError` so the global session-expired handler owns that UX:

```typescript
const showFlowError = useFlowErrorToast()   // inside setup()
try {
  await invokeFlow(FLOWS.myFlow, { id })
} catch (e) {
  if (e instanceof FlowError && e.code === 'WRONG_OTP') {
    const remaining = (e.data as { attemptsRemaining?: number }).attemptsRemaining
    // context-aware handling
  } else {
    showFlowError(e)
  }
}
```

When you add a solution-specific code, add its message to `FLOW_ERROR_MESSAGES` in
`src/services/flowErrors.ts` (screens needing context-aware text keep a local map instead).

## 6. Security: validate the caller inside every authenticated flow

**Table permissions are NOT enforced inside cloud flows.** Web roles only gate who may *trigger*
the flow — once running, the flow reads and writes Dataverse with its own connection's privileges.
Every authenticated flow must therefore re-validate the caller server-side **before** touching
data: verify the `authToken` (OTP module flows via `invokeAuthFlow`) or check `contactId` /
`accountId` scoping against the requested records, and respond `{ "errorCode": "UNAUTHORIZED" }`
on mismatch. Never trust SPA-supplied parameters as authoritative.

---

See also: [POWER-PAGES-CODE-SITE-GUIDE.md §7.5](./POWER-PAGES-CODE-SITE-GUIDE.md) (cloud flow
setup + technical reference) and the CLAUDE.md "Cloud Flows" section.
