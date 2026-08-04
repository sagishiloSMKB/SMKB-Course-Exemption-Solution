# OTP Auth Module (opt-in)

Phone-OTP authentication as an alternative to Power Pages OAuth (Entra sign-in).
Proven in production on a live SMKB Power Pages site.

**This module is dormant**: nothing outside `src/modules/otp-auth/` imports it, so it
ships **zero bytes** in the bundle until wired up — but `vue-tsc` and ESLint still
check it on every build, so it cannot rot.

**To enable: run `/ppcs-enable-otp-auth`** (wires the router, App.vue, and CSP).

## What's included

| File | Purpose |
|---|---|
| `otpFlows.ts` | Flow GUID registry for the 3 required flows (empty ⇒ DEV mock active) |
| `otpAuthConfig.ts` | Per-solution knobs: paths, blocked statuses, routing hooks |
| `useAuth.ts` | Singleton auth state in sessionStorage (key from `SOLUTION.prefix`), expiry-checked |
| `authService.ts` | `createOtp` / `checkOtp` (+ IL phone normalization) with DEV mocks |
| `configService.ts` | Anonymous portal config: support contact + Turnstile site key |
| `invokeAuthFlow.ts` | `invokeFlow` wrapper that guards the session token and fires `smkb:session-expired` |
| `useTurnstile.ts` | Cloudflare Turnstile explicit-render bootstrap (no-op without a site key) |
| `OtpLoginView.vue` | Full login page: phone step → 6-digit OTP grid, WebOTP (Android), iOS QuickType relay, resend cooldown, Turnstile |
| `LockedOutView.vue` | Blocked-status page with support contact info |
| `guard.ts` | `createOtpAuthGuard()` router guard |

UI text is Hebrew (like the production origin); localize the strings in
`OtpLoginView.vue` / `LockedOutView.vue` if your solution needs another language.

## Required flows (register in Studio with the **Anonymous Users** web role)

All three use the "When Power Pages calls a flow" trigger and follow the
HTTP-200 + `errorCode` contract (see `docs/FLOW-ERROR-CONTRACT.md`) — every
Response action returns **statusCode 200**; errors are `{ "errorCode": "<CODE>" }`.

### 1. create_otp
- **Inputs:** `phone` (text), `origin` (text), `turnstileToken` (text — trigger field title must match exactly)
- Verify the Turnstile token (Cloudflare siteverify) **server-side, before any lookup or send**, when a site key is configured → on failure return `{ "errorCode": "CAPTCHA_FAILED" }`. Must **fail closed**: a `Failed`/`Skipped` secret-fetch or parse error rejects rather than falling through.
- Look up the user by phone; generate + store an OTP; send via SMS/email
- **Success:** `{ "channels": [ { "type": "sms" | "email_college" | "email_personal", "maskedValue": "050****567" } ] }`
- **Error codes:** `RATE_LIMITED` (count per *submitted* number, existent or not), `LOCKED`, `OTP_SEND_FAILED`, `CAPTCHA_FAILED`, `INVALID_INPUT`
- **An unknown or archived number must return the SUCCESS response**, not a distinct code. Returning `NOT_FOUND` or `ACCOUNT_ARCHIVED` here makes the endpoint an account-existence oracle: the generic message this module shows in the UI is cosmetic, and anyone reading the network tab sees the real code. Build the delivery-channel list from the submitted address so the shapes match.

### 2. check_otp
- **Inputs:** `phone` (text), `otp` (text)
- Validate the OTP (limit attempts; lock after too many failures)
- **Success:** `{ "userId", "firstName", "lastName", "email", "status", "authToken", "authTokenExpiresAt" }`
  — `authToken` is a server-generated session token the flow layer re-validates on every
  authenticated call; `authTokenExpiresAt` is ISO 8601; `status` is your solution's
  user status (e.g. `Active` / `Pending` / `Archived`)
- **Error codes:** `INVALID_CODE` (+ `attemptsRemaining` number), `LOCKED`, `ERROR`
- **`INVALID_CODE` is deliberately one code for three situations** — no pending code, expired code, and
  wrong code. Splitting it back into `NOT_FOUND` / `EXPIRED` / `WRONG_OTP` re-opens the enumeration
  oracle, because each variant states something about whether the number is registered. Which case
  actually occurred is in the flow's run history, readable only by flow owners and environment admins.
  `LOCKED` may be returned, but word it about the attempt state ("too many attempts"), never the
  account.

> The hardened flow templates and the full reasoning are the single source:
> `SMKB - Component Library/OTP Auth Screen/RECIPE.md` → "Security baseline for this module". Build the
> three flows from those templates rather than from these bullets, which are the client-side contract.

### 3. get_portal_config
- **Inputs:** none
- **Success:** `{ "supportPhone": "", "supportEmail": "", "turnstileSiteKey": "" }`
  — empty `turnstileSiteKey` disables the captcha entirely (login works without it)

## Authenticated flows after login

Use `invokeAuthFlow` from this module instead of `invokeFlow` for any flow that
requires the OTP session, and pass the token so the flow re-validates server-side:

```typescript
import { invokeAuthFlow } from '@/modules/otp-auth/invokeAuthFlow'
import { useAuth } from '@/modules/otp-auth/useAuth'

const { getAuthToken } = useAuth()
const profile = await invokeAuthFlow<Profile>(FLOWS.getProfile, {
  authToken: getAuthToken(),
})
```

The flow must validate `authToken` before touching Dataverse — **table permissions
are NOT enforced inside flows**. On `UNAUTHORIZED` / `SESSION_EXPIRED` errorCodes the
wrapper logs out and fires `smkb:session-expired` (App.vue redirects to login).

## DEV mock

While a GUID in `otpFlows.ts` is empty and the app runs under `npm run dev`:
- `createOtp` returns mock masked channels for any phone number
- `checkOtp` accepts OTP **123456** (anything else → `INVALID_CODE` with 2 attempts left)
- `getPortalConfig` returns an empty config (no Turnstile widget)

So the full login UX is testable before any flow exists.

## Turnstile (optional captcha)

1. Create a Turnstile widget in the Cloudflare dashboard; note the **site key**
   (public) and **secret key** (used inside create_otp for siteverify)
2. Return the site key from get_portal_config
3. CSP: `challenges.cloudflare.com` must be in `script-src`, `frame-src` and
   `connect-src` — `/ppcs-enable-otp-auth` adds these to both CSP site settings
