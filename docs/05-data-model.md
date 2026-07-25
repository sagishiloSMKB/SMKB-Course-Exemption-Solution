# Data Model

> **TEMPLATE** — keep the "How records relate" principle and the grouped-column pattern; fill the tables
> from this solution's `Entity.xml` files (and SharePoint lists, if used). Delete this callout once populated.

The solution stores data in `[FILL IN: one or both platforms]`:

- **Dataverse** — `[FILL IN: N]` custom tables (`smkb_<prefix>_*`): `[FILL IN: what they hold]`. Defined in
  `SMKB - [Name] - Dataverse Tables/Entities/*/Entity.xml`.
- **SharePoint Online** (if used) — `[FILL IN: N]` lists: `[FILL IN]`. `[FILL IN: note if columns are
  created per environment by hand, not by the solution import.]`

## How records relate

`[FILL IN: describe the correlation model. The SMKB default is:]` There are typically **no foreign-key
relationships across stores** — records **correlate by string keys** (e.g. a SharePoint item ID or an
email copied onto the related record), and each flow looks up exactly the records it needs by key. The
front ends never join across stores.

> **Discipline:** a solution must **never write columns owned by another system** (e.g. an ERP/payroll app's
> amount or approval columns). Read them if needed, but treat them as read-only; list any such externally-owned
> columns here so future changes don't clobber them.

## Dataverse table: `smkb_<prefix>_[TableName]`

`[FILL IN: repeat this block per table. Primary key / EntitySetName / logical names are the lowercased form
of the PascalCase schema name — see CLAUDE.md → Critical Rule 3.]`

`[FILL IN: one-line purpose of the table.]`

| Column | Type | Purpose |
|---|---|---|
| `smkb_<prefix>_[tablename]id` | Unique identifier | Primary key |
| `smkb_<prefix>_name` | Text | Primary name |
| `[FILL IN]` | `[FILL IN]` | `[FILL IN]` |

> All Dataverse tables also carry the standard system columns (`createdon`, `createdby`, `modifiedon`,
> `ownerid`, `statecode`, …) from `Entity.xml`; only the custom `smkb_<prefix>_*` columns are listed above.
> The shared `smkb_name` / `smkb_description` columns keep the bare publisher prefix (no solution segment).

## SharePoint list: `[FILL IN: list name]` (if used)

`[FILL IN: repeat per list; group columns by sensitivity so the privacy review is easy. Include an
**Auth-secrets** group for any OTP/session columns and note that they are NEVER returned to any client.]`

| Group | Columns |
|---|---|
| **Identity / PII** | `[FILL IN]` |
| **Contact** | `[FILL IN]` |
| **Financial** (if any) | `[FILL IN]` |
| **Lifecycle** | `[FILL IN]` |
| **Auth secrets** (never returned to any client) | `[FILL IN: e.g. otpCode, sessionToken, expiries]` |

> Any auth-secret columns are **never returned to any client** — read/written only inside the auth flows.
> See [Security](07-security.md). Free-text fields may contain personal data — see [Data & Privacy](06-data-privacy.md).
