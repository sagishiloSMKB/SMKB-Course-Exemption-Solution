# Legacy SharePoint-backed reference flows

> **Do not copy the storage choice from these. Copy the patterns.**
>
> **Dataverse is the data platform** — root `CLAUDE.md` → **Critical Rule 6**. SharePoint is a legacy
> interoperability path, used only when the data **already lives** in a list and cannot be moved: a list
> another department owns, or a system of record that predates the solution. When that is genuinely the
> case, declare it in [`SOLUTION-SPEC.md`](../../../SOLUTION-SPEC.md) **§7 External systems**, naming the
> list and why the data cannot move. Until that declaration exists, flow-lint's `sharepoint-data-action`
> rule warns on every SharePoint action.

## Why these are here rather than deleted

They are **harvested** — structurally faithful, genericized copies of flows that ran in production. That
makes them the most trustworthy material in the kit for everything *except* the data platform, and
several of them are the only demonstration of a pattern anywhere:

| File | Trigger | Still the best reference for |
|---|---|---|
| `smkb_sol_UpdateBankAccount-*.json` | PowerPages | The **Approvals** connector as an `embedded` connection (Pitfalls 9d/9g — an `invoker` connection causes a recurring 403), and file **attachments**. Nothing else in the kit shows either. |
| `smkb_sol_ManagerGetLecturers-*.json` | **PowerAppV2** | The **Code App trigger path** (Snippet 6) — a staff flow wired through `pnpm pa add-flow` rather than Power Pages Studio. The only PowerAppV2 example. |
| `smkb_sol_GetVoucherList-*.json` | PowerPages | The original of `../smkb_sol_ListMyLoanRequests-*.json`. Read them side by side to see exactly what changes between platforms and what does not. |
| `smkb_sol_CreateVoucherRecord-*.json` | PowerPages | The original of `../smkb_sol_CreateLoanRequest-*.json`. Same. |

## Two files here are superseded, not just legacy

`smkb_sol_CheckOtp-*.json` and `smkb_sol_CreateOtp-*.json` are the **SharePoint-era** versions of flows
the kit has since rewritten properly. Use the Component Library instead:

```
..\..\..\SMKB - Component Library\OTP Auth Screen\flow-templates\
```

Those templates are pure Dataverse, they are what the OTP recipe documents, and they carry the hardening
an external security audit produced — anti-enumeration, the per-address rate limit, the global cap, the
abuse alert, the Turnstile fail-closed gate, Secure I/O on the secret read. The copies here contradict the
recipe they were supposed to illustrate: the recipe says "create a Dataverse OTP record" and these call
SharePoint `PatchItem`. They are kept only so the diff is visible and so nobody reintroduces the older
shape thinking it is the current one.

**If you are building phone-OTP auth, do not start here.** Start at
`SMKB - Component Library\OTP Auth Screen\RECIPE.md`.

## How the platform conversion actually went

For the two flows that have Dataverse successors, this is the whole of what changed — useful if you ever
have to do the same to a legacy solution:

| SharePoint | Dataverse |
|---|---|
| `GetItems` | `ListRecords` — `entityName` (the **plural logical** name), `$filter`, `$orderby`, `$top` |
| `PostItem` | `CreateRecord` — `entityName` plus `item/<field>` per column |
| `PatchItem` | `UpdateRecord` — `entityName`, `recordId`, and `item/<field>` per column changed |
| `dataset` (the site URL) + `table` (the list id) | `entityName` alone. The SharePoint site URL env var has no Dataverse equivalent and was deleted. |
| connection reference `smkb_SMKBSharePointConnectionUser1` | `msdyn_Dataverse` |

Everything else was untouched: the `Main_Flow` / `Handle_Flow_Error` scaffold, every `Response` returning
HTTP 200 with an `errorCode` body, the auth-token validation order, `Terminate(Succeeded)` on business
errors, the env-var parameters, the `Select` projections.

One thing that is **not** a mechanical swap, and the reason the conversion needs a human: the quote
escaping in a `$filter`. A caller-supplied value interpolated into an OData filter must have its single
quotes doubled — `replace(triggerBody()?['text'], '''', '''''')` — or a quote in the input breaks the
query. See `FLOW_SNIPPETS.md` §15 step 4.

## These will warn under flow-lint, and that is correct

Running the full lint over this folder reports `sharepoint-data-action` on every data action, plus the
usual placeholder errors that the parent folder's README explains. Both are by design: the placeholder
tokens are what make the flows reusable, and the SharePoint warning is the rule doing its job on files
that genuinely use the legacy path without a `SOLUTION-SPEC.md` §7 declaration.
