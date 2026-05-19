<template>
  <div class="page">
    <h1>ALM &amp; The Pipeline</h1>
    <p class="lead">
      ALM stands for Application Lifecycle Management — the process of managing how
      changes move from development through to production. In SMKB, this is handled
      by Power Platform Pipelines combined with your deploy scripts.
    </p>

    <div class="section">
      <h2>The 3-environment flow</h2>
      <div class="pipeline-diagram">
        <div class="env-box env-dev">
          <div class="env-name">Dev</div>
          <div class="env-url">org229c958d</div>
          <div class="env-actions">
            <div class="env-action">deploy.ps1</div>
            <div class="env-action">pnpm deploy</div>
          </div>
          <div class="env-note">Direct deploy — you run the scripts</div>
        </div>
        <div class="pipeline-arrow">
          <div class="arrow-line" />
          <div class="arrow-label">Pipeline</div>
          <div class="arrow-tip">→</div>
        </div>
        <div class="env-box env-stage">
          <div class="env-name">Stage</div>
          <div class="env-actions">
            <div class="env-action env-action-locked">Pipeline only</div>
          </div>
          <div class="env-note">Final testing before go-live</div>
        </div>
        <div class="pipeline-arrow">
          <div class="arrow-line" />
          <div class="arrow-label">Pipeline</div>
          <div class="arrow-tip">→</div>
        </div>
        <div class="env-box env-prod">
          <div class="env-name">Production</div>
          <div class="env-actions">
            <div class="env-action env-action-locked">Pipeline only</div>
          </div>
          <div class="env-note">Live users — never deploy directly</div>
        </div>
      </div>

      <p>
        Each environment has its own isolated database. Data in Dev does not appear in Stage
        or Prod. Config values (portal URLs, API endpoints) differ per environment and are
        managed through Environment Variables (one of the 5 starters).
      </p>
    </div>

    <div class="section">
      <h2>What the solution container does</h2>
      <p>
        A Power Platform <strong>solution</strong> is the unit of deployment. It's a container
        that holds all the components for one project: tables, flows, env vars, app records,
        portal records. When the pipeline promotes Dev to Stage, it exports the solution from
        Dev and imports it into Stage.
      </p>
      <p>
        If a component isn't in the solution, it stays behind.
        This is why the <code>pac solution add-solution-component</code> step
        matters so much — any component not explicitly linked to the solution
        will silently not travel through the pipeline.
      </p>
    </div>

    <div class="section">
      <h2>What deploy.ps1 does vs the pipeline</h2>
      <div class="vs-table">
        <div class="vs-row vs-header">
          <div>Aspect</div>
          <div>deploy.ps1 / pnpm deploy</div>
          <div>Power Platform Pipeline</div>
        </div>
        <div v-for="row in vsRows" :key="row.aspect" class="vs-row">
          <div>{{ row.aspect }}</div>
          <div>{{ row.script }}</div>
          <div>{{ row.pipeline }}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Power Pages — why special handling is needed</h2>
      <p>
        Power Pages portals contain hundreds of YAML-backed Dataverse records (pages, templates,
        web files, site settings). The Maker UI's "Add Existing → Power Pages" button adds only
        the top-level site record — it silently omits ~200 child components.
      </p>
      <p>
        The correct approach is to use the PAC CLI to explicitly add every component:
      </p>
      <CodeBlock :code="pacSolutionAddExample">
        <template #filename>Init Project Step 11 — link portal components to solution</template>
      </CodeBlock>

      <InfoCallout type="note">
        This step must be re-run after every <code>pnpm deploy</code> because new records
        uploaded by PAC are NOT automatically linked to the solution. Run it before
        triggering the pipeline or new portal components won't travel to Stage.
      </InfoCallout>
    </div>

    <div class="section">
      <h2>The GUID freshening requirement</h2>
      <p>
        Every portal cloned from the starter kit starts with identical hardcoded GUIDs.
        <code>pac pages upload</code> upserts Dataverse records by primary key — if two portals
        share GUIDs, the second upload overwrites the first portal's records. Both portals break.
        This happened in production (CIF and Open Day portals, May 2026).
      </p>
      <p>
        Run <code>guid-freshen.ps1</code> exactly once before the first deploy for any new portal.
        After that, never run it again — running it a second time generates new GUIDs that no
        longer match the live Dataverse records, breaking the site.
      </p>
    </div>

    <InfoCallout type="rule">
      Never pass a Stage or Production URL to any deploy script. The scripts are hardcoded
      to the Dev environment and will reject any other URL. Stage and Production receive
      changes only through the Power Platform Pipeline — never through direct commands.
    </InfoCallout>

    <ModuleNav module-id="alm" />
  </div>
</template>

<script setup lang="ts">
import CodeBlock from '../components/CodeBlock.vue'
import InfoCallout from '../components/InfoCallout.vue'
import ModuleNav from '../components/ModuleNav.vue'

const vsRows = [
  { aspect: 'Target',       script: 'Dev only',                     pipeline: 'Stage → Prod' },
  { aspect: 'Triggered by', script: 'Developer (runs script manually)', pipeline: 'Approval in Power Platform Admin Center' },
  { aspect: 'Scope',        script: 'Individual component (tables, code app, portal)', pipeline: 'Entire solution container' },
  { aspect: 'Data',         script: 'No data migration',            pipeline: 'Solution schema only — data stays per environment' },
  { aspect: 'Rollback',     script: 'git revert + redeploy',        pipeline: 'Restore previous solution version in Admin Center' },
]

const pacSolutionAddExample = `# 1. Add the site record itself
pac solution add-solution-component \\
  --solution-unique-name SMKBEvents \\
  --component-type powerpagesite \\
  --component-id <site-guid-from-pac-pages-list>

# 2. Add ALL child components (extracts every GUID from portal YAML files)
$guids = Get-ChildItem ".\\powerpages\\smkb---events-dev" -Recurse -Include "*.yml" |
    Select-String -Pattern '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' |
    ForEach-Object { $_.Matches.Value } | Sort-Object -Unique
foreach ($guid in $guids) {
    pac solution add-solution-component \\
      --solution-unique-name SMKBEvents \\
      --component-type powerpagecomponent \\
      --component-id $guid
}

# 3. Add the language component
pac solution add-solution-component \\
  --solution-unique-name SMKBEvents \\
  --component-type powerpagesitelanguage \\
  --component-id <site-guid>`
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

.pipeline-diagram {
  display: flex;
  align-items: center;
  gap: 0;
  margin: var(--smkb-space-6) 0;
}

.env-box {
  flex: 1;
  padding: var(--smkb-space-4);
  border: 2px solid;
  border-radius: var(--smkb-radius-md);
  font-size: var(--smkb-font-size-sm);
}

.env-dev   { border-color: var(--smkb-color-success); }
.env-stage { border-color: var(--smkb-color-warning); }
.env-prod  { border-color: var(--smkb-color-destructive); }

.env-name {
  font-size: var(--smkb-font-size-base);
  font-weight: var(--smkb-font-weight-bold);
  color: var(--smkb-color-text-primary);
  margin-bottom: 2px;
}

.env-url {
  font-family: monospace;
  font-size: 11px;
  color: var(--smkb-color-text-tertiary);
  margin-bottom: var(--smkb-space-2);
}

.env-actions {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-1);
  margin-bottom: var(--smkb-space-2);
}

.env-action {
  display: inline-block;
  background: var(--smkb-color-surface-raised);
  border-radius: var(--smkb-radius-sm);
  padding: 2px 6px;
  font-family: monospace;
  font-size: 11px;
  color: var(--smkb-color-text-secondary);
}

.env-action-locked {
  background: color-mix(in srgb, var(--smkb-color-destructive) 12%, transparent);
  color: var(--smkb-color-destructive);
}

.env-note {
  font-size: 11px;
  color: var(--smkb-color-text-tertiary);
  line-height: 1.4;
}

.pipeline-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 var(--smkb-space-2);
  color: var(--smkb-color-text-tertiary);
  font-size: var(--smkb-font-size-xs);
}

.arrow-line {
  width: 2px;
  height: 20px;
  background: var(--smkb-color-border);
}

.arrow-label {
  font-size: 10px;
  color: var(--smkb-color-primary);
  font-weight: var(--smkb-font-weight-semibold);
  margin: 2px 0;
}

.arrow-tip {
  font-size: 1.2rem;
  color: var(--smkb-color-primary);
}

.vs-table {
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
  font-size: var(--smkb-font-size-sm);
}

.vs-row {
  display: grid;
  grid-template-columns: 140px 1fr 1fr;
  gap: var(--smkb-space-4);
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border-bottom: 1px solid var(--smkb-color-border);
  align-items: start;
  line-height: 1.5;
  color: var(--smkb-color-text-secondary);
}

.vs-row:last-child { border-bottom: none; }

.vs-header {
  background: var(--smkb-color-surface-raised);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
}
</style>
