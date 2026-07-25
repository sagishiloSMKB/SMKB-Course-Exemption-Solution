---
name: Power Pages Code Site — Add Domain to CSP
description: >-
  Adds an external domain to both Power Pages Code Site CSP site settings
  (enforced + report-only) in the correct directive. Detects drift between the
  two files before editing. Prevents report-only from falling out of sync.
when_to_use: >-
  User says "add [domain] to CSP", "CSP blocks [domain]", "allow [domain]",
  "external script/font/image blocked", "add analytics", "add maps", "add Azure
  Blob", "add OAuth provider", or reports a CSP violation in the browser console.
argument-hint: "<domain> [script-src|connect-src|img-src|font-src|style-src]"
arguments: [domain, directive]
allowed-tools: Read Edit
---

## Context

This project ships **two** CSP site settings files that must stay in sync:

- `security-csp.sitesetting.yml` — the **enforced** CSP (blocks violating requests)
- `security-csp-report-only.sitesetting.yml` — the **report-only** CSP (logs
  violations to the browser console without blocking)

The most common mistake: adding a domain to only the enforced file. This fixes
the block but creates drift — future violations are no longer caught by the
report-only policy. **Both files must always be identical.**

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

3. **Check for drift.**
   Compare the `value` field (the CSP string) in both files. If they differ:
   > Warning: The enforced and report-only CSP files are out of sync. This
   > means violations have been going unreported. I'll show you the difference
   > before making any changes.
   Show what differs between the two. Ask the user whether to sync them first
   (use the enforced file as the source of truth) before adding the new domain.

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

5. **Edit both files simultaneously.**
   Apply the exact same change to `security-csp.sitesetting.yml` AND
   `security-csp-report-only.sitesetting.yml`. Never edit just one.

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
- `style-src unsafe-inline` — required by `@smkbacil/design-ui` Vue style injection
- `script-src unsafe-hashes` — injected by the Power Pages platform

For changes to CSP in a **production environment**, test with the report-only
file first: add the domain only to `security-csp-report-only.sitesetting.yml`,
deploy, verify no unexpected violations in the browser console, then add it to
`security-csp.sitesetting.yml` and redeploy.
