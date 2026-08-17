# Example Flows — Reference Only (NOT deployed)

Worked flows showing the conventions in `../README.md` and `../FLOW_SNIPPETS.md` applied end to end.
Read them; copy the *patterns* into your own flows under `../Workflows/`.

> **Dataverse is the data platform** — root `CLAUDE.md` → **Critical Rule 6**. The examples in *this*
> folder read and write Dataverse, because that is what a new solution does. SharePoint is a legacy
> interoperability path for data that already lives in a list and cannot move; those examples are in
> [`legacy-sharepoint/`](legacy-sharepoint/README.md), kept because they teach patterns nothing else
> demonstrates, and labelled so nobody copies the storage choice along with the pattern.

> **They are never deployed by this starter.** `deploy.ps1` only packs `../Workflows/*.json`. Nothing
> in this folder is zipped or imported. Leave it as-is, or delete it once you no longer need it.

## Provenance — which of these has actually run

This matters more than it sounds, because people copy examples verbatim.

| File | Provenance |
|---|---|
| `smkb_sol_GetBankList-*` | **Harvested.** A genericized copy of a flow that ran in production. It touches no data store at all, so it needed no conversion. |
| `smkb_sol_ListMyLoanRequests-*` · `smkb_sol_CreateLoanRequest-*` | **Derived, never run.** Structurally converted from the SharePoint originals now in `legacy-sharepoint/`: every proven part is unchanged — the `Main_Flow` / `Handle_Flow_Error` scaffold, the HTTP-200 response contract, the auth-token validation order, the terminate-succeeded business-error pattern — and only the data actions were rewritten for Dataverse, against the shapes the Component Library's OTP templates already use. They pass the security subset of flow-lint. They have **not** been imported into an environment. Treat the *patterns* as reference and the *field names* as illustration. |

Converting rather than authoring from scratch was deliberate: 300 lines of hand-written flow JSON is a
lot of surface for a subtle mistake, and a subtly-wrong Dataverse example would be worse than the
right-but-legacy SharePoint one it replaced.

## What was genericized, and what was not

An earlier version of this folder shipped the source flows **verbatim**, which meant a starter kit — and
therefore every repository cloned from it — carried another solution's tenant SharePoint host as a
committed `defaultValue`, its no-reply sender address, ~59 real Dataverse and SharePoint record GUIDs,
and secret env-var names naming a specific vendor. None of it was a credential, and none of it was ever
deployed, but it is exactly what an external security review raises, and a template is the worst place
to keep it. So:

**Replaced** — the solution schema prefix (now the `sol` placeholder), local connection keys, the tenant
SharePoint host (now an empty default), every real GUID (now `e0000000-…` placeholders, consistently
mapped so internal cross-references still line up), vendor-named secret variables, and the solution's
name in prose.

> **Correction:** this note used to list "the sender address" as replaced. It was not, and it should not
> be. `noreply@smkb.ac.il` is the **mandated org-wide sender** — the main
> [README](../README.md) says to always set `emailMessage/From` to it, and the shipped
> `Workflows/` skeletons carry it too. It belongs in the "deliberately kept" list below, alongside the
> connection-reference names, not in the scrub list. An audit that flags it is reading an org
> convention as a leak.

**Deliberately kept:**

- **The sender address** `noreply@smkb.ac.il` — the org-wide no-reply mailbox every SMKB flow sends
  from (main README → "Always send emails from"). Not a leak, and not per-solution.
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
| `smkb_sol_ListMyLoanRequests-*.json` | PowerPages | Outlook, **Dataverse** | **The row-level ownership pattern, end to end.** `ListRecords` to resolve the session from the caller's token, then a second `ListRecords` whose `$filter` scopes to the owner **taken from the session row** — never from the request. Quote-doubling in `$filter`, `$orderby`, and a `$top` cap. Snippets 12 + 15. This is the one to read first. |
| `smkb_sol_CreateLoanRequest-*.json` | PowerPages | Outlook, **Dataverse** | **`CreateRecord` with `item/` fields** (Snippet 3), and the **`@odata.bind` lookup write** (Snippet 3a) - the one syntax you cannot guess. The owner is a lookup bound to a record path, with its GUID read back from the session as `_..._value`; status is set server-side. A create is where ownership is easiest to get wrong, because there is no existing row to check against. |

For the patterns these do not cover — `UpdateRecord`, `DeleteRecord`, the Approvals connector, file
attachments, the PowerAppV2 trigger, Key Vault secret reads, Turnstile — see:

- **`UpdateRecord` / `DeleteRecord` on Dataverse**: the Component Library's OTP flow templates
  (`../../SMKB - Component Library/OTP Auth Screen/flow-templates/`) are pure Dataverse and are the
  hardened, externally-audited versions. `RevokeSession-TEMPLATE.json` is the smallest `UpdateRecord`.
- **Secret / Key Vault reads, Turnstile, outbound SMS**: `CreateOtp-TEMPLATE.json`, same folder.
- **Approvals, attachments, the PowerAppV2 trigger**: [`legacy-sharepoint/`](legacy-sharepoint/README.md).
  The connector and trigger mechanics there are correct and platform-independent — only the data
  actions are legacy.

## How to use one

1. Open the file and find the pattern you need (cross-reference the table above with `../FLOW_SNIPPETS.md`).
2. Copy the relevant action block into your own flow under `../Workflows/`.
3. Swap the env-var params for your solution's (`smkb_<prefix>_EnvironmentName`, etc. — see the main
   README's env-var section), or keep a shared org-wide var if that is what your solution uses.
4. Keep the connection-reference **local keys** the flow already uses, or rename their suffix to your
   prefix — the **logical names** (the bank) stay exactly as they are. For a Dataverse flow that means
   `msdyn_Dataverse`; you should not need the SharePoint reference at all unless Critical Rule 6's
   legacy carve-out applies, in which case declare it in `SOLUTION-SPEC.md` §7 first.

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
