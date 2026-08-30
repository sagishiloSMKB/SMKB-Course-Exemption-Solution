# ppcs-enable-web-api Reference

## Table Permission YAML Templates

### Global Access (all records, any user in the role)

```yaml
EntityName: contact
TablePermissionId: <fresh-uuid>
AccessType: Global
PrivilegeType: Read,Write,Create,Delete
WebRoles:
  - Authenticated Users
```

### Self Access (only the user's own linked contact record)

```yaml
EntityName: contact
TablePermissionId: <fresh-uuid>
AccessType: Self
PrivilegeType: Read,Write
WebRoles:
  - Authenticated Users
```

### Account-Scoped Access (records linked to the user's parent account)

```yaml
EntityName: cr123_myentity
TablePermissionId: <fresh-uuid>
AccessType: Account
AccountRelationship: cr123_account_myentity   # the N:1 relationship logical name
PrivilegeType: Read,Write,Create
WebRoles:
  - Authenticated Users
```

### Parent-Scoped Access (child records via a parent permission)

```yaml
EntityName: cr123_childentity
TablePermissionId: <fresh-uuid>
AccessType: Parent
ParentEntityPermission: <parent-table-permission-id>
ParentRelationship: cr123_parententity_childentity
PrivilegeType: Read,Write,Create,Delete
WebRoles:
  - Authenticated Users
```

---

## Privilege Types Reference

| Privilege | Description |
|-----------|-------------|
| `Read` | `apiGet()` — fetch records |
| `Write` | `apiPatch()` — update existing records |
| `Create` | `apiPost()` — create new records |
| `Delete` | `apiDelete()` — delete records |
| `Append` | Needed to associate records |
| `AppendTo` | Needed when records are associated to this entity |

For most SPA use cases, `Read` alone is sufficient. Add `Write,Create,Delete`
only when the SPA needs to mutate data.

---

## OData Query Patterns (portalApi.ts)

```typescript
import { apiGet, apiPost, apiPatch, apiDelete } from '@/services/portalApi'

// Read records with filter and select
const res = await apiGet<{ value: Contact[] }>(
  `/_api/contacts?$select=firstname,lastname,emailaddress1&$filter=statecode eq 0&$top=50`
)
const contacts = res.value

// Read a single record by ID
const contact = await apiGet<Contact>(
  `/_api/contacts(<contactId>)?$select=firstname,lastname`
)

// Create a record (returns 204 No Content — no response body)
await apiPost(`/_api/contacts`, {
  firstname: 'Jane',
  lastname: 'Doe',
  emailaddress1: 'jane@example.com',
})

// Update a record (PATCH — returns 204)
await apiPatch(`/_api/contacts(<contactId>)`, {
  firstname: 'Jane Updated',
})

// Delete a record (returns 204)
await apiDelete(`/_api/contacts(<contactId>)`)
```

**Headers automatically added by `portalApi.ts`:**
- `OData-Version: 4.0`
- `OData-MaxVersion: 4.0`
- `Accept: application/json`
- `__RequestVerificationToken` (for POST/PATCH/DELETE — fetched from `/_layout/tokenhtml`)

---

## Logical Name vs Entity Set Name

| Table display name | Logical name (site settings) | Entity set name (API path) |
|--------------------|------------------------------|---------------------------|
| Contact | `contact` | `contacts` |
| Account | `account` | `accounts` |
| My Custom Entity | `cr123_mycustomentity` | `cr123_mycustomentities` |

The entity set name can be found in:
make.powerapps.com → Dataverse → Tables → [table] → Advanced → Tools →
**Copy set name** (or look at the "Entity set name" field in table properties).

---

## Common 403 Causes After Enabling

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `/_api/<entity>` returns 403 | Web API not enabled or fields not listed | Verify site settings files exist and are deployed |
| 403 on specific field | Field not listed in `webapi-<table>-fields` | Add field to the comma-separated list |
| 403 for Authenticated Users | Table permission missing Authenticated Users role | Check WebRoles in the entitypermission.yml |
| 403 for Anonymous Users | Anonymous Users not included in WebRoles | Add Anonymous Users to WebRoles (+ verify site setting for anonymous Web API) |
| 403 on POST/PATCH/DELETE | CSRF token missing | Use `apiPost/apiPatch/apiDelete` from `portalApi.ts`, not raw `fetch` |

---

## portalApi.ts — restore source (flows-only opt-out)

The starter is flows-only and does not ship `src/services/portalApi.ts`.
When `/ppcs-enable-web-api` runs, it restores the file with exactly this
source (it imports `getCsrfToken` from `./csrf`, which ships with the
starter). Remember to also add `'src/services/portalApi.ts'` to the `files`
array of the last config block in `eslint.config.js`.

```typescript
// ─────────────────────────────────────────────────────────────────────────────
// Power Pages Web API client (flows-only OPT-OUT — restored by /ppcs-enable-web-api)
//
// Wraps the portal's OData endpoint (/_api/) with proper CSRF token handling.
//
// Before using:
//   1. Enable the Web API for each table in site settings:
//      Webapi/<tableName>/enabled = true
//      Webapi/<tableName>/fields  = field1,field2,...  (or * for all)
//   2. Configure table permissions in .powerpages-site/table-permissions/
//   3. Add this file to the ESLint fetch-allowlist override in eslint.config.js
//
// Docs: https://learn.microsoft.com/en-us/power-pages/configure/web-api-overview
// ─────────────────────────────────────────────────────────────────────────────

import { getCsrfToken } from './csrf'

const BASE_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'OData-MaxVersion': '4.0',
  'OData-Version': '4.0',
}

/**
 * GET — read records.
 *
 * @example
 * const data = await apiGet<{ value: Contact[] }>(
 *   '/_api/contacts?$select=firstname,lastname&$filter=statuscode eq 1'
 * )
 */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: BASE_HEADERS,
  })
  if (!res.ok) {
    let detail: unknown
    try { detail = await res.json() } catch { detail = await res.text() }
    throw detail
  }
  return res.json() as Promise<T>
}

/**
 * POST — create a record.
 *
 * @example
 * const contact = await apiPost<Contact>('/_api/contacts', {
 *   firstname: 'Jane',
 *   lastname: 'Doe',
 * })
 */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getCsrfToken()
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      ...BASE_HEADERS,
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let detail: unknown
    try { detail = await res.json() } catch { detail = await res.text() }
    throw detail
  }
  return res.json() as Promise<T>
}

/**
 * PATCH — update a record.
 *
 * @example
 * await apiPatch('/_api/contacts(00000000-0000-0000-0000-000000000001)', {
 *   telephone1: '555-1234',
 * })
 */
export async function apiPatch(path: string, body: unknown): Promise<void> {
  const token = await getCsrfToken()
  const res = await fetch(path, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: {
      ...BASE_HEADERS,
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let detail: unknown
    try { detail = await res.json() } catch { detail = await res.text() }
    throw detail
  }
}

/**
 * DELETE — delete a record.
 *
 * @example
 * await apiDelete('/_api/contacts(00000000-0000-0000-0000-000000000001)')
 */
export async function apiDelete(path: string): Promise<void> {
  const token = await getCsrfToken()
  const res = await fetch(path, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: {
      ...BASE_HEADERS,
      '__RequestVerificationToken': token,
    },
  })
  if (!res.ok) {
    let detail: unknown
    try { detail = await res.json() } catch { detail = await res.text() }
    throw detail
  }
}
```
