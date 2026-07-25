---
name: Power Pages Code Site — Enable Web API for Table
description: >-
  Opts a Power Pages Code Site out of flows-only for one table: generates site
  settings YAMLs (enabled + fields) and a table permission YAML, restores
  src/services/portalApi.ts, and allowlists it in ESLint. Handles the
  logical-name vs entity-set-name distinction and generates fresh UUIDs.
when_to_use: >-
  User says "enable web api", "allow access to [table]", "read [table] from the
  SPA", "write to [table]", "set up table permissions", or "expose [table] via API".
argument-hint: "<table-logical-name> [field1,field2,...] [Global|Self|Account]"
arguments: [table-logical-name, fields, access-type]
allowed-tools: Read Edit Write Bash(powershell -Command "[System.Guid]::NewGuid()*")
---

## Context

> **This starter is flows-only by default — prefer a cloud flow
> (`/ppcs-register-flow`).** All backend access goes through
> `src/services/cloudFlow.ts`; `src/services/portalApi.ts` does not ship, and
> ESLint bans raw `fetch`/XHR/WebSocket outside the sanctioned transport files.
> Enable the Web API only when direct OData access is genuinely needed (e.g.
> high-volume reads where a flow round-trip is too slow). This skill is the
> **opt-out**: it restores `portalApi.ts` and allowlists it in ESLint.

Two naming rules that every developer gets wrong at least once:

- **Site settings** use the **table logical name** (e.g. `contact`, `account`,
  `cr123_myentity`)
- **API paths** use the **entity set name** (e.g. `contacts`, `accounts`,
  `cr123_myentities` — usually the logical name + `s` or ending in `es`)

Using the wrong name in either place causes silent 403s with no clear error.

**GUIDs must be generated fresh** for each table permission. Never copy a GUID
from another permission file — Dataverse uses GUIDs for upsert identity. Copied
GUIDs cause one permission to silently overwrite another.

For YAML templates and access type guidance, see
[web-api-reference.md](web-api-reference.md).

## Steps

1. **Gather inputs.** If not provided in arguments, ask:
   - **Table logical name** (e.g. `contact`) — the name shown in the "Logical name"
     column in make.powerapps.com → Dataverse → Tables
   - **Fields to expose** (comma-separated, or `*` for all) — only listed fields
     are accessible via the Web API
   - **Access type**: which of these fits the use case?
     - `Global` — all records (e.g. reference lists, public data)
     - `Self` — only the authenticated user's own contact record
     - `Account` — records belonging to the user's parent account
     - `Parent` — records via a parent relationship
   - **Web roles** — which roles get this permission?
     - `Authenticated Users` — signed-in users only
     - `Anonymous Users` — anyone (no sign-in required)
     - Both

2. **Determine the entity set name.** The entity set name is used in API paths
   (e.g. `/_api/contacts`). It is usually the logical name + `s` but can differ
   for custom tables. Tell the user how to find it:
   > In make.powerapps.com → Dataverse → Tables → [your table] → Advanced → Tools
   > → **Copy set name**. It looks like `contacts` or `cr123_myentities`.

3. **Generate a fresh UUID** for the table permission:
   ```powershell
   powershell -Command "[System.Guid]::NewGuid().ToString()"
   ```
   Store this UUID — use it in step 6. Never reuse a UUID from another file.

4. **Write the enabled site setting.**
   File: `.powerpages-site/site-settings/webapi-<tablename>-enabled.sitesetting.yml`
   ```yaml
   adx_name: Webapi/<tableName>/enabled
   adx_value: "true"
   ```
   Note: `<tableName>` = logical name with original casing (e.g. `contact`,
   `cr123_MyEntity`).

5. **Write the fields site setting.**
   File: `.powerpages-site/site-settings/webapi-<tablename>-fields.sitesetting.yml`
   ```yaml
   adx_name: Webapi/<tableName>/fields
   adx_value: "<field1>,<field2>,<field3>"
   ```
   If the user said `*` (all fields), use `*` as the value.

6. **Write the table permission.**
   File: `.powerpages-site/table-permissions/<tablename>-<accesstype>.entitypermission.yml`

   Use the YAML template from [web-api-reference.md](web-api-reference.md)
   matching the chosen access type. Fill in:
   - `TablePermissionId` → the fresh UUID from step 3
   - `EntityName` → logical name
   - `AccessType` → chosen access type
   - `PrivilegeType` → comma-separated privileges (Read, Write, Create, Delete,
     Append, AppendTo) — ask which are needed if not specified
   - `WebRoles` → the chosen web roles

7. **Restore `src/services/portalApi.ts`** (flows-only opt-out, part 1).
   If the file does not exist, create it from the full source embedded in
   [web-api-reference.md](web-api-reference.md) under
   "portalApi.ts — restore source (flows-only opt-out)". If it already
   exists, leave it as-is — this site has already opted out.

8. **Allowlist `portalApi.ts` in ESLint** (flows-only opt-out, part 2).
   In `eslint.config.js`, find the **last** config block — the override that
   sets `'no-restricted-syntax': 'off'` for
   `['src/services/cloudFlow.ts', 'src/services/csrf.ts']` — and add
   `'src/services/portalApi.ts'` to its `files` array. Without this,
   `npm run lint` (and therefore `npm run deploy`) fails on the restored
   file's `fetch` calls.

9. **Show a usage example** for the specific table using `portalApi.ts`:
   ```typescript
   import { apiGet, apiPost } from '@/services/portalApi'

   // Read records (entity set name in the API path)
   const result = await apiGet<{ value: Contact[] }>(
     `/_api/<entitySetName>?$select=<field1>,<field2>&$top=50`
   )

   // Create a record
   await apiPost(`/_api/<entitySetName>`, {
     <field1>: value,
     <field2>: value,
   })
   ```

10. **Remind the user** to run `/ppcs-deploy` after creating these files to
    push the site settings and table permissions to Power Pages.

## Error Handling

- If `pac pages download` has not been run yet and `.powerpages-site/` is empty,
  remind the user that `pac pages download` must be run first to get the site GUID
  (needed for the manifest). The YAML files can still be created now and will be
  picked up on the next deploy.
- If the user wants to restrict access further (e.g. only specific contactId
  matches), remind them that this must be enforced in a cloud flow — table
  permissions are coarse-grained, not row-level.

## Notes

After deploying, verify the Web API is accessible:
```
GET /_api/<entitySetName>?$select=<field1>
```
A 403 usually means the table permission web roles don't include the current
user's role. A 404 usually means the entity set name is wrong.

For complex data operations (multi-step, cross-table, server-side logic), prefer
`/ppcs-register-flow` and cloud flows over direct Web API calls from the SPA.
