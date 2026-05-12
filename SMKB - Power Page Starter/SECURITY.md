# Security Reference — SMKB Power Pages Starter

This document covers the security posture of this starter, the OWASP Top 10 mapping for the Power Pages + Vue SPA stack, and the pen test checklist that every project built from this starter should pass before going to production.

Run the automated check at any time:
```bash
cd client && pnpm check:security
```

The same check runs automatically as a blocking step in `pnpm deploy`.

---

## 1. Security Posture Overview

### Already hardened in this starter

| Control | Location | Value |
|---------|----------|-------|
| Local password login | `sitesetting.yml` | `LocalLoginEnabled = false` (Azure AD only) |
| X-Frame-Options | `sitesetting.yml` | `DENY` |
| X-Content-Type-Options | `sitesetting.yml` | `nosniff` |
| Referrer-Policy | `sitesetting.yml` | `strict-origin-when-cross-origin` |
| Permissions-Policy | `sitesetting.yml` | Camera, microphone, geolocation disabled |
| Login throttling | `sitesetting.yml` | 5 attempts / 5 min window; 15 min IP lockout |
| Login tracking | `sitesetting.yml` | `LoginTrackingEnabled = true` |
| Cookie SameSite | `sitesetting.yml` | `Lax` |
| Font loading | `client/src/main.ts` | `tokens-nofonts.css` (avoids CSP-blocked font binaries) |
| Routing | `client/src/router/` | Hash-based (`/#/...`) — no server-side route exposure |
| HTTPS | Power Pages platform | Enforced by Microsoft, not configurable |
| Session management | Power Pages platform | Microsoft-managed; tokens never touch client code |

### Open items to review for every new project

- **`OpenRegistrationEnabled`** — currently `true` for starter compatibility. Set to `false` for invite-only or internal portals.
- **Table permissions** — must be defined for every Dataverse table the portal accesses. The starter ships with none beyond what Power Pages creates by default.
- **Page permissions** — standard pages (Search, Profile, Access Denied) restrict access via web roles. Verify they're correct for your use case.
- **`webrole.yml` deduplication** — the starter has 6 webrole entries (3 roles × 2 GUIDs from a template merge). Reduce to 3 after first `pac pages download`.
- **`websiteaccess.yml`** — review after first deploy to ensure no stale entries remain.

---

## 2. OWASP Top 10 Mapping (2021)

### A01 — Broken Access Control
**Risk for this stack:** Unauthenticated access to Dataverse tables via Power Pages Web API; pages visible to wrong roles.

**Mitigations:**
- Define [Table Permissions](https://learn.microsoft.com/en-us/power-pages/security/table-permissions) for every table exposed via the portal
- Assign table permissions to the correct web roles (Authenticated Users, Administrators)
- Use Page Permissions to restrict sensitive pages to Authenticated Users
- Never expose contact, account, or internal data via anonymous Web API access
- Column Permissions for sensitive fields (PII, internal notes)

### A02 — Cryptographic Failures
**Risk for this stack:** Sensitive data in transit or at rest; tokens in client-side globals.

**Mitigations:**
- HTTPS enforced by Power Pages platform (Microsoft-managed TLS)
- Never pass sensitive values via `window.__SMKB_*` globals — these are for non-sensitive config only
- Session tokens managed by Power Pages; never extracted or stored client-side
- No external CDN references for scripts (all assets served from `/smkb/`)

### A03 — Injection
**Risk for this stack:** Liquid template injection; OData/Web API query param injection; XSS via unescaped output.

**Mitigations:**
- Liquid templates must escape all dynamic values: `{{ value | escape }}`
- Never render raw HTML from user input (no `v-html` in Vue — enforced by `pnpm check:security`)
- Power Pages Web API uses OData — parameterised queries only, no raw SQL
- URL hash routing (`/#/`) means parameters are not processed server-side

### A04 — Insecure Design
**Risk for this stack:** Registration open to the internet; insufficient role separation.

**Mitigations:**
- Review `OpenRegistrationEnabled` for every project
- Define principle-of-least-privilege web role assignments
- Administrators role scoped to operations staff only, never end users

### A05 — Security Misconfiguration
**Risk for this stack:** Missing security headers; debug settings left on; weak auth config.

**Mitigations:**
- All 4 required headers enforced by `pnpm check:security`
- `LocalLoginEnabled = false` checked automatically before every deploy
- No `console.log` in production source (checked before deploy)
- Power Pages admin panel access controlled via SMKB-Apps-Dev tenant permissions

### A06 — Vulnerable and Outdated Components
**Risk for this stack:** npm dependencies with CVEs in the Vue/Vite build chain.

**Mitigations:**
- `pnpm audit --audit-level=high` runs automatically before every deploy
- Review `pnpm audit` output on every PR merge
- Keep `vite`, `vue`, and `vue-router` up to date (patch versions automatically, minor with testing)
- `pnpm-lock.yaml` committed to repo — lock file prevents silent upgrades

### A07 — Identification and Authentication Failures
**Risk for this stack:** Brute-force login; stale sessions; weak identity provider.

**Mitigations:**
- Local login disabled — only Azure AD (enforced and checked pre-deploy)
- Login throttling: 5 attempts / 5 min, then 15 min IP lockout
- Login tracking enabled for audit trail
- Session management handled by Microsoft identity platform

### A08 — Software and Data Integrity Failures
**Risk for this stack:** Compromised npm packages; script injection via external CDN.

**Mitigations:**
- No external CDN script tags — all scripts served from `/smkb/` (local)
- Vite build produces a content-hashed bundle, not evaluated inline
- `pnpm-lock.yaml` pins exact dependency tree
- Secret pattern scan runs before every deploy

### A09 — Security Logging and Monitoring Failures
**Risk for this stack:** No audit trail for authentication events.

**Mitigations:**
- `LoginTrackingEnabled = true` — Power Pages records last successful login on the contact record
- Power Platform audit logging available at tenant level (SMKB-Apps-Dev environment settings)
- Failed login attempts tracked via throttling counters

### A10 — Server-Side Request Forgery (SSRF)
**Risk for this stack:** Bot consumer / external API integrations making requests to internal systems.

**Mitigations:**
- Bot consumer (`botconsumer.yml`) points to Microsoft Copilot Studio endpoints only
- No server-side proxy code in this starter — Vue SPA communicates with Power Pages OData only
- Review any added integrations for SSRF potential before deploying

---

## 3. Pen Test Checklist

Use this checklist before every production release and as the acceptance criteria for a professional security assessment.

### Transport & Infrastructure

- [ ] HTTPS enforced on all portal endpoints (no HTTP redirect to HTTPS gaps)
- [ ] HSTS header present (Microsoft sets this on Power Pages — verify with curl or browser DevTools)
- [ ] No mixed content (HTTP assets on HTTPS pages)
- [ ] TLS 1.2+ only (TLS 1.0/1.1 rejected) — verify via SSL Labs scan

### HTTP Security Headers

- [ ] `X-Frame-Options: DENY` present in all responses
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` present
- [ ] `Permissions-Policy` present (camera, microphone, geolocation restricted)
- [ ] `Content-Security-Policy` present and does not include `unsafe-inline` for scripts
- [ ] No sensitive data in response headers (`Server` version suppressed, no `X-Powered-By`, no stack traces)

### Authentication & Session Management

- [ ] Local password login disabled (`LocalLoginEnabled = false` in sitesetting.yml)
- [ ] Azure AD login is the only sign-in path
- [ ] Login throttling active: 5 attempts / 5 min window, 15 min IP lockout
- [ ] Login tracking enabled (Last Successful Login recorded on contact)
- [ ] `OpenRegistrationEnabled` intentionally set for this project (not defaulted)
- [ ] Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax` (platform-managed — verify in browser DevTools)
- [ ] No session tokens or auth tokens in `window.__SMKB_*` globals or local/session storage
- [ ] Logout invalidates the server-side session (Power Pages platform behaviour — test manually)

### Input Validation & XSS

- [ ] No `v-html` directives in Vue components
- [ ] All Liquid template outputs escaped (`{{ value | escape }}` or trusted server-side values only)
- [ ] URL parameters not rendered directly into the DOM without sanitisation
- [ ] No `eval()` or `Function()` constructor in client-side code
- [ ] CSP blocks inline script execution

### Secrets & Data Exposure

- [ ] No credentials, API keys, or tokens in source files
- [ ] `.env*` files in `.gitignore` and not committed to the repo
- [ ] `pnpm audit` reports no high or critical vulnerabilities
- [ ] No `console.log` debug output in production source
- [ ] Error messages shown to users do not reveal stack traces or internal paths

### Access Control (Dataverse / Power Pages)

- [ ] Table Permissions defined for every table the portal reads or writes
- [ ] Table Permissions assigned to appropriate web roles (not Anonymous where authentication is required)
- [ ] Column Permissions applied for PII and sensitive fields
- [ ] Standard pages (Access Denied, Not Found) use correct HTTP status codes (403, 404)
- [ ] Admin pages and operations restricted to the Administrators web role

### Build & Dependencies

- [ ] `pnpm audit --audit-level=high` passes with zero findings
- [ ] `pnpm-lock.yaml` committed and up to date
- [ ] No dev dependencies (`devDependencies`) bundled into the production build
- [ ] Vite build output contains no source maps accessible at the production URL

### Power Pages Platform

- [ ] Portal is bound to the correct environment (SMKB-Apps-Dev)
- [ ] Website maintenance mode tested — portal shows maintenance page, not a 500 error
- [ ] `pac pages upload` succeeds from a clean checkout (no local-only files required)
- [ ] Site settings sync correctly after upload (verify in Power Pages admin)

---

## 4. Running the Automated Check

The automated check covers 10 of the most critical items above. It is not a substitute for the full pen test checklist but it prevents the most common issues from reaching production.

```bash
cd client
pnpm check:security
```

| Check | Severity | What it verifies |
|-------|----------|-----------------|
| Dependency vulnerabilities | Critical | `pnpm audit --audit-level=high` |
| Secret patterns in source | Critical | Regex scan for hardcoded credentials |
| `.env*` in `.gitignore` | Critical | Prevents accidental secret commits |
| `LocalLoginEnabled = false` | Critical | Azure AD-only auth enforced |
| Security headers present | Critical | All 4 required HTTP headers in sitesetting.yml |
| `LoginTrackingEnabled = true` | Warning | Audit trail active |
| No `v-html` in Vue files | Critical | XSS prevention |
| No `console.log` in src | Warning | Debug artifacts removed |
| `PORTAL_URL` configured | Warning | Deploy target set (not a TODO) |
| `adx_websiteid` configured | Warning | Website GUID set (not a TODO) |

Critical failures block deployment. Warnings are printed but do not block.
