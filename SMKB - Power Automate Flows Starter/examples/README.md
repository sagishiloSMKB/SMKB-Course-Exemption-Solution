# Example Flows — Reference Only (NOT deployed)

These are **structurally faithful, genericized** copies of working flows from a live SMKB solution. They
exist so you can see the conventions in `../README.md` and `../FLOW_SNIPPETS.md` applied end to end.
Read them; copy the *patterns* into your own flows under `../Workflows/`.

> **They are never deployed by this starter.** `deploy.ps1` only packs `../Workflows/*.json`. Nothing
> in this folder is zipped or imported. Leave it as-is, or delete it once you no longer need it.

## What was genericized, and what was not

An earlier version of this folder shipped the source flows **verbatim**, which meant a starter kit — and
therefore every repository cloned from it — carried another solution's tenant SharePoint host as a
committed `defaultValue`, its no-reply sender address, ~59 real Dataverse and SharePoint record GUIDs,
and secret env-var names naming a specific vendor. None of it was a credential, and none of it was ever
deployed, but it is exactly what an external security review raises, and a template is the worst place
to keep it. So:

**Replaced** — the solution schema prefix (now the `sol` placeholder), local connection keys, the tenant
SharePoint host (now an empty default), the sender address, every real GUID (now `e0000000-…`
placeholders, consistently mapped so internal cross-references still line up), vendor-named secret
variables, and the solution's name in prose.

**Deliberately kept:**

- **The connection-reference logical names** — `msdyn_Dataverse`, `new_sharedoffice365_c3167`,
  `smkb_SMKBApprovals`, `smkb_SMKBSharePointConnectionUser1`. These are environment-level and
  **intentionally shared** across SMKB solutions (root `CLAUDE.md` → Connection References); the main
  README publishes them as the SMKB bank. They are the one thing here you *should* copy verbatim.
- **Public vendor endpoints** — the Cloudflare `siteverify` URL, the Logic Apps schema URL, the
  open-data API. Not secrets, and the patterns are unreadable without them.
- **Domain nouns** — voucher, lecturer, bank account. Not sensitive, not something a review would
  raise, and a reference flow needs a concrete domain to be comprehensible. Stripping them produced
  `Create_Record_Record` on the first attempt — the bulk-replace hazard root `CLAUDE.md` warns about.

> **The GUIDs are placeholders now, so do not treat them as real.** Every flow record gets its own
> `workflowid`; generate a fresh one (or let the portal assign it) rather than copying one from here.
> The naming here is the kit's convention form (`smkb_<prefix>_<PascalName>`), not a byte-for-byte copy
> of production — copy the **patterns**, not the names.

Every one of these uses the **connection-reference bank** with `runtimeSource: "embedded"` — the same
logical names documented in the main README:
`new_sharedoffice365_c3167`, `smkb_SMKBSharePointConnectionUser1`, `msdyn_Dataverse`, `smkb_SMKBApprovals`.

## Index — what each one demonstrates

| File | Trigger | Connectors (bank) | Patterns to learn |
|---|---|---|---|
| `smkb_sol_GetBankList-*.json` | PowerPages | Outlook | **Simplest full flow.** External `Http` GET → `ParseJson` → `Select`/`Query` whitelist + cap → 200 payload. Public (no auth). `Main_Flow` + `Handle_Flow_Error`. Snippet 8. |
| `smkb_sol_GetVoucherList-*.json` | PowerPages | Outlook, SharePoint | SharePoint `GetItems` list read; **authToken → sessionToken** validation before returning data (flow-lint `authenticated-flow-validates-token`). |
| `smkb_sol_CreateVoucherRecord-*.json` | PowerPages | Outlook, SharePoint | Record **creation** with `item/` fields (Snippet 3); authToken validation. |
| `smkb_sol_CheckOtp-*.json` | PowerPages | Outlook, SharePoint | Session-token validation, SharePoint `PatchItem`, **clearing fields with `"@null"`** (Pitfall 10), business-error `200` + `errorCode` vocabulary (Snippet 8). |
| `smkb_sol_UpdateBankAccount-*.json` | PowerPages | Outlook, SharePoint, **Approvals** | Approvals connector as an **`embedded`** connection (Pitfalls 9d/9g — invoker → recurring 403), SharePoint patch, authToken validation. |
| `smkb_sol_CreateOtp-*.json` | PowerPages | Outlook, SharePoint, **Dataverse** | **Secret / Azure Key Vault env vars** via `RetrieveEnvironmentVariableSecretValue` (Snippet 11), outbound SMS `Http` with **`encodeUriComponent`** on client input (flow-lint `http-uri-encodes-client-input`), Turnstile gate on a non-secret key. The richest example. |
| `smkb_sol_ManagerGetLecturers-*.json` | **PowerAppV2** | Outlook, SharePoint | The **Code App** trigger path (Snippet 6) — internal/staff flow wired via `pnpm pa add-flow`, not Power Pages Studio. |

## How to use one

1. Open the file and find the pattern you need (cross-reference the table above with `../FLOW_SNIPPETS.md`).
2. Copy the relevant action block into your own flow under `../Workflows/`.
3. Swap the env-var params for your solution's (`smkb_<prefix>_EnvironmentName`, etc. — see the main
   README's env-var section), or keep a shared org-wide var if that is what your solution uses.
4. Keep the connection-reference **local keys** the flow already uses, or rename their suffix to your
   prefix — the **logical names** (the bank) stay exactly as they are.

## Why this folder is not in the lint gate

`deploy.ps1` runs flow-lint over `../Workflows/` only, and that is deliberate. Genericizing these files
*put placeholder tokens into them* — `smkb_sol_` and `[REPLACE-…]` are exactly what makes them reusable —
so `no-placeholders` and `xml-no-placeholders` fire here **by design**. Forcing the folder clean would
mean either un-genericizing it or exempting the rules, and both are worse than leaving it out.

What *is* meaningful here is the security subset, and it is clean:
`securedata-only-on-connector-actions`, `keyvault-secret-read-is-secured`,
`http-uri-encodes-client-input`, `authenticated-flow-validates-token` and `no-unused-trigger-inputs` all
report zero findings. The last one found three dead trigger inputs on the first run — `academicDegree`,
`fileMimeType` and a `voucherId` that no action ever read — and they have been removed, because a
reference flow should not demonstrate the hygiene problem an audit flagged.

To check them yourself:

```
node ..\tools\flow-lint\lint.mjs ".\"
```

Expect placeholder errors, and read past them. Note this also cross-checks the *starter's* own
`Other/Solution.xml` + `Customizations.xml`, which hold template placeholders until the solution is
initialized — so most of the output is about those files, not these flows.
