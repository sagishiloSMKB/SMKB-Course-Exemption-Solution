<template>
  <div class="page">
    <h1>Your Tools</h1>
    <p class="lead">
      Before running Init Project, make sure every tool is installed and working.
      Missing tools cause confusing errors mid-setup that are hard to debug in context.
    </p>

    <div class="section">
      <h2>Required tools</h2>
      <div class="tools-table">
        <div class="tool-row tool-header">
          <div>Tool</div>
          <div>Version</div>
          <div>Check command</div>
          <div>Notes</div>
        </div>
        <div v-for="tool in requiredTools" :key="tool.name" class="tool-row">
          <div class="tool-name">{{ tool.name }}</div>
          <div class="tool-version">{{ tool.version }}</div>
          <div><code>{{ tool.check }}</code></div>
          <div class="tool-notes">{{ tool.notes }}</div>
        </div>
      </div>

      <h3>Quick install check</h3>
      <CodeBlock :code="installCheck" />
    </div>

    <div class="section">
      <h2>PAC CLI — the most important tool</h2>
      <p>
        PAC CLI (Power Apps CLI) is Microsoft's command-line tool for interacting with
        Power Platform. It handles auth, deploys, solution management, and portal uploads.
        It's a Windows-only executable, so on this machine it runs via PowerShell.
      </p>

      <h3>Authenticating PAC CLI</h3>
      <CodeBlock :code="pacAuthExample" />

      <InfoCallout type="warning">
        <strong>Profile name mismatch:</strong> The PAC profile named <strong>"SMKB-Apps-Dev"</strong>
        incorrectly targets <code>org1dce1895</code> (Seminar Hakibutzim College — wrong org).
        Always verify the active profile's URL in <code>pac auth list</code> output.
        The correct SMKB-Apps-Dev URL is <code>org229c958d.crm4.dynamics.com</code>.
      </InfoCallout>
    </div>

    <div class="section">
      <h2>The PAC CLI deny list</h2>
      <p>
        Some PAC commands are hard-blocked in this project's settings. Even if you approve
        them during a session, they cannot run. This protects against accidental deploys.
      </p>
      <CodeBlock :code="denyListExample">
        <template #filename>.claude/settings.json (deny section)</template>
      </CodeBlock>

      <div class="deny-explain">
        <div v-for="item in deniedCommands" :key="item.cmd" class="deny-item">
          <code>{{ item.cmd }}</code>
          <div class="deny-reason">{{ item.reason }}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Recommended VS Code extensions</h2>
      <div class="ext-list">
        <div v-for="ext in extensions" :key="ext.id" class="ext-item">
          <div class="ext-name">{{ ext.name }}</div>
          <div class="ext-id">{{ ext.id }}</div>
          <div class="ext-desc">{{ ext.desc }}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Why pnpm, not npm</h2>
      <p>
        All Node-based starters use <strong>pnpm</strong> instead of npm. The reasons:
      </p>
      <ul class="reason-list">
        <li>Strict installs — pnpm refuses to install packages not listed in package.json,
            preventing phantom dependency bugs</li>
        <li>Workspace support — <code>pnpm-workspace.yaml</code> controls which packages
            are allowed to run build scripts (important for <code>@smkb/design-ui</code>)</li>
        <li>Faster — pnpm uses a content-addressable store; packages aren't re-downloaded
            if they're already cached globally</li>
      </ul>
    </div>

    <ModuleNav module-id="tools" />
  </div>
</template>

<script setup lang="ts">
import CodeBlock from '../components/CodeBlock.vue'
import InfoCallout from '../components/InfoCallout.vue'
import ModuleNav from '../components/ModuleNav.vue'

const requiredTools = [
  { name: 'Node.js', version: '20+', check: 'node --version', notes: 'Required for Vue builds and script execution' },
  { name: 'pnpm', version: '9+', check: 'pnpm --version', notes: 'Install via: npm i -g pnpm' },
  { name: 'PAC CLI', version: 'Latest', check: 'pac --version', notes: 'Download from Microsoft; Windows executable' },
  { name: 'Git', version: 'Any', check: 'git --version', notes: 'Must be configured with your GitHub identity' },
  { name: 'Claude Code', version: 'Latest', check: 'claude --version', notes: 'The AI assistant for this project' },
]

const extensions = [
  { name: 'Vue - Official (Volar)', id: 'Vue.volar', desc: 'Syntax highlighting, IntelliSense, and type checking for Vue SFC files' },
  { name: 'ESLint', id: 'dbaeumer.vscode-eslint', desc: 'Real-time linting — catches v-html and console.log before the pre-commit hook does' },
  { name: 'PowerShell', id: 'ms-vscode.powershell', desc: 'Syntax highlighting and IntelliSense for deploy.ps1 scripts' },
]

const deniedCommands = [
  { cmd: 'pac pages upload', reason: 'Upload is a one-way operation. Must be intentional.' },
  { cmd: 'pac solution import', reason: 'Imports to the live environment. Must be intentional.' },
  { cmd: 'pac code push', reason: 'Overwrites the live app record. Must be intentional.' },
  { cmd: 'pac auth select', reason: 'Switching auth profile could silently redirect subsequent commands to wrong environment.' },
  { cmd: 'git push --force', reason: 'Rewrites history on remote. Can destroy teammates\'s work.' },
  { cmd: 'git reset --hard', reason: 'Destroys uncommitted work with no recovery path.' },
  { cmd: 'git commit --amend', reason: 'Rewrites published commits. Use a new commit instead.' },
]

const installCheck = `# Run all three — should print version numbers, no errors
node --version   # → v20.x.x or higher
pnpm --version   # → 9.x.x or higher
pac --version    # → Microsoft PowerApps CLI x.x.x`

const pacAuthExample = `# Create a profile for SMKB-Apps-Dev
pac auth create --url https://org229c958d.crm4.dynamics.com

# List profiles — the active one is marked with *
pac auth list

# Select a different profile
pac auth select --index 2`

const denyListExample = `"deny": [
  "Bash(pac pages upload*)",
  "Bash(pac solution import*)",
  "Bash(pac code push*)",
  "Bash(pac auth select*)",
  "Bash(git push*--force*)",
  "Bash(git reset*--hard*)",
  "Bash(git commit*--amend*)"
]`
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

.tools-table {
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
  font-size: var(--smkb-font-size-sm);
  margin-bottom: var(--smkb-space-4);
}

.tool-row {
  display: grid;
  grid-template-columns: 120px 80px 180px 1fr;
  gap: var(--smkb-space-4);
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border-bottom: 1px solid var(--smkb-color-border);
  align-items: start;
  color: var(--smkb-color-text-secondary);
  line-height: 1.5;
}

.tool-row:last-child { border-bottom: none; }

.tool-header {
  background: var(--smkb-color-surface-raised);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
}

.tool-name {
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
}

.tool-version {
  font-family: monospace;
  color: var(--smkb-color-primary);
}

.deny-explain {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-3);
  margin-top: var(--smkb-space-4);
}

.deny-item {
  display: flex;
  gap: var(--smkb-space-4);
  align-items: baseline;
  font-size: var(--smkb-font-size-sm);
}

.deny-item code {
  min-width: 180px;
  flex-shrink: 0;
}

.deny-reason {
  color: var(--smkb-color-text-secondary);
}

.ext-list {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-3);
}

.ext-item {
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  font-size: var(--smkb-font-size-sm);
}

.ext-name {
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin-bottom: 2px;
}

.ext-id {
  font-family: monospace;
  font-size: 11px;
  color: var(--smkb-color-text-tertiary);
  margin-bottom: var(--smkb-space-1);
}

.ext-desc {
  color: var(--smkb-color-text-secondary);
  line-height: 1.4;
}

.reason-list {
  color: var(--smkb-color-text-secondary);
  font-size: var(--smkb-font-size-sm);
  line-height: 1.7;
  padding-left: var(--smkb-space-5);
  margin: 0;
}

.reason-list li { margin-bottom: var(--smkb-space-2); }
</style>
