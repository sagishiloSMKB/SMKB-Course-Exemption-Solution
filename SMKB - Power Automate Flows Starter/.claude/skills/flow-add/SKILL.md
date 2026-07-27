---
name: Cloud Flows — Add Flow (three-file rule)
description: >-
  Registers a new Power Automate cloud flow across all three solution files with
  the same workflowEntityId, embedded connection references from the SMKB bank,
  env-var params, the Handle_Flow_Error scope, and the HTTP-200 errorCode contract,
  then runs flow-lint.
when_to_use: >-
  User says "add a flow", "new cloud flow", "create a Power Automate flow", "author
  a flow", or wants to add server-side logic to the Cloud Flows starter.
argument-hint: "<flow_display_name> <PowerPages|PowerAppV2>"
arguments: [flow-name, trigger-kind]
allowed-tools: Read Edit Write Grep Bash(node *) Bash(powershell *)
---

## Context

A flow must be declared in **three files that reference the same Dataverse `workflowEntityId`** (a lowercase
GUID). Missing any one → deploy fails with "component not declared in the solution file as a root
component". The dense failure surface this skill handles:

- **The three files** (all sharing one `workflowEntityId`): `Workflows/<name>-<id>.json` (definition) +
  a `<Workflow WorkflowId="{id}">` in `Other/Customizations.xml` + a `<RootComponent type="29" id="{id}">`
  in `Other/Solution.xml`.
- **Connections** must be `runtimeSource: "embedded"` from the **SMKB connection-reference bank** (never a
  per-solution or `"invoker"` connection — invoker = recurring **403** on every deploy).
- **The error contract:** authenticated Power Pages flows validate the session token before any data access;
  business errors return **HTTP 200 with `{ "errorCode": "…" }`**; every flow wraps work in a `Main_Flow`
  scope with a `Handle_Flow_Error` scope that emails `smkb_<prefix>_FlowErrorEmails` (name + run id only).
- **Power Pages trigger fields need a `title`** (the payload maps by title, not key) or you get HTTP 500.

The `workflowEntityId` is **not** the flow ID in the Power Automate URL — it's the GUID in the exported
filename (get it via `pnpm pa add-flow --flow-id <portalId>` → `power.config.json`, or
`pac solution export`+`unpack`). Bank names, templates, and the error scope are in
[add-flow-reference.md](add-flow-reference.md); see also the [README](../../../README.md) three-file rule and
[FLOW_SNIPPETS.md](../../../FLOW_SNIPPETS.md).

## Steps

1. **Get a `workflowEntityId`. A freshly generated GUID is acceptable** — you do *not* need a portal
   stub first, so the whole authoring phase is unblocked:
   ```powershell
   [guid]::NewGuid().ToString().ToLower()
   ```
   Measured, not assumed: two flows authored with generated GUIDs and no portal stub imported cleanly
   and came back from `pac solution export` + `unpack` carrying **the same GUIDs**, correctly
   registered as `type="29"` RootComponents — a solution import creates the workflow record for a GUID
   Dataverse has not seen. (The shipped skeletons' placeholder GUIDs imply exactly this
   substitute-your-own model.)

   **Create a stub in the Power Automate UI only if** you need the trigger registered in Studio
   *before* deploy, or your process requires it. Then read its `workflowEntityId` back rather than
   inventing one — and note the **trigger type cannot be changed later**, so pick it correctly at
   creation (`PowerPages` for portal, `PowerAppV2` "When Power Apps calls a flow (V2)" for the Code
   App). Swapping the GUID afterwards is a mechanical rename across the filename,
   `Customizations.xml` and `Solution.xml`.
   ```powershell
   pnpm pa add-flow --flow-id <portalFlowId> --non-interactive   # read workflowEntityId from power.config.json
   # or: pac solution export --name <SolutionUniqueName> --path .\out.zip --overwrite; pac solution unpack --zipFile .\out.zip --folder .\out_unpacked
   ```
2. **File 1 — `Workflows/<name>-<workflowEntityId>.json`:** author the definition. Start from an example
   skeleton in `Workflows/`. Include: the `connectionReferences` block (embedded, only the bank connectors
   you use), any env-var parameters, a `Main_Flow` scope, a `Handle_Flow_Error` scope, and (Power Pages) the
   HTTP-200 `{ errorCode }` response shape. Templates in the reference.
3. **File 2 — `Other/Customizations.xml`:** add a `<Workflow WorkflowId="{workflowEntityId}">` entry
   (template in the reference). `Name` + `LocalizedName` = `PREFIX - Flow Display Name`. `JsonFileName`
   points at File 1. Connection-reference metadata for the bank connectors is already shipped here.
4. **File 3 — `Other/Solution.xml`:** add inside `<RootComponents>`:
   ```xml
   <RootComponent type="29" id="{workflowEntityId}" behavior="0" />
   ```
   The GUID in all three files must be identical (lowercase, braces in XML).
5. Run **flow-lint** and fix any errors before deploy:
   ```powershell
   node ".\tools\flow-lint\lint.mjs"
   ```
6. **PAUSE** — deploy is `/flow-deploy`. A newly-imported flow lands **Inactive**; turn it on once in the portal.

## Error Handling

- **"component not declared … as a root component":** the `RootComponent` (File 3) or `<Workflow>` (File 2) is missing, or the GUID differs across files. Make all three GUIDs identical.
- **Recurring 403 after deploy:** a connection is `"invoker"` (or a per-solution connection) — switch to `runtimeSource:"embedded"` with a bank logical name. flow-lint rule `connection-runtime-embedded` catches this.
- **HTTP 500 / IncorrectPayload from Power Pages:** a trigger field is missing its `title`, or the trigger description is >256 chars. flow-lint rules `powerpages-trigger-fields-have-title` / `description-max-length`.
- **Auth bypass flagged by flow-lint (`authenticated-flow-validates-token`):** an `authToken` input with no session-token validation before data access — add the validate chain.

## Notes

- **Three IDs, non-interchangeable:** the portal flow ID (URL), the `workflowEntityId` (filename/XML — the one PAC uses), and the trigger GUID Power Pages registers. Only `workflowEntityId` goes in these files.
- Connection references are the shared SMKB bank — never create a per-solution one. Bank list in the reference / README.
- `<UniqueName>` in `Solution.xml` is set by the root `apply-config.ps1` — don't hand-edit it.
- Templates (Workflow entry, embedded connections, error scope, HTTP-200 response) + the bank: [add-flow-reference.md](add-flow-reference.md).
