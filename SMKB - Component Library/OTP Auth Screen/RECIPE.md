# OTP Auth Screen — Integration Recipe

Copy this folder into a new solution and follow the steps below. Every `[ADAPT]` marker in the source files flags something you must change; every `[IMPLEMENT]` marker in the flow templates flags business logic you must build.

---

## 1. What you get

A two-step email → OTP authentication screen for Power Pages portals:

- **Step 1 — Email:** User enters their email address and clicks Send. The `smkb_sol_CreateOtp` Power Automate flow is called. It sends a verification code via one or more channels (SMS, college email, personal email) and returns a `channels` array with masked delivery addresses.
- **Step 2 — OTP:** User enters the 6-digit code. The `smkb_sol_CheckOtp` flow validates it and returns the user's identity record. On success, the session is stored in `sessionStorage` and the user is redirected. **Three limits apply and they are not the same thing:** the server's session row expires after **1 hour** (the real authority - every authenticated flow re-checks it), this client caps a session at **30 minutes** since login, and an **idle timeout** ends it after 15 minutes of inactivity. The strictest one wins.

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

### A. Copy the client from the Code Site starter

**There is one client implementation, and it lives in the Power Pages Code Site starter:**

```
SMKB - Power Pages Code Site Starter/src/modules/otp-auth/
  authService.ts      createOtp / checkOtp / revokeSession, with DEV mocks
  useAuth.ts          session state, idle timeout, revoke-on-logout
  invokeAuthFlow.ts   authenticated calls (passes authToken for server re-validation)
  guard.ts            router guard
  otpFlows.ts         the flow GUID registry
  configService.ts    public config (support contact, Turnstile site key)
  OtpLoginView.vue    the login screen
  LockedOutView.vue   the lockout screen
  useTurnstile.ts     re-export of src/composables/useTurnstile.ts
```

In a Code Site the module already ships **dormant** — nothing imports it, so it costs zero bundle
bytes. Enable it with **`/ppcs-enable-otp-auth`**, which wires the routes, the guard and the CSP
domains for you. Do not copy these files by hand there.

For a **non-Code-Site** consumer (a Power App, a plain Vue app), copy that folder and replace its one
dependency — `invokeFlow` from `src/services/cloudFlow.ts` — with however that app calls a flow. Keep
the **HTTP 200 + `errorCode`** contract: it is what every error path in the module and in the flow
templates below assumes.

> **This recipe used to ship a second `vue-client/` copy. It was deleted, deliberately.** It had
> drifted into a *different architecture* (raw `fetch` to Liquid-injected URLs, HTTP status codes for
> business errors) and had accumulated real bugs: a `login()` that omitted the required `authToken` —
> so it did not type-check and `getAuthToken()` returned `null` forever — an import of a `config.ts`
> that did not exist, no captcha token sent despite §8 requiring a server-side check, and a
> divergent error vocabulary. Two clients meant two sets of bugs and no single source of truth.
> If you need the old copy for reference, it is in git history.

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

Copy these files from `flow-templates/` into your solution's `Workflows/` folder:

```
flow-templates/smkb_sol_CreateOtp-TEMPLATE.json      →  Workflows/smkb_[sol]_CreateOtp-[guid].json
flow-templates/smkb_sol_CheckOtp-TEMPLATE.json       →  Workflows/smkb_[sol]_CheckOtp-[guid].json
flow-templates/smkb_sol_RevokeSession-TEMPLATE.json  →  Workflows/smkb_[sol]_RevokeSession-[guid].json
```

`RevokeSession` is the 4th flow — skip it only if you accept that logout will not invalidate a token
server-side (see §8 “Revoke a session, don't just wait for it to expire”). Register it with the
**Anonymous** web role, like `CreateOtp` and `CheckOtp`.

Replace placeholders throughout all of them:

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
1. Look up the user by email in your Dataverse table. **If absent, respond exactly as if the send succeeded** — do not return a distinct code; see **Anti-enumeration** below
2. Check for rate limiting (e.g. max 3 OTPs per 10 minutes per email)
3. Generate a 6-digit random OTP: `rand(100000, 999999)` expression in Power Automate
4. Store an OTP record in Dataverse: `{ email, otp_code, expires_at, attempts: 0 }` — stored as-is, deliberately; see **At-rest protection** below
5. Send the code via SMS (Twilio/Azure Communication) or email
6. Build the `channels` array with masked delivery addresses
7. Pass to `Respond_to_PowerPages` as `@variables('channels_array')`

**smkb_sol_CheckOtp:**
1. Query the Dataverse OTP record for this email
2. Return `NOT_FOUND` if no record exists; `LOCKED` if already locked
3. Check expiry: return `LOCKED` (with appropriate message) if expired
4. Compare OTP values; on mismatch: increment `attempts`, lock if ≥ 5, return `INVALID_CODE` with `attemptsRemaining` (the same code a not-found or expired record returns — see **Anti-enumeration** below)
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
{ "errorCode": "INVALID_CODE|LOCKED", "attemptsRemaining": 3 }
```

### H1. Action-by-action guidance

**Why this lives here and not in the templates.** A Power Automate trigger or action
`description` longer than **256 characters** imports without complaint and then fails
**activation** — `ActionDescriptionTooLong` — leaving the flow in **Draft**, so every portal
call to it fails. The templates carried ten descriptions between 260 and 2,879 characters, i.e.
a flow that could not be turned on. Each of those now holds a short summary and points here.
Keep it that way: `flow-lint`'s `description-max-length` rule is an **error**, and it is the
gate that catches a reintroduced essay before a deploy does.

#### The `Main_Flow` scope (both flows)

Wrap all logic in one scope so `Handle_Flow_Error` can target it for **unexpected technical**
failures. **Business** errors — `INVALID_CODE`, `LOCKED`, `RATE_LIMITED`, `OTP_SEND_FAILED` —
are expected conditions: answer with `Response` then `Terminate(runStatus: Succeeded)` *inside*
the scope, which ends the run cleanly so `Handle_Flow_Error` does **not** run and no error email
is sent. Only genuine bugs (a Dataverse failure, a null reference) should be left to throw.

**Response contract — every `Response` returns HTTP 200**, success and error alike. Power Pages
**discards the body of any non-2xx** flow response and substitutes a generic `IncorrectPayload`
envelope, so a 400/401/429/500 cannot carry an `errorCode` to the portal — the client would only
ever see a generic platform failure. The error signal is the `errorCode` field inside a 200 body.

#### `CreateOtp` → `IMPLEMENT_PLACEHOLDER`

Replace the `Compose` with:

1. Generate a 6-digit OTP with `rand(100000, 999999)` — never sequential or timestamp-based.
2. Create the Dataverse OTP row: `{ email, otp_code, expires_at: addMinutes(utcNow(), 10), attempts: 0 }`.
3. Send the code by SMS or email.
4. Build a `channels` array: `[{ type: 'sms'|'email_college'|'email_personal', maskedValue: '...' }]`.
5. Pass `channels` to `Respond_to_PowerPages`.

Hashing the OTP is **not** required for 6-digit codes — the 5-attempt lockout in the check flow
is the primary protection (see *What at-rest protection actually means here*). On a **send**
failure return a business error rather than letting the scope throw: a failed send is an expected
condition, not a bug.

#### `CreateOtp` → rate limiting

`IMPLEMENT_List_Recent_OTP_Requests` counts how many OTPs this identifier has requested in the
last 10 minutes. Replace `entityName` with your OTP table's plural logical name and the email
field in `$filter` with yours; the built-in `createdon` field is always available and accurate.
`If_Rate_Limited` blocks at 3 or more: 200 + `RATE_LIMITED`, then `Terminate(Succeeded)`.

Count attempts **per submitted identifier, whether or not it exists** — otherwise `RATE_LIMITED`
only ever appears for real accounts and becomes an account-existence oracle.

#### `CheckOtp` → `IMPLEMENT_PLACEHOLDER`

Replace the `Compose` with, in this order, inside `Main_Flow` after `If_Account_Locked`:

1. **Expiry first.** Compare the stored expiry to `utcNow()`. If expired → respond
   `{ errorCode: 'INVALID_CODE' }` + `Terminate(Succeeded)`. Use the **same generic code** as a
   wrong code: "this code expired" confirms a code was issued for this email. An expired code
   must **not** increment the attempts counter.
2. **Compare.** If the stored code differs from `triggerBody()?['otp']`:
   a. increment `attempts` on the OTP row (`UpdateRecord`);
   b. compute `attemptsRemaining = 5 - attempts`;
   c. respond `{ errorCode: 'INVALID_CODE', attemptsRemaining: N }` + `Terminate(Succeeded)`.
3. **On match:**
   a. **delete the OTP row** (`DeleteRecord`) — one-time use; leaving it enables replay;
   b. retrieve the user row from your main user table;
   c. expose the user record id for `IMPLEMENT_Create_Auth_Session` (a `Compose` or a variable).

Every failure path above returns the **same** generic `INVALID_CODE`. Do not reintroduce distinct
codes for not-found / expired / wrong — each one tells an unauthenticated caller something about
whether the email is registered. Which branch ran *is* recorded in run history, which only flow
owners and environment admins can read. `If_OTP_Not_Found` exists for that reason and must keep
answering `INVALID_CODE`.

#### `CheckOtp` → create the auth session

`IMPLEMENT_Create_Auth_Session` writes the session row. Replace `entityName` with your session
table's plural name, replace the four placeholder field names (token, email, expiry, user id)
with your schema names, and set the user id from `IMPLEMENT_PLACEHOLDER`.

**Session cleanup** (recommended): before creating the new session, delete any previous session
rows for this identifier — `ListRecords` filtered by the email field → `Apply_to_each` →
`DeleteRecord` — so valid tokens for one user cannot accumulate. A daily scheduled flow that
deletes expired rows is also worth having.

#### The auth-token snippet (`VALIDATE_AUTH_TOKEN_SNIPPET.json`)

`Validate_Auth_Token` checks the caller's token against the sessions table and answers 200 +
`UNAUTHORIZED` + `Terminate(Succeeded)` when it is missing, unknown, or expired — an invalid
token is an expected condition, not a bug, which is why it terminates *succeeded* and never
reaches `Handle_Flow_Error`. `If_Token_Expired` only runs when the token **was** found;
`If_Token_Not_Found` terminates the run before it otherwise. Replace the expiry field name.

**Row-level security — the point of the whole snippet.** Once both conditions pass, the trusted
identity is the user id **on the session row**:

```
@first(body('IMPLEMENT_Get_Auth_Session')?['value'])?['<your user id field>']
```

Use that for every Dataverse query and write — **never `triggerBody()?['userId']`**, which the
caller controls. Scoping a read to the authenticated user looks like:

```
$filter: "<user id field> eq '@{first(body('IMPLEMENT_Get_Auth_Session')?['value'])?['<your user id field>']}'"
```

Without this, a caller holding one valid token can read and update any other user's data.

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

Server token TTL is **1 hour** - the authority, re-checked by every authenticated flow. (The client adds its own stricter caps; see step 1.) Expired rows accumulate, so add a scheduled cleanup flow (e.g. daily) that deletes rows where `smkb_sol_expires_at` is in the past.

**Revocation, not just expiry.** A session must also be killable on demand - see §8 “Revoke a session, don't just wait for it to expire”.

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
- [ ] **All `[ADAPT]` markers resolved** — grep for `[ADAPT]` in the copied client → zero matches
- [ ] **All `[IMPLEMENT]` markers resolved** — grep for `[IMPLEMENT]` in flow JSONs → zero matches  
- [ ] **Route guard works** — unauthenticated access to protected route redirects to `/login`
- [ ] **SESSION_KEY unique** — `useAuth.ts` `SESSION_KEY` does not clash with other portal apps on the same domain
- [ ] **Site settings committed** with new GUIDs, empty `adx_value` — grep for `00000000-0000-0000-0000-000000000001` → zero matches in `sitesetting.yml`
- [ ] **Trigger URLs set** in Power Pages design studio (not in git) after flow deploy
- [ ] **Production smoke test** — real email → OTP received → login succeeds → session persists on page reload, dies after 15 minutes idle, and is rejected after the 1-hour server TTL
- [ ] **Logout actually revokes** — sign out, then replay the old token against an authenticated flow: it must return `UNAUTHORIZED`, not data

---

## 8. Security baseline for this module

An external security audit of a solution built on this recipe raised findings that trace straight back
to the recipe itself. The controls below are the recipe's answers. They are part of the module, not
optional extras — the root **SECURITY-BASELINE.md** records how each maps to a finding, and
[FLOW_SNIPPETS.md](../../SMKB%20-%20Power%20Automate%20Flows%20Starter/FLOW_SNIPPETS.md) sections 17-19
carry the generic patterns.

### Anti-enumeration — one generic answer

An unauthenticated endpoint that answers differently for "no such account" and "account exists" tells
an attacker which email addresses are registered, whatever status code it uses.

| Flow | Situation | Return |
|---|---|---|
| CreateOtp | email not found | **exactly the success response** — same shape, same `channels` array (built from the submitted address) |
| CreateOtp | account archived / disabled | the success response |
| CreateOtp | rate limit hit | `RATE_LIMITED` — counted per **submitted** address, existent or not |
| CheckOtp | no pending code | `INVALID_CODE` |
| CheckOtp | code expired | `INVALID_CODE` |
| CheckOtp | wrong code | `INVALID_CODE` (+ `attemptsRemaining`) |
| CheckOtp | locked out | `LOCKED`, worded about the **attempt state** |

Both templates now do this. Two things not to undo:

- **Do not split `INVALID_CODE` back into `NOT_FOUND` / `EXPIRED` / `WRONG_OTP`.** Each one is a
  separate statement about whether an address is registered. The branch still runs, so the real reason
  is in run history, which only flow owners and environment admins can read.
- **Count the rate limit per submitted address, not per found account.** If the limiter only fires for
  real accounts, `RATE_LIMITED` becomes the oracle you just closed.

`LOCKED` is a deliberate exception: users need to know why they are stuck. Word it as
*"too many attempts, try again later"* — never *"this account is locked"*, which confirms the account.

> **Response timing is a residual, and we accept it.** A not-found short-circuit returns faster than a
> full verification. Equalising that in a cloud flow is impractical (connector latency varies far more
> than the branch, and a fixed `Delay` taxes every real user). The rate limit, the lockout and the
> global cap are what make bulk probing expensive. Stating the channel is narrow is honest; claiming
> it is closed would not be.

### What at-rest protection actually means here

The OTP is stored as written, and that is a considered decision rather than an omission:

- **Power Automate has no hash expression.** There is no SHA/HMAC function in WDL, and OData `$filter`
  cannot hash server-side. "Hash the OTP" is not a flow edit; it needs a Dataverse plug-in, an Azure
  Function, or a custom connector.
- **For a 6-digit code, hashing buys very little anyway.** The keyspace is 10^6. An unsalted fast hash
  falls to exhaustive search instantly, so it would be reassurance rather than protection.
- **The session token is the value where hashing would genuinely help** — it is high-entropy and
  long-lived by comparison. The same platform limitation applies, so it is stored as-is too.

The controls that carry the weight instead:

| Control | Value |
|---|---|
| OTP expiry | 10 minutes |
| Attempt lockout | 5 attempts |
| Clear on use | Delete the OTP row on success — prevents replay |
| Session TTL | 1 hour |
| **Table access** | Restrict the OTP and session tables to the flow's service account |

That last row is the one people skip. If any portal role or broad security role can read the session
table, the token TTL is irrelevant — verify it explicitly. True at-rest hashing is a separate,
compliance-driven change; treat it as a project, not a checkbox on this recipe.

### Bot protection — fail closed, opt in

Verify a bot token **server-side, before any lookup or send**. Client-side widget rendering is not the
control; the `siteverify` call in the flow is.

- **Fail closed on failure.** When a site key is set, reject unless `siteverify` returned success. Run
  the check with `runAfter` covering `Succeeded`, `Failed` **and** `Skipped`, so a secret-fetch, HTTP or
  parse error rejects rather than falling through — otherwise a transient failure becomes an open door.
- **Fail closed on *misconfiguration* too — this is the one people miss.** An empty site key means
  "someone forgot", not "bot protection is off". `Guard_Turnstile_Misconfigured` in
  `smkb_sol_CreateOtp-TEMPLATE.json` runs **first**, before any lookup or send: if the site key is
  empty **and** `smkb_sol_EnvironmentName` is not `dev`, it answers `CONFIG_ERROR` and terminates.
  `dev` keeps working with no Cloudflare account; Stage and Prod refuse to run unprotected. An ops
  mistake must never silently degrade into an open endpoint.
- **Deliberately shipping no bot protection?** Delete the guard **and** the `Verify_Turnstile` scope
  together, and record that decision in `SOLUTION-SPEC.md` §9. Removing only the guard leaves a flow
  that is protected in `dev` and open everywhere else — the worst of both.
- Return `CAPTCHA_FAILED`. It reveals nothing about the account.

The `/ppcs-add-turnstile` skill wires the client and CSP halves. The fail-closed server gate and the
misconfiguration guard now ship **in this recipe's own `CreateOtp` template**, in Dataverse idiom — the
SharePoint-shaped reference flow in
[`examples/`](../../SMKB%20-%20Power%20Automate%20Flows%20Starter/examples/README.md) is a second
illustration, no longer the only place the pattern exists.

### Revoke a session, don't just wait for it to expire

Expiry alone is not revocation. Until this was added, `logout()` cleared `sessionStorage` and nothing
else — so a token copied out of a browser kept working against every authenticated flow until its
absolute TTL elapsed. Logout looked like a security boundary and was not one.

Three parts, and they only work together:

1. **`smkb_sol_RevokeSession-TEMPLATE.json`** (the 4th flow) — takes one `authToken`, finds the session
   row and pushes its expiry into the past. Register it with the **Anonymous** web role: the token *is*
   the credential, and whoever holds it may revoke it. It returns the **same** `{ "status": "ok" }` for
   a missing, unknown, already-expired or freshly-revoked token — idempotent, and no way to probe
   whether a token was real. `secureData: ["inputs"]` on both Dataverse calls (they are
   `OpenApiConnection` actions, so that is valid — **never** on a `Compose`).
2. **The client calls it fire-and-forget** on explicit logout *and* on idle timeout, before clearing
   local state while the token is still in hand. Failures are swallowed: the absolute expiry remains the
   backstop, and a revocation error must never block someone from logging out.
3. **Revoke on every auth-adjacent write.** Any flow that changes something an attacker could use to
   take over the account — phone, email, bank details — must expire the caller's sessions **in the same
   operation** that records the change, forcing re-authentication. In this recipe's shape that means
   updating the session rows matched by the **session-resolved** user id, not nulling two columns on a
   user row (that is the SharePoint layout, where the session lives on the user record). Tell the user
   what will happen: they are signed out immediately after the change.

> **Idle timeout.** Both shipped clients arm a 15-minute inactivity timer on login *and* on a page
> reload (a refresh restores the session without going through `login()`, so arming it only in `login()`
> would silently disable it). Activity listeners are throttled to 30s and are attached only while
> authenticated. On fire it runs the same path as an explicit logout, revoke included.

### Rate limiting has three layers, and the recipe ships one

| Layer | Stops | Where |
|---|---|---|
| Per-address limit (3 per 10 min) | Hammering one address | **Shipped** in `CreateOtp` |
| Attempt lockout (5) | Guessing a code | **Shipped** in `CheckOtp` |
| **Global cap** | A spray across many addresses | Add it — `smkb_sol_OtpDailyCap` |

The per-address limit is blind to breadth: ten thousand addresses touched twice each never trips it.
Add the global cap using `smkb_sol_OtpDailyCap` (Number) and alert to `smkb_sol_SecurityAlertEmails`
(String, semicolon-separated) — both ship in the Environmental Variables starter. FLOW_SNIPPETS
section 18 has the Dataverse `$count` query and the exact expressions.

Two rules for the alert: send it on the **transition into** a capped or locked state, never per
attempt (otherwise an abuse attempt becomes an outbound mail flood from your own tenant), and skip the
send when the recipient list is empty rather than failing — the cap must still reject.

Per-IP limiting belongs at the WAF, not here: a cloud flow has no trustworthy client IP, and a limiter
keyed on a spoofable value reads as a control that is not there.

### Secrets for the send

The recipe leaves the actual send to you, and whatever SMS or email API you wire in will have a key.

- Store it in a **Secret** environment variable (type `100000005`), never in
  `definition.parameters` — a committed default is caught by `no-secret-param-default`.
- Read it with the Dataverse unbound action `RetrieveEnvironmentVariableSecretValue`, passing
  `item/EnvironmentVariableName` as a **plain string**, not a `parameters()` reference.
- Set `runtimeConfiguration.secureData.properties` to `["outputs"]` on that fetch, and to `["inputs"]`
  on the call that consumes it. Securing only one half moves the plaintext one action to the right.
  `keyvault-secret-read-is-secured` enforces the fetch half.

**Never put `secureData` on the `Compose` that holds the generated code.** It is rejected: the
solution imports fine, then the flow fails activation with `InvalidSecureDataConfiguration` and stays
in **Draft** — every portal call to it then fails, and there is no `pac` verb to turn a flow back on.
`securedata-only-on-connector-actions` blocks it before deploy. The generated OTP therefore remains
visible in **admin-only run history**; that is the accepted residual, and the mitigation is auditing
who holds owner/co-owner on the flow and admin on the environment.
