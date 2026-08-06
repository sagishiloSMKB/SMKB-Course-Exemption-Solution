<template>
  <div class="page">
    <h1>Starter Security Measures</h1>
    <p class="lead">
      Security in this starter is enforced at multiple layers — from the moment you type code
      to the moment it reaches the cloud. This page walks through every built-in mechanism,
      why it exists, and what you need to know as a developer.
    </p>

    <!-- ── Section 1: Coding rules ───────────────────────────────────────── -->
    <div class="section">
      <h2>Your coding rules</h2>
      <p>These three rules apply to every Vue and TypeScript file you write. They are enforced automatically by ESLint — but you should understand why they exist.</p>

      <div class="rule-cards">
        <div class="rule-card">
          <div class="rule-title">
            <span class="rule-badge">1</span>
            Never use <code>v-html</code>
          </div>
          <p>
            <code>v-html</code> renders raw HTML into the DOM without escaping it. Power Pages and
            Power Apps both display data from Dataverse — which contains user-submitted values.
            An attacker who submits a registration with a crafted name field can inject a
            <code>&lt;script&gt;</code> tag that executes when a staff member opens the admin app.
          </p>
          <p>Use <code>v-text</code> or component slots — they always escape HTML automatically.</p>
          <CodeBlock :code="vhtmlExample" />
        </div>

        <div class="rule-card">
          <div class="rule-title">
            <span class="rule-badge">2</span>
            Never use <code>console.log</code> in <code>src/</code>
          </div>
          <p>
            Debug statements in source code leak sensitive data — Dataverse record IDs, user
            details, API responses — to anyone who opens browser DevTools on a public portal page.
            <code>console.warn</code> and <code>console.error</code> are allowed for legitimate
            runtime warnings.
          </p>
          <p>
            The ESLint rule <code>no-console</code> is set to <code>'error'</code>.
            Any <code>console.log</code> in staged files blocks the commit before it is created.
          </p>
        </div>

        <div class="rule-card">
          <div class="rule-title">
            <span class="rule-badge">3</span>
            Validate at system boundaries
          </div>
          <p>
            Never trust values that cross a boundary into your code: API responses, URL parameters,
            and <code>window.__SMKB_*</code> globals. Validate shape and type before using them.
          </p>
          <p>
            Any globals injected into the page by the host runtime are for non-sensitive config only
            (environment URLs, feature flags). Never pass tokens, session data, or PII through them,
            and validate their shape before use.
          </p>
        </div>
      </div>
    </div>

    <!-- ── Section 2: Pre-commit hook ───────────────────────────────────── -->
    <div class="section">
      <h2>The pre-commit hook</h2>
      <p>
        A Git hook at <code>.githooks/pre-commit</code> runs ESLint automatically
        before every commit is created. If any ESLint error is found, the commit is blocked.
      </p>
      <div class="hook-details">
        <div class="hook-detail">
          <div class="hook-detail-label">When it fires</div>
          <div class="hook-detail-value">Only when <code>.vue</code> or <code>.ts</code> files are staged — commits that only touch YAML or PowerShell files are skipped</div>
        </div>
        <div class="hook-detail">
          <div class="hook-detail-label">What it catches</div>
          <div class="hook-detail-value"><code>v-html</code> usage, <code>console.log</code> statements, Vue rule violations, TypeScript errors — plus config drift (<code>apply-config.ps1 -Check</code>) and root doc-boundary violations</div>
        </div>
        <div class="hook-detail">
          <div class="hook-detail-label">How it's activated</div>
          <div class="hook-detail-value"><code>git config core.hooksPath .githooks</code> — run once during Init Project Phase 3.5</div>
        </div>
        <div class="hook-detail">
          <div class="hook-detail-label">Requires</div>
          <div class="hook-detail-value">Each starter's deps installed (pnpm or npm) — the hook lints each staged file with that starter's own local ESLint</div>
        </div>
      </div>
      <CodeBlock :code="hookBlockedExample" />
    </div>

    <!-- ── Section 3: deploy.ps1 guards ─────────────────────────────────── -->
    <div class="section">
      <h2>Deploy script guards — all starters</h2>
      <p>
        Every <code>deploy.ps1</code> (Tables, Env Vars, Flows, Power Apps) runs two safety
        checks before doing anything. Both cause an immediate <code>exit 1</code> if triggered.
      </p>

      <h3>Placeholder scan</h3>
      <p>
        The script scans all source files for unreplaced template strings. Deploying a solution
        that still contains <code>YourSolutionName</code> or an un-renamed <code>smkb_sol_</code> schema name pushes
        placeholder schema to the shared environment — it succeeds silently, which makes it worse.
      </p>
      <CodeBlock :code="placeholderBlockExample">
        <template #filename>deploy.ps1 — placeholder guard output</template>
      </CodeBlock>

      <h3>Environment URL guard</h3>
      <p>
        The target environment URL is hardcoded to <code>org229c958d.crm4.dynamics.com</code>
        (SMKB-Apps-Dev). Any other URL is rejected immediately — this makes it structurally
        impossible to accidentally deploy to Stage or Production via these scripts.
      </p>
      <CodeBlock :code="envGuardExample">
        <template #filename>deploy.ps1 — environment guard output</template>
      </CodeBlock>

      <InfoCallout type="warning">
        The PAC CLI profile named <strong>"SMKB-Apps-Dev"</strong> incorrectly targets
        <code>org1dce1895</code> (Seminar Hakibutzim College — wrong org). Deploy scripts hardcode
        the correct URL so they do not rely on the profile name. Always verify the URL in
        <code>pac auth list</code> output, not the profile name.
      </InfoCallout>
    </div>

    <!-- Section 4: Power Pages Code Site security model -->
    <div class="section">
      <h2>Power Pages Code Site - security model</h2>
      <p>
        The Power Pages Code Site is a Vue SPA uploaded with <code>pac pages upload-code-site</code>.
        Its <code>deploy</code> script runs lint, tests, and the type-checked build before uploading,
        so unsafe or broken code never reaches the site. Runtime security rests on four pillars:
      </p>

      <h3>1 - Content Security Policy (two files, kept in sync)</h3>
      <p>
        The site ships two CSP site-setting files - an <strong>enforced</strong> policy and a
        <strong>report-only</strong> policy. External domains (analytics, fonts, maps, OAuth) are added
        to <em>both</em> via the <code>/ppcs-add-csp-domain</code> skill, which detects drift between
        the two files before editing so report-only never falls out of sync.
      </p>

      <h3>2 - Flows-only by default</h3>
      <p>
        The SPA has no direct Dataverse write access. Backend calls go through Power Automate cloud
        flows using the HTTP 200 + <code>errorCode</code> contract (never a raw 4xx/5xx). Direct table
        access is opt-in per table via <code>/ppcs-enable-web-api</code>, which also generates the
        required table-permission records and restricts the exposed fields.
      </p>

      <h3>3 - Authentication</h3>
      <p>
        Anonymous by default. The site can require Power Pages OAuth, or wire in the dormant phone-OTP
        module via <code>/ppcs-enable-otp-auth</code> (adds login and lockout routes, a router guard,
        session-expiry handling, and the Turnstile CSP domains).
      </p>

      <h3>4 - No secrets in a public bundle</h3>
      <p>
        The SPA is a public static bundle - never embed tokens, connection strings, or PII. ESLint
        bans <code>v-html</code>, <code>console.log</code>, and raw <code>fetch</code> /
        <code>XMLHttpRequest</code> outside the sanctioned flow client.
      </p>

      <InfoCallout type="tip">
        When a page 403s, a flow returns an error, or the browser blocks a resource, the
        <code>/ppcs-troubleshoot</code> skill diagnoses the nine most common Code Site failures
        (500 on promotion, portal template visible, /Profile redirect, route 404, Web API 403,
        flow 403, CSP block, duplicate sites, stale-chunk import errors after deploy).
      </InfoCallout>
    </div>

    <!-- ── Section 8: AI agent permission system ─────────────────────────── -->
    <div class="section">
      <h2>AI agent permission system</h2>
      <p>
        Claude Code operates under two layers of constraints in this project: a hard deny list
        in <code>.claude/settings.json</code> that blocks certain commands at the tool level,
        and autonomy constraints in <code>CLAUDE.md</code> that govern when Claude acts.
      </p>

      <h3>Hard-blocked commands (deny list)</h3>
      <p>These 9 commands are structurally blocked — Claude cannot run them regardless of what anyone says.</p>

      <div class="deny-groups">
        <div v-for="group in denyGroups" :key="group.label" class="deny-group">
          <div class="deny-group-label">{{ group.label }}</div>
          <div class="deny-items">
            <div v-for="cmd in group.commands" :key="cmd.cmd" class="deny-item">
              <code class="deny-cmd">{{ cmd.cmd }}</code>
              <div class="deny-reason">{{ cmd.reason }}</div>
            </div>
          </div>
        </div>
      </div>

      <h3>Autonomy constraints</h3>
      <p>Even for commands Claude <em>can</em> run, certain actions require an explicit instruction in the current message:</p>
      <div class="autonomy-rules">
        <div v-for="rule in autonomyRules" :key="rule.action" class="autonomy-rule">
          <code class="autonomy-action">{{ rule.action }}</code>
          <div class="autonomy-trigger">{{ rule.trigger }}</div>
        </div>
      </div>

      <InfoCallout type="tip">
        When Claude asks "did you mean to deploy?" or "please confirm this push" — that's this
        system working. Each deploy, commit, and push requires a fresh explicit request.
        Approving something once in this session does not authorize it in the next message.
      </InfoCallout>
    </div>

    <!-- ── Section 9: Prompt injection ──────────────────────────────────── -->
    <div class="section">
      <h2>Prompt injection awareness</h2>
      <p>
        Power Pages receives user-submitted form data and Dataverse record values — all of which
        are attacker-controlled. An attacker can craft a form submission that contains instructions
        directed at the AI agent.
      </p>
      <InfoCallout type="rule">
        Never paste raw form submission data or Dataverse record values into a Claude conversation.
        If a malicious submission contains embedded instructions, Claude may follow them instead of
        yours. Describe the data schema — share actual content only after sanitizing it (remove
        real names, emails, and any free-text fields).
      </InfoCallout>
    </div>

    <ModuleNav module-id="security" />
  </div>
</template>

<script setup lang="ts">
import CodeBlock from '../components/CodeBlock.vue'
import InfoCallout from '../components/InfoCallout.vue'
import ModuleNav from '../components/ModuleNav.vue'

const vhtmlExample = `<!-- Bad — renders raw HTML from Dataverse, XSS risk -->
<div v-html="record.description" />

<!-- Good — v-text escapes all HTML characters -->
<div v-text="record.description" />

<!-- Good — text interpolation in a slot, also safe -->
<SmkbField>{{ record.description }}</SmkbField>`

const hookBlockedExample = `$ git commit -m "add registration form"

Running ESLint on staged .vue/.ts files...

  src/views/RegistrationPage.vue
    23:5  error  Use of v-html is not allowed        vue/no-v-html
    41:9  error  Unexpected console statement         no-console

ESLint found 2 errors. Commit blocked.
Fix the issues above and try again.`

const placeholderBlockExample = `▶ Checking for unreplaced placeholders...

DEPLOY BLOCKED — unreplaced placeholders found:

  File: Other/Solution.xml
    → "YourSolutionName"
  File: Entities/smkb_sol_ExampleTableA/Entity.xml
    → "smkb_sol_"

Replace all placeholder strings before deploying.`

const envGuardExample = `DEPLOY BLOCKED -- This script only deploys to SMKB-Apps-Dev.

  Allowed:   https://org229c958d.crm4.dynamics.com/
  Attempted: https://org-stage.crm4.dynamics.com/

Stage and Production are promoted via Power Platform Pipeline only.`






const denyGroups = [
  {
    label: 'Deploy commands',
    commands: [
      { cmd: 'pac pages upload',    reason: 'Portal upload — requires explicit deploy request' },
      { cmd: 'pac solution import', reason: 'Solution import — requires explicit deploy request' },
      { cmd: 'pac code push',       reason: 'Power Apps push — requires explicit deploy request' },
    ],
  },
  {
    label: 'Environment & auth switching',
    commands: [
      { cmd: 'pac auth select',              reason: 'Prevents silent environment switching between orgs' },
      { cmd: 'pac pages download --overwrite', reason: 'Prevents clobbering local site files with the server copy' },
    ],
  },
  {
    label: 'Destructive git operations',
    commands: [
      { cmd: 'git push --force',    reason: 'Overwrites remote history — irreversible' },
      { cmd: 'git commit --amend',  reason: 'Rewrites published commits — breaks collaborators' },
      { cmd: 'git reset --hard',    reason: 'Destroys all uncommitted work permanently' },
      { cmd: 'git clean -f',        reason: 'Deletes all untracked files permanently' },
    ],
  },
]

const autonomyRules = [
  {
    action: 'deploy.ps1 / pac pages upload-code-site',
    trigger: 'Only when you say "deploy" in the current message',
  },
  {
    action: 'git commit',
    trigger: 'Only when you say "commit" or "create a commit"',
  },
  {
    action: 'git push',
    trigger: 'Only when you say "push"',
  },
  {
    action: 'git push --force',
    trigger: 'Always flagged as risky — never assumed approved',
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

h3 {
  font-size: var(--smkb-font-size-base);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin: var(--smkb-space-6) 0 var(--smkb-space-3);
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

/* ── Rule cards ─────────────────────────────────────────────────────────── */
.rule-cards {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-4);
}

.rule-card {
  padding: var(--smkb-space-5);
  border: 1px solid var(--smkb-color-destructive);
  border-radius: var(--smkb-radius-md);
  background: color-mix(in srgb, var(--smkb-color-destructive) 4%, transparent);
}

.rule-title {
  display: flex;
  align-items: center;
  gap: var(--smkb-space-3);
  font-size: var(--smkb-font-size-base);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin-bottom: var(--smkb-space-3);
}

.rule-badge {
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

/* ── Pre-commit hook ─────────────────────────────────────────────────────── */
.hook-details {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--smkb-color-border);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
  margin-bottom: var(--smkb-space-4);
  font-size: var(--smkb-font-size-sm);
}

.hook-detail {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: var(--smkb-space-4);
  padding: var(--smkb-space-3) var(--smkb-space-4);
  background: var(--smkb-color-surface);
  align-items: start;
  line-height: 1.5;
}

.hook-detail-label {
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
}

.hook-detail-value {
  color: var(--smkb-color-text-secondary);
}

/* ── Deploy gates ────────────────────────────────────────────────────────── */
.gate-list {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-2);
  margin-bottom: var(--smkb-space-4);
}

.gate-item {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: var(--smkb-space-3);
  align-items: start;
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  background: var(--smkb-color-surface-subtle);
  font-size: var(--smkb-font-size-sm);
}

.gate-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--smkb-color-primary);
  color: white;
  font-size: 12px;
  font-weight: var(--smkb-font-weight-bold);
  flex-shrink: 0;
}

.gate-name {
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin-bottom: 2px;
}

.gate-desc {
  color: var(--smkb-color-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.gate-block {
  font-size: 11px;
  color: var(--smkb-color-destructive);
  white-space: nowrap;
  padding-top: 4px;
}

/* ── Security check table ────────────────────────────────────────────────── */
.check-table {
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
  margin-bottom: var(--smkb-space-4);
  font-size: var(--smkb-font-size-sm);
}

.check-row {
  display: grid;
  grid-template-columns: 32px 180px 80px 1fr;
  gap: var(--smkb-space-3);
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border-bottom: 1px solid var(--smkb-color-border);
  align-items: center;
  line-height: 1.4;
}

.check-row:last-child { border-bottom: none; }

.check-header {
  background: var(--smkb-color-surface-raised);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
}

.check-num {
  text-align: center;
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-tertiary);
}

.check-name {
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
}

.check-what { color: var(--smkb-color-text-secondary); font-size: 12px; }

.check-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--smkb-radius-sm);
  font-size: 11px;
  font-weight: var(--smkb-font-weight-semibold);
}

.check-badge--critical {
  background: color-mix(in srgb, var(--smkb-color-destructive) 12%, transparent);
  color: var(--smkb-color-destructive);
}

.check-badge--warning {
  background: color-mix(in srgb, var(--smkb-color-warning) 15%, transparent);
  color: color-mix(in srgb, var(--smkb-color-warning) 80%, var(--smkb-color-text-primary));
}

/* ── GUID steps ──────────────────────────────────────────────────────────── */
.guid-steps {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-3);
  margin: var(--smkb-space-4) 0;
}

.guid-step {
  display: flex;
  gap: var(--smkb-space-3);
  padding: var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  background: var(--smkb-color-surface-subtle);
  font-size: var(--smkb-font-size-sm);
  align-items: flex-start;
}

.guid-step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--smkb-color-primary) 15%, transparent);
  color: var(--smkb-color-primary);
  font-size: 12px;
  font-weight: var(--smkb-font-weight-bold);
  flex-shrink: 0;
}

.guid-step-title {
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin-bottom: var(--smkb-space-1);
}

.guid-step-desc { color: var(--smkb-color-text-secondary); line-height: 1.5; }

/* ── Setting table ───────────────────────────────────────────────────────── */
.setting-table {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--smkb-color-border);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
  margin-bottom: var(--smkb-space-4);
  font-size: var(--smkb-font-size-sm);
}

.setting-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--smkb-space-4);
  padding: var(--smkb-space-3) var(--smkb-space-4);
  background: var(--smkb-color-surface);
  align-items: start;
  line-height: 1.5;
}

.setting-name {
  background: none;
  border: none;
  padding: 0;
  font-size: 11px;
  color: var(--smkb-color-text-secondary);
  word-break: break-all;
}

.setting-value { display: flex; flex-direction: column; gap: 2px; }

.setting-val {
  display: inline-block;
  font-family: monospace;
  font-size: 11px;
  font-weight: var(--smkb-font-weight-semibold);
  padding: 1px 6px;
  border-radius: var(--smkb-radius-sm);
  width: fit-content;
}

.setting-val--fixed {
  background: color-mix(in srgb, var(--smkb-color-success) 12%, transparent);
  color: var(--smkb-color-success);
}

.setting-val--review {
  background: color-mix(in srgb, var(--smkb-color-warning) 15%, transparent);
  color: color-mix(in srgb, var(--smkb-color-warning) 80%, var(--smkb-color-text-primary));
}

.setting-desc { font-size: 11px; color: var(--smkb-color-text-tertiary); line-height: 1.4; }

/* ── Deny list ───────────────────────────────────────────────────────────── */
.deny-groups {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-4);
  margin-bottom: var(--smkb-space-4);
}

.deny-group-label {
  font-size: var(--smkb-font-size-sm);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--smkb-space-2);
}

.deny-items {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--smkb-color-border);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
}

.deny-item {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--smkb-space-4);
  padding: var(--smkb-space-3) var(--smkb-space-4);
  background: var(--smkb-color-surface);
  align-items: center;
  font-size: var(--smkb-font-size-sm);
}

.deny-cmd {
  background: none;
  border: none;
  padding: 0;
  font-family: monospace;
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-destructive);
  font-weight: var(--smkb-font-weight-semibold);
}

.deny-reason { color: var(--smkb-color-text-secondary); line-height: 1.4; }

/* ── Autonomy rules ──────────────────────────────────────────────────────── */
.autonomy-rules {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--smkb-color-border);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
  margin-bottom: var(--smkb-space-4);
  font-size: var(--smkb-font-size-sm);
}

.autonomy-rule {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: var(--smkb-space-4);
  padding: var(--smkb-space-3) var(--smkb-space-4);
  background: var(--smkb-color-surface);
  align-items: center;
}

.autonomy-action {
  background: none;
  border: none;
  padding: 0;
  font-family: monospace;
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-primary);
  font-weight: var(--smkb-font-weight-semibold);
}

.autonomy-trigger { color: var(--smkb-color-text-secondary); }
</style>
