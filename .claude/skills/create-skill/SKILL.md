---
name: SMKB — Create Skill
description: >-
  Scaffolds a new SMKB skill in the correct .claude/skills/ location with the right
  owner prefix, valid frontmatter, and an optional reference stub, from the shared
  skill-template.md. Use before hand-writing any new SKILL.md.
when_to_use: >-
  User says "create a skill", "add a skill", "new skill", or is about to write a
  SKILL.md for the starter kit (root or any starter).
argument-hint: "<owner> <verb-noun>"
arguments: [owner, verb-noun]
allowed-tools: Read Write Bash(mkdir *)
---

## Context

Skills in this kit are **auto-discovered** from `.claude/skills/*/SKILL.md` — no manifest, no registration.
They are **directory-scoped**: a skill under a starter's `.claude/skills/` surfaces (and is `/slash`-invocable)
when working on files in that starter; root skills live in the repo-root `.claude/skills/`. This skill
scaffolds a new one in the right place with valid frontmatter so you don't hand-roll it. Owner → location +
prefix:

**Locate the starter folder by its type suffix, not by the template name.** Init Project Step 7
renames every activated starter to `SMKB - <Component> - <Type>`, so the template names below only
exist in a pristine kit — after init, use whichever folder ends in that type suffix.

| Owner | Location (`<starter>` = the folder ending in the Type below) | Prefix / name |
|-------|----------|---------------|
| root | `.claude/skills/<verb-noun>/` | unprefixed · `name: SMKB Solution — <Title>` |
| tables | `<… - Dataverse Tables>/.claude/skills/dvt-<verb-noun>/` | `dvt-` · `Dataverse Tables — <Title>` |
| envvars | `<… - Environmental Variables>/.claude/skills/env-<verb-noun>/` | `env-` · `Environment Variables — <Title>` |
| flows | `<… - Cloud Flows>/.claude/skills/flow-<verb-noun>/` | `flow-` · `Cloud Flows — <Title>` |
| powerapps | `<… - Power App>/.claude/skills/pa-<verb-noun>/` | `pa-` · `Power Apps — <Title>` |
| powerpages | `<… - Power Pages Code Site>/.claude/skills/ppcs-<verb-noun>/` | `ppcs-` (use that starter's `/ppcs-create-skill`) |

> Template names in a pristine kit: `SMKB - Dataverse Tables Starter`,
> `SMKB - Environmental Variables Starter`, `SMKB - Power Automate Flows Starter`,
> `SMKB - Power Apps Starter`, `SMKB - Power Pages Code Site Starter`.

## Steps

1. Resolve the target folder + skill name from `$owner` + `$verb-noun` using the table above.
2. Copy `.claude/skills/create-skill/skill-template.md` to `<target>/SKILL.md` and fill the frontmatter:
   - `name` per the owner row; `description` + `when_to_use` (folded `>-`) — keep the two **combined under
     1536 chars**; `argument-hint`/`arguments` if it takes args.
   - Uncomment `disable-model-invocation: true` for **side-effect** skills (deploy/apply/init/push).
   - Set `allowed-tools` to only what the skill runs.
3. Write the body: `## Context` (the failure mode it prevents + cross-refs), `## Steps` (numbered, **exact
   commands** in fences, `**PAUSE**` for handoffs), `## Error Handling`, `## Notes`.
4. If the skill is token/template-heavy, add a sibling `<verb-noun>-reference.md` and link it from Context +
   Notes. Get relative paths right: from `<starter>/.claude/skills/<name>/`, `../../../` = the starter,
   `../../../../` = the repo root; from a root skill, `../../../` = the repo root.
5. Tell the user to **restart Claude Code** so the new skill appears in the `/` menu (content edits to an
   existing skill don't need a restart; new skill *files* do).

## Error Handling

- **Skill doesn't appear in `/`:** it's a new file — restart Claude Code. Also confirm the folder is `.claude/skills/<name>/SKILL.md` (exact path) and the frontmatter parses.
- **Wrong scope (surfaces everywhere / nowhere):** a starter skill must live under that starter's `.claude/`; a root skill under the repo-root `.claude/`.

## Notes

- Match the house format (the `ppcs-*` skills are the reference bar). Keep `description`/`when_to_use` tight; put detail in a `-reference.md`.
- Template: [skill-template.md](skill-template.md).
