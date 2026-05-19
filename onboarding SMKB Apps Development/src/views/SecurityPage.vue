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
            <code>window.__SMKB_*</code> globals are injected by the Liquid shell — they are for
            non-sensitive config only (environment URLs, feature flags). Never pass tokens, session
            data, or PII through them.
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
          <div class="hook-detail-value"><code>v-html</code> usage, <code>console.log</code> statements, Vue rule violations, TypeScript errors</div>
        </div>
        <div class="hook-detail">
          <div class="hook-detail-label">How it's activated</div>
          <div class="hook-detail-value"><code>git config core.hooksPath .githooks</code> — run once during Init Project Step 5b</div>
        </div>
        <div class="hook-detail">
          <div class="hook-detail-label">Requires</div>
          <div class="hook-detail-value"><code>pnpm install</code> must have run first — the hook calls ESLint from <code>node_modules</code></div>
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
        that still contains <code>YourSolutionName</code> or <code>sol_example_table</code> pushes
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

    <!-- ── Section 4: deploy.mjs gates ──────────────────────────────────── -->
    <div class="section">
      <h2>Power Pages deploy pipeline — 6 sequential gates</h2>
      <p>
        When you run <code>pnpm deploy</code> in the Power Pages starter, <code>deploy.mjs</code>
        runs six checks in order before any file is uploaded. Each gate can block the deploy.
      </p>

      <div class="gate-list">
        <div v-for="gate in deployGates" :key="gate.num" class="gate-item">
          <div class="gate-num">{{ gate.num }}</div>
          <div class="gate-body">
            <div class="gate-name">{{ gate.name }}</div>
            <div class="gate-desc">{{ gate.desc }}</div>
          </div>
          <div class="gate-block">blocks if {{ gate.blocks }}</div>
        </div>
      </div>

      <InfoCallout type="note">
        These gates run automatically on every <code>pnpm deploy</code>. You do not need to
        remember them — the script enforces them.
      </InfoCallout>
    </div>

    <!-- ── Section 5: security-check.mjs ────────────────────────────────── -->
    <div class="section">
      <h2>pnpm check:security — 10 automated checks</h2>
      <p>
        Gate #4 in the deploy pipeline runs <code>scripts/security-check.mjs</code>,
        which performs 10 independent checks. Critical failures block the deploy.
        Warnings are printed but do not block.
      </p>

      <div class="check-table">
        <div class="check-row check-header">
          <div>#</div>
          <div>Check</div>
          <div>Severity</div>
          <div>What it catches</div>
        </div>
        <div v-for="check in securityChecks" :key="check.num" class="check-row">
          <div class="check-num">{{ check.num }}</div>
          <div class="check-name">{{ check.name }}</div>
          <div>
            <span :class="['check-badge', check.critical ? 'check-badge--critical' : 'check-badge--warning']">
              {{ check.critical ? 'Critical' : 'Warning' }}
            </span>
          </div>
          <div class="check-what">{{ check.what }}</div>
        </div>
      </div>

      <CodeBlock :code="securityCheckOutput">
        <template #filename>pnpm check:security — example output</template>
      </CodeBlock>
    </div>

    <!-- ── Section 6: GUID isolation ─────────────────────────────────────── -->
    <div class="section">
      <h2>GUID isolation — Power Pages</h2>

      <p>
        A <strong>GUID</strong> (Globally Unique Identifier) is a 128-bit number used as a
        unique identifier, written as a string of 32 hex digits in the format
        <code>xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code> — for example,
        <code>a3f1bd7e-2958-45af-90ce-e9d951422a3d</code>.
      </p>
      <p>
        In Power Platform, <strong>every Dataverse record has a GUID as its primary key</strong>.
        This includes portal configuration records: each webpage, web template, site setting,
        content snippet, and the site itself all have their own GUID. When
        <code>pac pages upload</code> sends YAML files to Dataverse, it performs an
        <em>upsert</em> — if a record with that GUID already exists, it is updated; if not,
        it is created. The GUID is the only thing that identifies which record to update.
      </p>

      <InfoCallout type="rule">
        <strong>Real incident — May 2026:</strong> The CIF portal and the Open Day portal were both
        initialized from this starter. Neither ran <code>guid-freshen.ps1</code> before their first
        deploy. When the second portal was uploaded, <code>pac pages upload</code> upserted Dataverse
        records using the same primary-key GUIDs — silently overwriting records that belonged to the
        first portal. Both portals broke and returned "Page Not Found" on every page.
      </InfoCallout>

      <p>
        Every portal built from this starter starts with the same hardcoded GUIDs in its YAML files.
        <code>pac pages upload</code> upserts records in Dataverse using those GUIDs as primary keys.
        If two portals share the same GUIDs, the second upload steals records from the first.
      </p>

      <div class="guid-steps">
        <div class="guid-step">
          <div class="guid-step-num">1</div>
          <div>
            <div class="guid-step-title">Run <code>guid-freshen.ps1</code> — exactly once</div>
            <div class="guid-step-desc">
              Replaces every portal-scoped GUID with a fresh random one. Preserves the live
              <code>adx_websiteid</code> (which you set from <code>pac pages list</code> in Step 7b).
              Run before the first deploy. After running, a <code>.guid-freshened</code> marker
              file is written — the script will refuse to run a second time to prevent
              accidentally breaking a live portal.
            </div>
          </div>
        </div>
        <div class="guid-step">
          <div class="guid-step-num">2</div>
          <div>
            <div class="guid-step-title">Run <code>verify-consistency.ps1</code></div>
            <div class="guid-step-desc">
              Validates 4 things: <code>adx_websiteid</code> is set, no starter sentinel GUIDs
              remain, all page references resolve, all weblink references resolve. Exit 1 on any failure.
            </div>
          </div>
        </div>
        <div class="guid-step">
          <div class="guid-step-num">3</div>
          <div>
            <div class="guid-step-title">deploy.mjs enforces this automatically</div>
            <div class="guid-step-desc">
              Gate #6 scans all YAML files for the starter sentinel GUID
              (<code>a3f1bd7e-2958-45af-90ce-e9d951422a3d</code>). If found, the deploy is
              blocked with "Run guid-freshen.ps1 first."
            </div>
          </div>
        </div>
      </div>

      <InfoCallout type="warning">
        Running <code>guid-freshen.ps1</code> a second time after the portal is live generates new
        GUIDs that no longer match the records in Dataverse. Every page returns "Page Not Found."
        This is not recoverable without a full re-upload and data migration. Run it once.
      </InfoCallout>
    </div>

    <!-- ── Section 7: Auth & headers ─────────────────────────────────────── -->
    <div class="section">
      <h2>Power Pages authentication &amp; HTTP hardening</h2>
      <p>
        The Power Pages starter ships with a hardened <code>sitesetting.yml</code>.
        These settings are pre-configured and verified by <code>pnpm check:security</code>
        before every deploy.
      </p>

      <h3>Authentication settings</h3>
      <div class="setting-table">
        <div v-for="s in authSettings" :key="s.name" class="setting-row">
          <code class="setting-name">{{ s.name }}</code>
          <div class="setting-value">
            <span :class="['setting-val', s.review ? 'setting-val--review' : 'setting-val--fixed']">
              {{ s.value }}
            </span>
            <span class="setting-desc">{{ s.desc }}</span>
          </div>
        </div>
      </div>

      <InfoCallout type="warning">
        <code>Authentication/Registration/OpenRegistrationEnabled</code> is set to <code>true</code>
        in the starter (for compatibility). For any portal that should NOT allow self-registration
        — invite-only, internal staff portals — set it to <code>false</code> before the first deploy.
        The starter includes a TODO comment on that setting as a reminder.
      </InfoCallout>

      <h3>HTTP security headers</h3>
      <p>Four security headers are pre-configured in <code>sitesetting.yml</code> and their presence is verified by check [5] before every deploy.</p>
      <div class="setting-table">
        <div v-for="h in httpHeaders" :key="h.header" class="setting-row">
          <code class="setting-name">{{ h.header }}</code>
          <div class="setting-value">
            <span class="setting-val setting-val--fixed">{{ h.value }}</span>
            <span class="setting-desc">{{ h.desc }}</span>
          </div>
        </div>
      </div>
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
  File: Entities/sol_example_table_a/Entity.xml
    → "sol_example_table_a"

Replace all placeholder strings before deploying.`

const envGuardExample = `DEPLOY BLOCKED -- This script only deploys to SMKB-Apps-Dev.

  Allowed:   https://org229c958d.crm4.dynamics.com/
  Attempted: https://org-stage.crm4.dynamics.com/

Stage and Production are promoted via Power Platform Pipeline only.`

const securityCheckOutput = `▶ Running security checks...

[1/10] Dependency vulnerabilities     ✓ No high/critical vulnerabilities
[2/10] Secret patterns in source      ✓ No secrets found
[3/10] .env* in .gitignore            ✓ .env* covered by .gitignore
[4/10] LocalLoginEnabled = false      ✓ Azure AD-only auth
[5/10] Required security headers      ✓ All 4 headers present
[6/10] LoginTrackingEnabled           ✓ Login audit trail active
[7/10] No v-html in Vue components    ✓ No v-html directives found
[8/10] No console.log in source       ✓ No console.log found
[9/10] PORTAL_URL configured          ✓ Configured
[10/10] adx_websiteid configured      ✓ Configured

Security check passed — 0 critical failures, 0 warnings.`

const deployGates = [
  {
    num: 1,
    name: 'Branch check',
    desc: 'Reads current branch with git rev-parse',
    blocks: 'branch is not main',
  },
  {
    num: 2,
    name: 'Config check',
    desc: 'Reads PORTAL_URL and PAGES_SUBDIR from deploy.mjs',
    blocks: 'either still contains TODO or default value',
  },
  {
    num: 3,
    name: 'ESLint gate',
    desc: 'Runs pnpm run lint on the full src/ folder',
    blocks: 'any ESLint error (v-html, console.log, Vue rules)',
  },
  {
    num: 4,
    name: 'Security check',
    desc: 'Runs scripts/security-check.mjs — 10 checks (see below)',
    blocks: 'any critical failure',
  },
  {
    num: 5,
    name: 'PAC environment verification',
    desc: 'Reads pac auth list, confirms org229c958d is active; auto-switches if found',
    blocks: 'no SMKB-Apps-Dev profile exists at all',
  },
  {
    num: 6,
    name: 'Sentinel GUID check',
    desc: 'Scans all YAML files for the starter sentinel GUID a3f1bd7e-...',
    blocks: 'guid-freshen.ps1 has not been run',
  },
]

const securityChecks = [
  { num: '1', name: 'Dependency vulnerabilities', critical: true,  what: 'pnpm audit — any high or critical CVE in npm packages' },
  { num: '2', name: 'Hardcoded secrets',          critical: true,  what: 'PRIVATE_KEY, password=, secret=, api_key=, Bearer <token> in src/' },
  { num: '3', name: '.env* in .gitignore',         critical: true,  what: '.env* pattern must be present in .gitignore' },
  { num: '4', name: 'LocalLoginEnabled = false',   critical: true,  what: 'Local password login must be disabled in sitesetting.yml' },
  { num: '5', name: 'Required HTTP headers',       critical: true,  what: 'All 4 security headers must exist in sitesetting.yml' },
  { num: '6', name: 'LoginTrackingEnabled',        critical: false, what: 'Login audit trail should be active on the portal' },
  { num: '7', name: 'No v-html in Vue files',      critical: true,  what: 'String scan of all .vue files in src/' },
  { num: '8', name: 'No console.log in source',    critical: false, what: 'Regex scan of .ts/.vue/.js files in src/' },
  { num: '9', name: 'PORTAL_URL configured',       critical: false, what: 'deploy.mjs PORTAL_URL must not contain TODO' },
  { num: '10', name: 'adx_websiteid configured',   critical: false, what: 'website.yml adx_websiteid must not contain TODO' },
]

const authSettings = [
  {
    name: 'Authentication/Registration/LocalLoginEnabled',
    value: 'false',
    desc: 'Local username/password login disabled — Azure AD is the only supported auth path',
    review: false,
  },
  {
    name: 'Authentication/Registration/AzureADLoginEnabled',
    value: 'true',
    desc: 'Azure AD external identity provider enabled',
    review: false,
  },
  {
    name: 'Authentication/LoginThrottling/MaxInvaildAttemptsFromIPAddress',
    value: '5',
    desc: '5 failed login attempts within 5 minutes triggers an IP-level lockout',
    review: false,
  },
  {
    name: 'Authentication/LoginThrottling/IpAddressTimeoutTimeSpan',
    value: '00:15:00',
    desc: 'Locked IP must wait 15 minutes before trying again',
    review: false,
  },
  {
    name: 'HTTP/SameSite/Default',
    value: 'Lax',
    desc: 'Cookies are not sent on cross-origin requests — prevents CSRF attacks',
    review: false,
  },
  {
    name: 'Authentication/LoginTrackingEnabled',
    value: 'True',
    desc: 'Last successful login is recorded on the Contact record for audit trail',
    review: false,
  },
  {
    name: 'Authentication/Registration/OpenRegistrationEnabled',
    value: 'true — review per project',
    desc: 'Anyone can self-register by default. Set to false for invite-only or internal portals.',
    review: true,
  },
]

const httpHeaders = [
  {
    header: 'HTTP/X-Frame-Options',
    value: 'DENY',
    desc: 'Prevents the portal from being embedded in an iframe — blocks clickjacking attacks',
  },
  {
    header: 'HTTP/X-Content-Type-Options',
    value: 'nosniff',
    desc: 'Forces browsers to respect the declared Content-Type — prevents MIME-sniffing exploits',
  },
  {
    header: 'HTTP/Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
    desc: 'Limits referrer header to origin only on cross-origin requests — prevents URL leakage',
  },
  {
    header: 'HTTP/Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
    desc: 'Disables sensitive browser capabilities by default — adjust per project if needed',
  },
]

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
      { cmd: 'pac pages download --overwrite', reason: 'Prevents the phantom GUID pitfall (Dataverse replaces hand-crafted GUIDs)' },
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
    action: 'pnpm deploy / pac pages upload',
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
