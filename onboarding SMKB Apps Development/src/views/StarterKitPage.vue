<template>
  <div class="page">
    <h1>The Starter Kit</h1>
    <p class="lead">
      The starter kit is a single repository with 5 independent template folders.
      Each folder is a pre-wired, placeholder-filled starting point for one type of
      Power Platform component. You activate only the ones you need.
    </p>

    <div class="section">
      <h2>The 5 starters</h2>
      <div class="starter-list">
        <div v-for="starter in starters" :key="starter.folder" class="starter-item">
          <div class="starter-header">
            <span class="starter-icon">{{ starter.icon }}</span>
            <div>
              <div class="starter-folder">{{ starter.folder }}</div>
              <div class="starter-use">Use when: {{ starter.use }}</div>
            </div>
          </div>
          <div class="starter-skip">Skip when: {{ starter.skip }}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>The placeholder system</h2>
      <p>
        Every placeholder follows a clear naming convention. The <code>sol_</code> prefix
        is replaced with your solution's short name. Generic display names like
        <code>YourSolutionName</code> are replaced with the actual solution name.
      </p>

      <div class="placeholder-grid">
        <div v-for="ph in placeholders" :key="ph.string" class="placeholder-row">
          <code class="ph-string">{{ ph.string }}</code>
          <div class="ph-where">{{ ph.where }}</div>
        </div>
      </div>

      <h3>What the placeholder looks like in the actual file:</h3>
      <CodeBlock :code="entityXmlExample">
        <template #filename>SMKB - Dataverse Tables Starter/Entities/sol_example_table_a/Entity.xml</template>
      </CodeBlock>
      <CodeBlock :code="solutionXmlExample">
        <template #filename>SMKB - Dataverse Tables Starter/Other/Solution.xml</template>
      </CodeBlock>
    </div>

    <div class="section">
      <h2>Naming conventions</h2>
      <p>
        Every solution gets a <strong>short name</strong> — a 2–4 character lowercase prefix
        that becomes the namespace for all its components.
      </p>

      <div class="naming-table">
        <div class="naming-row naming-header">
          <div>What</div>
          <div>Pattern</div>
          <div>Example (Events solution)</div>
        </div>
        <div class="naming-row">
          <div>Short name (prefix)</div>
          <div><code>[2-4 chars]</code></div>
          <div><code>evt</code></div>
        </div>
        <div class="naming-row">
          <div>Solution unique name</div>
          <div><code>SMKB[DisplayName]</code></div>
          <div><code>SMKBEvents</code></div>
        </div>
        <div class="naming-row">
          <div>Table schema name</div>
          <div><code>[prefix]_[name]</code></div>
          <div><code>evt_registration</code></div>
        </div>
        <div class="naming-row">
          <div>Env var schema name</div>
          <div><code>[PREFIX]_[NAME]</code></div>
          <div><code>EVT_PORTAL_BASE_URL</code></div>
        </div>
        <div class="naming-row">
          <div>Folder name</div>
          <div><code>SMKB - [Name] - [Type]</code></div>
          <div><code>SMKB - Events - Dataverse Tables</code></div>
        </div>
      </div>

      <InfoCallout type="warning">
        Short names must be <strong>unique across all solutions in the environment</strong>.
        Two solutions with the same short name will collide in Dataverse — the second deploy
        silently overwrites the first. Currently registered: <code>cif</code> (Community Initiatives Fund).
        Check CLAUDE.md for the up-to-date list before committing to a name.
      </InfoCallout>
    </div>

    <div class="section">
      <h2>The activation flow</h2>
      <div class="activation-steps">
        <div v-for="(step, i) in activationSteps" :key="i" class="activation-step">
          <div class="activation-num">{{ i + 1 }}</div>
          <div>
            <div class="activation-title">{{ step.title }}</div>
            <div class="activation-desc">{{ step.desc }}</div>
          </div>
        </div>
      </div>
    </div>

    <ModuleNav module-id="starter-kit" />
  </div>
</template>

<script setup lang="ts">
import CodeBlock from '../components/CodeBlock.vue'
import InfoCallout from '../components/InfoCallout.vue'
import ModuleNav from '../components/ModuleNav.vue'

const starters = [
  {
    icon: '🗄️',
    folder: 'SMKB - Dataverse Tables Starter',
    use: 'you need custom data tables (registrations, bookings, applications)',
    skip: 'using only standard Dataverse tables or no data storage at all',
  },
  {
    icon: '⚙️',
    folder: 'SMKB - Environmental Variables Starter',
    use: 'you have config values that differ between Dev, Stage, and Prod (portal URLs, API endpoints)',
    skip: 'all config is hardcoded and identical across environments',
  },
  {
    icon: '⚡',
    folder: 'SMKB - Power Automate Flows Starter',
    use: 'you need automated workflows (send email on form submit, notify admin on new record)',
    skip: 'no automation needed',
  },
  {
    icon: '🖥️',
    folder: 'SMKB - Power Apps Starter',
    use: 'you need a staff-facing or admin interface inside the Power Apps runtime',
    skip: 'solution is public-facing only (use Power Pages instead)',
  },
  {
    icon: '🌐',
    folder: 'SMKB - Power Page Starter',
    use: 'you need a public-facing portal (registration forms, application pages)',
    skip: 'solution is internal staff only (use Power Apps instead)',
  },
]

const placeholders = [
  { string: 'YourSolutionName',    where: 'All starters — Solution.xml' },
  { string: 'sol_example_table_a', where: 'Tables Starter — Entity.xml, Customizations.xml' },
  { string: 'sol_EXAMPLE_VAR',     where: 'Env Vars Starter — folder name and XML' },
  { string: 'sol_example_flow',    where: 'Flows Starter — flow JSON, Solution.xml' },
  { string: 'sol_example_item',    where: 'Power Apps Starter — dataService.ts, types/' },
  { string: 'TODO-your-portal',    where: 'Power Pages Starter — deploy.mjs PORTAL_URL' },
]

const activationSteps = [
  { title: 'Choose which starters to activate', desc: 'Claude will ask at the start of every new engagement. Unused starters stay as-is — never deploy them.' },
  { title: 'Rename the starter folder', desc: 'SMKB - X Starter → SMKB - [Component Name] - [Type]. e.g. SMKB - Events - Dataverse Tables.' },
  { title: 'Replace all placeholders', desc: 'Find & replace: sol_ → evt_, YourSolutionName → SMKBEvents, etc. The deploy script blocks if any remain.' },
  { title: 'Run deploy.ps1 (or pnpm deploy)', desc: 'The script builds and deploys to Dev. Never to Stage or Prod.' },
]

const entityXmlExample = `<!-- Before activation -->
<EntityInfo>
  <schemaName>sol_example_table_a</schemaName>
  <displayName>Example Table A</displayName>
</EntityInfo>

<!-- After activation (Events solution, short name: evt) -->
<EntityInfo>
  <schemaName>evt_registration</schemaName>
  <displayName>Registration</displayName>
</EntityInfo>`

const solutionXmlExample = `<!-- Before activation -->
<SolutionManifest>
  <UniqueName>YourSolutionName</UniqueName>
  <LocalizedNames>
    <LocalizedName description="Your Solution Name" languagecode="1033" />
  </LocalizedNames>
</SolutionManifest>

<!-- After activation -->
<SolutionManifest>
  <UniqueName>SMKBEvents</UniqueName>
  <LocalizedNames>
    <LocalizedName description="SMKB – Events" languagecode="1033" />
  </LocalizedNames>
</SolutionManifest>`
</script>

<style scoped>
.page { max-width: 760px; }

h1 {
  font-size: var(--smkb-font-size-3xl);
  font-weight: var(--smkb-font-weight-bold);
  color: var(--smkb-color-text-primary);
  margin: 0 0 var(--smkb-space-4);
}

h3 {
  font-size: var(--smkb-font-size-base);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin: var(--smkb-space-6) 0 var(--smkb-space-2);
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

.starter-list {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-3);
}

.starter-item {
  padding: var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  background: var(--smkb-color-surface-subtle);
}

.starter-header {
  display: flex;
  gap: var(--smkb-space-3);
  align-items: flex-start;
  margin-bottom: var(--smkb-space-2);
}

.starter-icon { font-size: 1.5rem; }

.starter-folder {
  font-family: monospace;
  font-size: var(--smkb-font-size-sm);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin-bottom: var(--smkb-space-1);
}

.starter-use {
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-secondary);
}

.starter-skip {
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-tertiary);
  padding-left: 2.5rem;
}

.placeholder-grid {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-2);
  margin: var(--smkb-space-4) 0;
}

.placeholder-row {
  display: flex;
  gap: var(--smkb-space-4);
  align-items: baseline;
  font-size: var(--smkb-font-size-sm);
}

.ph-string {
  background: var(--smkb-color-surface-subtle);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-sm);
  padding: 2px 8px;
  font-family: monospace;
  min-width: 240px;
  flex-shrink: 0;
}

.ph-where {
  color: var(--smkb-color-text-tertiary);
}

.naming-table {
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
  font-size: var(--smkb-font-size-sm);
  margin-bottom: var(--smkb-space-4);
}

.naming-row {
  display: grid;
  grid-template-columns: 200px 180px 1fr;
  gap: var(--smkb-space-4);
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border-bottom: 1px solid var(--smkb-color-border);
  align-items: center;
  color: var(--smkb-color-text-secondary);
}

.naming-row:last-child { border-bottom: none; }

.naming-header {
  background: var(--smkb-color-surface-raised);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
}

.activation-steps {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-4);
}

.activation-step {
  display: flex;
  gap: var(--smkb-space-4);
  align-items: flex-start;
}

.activation-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--smkb-color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--smkb-font-weight-bold);
  font-size: var(--smkb-font-size-sm);
  flex-shrink: 0;
}

.activation-title {
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  font-size: var(--smkb-font-size-sm);
  margin-bottom: var(--smkb-space-1);
}

.activation-desc {
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-secondary);
  line-height: 1.5;
}
</style>
