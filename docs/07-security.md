# Security

> **TEMPLATE** — this captures the standard SMKB security posture (keep the sections). Fill the `[FILL IN: …]`
> prompts with this solution's specifics and cite the source files. Delete this callout once populated.

This document describes the security controls **as currently implemented**. Each control cites where it
lives so IT can verify it in the repository.

## 1. Single server-side trust boundary

Both front ends are **UI-only** and hold **no data-access credentials**. Every read, write, email, SMS, and
external call runs in a **cloud flow**, which re-validates the caller before touching data. The portal has
**no Dataverse Web API client and no table permissions** — data access is flows-only by policy (portal
`CLAUDE.md`; `src/services/cloudFlow.ts`). This concentrates authorization, injection handling, and secret
access in one place: the flows.

## 2. Authentication

### End users (portal)
`[FILL IN: describe the portal auth. The SMKB default is custom OTP — phone + one-time code behind a
bot-check (fails closed), rate-limited issuance, attempt-lockout on validation, and a short-lived
sessionToken in sessionStorage re-validated by every flow (not Power Pages OAuth). Cite the flows +
src/composables/useAuth.ts. Replace if this solution uses a different scheme.]`

### Staff (back office) — Microsoft identity
The Power Apps Code App runs inside Power Platform; the signed-in Microsoft user authorises the bound flow
connections. Staff identity comes from the **unspoofable runtime context**, not a client-supplied value.

## 3. Authorization

- **Row-level ownership checks.** Portal flows that read or edit a specific record verify it belongs to the
  authenticated user before returning/mutating it. List flows are scoped to the caller. `[FILL IN: name the
  ownership-checked flows.]`
- **No client-side enumeration.** There is no browser data API; a user cannot request another user's records.
- `[FILL IN: any approval routing / privileged operations and how they are gated.]`

## 4. Secrets management

- Secrets live in **Azure Key Vault**, referenced by **Secret-type environment variables**
  (`[FILL IN: smkb_<prefix>_… secret var names]`).
- Flows read them **only** via the Dataverse unbound action `RetrieveEnvironmentVariableSecretValue` — never
  as `parameters()` (which would error) and **never returned to a client**.
- No secret value is committed to the repo (the npm auth token is injected via `${NPM_TOKEN}`; `.npmrc`
  references it, never stores it).
- Any auth-secret columns (OTP, session token) are never selected into any client response.

**Production connection isolation (least privilege):** in Production the connections each flow uses are
dedicated and least-privilege. The **Dataverse** connection is typically **solution-specific** — a service
principal / application user granted a role covering **only this solution's** data (App ID + tenant recorded
in [Integrations & Connections](04-integrations-and-connections.md); no client secret in the repo). The
**Office 365 Outlook** and **SharePoint** connections are dedicated Production connections shared across SMKB
solutions.

## 5. Transport & browser hardening (portal)

Configured as Power Pages site settings (`.powerpages-site/site-settings/`):

| Control | Setting | Value |
|---|---|---|
| HTTPS-only auth cookie | `Authentication/ApplicationCookie/CookieSecure` | `Always` |
| Non-JS-readable auth cookie | `Authentication/ApplicationCookie/CookieHttpOnly` | `true` |
| Content-Security-Policy (enforced) | `HTTP/Content-Security-Policy` | see below |
| CSP (report-only companion) | `HTTP/Content-Security-Policy-Report-Only` | baseline |
| No MIME sniffing | `HTTP/X-Content-Type-Options` | `nosniff` |
| Legacy XSS filter off (CSP supersedes) | `HTTP/X-XSS-Protection` | `0` |
| Block `unsafe-eval` auto-injection | `HTTP/Content-Security-Policy/Inject-unsafe-eval` | `false` |

**CSP:** `default-src 'self'`. Scripts, styles, images, fonts, and `connect-src` are restricted to `'self'`
plus the required Microsoft Power Platform CDNs; `[FILL IN: any additional allowed origins — e.g. a bot-check
domain in connect-src/frame-src, an open-data API in connect-src]`. `frame-ancestors 'self'` and
`form-action 'self'` are set. HTTPS and `X-Frame-Options` are provisioned by the Power Pages platform.
Use the Power Pages starter's `/ppcs-add-csp-domain` skill to add an origin to both CSP files.

`[FILL IN: note any accepted CSP findings, e.g. style-src 'unsafe-inline' required by the design system's
runtime style injection — tracked as a known, accepted finding in the portal CLAUDE.md.]`

## 6. Injection prevention (flows)

- **OData injection:** values interpolated into SharePoint filter queries are quote-escaped (single quotes
  doubled) and URL-encoded, so a crafted name/ID cannot alter the query.
- **URL injection:** path/query segments sent to external APIs are `encodeUriComponent`-escaped.
- **Email/HTML:** flows compose email from controlled templates; user-provided fields are inserted as data.

## 7. Input validation

- **Client-side** (defence-in-depth): `[FILL IN: e.g. Israeli national-ID checksum, phone format,
  required-field/type validation]` before submission (`src/utils/*`, covered by unit tests). These improve
  UX but are **not** the security boundary.
- **Server-side** (the real boundary): flows re-validate identity/authorization and enforce uniqueness and
  business rules before writing.

## 8. Data minimization

- `[FILL IN: sensitive values returned masked; raw value never reaches the browser.]`
- Read endpoints return a **safe field set** (no secrets, no raw sensitive numbers).
- `[FILL IN: where full sensitive data legitimately leaves — e.g. a controlled approval email.]`

## 9. Anti-forgery

Cloud-flow calls carry the Power Pages anti-forgery token. In the deployed runtime the Power Pages shell
(`window.shell.ajaxSafePost`) attaches it automatically; the local-dev fallback fetches the token via
`src/services/csrf.ts`.

## 10. Safe error handling

- **Business errors** are returned as **HTTP 200 with an `errorCode`** (no stack traces, no internal detail
  leaked to the client).
- **Unhandled failures** hit each flow's `Handle_Flow_Error` scope, which emails
  `smkb_<prefix>_FlowErrorEmails` with the **flow name and run ID only — no personal data**.

## 11. Static enforcement

Security-relevant rules are enforced automatically before code ships — no `v-html`, no direct network calls
from the SPA, cloud-flow schema/description constraints, no stray secrets. See
[Testing & Quality Gates](08-testing-and-quality-gates.md).
