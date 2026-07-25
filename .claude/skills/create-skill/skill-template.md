---
name: {{OWNER PREFIX}} — {{SKILL_TITLE}}
description: >-
  {{What the skill does + trigger keywords. Keep under ~1536 chars combined with when_to_use.}}
when_to_use: >-
  {{Natural-language phrases the user would say to trigger this.}}
argument-hint: "{{[arg1] [arg2]}}"
arguments: [{{arg1}}, {{arg2}}]
# disable-model-invocation: true   # uncomment for side-effect ops (deploy, apply, init, push)
# context: fork                    # uncomment for read-only analysis in an isolated subagent
# agent: Explore                   # use with context: fork for read-only skills
allowed-tools: Read Edit           # expand: Write Grep Glob Bash(pac *) Bash(pnpm *) Bash(powershell *) Bash(node *)
---

## Context

<!-- What problem does this skill solve? What silent failure does it prevent? -->
<!-- Cross-reference the authoritative doc: root CLAUDE.md rule, the starter README, docs/, or a *-reference.md. -->
<!-- Relative paths: from <starter>/.claude/skills/<name>/  →  ../../../ = starter, ../../../../ = repo root.
     From a root skill  →  ../../../ = repo root. -->

## Steps

<!-- Numbered. Show the EXACT command in a fenced block, not a description. Use **PAUSE** for mandatory
     human handoffs (portal steps, confirmations, deploys handled by a separate skill). -->

1. <!-- First step -->
2. <!-- Second step -->

## Error Handling

<!-- Bulleted symptom → cause → fix. Reference the relevant guard / lint rule / troubleshoot skill. -->

## Notes

<!-- Gotchas, ordering constraints, and cross-references to sibling skills. Point to the -reference.md if any. -->
