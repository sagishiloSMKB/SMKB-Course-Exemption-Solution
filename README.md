# SMKB - Power Platform Solution Starter Kit

This repository is an **orchestrator** for building an SMKB Power Platform solution from a set of
self-contained starters — custom tables, environment variables, Power Automate flows, a Power Apps
Code App, and a Power Pages Code Site. Components are defined as code, version-controlled in one Git
repo, and deployed to Dataverse via the PAC CLI.

The root holds the init flow, the one solution-wide config, and the conventions that span all
starters. Each starter owns its own build, deploy, and architecture docs. This README is the
entry point; the operating rules live in [`CLAUDE.md`](CLAUDE.md).

> **Working with AI (Claude)?** You give Claude the solution's name and the specifications; it derives
> the architecture, **tells you which starters it is activating and why**, fills solution identity from
> one config, and refuses to deploy until each starter's own guard passes.
> See [`CLAUDE.md`](CLAUDE.md) for the full rules and the "Root vs Starters" ownership charter.

---

## Sub-Starters

Each starter is independent and reusable — activate only what your solution needs; the rest stay
untouched with their template names. Full build/deploy/architecture docs live **inside each starter**:

| Starter | What it covers | Docs |
|--------|---------------|------|
| `SMKB - Dataverse Tables Starter` | Custom table schemas, forms, views | [README](SMKB%20-%20Dataverse%20Tables%20Starter/README.md) |
| `SMKB - Environmental Variables Starter` | Environment variable definitions | [README](SMKB%20-%20Environmental%20Variables%20Starter/README.md) |
| `SMKB - Power Automate Flows Starter` | Cloud flows packaged into a solution zip | [README](SMKB%20-%20Power%20Automate%20Flows%20Starter/README.md) |
| `SMKB - Power Apps Starter` | Power Apps Code App SPA (Vue 3 + TS), UI-only, flow-backed | [README](SMKB%20-%20Power%20Apps%20Starter/README.md) · [CLAUDE.md](SMKB%20-%20Power%20Apps%20Starter/CLAUDE.md) |
| `SMKB - Power Pages Code Site Starter` | Power Pages Code Site (Vue 3 SPA uploaded via PAC), flows-backed | [Getting Started](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/GETTING-STARTED.md) · [CLAUDE.md](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/CLAUDE.md) |

**Not every solution needs all starters.** A simple data-entry app may only need Tables. A
background-automation solution may only need Flows and Env Vars.

---

## One Config, Applied to Every Starter

Solution identity (unique name, display name, short prefix, target environment, app/site names) is
authored once in [`solution.config.json`](solution.config.json) and pushed into each activated
starter's own config by [`apply-config.ps1`](apply-config.ps1):

```powershell
powershell -ExecutionPolicy Bypass -File apply-config.ps1 -DryRun   # preview
powershell -ExecutionPolicy Bypass -File apply-config.ps1           # apply
powershell -ExecutionPolicy Bypass -File apply-config.ps1 -Check    # drift guard
```

You never hand-edit a starter's config to a value that disagrees with the root config — the `-Check`
mode (run by the pre-commit hook) fails if they ever drift apart.

---

## Git Repository

The entire starter kit lives in **one git repository** — a single root `.git` covers all starter
folders. No nested repos, no submodules, no per-folder CI. Git and CI are owned at the root.

### Naming convention for real-solution repos

When you initialize a new solution from this kit, name the repo with the same `SMKB - [Name] - [Type]`
convention used everywhere else:

```
SMKB - [Solution Name] - Solution        (GitHub: SMKB-[Solution-Name]-Solution)
```

| Solution | Local folder / repo name | GitHub repo name |
|----------|--------------------------|-----------------|
| Events & Tickets | `SMKB - Events Tickets - Solution` | `SMKB-Events-Tickets-Solution` |
| Scholarship Applications | `SMKB - Scholarship Applications - Solution` | `SMKB-Scholarship-Applications-Solution` |

### Gitignore, hooks & CI

There is **one** `.gitignore`, at the repo root — this is a single-repository monorepo (one `.git`, no
nested repos or submodules). It covers build artifacts (`_dist/`, `dist/`), `node_modules/`, env files,
IDE/OS files, **and** the few starter-specific patterns (Cloud Flows `deployment-settings.json` /
`*_unpacked/`, Power Pages Code Site `.portalconfig/*-manifest.yml`); starters do **not** carry their own
`.gitignore`. The one pre-commit hook lives at the root in `.githooks/pre-commit`
(opt-in: `git config core.hooksPath .githooks`); it lints each starter with its own toolchain and runs
the config-drift and doc-boundary checks.

Continuous integration is owned at the root too: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
runs flow-lint plus each code app's lint & unit tests on every push to `main` and every PR. It
auto-discovers the flow-lint checker and the SPA folders, so it keeps working after Init Project renames
the starters, and needs **no repository secrets** — the private `@smkbacil` package is vendored. An optional
Solution Checker job is included commented-out.

### First time using this starter kit?

See [`INIT_PROJECT.md`](INIT_PROJECT.md) — the one-time setup guide that disconnects from the template
remote, creates your solution repo, gathers specs, selects and renames starters, fills
`solution.config.json`, and deploys. Publisher, environment, naming, and deployment rules are all in
[`CLAUDE.md`](CLAUDE.md) (the single source of truth for conventions).

---

## Repository Structure

```
SMKB - Power Platform Solution Starter Kit/
|
├── CLAUDE.md                                 <- Orchestration + global rules (read first)
├── README.md                                 <- This file
├── INIT_PROJECT.md                           <- One-time solution setup flow
├── solution.config.json                      <- Single source of truth for solution identity
├── apply-config.ps1                          <- Pushes identity into every activated starter
├── scripts/check-doc-boundaries.mjs          <- Doc-boundary + link enforcement
├── .githooks/pre-commit                      <- The one repo-wide pre-commit hook
├── .github/workflows/ci.yml                   <- CI: flow-lint + per-app lint/tests (rename-proof)
├── .gitattributes                            <- Pins the hook + *.mjs to LF (Windows-clone safe)
├── docs/                                      <- Solution-documentation TEMPLATES (filled per solution at init)
├── TESTING-STRATEGY.md                        <- The layered testing method (house standard)
├── audit/                                     <- Pre-go-live security / UX audit templates
├── STARTER_AGENT_FEEDBACK_AND_NOTES.md        <- Append-only log during Init Project
│
├── SMKB - Dataverse Tables Starter/          <- Custom table schemas (README, deploy.ps1, Entities/, Other/)
├── SMKB - Environmental Variables Starter/   <- Env var definitions (README, deploy.ps1, environmentvariabledefinitions/, Other/)
├── SMKB - Power Automate Flows Starter/      <- Cloud flows (README, deploy.ps1, Workflows/, Other/, tools/flow-lint/)
├── SMKB - Power Apps Starter/                <- Code App SPA (README, CLAUDE.md, deploy.ps1, src/, power.config.json)
├── SMKB - Power Pages Code Site Starter/     <- Code Site SPA (CLAUDE.md, GETTING-STARTED.md, src/, .powerpages-site/, .claude/skills/)
│
├── SMKB - Component Library/                 <- Reusable UI recipes (e.g. OTP Auth Screen); @smkbacil/design-ui is vendored per starter
└── onboarding SMKB Apps Development/          <- Pre-init learning app (removed during Init Project)
```
