# OTP Auth Screen — Integration Recipe

Copy this folder into a new solution and follow the steps below. Every `[ADAPT]` marker in the source files flags something you must change; every `[IMPLEMENT]` marker in the flow templates flags business logic you must build.

---

## 1. What you get

A two-step email → OTP authentication screen for Power Pages portals:

- **Step 1 — Email:** User enters their email address and clicks Send. The `smkb_sol_CreateOtp` Power Automate flow is called. It sends a verification code via one or more channels (SMS, college email, personal email) and returns a `channels` array with masked delivery addresses.
- **Step 2 — OTP:** User enters the 6-digit code. The `smkb_sol_CheckOtp` flow validates it and returns the user's identity record. On success, session is stored in `sessionStorage` (30-min TTL) and the user is redirected.

**Dev mode (no flows needed):** When `FLOW_CREATE_OTP_URL` is empty and `import.meta.env.DEV` is true, `createOtp` returns mock channels and `checkOtp` accepts `123456` as valid. Run `pnpm dev` immediately after copying the files to verify the screen works visually.

**Mobile extras included:**
- **iOS QuickType bar** — off-screen relay input is focused synchronously before the async flow call, preserving iOS user-activation context so the OTP suggestion appears in the keyboard bar.
- **Android WebOTP API** — `navigator.credentials.get({ otp: { transport: ['sms'] } })` auto-reads the SMS code and fills the grid.

---

## 2. Prerequisites

Before integrating:

1. **`@smkbacil/design-ui` installed** in the target app's `package.json`. The component uses `SmkbLoginPage`, `SmkbInput`, and `SmkbButton` from this package.
2. **Vue Router** configured in the app (`createRouter` / `createWebHistory`).
3. **Two Power Automate flows deployed** — build and deploy from `flow-templates/` before going to production. Dev mode works without them.
4. **Power Pages portal** with a web template that renders the Vue app.

---

## 3. Vue client integration

### A. Copy files

Copy the entire `vue-client/` subtree into `client/src/` of the target portal app:

```
vue-client/
  services/authService.ts       → client/src/services/authService.ts
  composables/useAuth.ts        → client/src/composables/useAuth.ts
  composables/useI18n.ts        → client/src/composables/useI18n.ts
  consts/i18n-otp.ts            → client/src/consts/i18n-otp.ts
  views/OtpLoginPage.vue        → client/src/views/OtpLoginPage.vue
  utils/emailValidation.ts      → client/src/utils/emailValidation.ts
```

If the app already has a `useI18n.ts`, `i18n.ts`, or `emailValidation.ts`, merge rather than overwrite:
- For `useI18n.ts` — the library version is identical to the Events Tickets one; keep whichever exists.
- For i18n constants — merge `I18N_OTP` keys into your existing constants file (or keep as a separate import).
- For `emailValidation.ts` — keep whichever copy exists; both are identical.

### B. Add flow URL globals to config.ts

In `client/src/config.ts`, add two entries that read from the Liquid-injected window globals:

```typescript
const w = window as Record<string, unknown>

export const config = Object.freeze({
  // ... your existing config fields ...

  FLOW_CREATE_OTP_URL: (w['__SMKB_FLOW_CREATE_OTP__'] as string) ||
    (import.meta.env.VITE_FLOW_CREATE_OTP_URL as string | undefined) || '',

  FLOW_CHECK_OTP_URL: (w['__SMKB_FLOW_CHECK_OTP__'] as string) ||
    (import.meta.env.VITE_FLOW_CHECK_OTP_URL as string | undefined) || '',
})
```

If `config.ts` does not exist yet, create it with these fields (and any other portal-specific globals you need).

### C. Register the route and add an auth guard

In `client/src/router/index.ts`:

```typescript
import OtpLoginPage from '../views/OtpLoginPage.vue'
// [ADAPT]: adjust the path param name to match your contextId rename (or remove :contextId)
{ path: '/login/:contextId?', name: 'login', component: OtpLoginPage }
```

Add a navigation guard to redirect unauthenticated users:

```typescript
import { useAuth } from '../composables/useAuth'

router.beforeEach((to) => {
  const { isAuthenticated } = useAuth()
  const publicRoutes = ['login']
  if (!isAuthenticated.value && !publicRoutes.includes(to.name as string)) {
    return { name: 'login', params: { contextId: to.params.contextId } }
  }
  if (isAuthenticated.value && to.name === 'login') {
    // [ADAPT]: replace 'home' with your post-auth landing route name
    return { name: 'home' }
  }
})
```

### D. Rename contextId (optional)

If your solution uses a specific context identifier (e.g. an event ID, request ID), search `[ADAPT]` in the copied files and rename `contextId` consistently:

| File | Change |
|------|--------|
| `OtpLoginPage.vue` line with `route.params.contextId` | rename to `route.params.eventId` etc. |
| `authService.ts` function signatures | rename parameter |
| Route definition | rename `:contextId?` to `:eventId?` etc. |

If your flow has no context parameter, remove `contextId` entirely from function signatures and the JSON body — the flows' `required` arrays only include `email`.

### E. Test dev mode

```bash
pnpm dev
```

Navigate to `/login`. Enter any email → "Send" → mock channels appear. Enter `123456` → session stored → redirected to `home`. Any other OTP shows a wrong-code error.

### F. Adapt remaining [ADAPT] markers

Search all copied files for `[ADAPT]` and resolve each one:

| Marker location | What to change |
|----------------|----------------|
| `OtpLoginPage.vue` — post-auth redirect | Replace `router.push({ name: 'home' })` with your actual route |
| `OtpLoginPage.vue` — email intro lines | Update college/personal email text to match your domain |
| `useAuth.ts` — `SESSION_KEY` | Change to a unique key string to avoid collision with other SMKB apps |
| `i18n-otp.ts` — all string values | Translate/update to match your solution's tone |

---

## 4. Power Automate flows

### G. Copy and rename the flow templates

Copy both files from `flow-templates/` into your solution's `Workflows/` folder:

```
flow-templates/smkb_sol_CreateOtp-TEMPLATE.json  →  Workflows/smkb_[sol]_CreateOtp-[guid].json
flow-templates/smkb_sol_CheckOtp-TEMPLATE.json   →  Workflows/smkb_[sol]_CheckOtp-[guid].json
```

Replace placeholders throughout both files:

| Placeholder | Replace with |
|------------|-------------|
| `smkb_sol_CreateOtp` | `smkb_[sol]_CreateOtp` (your solution prefix) |
| `smkb_sol_CheckOtp` | `smkb_[sol]_CheckOtp` |
| `[yourid]` | Connection reference logical name from your environment |
| `[sol]` | Your solution prefix |
| `TEMPLATE` in filename | A real GUID for the flow file |

Add both files to `Other/Solution.xml` `<RootComponents>` and `Customizations.xml`.

### H. Implement the business logic

Both flow templates contain a `IMPLEMENT_PLACEHOLDER` Compose action that marks what needs to be built. **Replace it** with real actions before the flow goes to production.

**smkb_sol_CreateOtp:**
1. Look up the user by email in your Dataverse table (return `NOT_FOUND` if absent)
2. Check for rate limiting (e.g. max 3 OTPs per 10 minutes per email)
3. Generate a 6-digit random OTP: `rand(100000, 999999)` expression in Power Automate
4. Store an OTP record in Dataverse: `{ email, otp_hash, expires_at, attempts: 0 }`
5. Send the code via SMS (Twilio/Azure Communication) or email
6. Build the `channels` array with masked delivery addresses
7. Pass to `Respond_to_PowerPages` as `@variables('channels_array')`

**smkb_sol_CheckOtp:**
1. Query the Dataverse OTP record for this email
2. Return `NOT_FOUND` if no record exists; `LOCKED` if already locked
3. Check expiry: return `LOCKED` (with appropriate message) if expired
4. Compare OTP values; on mismatch: increment `attempts`, lock if ≥ 5, return `WRONG_OTP` with `attemptsRemaining`
5. On success: delete the OTP record, retrieve the user record, return `{ inviteeId, firstName, lastName, email }`

**Flow HTTP contract — do not change these shapes:**

CreateOTP response (200):
```json
{ "channels": [{ "type": "sms|email_college|email_personal", "maskedValue": "string" }] }
```

CreateOTP error (4xx/5xx — read by `authService.ts` as `data.code`):
```json
{ "code": "OTP_NOT_CONFIGURED|OTP_SEND_FAILED|RATE_LIMITED|NOT_FOUND" }
```

CheckOTP response (200):
```json
{ "inviteeId": "string", "firstName": "string", "lastName": "string", "email": "string" }
```

CheckOTP error:
```json
{ "code": "WRONG_OTP|LOCKED|NOT_FOUND", "attemptsRemaining": 3 }
```

---

## 5. Power Pages portal patches

### I. Add site settings

Append the contents of `portal-patches/sitesetting-snippet.yml` to your portal's `sitesetting.yml` (under `powerpages/[portal-folder]/`):

1. Generate two fresh GUIDs (replace the `[REPLACE]` placeholder GUIDs):
   ```powershell
   [System.Guid]::NewGuid().ToString()  # run twice
   ```
2. Append the two YAML entries.
3. Commit the YAML file (with empty `adx_value` strings — never commit trigger URLs).
4. After deploying both flows, set the trigger URLs via the Power Pages design studio:
   `Site Settings → SMKB/Flow/CreateOTP → Edit → paste URL`

### J. Update the web template

In `powerpages/[portal-folder]/web-templates/[your-template]/[template].webtemplate.source.html`, find the existing `<script>` block that injects other `window.__SMKB_*` globals and add the two lines from `portal-patches/webtemplate-liquid-snippet.html`:

```html
window.__SMKB_FLOW_CREATE_OTP__ = '{{ settings["SMKB/Flow/CreateOTP"] | default: "" }}';
window.__SMKB_FLOW_CHECK_OTP__  = '{{ settings["SMKB/Flow/CheckOTP"]  | default: "" }}';
```

If no `<script>` block exists yet, wrap both lines in a `<script>` tag and place it before the app's `<div id="app">` mount point.

---

## 6. Auth Token — Protecting Subsequent Flows

After OTP verification, `smkb_sol_CheckOtp` generates a server-side auth token (a UUID) and stores it in Dataverse with a 1-hour expiry. The token is returned to the browser and included in every subsequent flow call. Each authenticated flow validates the token before allowing any action.

### Why it matters

Without a token, any flow caller can supply an arbitrary `userId` in the request body and access another user's data. With a token, the server trusts only the `userId` stored in the Dataverse session record — the caller's request body is irrelevant.

### K. Create the Dataverse sessions table

Before deploying `smkb_sol_CheckOtp`, create a table in your solution — schema name `smkb_[sol]_Sessions` (PascalCase; see CLAUDE.md → Critical Rule 3) — with these fields:

| Field (logical name) | Type | Notes |
|-------------------|------|-------|
| `smkb_sol_token` | Single line of text | Required; add a unique index |
| `smkb_sol_userid` | Single line of text (or Lookup to your user table) | The authenticated user's record ID |
| `smkb_sol_email` | Single line of text | For audit/debug only |
| `smkb_sol_expires_at` | Date and Time (Behavior: Time-Zone Independent) | When the token expires |

> Create the columns with **PascalCase schema** names (`smkb_[sol]_Token`, `smkb_[sol]_ExpiresAt`, …); Dataverse exposes their lowercased **logical** names (shown above) — those are what the flow JSON and OData responses use.

Token TTL is 1 hour. Expired rows accumulate over time — add a scheduled cleanup flow (e.g. daily) that deletes rows where `smkb_sol_expires_at` is in the past.

### L. Wire up smkb_sol_CheckOtp

The `IMPLEMENT_Create_Auth_Session` action in `smkb_sol_CheckOtp-TEMPLATE.json` is pre-scaffolded. After implementing `IMPLEMENT_PLACEHOLDER`:

1. Replace `entityName` with your session table's plural logical name (e.g. `smkb_sol_sessions`)
2. Replace `smkb_sol_token`, `smkb_sol_email`, `smkb_sol_expires_at`, `smkb_sol_userid` with your actual field schema names
3. Set `item/smkb_sol_userid` to the user record ID retrieved in `IMPLEMENT_PLACEHOLDER`

`Respond_to_PowerPages` already includes `authToken` and `authTokenExpiresAt` in the response body — no changes needed there.

### M. Use the token in the Vue client

`useAuth` stores the token inside the existing `sessionStorage` session. Use `getAuthToken()` from `useAuth()` in any `authService.ts` function that calls a protected flow:

```typescript
import { useAuth } from '../composables/useAuth'

const { getAuthToken } = useAuth()

export async function doSomethingProtected(param: string): Promise<...> {
  const token = getAuthToken()
  if (!token) {
    // token missing or expired — trigger re-login
    return { errorCode: 'UNAUTHORIZED' }
  }
  const res = await fetch(config.FLOW_DO_SOMETHING_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authToken: token, param }),
  })
  // ...
}
```

`getAuthToken()` returns `null` if the token is absent or past its 1-hour client-side expiry. The server also enforces expiry independently.

### N. Protect any authenticated flow using the snippet

`flow-templates/VALIDATE_AUTH_TOKEN_SNIPPET.json` contains a `Validate_Auth_Token` Scope ready to copy into any flow.

**Steps:**
1. Add `"authToken": { "type": "string" }` to the flow's trigger `schema.properties`
2. Copy the `Validate_Auth_Token` scope into `Main_Flow.actions`
3. Update its `runAfter` to point to your preceding action (default: `Validate_Input`)
4. Replace `[IMPLEMENT]` markers: session table name, token field name, expiry field name, connection reference

**Row-level security rule — never skip this:**

After `Validate_Auth_Token` passes, get the trusted user identity from:
```
@first(body('IMPLEMENT_Get_Auth_Session')?['value'])?['smkb_sol_userid']
```

Use this expression — not `triggerBody()?['userId']` — in every Dataverse query or update. For example:
```
$filter: smkb_sol_userid eq '@{first(body('IMPLEMENT_Get_Auth_Session')?['value'])?['smkb_sol_userid']}'
```

This ensures the authenticated user can only read and modify their own record, even if they pass a different ID in the request body.

---

## 7. Verification checklist

- [ ] **Dev mock works** — `pnpm dev`, navigate to `/login`, enter any email, `123456` logs in
- [ ] **All `[ADAPT]` markers resolved** — grep for `[ADAPT]` in `vue-client/` → zero matches
- [ ] **All `[IMPLEMENT]` markers resolved** — grep for `[IMPLEMENT]` in flow JSONs → zero matches  
- [ ] **Route guard works** — unauthenticated access to protected route redirects to `/login`
- [ ] **SESSION_KEY unique** — `useAuth.ts` `SESSION_KEY` does not clash with other portal apps on the same domain
- [ ] **Site settings committed** with new GUIDs, empty `adx_value` — grep for `00000000-0000-0000-0000-000000000001` → zero matches in `sitesetting.yml`
- [ ] **Trigger URLs set** in Power Pages design studio (not in git) after flow deploy
- [ ] **Production smoke test** — real email → OTP received → login succeeds → session persists on page reload, expires after 30 min
