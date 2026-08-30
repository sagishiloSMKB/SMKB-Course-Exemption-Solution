# Phase 7.1 — Dataverse Tables Authoring Plan

**Status: PLAN ONLY. No `Entity.xml` authored, nothing written to Dataverse.**
Source: [`SOLUTION-SPEC.md`](SOLUTION-SPEC.md) §3, cross-checked against [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md).
Naming and File-column mechanics verified in [`SPIKE-FINDINGS.md`](SPIKE-FINDINGS.md).

**18 tables** — the 17 from §3, plus `EvidenceAccessLog` added by decision **G-3** below.
All `smkb_cex_<PascalName>` / `CEX - <Name>` / **`UserOwned`** / primary name `smkb_name`
— stated once here rather than repeated per table; **exceptions are called out explicitly.**
(`EvidenceAccessLog` is the one ownership exception: **Organization**.)

> **All six open questions in this plan were decided on 2026-08-30.** Each is marked
> **✅ DECIDED** where it appears. §6 lists what remains.

---

## 1. Authoring order — six waves

Derived from lookup direction. A table may only be authored once every table it points at exists.

| Wave | Tables | Depends on |
|---|---|---|
| **1** | `Candidate` · `Programme` · `CertificateType` · `OtpRequest` | nothing (system tables only) |
| **2** | `Session` · `Requirement` · `RuleSet` | Candidate, Programme |
| **3** | `Application` · `Rule` | Candidate, Programme, RuleSet, Requirement |
| **4** | `PriorStudy` · `PriorCertificate` · `Evidence` · `Certificate` · `Reopening` | Application, CertificateType, Candidate |
| **5** | `Suggestion` · **`EvidenceAccessLog`** | Application, Requirement, PriorStudy, PriorCertificate, **Evidence** |
| **6** | `DecisionHistory` · `RuleFiring` | Suggestion, Rule |

```
Candidate ──┬─► Session
            ├─► Application ──┬─► PriorStudy ──────┐
            └─► Certificate   ├─► PriorCertificate ┼─► Suggestion ─┬─► DecisionHistory
                    ▲         ├─► Evidence ────────┤               └─► RuleFiring
                    │         │        └──────────►│ EvidenceAccessLog    ▲
                    │         ├─► Certificate      │                      │
                    │         └─► Reopening        │                      │
Programme ──┬─► Requirement ──────────────────────┘                      │
            └─► RuleSet ──► Rule ─────────────────────────────────────────┘
CertificateType ──► PriorCertificate          OtpRequest (no parent — G-1 ✅ confirmed)
```

⚠️ **`Application → RuleSet` forces the rules-engine tables earlier than their group order suggests.**
`smkb_cex_RuleSetId` is a lookup on `Application`, so `RuleSet` must exist by Wave 2 — even though
§3 warns its schema must not be frozen before D-04 stage ב. **G-4 ✅ decided: Wave 2 as planned**,
with `RuleSet` reduced to a stable core so `Rule` can still evolve.

---

## 2. The 17 tables

### Group A — Portal identity

#### 1. `smkb_cex_Candidate` — `CEX - Candidate` / מועמד/ת
Portal identity, created at first sign-in before any institutional relationship exists.

| Column | Type | Purpose |
|---|---|---|
| `smkb_name` | nvarchar(100) | Full name — primary name |
| `smkb_cex_Email` | nvarchar(200) | Identity key, OTP channel |
| `smkb_cex_NationalId` | nvarchar(20) | Required on the certificate (§12.2) |
| `smkb_cex_Status` | picklist | `Active` / `Archived` — Archived blocks sign-in |

**Relationships:** 1:N → `Application`, `Session`, `Certificate`.
**⚠️ NOT a parent of `OtpRequest`** — §3's Candidate entry lists it, but `OtpRequest` carries only an
email and no lookup. **G-1 ✅ decided: the §3 relationship line is the error; `OtpRequest` stays
parentless.** `SOLUTION-SPEC.md` should be corrected when that section is next touched.
**Quirks:** own table, not `contact` — resolved `O-1`; the college has no student CRM.
Personal data: name, email, national ID.

#### 2. `smkb_cex_Session` — `CEX - Session` / הפעלה
The server-issued `authToken`. **The single source of truth for actor identity.**

| Column | Type | Purpose |
|---|---|---|
| `smkb_cex_Token` | nvarchar(200) | The token itself |
| `smkb_cex_CandidateId` | lookup → Candidate | Owner |
| `smkb_cex_ExpiresOn` | datetime | TTL one hour |
| `smkb_cex_RevokedOn` | datetime | Explicit revocation |

**Quirks — 🔒 the control that gets skipped:** restricted to the flow service account, and
`Token` must be **out of views, search and export** (`SECURITY-BASELINE.md`). Ownership stays
`UserOwned`; the restriction is a security-role + column-security concern, not an ownership one.

#### 3. `smkb_cex_OtpRequest` — `CEX - OTP Request` / בקשת קוד

| Column | Type | Purpose |
|---|---|---|
| `smkb_cex_Email` | nvarchar | Who asked — **by email, not lookup** |
| `smkb_cex_Code` | nvarchar(10) | The code, stored as-is |
| `smkb_cex_ExpiresOn` | datetime | |
| `smkb_cex_Attempts` | int | Lockout counter |
| `smkb_cex_ConsumedOn` | datetime | Single use |

**Quirks:** the code is stored in clear — **Power Automate has no hashing expression**, a documented
platform limit, not an omission. Same service-account restriction as `Session`.
**G-1 ✅ decided: no parent, email column only.** An OTP is requested *before* identity exists, so a
`CandidateId` lookup would break first-time sign-in. Authored with no relationship to `Candidate`.

### Group B — Catalogue (reference data)

#### 4. `smkb_cex_Programme` — `CEX - Programme` / תוכנית לימודים
`smkb_name` · `smkb_cex_Code` (nvarchar 50) · `smkb_cex_Active` (bit).
One programme for the pilot — Special Education (`D-05`). No personal data, permanent retention.
**Relationships:** 1:N → `Requirement`, `Application`, `RuleSet`.

#### 5. `smkb_cex_Requirement` — `CEX - Requirement` / קורס נדרש
`smkb_name` · `smkb_cex_Code` · **`smkb_cex_Credits` (decimal)** · `smkb_description` (ntext) ·
`smkb_cex_ProgrammeId` (lookup, required) · `smkb_cex_Retired` (bit).
~30–40 rows for the pilot. **Retiring a requirement must not delete decisions made against it**
(`S-A-01`) — so `Retired` is a flag, never a delete.
**Uses `smkb_description`** — bare publisher prefix, shared-column convention (Critical Rule 5).

#### 6. `smkb_cex_CertificateType` — `CEX - Certificate Type` / סוג תעודה
`smkb_name` · `smkb_cex_IssuingBody` · `smkb_cex_Active` (bit). Feeds the "recognised type or
free-text other" control in `S-P-06`. **Relationships:** 1:N → `PriorCertificate`.

### Group C — The application

#### 7. `smkb_cex_Application` — `CEX - Application` / בקשה
The central entity. One active application per candidate–programme pair (`R-09`).

| Column | Type | Purpose |
|---|---|---|
| `smkb_name` | nvarchar | Human-readable id — *derived*; spec requires no application number |
| `smkb_cex_CandidateId` | lookup → Candidate | required |
| `smkb_cex_ProgrammeId` | lookup → Programme | required |
| `smkb_cex_Status` | picklist | `Draft` `Submitted` `InReview` `Finalised` `Declined` `Withdrawn` |
| `smkb_cex_SubmittedOn` | datetime | |
| `smkb_cex_DueOn` | **date** | Computed once at submit and **stored** (`X-2`) |
| `smkb_cex_AssignedTo` | lookup → `systemuser` | Empty = withdrawable (`R-08`) |
| `smkb_cex_AssignedOn` | datetime | Lock-expiry basis (`D-08`) |
| `smkb_cex_DeclineReason` | ntext | **Shown to the student verbatim** |
| `smkb_cex_RuleSetId` | lookup → RuleSet | Which version produced the suggestions (`S-A-03`) |
| `smkb_cex_ClosedOn` | datetime | Triggers evidence purge (`D-13`) |
| **`smkb_cex_NeedsAttentionSince`** | **datetime, nullable** | **P-1 ✅ NEW.** Set by flow when evidence is uploaded after a decision; cleared when the reviewer acts. `IsFilterable`/`IsRetrievable` so `CEX-StaffGetQueue` can sort and filter on it |

**Quirks:**
- **`NeedsAttentionSince` implements `PRODUCT_SPEC.md` R-08's "flags the application for the
  reviewer's attention".** Stored rather than derived: deriving it would mean comparing every
  `Evidence.UploadedOn` against the latest `DecisionHistory` row on every queue read, which is a
  per-row subquery in a flow that already has a lock-expiry sweep to do. A nullable timestamp also
  answers *when* attention became due, which a boolean cannot.
- **No alternate key.** `Q-13` uniqueness (Candidate + Programme + active status) is enforced in
  `CEX-PortalStartApplication` **before creation**, deliberately — an alt key at candidate level
  would contradict `R-09`.
- The two student-visible states are **derived from `AssignedTo`**, never stored. `S-P-09` carries an
  explicit `BY DESIGN` note against "fixing" this.
- Retention 8 years (`D-13`).

#### 8. `smkb_cex_PriorStudy` — `CEX - Prior Study` / לימודים קודמים
`smkb_name` (course name) · `smkb_cex_Institution` · **`smkb_cex_Grade` (nvarchar)** ·
**`smkb_cex_Credits` (decimal)** · `smkb_cex_CompletedOn` (date) · `smkb_cex_ApplicationId` (lookup).

**Quirk that shapes the whole rules engine: the grade is TEXT, not a number.** `S-P-05` requires that
an unusual foreign grading scale is never rejected by a form. Consequence: **grades cannot be compared
arithmetically**, which is why `Rule.MatchType` has no grade threshold (`D-17`).

#### 9. `smkb_cex_PriorCertificate` — `CEX - Prior Certificate` / תעודה מקצועית
`smkb_name` · `smkb_cex_CertificateTypeId` (lookup, optional) · `smkb_cex_OtherDescription` ·
`smkb_cex_IssuingBody` · `smkb_cex_IssuedOn` (date) · `smkb_cex_ApplicationId` (lookup).
**Structurally separate from `PriorStudy` on purpose** (`S-P-06`) so a certificate is never entered
as a course with no grade and judged wrongly.

#### 10. `smkb_cex_Evidence` — `CEX - Evidence` / מסמך 🗂️ **FILE COLUMN**

| Column | Type | Purpose |
|---|---|---|
| `smkb_name` | nvarchar | **Server-generated** filename |
| `smkb_cex_OriginalFileName` | nvarchar | What the student called it |
| **`smkb_cex_File`** | **File** | The document itself |
| `smkb_cex_SizeBytes` | int | |
| `smkb_cex_ContentType` | nvarchar | |
| `smkb_cex_UploadedOn` | datetime | |
| `smkb_cex_PurgeAfter` | date | `ClosedOn` + 90 (`D-13`) |
| `smkb_cex_ApplicationId` | lookup → Application | |

**File-column authoring rules — from the spike, non-negotiable:**
- Declare **only** `<Type>file</Type>` with `<MaxValue>4096</MaxValue>` (KB — **not** `<MaxSizeInKB>`)
- **Never author** `smkb_cex_File_Name` — the platform creates it
- **Never author** the `FileAttachment_*` relationship — the platform creates it
- The first post-deploy export **will** show an unauthored relationship diff. Benign.

⚠️ **Three name-ish fields coexist, and all three are intended:** `smkb_name` (server-generated),
`smkb_cex_OriginalFileName` (the student's), and the auto-created `smkb_cex_File_Name` (whatever
`x-ms-file-name` carried). Recorded so none is later "tidied away".

**Quirks:** PDF/JPEG/PNG only, 4 MB per file, 5 per upload, unlimited per application (`D-06`).
**Documents are never removed or replaced** (`R-08`) — no delete action in the UI.
The most sensitive data the system holds.

### Group D — Matches and decisions

#### 11. `smkb_cex_Suggestion` — `CEX - Suggestion` / התאמה אפשרית
A proposed pairing of requirement to prior learning, with strength and explanation.
**Never shown to the student** (`R-02`).

| Column | Type | Purpose |
|---|---|---|
| `smkb_cex_ApplicationId` / `RequirementId` | lookup | |
| `smkb_cex_PriorStudyId` / `PriorCertificateId` | lookup | **exactly one of the two** |
| `smkb_cex_Strength` | **decimal** | Reviewer-only (`§2.2`) |
| `smkb_cex_Band` | picklist | `Strong` (shown) / `NearMiss` (collapsed) — `R-03`'s two thresholds |
| `smkb_cex_Explanation` | ntext | Why this matched, in human language |
| `smkb_cex_Decision` | picklist | `Pending` / `Granted` / `Refused` |
| `smkb_cex_DecisionReason` | ntext | **Mandatory on refusal**, shown verbatim |
| `smkb_cex_DecidedBy` / `DecidedOn` | lookup → systemuser / datetime | |
| `smkb_cex_Excluded` + `ExclusionReason` + `ExclusionBy` + `ExclusionOn` | bit + ntext + lookup + datetime | `S-A-05` — exclusion never deletes |

⚠️ **The XOR between `PriorStudyId` and `PriorCertificateId` is not expressible in Dataverse.**
Both lookups are optional at schema level; the "exactly one" rule must be enforced in the scoring
plugin and in `CEX-StaffDecideSuggestion`. See **G-2**.

#### 12. `smkb_cex_DecisionHistory` — `CEX - Decision History` / היסטוריית החלטות
`smkb_cex_SuggestionId` (lookup) · `smkb_cex_Action` (picklist: `Granted` `Refused` `Undone`
`Excluded` `ExclusionReversed`) · `smkb_cex_Reason` (ntext) · `smkb_cex_ActedBy` / `ActedOn`.

**Why a table and not platform audit:** in the kit `IsAuditEnabled` is `0` at entity level while `1`
at column level — so **nothing is actually audited**. `R-06` requires that a correction never erases
what was there, and `P-6` includes an auditor reading a file a year later. Explicit rows are the
mechanism; platform audit is defence in depth.

> Note: the spike found `IsAuditEnabled=1` is the **default for File columns** — the opposite of the
> `nvarchar` example. Worth confirming during authoring rather than assuming either way.

### Group E — Rules engine (`D-04`)

> ⚠️ §3 states plainly: **this schema must not be frozen before D-04 stage ב.** Treat these three as
> provisional. See **G-4** for the conflict this creates with `Application.RuleSetId`.

#### 13. `smkb_cex_RuleSet` — `CEX - Rule Set` / גרסת כללים

**G-4 ✅ decided: Wave 2, minimal stable core.** `Application.RuleSetId` is a first-class lookup from
creation, so `RuleSet` must exist early — but only its *identity* columns need to be stable. `Rule`
and `RuleFiring` can still evolve after D-04 stage ב **without any schema change to `Application`**.

| Column | Type | Purpose |
|---|---|---|
| `smkb_name` | nvarchar | Set name — primary name |
| `smkb_cex_Version` | int | Monotonic version |
| `smkb_cex_EffectiveFrom` | datetime | When this set became the active one |

**Activation applies forward only.** Already-analysed applications keep their suggestions and record
which version produced them, so a year-old decision stays explainable (`S-A-03`).

⚠️ **Two §3 columns are deliberately deferred, and both have known consumers** — recorded so their
return is planned rather than rediscovered:
- **`smkb_cex_IsActive` (bit)** — `CEX-AdminActivateRuleSet` and "activation applies forward only"
  need a way to mark the current set. `EffectiveFrom` can carry this (latest wins), but if the flow
  wants an explicit flag it comes back.
- **`smkb_cex_ProgrammeId` (lookup)** — §3 scopes rule sets per programme, and D-05's pilot has one
  programme so nothing breaks yet. **Adding it later also re-adds a `Programme → RuleSet`
  relationship**, which is additive and safe.

`ActivatedBy` / `ActivatedOn` from §3 are subsumed by `EffectiveFrom` plus the platform's
`CreatedBy`/`CreatedOn`.

#### 14. `smkb_cex_Rule` — `CEX - Rule` / כלל התאמה
`smkb_name` · `smkb_description` (ntext — **the rule in human language**, what `S-A-02` displays) ·
`smkb_cex_RuleSetId` (lookup) · `smkb_cex_RequirementId` (lookup, empty = applies to all) ·
`smkb_cex_MatchType` (picklist: `SubjectKeyword` `CourseCode` `Institution` `CertificateType`
`Recency`) · `smkb_cex_MatchValue` (nvarchar 400) · **`smkb_cex_Strength` (decimal)** ·
`smkb_cex_Active` (bit).

**Quirk:** when several rules apply to one pairing, **only the strongest counts** — `max`, not sum.
`MatchType` deliberately has **no grade threshold**, because grades are text (`D-17`).

#### 15. `smkb_cex_RuleFiring` — `CEX - Rule Firing` / הפעלת כלל
`smkb_cex_SuggestionId` · `smkb_cex_RuleId` · **`smkb_cex_Contribution` (decimal)**.
This is what makes "why was this suggested" a real answer (`R-02`) and D-04's transparency provable.

### Group F — Outputs

#### 16. `smkb_cex_Certificate` — `CEX - Certificate` / אישור פטור 🗂️ **FILE COLUMN**
`smkb_name` · `smkb_cex_ApplicationId` (lookup) · **`smkb_cex_CandidateId` (lookup)** ·
`smkb_cex_IssuedOn` (datetime) · `smkb_cex_Version` (int) · `smkb_cex_Superseded` (bit) ·
`smkb_cex_SupersededById` (**self-lookup → Certificate**) · **`smkb_cex_Pdf` (File)** ·
`smkb_cex_VerificationCode` (nvarchar 40, required).

**Quirks:**
- **`CandidateId` is deliberate denormalisation**, not a missing relationship. Two paths to one fact;
  Dataverse does not sync them. **Single writer only** — written once by
  `CEX-StaffFinaliseApplication` from `Application.CandidateId`, never updated after.
- **Self-referencing lookup** (`SupersededById`) — one of only two non-trivial relationship shapes here.
- Verification code `Cert-XXXXXXXX`, random not sequential, from an alphabet excluding `0`/`O`, `1`/`I`.
- **Advisory, not binding** (`D-23`). The `Pdf` File column follows the same spike rules as `Evidence`.
- **G-5 ✅ decided: `<MaxValue>4096</MaxValue>`** — the same limit as evidence. `D-06` governs
  evidence rather than generated output, but a symmetric limit is one number to remember instead of
  two, and a generated certificate will not come close to it. Same authoring rules as `Evidence`:
  declare only `<Type>file</Type>`, never author `smkb_cex_Pdf_Name` or the `FileAttachment_*`
  relationship.

#### 17. `smkb_cex_Reopening` — `CEX - Reopening` / פתיחה מחדש
`smkb_cex_ApplicationId` (lookup) · `smkb_cex_Reason` (ntext, required) · `smkb_cex_ReopenedBy` /
`ReopenedOn`. **One row per reopening**, so repeated reopenings each keep their own reason (`S-A-04`).

### Group G — Compliance

#### 18. `smkb_cex_EvidenceAccessLog` — `CEX - Evidence Access Log` / יומן גישה לראיות
**G-3 ✅ decided: an 18th table.** Implements `X-5` — the `D-11` obligation to attribute evidence
reads to a real actor, which the platform cannot do on the portal path because those reads execute
as the shared service account.

| Column | Type | Purpose |
|---|---|---|
| `smkb_name` | nvarchar | Human-readable summary — primary name |
| `smkb_cex_EvidenceId` | lookup → Evidence, required | **WHAT** was read |
| `smkb_cex_ActorUserId` | lookup → `systemuser` | **WHO**, when the caller is a licensed staff user |
| `smkb_cex_ActorDescriptor` | nvarchar(200) | **WHO**, when the caller is a portal candidate — the OTP session's resolved identity, since portal users are not `systemuser` rows |
| `smkb_cex_AccessedOn` | datetime, required | **WHEN** |
| `smkb_cex_ReasonCode` | picklist, required | **WHY** — `ReviewerOpened` · `AdminExport` · `CandidateDownload` · `CertificateGeneration` · `SystemPurge` |
| `smkb_cex_ApplicationId` | lookup → Application | Denormalised for querying "who touched this file" |

**Ownership: `Organization`** — the one exception in the whole model. An access log that a user can
own is an access log a user can be given rights over; organization ownership keeps it uniformly
outside per-row sharing.

**Quirks and cautions:**
- ⚠️ **Two actor columns, not one, and that is deliberate.** Staff are `systemuser` rows; portal
  candidates are not. A single lookup would silently record `null` for every portal read — the
  majority — which is worse than no log because it *looks* complete.
- **Append-only by convention.** Nothing in Dataverse enforces it; no flow may update or delete a
  row. The same reasoning as `DecisionHistory`.
- **This table is exempt from `D-13`'s evidence purge.** The log must outlive the file it describes,
  or "who accessed this document" becomes unanswerable exactly when it is asked. `Evidence` rows are
  deleted at `ClosedOn + 90`; **deleting the parent will null or block this lookup**, so the
  relationship's cascade behaviour must be chosen deliberately at authoring time — see §6.
- Personal data: yes — it records who looked at whose documents.

---

## 3. Impact of D-24, X-5, X-6, X-7

| Item | Effect on the data model |
|---|---|
| **D-24** (split transport) | **None on schema.** `Evidence` and `Certificate` are identical under either transport; only the flows differ. `SizeBytes` / `ContentType` are still populated by §16 validation on the portal path. |
| **X-5** (evidence access logging) | ✅ **Resolved — table 18, `EvidenceAccessLog`.** `DecisionHistory` logs *decisions*, not *reads*, so a dedicated append-only table carries WHO/WHAT/WHEN/WHY. Wave 5, Organization-owned. |
| **X-6** (CI `--pre-commit`) | None on schema. But note: **every table authored here will carry `smkb_sol_`-free names**, so as the real tables land, the placeholder count falls and X-6's revert becomes possible. |
| **X-7** (plugin entry point) | None on schema. `Suggestion` and `RuleFiring` are what the plugin *writes*; how it is *invoked* is the open question. |

---

## 4. Open questions and spec gaps — all decided 2026-08-30

**G-1 ✅ DECIDED — `OtpRequest` stays parentless, email column only.**
`Candidate` says *"parent of `Application`, `Session`, `OtpRequest`"*, yet `OtpRequest` has only
`smkb_cex_Email` and no lookup. The email-only design is correct — an OTP is requested before
identity exists — so **the §3 Candidate relationship line is the error.** No lookup will be authored;
`SOLUTION-SPEC.md` §3 to be corrected when next touched.

**G-2 — `Suggestion`'s XOR is unenforceable in schema.**
`PriorStudyId` / `PriorCertificateId` are "one of the two". Dataverse cannot express that. Both stay
optional; the rule lives in the plugin and in `CEX-StaffDecideSuggestion`. Flagging so nobody later
reads two nullable lookups as a modelling mistake.

**G-3 ✅ DECIDED — an 18th table, `smkb_cex_EvidenceAccessLog`.**
D-11 requires attributing evidence reads to a real actor, because portal reads run as the shared
service account, and nothing in the 17 tables records a read. Rejected alternatives: extending
`DecisionHistory` (it answers "what was decided", and mixing reads in would blunt that), and relying
on platform audit (§3 already establishes it is effectively off). Full design at table 18.

**G-4 ✅ DECIDED — `RuleSet` in Wave 2, reduced to a stable core.**
`Application.RuleSetId` stays a first-class lookup from creation. `RuleSet` is authored with
`smkb_name` / `Version` / `EffectiveFrom` only, so `Rule` and `RuleFiring` can still change after
D-04 stage ב **without touching `Application`**. `IsActive` and `ProgrammeId` are deferred with their
consumers noted at table 13 — both are additive when they return.

**G-5 ✅ DECIDED — `Certificate.Pdf` = `<MaxValue>4096</MaxValue>`.**
Symmetric with evidence. One limit to remember rather than two, and a generated certificate will not
approach it.

**G-6 ✅ DECIDED — run a short type spike before Wave 1.** ⭐ *was blocking*
§3 says so explicitly: *"`decimal` and `File` have no XML anywhere"*. The spike solved `File`; it did
**not** solve `decimal`, and five columns need it: `Requirement.Credits`, `PriorStudy.Credits`,
`Suggestion.Strength`, `Rule.Strength`, `RuleFiring.Contribution`. Precision and scale are
unspecified too. **Recommend the same platform-emit method that worked for File** — create one
decimal column via Web API, export, read the XML — rather than hand-authoring `<Type>decimal</Type>`
with guessed `<Precision>`. Cheap now, expensive if wrong across five columns.

**G-7 — "date" is not a Dataverse type.**
The spec says `date` for `Application.DueOn`, `PriorStudy.CompletedOn`, `PriorCertificate.IssuedOn`,
`Evidence.PurgeAfter`. Dataverse has one `datetime` type with a **DateOnly** format/behaviour.
Mechanical, but it must be got right in XML and there is no precedent in the starter either — the
kit's `datetime` examples are commented out.

**G-8 — picklist option sets have no XML precedent.**
Six tables need them (`Candidate.Status`, `Application.Status`, `Suggestion.Band`,
`Suggestion.Decision`, `DecisionHistory.Action`, `Rule.MatchType`). Per Critical Rule 3 the local
names are lowercased (`smkb_cex_application_statuscode`-style). Same platform-emit recommendation
as G-6 — one throwaway picklist tells us the exact serialisation.

---

## 5. Where PRODUCT_SPEC and SOLUTION-SPEC disagree

**P-1 ✅ DECIDED — `Application.smkb_cex_NeedsAttentionSince` (datetime, nullable).**
`PRODUCT_SPEC.md` R-08: *"adding a document after a decision does not reopen anything automatically.
**It flags the application for the reviewer's attention** and leaves the judgement to them."*
`SOLUTION-SPEC.md` §3 had no column for it. Now stored, not derived — set by flow when evidence
arrives after a decision, cleared when the reviewer acts, and filterable/sortable so
`CEX-StaffGetQueue` can surface it without a per-row subquery. A nullable timestamp also records
*when* attention became due, which a boolean cannot.

**P-2 — the certificate's status (known, already tracked).**
`PRODUCT_SPEC.md` §12.2 / §1.4 describe the certificate as carrying the full outcome, and `R-01`
promises "you will not study this course", while `D-23` reclassifies it as advisory and non-binding.
This is **deliberately unresolved** and tracked as `O-7`. **No data-model impact** — `Certificate` is
identical either way. Listed so it is not rediscovered as new.

**P-3 — retention wording differs, harmlessly.**
`PRODUCT_SPEC.md` R-08 defers evidence retention to §12.3 (`Q-04`); `SOLUTION-SPEC.md` fixes it at
`ClosedOn + 90` (`D-13`). D-13 is the later and more specific decision, and `Evidence.PurgeAfter`
implements it. No conflict in substance — noting it so the §12.3 reference is not read as
contradicting D-13.

> **Scope of this cross-check:** I compared the data-model-bearing sections — R-01, R-02, R-03, R-06,
> R-08, R-09, §2.2, §12.2 — against §3. I did **not** re-read all 2,100 lines of `PRODUCT_SPEC.md`,
> so this is not an exhaustive diff of the two documents.

---

## 6. Status and what remains

**All six questions decided 2026-08-30.** Net effect on the plan:

| Decision | Effect |
|---|---|
| G-1 | `OtpRequest` parentless; §3's Candidate line is wrong and needs correcting |
| G-3 | **+1 table** → 18. `EvidenceAccessLog`, Wave 5, Organization-owned |
| G-4 | `RuleSet` Wave 2, three columns; `IsActive` + `ProgrammeId` deferred |
| G-5 | `Certificate.Pdf` = 4096 KB |
| G-6 | Type spike runs **before Wave 1** |
| P-1 | **+1 column** → `Application.NeedsAttentionSince` |

### The one prerequisite: the G-6 type spike

Nothing can be authored until `decimal`, picklist and date-only serialisations are known. Same method
as the File spike — create via Web API, export, unpack, read what the platform emitted, verify on
round-trip, tear down. **Unpack to scratchpad only, never into the Tables starter.**

### Decisions deferred to authoring time

- **`EvidenceAccessLog → Evidence` cascade behaviour.** `D-13` deletes evidence at `ClosedOn + 90`,
  but the log must outlive the file it describes. `RemoveLink` orphans the reference; `Restrict`
  would block the purge entirely. Needs choosing when table 18 is authored — and the File spike
  showed relationship cascade metadata can be misleading (`CascadeDelete=RemoveLink` there still
  deleted the blob), so **verify the behaviour rather than trusting the setting**.
- **`RuleSet.IsActive` / `ProgrammeId`** — both additive, both expected back, neither blocking.
- **`SOLUTION-SPEC.md` §3 corrections** — the Candidate/OtpRequest relationship line (G-1), and §3
  does not yet mention `NeedsAttentionSince` or `EvidenceAccessLog`. Best folded into one edit once
  the tables are authored and the shapes are proven, rather than speculatively now.
