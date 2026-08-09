---
name: Power Pages Code Site — Enable OTP Auth Module
description: >-
  Wires the dormant src/modules/otp-auth/ module into the app: login/locked-out
  routes, router guard, session-expired handling in App.vue, and Turnstile CSP
  domains in both CSP site settings. Replaces Power Pages OAuth with phone-OTP auth.
when_to_use: >-
  User says "enable OTP auth", "phone login", "OTP login", "SMS login", "enable
  the otp module", or wants login without Entra/Power Pages OAuth.
allowed-tools: Read Edit Write Grep Bash(npm run build) Bash(npm run lint)
---

## Context

The starter ships a complete, dormant phone-OTP auth module in
`src/modules/otp-auth/` (zero bytes in the bundle until wired). This skill
performs the wiring. Module internals, flow contracts, and the DEV mock are
documented in [src/modules/otp-auth/README.md](../../../src/modules/otp-auth/README.md).

## Steps

### Pre-flight

1. Grep `src/config/solution.ts` for `CHANGEME`. If found, **STOP**:
   > Fill in `src/config/solution.ts` first (prefix, appName, documentTitle) —
   > the OTP module derives its sessionStorage keys and login-page title from it.

2. Confirm with the user: OTP auth **replaces** the Power Pages OAuth sign-in
   for this app's UX (the portal endpoints remain, but the header switches to
   the OTP session). Ask whether to keep or remove the Entra "Sign In" button
   flow (`src/services/auth.ts` + `src/composables/usePortalUser.ts` stay in the
   repo either way — they're harmless when unused).

### Wire the router (`src/router/index.ts`)

3. Add direct imports (never lazy):
   ```typescript
   import OtpLoginView from '../modules/otp-auth/OtpLoginView.vue'
   import LockedOutView from '../modules/otp-auth/LockedOutView.vue'
   import { createOtpAuthGuard } from '../modules/otp-auth/guard'
   ```

4. Add routes (names must be `login` / `locked-out` — the guard and App.vue use them):
   ```typescript
   { path: '/login',      name: 'login',      component: OtpLoginView },
   { path: '/locked-out', name: 'locked-out', component: LockedOutView },
   ```

5. Install the guard after `createRouter(...)`:
   ```typescript
   router.beforeEach(createOtpAuthGuard())
   ```

### Wire App.vue

6. Add `'login'` to `STANDALONE_ROUTES` (the login page renders its own full-page
   shell; `locked-out` stays inside the layout so the header remains visible).

7. Add the global session-expired listener:
   ```typescript
   import { onMounted, onUnmounted } from 'vue'
   import { useRouter } from 'vue-router'

   const router = useRouter()
   function onSessionExpired() {
     logout()
     router.push({ path: '/login', query: { expired: '1' } })
   }
   onMounted(() => window.addEventListener('smkb:session-expired', onSessionExpired))
   onUnmounted(() => window.removeEventListener('smkb:session-expired', onSessionExpired))
   ```

8. Switch the header's user state from `usePortalUser` + `services/auth` to the
   module's `useAuth`:
   ```typescript
   import { useAuth } from './modules/otp-auth/useAuth'
   const { user, isAuthenticated, logout } = useAuth()
   ```
   - `:show-user-menu="isAuthenticated"`
   - `userMenuConfig` from `user.value?.firstName/lastName/email`
   - `@user-logout` → `logout()` + `router.push('/login')`
   - Remove the anonymous "Sign In" button block (OTP users land on /login via the guard).

### CSP — Turnstile domains

9. Add `https://challenges.cloudflare.com` to **both**
   `.powerpages-site/site-settings/security-csp.sitesetting.yml` and
   `security-csp-report-only.sitesetting.yml`, in **three** directives:
   - `script-src` (widget script)
   - `frame-src` (challenge iframe) — **create the directive if missing**
     (insert e.g. `frame-src 'self' https://challenges.cloudflare.com;` before `frame-ancestors`)
   - `connect-src` (token exchange)
   Add `challenges.cloudflare.com` to **both** files. Their `script-src` keyword sources differ on
   purpose (`'nonce'` enforced, `'unsafe-inline'` report-only) — do not "sync" that away. Same host
   rule as /ppcs-add-csp-domain.

### Flows

10. Remind the user to create + register the 3 flows (**Anonymous Users** web
    role) and paste GUIDs into `src/modules/otp-auth/otpFlows.ts`:
    `createOtp`, `checkOtp`, `getPortalConfig` — full trigger/response contracts
    in the module README. Until then the DEV mock works: `npm run dev`, any
    phone, OTP **123456**.

11. Review `src/modules/otp-auth/otpAuthConfig.ts` with the user: `homePath`,
    `blockedStatuses`, and the optional `onLoginRedirect` / `onNavigate` hooks
    (e.g. route status `Pending` into an onboarding wizard).

11b. **State the two server-side security requirements explicitly** — the client
    half you just wired does not provide either, and both are audit findings when
    missed. The hardened flow templates and the reasoning live in the Component
    Library recipe (`SMKB - Component Library/OTP Auth Screen/RECIPE.md`, "Security
    baseline for this module"); build the flows from those templates, not from
    scratch.

    - **Uniform responses (anti-enumeration).** `createOtp` must answer an unknown
      address *exactly* as it answers a successful send, and `checkOtp` must return
      one generic `INVALID_CODE` for not-found, expired **and** wrong code. The
      client already shows a generic message (`OtpLoginView.vue`), but that is
      cosmetic: if the flow returns distinguishable codes, the endpoint is still an
      account-existence oracle for anyone reading the network tab. Also count the
      rate limit per *submitted* address, or `RATE_LIMITED` leaks the same fact.
    - **Turnstile must be verified server-side, and fail closed.** Step 9 wires only
      the widget and the CSP. The control is the `siteverify` call inside
      `createOtp`, before any lookup or send, gated on a non-empty public site key
      and configured so a `Failed`/`Skipped` secret-fetch or parse error **rejects**
      rather than falling through. A rendered widget with no server check stops
      nobody.

### Verify

12. `npm run lint` and `npm run build` must pass.
13. Confirm the module is now bundled: grep `dist/assets/index.js` for `turnstile`
    (case-insensitive) — should now match (before enabling it did not).
14. Suggest a manual check: `npm run dev` → `/login` renders; mock OTP `123456`
    logs in; a deep link while signed out redirects to `/login`.

## Error Handling

- **Route-name mismatch:** the guard redirects by *path* but App.vue's
  standalone check uses route *name* — keep `name: 'login'` exactly.
- **CSP blocks Turnstile after deploy:** verify all three directives in both
  CSP files; then hard-refresh (the enforced CSP header is cached).
- **Authenticated flows return UNAUTHORIZED:** the flow must validate the
  `authToken` input server-side; pass it explicitly (see module README —
  invokeAuthFlow does not auto-attach it).

## Notes

Authenticated calls after login should use `invokeAuthFlow` from the module
(not bare `invokeFlow`) and pass `authToken: getAuthToken()` so the flow
re-validates the session server-side. Table permissions are NOT enforced in
flows — the token check inside each flow is the security boundary.
