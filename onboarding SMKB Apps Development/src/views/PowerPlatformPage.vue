<template>
  <div class="page">
    <h1>Power Platform 101</h1>
    <p class="lead">
      A thorough understanding of Power Platform — what it is, how its environments work,
      how solutions enable ALM, and what each component does — is the foundation for
      everything else in this project.
    </p>

    <!-- ─── 1. WHAT IS POWER PLATFORM ──────────────────────────────────────── -->
    <div class="section">
      <h2>What is Power Platform?</h2>
      <p>
        Microsoft Power Platform is a suite of tools for building business applications,
        automating processes, and creating web portals — all within an organization's own
        Microsoft cloud tenant. It sits at the intersection of low-code (drag-and-drop,
        no programming required) and pro-code (full TypeScript, custom APIs, Git-based workflows).
      </p>
      <p>
        At Seminar Hakibutzim, we use Power Platform because the college already runs on
        Microsoft 365 (Teams, SharePoint, Exchange, Azure AD). Power Platform lives in the
        same tenant — same identity, same security policies, same data governance.
        A student logs in to a registration portal with the same account they use for email.
        No separate vendor, no data leaving the organization's environment.
      </p>

      <div class="product-grid">
        <div v-for="product in allProducts" :key="product.name" class="product-card" :class="{ 'product-card--used': product.used }">
          <div class="product-header">
            <span class="product-icon">{{ product.icon }}</span>
            <span class="product-name">{{ product.name }}</span>
            <span v-if="product.used" class="product-badge">Used at SMKB</span>
          </div>
          <div class="product-desc">{{ product.desc }}</div>
        </div>
      </div>
    </div>

    <!-- ─── 2. ENVIRONMENTS ─────────────────────────────────────────────────── -->
    <div class="section">
      <h2>Environments</h2>
      <p>
        An <strong>environment</strong> is an isolated container within your Power Platform
        tenant. It has its own Dataverse database, its own apps, its own flows, and its own
        configuration. Nothing from one environment automatically appears in another.
      </p>

      <h3>Types of environments</h3>
      <div class="env-types-table">
        <div class="et-row et-header">
          <div>Type</div>
          <div>Who uses it</div>
          <div>Key characteristics</div>
        </div>
        <div v-for="et in envTypes" :key="et.type" class="et-row">
          <div class="et-type">{{ et.type }}</div>
          <div>{{ et.who }}</div>
          <div class="et-chars">{{ et.chars }}</div>
        </div>
      </div>

      <InfoCallout type="tip">
        Every developer can create a <strong>free personal Developer environment</strong>
        using the Power Apps Developer Plan. This gives you a private sandbox to experiment
        without touching shared environments. Sign up at
        <strong>https://aka.ms/PowerAppsDevPlan</strong> (requires a work or school account).
      </InfoCallout>

      <h3>SMKB's three environments</h3>
      <p>
        All SMKB solutions are deployed to the same three shared environments.
        Each environment is an entirely separate Dataverse database — data in Dev does not
        appear in Production. Schema (tables, flows, portal config) travels via pipeline;
        records (actual data) stay per environment.
      </p>
      <div class="smkb-envs">
        <div class="smkb-env smkb-env--dev">
          <div class="senv-name">SMKB-Apps-Dev</div>
          <div class="senv-url">org229c958d.crm4.dynamics.com</div>
          <div class="senv-mode">Unmanaged solutions</div>
          <div class="senv-desc">
            Where all active development happens. Deploy directly using <code>deploy.ps1</code>
            or <code>pac pages upload</code>. Components are unmanaged — freely editable.
          </div>
          <div class="senv-deploy">Direct deploy ✓</div>
        </div>
        <div class="senv-arrow">→</div>
        <div class="smkb-env smkb-env--stage">
          <div class="senv-name">SMKB-Apps-Stage</div>
          <div class="senv-mode">Managed solutions</div>
          <div class="senv-desc">
            Pre-production. Used for final testing before go-live. Components are managed
            — locked, cannot be edited directly. Receives changes only from the pipeline.
          </div>
          <div class="senv-deploy">Pipeline only ✗</div>
        </div>
        <div class="senv-arrow">→</div>
        <div class="smkb-env smkb-env--prod">
          <div class="senv-name">SMKB-Apps-Prod</div>
          <div class="senv-mode">Managed solutions</div>
          <div class="senv-desc">
            Live. Real users. Receives changes only after Stage approval via pipeline.
            Never deploy here directly — not even in an emergency.
          </div>
          <div class="senv-deploy">Pipeline only ✗</div>
        </div>
      </div>

      <InfoCallout type="rule">
        Deploy scripts in this starter kit are hardcoded to reject any URL that is not
        SMKB-Apps-Dev. Stage and Production receive changes exclusively through the
        Power Platform Pipeline — never via direct <code>pac</code> commands.
      </InfoCallout>

      <h3>Environments share a Dataverse instance — solutions do not isolate at runtime</h3>
      <p>
        Within a single environment, every component can talk to every other component regardless
        of which solution they belong to. A flow in the "Events" solution can query a table
        defined in the "Facilities" solution — they share the same Dataverse database.
        Solutions are an ALM packaging concept, not a runtime isolation boundary.
      </p>
    </div>

    <!-- ─── 3. SOLUTIONS & ALM ──────────────────────────────────────────────── -->
    <div class="section">
      <h2>Solutions &amp; ALM</h2>
      <p>
        A <strong>solution</strong> is a container that groups related Power Platform components
        so they can be versioned, exported, and promoted between environments as a single unit.
        Think of it as a deployment package with a name, a publisher, and a version number.
      </p>
      <p>
        Every SMKB project lives in its own named solution (e.g., <code>SMKBEvents</code>,
        <code>SMKBCommunityFund</code>). The solution is what the pipeline moves from Dev to Stage
        to Production. If a component is not inside the solution, it stays behind.
      </p>

      <h3>Unmanaged vs Managed solutions</h3>
      <p>
        The same solution exists in two modes depending on where it is deployed.
        This distinction is fundamental to how ALM works in Power Platform.
      </p>
      <div class="managed-table">
        <div class="mt-row mt-header">
          <div></div>
          <div>Unmanaged</div>
          <div>Managed</div>
        </div>
        <div v-for="row in managedRows" :key="row.aspect" class="mt-row">
          <div class="mt-aspect">{{ row.aspect }}</div>
          <div>{{ row.unmanaged }}</div>
          <div>{{ row.managed }}</div>
        </div>
      </div>

      <InfoCallout type="warning">
        Never edit a managed component directly in Stage or Production. Power Platform allows it
        technically by adding an "unmanaged layer" on top, but this layer gets wiped out the next
        time the managed solution is imported via pipeline. Your changes disappear silently.
      </InfoCallout>

      <h3>The ALM flow</h3>
      <div class="alm-flow">
        <div class="alm-step">
          <div class="alm-env">Dev</div>
          <div class="alm-action">Develop in unmanaged solution</div>
          <div class="alm-note">Edit tables, flows, code, portal config freely</div>
        </div>
        <div class="alm-arrow">↓</div>
        <div class="alm-step">
          <div class="alm-env">Dev</div>
          <div class="alm-action">deploy.ps1 / pac pages upload</div>
          <div class="alm-note">Push latest changes to Dev environment</div>
        </div>
        <div class="alm-arrow">↓</div>
        <div class="alm-step alm-step--pipeline">
          <div class="alm-env">Pipeline</div>
          <div class="alm-action">Export unmanaged → package as managed</div>
          <div class="alm-note">Automated by Power Platform Pipelines</div>
        </div>
        <div class="alm-arrow">↓</div>
        <div class="alm-step">
          <div class="alm-env">Stage</div>
          <div class="alm-action">Import as managed solution</div>
          <div class="alm-note">Components locked; test against real data structure</div>
        </div>
        <div class="alm-arrow">↓</div>
        <div class="alm-step">
          <div class="alm-env">Production</div>
          <div class="alm-action">Import as managed solution</div>
          <div class="alm-note">After Stage approval — live users receive the update</div>
        </div>
      </div>

      <h3>Cross-solution sharing</h3>
      <p>
        Multiple solutions can reference the same Dataverse table. If the "Events" solution
        defines an <code>smkb_evt_Registration</code> table, a flow in the "Notifications" solution
        can read and write to it — they share the same Dataverse environment.
        Solution layers (the order in which managed solutions are imported) determine which
        customization wins when two solutions modify the same component.
      </p>

      <h3>The publisher</h3>
      <p>
        Every solution is stamped with a publisher. All SMKB solutions share a single publisher:
        <strong>SKMBCore</strong> (prefix <code>smkb</code>). This is intentional — it provides
        a consistent org-wide namespace for shared column names like <code>smkb_name</code>.
        Do not create a new publisher for each solution.
      </p>
    </div>

    <!-- ─── 4. THE 5 COMPONENTS ─────────────────────────────────────────────── -->
    <div class="section">
      <h2>The 5 components we use</h2>
      <p>
        Each component type serves a specific role. Here's a deep look at each one —
        what it is, how it's built, what it produces, and where you manage it.
      </p>

      <!-- Dataverse -->
      <div class="component-block">
        <div class="cb-header">
          <span class="cb-badge" style="background:#0078d4">DV</span>
          <div>
            <div class="cb-name">Dataverse</div>
            <div class="cb-tagline">The data backbone — everything reads and writes here</div>
          </div>
          <a class="cb-link" href="https://make.powerapps.com" target="_blank" rel="noopener">make.powerapps.com ↗</a>
        </div>
        <div class="cb-body">
          <p>
            Dataverse is Azure-hosted relational database tightly integrated with Power Platform.
            Every other component — apps, flows, portals — reads from and writes to Dataverse.
            It provides tables (like SQL tables), columns, relationships, forms, views, and row-level security.
          </p>
          <p>
            Dataverse also ships with <strong>standard tables</strong> (Contact, Account, Task, Email)
            that you can extend without creating new tables. Custom tables use the <code>smkb_[prefix]_[PascalName]</code> convention:
            <code>smkb_evt_Registration</code>, <code>smkb_cfb_Booking</code>; shared columns like <code>smkb_name</code> keep the bare publisher prefix.
          </p>
          <div class="cb-facts">
            <div class="cbf-item">
              <div class="cbf-label">Where you define schema</div>
              <div>make.powerapps.com → Solutions → your solution → Tables</div>
            </div>
            <div class="cbf-item">
              <div class="cbf-label">What travels through the pipeline</div>
              <div>Table schema (columns, types, relationships, forms, views) — <strong>not</strong> records. Each environment has its own data.</div>
            </div>
            <div class="cbf-item">
              <div class="cbf-label">In the starter kit</div>
              <div>SMKB - Dataverse Tables Starter — XML-based table definitions deployed via <code>pac solution import</code></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Power Apps Code App -->
      <div class="component-block">
        <div class="cb-header">
          <span class="cb-badge" style="background:#742774">PA</span>
          <div>
            <div class="cb-name">Power Apps Code App</div>
            <div class="cb-tagline">Staff-facing SPAs built with Vue 3 + TypeScript</div>
          </div>
          <a class="cb-link" href="https://make.powerapps.com" target="_blank" rel="noopener">make.powerapps.com ↗</a>
        </div>
        <div class="cb-body">
          <p>
            A Power Apps <strong>Code App</strong> is a full custom SPA that runs inside the
            Power Apps runtime. Unlike Canvas Apps (drag-and-drop) or Model-Driven Apps
            (auto-generated forms), a Code App is built entirely in TypeScript and Vue 3 —
            you have complete control over the UI and behavior.
          </p>
          <p>
            At SMKB we use Code Apps for staff-facing and internal management interfaces:
            reviewing registrations, managing event capacity, approving scholarship applications.
            The app authenticates automatically inside the Power Apps runtime and calls Dataverse
            directly via the <code>@microsoft/power-apps/data</code> SDK.
          </p>
          <div class="cb-facts">
            <div class="cbf-item">
              <div class="cbf-label">How it's built</div>
              <div>Locally in VS Code/Cursor with Vue 3 + TypeScript + Vite. <code>pnpm dev</code> runs a local mock server; <code>pnpm build</code> + <code>pac code push</code> deploys to Dev.</div>
            </div>
            <div class="cbf-item">
              <div class="cbf-label">The app record</div>
              <div>Must be created first via <code>pac code init</code> — there is no "New Code App" button in the portal. <code>pac code push</code> updates an existing record; it cannot create one.</div>
            </div>
            <div class="cbf-item">
              <div class="cbf-label">In the starter kit</div>
              <div>SMKB - Power Apps Starter — complete Vue 3 scaffold with routing, mock data service, and design system integration</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Power Automate -->
      <div class="component-block">
        <div class="cb-header">
          <span class="cb-badge" style="background:#0066ff">AU</span>
          <div>
            <div class="cb-name">Power Automate</div>
            <div class="cb-tagline">Cloud flows — event-triggered automation</div>
          </div>
          <a class="cb-link" href="https://flow.microsoft.com" target="_blank" rel="noopener">flow.microsoft.com ↗</a>
        </div>
        <div class="cb-body">
          <p>
            Power Automate runs cloud flows in response to triggers. A trigger fires the flow
            (e.g., a new Dataverse record is created), and actions execute in sequence
            (e.g., send an email, update another record, post to Teams).
            Flows run serverlessly in the cloud — no infrastructure to manage.
          </p>
          <div class="cb-two-col">
            <div>
              <div class="cb-sublabel">Common triggers</div>
              <ul class="cb-list">
                <li>Dataverse: When a row is created / updated / deleted</li>
                <li>Schedule: Run every day at 8am</li>
                <li>HTTP: Webhook from an external system</li>
                <li>Manual: Button in Power Apps or Teams</li>
              </ul>
            </div>
            <div>
              <div class="cb-sublabel">Common actions</div>
              <ul class="cb-list">
                <li>Office 365: Send an email</li>
                <li>Dataverse: Create / update / query rows</li>
                <li>Teams: Post a message or card</li>
                <li>HTTP: Call an external API</li>
              </ul>
            </div>
          </div>
          <div class="cb-facts">
            <div class="cbf-item">
              <div class="cbf-label">Connection references</div>
              <div>
                Flows don't own credentials — they use <strong>connection references</strong>
                that point to a shared service account connector (e.g., one Office 365 Outlook
                connection reference shared across all solutions). This prevents credential sprawl.
                When a solution is imported, flows are initially disabled until connection
                references are confirmed by an admin.
              </div>
            </div>
            <div class="cbf-item">
              <div class="cbf-label">How it's built</div>
              <div>Flow JSON files checked into Git and imported via <code>pac solution import</code>. Our starter provides the correct JSON schema — building the JSON manually from scratch is error-prone.</div>
            </div>
            <div class="cbf-item">
              <div class="cbf-label">In the starter kit</div>
              <div>SMKB - Power Automate Flows Starter — pre-wired flow JSON with the correct schema, connection reference placeholders, and error handling pattern</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Power Pages -->
      <div class="component-block">
        <div class="cb-header">
          <span class="cb-badge" style="background:#00b0f0">PP</span>
          <div>
            <div class="cb-name">Power Pages</div>
            <div class="cb-tagline">Public-facing portals — the most complex component in a solution</div>
          </div>
          <a class="cb-link" href="https://make.powerpages.microsoft.com" target="_blank" rel="noopener">make.powerpages.microsoft.com ↗</a>
        </div>
        <div class="cb-body">
          <p>
            Power Pages serves external-facing web portals — public registration forms,
            scholarship applications, event sign-up pages. At SMKB, the portal UI is a
            Vue 3 SPA (same tech stack as Power Apps), while Power Pages provides
            the infrastructure: authentication, page routing, site settings, and Dataverse access.
          </p>
          <p>
            At SMKB the portal is a <strong>Power Pages Code Site</strong>: the built Vue SPA is
            uploaded directly with <code>pac pages upload-code-site</code> — no Liquid template layer,
            and no hundreds-of-records portal component tree to hand-manage. Data comes through Power
            Automate cloud flows (the HTTP 200 + <code>errorCode</code> contract), or optionally one
            table via the Web API.
          </p>

          <h4>What ships in the repo</h4>
          <div class="yaml-types">
            <div v-for="yt in yamlTypes" :key="yt.file" class="yt-item">
              <code class="yt-file">{{ yt.file }}</code>
              <div class="yt-desc">{{ yt.desc }}</div>
            </div>
          </div>

          <InfoCallout type="note">
            There is <strong>no</strong> manual "add ~200 components to the solution" step and no
            shared-GUID page-routing hazard — those were the old Liquid-portal model. A Code Site is
            namespaced by its publisher prefix + site name (<code>PREFIX - Name</code>), promotes to
            Stage/Prod via the two-track ALM flow (<code>/ppcs-promote-to-env</code>), and freshens its
            per-environment site-setting GUIDs once with <code>scripts/freshen-site-settings.ps1</code>.
          </InfoCallout>

          <div class="cb-facts" style="margin-top: var(--smkb-space-4)">
            <div class="cbf-item">
              <div class="cbf-label">In the starter kit</div>
              <div>SMKB - Power Pages Code Site Starter — a Vue 3 SPA uploaded as a Power Pages Code Site (pac pages upload-code-site), with flows-backed data access, CSP config, and security rules</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pipelines -->
      <div class="component-block">
        <div class="cb-header">
          <span class="cb-badge" style="background:#107c10">PL</span>
          <div>
            <div class="cb-name">Power Platform Pipelines</div>
            <div class="cb-tagline">Automated ALM — promotes solutions from Dev to Stage to Prod</div>
          </div>
          <a class="cb-link" href="https://admin.powerplatform.microsoft.com" target="_blank" rel="noopener">admin.powerplatform.microsoft.com ↗</a>
        </div>
        <div class="cb-body">
          <p>
            A Pipeline is a configured automation in the Power Platform Admin Center that
            exports an unmanaged solution from Dev, packages it as managed, and imports it
            to Stage — then, after approval, imports it to Production. This replaces the
            manual export/import cycle and ensures a consistent, auditable promotion process.
          </p>
          <div class="cb-two-col">
            <div>
              <div class="cb-sublabel">What the pipeline moves</div>
              <ul class="cb-list">
                <li>Table schema (columns, relationships)</li>
                <li>Power Automate flows</li>
                <li>Environment variable definitions</li>
                <li>Power Apps Code App records</li>
                <li>Power Pages portal components</li>
              </ul>
            </div>
            <div>
              <div class="cb-sublabel">What it does NOT move</div>
              <ul class="cb-list">
                <li>Dataverse records (actual data)</li>
                <li>Environment variable values (set per env)</li>
                <li>Connection reference credentials</li>
                <li>PAC auth profiles</li>
              </ul>
            </div>
          </div>
          <InfoCallout type="rule">
            Stage and Production only receive changes through the pipeline. Never target a
            Stage or Production URL with <code>pac solution import</code>, <code>pac pages upload</code>,
            or any deploy script. The pipeline is the only approved path.
          </InfoCallout>
        </div>
      </div>
    </div>

    <ModuleNav module-id="power-platform" />
  </div>
</template>

<script setup lang="ts">
import InfoCallout from '../components/InfoCallout.vue'
import ModuleNav from '../components/ModuleNav.vue'

const allProducts = [
  { icon: '🗄️', name: 'Dataverse',           desc: 'Azure-hosted relational database — the data layer for all solutions',             used: true  },
  { icon: '🖥️', name: 'Power Apps',           desc: 'Custom apps: Canvas (drag-and-drop), Model-Driven (auto-forms), or Code (full SPA)', used: true  },
  { icon: '⚡',  name: 'Power Automate',       desc: 'Cloud flows — event-triggered automation and process orchestration',              used: true  },
  { icon: '🌐',  name: 'Power Pages',          desc: 'External-facing web portals with authentication and Dataverse access',            used: true  },
  { icon: '🚀',  name: 'Pipelines',            desc: 'Built-in ALM — promotes solutions through Dev → Stage → Production',             used: true  },
  { icon: '📊',  name: 'Power BI',             desc: 'Interactive analytics and dashboards — not used in SMKB solutions',              used: false },
  { icon: '🤖',  name: 'Copilot Studio',       desc: 'AI chatbot and copilot builder — not used in SMKB solutions',                    used: false },
]

const envTypes = [
  { type: 'Default',    who: 'All tenant users',          chars: 'Auto-created per tenant; shared by everyone; limited admin control. Avoid for real projects.' },
  { type: 'Developer',  who: 'Individual developers',     chars: 'Free personal sandbox via Power Apps Developer Plan. Isolated, owner-only. Perfect for personal experimentation.' },
  { type: 'Sandbox',    who: 'Teams, QA',                 chars: 'Supports copy and reset operations. Used for shared test environments and UAT.' },
  { type: 'Production', who: 'Production workloads',      chars: 'Permanent, full-control environment. SMKB-Apps-Dev, Stage, and Prod are all Production type environments.' },
  { type: 'Trial',      who: 'Short-term testing',        chars: 'Expires after 30 days. Full control while active. Good for evaluating new features.' },
]

const managedRows = [
  { aspect: 'Used in',           unmanaged: 'Development (Dev environment)',             managed: 'All other environments (Stage, Prod)' },
  { aspect: 'Components',        unmanaged: 'Freely editable — add, change, delete',     managed: 'Locked — cannot be edited directly' },
  { aspect: 'On deletion',       unmanaged: 'Container removed; components stay in env', managed: 'All components AND their data deleted' },
  { aspect: 'Can be exported',   unmanaged: 'Yes — as unmanaged or as managed',          managed: 'No — managed imports only' },
  { aspect: 'Source of truth',   unmanaged: 'Yes — checked into Git',                    managed: 'Build artifact — generated from unmanaged' },
]

const yamlTypes = [
  { file: 'src/',                        desc: 'The Vue 3 SPA — views, router, services (flow client), design-system UI' },
  { file: 'src/config/solution.ts',      desc: 'Solution identity: prefix, site name, app titles, languages (apply-config fills it)' },
  { file: 'src/config/flows.ts',         desc: 'Registry of Power Automate flow trigger GUIDs the SPA calls' },
  { file: 'powerpages.config.json',      desc: 'PAC upload config — the site name (PREFIX - Name) and which built assets to sync' },
  { file: '.powerpages-site/site-settings/', desc: 'Platform site settings incl. the two CSP files (enforced + report-only)' },
  { file: '.claude/skills/ppcs-*',       desc: 'Task skills: provision, deploy, register-flow, enable-web-api, add-csp-domain, promote-to-env' },
]
</script>

<style scoped>
.page { max-width: 800px; }

h1 {
  font-size: var(--smkb-font-size-3xl);
  font-weight: var(--smkb-font-weight-bold);
  color: var(--smkb-color-text-primary);
  margin: 0 0 var(--smkb-space-4);
}

h4 {
  font-size: var(--smkb-font-size-sm);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin: var(--smkb-space-5) 0 var(--smkb-space-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lead {
  font-size: var(--smkb-font-size-lg);
  color: var(--smkb-color-text-secondary);
  line-height: 1.6;
  margin-bottom: var(--smkb-space-8);
}

.section {
  margin-bottom: var(--smkb-space-12);
  padding-bottom: var(--smkb-space-8);
  border-bottom: 1px solid var(--smkb-color-border);
}

.section:last-of-type { border-bottom: none; }

.section h2 {
  font-size: var(--smkb-font-size-2xl);
  font-weight: var(--smkb-font-weight-bold);
  color: var(--smkb-color-text-primary);
  margin: 0 0 var(--smkb-space-5);
}

.section h3 {
  font-size: var(--smkb-font-size-lg);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin: var(--smkb-space-8) 0 var(--smkb-space-4);
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

/* Product grid */
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--smkb-space-3);
  margin-top: var(--smkb-space-5);
}

.product-card {
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  opacity: 0.6;
}

.product-card--used {
  opacity: 1;
  background: var(--smkb-color-surface-subtle);
  border-color: var(--smkb-color-primary);
}

.product-header {
  display: flex;
  align-items: center;
  gap: var(--smkb-space-2);
  margin-bottom: var(--smkb-space-1);
}

.product-icon { font-size: 1rem; }

.product-name {
  font-weight: var(--smkb-font-weight-semibold);
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-primary);
  flex: 1;
}

.product-badge {
  font-size: 10px;
  font-weight: var(--smkb-font-weight-semibold);
  background: color-mix(in srgb, var(--smkb-color-primary) 12%, transparent);
  color: var(--smkb-color-primary);
  padding: 1px 6px;
  border-radius: var(--smkb-radius-sm);
}

.product-desc {
  font-size: var(--smkb-font-size-xs);
  color: var(--smkb-color-text-secondary);
  line-height: 1.4;
}

/* Env types table */
.env-types-table {
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
  font-size: var(--smkb-font-size-sm);
  margin-bottom: var(--smkb-space-5);
}

.et-row {
  display: grid;
  grid-template-columns: 110px 180px 1fr;
  gap: var(--smkb-space-4);
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border-bottom: 1px solid var(--smkb-color-border);
  align-items: start;
  line-height: 1.5;
  color: var(--smkb-color-text-secondary);
}

.et-row:last-child { border-bottom: none; }
.et-header { background: var(--smkb-color-surface-raised); font-weight: var(--smkb-font-weight-semibold); color: var(--smkb-color-text-primary); }
.et-type { font-weight: var(--smkb-font-weight-semibold); color: var(--smkb-color-text-primary); }

/* SMKB environments */
.smkb-envs {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin: var(--smkb-space-4) 0;
}

.smkb-env {
  flex: 1;
  padding: var(--smkb-space-4);
  border: 2px solid;
  border-radius: var(--smkb-radius-md);
  font-size: var(--smkb-font-size-sm);
}

.smkb-env--dev   { border-color: var(--smkb-color-success); }
.smkb-env--stage { border-color: var(--smkb-color-warning); }
.smkb-env--prod  { border-color: var(--smkb-color-destructive); }

.senv-name {
  font-weight: var(--smkb-font-weight-bold);
  font-size: var(--smkb-font-size-base);
  color: var(--smkb-color-text-primary);
  margin-bottom: 2px;
}

.senv-url {
  font-family: monospace;
  font-size: 11px;
  color: var(--smkb-color-text-tertiary);
  margin-bottom: var(--smkb-space-2);
}

.senv-mode {
  font-size: 11px;
  font-weight: var(--smkb-font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--smkb-space-2);
}

.smkb-env--dev   .senv-mode { color: var(--smkb-color-success); }
.smkb-env--stage .senv-mode { color: var(--smkb-color-warning); }
.smkb-env--prod  .senv-mode { color: var(--smkb-color-destructive); }

.senv-desc {
  color: var(--smkb-color-text-secondary);
  line-height: 1.5;
  margin-bottom: var(--smkb-space-3);
  font-size: 12px;
}

.senv-deploy {
  font-size: 11px;
  font-weight: var(--smkb-font-weight-semibold);
}

.smkb-env--dev   .senv-deploy { color: var(--smkb-color-success); }
.smkb-env--stage .senv-deploy,
.smkb-env--prod  .senv-deploy { color: var(--smkb-color-destructive); }

.senv-arrow {
  display: flex;
  align-items: center;
  padding: 0 var(--smkb-space-2);
  color: var(--smkb-color-text-tertiary);
  font-size: 1.2rem;
  flex-shrink: 0;
}

/* Managed table */
.managed-table {
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
  font-size: var(--smkb-font-size-sm);
  margin-bottom: var(--smkb-space-5);
}

.mt-row {
  display: grid;
  grid-template-columns: 180px 1fr 1fr;
  gap: var(--smkb-space-4);
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border-bottom: 1px solid var(--smkb-color-border);
  align-items: start;
  line-height: 1.5;
  color: var(--smkb-color-text-secondary);
}

.mt-row:last-child { border-bottom: none; }
.mt-header { background: var(--smkb-color-surface-raised); font-weight: var(--smkb-font-weight-semibold); color: var(--smkb-color-text-primary); }
.mt-aspect { font-weight: var(--smkb-font-weight-semibold); color: var(--smkb-color-text-primary); }

/* ALM flow */
.alm-flow {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  margin: var(--smkb-space-4) 0;
  max-width: 480px;
}

.alm-step {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: var(--smkb-space-3);
  align-items: start;
  width: 100%;
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  background: var(--smkb-color-surface-subtle);
  font-size: var(--smkb-font-size-sm);
}

.alm-step--pipeline {
  background: color-mix(in srgb, var(--smkb-color-primary) 6%, transparent);
  border-color: var(--smkb-color-primary);
}

.alm-env {
  font-weight: var(--smkb-font-weight-bold);
  color: var(--smkb-color-primary);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding-top: 2px;
}

.alm-action {
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin-bottom: 2px;
}

.alm-note { color: var(--smkb-color-text-tertiary); font-size: 12px; }

.alm-arrow {
  padding: var(--smkb-space-1) 0 var(--smkb-space-1) var(--smkb-space-6);
  color: var(--smkb-color-text-tertiary);
  font-size: 1.1rem;
}

/* Component blocks */
.component-block {
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-lg);
  overflow: hidden;
  margin-bottom: var(--smkb-space-6);
}

.cb-header {
  display: flex;
  align-items: center;
  gap: var(--smkb-space-3);
  padding: var(--smkb-space-4) var(--smkb-space-5);
  background: var(--smkb-color-surface-raised);
  border-bottom: 1px solid var(--smkb-color-border);
}

.cb-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--smkb-radius-sm);
  font-size: 11px;
  font-weight: var(--smkb-font-weight-bold);
  color: white;
  flex-shrink: 0;
}

.cb-name {
  font-weight: var(--smkb-font-weight-bold);
  font-size: var(--smkb-font-size-base);
  color: var(--smkb-color-text-primary);
}

.cb-tagline {
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-secondary);
}

.cb-link {
  margin-left: auto;
  font-size: var(--smkb-font-size-xs);
  color: var(--smkb-color-primary);
  text-decoration: none;
  flex-shrink: 0;
  font-family: monospace;
}

.cb-link:hover { text-decoration: underline; }

.cb-body {
  padding: var(--smkb-space-5);
}

.cb-body p {
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-secondary);
  line-height: 1.7;
  margin-bottom: var(--smkb-space-4);
}

.cb-facts {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-3);
  border-top: 1px solid var(--smkb-color-border);
  padding-top: var(--smkb-space-4);
}

.cbf-item {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--smkb-space-4);
  font-size: var(--smkb-font-size-sm);
  line-height: 1.5;
  color: var(--smkb-color-text-secondary);
}

.cbf-label {
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
}

.cb-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--smkb-space-6);
  margin-bottom: var(--smkb-space-4);
}

.cb-sublabel {
  font-size: var(--smkb-font-size-xs);
  font-weight: var(--smkb-font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--smkb-color-text-tertiary);
  margin-bottom: var(--smkb-space-2);
}

.cb-list {
  margin: 0;
  padding-left: var(--smkb-space-4);
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-secondary);
  line-height: 1.7;
}

/* YAML types */
.yaml-types {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--smkb-space-2);
  margin-bottom: var(--smkb-space-4);
}

.yt-item {
  padding: var(--smkb-space-2) var(--smkb-space-3);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-sm);
  font-size: var(--smkb-font-size-xs);
}

.yt-file {
  display: block;
  font-family: monospace;
  font-size: 11px;
  color: var(--smkb-color-primary);
  background: none;
  border: none;
  padding: 0;
  margin-bottom: 2px;
}

.yt-desc { color: var(--smkb-color-text-secondary); line-height: 1.4; }

/* GUID list */
.guid-list {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-3);
  margin-bottom: var(--smkb-space-4);
}

.guid-item {
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border: 1px solid var(--smkb-color-destructive);
  border-radius: var(--smkb-radius-md);
  background: color-mix(in srgb, var(--smkb-color-destructive) 4%, transparent);
  font-size: var(--smkb-font-size-sm);
}

.guid-name {
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin-bottom: var(--smkb-space-1);
}

.guid-where {
  font-family: monospace;
  font-size: 11px;
  color: var(--smkb-color-text-secondary);
  line-height: 1.6;
}
</style>
