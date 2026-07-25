# [SOLUTION NAME] — Solution Documentation

> **This is a TEMPLATE.** It ships blank in the starter kit and is filled in per solution — the final
> step of the [Init Project](../INIT_PROJECT.md) flow drafts it from the solution that was just built.
> Sections marked **`[FILL IN: …]`** are project-specific; the surrounding structure and any general
> SMKB guidance are kept as-is. Delete this callout once the doc is populated.

This folder is the reference documentation for the **[SOLUTION NAME]** solution, prepared for the IT
department. It describes the architecture, technology, integrations, data, privacy posture, security
controls, automated tests, and deployment/ALM model.

- **Audience:** IT reviewers, architects, and (via the executive summary) IT management / compliance.
- **Scope:** the whole solution — `[FILL IN: which front-end apps]`, the Power Automate cloud flows,
  and the `[FILL IN: Dataverse / SharePoint]` data stores.
- **Last reviewed:** `[FILL IN: YYYY-MM]` · **Environment referenced:** SMKB-Apps-Dev (see
  [`solution.config.json`](../solution.config.json) `targetEnvUrl`).

> Every non-obvious fact cites its source file in the repo so it can be verified. Where a document
> describes a control or data element, the authoritative source is always the code/config in the repo,
> not this documentation.

## How to read this

Start with the **[Executive Summary](00-executive-summary.md)** for a one-page, non-technical overview.
Then read in order, or jump to the topic you need:

| # | Document | What it covers |
|---|----------|----------------|
| 00 | [Executive Summary](00-executive-summary.md) | One page, non-technical: what the system does, who uses it, where data lives, security/privacy posture |
| 01 | [Architecture](01-architecture.md) | Building blocks, the UI-only / flows-only principle, request & data flow, diagrams |
| 02 | [Technology Stack](02-tech-stack.md) | Languages, frameworks, Power Platform components, tooling |
| 03 | [Cloud Flows](03-cloud-flows.md) | The Power Automate flows — inventory, triggers, connectors, auth model |
| 04 | [Integrations & Connections](04-integrations-and-connections.md) | Internal connectors + external systems, connection references, environment variables |
| 05 | [Data Model](05-data-model.md) | Dataverse tables (and any SharePoint lists), columns, how records relate |
| 06 | [Data & Privacy](06-data-privacy.md) | Personal-data inventory, data egress, retention/lifecycle, access model |
| 07 | [Security](07-security.md) | Authentication, authorization, secrets, transport, injection prevention, data minimization |
| 08 | [Testing & Quality Gates](08-testing-and-quality-gates.md) | Unit tests, flow-lint, pre-commit hook, deploy gates, CI |
| 09 | [Deployment & ALM](09-deployment-alm.md) | Environments, pipeline model, deploy scripts, per-environment configuration |

See also the solution-wide [TESTING-STRATEGY.md](../TESTING-STRATEGY.md) and the pre-go-live
[audit templates](../audit/README.md).

## The solution in one paragraph

`[FILL IN: 3–5 sentences — who uses it, what they do, and the UI-only + flows-only shape. Example
skeleton:]` The [SOLUTION NAME] solution lets **`[FILL IN: user type]`** `[FILL IN: what they do]`
through `[FILL IN: a web portal / a back-office app]`. `[FILL IN: front ends]` are **UI-only**: all
data access and every external integration runs server-side in **Power Automate cloud flows**, which
read and write `[FILL IN: Dataverse tables / SharePoint lists]`. See [Architecture](01-architecture.md).
