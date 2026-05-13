# Init Project — Starting a New Solution

This guide walks through the **one-time setup** required when you clone this starter kit to build a new solution. It is different from starting a regular Claude session on an already-initialized project.

> **Working with Claude?** Say "init project" and Claude will follow this guide step by step.  
> **Working manually?** Follow each step below in order.

---

## Session Start vs Init Project

| | Session Start | Init Project |
|-|--------------|-------------|
| **When** | Every time you open a new Claude session | Once — the first time you clone this starter kit |
| **What happens** | Claude reads project state, confirms active starters, starts work | Disconnects from template remote, gathers specs, creates new repo, builds plan |
| **Trigger** | Just open Claude — it reads CLAUDE.md automatically | Say "init project" to Claude, or follow this guide manually |
| **Governed by** | CLAUDE.md Critical Rule 1 | This file (INIT_PROJECT.md) |

**Rule:** do not run Init Project on a repo that has already been initialized. If the git remote already points to a solution-specific repo (not the starter kit), you are in a regular session — just start working.

---

## The Steps

### Step 1 — Confirm this is a fresh clone

Run:
```powershell
git remote get-url origin
```

Expected output for a fresh clone:
```
https://github.com/SMKB-AC-IL/SMKB-Power-Platform-Solution-Starter-Kit.git
```

If the output already points to a solution-specific repo (e.g. `SMKB-Events-Tickets-Solution`), Init Project has already been run — stop here and start a regular session instead.

---

### Step 2 — Gather solution identity

Collect the following from the developer:

| Item | Format | Example |
|------|--------|---------|
| **Solution name** | Human display name, title case | `Events Tickets` |
| **Solution unique name** | PascalCase, no spaces, no underscores | `SMKBEventsTickets` |
| **Solution display name** | With org prefix and dash | `SMKB – Events Tickets` |
| **Short name (prefix)** | 2–5 lowercase letters only, no numbers | `evt` |

Derived values (confirm with the developer):
- Local folder / repo name: `SMKB - [Solution Name] - Solution`  
  Example: `SMKB - Events Tickets - Solution`
- GitHub repo name: `SMKB-[SolutionName]-Solution`  
  Example: `SMKB-Events-Tickets-Solution`

**Validation rules:**
- Unique name must be alphanumeric, PascalCase, max 50 characters
- Short name must be 2–5 lowercase letters only — no numbers, no underscores, no hyphens
- Short name drives ALL component naming for this solution — every table, flow, and env var will be prefixed with it

---

### Step 3 — Remove the starter kit remote

This is the most important step. Removing the origin prevents any solution-specific work from ever being pushed back to the shared template repo.

```powershell
git remote remove origin
```

Verify it is gone:
```powershell
git remote -v
# Expected: (no output)
```

---

### Step 4 — Create the new GitHub repository

Create a **private** repository in the SMKB-AC-IL GitHub organization.

**Option A — using the `gh` CLI (recommended if installed):**
```powershell
# Replace SMKB-Events-Tickets-Solution with your derived repo name
gh repo create SMKB-AC-IL/SMKB-Events-Tickets-Solution --private
```

**Option B — manually on GitHub:**
1. Go to [github.com/SMKB-AC-IL](https://github.com/SMKB-AC-IL)
2. Click **New repository**
3. Name: `SMKB-Events-Tickets-Solution` (use the derived GitHub repo name from Step 2)
4. Visibility: **Private**
5. **Do NOT** add a README, .gitignore, or license — the repo must be empty
6. Copy the HTTPS clone URL

---

### Step 5 — Connect to the new repo and push

```powershell
# Replace the URL with your new repo's HTTPS URL
git remote add origin https://github.com/SMKB-AC-IL/SMKB-Events-Tickets-Solution.git

# Stage everything (all starter folders + root governance files)
git add -A

# Initial commit
git commit -m "Initial commit: Events Tickets initialized from SMKB Power Platform Solution Starter Kit"

# Push and set tracking branch
git push -u origin main
```

Verify the remote is set correctly:
```powershell
git remote -v
# Expected: origin  https://github.com/SMKB-AC-IL/SMKB-Events-Tickets-Solution.git (fetch)
#           origin  https://github.com/SMKB-AC-IL/SMKB-Events-Tickets-Solution.git (push)
```

---

### Step 6 — Select which starters to activate

Ask the developer which of the 5 starters this solution needs:

| Starter | Activate when… |
|---------|---------------|
| Dataverse Tables | The solution stores data in custom Dataverse tables |
| Environmental Variables | The solution has config values that differ per environment |
| Cloud Flows | The solution includes automated flows or Power Pages-triggered logic |
| Power App | The solution needs a staff/admin-facing interface inside Power Apps |
| Power Pages | The solution includes a public-facing or internal web portal |

Starters that are NOT selected must remain completely untouched — do not rename them, do not modify any files, do not deploy them.

---

### Step 7 — Rename activated starter folders

For each selected starter, rename its folder from the template name to the solution-specific name:

```
SMKB - X Starter  →  SMKB - [Component Name] - [Type Label]
```

| Starter | Type Label | Example rename |
|---------|-----------|---------------|
| Dataverse Tables Starter | `Dataverse Tables` | `SMKB - Events Tickets - Dataverse Tables` |
| Environmental Variables Starter | `Environmental Variables` | `SMKB - Events Tickets - Environmental Variables` |
| Power Automate Flows Starter | `Cloud Flows` | `SMKB - Events Tickets - Cloud Flows` |
| Power Apps Starter | `Power App` | `SMKB - Events Backoffice - Power App` |
| Power Page Starter | `Power Page` | `SMKB - Events RSVP - Power Page` |

The **Component Name** part is up to the developer — it describes what that specific component manages (not just the solution name). Renaming does not break any deploy script — all scripts use `$PSScriptRoot`.

---

### Step 8 — Gather solution specifications

For each activated starter, collect enough detail to drive placeholder replacements and implementation. Ask the developer:

**For each Table:**
- Entity name and display name (e.g., `evt_session`, "Session")
- Key fields: name, type, required/optional
- Relationships to other tables (if any)

**For each Environment Variable:**
- Variable name following `[PREFIX]_VAR_NAME` convention (e.g., `EVT_PORTAL_BASE_URL`)
- Type: String / Number / Boolean / JSON / Secret
- Default value (or none if environment-specific)
- Purpose

**For each Cloud Flow:**
- Flow name following `[prefix]_flow_name` convention (e.g., `evt_send_confirmation`)
- Trigger type: Power Pages form submission, scheduled, or other
- What it does: the logic, recipients, subject/body
- Input parameters (if triggered from Power Pages)

**For the Power App:**
- App display name (e.g., `SMKB Events Backoffice`)
- Which Dataverse tables it reads and writes
- Key screens and their purpose

**For the Power Pages site:**
- Portal subdomain (e.g., `events-rsvp`)
- Key pages and forms
- Auth requirements: public access vs Azure AD

---

### Step 9 — Build the implementation plan

Using the specifications from Step 8, build a structured plan covering:

1. **Solution identity summary** — all the values gathered in Step 2 in one place
2. **Per-starter replacement checklist** — exact string-by-string placeholder replacements for each activated starter
3. **Schema details** — table column definitions, flow logic pseudocode, env var defaults
4. **Development sequence** — which starter to implement first (follow Critical Rule 4 in CLAUDE.md: Tables → Env Vars → Flows → Power Pages)

Present the complete plan to the developer for confirmation before beginning any implementation.

---

### Step 10 — Commit the initialized state

After folder renames are done (Step 7) and the developer has confirmed the plan (Step 9):

```powershell
git add -A
git commit -m "chore: activate starters and rename folders for [Solution Name]"
git push
```

This marks the boundary between "initialized from template" and "active development". All future commits are solution-specific work.

---

## After Init Project — Regular Development

From this point on, every new Claude session is a **regular session start**:
- Claude reads CLAUDE.md, checks which starters are active, confirms solution identity
- Claude will NOT offer to run Init Project again (the remote no longer points to the starter kit)
- Development, placeholder replacement, and deployment follow the normal workflow in each starter's README

See [CLAUDE.md](CLAUDE.md) for the complete rules governing regular sessions.
