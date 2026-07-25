# Example Flows — Reference Only (NOT deployed)

These are **real, production flows copied verbatim** from the live SMKB Payment Vouchers solution.
They exist so you can see the conventions in `../README.md` and `../FLOW_SNIPPETS.md` applied end to
end. Read them; copy the *patterns* into your own flows under `../Workflows/`.

> **They are never deployed by this starter.** `deploy.ps1` only packs `../Workflows/*.json`. Nothing
> in this folder is zipped or imported. Leave it as-is, or delete it once you no longer need it.

## Two notes

1. **These files use the kit's naming convention** (`smkb_<prefix>_<PascalName>` — e.g. flow
   `smkb_pvch_GetBankList`, env vars `smkb_pvch_EnvironmentName` / `smkb_pvch_FlowErrorEmails`, secrets
   like `smkb_pvch_TurnstileSecretAPIKey`). In the **live** SMKB Payment Vouchers environment the same
   components appear under their original names (flows `pvch_get_bank_list`, org-wide env vars
   `smkb_ENVIRONMENT_NAME`, secrets `smkb_PVCHTurnstileSecretAPIKey`) — the kit standardized on one
   convention *after* these were built, so the names here are the convention form, not a byte-for-byte
   copy of production. Copy the **patterns**, not the exact names.
2. **They carry real Dataverse workflow GUIDs and the real connection-reference bank.** That is
   correct for a reference; do not reuse a GUID for a new flow (each flow record has its own).

Every one of these uses the **connection-reference bank** with `runtimeSource: "embedded"` — the same
logical names documented in the main README:
`new_sharedoffice365_c3167`, `smkb_SMKBSharePointConnectionUser1`, `msdyn_Dataverse`, `smkb_SMKBApprovals`.

## Index — what each one demonstrates

| File | Trigger | Connectors (bank) | Patterns to learn |
|---|---|---|---|
| `smkb_pvch_GetBankList-*.json` | PowerPages | Outlook | **Simplest full flow.** External `Http` GET → `ParseJson` → `Select`/`Query` whitelist + cap → 200 payload. Public (no auth). `Main_Flow` + `Handle_Flow_Error`. Snippet 8. |
| `smkb_pvch_GetVoucherList-*.json` | PowerPages | Outlook, SharePoint | SharePoint `GetItems` list read; **authToken → sessionToken** validation before returning data (flow-lint `authenticated-flow-validates-token`). |
| `smkb_pvch_CreateVoucherRecord-*.json` | PowerPages | Outlook, SharePoint | Record **creation** with `item/` fields (Snippet 3); authToken validation. |
| `smkb_pvch_CheckOtp-*.json` | PowerPages | Outlook, SharePoint | Session-token validation, SharePoint `PatchItem`, **clearing fields with `"@null"`** (Pitfall 10), business-error `200` + `errorCode` vocabulary (Snippet 8). |
| `smkb_pvch_UpdateBankAccount-*.json` | PowerPages | Outlook, SharePoint, **Approvals** | Approvals connector as an **`embedded`** connection (Pitfalls 9d/9g — invoker → recurring 403), SharePoint patch, authToken validation. |
| `smkb_pvch_CreateOtp-*.json` | PowerPages | Outlook, SharePoint, **Dataverse** | **Secret / Azure Key Vault env vars** via `RetrieveEnvironmentVariableSecretValue` (Snippet 11), outbound SMS `Http` with **`encodeUriComponent`** on client input (flow-lint `http-uri-encodes-client-input`), Turnstile gate on a non-secret key. The richest example. |
| `smkb_pvch_ManagerGetLecturers-*.json` | **PowerAppV2** | Outlook, SharePoint | The **Code App** trigger path (Snippet 6) — internal/staff flow wired via `pnpm pa add-flow`, not Power Pages Studio. |

## How to use one

1. Open the file and find the pattern you need (cross-reference the table above with `../FLOW_SNIPPETS.md`).
2. Copy the relevant action block into your own flow under `../Workflows/`.
3. Swap the env-var params for your solution's (`smkb_<prefix>_EnvironmentName`, etc. — see the main
   README's env-var section), or keep a shared org-wide var if that is what your solution uses.
4. Keep the connection-reference **local keys** the flow already uses, or rename their suffix to your
   prefix — the **logical names** (the bank) stay exactly as they are.

The flow definitions here use **embedded** connections and carry no `[REPLACE]`/placeholder values.
Note: running `node ..\tools\flow-lint\lint.mjs ".\"` from here also cross-checks the *starter's* own
`Other/Solution.xml` + `Customizations.xml`, which still contain template placeholders until the
solution is initialized — so expect `xml-no-placeholders` / `workflow-json-matches-customizations`
errors from those template files, not from the example flows themselves.
