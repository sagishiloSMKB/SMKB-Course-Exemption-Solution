# Cloud Flows

> **TEMPLATE** — keep the "Auth & request model" and "Notes" (general SMKB contract); fill the flow
> inventory tables from this solution's `Workflows/*.json`. Delete this callout once populated.

All business logic and every external call live in the **Power Automate cloud flows**
(`SMKB - [Name] - Cloud Flows/Workflows/*.json`). They are the solution's single server-side trust boundary.

- **`[FILL IN: N]` portal flows** — trigger `kind: PowerPages`, called by the Power Pages Code Site.
- **`[FILL IN: N]` back-office flows** — trigger `kind: PowerAppV2`, called by the Power Apps Code App.

## Auth & request model (SMKB standard contract)

- **Portal flows** are invoked over `/_api/cloudflow/v1.0/trigger/{guid}`. Authenticated ones require an
  `authToken`; each validates it the **same way** before any data access: look up the `sessionToken` →
  reject if not found (`UNAUTHORIZED`) → reject if the session is past its expiry → resolve the user, then
  **scope all data to that user**.
- **Business errors** are returned as **HTTP 200 with an `errorCode`** field in the body (e.g. `WRONG_OTP`,
  `NOT_FOUND`, `CAPTCHA_FAILED`). The portal client turns that into a typed error. (Power Pages discards the
  body of non-2xx responses, so success and expected-error are both HTTP 200.) See the Power Pages starter's
  [flow-error contract](../SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/docs/FLOW-ERROR-CONTRACT.md).
- **Every flow** has a `Handle_Flow_Error` scope that, on failure, emails `smkb_<prefix>_FlowErrorEmails`
  (flow name + run ID only — **no personal data**).
- **Back-office flows** run under the Power Apps user's bound connection; they are staff-scoped operations.
- **Connections** are all `runtimeSource: embedded` (see [Integrations & Connections](04-integrations-and-connections.md)).

## Portal flows (`PowerPages`)

`[FILL IN: one row per flow, grouped as below. Use the smkb_<prefix>_PascalName schema name. Delete groups
that don't apply.]`

### Public reference — no `authToken` (return only non-sensitive reference data)
| Flow | Purpose | Connectors |
|---|---|---|
| `smkb_<prefix>_GetPortalConfig` | Portal config (support contacts, public keys) from env vars | — |
| `[FILL IN]` | `[FILL IN]` | `[FILL IN]` |

### Authentication
| Flow | Purpose | Connectors |
|---|---|---|
| `smkb_<prefix>_CreateOtp` | `[FILL IN: verify bot-check → generate OTP → send; rate-limited]` | `[FILL IN]` |
| `smkb_<prefix>_CheckOtp` | `[FILL IN: validate OTP (attempt lockout), issue session token]` | `[FILL IN]` |

### Authenticated user operations (require `authToken`)
| Flow | Purpose | Connectors |
|---|---|---|
| `[FILL IN]` | `[FILL IN — note ownership-checked reads/writes]` | `[FILL IN]` |

## Back-office flows (`PowerAppV2`)

`[FILL IN: one row per back-office flow, grouped by area (e.g. record management; reference; notifications).]`

| Flow | Purpose | Connectors |
|---|---|---|
| `[FILL IN]` | `[FILL IN]` | `[FILL IN]` |

## Notes (general)

- Flow JSON filenames are `<display name>-<Dataverse workflow GUID>.json`; the GUIDs are environment-specific.
- Adding/removing a flow requires a matching `<Workflow>` entry in `Other/Customizations.xml` and a
  `RootComponent` in `Other/Solution.xml` — enforced by **flow-lint** (see
  [Testing & Quality Gates](08-testing-and-quality-gates.md)).
- Changing a flow's **trigger schema** (inputs) deactivates it on re-import — it must be turned back on in
  Power Automate after deploy.
