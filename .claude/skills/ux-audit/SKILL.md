---
name: SMKB Solution — UX Audit
description: >-
  Runs a code-driven heuristic (Nielsen) UX review of one app from the audit template.
  Suggestions-only: it never changes code. Produces a severity-ranked, line-anchored
  report the owner annotates (IMPLEMENTED / BY DESIGN / WITHDRAWN).
when_to_use: >-
  User says "UX audit", "usability review", "review the UX", "heuristic evaluation",
  or wants suggestions on an app's usability before go-live.
argument-hint: "<app-folder>"
arguments: [app]
allowed-tools: Read Write Grep Glob
---

## Context

A UX audit is **suggestions-only — it never changes code.** It is a code-driven heuristic evaluation
(Nielsen/NN-g): a story-by-story source walkthrough of every screen, dialog, and backing flow, with each
finding anchored to its evidence (file:line). The dominant UX risk theme in these apps is usually a
**mismatch between what the user believes happened and what actually happened** (an action that silently
does something different, invisible system state, a modal that discards edits). The output is a
severity-ranked report from [`audit/TEMPLATE-ux-audit.md`](../../../audit/TEMPLATE-ux-audit.md) that the
**owner** annotates with decisions. See [audit/README.md](../../../audit/README.md).

## Steps

1. Copy the template to a dated report: `audit/<app>-ux-audit-YYYY-MM-DD.md` (one app per report).
2. Walk the app **from the source**: routes/views, dialogs, forms, list/table ergonomics, empty/error/loading
   states, copy/jargon, RTL/accessibility, and each backing flow's real behavior. Anchor every observation to
   file:line.
3. Write findings as `UXn — SEV · <heuristic/area> · <one-line problem>` with the suggested change and its
   evidence anchor. Rank them in the summary table (`ID/Sev/Area/Suggestion/Effort`).
4. **Do not modify any source file.** The report is the only artifact. Default every finding to `SUGGESTED`.
5. **PAUSE** — present the report; the owner marks each `IMPLEMENTED / PARTIALLY IMPLEMENTED / BY DESIGN /
   WITHDRAWN`. Record those decisions back into the report (it becomes the decision log).

## Error Handling

- **Tempted to fix a UX issue in code:** don't — this skill is suggestions-only. If the user wants a fix implemented, that's a separate, explicit change after they accept the suggestion.
- **No runtime session available:** that's normal — this is a code-driven evaluation; note "no runtime session" in the Method line and rely on source evidence.

## Notes

- Suggestions-only keeps the audit a safe, repeatable lens — the owner stays in control of what ships.
- Security is a **separate** review — `/security-audit`. Run both before Stage/Prod promotion.
