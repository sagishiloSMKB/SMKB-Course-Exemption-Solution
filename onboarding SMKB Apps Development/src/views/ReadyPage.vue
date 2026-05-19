<template>
  <div class="page">
    <div class="celebration">
      <div class="celebration-icon">🎉</div>
      <h1>You're Ready</h1>
      <p class="lead">
        You now understand the full SMKB development system. Here's your quick reference
        for everything you need to start contributing.
      </p>
      <div v-if="allComplete" class="complete-badge">
        All 10 modules complete — well done.
      </div>
      <div v-else class="incomplete-note">
        {{ completionPercent }}% complete — finish the remaining modules before your first Init Project.
      </div>
    </div>

    <div class="section">
      <h2>Quick reference</h2>
      <div class="ref-cards">
        <div class="ref-card">
          <div class="ref-title">Start a new session</div>
          <div class="ref-steps">
            <div class="ref-step">Open Claude Code in the project root</div>
            <div class="ref-step">Claude reads CLAUDE.md automatically and runs pre-flight checks</div>
            <div class="ref-step">If remote is the starter kit: you'll be prompted to run Init Project first</div>
          </div>
        </div>
        <div class="ref-card">
          <div class="ref-title">Init a new project</div>
          <div class="ref-steps">
            <div class="ref-step">Say: <code>init project</code> to Claude</div>
            <div class="ref-step">Claude walks through INIT_PROJECT.md step by step</div>
            <div class="ref-step">You handle GitHub, PAC CLI, and product specifications</div>
          </div>
        </div>
        <div class="ref-card">
          <div class="ref-title">Deploy to Dev</div>
          <div class="ref-steps">
            <div class="ref-step">Run <code>deploy.ps1</code> from the starter folder, or <code>pnpm deploy</code> for Power Pages</div>
            <div class="ref-step">Script will block if any placeholders remain or wrong environment is targeted</div>
            <div class="ref-step">Stage and Prod: use the Power Platform Pipeline only</div>
          </div>
        </div>
        <div class="ref-card">
          <div class="ref-title">If something goes wrong</div>
          <div class="ref-steps">
            <div class="ref-step">Check <code>STARTER_AGENT_FEEDBACK_AND_NOTES.md</code> for known issues and workarounds</div>
            <div class="ref-step">Check the starter's own README.md for component-specific guidance</div>
            <div class="ref-step">Ask Claude — it has the full context of CLAUDE.md and INIT_PROJECT.md</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Key files to know</h2>
      <div class="files-list">
        <div v-for="file in keyFiles" :key="file.path" class="file-item">
          <code class="file-path">{{ file.path }}</code>
          <div class="file-desc">{{ file.desc }}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>The 5 non-negotiable rules</h2>
      <div class="rules-list">
        <div v-for="(rule, i) in rules" :key="i" class="rule-item">
          <span class="rule-num">{{ i + 1 }}</span>
          <span>{{ rule }}</span>
        </div>
      </div>
    </div>

    <InfoCallout type="note">
      <strong>This folder will be removed during Init Project (Step 3b).</strong>
      That's by design — the onboarding app is a local learning tool,
      not part of any solution repository. After Init Project, open Claude Code
      and say "init project" to begin your first solution.
    </InfoCallout>

    <div class="ready-close">
      <div class="ready-close-title">Close this app and open Claude. You're ready.</div>
      <div class="ready-close-sub">Say "init project" to start building.</div>
    </div>

    <ModuleNav module-id="ready" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { modules } from '../router'
import { useProgress } from '../composables/useProgress'
import InfoCallout from '../components/InfoCallout.vue'
import ModuleNav from '../components/ModuleNav.vue'

const { isComplete, completionPercent } = useProgress()
const allComplete = computed(() => modules.every(m => isComplete(m.id)))

const keyFiles = [
  { path: 'CLAUDE.md',                             desc: 'AI assistant rules — read automatically at session start' },
  { path: 'INIT_PROJECT.md',                       desc: 'Step-by-step guide for initializing a new solution from this starter' },
  { path: 'STARTER_AGENT_FEEDBACK_AND_NOTES.md',   desc: 'Known issues, workarounds, and lessons from previous Init Project runs' },
  { path: 'SMKB - X Starter/README.md',            desc: 'Activation guide for each starter — read before activating' },
  { path: 'SMKB - X Starter/CLAUDE.md',            desc: 'Component-specific AI rules (Power Pages has one)' },
  { path: '.claude/settings.json',                 desc: 'Claude Code permission rules — what is auto-approved vs hard-blocked' },
]

const rules = [
  'Never deploy with unreplaced placeholder strings — the deploy script will block it, but never try to bypass it.',
  'Never deploy to Stage or Production directly — only via Power Platform Pipeline.',
  'Always verify the PAC auth profile URL before any deploy — the profile name is unreliable.',
  'Never use v-html in Vue components — always v-text or component slots.',
  'Run guid-freshen.ps1 exactly once before the first Power Pages deploy — never a second time.',
]
</script>

<style scoped>
.page { max-width: 760px; }

.celebration {
  text-align: center;
  padding: var(--smkb-space-8) 0;
  margin-bottom: var(--smkb-space-10);
}

.celebration-icon {
  font-size: 3rem;
  margin-bottom: var(--smkb-space-4);
}

h1 {
  font-size: 2.5rem;
  font-weight: var(--smkb-font-weight-bold);
  color: var(--smkb-color-text-primary);
  margin: 0 0 var(--smkb-space-4);
}

.lead {
  font-size: var(--smkb-font-size-lg);
  color: var(--smkb-color-text-secondary);
  line-height: 1.6;
  max-width: 520px;
  margin: 0 auto var(--smkb-space-5);
}

.complete-badge {
  display: inline-block;
  background: color-mix(in srgb, var(--smkb-color-success) 15%, transparent);
  color: var(--smkb-color-success);
  border: 1px solid var(--smkb-color-success);
  border-radius: var(--smkb-radius-md);
  padding: var(--smkb-space-2) var(--smkb-space-4);
  font-weight: var(--smkb-font-weight-semibold);
  font-size: var(--smkb-font-size-sm);
}

.incomplete-note {
  display: inline-block;
  background: color-mix(in srgb, var(--smkb-color-warning) 12%, transparent);
  color: var(--smkb-color-warning);
  border-radius: var(--smkb-radius-md);
  padding: var(--smkb-space-2) var(--smkb-space-4);
  font-size: var(--smkb-font-size-sm);
}

.section {
  margin-bottom: var(--smkb-space-10);
}

.section h2 {
  font-size: var(--smkb-font-size-xl);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin: 0 0 var(--smkb-space-5);
}

code {
  background: var(--smkb-color-surface-subtle);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-sm);
  padding: 2px 6px;
  font-family: monospace;
  font-size: 0.9em;
}

.ref-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--smkb-space-4);
}

.ref-card {
  padding: var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  background: var(--smkb-color-surface-subtle);
}

.ref-title {
  font-weight: var(--smkb-font-weight-semibold);
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-primary);
  margin-bottom: var(--smkb-space-3);
}

.ref-steps {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-2);
}

.ref-step {
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-secondary);
  line-height: 1.5;
  padding-left: var(--smkb-space-4);
  border-left: 2px solid var(--smkb-color-border);
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-3);
}

.file-item {
  display: flex;
  gap: var(--smkb-space-4);
  align-items: baseline;
  padding: var(--smkb-space-2) 0;
  border-bottom: 1px solid var(--smkb-color-border);
  font-size: var(--smkb-font-size-sm);
}

.file-item:last-child { border-bottom: none; }

.file-path { min-width: 310px; flex-shrink: 0; }
.file-desc { color: var(--smkb-color-text-secondary); }

.rules-list {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-3);
}

.rule-item {
  display: flex;
  gap: var(--smkb-space-3);
  align-items: flex-start;
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-secondary);
  line-height: 1.5;
}

.rule-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--smkb-color-destructive);
  color: white;
  font-size: 11px;
  font-weight: var(--smkb-font-weight-bold);
  flex-shrink: 0;
}

.ready-close {
  text-align: center;
  padding: var(--smkb-space-10) 0 var(--smkb-space-6);
  border-top: 1px solid var(--smkb-color-border);
  margin-top: var(--smkb-space-8);
}

.ready-close-title {
  font-size: var(--smkb-font-size-xl);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin-bottom: var(--smkb-space-2);
}

.ready-close-sub {
  color: var(--smkb-color-text-secondary);
}
</style>
