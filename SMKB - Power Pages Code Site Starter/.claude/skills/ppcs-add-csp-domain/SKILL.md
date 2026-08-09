---
name: Power Pages Code Site — Add Domain to CSP
description: >-
  Adds an external domain to both Power Pages Code Site CSP site settings
  (enforced + report-only) in the correct directive. Compares the host allowlists
  before editing so report-only never falls behind, while leaving the two files'
  deliberately different keyword sources alone.
when_to_use: >-
  User says "add [domain] to CSP", "CSP blocks [domain]", "allow [domain]",
  "external script/font/image blocked", "add analytics", "add maps", "add Azure
  Blob", "add OAuth provider", or reports a CSP violation in the browser console.
argument-hint: "<domain> [script-src|connect-src|img-src|font-src|style-src]"
arguments: [domain, directive]
allowed-tools: Read Edit
---

## Context

This project ships **two** CSP site settings files with **different jobs**:

- `security-csp.sitesetting.yml` — the **enforced** CSP (blocks violating requests)
- `security-csp-report-only.sitesetting.yml` — a **permissive new-source monitor**.
  It logs a violation when the site loads from a host the enforced policy does not
  allow, so a new dependency is noticed before it is blocked.

**The invariant is the host allowlist, not the whole string.** Both files must
carry the **same hosts** in every directive. Their **keyword sources** (`'nonce'`,
`'unsafe-inline'`, …) may differ, and one pair deliberately does:

| Directive | Enforced | Report-only | Why |
|---|---|---|---|
| `script-src` | `'nonce'` | `'unsafe-inline'` | Power Pages substitutes a real per-request nonce and injects its own script hash into the **enforced** header only. A nonce in report-only would report every legitimate platform inline script as a violation and bury the real ones. |

So: adding a domain to only the enforced file is still the mistake this skill
exists to prevent — but a `script-src` keyword difference is **correct** and must
not be "fixed".

For CSP directive reference and common integration patterns, there are no
separate reference files needed — all patterns are in this SKILL.md.

## Steps

1. **Identify the domain and directive.**
   - If `$domain` is not provided, ask the user to paste the CSP error from
     the browser console (it shows the blocked URL)
   - If `$directive` is not provided, infer from context:

   | What the user is adding | Directive(s) |
   |------------------------|-------------|
   | JavaScript / analytics script | `script-src` |
   | External API call (fetch/XHR) | `connect-src` |
   | Image from CDN or blob storage | `img-src` |
   | Web font | `font-src` + possibly `style-src` |
   | CSS stylesheet | `style-src` |
   | Google Fonts | `font-src` AND `style-src` |
   | Google Maps | `script-src` AND `img-src` |
   | Azure Blob Storage images | `img-src` |
   | OAuth provider redirect | `form-action` (not src) |
   | Worker / service worker | `worker-src` |
   | Cloudflare Turnstile (`challenges.cloudflare.com`) | `script-src` AND `frame-src` AND `connect-src` (all three) |

   If multiple directives are needed, add the domain to all of them.

   Note: `frame-src` may not exist in the shipped CSP string — if missing,
   create the directive (insert it before `frame-ancestors`). For the OTP auth
   module, `/ppcs-enable-otp-auth` adds the Turnstile domains automatically.

2. **Read both CSP files.**
   Read:
   - `.powerpages-site/site-settings/security-csp.sitesetting.yml`
   - `.powerpages-site/site-settings/security-csp-report-only.sitesetting.yml`

3. **Check for host drift — compare host lists, never the whole string.**
   Split each file's `value` into directives, and within each directive separate
   **hosts** (bare names like `content.powerapps.com`) from **keyword sources**
   (anything quoted: `'self'`, `'nonce'`, `'unsafe-inline'`, `'none'`).

   - **Compare the hosts only.** If a directive's host list differs between the
     two files, that is real drift — a domain was added to one and not the other:
     > Warning: `<directive>` allows `<host>` in one file but not the other, so
     > violations for it are going unreported. I'll show you the difference
     > before making any changes.
     Show the difference and offer to add the missing host to whichever file lacks
     it. **Add the missing host — never overwrite one file's whole value with the
     other's**, which would destroy the intended keyword difference below.
   - **Ignore keyword differences.** `script-src` legitimately carries `'nonce'`
     in the enforced file and `'unsafe-inline'` in report-only (see Context).
     Do not report it, and do not "sync" it.

4. **Add the domain to the correct directive(s).**
   In the CSP string (the `value` field), find the relevant directive line and
   append the domain. Preserve the existing entries.

   Example — adding `cdn.example.com` to `script-src`:
   ```
   Before: ...script-src 'self' content.powerapps.com ... 'nonce' ...
   After:  ...script-src 'self' content.powerapps.com ... 'nonce' cdn.example.com ...
   ```

   Match the existing entries' style — hosts are listed **schemeless** (e.g.
   `content.powerapps.com`, `cdn.example.com`), not `https://…`. Avoid wildcards
   (`*.example.com`) unless strictly necessary — they are a security risk.

5. **Add the host to both files.**
   Apply the same *host* addition to `security-csp.sitesetting.yml` AND
   `security-csp-report-only.sitesetting.yml`. Never edit just one — a host present
   in only the enforced file is blocked-and-unreported; present in only report-only
   it is reported-and-still-blocked. Leave each file's keyword sources as they are.

6. **Special case — `unsafe-eval`.**
   If the user needs `unsafe-eval` (e.g. for a PDF library, charting library, or
   legacy code), do **not** add it to the CSP string directly. Instead:
   > Do not add `unsafe-eval` to the CSP manually. Power Pages has a dedicated
   > site setting for this:
   > In `.powerpages-site/site-settings/security-csp-inject-unsafe-eval.sitesetting.yml`
   > change `value: "false"` to `value: "true"`, then redeploy.

7. **Remind the user to deploy.**
   CSP changes only take effect after deploying site settings to Power Pages.
   Suggest running `/ppcs-deploy`.

## Error Handling

- **CSP string not found:** If the `value` field is missing or empty in a file,
  show the user the file contents and ask them to confirm it's the right file.
- **Directive not found in CSP string:** If the directive (e.g. `script-src`)
  doesn't exist in the current CSP string, add a new directive line at the end
  of the policy string. Show the user the full new string before writing.
- **Both files missing:** The site settings haven't been downloaded yet. Run
  `pac pages download` first (or `/ppcs-provision-site` if first-time setup).

## Notes

After adding a domain, two Power Pages site checker findings remain permanent
and expected (do not try to fix them):
- `style-src unsafe-inline` — required by dynamic inline style **attributes**
  (`:style`, `v-show`, `<Transition>`, `element.style.setProperty`), which no nonce
  or hash can cover, plus the `<style>` elements Power Pages injects itself. It is
  **not** CSS-in-JS: `@smkbacil/design-ui` ships a static stylesheet that Vite
  extracts to a self-served `assets/index.css`.
- `script-src unsafe-hashes` — injected by the Power Pages platform

**Staging a risky change in production:** you may add a host to
`security-csp-report-only.sitesetting.yml` first, deploy, watch the console, then
add it to `security-csp.sitesetting.yml`. That is a *temporary, intentional* host
difference — step 3 will report it on the next run, which is correct: finish the
rollout, or remove it. Do not leave it indefinitely.
