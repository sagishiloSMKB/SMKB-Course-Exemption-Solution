# ppcs-provision-site Reference

## Duplicate Site Recovery

If `pac pages list -v` shows two entries for the same site — one with
`Single Page Application: Yes` and one with `No` — the non-SPA record is an
orphan. To remove it:

1. Open **Portal Management** app in the target environment:
   `https://<org-url>/main.aspx?app=Portal Management`
2. Navigate to **Websites** in the left nav
3. Find the record whose GUID matches the non-SPA entry from `pac pages list`
4. Open the record → **Deactivate** → confirm
5. Delete the now-inactive record
6. Re-run `pac pages list -v` to confirm only one site remains

**Never delete the SPA site record** (the one with `Single Page Application: Yes`).

---

## Reading `pac pages list -v` Output

Example output:
```
Id                                    FriendlyName        Url                                  SinglePageApplication
------------------------------------  ------------------  -----------------------------------  ---------------------
a1b2c3d4-0001-4000-8000-000000000001  My App - my-app     https://my-app.powerappsportals.com  Yes
```

Key columns:
- **Id** — the GUID to use in `pac pages download --webSiteId <Id>`
- **FriendlyName** — must match `siteName` in `powerpages.config.json` exactly
- **SinglePageApplication** — must be `Yes`; if `No`, wait and retry

---

## Post-Download File Paths (Quick Reference)

| Edit # | File | Field | Change |
|--------|------|-------|--------|
| 1 | `.powerpages-site/site-settings/Authentication-Registration-ProfileRedirectEnabled.sitesetting.yml` | `value` | `true` → `false` |
| 2 | `.powerpages-site/page-templates/Default-studio-template.pagetemplate.yml` | `usewebsiteheaderandfooter` | `true` → `false` |
| 3 | `.powerpages-site/<siteName>/page-templates/Default-studio-template.pagetemplate.yml` | `adx_usewebsiteheaderandfooter` | `true` → `false` |

Note: If only one of the two page template files exists after download, edit
only the one that's present — the other is not needed.

---

## Blocked Attachments Fix

If `npm run deploy` returns a 403 when uploading `.js` files:

1. Go to Power Platform Admin Center: `https://admin.powerplatform.microsoft.com`
2. Select the target environment → **Settings** → **Product** → **Features**
3. Under **Blocked file extensions for attachments**, remove `js` from the list
4. Save and retry `npm run deploy`

---

## siteName Slug Append

Power Pages automatically appends a URL slug to site names during provisioning.
Example: `My App` → `My App - my-app`

The `siteName` field in `powerpages.config.json` must match the **exact
FriendlyName** shown in `pac pages list -v`. If they don't match, `npm run deploy`
will fail to find the site or create a second orphan site.

After downloading, the `<siteName>` subdirectory inside `.powerpages-site/`
also reflects the slug-appended name. Use that directory name as a reference.
