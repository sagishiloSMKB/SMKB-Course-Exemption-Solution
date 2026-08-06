<template>
  <div class="page">
    <h1>Working with Claude</h1>
    <p class="lead">
      Claude Code is the AI assistant that runs inside this repository. It reads CLAUDE.md
      automatically at session start and follows the rules defined there. Understanding what
      Claude can and cannot do is essential for working safely and efficiently.
    </p>

    <div class="section">
      <h2>What Claude does automatically</h2>
      <div class="capability-list">
        <div v-for="item in canDo" :key="item" class="capability-item capability-can">
          <span class="cap-icon">✓</span>
          <span>{{ item }}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>What Claude cannot do (hard blocks)</h2>
      <div class="capability-list">
        <div v-for="item in cannotDo" :key="item.text" class="capability-item capability-cannot">
          <span class="cap-icon">✗</span>
          <div>
            <div>{{ item.text }}</div>
            <div class="cap-why">{{ item.why }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>The permission system</h2>
      <p>
        Claude Code's behavior is controlled by <code>.claude/settings.json</code>.
        It has two lists: <strong>allow</strong> (auto-approved, no prompt) and
        <strong>deny</strong> (hard-blocked, no override possible).
        Everything not on either list requires your approval each time.
      </p>

      <div class="permission-grid">
        <div class="perm-card">
          <div class="perm-label perm-allow">Auto-approved</div>
          <div class="perm-desc">Read/search all files, run git status/log/diff, run pnpm build/lint, run pac auth list</div>
        </div>
        <div class="perm-card">
          <div class="perm-label perm-prompt">Ask each time</div>
          <div class="perm-desc">git push, git commit, pnpm install, writing/editing files</div>
        </div>
        <div class="perm-card">
          <div class="perm-label perm-deny">Hard-blocked</div>
          <div class="perm-desc">pac pages upload, pac solution import, pac code push, git push --force, git reset --hard</div>
        </div>
      </div>

      <CodeBlock :code="settingsExample">
        <template #filename>.claude/settings.json</template>
      </CodeBlock>
    </div>

    <div class="section">
      <h2>The Init Project flow</h2>
      <p>
        Init Project is a guided, step-by-step setup process defined in
        <code>INIT_PROJECT.md</code>. Claude leads each step and confirms with you before
        proceeding. You handle the things only a human can do (GitHub, PAC CLI deploys,
        product specifications).
      </p>

      <div class="who-does-what">
        <div class="wdw-row wdw-header">
          <div>Step</div>
          <div>Who does it</div>
          <div>Why</div>
        </div>
        <div v-for="row in whoDoesWhat" :key="row.step" class="wdw-row">
          <div>{{ row.step }}</div>
          <div :class="row.who === 'Claude' ? 'wdw-claude' : 'wdw-developer'">{{ row.who }}</div>
          <div class="wdw-why">{{ row.why }}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Plan mode</h2>
      <p>
        Once you have given Claude the specifications (Init Project Phase 4), it works out
        the architecture and enters <strong>Plan mode</strong> for Phase 5. In plan mode,
        Claude reads code and writes a plan file — but makes no changes until you approve
        the plan. This prevents Claude from starting the wrong implementation while you
        review the approach.
      </p>

      <InfoCallout type="note">
        Plan mode is triggered automatically at Phase 5. You don't need to do anything
        special — Claude enters it once it has your specifications and exits only after
        you approve the plan. That approval is also where Claude tells you
        <strong>which starters it is activating and why</strong> — you don't pick them
        from a list.
      </InfoCallout>
    </div>

    <InfoCallout type="rule">
      <strong>Critical rule:</strong> Never say "yes" to a deploy or push you didn't
      explicitly request in that message. Claude remembers approvals for a session —
      but approving one deploy does NOT authorize the next one.
      Each deploy and each push requires a fresh explicit request from you.
    </InfoCallout>

    <ModuleNav module-id="claude" />
  </div>
</template>

<script setup lang="ts">
import CodeBlock from '../components/CodeBlock.vue'
import InfoCallout from '../components/InfoCallout.vue'
import ModuleNav from '../components/ModuleNav.vue'

const canDo = [
  'Read any file in the repository (auto-approved)',
  'Search for patterns, symbols, and content across all files',
  'Rename folders and replace placeholder strings',
  'Write and edit Vue, TypeScript, JSON, and XML files',
  'Run git status, git log, git diff — read-only git commands',
  'Run pnpm build, pnpm lint — build and validation',
  'Run pac auth list, pac pages list — read-only PAC commands',
  'Stage files and create commits (with your approval)',
  'Enter Plan mode and write an implementation plan',
]

const cannotDo = [
  { text: 'Deploy to Power Platform (pac pages upload, pac solution import, pac code push)', why: 'Hard-blocked — must be an explicit user request each time, not an automatic step' },
  { text: 'Switch PAC auth profiles (pac auth select)', why: 'Switching the active profile could silently redirect all subsequent commands to the wrong environment' },
  { text: 'Force-push or reset --hard', why: 'Destructive git operations that can permanently destroy work' },
  { text: 'Create GitHub repositories', why: 'gh CLI is not installed — you create repos manually on GitHub.com' },
  { text: 'Deploy to Stage or Production', why: 'These environments are reached via Power Platform Pipeline only — never by direct command' },
]

const whoDoesWhat = [
  { step: 'Check git remote', who: 'Claude', why: 'Automatic pre-flight check every session' },
  { step: 'Check PAC auth profile', who: 'Claude', why: 'Reads pac auth list; you confirm the profile is correct' },
  { step: 'Create GitHub repo', who: 'Developer', why: 'Requires GitHub account; Claude cannot access the web UI' },
  { step: 'git remote remove/add', who: 'Developer', why: 'Claude stages the commands; you run them (push is a prompt)' },
  { step: 'Rename starter folders', who: 'Claude', why: 'File system operations — auto-approved' },
  { step: 'Replace placeholders', who: 'Claude', why: 'Search-and-replace across files — auto-approved' },
  { step: 'pac code init', who: 'Developer', why: 'PAC CLI on Windows; Claude shows the command, you run it' },
  { step: 'Provide product specs', who: 'Developer', why: 'Only you know what the solution should do' },
  { step: 'Approve implementation plan', who: 'Developer', why: 'Plan mode — Claude writes the plan, you decide before anything changes' },
  { step: 'Deploy to Dev', who: 'Developer', why: 'Hard-blocked command; you run deploy.ps1 explicitly' },
]

const settingsExample = `{
  "permissions": {
    "allow": [
      "Read(**)",
      "Glob(**)",
      "Grep(**)",
      "Bash(git status)",
      "Bash(pac auth list)",
      "Bash(pnpm run build)"
    ],
    "deny": [
      "Bash(pac pages upload*)",
      "Bash(pac solution import*)",
      "Bash(pac code push*)",
      "Bash(git push*--force*)",
      "Bash(git reset*--hard*)"
    ]
  }
}`
</script>

<style scoped>
.page { max-width: 760px; }

h1 {
  font-size: var(--smkb-font-size-3xl);
  font-weight: var(--smkb-font-weight-bold);
  color: var(--smkb-color-text-primary);
  margin: 0 0 var(--smkb-space-4);
}

.lead {
  font-size: var(--smkb-font-size-lg);
  color: var(--smkb-color-text-secondary);
  line-height: 1.6;
  margin-bottom: var(--smkb-space-8);
}

.section {
  margin-bottom: var(--smkb-space-10);
}

.section h2 {
  font-size: var(--smkb-font-size-xl);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin: 0 0 var(--smkb-space-4);
}

.section p {
  color: var(--smkb-color-text-secondary);
  line-height: 1.7;
  margin-bottom: var(--smkb-space-4);
}

code {
  background: var(--smkb-color-surface-subtle);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-sm);
  padding: 2px 6px;
  font-family: monospace;
  font-size: 0.9em;
}

.capability-list {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-2);
}

.capability-item {
  display: flex;
  gap: var(--smkb-space-3);
  align-items: flex-start;
  padding: var(--smkb-space-3);
  border-radius: var(--smkb-radius-md);
  font-size: var(--smkb-font-size-sm);
  line-height: 1.5;
}

.capability-can {
  background: color-mix(in srgb, var(--smkb-color-success) 8%, transparent);
  color: var(--smkb-color-text-secondary);
}

.capability-cannot {
  background: color-mix(in srgb, var(--smkb-color-destructive) 6%, transparent);
  color: var(--smkb-color-text-secondary);
}

.cap-icon {
  font-weight: var(--smkb-font-weight-bold);
  flex-shrink: 0;
}

.capability-can .cap-icon { color: var(--smkb-color-success); }
.capability-cannot .cap-icon { color: var(--smkb-color-destructive); }

.cap-why {
  font-size: 11px;
  color: var(--smkb-color-text-tertiary);
  margin-top: 2px;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--smkb-space-3);
  margin-bottom: var(--smkb-space-4);
}

.perm-card {
  padding: var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  font-size: var(--smkb-font-size-sm);
}

.perm-label {
  font-weight: var(--smkb-font-weight-semibold);
  font-size: var(--smkb-font-size-sm);
  margin-bottom: var(--smkb-space-2);
  padding: 2px 8px;
  border-radius: var(--smkb-radius-sm);
  display: inline-block;
}

.perm-allow  { background: color-mix(in srgb, var(--smkb-color-success) 15%, transparent); color: var(--smkb-color-success); }
.perm-prompt { background: color-mix(in srgb, var(--smkb-color-warning) 15%, transparent); color: var(--smkb-color-warning); }
.perm-deny   { background: color-mix(in srgb, var(--smkb-color-destructive) 15%, transparent); color: var(--smkb-color-destructive); }

.perm-desc {
  color: var(--smkb-color-text-secondary);
  line-height: 1.5;
}

.who-does-what {
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
  font-size: var(--smkb-font-size-sm);
}

.wdw-row {
  display: grid;
  grid-template-columns: 220px 110px 1fr;
  gap: var(--smkb-space-4);
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border-bottom: 1px solid var(--smkb-color-border);
  align-items: start;
  line-height: 1.5;
  color: var(--smkb-color-text-secondary);
}

.wdw-row:last-child { border-bottom: none; }

.wdw-header {
  background: var(--smkb-color-surface-raised);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
}

.wdw-claude    { color: var(--smkb-color-primary); font-weight: var(--smkb-font-weight-semibold); }
.wdw-developer { color: var(--smkb-color-success); font-weight: var(--smkb-font-weight-semibold); }

.wdw-why {
  color: var(--smkb-color-text-tertiary);
  font-size: 12px;
}
</style>
