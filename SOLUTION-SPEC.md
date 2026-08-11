# [SOLUTION NAME] — Solution Specification

> **TEMPLATE.** This ships blank in the starter kit and is filled during **Init Project Phase 4**, before
> any architecture decision is made. Keep the section structure.

**What this file is:** the durable record of what the solution must do — captured from the developer at the
start, in their words. It is the **input** artifact.

**What it is not:** the [`docs/`](docs/README.md) set is the **output** artifact, drafted at Phase 12 from
the solution that was actually built. This file is where that drafting starts, so `docs/` never has to
reconstruct intent from code.

**Why it exists at all:** the specs used to live only in the chat transcript. Init Project **mandates a
Claude Code restart** the moment starter folders are renamed (Phase 6.3), so a flow that never wrote the
specs down guaranteed losing them at exactly the point where the most had been decided. Fill this in as the
answers arrive — not at the end.

> **Agent:** this file is yours to write, from the developer's answers. Do not hand them a blank form. Ask
> in plain language, record what you hear, and mark anything you inferred rather than were told. Where an
> answer is missing, write it under **Open questions** instead of guessing — an unanswered question is a
> finding, not a blank to fill.
>
> **How to mark an inference — use this exact form, so two runs are comparable:** suffix the sentence with
> `[inferred]`, and where the inference is load-bearing say what from — `[inferred from §3]`. "Mark it"
> without a prescribed shape produced whatever each run felt like, which is indistinguishable from not
> marking it at all. An inference is weaker evidence than an answer, and a later reviewer can only tell the
> two apart if the file says so.

---

## 1. Summary

| | |
|---|---|
| **What the solution does** | [FILL IN: one or two sentences, in the developer's own words] |
| **Who uses it** | [FILL IN: the audiences — e.g. staff, lecturers, the public] |
| **Why now / what it replaces** | [FILL IN: a manual process, a spreadsheet, an existing site being rebuilt] |
| **Success looks like** | [FILL IN: how the owner will judge it worked] |

## 2. Users and access

| Audience | Authenticated? | What they can do |
|---|---|---|
| [FILL IN] | [FILL IN: anonymous / custom OTP / Entra] | [FILL IN] |

**Ownership rule** — [FILL IN: which records a given user may see and edit. This drives the row-level
ownership scaffold in every authenticated flow; see [SECURITY-BASELINE.md](SECURITY-BASELINE.md).]

## 3. Data model

One block per table. Schema names follow `smkb_<prefix>_<PascalName>`, display names `PREFIX - Name`
(CLAUDE.md → Critical Rule 3).

### [FILL IN: Table name]
- **Purpose:** [FILL IN]
- **Columns:** [FILL IN: name · type · required? · notes]
- **Relationships:** [FILL IN: to which table, which direction, required?]
- **Holds personal data?** [FILL IN: yes/no + which columns — feeds `docs/06-data-privacy.md`]
- **Retention:** [FILL IN: how long, and what happens after]

## 4. Configuration values (environment variables)

Values that differ between Dev / Stage / Prod, or that an admin should change without a redeploy.

| Purpose | Type | Default | Differs per environment? |
|---|---|---|---|
| [FILL IN] | [FILL IN: String / Number / Boolean — **lists are String + semicolons, never JSON**] | [FILL IN] | [FILL IN] |

## 5. Automation (cloud flows)

One block per flow. Everything that touches data or an external system runs in a flow — the SPAs are
UI-only.

### [FILL IN: what the flow does]
- **Trigger:** [FILL IN: Power Pages request / Power Apps / Dataverse row created-updated / scheduled]
- **Logic:** [FILL IN: the steps, in order, including validation and business rules]
- **Reads / writes:** [FILL IN: which tables, which columns]
- **Sends anything?** [FILL IN: email/SMS — to whom, with what content. Note anything sensitive.]
- **Inputs from the caller:** [FILL IN: and which of them must NOT select a record — resolve those from
  the session instead]

## 6. Interfaces

### Power Apps (staff / admin)
- **Function:** [FILL IN: what this app is *for* — this becomes the component name and the folder name]
- **Key screens:** [FILL IN]
- **Tables it reads / writes:** [FILL IN]

### Power Pages Code Site (portal)
- **Function:** [FILL IN: what this site is *for* — becomes the component name and the folder name]
- **Bare site name:** [FILL IN: the unprefixed name; apply-config derives `PREFIX - Name`]
- **Titles and languages:** [FILL IN: Hebrew / English / both, and the document title]
- **Pages:** [FILL IN]
- **Auth:** [FILL IN: anonymous, custom OTP, or Entra — see the note in §9]

## 7. External systems

| System | Direction | What moves | Auth |
|---|---|---|---|
| [FILL IN] | [FILL IN: in / out / both] | [FILL IN] | [FILL IN: key in a Secret env var? Key Vault?] |

> Any credential belongs in a **Secret** environment variable read through the Dataverse
> `RetrieveEnvironmentVariableSecretValue` action, never in flow parameters. See
> [SECURITY-BASELINE.md](SECURITY-BASELINE.md).

> **Reading or writing an existing SharePoint list? Declare it here.** Dataverse is this solution's data
> platform (CLAUDE.md → **Critical Rule 6**); SharePoint is a legacy interoperability path for data that
> already lives in a list and cannot be moved. Name the list and say why the data cannot move — it is a
> constraint on the solution, which is what this section is for. `flow-lint`'s `sharepoint-data-action`
> rule warns on every SharePoint action until this declaration exists, so an undeclared SharePoint write
> shows up in review rather than a year later. If the answer is "it does not, we are storing in
> Dataverse", write nothing here about SharePoint.

## 8. Design and UI

| | |
|---|---|
| **Design system** | [FILL IN: **the SMKB design system** (`@smkbacil/design-ui`, the default) **or its own visual identity**] |
| **Provided assets** | [FILL IN: Figma, brand guide, logos, fonts, an existing site to match] |
| **Accessibility / language** | [FILL IN: RTL? bilingual? WCAG target?] |

> **Answer the design-system question early.** A solution that builds its own UI still carries every
> design-ui wiring point and its vendored tarball for a library it never renders. If the answer is "its own
> identity", run **`/ppcs-remove-design-ui`** during Phase 7 — a 13-step removal where two steps are easy to
> miss. (It needs no credential: design-ui is vendored, so installs never authenticate.)

## 9. Security and compliance requirements

[FILL IN: anything the solution must satisfy beyond the house baseline — a review it must pass, a data
classification, an approval chain, a retention obligation.]

The cross-starter defaults (CSP and browser headers, disabled built-in login paths, default-deny table
permissions, Secure I/O on secret-handling actions, uniform anti-enumeration responses, rate limiting) ship
already hardened and are documented in [SECURITY-BASELINE.md](SECURITY-BASELINE.md). Record here only what
is **specific to this solution**.

## 10. Rebuilding an existing solution?

Skip if this is new. If it is a rebuild:

| | |
|---|---|
| **Live artifact** | [FILL IN: the URL / app / solution being replaced] |
| **Source of truth commit** | [FILL IN: the ref that is actually deployed] |
| **How that was confirmed** | [FILL IN: deploy tag, Dataverse solution version, deployed bundle timestamp] |

> **The deployed artifact is the specification; the repo is only evidence for it.** Do not assume the
> default branch is what is live. On one rebuild `origin/main` was 7 commits and 11 days behind production
> and the deployed commit existed only as a deploy tag — porting from `main` would have silently produced a
> faithful copy of the wrong version, and nothing would have failed a build. Enumerate every ref
> (`git fetch --all --tags`, then `git for-each-ref --sort=-committerdate`), correlate with the live
> artifact, diff your candidate against the default branch before porting, and verify afterwards by hashing
> the ported files against that commit.

## 11. Open questions

Anything not yet answered. Each one is a real gap — do not silently assume a default.

| Question | Blocks | Status |
|---|---|---|
| [FILL IN] | [FILL IN: which phase or component it blocks] | open |

---

## 12. Derived architecture — the agent's conclusion

> **Agent:** fill this in at **Phase 5**, from the sections above, and state it to the developer as part of
> the plan. This is not a menu for them to pick from — it is your reasoning, recorded so it survives the
> Phase 6.3 restart and can be checked later.

| Starter | Activate? | Why — cite the section above |
|---|---|---|
| Dataverse Tables | [yes/no] | [FILL IN: e.g. "§3 defines two custom tables"] |
| Environmental Variables | [yes/no] | [FILL IN] |
| Cloud Flows | [yes/no] | [FILL IN] |
| Power Apps | [yes/no] | [FILL IN] |
| Power Pages Code Site | [yes/no] | [FILL IN] |

**Component names derived:**

| Component | Name | Source |
|---|---|---|
| [FILL IN: Power App / Code Site] | [FILL IN] | [FILL IN: which §6 function statement it came from] |

**Deliberately not activated:** [FILL IN: and why — an explicit "no flows are needed because …" is worth
more later than silence. **These starter folders are deleted from this repo at the Phase 9 cleanup audit,
so this line becomes the only surviving record of the decision** — name each one. A folder is recoverable
later from the Phase 3.4 baseline commit: `git checkout <baseline> -- "<folder>"`.]

**Removed at the cleanup audit:** [FILL IN: after Phase 9, the dated `audit/cleanup-audit-*.md` report is
the detail; name the headline removals here so this file stays the one place the architecture is
explained.]
