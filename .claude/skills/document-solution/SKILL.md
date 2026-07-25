---
name: SMKB Solution — Document
description: >-
  Populates the docs/ templates (00-executive-summary .. 09-deployment-alm + README)
  from the built solution: replaces every [FILL IN] with real detail, cites the
  source file per fact, drops sections for non-activated starters, strips the
  TEMPLATE callout.
when_to_use: >-
  User says "document the solution", "fill in the docs", "write the docs", "generate
  documentation", or is at Init Project Step 12.
allowed-tools: Read Edit Grep Glob
---

## Context

The starter ships a [`docs/`](../../../docs/README.md) folder of solution-documentation **templates** (11
files: README + `00`–`09`). They are deliberately **not** scanned by any deploy guard or
`check-doc-boundaries.mjs`, so a half-filled set never blocks anything — completeness is pure discipline, and
the agent has full build context exactly once (at the end of Init Project). This skill captures that:
replace every `[FILL IN: …]` with the solution's real detail, **cite the source file** for each non-obvious
fact (the docs' own rule: the code is authoritative, the doc points at it), and remove template scaffolding.
See [INIT_PROJECT.md](../../../INIT_PROJECT.md) Step 12.

## Steps

1. Inventory what to document: read `solution.config.json` `activate.*` + the actual tables (`Entities/*/Entity.xml`),
   env vars (`environmentvariabledefinitions/*`), flows (`Workflows/*.json` + `Customizations.xml`), and app
   folders. This is the ground truth the docs must match.
2. For **each** `docs/NN-*.md` (and `docs/README.md`), replace every `[FILL IN: …]`:
   - **General/kept** sections (the SMKB posture, flow-error contract, ALM model) — leave as-is; adjust only the specifics.
   - **Structural** sections — fill the tables/lists from the ground truth in Step 1. Use `smkb_<prefix>_<PascalName>` names and `PREFIX - Name` displays.
   - Cite the source file for every non-obvious fact (e.g. "(`Workflows/…json` → action `X`)").
3. **Delete** any section, row, or whole doc concern that belongs to a starter this solution did **not**
   activate (e.g. no SharePoint → drop the SharePoint blocks; no external systems → say "none").
4. Remove the `> **TEMPLATE** …` callout from the top of each file once it's populated.
5. **PAUSE** — hand the drafts to the developer to review the things you can't know (business intent,
   retention decisions, approver identities, whether an accepted risk is truly accepted).

## Error Handling

- **A fact you can't verify in code:** mark it `[FILL IN: confirm with owner — …]` rather than guessing; flag it in the review handoff.
- **`[FILL IN]` left behind:** grep at the end: `Grep "\[FILL IN" docs/` — anything remaining is either an owner-decision (fine, flagged) or an oversight (fill it).
- **Doc contradicts code:** the code wins — fix the doc to match the source you cited.

## Notes

- Keep the docs' citation discipline: every non-obvious control/data claim points at its source file.
- Re-run this whenever the solution changes materially. Pre-go-live reviews are `/security-audit` and `/ux-audit`.
