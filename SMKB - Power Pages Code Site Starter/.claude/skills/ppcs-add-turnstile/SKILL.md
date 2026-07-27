---
name: Power Pages Code Site — Add Turnstile Bot Protection
description: >-
  Adds Cloudflare Turnstile to any public form, auth or not. Covers the client composable, the
  three CSP directives, and the server half that actually provides the security - the fail-closed
  verification scope, the Key Vault secret read, and the site-key disable switch.
when_to_use: >-
  User says "add Turnstile", "add a captcha", "bot protection", "stop spam on the contact form",
  "protect a public form", or is exposing any unauthenticated form that triggers a flow.
allowed-tools: Read Edit Write Grep Bash(node *)
---

## Context

Turnstile is the standard SMKB answer for a public form, and it is **auth-independent** — a
marketing page's contact form needs it exactly as much as an OTP login does, and must *not* drag in
login routes, a router guard or session handling.

The client half is easy: `src/composables/useTurnstile.ts` is standalone (its only imports are `vue`
and `SOLUTION`, and `render(el, sitekey)` takes the key as a plain argument). **The server half is
where the security lives and where every trap is** — a client-side captcha that the flow does not
verify is decoration. Four traps, each of which costs a deploy cycle to discover:

- **A Secret env var placed in `definition.parameters` imports fine and then the flow REFUSES TO
  TURN ON.** Secret-type variables (`type 100000005`) can only be read through the Dataverse unbound
  action `RetrieveEnvironmentVariableSecretValue`, never via `parameters()`.
- **The verification must fail CLOSED.** If the Key Vault read, the HTTP call, or the JSON parse
  fails, the flow must reject — not silently admit an unverified caller.
- **A Code Site SPA cannot read site settings**, so the *public* site key has to arrive over a config
  flow hop.
- **Three CSP directives** are needed, not one.

See [ALM-CODE-SITES.md](../../../docs/ALM-CODE-SITES.md) for how the resulting components reach other
environments, and the Env Vars starter README for the Secret-type rules.

## Steps

### Client

1. Confirm the composable is present at `src/composables/useTurnstile.ts` (older solutions have it at
   `src/modules/otp-auth/useTurnstile.ts`; a re-export shim keeps that path working). Its only
   imports must be `vue` and `SOLUTION` — if it imports anything from the OTP module, you have an
   older copy.
2. In the form component, render the widget and hold the token:
   ```typescript
   import { useTurnstile } from '@/composables/useTurnstile'
   const { token, failed, render, reset } = useTurnstile()
   ```
   Render into a container element on mount, passing the **public site key** from the config flow
   (step 6). Send `token` with the form submission, and `reset()` after a failed attempt.
3. **The empty-site-key disable switch:** treat an empty/absent site key as "Turnstile is off" so the
   form still works in Dev without a key. Never treat an empty key as "verification passed" on the
   server — see step 5.

### CSP (both files, kept identical)

4. Add `https://challenges.cloudflare.com` to **three** directives — `script-src` (the widget
   script), `frame-src` (it renders in an iframe) and `connect-src`. Use `/ppcs-add-csp-domain`,
   which edits the enforced and report-only files together and detects drift.

### Server - the part that provides the security

5. In the flow that the form triggers, before any data write:
   - Declare **two** env vars: the public site key (String) and the secret key (**Secret**,
     `type 100000005`).
   - Read the secret with the Dataverse unbound action
     **`RetrieveEnvironmentVariableSecretValue`**. Do **not** put a Secret env var in
     `definition.parameters` — it imports cleanly and then the flow will not turn on.
   - `POST` the token to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with the secret
     and the client's token. URL/body values that come from `triggerBody()` must be
     `encodeUriComponent`-wrapped (flow-lint rule `http-uri-encodes-client-input`).
   - **Fail closed.** Put the verification in a scope and give the reject branch
     `runAfter: [Succeeded, Failed, Skipped]`, so a Key Vault error, an HTTP error or an unparseable
     response all reject rather than fall through. Only an explicit `success == true` may continue.
   - Return a business error the HTTP-200 way — `{ "errorCode": "CAPTCHA_FAILED" }` — per the
     [flow-error contract](../../../docs/FLOW-ERROR-CONTRACT.md).
   - If the site key is empty (Turnstile disabled in this environment), decide explicitly and
     document it: either skip verification *by configuration* or reject. Never let an empty secret
     silently pass a caller.
6. **Deliver the public site key via a config flow.** A Code Site SPA cannot read site settings, so
   add a small unauthenticated `GetPortalConfig`-style flow that returns the public key (plus support
   contacts, etc.), register it with `/ppcs-register-flow`, and read it at app start.
7. Lint and deploy:
   ```
   node "../SMKB - <Name> - Cloud Flows/tools/flow-lint/lint.mjs" "../SMKB - <Name> - Cloud Flows/Workflows"
   ```
   Then `/ppcs-deploy` (which reconciles the new site components into the solution).

## Error Handling

- **Flow imports but will not turn on:** a Secret env var is in `definition.parameters`. Move it to
  the `RetrieveEnvironmentVariableSecretValue` action.
- **Widget does not render / console CSP error:** a directive is missing — you need all three
  (`script-src`, `frame-src`, `connect-src`).
- **Every submission rejected:** the secret env var has no value in this environment (Secret vars
  hold a Key Vault *reference*, set per environment), or the site and secret keys are from different
  Turnstile widgets.
- **Submissions succeed with an obviously invalid token:** the verification is failing **open** —
  check the reject branch really has `runAfter: [Succeeded, Failed, Skipped]`.

## Notes

- `useTurnstile.ts` is deliberately in `composables/`, not the OTP module: it is a captcha, not an
  auth artifact. `/ppcs-enable-otp-auth` uses the same composable and adds the login machinery on
  top — do not run it just to get a captcha.
- Turnstile keys are per-widget and per-domain. Dev and Prod normally use different widgets, which is
  why both keys are environment variables rather than committed values.
