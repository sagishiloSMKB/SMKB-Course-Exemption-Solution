# Integrations & Connections

> **TEMPLATE** — keep the connection-reference model and the env-var conventions; fill the tables from this
> solution's `Customizations.xml` and env-var definitions. Delete this callout once populated.

Every integration — internal or external — runs **only from a cloud flow**. Neither front end opens a
network connection to a data store or third party. This document lists the connectors, the shared
connection references, the external systems (endpoints, auth, data exchanged), and the environment
variables that configure them.

## Internal connectors (Power Platform connection references)

Flows bind to connectors through **connection references** defined in
`SMKB - [Name] - Cloud Flows/Other/Customizations.xml`. All are `runtimeSource: embedded` (the connection
travels with the solution — required so Power Pages-triggered flows run without an interactive user
connection).

`[FILL IN: one row per connection reference this solution uses. Connection references are shared, fixed,
environment-level names — do NOT invent per-solution ones. See CLAUDE.md → "Connection References".]`

| Connection reference (logical name) | Connector | Used for | Runs as |
|---|---|---|---|
| `[FILL IN]` | **SharePoint Online** | `[FILL IN]` | Service account |
| `[FILL IN]` | **Office 365 Outlook** | All outbound email | `[FILL IN: sender]` |
| `[FILL IN]` | **Microsoft Dataverse** | `[FILL IN]` | Dataverse |

> **Sharing model:** connection references are environment-scoped and shared across all flows of the
> right connector type. One SharePoint reference, one Office 365 reference, etc. — not one per flow.

## Production connections (per-environment binding)

A connection reference is an **environment-scoped pointer**; in each environment it is bound to an actual
connection. **Production uses dedicated connections**, configured **manually on the first pipeline promotion
to Production** and consistent thereafter. (Dev and Stage use their own connections.)

`[FILL IN: for each connection reference, the Production binding + scope + whether it's shared across SMKB
solutions. Note: the Dataverse connection is typically a dedicated, least-privilege service-principal /
application-user connection scoped to only this solution's tables; SharePoint/Outlook are usually shared
SMKB connections. Record the App (client) ID + tenant ID here — those are identifiers, not secrets; the
client secret/certificate is NEVER stored in the repo.]`

| Connection reference | Production connection | Scope / access | Shared across solutions? |
|---|---|---|---|
| `[FILL IN]` | `[FILL IN]` | `[FILL IN: least-privilege scope]` | `[FILL IN]` |

## External systems

`[FILL IN: one block per external system reached via the HTTP connector, or state "none". Never call an
external system from the browser. Template shape:]`

### `[FILL IN: system name]`
- **Purpose:** `[FILL IN]`.
- **Endpoint:** `[FILL IN]`.
- **Auth / secrets:** `[FILL IN — secret comes from a Key Vault-backed Secret env var; any public key is
  served to the browser only via a config flow]`.
- **Data sent:** `[FILL IN]`. **Data received:** `[FILL IN]`.
- **Fails closed:** `[FILL IN: what happens if the call doesn't clearly succeed]`.
- **Flow(s):** `[FILL IN]`.

## How the front ends invoke flows

- **Power Pages Code Site →** `POST /_api/cloudflow/v1.0/trigger/{flowGuid}` with the payload in
  `eventData` and an anti-forgery token (`src/services/cloudFlow.ts` + `src/services/csrf.ts`). Flow GUIDs
  are in `src/config/flows.ts`. Authenticated flows require the `authToken`.
- **Power Apps Code App →** generated service classes (`src/generated/services/*Service.ts`) call the bound
  Logic-flow connection references declared in `power.config.json`. The Power Apps runtime supplies the
  connection; there is no per-user credential in the app.

## Environment variables

Defined in `SMKB - [Name] - Environmental Variables/environmentvariabledefinitions/`. Values are set **per
environment** (Dev/Stage/Prod) — never hard-coded in flows or apps. **Secret-type** (`100000005`) vars are
backed by **Azure Key Vault**; the rest are **String type** (`100000000`).

`[FILL IN: one row per env var this solution defines, using smkb_<prefix>_PascalName. Example rows:]`

| Environment variable | Type | Purpose |
|---|---|---|
| `smkb_<prefix>_PortalBaseUrl` | String | Public portal base URL (used in invitation links) |
| `smkb_<prefix>_EnvironmentName` | String | Environment label (Dev/Stage/Prod) used in email subjects |
| `smkb_<prefix>_FlowErrorEmails` | String | Recipient(s) for flow-error notifications (`;`-separated) |
| `[FILL IN]` | **Secret** | `[FILL IN: Key Vault-backed]` |

- **Secret env vars** are read in flows only via the Dataverse unbound action
  `RetrieveEnvironmentVariableSecretValue` — never as `parameters()` and never returned to a client.
- **Email-list vars** use **String** with `;`-separated addresses (**not** JSON type) — see CLAUDE.md →
  Critical Rule 5.
- The Key Vault **reference format** and per-environment setup are in [Deployment & ALM](09-deployment-alm.md).

See [Security](07-security.md) for how secrets, transport, and the flows-only boundary are enforced.
