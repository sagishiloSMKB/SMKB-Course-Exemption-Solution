---
name: Power Pages Code Site — {{SKILL_TITLE}}
description: >-
  {{DESCRIPTION — keep under 200 chars combined with when_to_use}}
when_to_use: >-
  {{TRIGGER PHRASES — natural language the user would say}}
argument-hint: "{{[arg1] [arg2]}}"
arguments: [{{arg1}}, {{arg2}}]
# disable-model-invocation: true   # uncomment for side-effect ops (deploy, upload, promote)
# context: fork                    # uncomment for read-only analysis in isolated subagent
# agent: Explore                   # use with context: fork for read-only skills
allowed-tools: Read Edit           # expand as needed: Bash(pac *) Bash(npm *) Write Grep
---

## Context

<!-- What problem does this skill solve? What failure mode does it prevent? -->
<!-- Reference the relevant CLAUDE.md section if applicable. -->

## Steps

<!-- Number the steps. Use **PAUSE** for mandatory user confirmations. -->
<!-- For commands: show the exact command, not a description of it. -->

1. <!-- First step -->
2. <!-- Second step -->

## Error Handling

<!-- What can go wrong? What should Claude do if a step fails? -->
<!-- Reference troubleshoot-reference.md for common failure patterns. -->

## Notes

<!-- Any gotchas, constraints, or cross-references to other ppcs-* skills. -->
