# Spike Findings — Dataverse File Columns

**Run:** 2026-08-30, SMKB-Apps-Dev (`org229c958d`, env `63329b6f-93c0-ea79-a29e-3a46daca7653`)
**Purpose:** de-risk `D-02` (evidence stored in Dataverse File Columns, not SharePoint) before
Phase 7 authors 17 tables and ~33 flows around it.
**Verdict:** ✅ **D-02 is viable. The Phase 7 ALM gate is green.** One architectural decision
remains open — see [§4](#4-open-decision--upload-transport).

Every finding below was verified by query against the live environment. `pac` returns exit 0 on
failed imports and the portal reports success on partial ones, so no green banner was treated as
evidence.

---

## 1. Bottom line for whoever picks this up

| Question the spike existed to answer | Answer |
|---|---|
| Can a File Column be defined in solution XML? | ✅ Yes — canonical snippet in [§3](#3-the-canonical-xml) |
| Does it survive `pac solution pack` / import / export? | ✅ Yes, losslessly |
| Can XML **create** a File Column from scratch on import? | ✅ Yes — this was the gating question |
| Does D-06's 4 MB per-file limit hold? | ✅ Enforced, inclusive, rejects cleanly |
| Does D-13 retention work (purge evidence, keep record)? | ✅ Yes — both mechanisms verified |
| Are uploads virus-scanned? | ❌ **No.** Extension filtering only. See [§5](#5-open-items) |
| What transport should uploads use? | ⚠️ **OPEN — [§4](#4-open-decision--upload-transport)** |

**The spike paid for itself.** Four things would have been wrong in the 17 tables had they been
authored from documentation: `<MaxSizeInKB>` instead of `<MaxValue>`, a hand-authored `_Name`
column, a hand-authored `FileAttachment` relationship, and a create-with-file flow that would have
silently stored nothing.

---

## 2. Confirmed facts

### 2.1 Schema and XML

| # | Fact | Evidence |
|---|---|---|
| F1 | Solution XML type is **`<Type>file</Type>`** | Exported `Entity.xml` |
| F2 | Size element is **`<MaxValue>4096</MaxValue>`**, NOT `<MaxSizeInKB>`. Units are KB. | Exported `Entity.xml`; `MaxSizeInKB` is the *Web API* property name only |
| F3 | Web API reports **`AttributeType: "Virtual"`**, not `"File"` | `EntityDefinitions(...)/Attributes` |
| F4 | File attribute type GUID: **`00000000-0000-0000-00aa-11000000003d`** | `attribute` table |
| F5 | `ValidForCreateApi=0` and `ValidForUpdateApi=0` | Exported `Entity.xml` |
| F6 | A **`<column>_Name`** String column is auto-created, read-only (`IsValidForCreate/Update=false`) | Metadata query |
| F7 | `_Name` **never serialises** into solution XML | `grep` across the whole unpacked solution: zero matches |
| F8 | A **`FileAttachment_<table>_<column>`** relationship is auto-created, `IsCustomizable=0` | `Other/Relationships/FileAttachment.xml` |
| F9 | That relationship carries **`CascadeDelete=RemoveLink`** — which is *misleading*, see F16 | Relationship metadata |
| F10 | Rule 3 naming holds exactly: `smkb_cex_SpikeEvidence` → logical `smkb_cex_spikeevidence`, PK `…id`, set `…s` | `EntityDefinitions` |
| F11 | `pac solution pack`/`unpack` round-trips File Columns **losslessly** | `diff -r` on unpack→pack→unpack: identical |
| F12 | XML import **creates** a File Column that did not exist | `smkb_cex_EvidenceFile2` authored by hand, appeared after import |
| F13 | `<MaxValue>` is **read** on import, not merely tolerated | Authored 2048, read back `MaxSizeInKB=2048` (≠ 4096, ≠ default 32768) |
| F14 | Import is a **non-destructive upsert** — existing File Columns keep their MetadataId | `14d94bd3-…` unchanged across import; stored files would survive a redeploy |
| F15 | Same-version (`1.0.0.0`) re-import over an unmanaged solution is accepted | Portal import succeeded |

### 2.2 Runtime behaviour

| # | Fact | Evidence |
|---|---|---|
| F16 | **Deleting the parent row DELETES the blob.** No orphaning, despite F9's `RemoveLink`. | Captured `fileattachmentid` `59dcc411-…`, deleted parent row, re-queried by id → **GONE**. Untouched control row still present. |
| F17 | **Deleting the file alone clears `_Name` and removes the `fileattachment` row; the parent row survives.** | `DELETE …/smkb_cex_evidencefile` → 204, `_name` → `null`, blob gone |
| F18 | Size limit is **inclusive** and rejects **cleanly** | 4,194,304 B (exactly 4096 KiB) → 204 stored at full size. 4,300,800 B → **400** `0x80044a02 "Attachment file size is too big."` |
| F19 | **No silent truncation, no partial state on failure** | Failed uploads left `_name=null` and created no `fileattachment` row |
| F20 | **`organization.blockedattachments` DOES govern File Columns** | Identical bytes: `evidence.exe` → **400** `0x80043e09`; `evidence-control.pdf` → **204** |
| F21 | PDF / JPEG / PNG are not on the blocklist | Full blocklist read from `organization`; D-06's formats permitted |
| F22 | Upload is **two operations** — create row, then `PATCH …/<column>` with `Content-Type: application/octet-stream` and `x-ms-file-name` | Follows from F5; verified working |
| F23 | `_Name` is populated from the **`x-ms-file-name`** header | `_name = "evidence-u1.pdf"` |
| F24 | Download is **byte-lossless** | `GET …/<column>/$value` → 200; sha256 identical to source |
| F25 | Download returns the filename in a **CORS-exposed** header | `x-ms-file-name` + `Access-Control-Expose-Headers: x-ms-file-name`, plus `X-Content-Type-Options: nosniff` |
| F26 | Hebrew filenames store and retrieve intact | Pre-existing `fileattachment` rows with Hebrew names, retrieved unmangled |
| F27 | Portal: **File** is available in the column editor of an **existing** table; it is absent only from the **new-table canvas designer** | Confirmed by hand in the maker portal |
| F28 | Creating a File Column provisions **no** storage until a file is uploaded | `fileattachment` count attributable to the column stayed 0 |

### 2.3 Environment facts (2026-08-30 — re-verify, these drift)

- **115** File-type columns exist environment-wide; **zero** carried an `smkb_` prefix.
  **No SMKB solution had ever used a File Column before this spike.**
- `fileattachment`: ~32,570 rows / ~1.20 GB, **~97% platform-internal** (Web Resources, Solution
  artefacts, Site Components). Not headroom — overhead.
- `organization.maxuploadfilesize` = 5,242,880 B (5 MiB). **This governs `annotation`, not File
  Columns** — proven, since `solution.fileid` holds a 36.9 MB file and has `MaxSizeInKB=128000`.
- **SMKB-Apps-Dev has concurrent activity from other developers.** Global `fileattachment` counts
  drift during a session. Always filter by `regardingfieldname`; never assert on a global total.

---

## 3. The canonical XML

Platform-emitted, not hand-written. Copy this shape for each evidence column.

```xml
<attribute PhysicalName="smkb_cex_EvidenceFile">
  <Type>file</Type>
  <Name>smkb_cex_evidencefile</Name>
  <LogicalName>smkb_cex_evidencefile</LogicalName>
  <RequiredLevel>none</RequiredLevel>
  <DisplayMask>ValidForForm|ValidForGrid</DisplayMask>
  <ImeMode>disabled</ImeMode>
  <ValidForUpdateApi>0</ValidForUpdateApi>
  <ValidForReadApi>1</ValidForReadApi>
  <ValidForCreateApi>0</ValidForCreateApi>
  <IsCustomField>1</IsCustomField>
  <IsAuditEnabled>1</IsAuditEnabled>
  <IsSecured>0</IsSecured>
  <IntroducedVersion>1.0.0.0</IntroducedVersion>
  <IsCustomizable>1</IsCustomizable>
  <IsRenameable>1</IsRenameable>
  <CanModifySearchSettings>0</CanModifySearchSettings>
  <CanModifyRequirementLevelSettings>0</CanModifyRequirementLevelSettings>
  <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
  <SourceType>0</SourceType>
  <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
  <IsSortableEnabled>0</IsSortableEnabled>
  <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
  <CanModifyIsSortableSettings>0</CanModifyIsSortableSettings>
  <IsDataSourceSecret>0</IsDataSourceSecret>
  <AutoNumberFormat></AutoNumberFormat>
  <IsSearchable>0</IsSearchable>
  <IsFilterable>0</IsFilterable>
  <IsRetrievable>0</IsRetrievable>
  <IsLocalizable>0</IsLocalizable>
  <MaxValue>4096</MaxValue>
  <displaynames>
    <displayname description="CEX - Evidence File" languagecode="1033" />
  </displaynames>
</attribute>
```

### Authoring rules for the 17 tables

1. **Declare only the File column.** Never author `<column>_Name` (F6/F7) or the
   `FileAttachment_*` relationship (F8) — the platform owns both.
2. **`<MaxValue>` in KB.** `4096` = 4 MiB = D-06's ceiling.
3. **Identify File columns** by `<Type>file</Type>` in XML, `@odata.type = FileAttributeMetadata`
   in the Web API (**never** `AttributeType eq 'File'` — F3), or
   `attributetypeid = 00000000-0000-0000-00aa-11000000003d` in FetchXML.
4. ⚠️ **The first export after deploying will show a diff you did not author** — one
   `FileAttachment_*` relationship entry per File column, in
   `Other/Relationships/FileAttachment.xml` and `Other/Relationships.xml`. **This is benign.**
   Do not unpick it.
5. **A file cannot be written by `CreateRecord`** (F5). Any flow must create the row, then upload
   separately, or it will silently store nothing.

---

## 4. OPEN DECISION — upload transport

**Status: UNRESOLVED. Must be decided before Phase 7 authoring begins.**
Deliberately not decided by this spike.

> **Transport for evidence upload — Power Automate flow (base64, current §2a) vs direct Web API
> PATCH from Power Pages (raw binary, discovered in S4)**

The spike design assumed uploads route through a cloud flow receiving base64, and flagged the
payload ceiling (5 × 4 MB ≈ 27 MB after ~33% base64 inflation) as the main risk. S4 then
established that a **direct Web API `PATCH` uploads raw binary with no base64 at all**, which
removes that ceiling rather than testing it.

| | Flow + base64 (original §2a) | Direct Web API (§2b) |
|---|---|---|
| Payload for 5×4 MB | ~27 MB (+33% inflation) | **20 MB, no inflation** |
| T-PAYLOAD relevant? | Yes — untested, the feared ceiling | **No — bypassed entirely** |
| Kit contract | ✅ flows-only default | ❌ needs `Webapi/<table>/enabled` + table permissions |
| Security surface | Existing | New — own review |
| Authorization model | Flow runs as service account → **must be explicit in-flow** | Row-level security applies natively |
| Download filename | Flow must return it | ✅ CORS-exposed header, browser-readable |

**Additional context for whoever decides:**

- The kit already ships a hardened browser-side base64 encoder,
  `Power Pages Code Site/src/utils/fileUtils.ts` → `buildNamedFilePayload`. It is **tested but
  orphaned** — no UI or flow consumer. It only has value under the flow option.
- The only worked file-write example in the kit is
  `Cloud Flows/examples/legacy-sharepoint/smkb_sol_UpdateBankAccount`, which uses
  `base64ToBinary(...)` into SharePoint `CreateAttachment`. It is a **legacy SharePoint** pattern
  (Critical Rule 6), not a Dataverse one.
- Under the flow option, the service-account identity means **Dataverse row-level security does not
  protect one student's evidence from another's request.** Authorization must be explicit in the
  flow, and tested.
- **`T-PAYLOAD` was never tested** and is only binding under the flow option.

---

## 5. Open items

| ID | Item | Status |
|---|---|---|
| **T-PAYLOAD** | Base64 ceiling: 5 × 4 MB ≈ 27 MB through a Power Automate trigger | 🔴 **Untested.** Only binding if the flow transport is chosen ([§4](#4-open-decision--upload-transport)). Test against a real flow in Phase 7, not a synthetic one. |
| **T5 — malware scanning** | Dataverse File Columns are **not** content-scanned. SharePoint Online is. | 🔴 **Unresolved.** F20 gives *extension* filtering only — real, but **not** content scanning. Untrusted student uploads on a public portal. Needs Defender-portal admin access to confirm tenant posture. **Belongs in `SECURITY-BASELINE.md` regardless of outcome.** |
| **Tenant File capacity** | How much File capacity is licensed / remaining | 🔴 **Unknown.** Not exposed by `pac`; needs Power Platform Admin Center → Resources → Capacity. Marginal cost is `20 MB × applications/year` at D-06's ceiling — ~10 GB/yr at 500 applications. Volume assumption still needed from `SOLUTION-SPEC.md`. |
| **Field-level security** | Whether FLS applies to File Columns | 🟡 **Untested.** Relevant if reviewers and admins need different visibility. |
| **Auditing** | `IsAuditEnabled=1` by default — what an audit entry records for a file change | 🟡 **Untested.** Note it defaults **on**, unlike the starter's `nvarchar` example. |
| **Solution Checker** | Import produced a Solution Checker link; it was not opened | 🟡 **Not reviewed.** |
| ~~T-ORPHAN~~ | Blob orphaning on parent delete | ✅ **Closed — no orphaning (F16).** D-13 can rely on row deletion. |
| ~~T-NAMECLEAR~~ | Filename residue after file purge | ✅ **Closed — no residue (F17).** |
| ~~T-EXTENSION~~ | Whether the blocklist reaches File Columns | ✅ **Closed — it does (F20).** |
| ~~ALM round-trip~~ | Whether XML survives pack/import/export | ✅ **Closed (F11–F15).** |

---

## 6. What was built, and proof it is gone

Built: solution `SMKBCexSpike`; table `smkb_cex_SpikeEvidence`; File columns
`smkb_cex_EvidenceFile` (4096 KB) and `smkb_cex_EvidenceFile2` (2048 KB, XML-authored); 5 test
rows; 3 uploaded files.

Torn down in order — rows → files → columns → table → container — each step verified:

```
rows in smkb_cex_spikeevidence                     -> 0
fileattachment where regardingfieldname smkb_cex_% -> 0 (no residue)
attribute where name like smkb_cex_evidencefile%   -> No results  (both _Name companions auto-removed)
FileAttachment relationships on the table          -> 0           (both auto-removed)
entity where logicalname like smkb_cex_%           -> No results
solutioncomponent for SMKBCexSpike                 -> No results
pac solution list                                  -> SMKBCexSpike absent; other 9 solutions
                                                      present at unchanged versions
```

**Neither `_Name` companions nor `FileAttachment` relationships needed explicit deletion** — both
vanish with their parent column. Recorded because the teardown plan assumed they might not.

The environment is back to its pre-spike state. No other solution was read, modified, or listed
beyond the `pac solution list` inventory used to prove non-interference.

---

## 7. Method notes

- **Do not hand-author File Column XML.** The canonical snippet in [§3](#3-the-canonical-xml) was
  obtained by creating the column, exporting, and unpacking — the platform emits its own
  serialisation. `<MaxValue>` vs `<MaxSizeInKB>` (F2) is exactly the error that method prevents.
- The table and columns were created via **Web API metadata POST**, not the portal — the new-table
  canvas designer does not expose the File type (F27). This does **not** violate the
  "let the platform emit the XML" principle: Dataverse still generates the solution XML at export.
- ⚠️ **Deliberate deviation from the agreed plan: teardown used Web API `DELETE`, not the portal.**
  The S6 plan specified manual portal deletion on the belief that `pac` has no delete verb for
  rows, columns or tables — which is true, but the **Web API does**, and that only became apparent
  once the Web API channel was established mid-spike to work around the portal's missing File data
  type (F27). The deviation was taken because it is **strictly safer**, not merely faster: the
  portal path's single worst hazard is choosing "**Remove from this solution**" instead of
  "**Delete**", which silently orphans the table into `Default` — the exact failure the wider
  cleanup doctrine exists to prevent. The Web API has no such ambiguous verb. Every step was
  verified by query afterwards (see [§6](#6-what-was-built-and-proof-it-is-gone)).
  **If you repeat this teardown, prefer the API for the same reason.**
- **Never assert on a global `fileattachment` count** — other developers write to this environment
  during a session. Filter by `regardingfieldname`.

## 8. Artefacts

Scratchpad only; nothing but this file entered the repo.

```
scratchpad/s2/   first export + unpacked canonical XML
scratchpad/s3/   post-import re-export + roundtrip.diff
scratchpad/s4/   test files, upload/download outputs, row ids
scratchpad/spike-working-notes.md
```

Working notes are session-scoped and will not survive. **This file is the durable record.**
