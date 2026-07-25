<template>
  <div class="page">
    <h1>The Mental Model</h1>
    <p class="lead">
      Before writing any code, understand the environment you're building in,
      the tools you'll use, and why the system is designed this way.
    </p>

    <div class="section">
      <h2>Why Power Platform at Seminar Hakibutzim</h2>
      <p>
        The college already runs on the Microsoft ecosystem — Teams, SharePoint, Exchange,
        and Azure Active Directory all live in the same Microsoft 365 tenant.
        <strong>Power Platform is part of that same tenant.</strong>
      </p>
      <p>
        This means every app and portal we build inherits the college's existing identity,
        security policies, and data governance automatically — no separate vendor,
        no external SaaS accounts, no data leaving the organization's controlled environment.
        A student or staff member logs in with the same account they use for email.
      </p>
      <div class="tenant-diagram">
        <div class="tenant-box">
          <div class="tenant-label">Seminar Hakibutzim Microsoft 365 Tenant</div>
          <div class="tenant-items">
            <div class="tenant-item">Teams</div>
            <div class="tenant-item">SharePoint</div>
            <div class="tenant-item">Azure AD</div>
            <div class="tenant-item tenant-item--highlight">Power Platform</div>
            <div class="tenant-item tenant-item--highlight">Dataverse</div>
            <div class="tenant-item tenant-item--highlight">Our Apps</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>What you build with — the 5 Power Platform tools</h2>
      <p>
        Power Platform is not one product but a suite of tools that work together.
        At SMKB we use five of them:
      </p>
      <div class="tools-table">
        <div class="tool-row tool-header">
          <div>Tool</div>
          <div>What it is</div>
          <div>We use it for</div>
        </div>
        <div v-for="tool in tools" :key="tool.name" class="tool-row">
          <div class="tool-name">
            <span class="tool-badge" :style="{ background: tool.color }">{{ tool.abbr }}</span>
            {{ tool.name }}
          </div>
          <div class="tool-what">{{ tool.what }}</div>
          <div class="tool-use">{{ tool.use }}</div>
        </div>
      </div>
      <p class="table-note">
        Not every solution uses all five. A simple project might only need Dataverse + Power Automate.
        A complex one might use all of them.
      </p>
    </div>

    <div class="section">
      <h2>How you develop</h2>
      <p>
        Despite being a cloud platform, day-to-day development happens locally on your machine —
        in VS Code or Cursor, with an AI agent writing most of the code from your specifications.
        The finished code then gets pushed to the cloud environment via PAC CLI.
      </p>

      <div class="workflow">
        <div class="workflow-step">
          <div class="wf-icon">💻</div>
          <div class="wf-title">IDE</div>
          <div class="wf-desc">VS Code or Cursor<br><span class="wf-note">Cursor is an AI-first IDE built on VS Code</span></div>
        </div>
        <div class="workflow-arrow">→</div>
        <div class="workflow-step">
          <div class="wf-icon">🤖</div>
          <div class="wf-title">AI Agent</div>
          <div class="wf-desc">Claude or Cursor AI<br><span class="wf-note">Writes Vue/TS code from your specs</span></div>
        </div>
        <div class="workflow-arrow">→</div>
        <div class="workflow-step">
          <div class="wf-icon">⚡</div>
          <div class="wf-title">Local Preview</div>
          <div class="wf-desc"><code>pnpm dev</code><br><span class="wf-note">Vite dev server at localhost:5173</span></div>
        </div>
        <div class="workflow-arrow">→</div>
        <div class="workflow-step">
          <div class="wf-icon">🚀</div>
          <div class="wf-title">PAC CLI</div>
          <div class="wf-desc">Deploys to Dev environment<br><span class="wf-note">The bridge to the cloud</span></div>
        </div>
        <div class="workflow-arrow">→</div>
        <div class="workflow-step">
          <div class="wf-icon">☁️</div>
          <div class="wf-title">Power Platform</div>
          <div class="wf-desc">SMKB-Apps-Dev<br><span class="wf-note">Live in the cloud</span></div>
        </div>
      </div>

      <InfoCallout type="note">
        You develop and preview locally with no cloud connection needed.
        The AI agent builds the code, you review it, and PAC CLI pushes it when you're ready.
        The cloud environment is only involved at deploy time.
      </InfoCallout>
    </div>

    <div class="section">
      <h2>What is PAC CLI?</h2>
      <p>
        <strong>PAC CLI</strong> (Microsoft Power Platform CLI) is a Windows command-line tool
        that acts as the bridge between your local files and the Power Platform cloud environment.
        Without it, there is no way to move your locally-written code into the platform.
      </p>
      <p>
        Power Platform stores everything — apps, pages, tables, flows — as records in Dataverse.
        When you write a Vue component locally, it's just a file on your disk.
        PAC CLI is what turns that file into a live record in the cloud.
      </p>

      <div class="pac-commands">
        <div class="pac-command">
          <code class="pac-cmd">pac auth create --url &lt;environment-url&gt;</code>
          <div class="pac-desc">Authenticate to a Power Platform environment. Stores a named profile so you don't re-authenticate every time.</div>
        </div>
        <div class="pac-command">
          <code class="pac-cmd">pac code push</code>
          <div class="pac-desc">Upload a compiled Vue/TypeScript app to a Power Apps Code App record in the cloud.</div>
        </div>
        <div class="pac-command">
          <code class="pac-cmd">pac pages upload</code>
          <div class="pac-desc">Upload Power Pages portal files (YAML + built assets) to the Dataverse environment.</div>
        </div>
        <div class="pac-command">
          <code class="pac-cmd">pac solution import</code>
          <div class="pac-desc">Import a solution package (tables, flows, env vars) into the environment.</div>
        </div>
      </div>

      <InfoCallout type="note">
        Claude handles all file work and can run deploy commands — but only when you explicitly
        say "deploy". It never deploys autonomously. You stay in control of when and what gets
        pushed to the cloud.
      </InfoCallout>
    </div>

    <div class="section">
      <h2>What is a "solution"?</h2>
      <p>
        In Power Platform, a <strong>solution</strong> is the named container that holds
        all the components for one project. Think of it as a logical grouping:
        everything that belongs to "Events Management" lives in the SMKBEvents solution.
      </p>
      <div class="solution-example">
        <div class="solution-header">
          <span class="solution-name-badge">SMKBEvents</span>
          <span class="solution-label">— one solution, multiple components</span>
        </div>
        <div class="solution-components">
          <div v-for="comp in solutionComponents" :key="comp.type" class="solution-component">
            <span class="comp-icon">{{ comp.icon }}</span>
            <div>
              <div class="comp-type">{{ comp.type }}</div>
              <div class="comp-example">{{ comp.example }}</div>
            </div>
          </div>
        </div>
      </div>
      <p>
        The solution travels as a unit through the pipeline: Dev → Stage → Production.
        If a component is not inside the solution, it stays behind when the pipeline runs.
        This is why linking components to the solution is a critical step after every deploy.
      </p>
    </div>

    <div class="section">
      <h2>The starter kit</h2>
      <p>
        Building a Power Platform solution from scratch means creating XML manifests, YAML portal
        files, flow JSON schemas, and TypeScript scaffolding — all correctly wired together.
        Getting this right on a blank canvas is slow and error-prone.
      </p>
      <p>
        <strong>This starter kit contains everything pre-wired.</strong>
        It has 5 template folders — one per component type. You pick the ones your solution
        needs, fill in your names and schemas, and deploy. The boilerplate is already correct.
      </p>
      <div class="starters-list">
        <div v-for="starter in starters" :key="starter.folder" class="starter-item">
          <span class="starter-icon">{{ starter.icon }}</span>
          <div>
            <div class="starter-folder">{{ starter.folder }}</div>
            <div class="starter-desc">{{ starter.desc }}</div>
          </div>
        </div>
      </div>

      <InfoCallout type="tip">
        You don't activate all 5 starters for every solution. A simple automation-only
        solution might only need Flows + Environmental Variables. A public-facing registration
        system needs Pages + Tables + Flows. Choose only what the solution actually requires.
      </InfoCallout>
    </div>

    <ModuleNav module-id="mental-model" />
  </div>
</template>

<script setup lang="ts">
import InfoCallout from '../components/InfoCallout.vue'
import ModuleNav from '../components/ModuleNav.vue'

const tools = [
  {
    abbr: 'DV',
    name: 'Dataverse',
    color: '#0078d4',
    what: 'Cloud relational database, hosted in Azure within the SMKB tenant',
    use: 'Storing all solution data: registrations, bookings, applications, staff records',
  },
  {
    abbr: 'PA',
    name: 'Power Apps Code App',
    color: '#742774',
    what: 'A Vue 3 + TypeScript SPA that runs inside the Power Apps runtime',
    use: 'Staff-facing and internal management interfaces (review screens, admin tools)',
  },
  {
    abbr: 'AU',
    name: 'Power Automate',
    color: '#0066ff',
    what: 'Cloud flows: event-triggered automation running in the platform',
    use: 'Sending confirmation emails, notifying admins, processing form submissions',
  },
  {
    abbr: 'PP',
    name: 'Power Pages',
    color: '#00b0f0',
    what: 'A web portal that serves public-facing pages, also built with Vue 3',
    use: 'Public registration forms, scholarship applications, event sign-ups',
  },
  {
    abbr: 'PL',
    name: 'Pipelines',
    color: '#107c10',
    what: "Power Platform's built-in release management system",
    use: 'Promoting the solution from Dev → Stage → Production automatically',
  },
]

const solutionComponents = [
  { icon: '🗄️', type: 'Dataverse table',     example: 'smkb_evt_Registration' },
  { icon: '⚡',  type: 'Power Automate flow', example: 'smkb_evt_SendConfirmation' },
  { icon: '⚙️',  type: 'Environment variable', example: 'smkb_evt_PortalBaseUrl (differs per env)' },
  { icon: '🌐',  type: 'Power Pages portal',   example: 'Public events registration site' },
  { icon: '🖥️',  type: 'Power Apps Code App',  example: 'Internal events backoffice' },
]

const starters = [
  {
    icon: '🗄️',
    folder: 'SMKB - Dataverse Tables Starter',
    desc: 'Custom table schemas (columns, forms, views) — the data layer of your solution',
  },
  {
    icon: '⚙️',
    folder: 'SMKB - Environmental Variables Starter',
    desc: 'Config values that differ between Dev, Stage, and Prod (portal URLs, API keys)',
  },
  {
    icon: '⚡',
    folder: 'SMKB - Power Automate Flows Starter',
    desc: 'Cloud flow JSON templates pre-wired with the correct schema and connection references',
  },
  {
    icon: '🖥️',
    folder: 'SMKB - Power Apps Starter',
    desc: 'Vue 3 + TypeScript SPA scaffold for staff-facing apps inside the Power Apps runtime',
  },
  {
    icon: '🌐',
    folder: 'SMKB - Power Pages Code Site Starter',
    desc: 'Power Pages Code Site: a Vue 3 SPA uploaded via PAC (pac pages upload-code-site)',
  },
]
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

/* Tenant diagram */
.tenant-diagram {
  margin: var(--smkb-space-5) 0;
}

.tenant-box {
  border: 2px solid var(--smkb-color-primary);
  border-radius: var(--smkb-radius-md);
  padding: var(--smkb-space-4);
}

.tenant-label {
  font-size: var(--smkb-font-size-sm);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-primary);
  margin-bottom: var(--smkb-space-3);
}

.tenant-items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--smkb-space-2);
}

.tenant-item {
  padding: var(--smkb-space-2) var(--smkb-space-3);
  background: var(--smkb-color-surface-raised);
  border-radius: var(--smkb-radius-sm);
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-secondary);
}

.tenant-item--highlight {
  background: color-mix(in srgb, var(--smkb-color-primary) 12%, transparent);
  color: var(--smkb-color-primary);
  font-weight: var(--smkb-font-weight-semibold);
}

/* Tools table */
.tools-table {
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
  font-size: var(--smkb-font-size-sm);
  margin-bottom: var(--smkb-space-3);
}

.tool-row {
  display: grid;
  grid-template-columns: 220px 1fr 1fr;
  gap: var(--smkb-space-4);
  padding: var(--smkb-space-4);
  border-bottom: 1px solid var(--smkb-color-border);
  align-items: start;
  line-height: 1.5;
  color: var(--smkb-color-text-secondary);
}

.tool-row:last-child { border-bottom: none; }

.tool-header {
  background: var(--smkb-color-surface-raised);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
}

.tool-name {
  display: flex;
  align-items: center;
  gap: var(--smkb-space-2);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
}

.tool-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--smkb-radius-sm);
  font-size: 10px;
  font-weight: var(--smkb-font-weight-bold);
  color: white;
  flex-shrink: 0;
}

.table-note {
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-tertiary);
}

/* Workflow */
.workflow {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin: var(--smkb-space-5) 0;
  overflow-x: auto;
}

.workflow-step {
  flex: 1;
  min-width: 110px;
  padding: var(--smkb-space-4) var(--smkb-space-3);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  text-align: center;
  background: var(--smkb-color-surface-subtle);
}

.wf-icon { font-size: 1.5rem; margin-bottom: var(--smkb-space-2); }

.wf-title {
  font-size: var(--smkb-font-size-sm);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin-bottom: var(--smkb-space-1);
}

.wf-desc {
  font-size: 12px;
  color: var(--smkb-color-text-secondary);
  line-height: 1.4;
}

.wf-note {
  font-size: 11px;
  color: var(--smkb-color-text-tertiary);
  display: block;
  margin-top: 2px;
}

.workflow-arrow {
  display: flex;
  align-items: center;
  padding: 0 var(--smkb-space-2);
  color: var(--smkb-color-text-tertiary);
  font-size: 1.2rem;
  flex-shrink: 0;
}

/* PAC CLI commands */
.pac-commands {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-3);
  margin: var(--smkb-space-4) 0;
}

.pac-command {
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  background: var(--smkb-color-surface-subtle);
}

.pac-cmd {
  display: block;
  font-family: monospace;
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-primary);
  background: none;
  border: none;
  padding: 0;
  margin-bottom: var(--smkb-space-2);
}

.pac-desc {
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-secondary);
  line-height: 1.5;
}

/* Solution example */
.solution-example {
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
  margin: var(--smkb-space-4) 0;
}

.solution-header {
  background: var(--smkb-color-surface-raised);
  padding: var(--smkb-space-3) var(--smkb-space-4);
  display: flex;
  align-items: center;
  gap: var(--smkb-space-3);
  font-size: var(--smkb-font-size-sm);
}

.solution-name-badge {
  font-family: monospace;
  font-weight: var(--smkb-font-weight-bold);
  background: color-mix(in srgb, var(--smkb-color-primary) 12%, transparent);
  color: var(--smkb-color-primary);
  padding: 2px 10px;
  border-radius: var(--smkb-radius-sm);
}

.solution-label { color: var(--smkb-color-text-secondary); }

.solution-components {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--smkb-color-border);
}

.solution-component {
  display: flex;
  align-items: center;
  gap: var(--smkb-space-3);
  padding: var(--smkb-space-3) var(--smkb-space-4);
  background: var(--smkb-color-surface);
  font-size: var(--smkb-font-size-sm);
}

.comp-icon { font-size: 1.1rem; flex-shrink: 0; }

.comp-type {
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  font-size: 12px;
}

.comp-example {
  color: var(--smkb-color-text-tertiary);
  font-size: 11px;
  font-family: monospace;
}

/* Starters list */
.starters-list {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-3);
  margin-bottom: var(--smkb-space-4);
}

.starter-item {
  display: flex;
  gap: var(--smkb-space-3);
  align-items: flex-start;
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  background: var(--smkb-color-surface-subtle);
}

.starter-icon { font-size: 1.3rem; flex-shrink: 0; padding-top: 2px; }

.starter-folder {
  font-family: monospace;
  font-size: var(--smkb-font-size-sm);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin-bottom: var(--smkb-space-1);
}

.starter-desc {
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-secondary);
  line-height: 1.5;
}
</style>
