<template>
  <div class="page">
    <h1>The @smkbacil/design-ui Library</h1>
    <p class="lead">
      <code>@smkbacil/design-ui</code> is SMKB's shared component library. Every solution —
      Power Apps or Power Pages — uses the same library for layout, navigation, tables,
      buttons, inputs, and design tokens. You're looking at it right now.
    </p>

    <InfoCallout type="tip">
      The sidebar, header, and layout of this onboarding app are <code>SmkbLayout</code>,
      <code>SmkbAppHeader</code>, and the flex body pattern — the exact same code
      used in every SMKB Power Apps starter.
    </InfoCallout>

    <div class="section">
      <h2>Why a shared library</h2>
      <p>
        Without a shared library, each solution would independently implement buttons,
        tables, inputs, and typography — resulting in subtle visual inconsistencies,
        duplicated CSS bugs, and different accessibility patterns per project.
        <code>@smkbacil/design-ui</code> ensures all SMKB interfaces look, feel, and behave
        the same way, and improvements benefit every solution at once.
      </p>
    </div>

    <div class="section">
      <h2>Setup — 4 lines</h2>
      <p>
        The library is initialized once in <code>src/main.ts</code>. After that, all
        components are globally available with no per-file imports.
      </p>
      <CodeBlock :code="mainTsExample">
        <template #filename>src/main.ts</template>
      </CodeBlock>

      <InfoCallout type="warning">
        Use <code>tokens-nofonts.css</code>, not <code>tokens.css</code>.
        Power Apps and Power Pages have a strict Content Security Policy that blocks
        external font loading. <code>tokens-nofonts.css</code> omits the
        <code>@font-face</code> declarations that would trigger a CSP violation.
      </InfoCallout>
    </div>

    <div class="section">
      <h2>Layout pattern</h2>
      <p>Every SMKB app uses <code>SmkbLayout</code> as the root with <code>SmkbAppHeader</code> in the header slot.</p>
      <CodeBlock :code="layoutExample">
        <template #filename>src/App.vue</template>
      </CodeBlock>
    </div>

    <div class="section">
      <h2>Commonly used components</h2>
      <div class="component-list">
        <div v-for="comp in components" :key="comp.name" class="component-item">
          <div class="comp-name"><code>{{ comp.name }}</code></div>
          <div class="comp-use">{{ comp.use }}</div>
        </div>
      </div>

      <h3>SmkbTable example</h3>
      <CodeBlock :code="tableExample" />

      <h3>useSmkbToast() for notifications</h3>
      <CodeBlock :code="toastExample" />
    </div>

    <div class="section">
      <h2>Design tokens</h2>
      <p>
        Always use CSS token variables in scoped <code>&lt;style&gt;</code> blocks.
        Never hardcode colors, spacing, or font sizes — they won't respect dark mode
        and break cross-solution consistency.
      </p>

      <div class="token-grid">
        <div v-for="cat in tokenCategories" :key="cat.category" class="token-card">
          <div class="token-category">{{ cat.category }}</div>
          <div class="token-examples">
            <code v-for="ex in cat.examples" :key="ex" class="token-example">{{ ex }}</code>
          </div>
        </div>
      </div>

      <CodeBlock :code="tokenExample" />
    </div>

    <ModuleNav module-id="ui-library" />
  </div>
</template>

<script setup lang="ts">
import CodeBlock from '../components/CodeBlock.vue'
import InfoCallout from '../components/InfoCallout.vue'
import ModuleNav from '../components/ModuleNav.vue'

const components = [
  { name: 'SmkbLayout', use: 'Root layout wrapper — provides the header slot and a scrollable body area' },
  { name: 'SmkbAppHeader', use: 'Top navigation bar with title, theme toggle (optional), and user menu' },
  { name: 'SmkbTable', use: 'Any list or grid of Dataverse records with loading state, empty slot, and custom cell templates' },
  { name: 'SmkbButton', use: 'All actions — variant="primary" | "secondary" | "ghost" | "destructive"' },
  { name: 'SmkbIconButton + SmkbTooltip', use: 'Icon-only actions that need an accessible tooltip' },
  { name: 'SmkbInput', use: 'Text search fields and single-line form inputs' },
  { name: 'SmkbField', use: 'Labelled form field wrapper — wraps any input with a label and optional error message' },
]

const tokenCategories = [
  { category: 'Spacing', examples: ['--smkb-space-1', '--smkb-space-4', '--smkb-space-8'] },
  { category: 'Color', examples: ['--smkb-color-primary', '--smkb-color-text-secondary', '--smkb-color-border'] },
  { category: 'Font size', examples: ['--smkb-font-size-sm', '--smkb-font-size-base', '--smkb-font-size-xl'] },
  { category: 'Font weight', examples: ['--smkb-font-weight-semibold', '--smkb-font-weight-bold'] },
  { category: 'Border radius', examples: ['--smkb-radius-sm', '--smkb-radius-md', '--smkb-radius-lg'] },
  { category: 'Surface', examples: ['--smkb-color-surface', '--smkb-color-surface-subtle', '--smkb-color-surface-raised'] },
]

const mainTsExample = `import '@smkbacil/design-ui/tokens-nofonts.css'  // tokens WITHOUT font binaries (CSP-safe)
import '@smkbacil/design-ui/tokens-dark.css'
import '@smkbacil/design-ui/styles'

import { createApp } from 'vue'
import { createSmkb } from '@smkbacil/design-ui'
import App from './App.vue'
import { router } from './router'

const app = createApp(App)
app.use(createSmkb())   // registers ALL components globally — no per-file imports needed
app.use(router)
app.mount('#app')`

const layoutExample = `<template>
  <SmkbLayout>
    <template #header>
      <SmkbAppHeader title="My Solution" :show-theme-toggle="false" />
    </template>
    <div class="app-body">
      <AppNav :items="navItems" />
      <main class="app-content">
        <RouterView />
      </main>
    </div>
  </SmkbLayout>
</template>`

const tableExample = `<template>
  <SmkbTable :loading="loading" :data="items" :columns="columns">
    <template #empty>No registrations found.</template>
    <template #cell-status="{ row }">
      <SmkbButton variant="ghost" size="sm">{{ row.status }}</SmkbButton>
    </template>
  </SmkbTable>
</template>

<script setup lang="ts">
const columns = [
  { field: 'name',   label: 'Name' },
  { field: 'email',  label: 'Email' },
  { field: 'status', label: 'Status' },
]
<\/script>`

const toastExample = `import { useSmkbToast } from '@smkbacil/design-ui'

const toast = useSmkbToast()

toast.success('Registration saved.')
toast.error('Something went wrong — please try again.')
toast.warning('Unsaved changes will be lost.')`

const tokenExample = `/* Good — uses tokens, respects dark mode automatically */
.card {
  background: var(--smkb-color-surface-subtle);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  padding: var(--smkb-space-4);
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-secondary);
}

/* Bad — hardcoded values break dark mode and are inconsistent */
.card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  font-size: 14px;
  color: #6b7280;
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
  margin-bottom: var(--smkb-space-6);
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

.component-list {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-2);
  margin-bottom: var(--smkb-space-4);
}

.component-item {
  display: flex;
  gap: var(--smkb-space-4);
  align-items: baseline;
  padding: var(--smkb-space-2) 0;
  border-bottom: 1px solid var(--smkb-color-border);
  font-size: var(--smkb-font-size-sm);
}

.component-item:last-child { border-bottom: none; }

.comp-name { min-width: 260px; flex-shrink: 0; }
.comp-use  { color: var(--smkb-color-text-secondary); line-height: 1.5; }

.token-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--smkb-space-3);
  margin-bottom: var(--smkb-space-4);
}

.token-card {
  padding: var(--smkb-space-3);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  background: var(--smkb-color-surface-subtle);
}

.token-category {
  font-weight: var(--smkb-font-weight-semibold);
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-primary);
  margin-bottom: var(--smkb-space-2);
}

.token-examples {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.token-example {
  display: block;
  font-family: monospace;
  font-size: 11px;
  color: var(--smkb-color-text-tertiary);
  background: none;
  border: none;
  padding: 0;
}
</style>
