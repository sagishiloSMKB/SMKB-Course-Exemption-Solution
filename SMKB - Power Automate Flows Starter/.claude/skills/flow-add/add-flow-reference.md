# Add Flow — Reference

## The SMKB connection-reference bank (shared, never per-solution)

| Logical name | Display | `api.name` | Used for |
|---|---|---|---|
| `new_sharedoffice365_c3167` | SMKB - Outlook | `shared_office365` | All email |
| `smkb_SMKBSharePointConnectionUser1` | SMKB - SharePoint | `shared_sharepointonline` | SharePoint list I/O |
| `msdyn_Dataverse` | SMKB - Dataverse | `shared_commondataserviceforapps` | Dataverse actions + reading Secret env vars |
| `smkb_SMKBApprovals` | SMKB - Approvals | `shared_approvals` | Approvals |

All four are already declared in `Other/Customizations.xml` `<connectionreferences>`, so any flow can use
any of them without re-adding metadata.

## File 1 — flow JSON: connectionReferences (embedded)

Include only the connectors the flow uses. Each action references the **local key** in `host.connectionName`:

```json
"connectionReferences": {
  "shared_sharepointonline_ref": {
    "runtimeSource": "embedded",
    "connection": { "connectionReferenceLogicalName": "smkb_SMKBSharePointConnectionUser1" },
    "api": { "name": "shared_sharepointonline" }
  },
  "shared_office365_ref": {
    "runtimeSource": "embedded",
    "connection": { "connectionReferenceLogicalName": "new_sharedoffice365_c3167" },
    "api": { "name": "shared_office365" }
  }
}
```

`runtimeSource: "embedded"` is required (an `"invoker"` connection has no identity for an anonymous Power
Pages call → recurring 403). flow-lint blocks any non-embedded connection.

## File 1 — env-var parameters

Reference an env var by its `smkb_<prefix>_PascalName` schema name in the flow's `parameters` block (the
parenthetical key + `schemaName` must match, in lockstep), then read it with
`parameters('<KEY> (smkb_<prefix>_PascalName)')`. **Secret** env vars are read via the Dataverse unbound
action `RetrieveEnvironmentVariableSecretValue` — never `parameters()`.

## File 1 — error contract (Main_Flow + Handle_Flow_Error)

Wrap the work in a `Main_Flow` scope; add a `Handle_Flow_Error` scope that `runsAfter` it on
`Failed/TimedOut` and emails `smkb_<prefix>_FlowErrorEmails` with the **flow name + run id only**. Business
errors return **HTTP 200** with `{ "errorCode": "<CODE>" }` (Power Pages discards non-2xx bodies, so success
and expected-error are both 200). Authenticated Power Pages flows must validate the session token
(`Get_Auth_Session` → reject if not found → reject if expired → resolve the user) **before** any data access.

## File 2 — `Other/Customizations.xml` `<Workflow>` entry

```xml
<Workflow WorkflowId="{workflowEntityId}" Name="PREFIX - Flow Display Name">
  <JsonFileName>/Workflows/prefix_flow_name-workflowEntityId.json</JsonFileName>
  <Type>1</Type>
  <Subprocess>0</Subprocess>
  <Category>5</Category>
  <Mode>0</Mode>
  <Scope>4</Scope>
  <OnDemand>0</OnDemand>
  <TriggerOnCreate>0</TriggerOnCreate>
  <TriggerOnDelete>0</TriggerOnDelete>
  <AsyncAutodelete>0</AsyncAutodelete>
  <SyncWorkflowLogOnFailure>0</SyncWorkflowLogOnFailure>
  <StateCode>1</StateCode>
  <StatusCode>2</StatusCode>
  <RunAs>1</RunAs>
  <IsTransacted>1</IsTransacted>
  <IntroducedVersion>1.0.0.0</IntroducedVersion>
  <IsCustomizable>1</IsCustomizable>
  <BusinessProcessType>0</BusinessProcessType>
  <IsCustomProcessingStepAllowedForOtherPublishers>1</IsCustomProcessingStepAllowedForOtherPublishers>
  <PrimaryEntity>none</PrimaryEntity>
  <LocalizedNames>
    <LocalizedName languagecode="1033" description="PREFIX - Flow Display Name" />
  </LocalizedNames>
</Workflow>
```

## File 3 — `Other/Solution.xml` RootComponent

```xml
<RootComponent type="29" id="{workflowEntityId}" behavior="0" />
```

The GUID in `WorkflowId` (File 2), the `JsonFileName` (File 1 name), and `RootComponent id` (File 3) are the
**same** lowercase `workflowEntityId`.

## flow-lint (run before deploy)

```powershell
node ".\tools\flow-lint\lint.mjs"           # errors block; --strict also fails on warnings
```

Key rules: `connection-runtime-embedded`, `authenticated-flow-validates-token`,
`http-uri-encodes-client-input` (wrap `triggerBody()` in `encodeUriComponent`), `description-max-length`,
`powerpages-trigger-fields-have-title`, `no-secret-param-default`, `env-var-param-defined`. See
`tools/flow-lint/README.md`.
