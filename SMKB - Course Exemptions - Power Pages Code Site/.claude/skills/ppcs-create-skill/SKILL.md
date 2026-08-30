---
name: Power Pages Code Site — Create Skill
description: >-
  Scaffolds a new ppcs-* skill with correct frontmatter, directory structure,
  and optional reference file stubs. Use before writing any new PPCS skill.
when_to_use: >-
  User says "create a skill", "add a skill", "new ppcs skill", or is about to
  write a SKILL.md for this Power Pages Code Site project.
argument-hint: "<skill-name> [true|false for reference file]"
arguments: [skill-name, has-reference-file]
allowed-tools: Read Write
---

## Context

This is the meta-skill for this repository. All other `ppcs-*` skills were
scaffolded using this skill. Use it to maintain consistency when adding new
Power Pages Code Site skills to `.claude/skills/`.

The canonical template is in `skill-template.md` in this directory. Edit that
file to change the default structure for all future skills.

## Steps

1. **Derive the directory name.**
   Strip any `ppcs-` prefix the user may have included: if `$skill-name` starts
   with `ppcs-`, use it as-is; otherwise prefix it: `ppcs-$skill-name`.
   Final directory: `.claude/skills/ppcs-$skill-name/`

2. **Derive the display title.**
   Title-case the skill name (replace hyphens with spaces, capitalize each word).
   Example: `enable-web-api` → `Enable Web Api`

3. **Read the template.**
   Read `skill-template.md` from `${CLAUDE_SKILL_DIR}/skill-template.md`.

4. **Write `SKILL.md`.**
   Create `.claude/skills/ppcs-$skill-name/SKILL.md` by substituting:
   - `{{SKILL_TITLE}}` → derived display title from step 2
   - Leave all other `{{...}}` placeholders for the author to fill in.

5. **If `$has-reference-file` is `true`, also create the reference file.**
   Write `.claude/skills/ppcs-$skill-name/$skill-name-reference.md` with:
   ```markdown
   # ppcs-$skill-name Reference

   <!-- Detailed reference content, loaded lazily by the skill -->
   <!-- Keep SKILL.md under ~400 lines; put details here -->
   ```
   Then append this line to the `## Notes` section of the new `SKILL.md`:
   ```
   For detailed reference, see [$skill-name-reference.md]($skill-name-reference.md)
   ```

6. **Report.**
   Tell the user what was created and remind them to:
   - Fill in all `{{...}}` placeholders in SKILL.md
   - Set `disable-model-invocation: true` if the skill has side effects (deploy, upload, promote)
   - Add specific `allowed-tools` beyond the default `Read Edit`
   - Keep the `description` + `when_to_use` combined under 1,536 chars

## Error Handling

- If `.claude/skills/ppcs-$skill-name/SKILL.md` already exists, **stop and
  warn** — do not overwrite an existing skill.
- If `skill-template.md` is missing from this skill's directory, create a
  minimal SKILL.md with just the frontmatter defaults and the four section stubs.

## Notes

Skills are automatically available in Claude Code as soon as the files are
written — no restart required for content changes. Directory/file creation
does require restarting Claude Code to appear in the `/` menu.

All skills in this repo follow the `ppcs-` prefix convention. See the plan at
`~/.claude/plans/i-want-you-to-deep-rossum.md` for the full architecture.
