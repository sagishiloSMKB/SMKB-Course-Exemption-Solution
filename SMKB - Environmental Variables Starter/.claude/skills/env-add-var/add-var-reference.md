# Add Variable — Reference

## Type codes (`<type>`)

| Code | Type | Use for |
|------|------|---------|
| `100000000` | **String** | URLs, emails (incl. `;`-separated lists), any text, most values |
| `100000001` | Number | Numeric config |
| `100000002` | Boolean | Feature flags / toggles |
| `100000003` | JSON | **Avoid.** Forces `json()` parsing everywhere and can't be changed by reimport once deployed |
| `100000004` | Data Source | Rare |
| `100000005` | **Secret** | Key Vault-backed secrets (SMS password, API keys) |

**Email / list rule (Critical Rule 5):** use **String** with `;`-separated addresses
(`ops@smkb.ac.il;dev@smkb.ac.il`) — a String is consumed directly in a flow's `To` field with no parsing.
Never JSON.

## Example definition XML

```xml
<environmentvariabledefinition schemaname="smkb_evt_PortalBaseUrl">
  <displayname default="EVT - Portal Base URL" />
  <label description="EVT - Portal Base URL" languagecode="1033" />
  <type>100000000</type>
  <defaultvalue>https://example.powerappsportals.com</defaultvalue>
  <!-- omit <defaultvalue> entirely when the value is environment-specific -->
  <introducedversion>1.0.0.0</introducedversion>
  <iscustomizable>1</iscustomizable>
</environmentvariabledefinition>
```

- `schemaname` must equal the containing folder name.
- Secret vars ship **no** `<defaultvalue>` (the value is a per-environment Key Vault reference).

## RootComponent (Other/Solution.xml) — required

```xml
<RootComponent type="380" schemaName="smkb_evt_PortalBaseUrl" behavior="0" />
```

One per variable. Without it the definition won't travel through the pipeline.

## Secret (Key Vault) setup — per environment, after deploy

A Secret-type var stores an **Azure Resource ID** of the secret (not the `https://…vault…` URI, and **no**
version suffix):

```
/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/providers/Microsoft.KeyVault/vaults/{vaultName}/secrets/{secretName}
```

Prerequisites:
- The **Microsoft.PowerPlatform** resource provider is registered on the subscription.
- The Key Vault grants **"Key Vault Secrets User"** (RBAC) to the person setting the value **and** to the
  Dataverse service principal (App ID `00000007-0000-0000-c000-000000000000`).
- Key Vault + the Power Platform environment are in the **same tenant**; the vault firewall allows access.

The secret **value** is never stored in Dataverse or the repo — only this reference. Flows read it at run
time via the Dataverse unbound action `RetrieveEnvironmentVariableSecretValue` (never as `parameters()`).
