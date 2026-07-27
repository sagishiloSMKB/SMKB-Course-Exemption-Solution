# Starter Feedback & Notes — log in the REPO ROOT instead

**Do not log here.** Use the repo-root
[`STARTER_AGENT_FEEDBACK_AND_NOTES.md`](../STARTER_AGENT_FEEDBACK_AND_NOTES.md) for everything,
including findings that are specific to this starter.

Why: this used to be a second, parallel log. In the kit's first real end-to-end run the Code Site
generated most of the findings and **every one of them was written to the root log** — this file
stayed empty. Two locations with one in use is worse than one: a reader cannot tell which is
authoritative, and an auditor has to check both to know whether the mandatory logging happened.

The root log is what the Init Project flow references (the Step 10b.F prompts), what the "Log
Everything" standing instruction points at, and what gets reviewed when the starter kit is improved.

This file is kept only as a signpost, so the split is not re-created.
