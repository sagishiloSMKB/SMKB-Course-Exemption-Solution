<template>
  <div class="page">
    <h1>AI &amp; Data Security</h1>
    <p class="lead">
      Claude can read your files and run commands in this project. That power comes with
      responsibility — for what you share in the conversation, what you commit to GitHub,
      and what data you put into the development environment.
    </p>

    <!-- ── Section 1: What Claude can see ─────────────────────────────── -->
    <div class="section">
      <h2>What Claude can see</h2>
      <p>
        Claude Code reads files you open, files it searches, and anything you paste into the
        conversation. That content is sent to Anthropic's API as part of the conversation context.
        Understand what belongs in a Claude conversation and what does not.
      </p>

      <div class="share-table">
        <div class="share-row share-header">
          <div>Content type</div>
          <div>Share with Claude?</div>
          <div>Why</div>
        </div>
        <div v-for="row in shareRules" :key="row.type" class="share-row">
          <div class="share-type">{{ row.type }}</div>
          <div>
            <span :class="['share-badge', `share-badge--${row.level}`]">{{ row.label }}</span>
          </div>
          <div class="share-why">{{ row.why }}</div>
        </div>
      </div>

      <InfoCallout type="rule">
        If you need to debug a problem involving real user data, describe the record structure —
        field names, types, relationships — not the actual values. Say "a registration record
        with a Hebrew first name" not the actual name.
      </InfoCallout>
    </div>

    <!-- ── Section 2: Workspace permissions ───────────────────────────── -->
    <div class="section">
      <h2>Claude Code workspace permissions</h2>
      <p>
        Claude Code operates inside the folder you open it in. It can read, search, and edit
        any file in that directory tree. Two rules govern this:
      </p>

      <div class="perm-rules">
        <div class="perm-rule">
          <div class="perm-rule-title">Keep repos isolated</div>
          <p>
            Never clone a solution repo inside a parent folder that contains other sensitive
            projects or data. If Claude searches for a keyword, it will find matches across
            everything in scope — including unrelated projects you did not intend to share.
          </p>
        </div>
        <div class="perm-rule">
          <div class="perm-rule-title">The allow / deny list is your control surface</div>
          <p>
            <code>.claude/settings.json</code> in each project defines exactly which terminal
            commands Claude can run automatically (allow list), which require your confirmation
            (anything not listed), and which are hard-blocked (deny list). This starter ships
            with a configured deny list — do not weaken it.
          </p>
        </div>
      </div>

      <InfoCallout type="tip">
        You can inspect exactly what Claude is allowed to do at any time by reading
        <code>.claude/settings.json</code> in the project root. If a command feels risky,
        add it to the deny list.
      </InfoCallout>
    </div>

    <!-- ── Section 3: GitHub & source control ─────────────────────────── -->
    <div class="section">
      <h2>GitHub &amp; source control</h2>
      <p>Everything you push to GitHub is stored by GitHub and visible to anyone with repo access.</p>

      <div class="practice-list">
        <div v-for="p in githubPractices" :key="p.title" class="practice-item">
          <span :class="['practice-icon', p.safe ? 'practice-icon--safe' : 'practice-icon--danger']">
            {{ p.safe ? '✓' : '✗' }}
          </span>
          <div>
            <div class="practice-title">{{ p.title }}</div>
            <div class="practice-desc">{{ p.desc }}</div>
          </div>
        </div>
      </div>

      <InfoCallout type="warning">
        If a secret is accidentally committed and pushed, assume it is compromised — even if
        you immediately delete it from the branch. GitHub caches push events and the commit is
        visible in the reflog. Rotate the credential first, then clean the history.
      </InfoCallout>
    </div>

    <!-- ── Section 4: API keys and secrets ────────────────────────────── -->
    <div class="section">
      <h2>API keys and secrets</h2>
      <p>
        Secrets committed to source code are a permanent liability. Once pushed, they are in the
        git history forever — even if you delete the file in the next commit.
      </p>

      <div class="secrets-tiers">
        <div class="secrets-tier">
          <div class="tier-label tier-label--good">For config that differs per environment</div>
          <div class="tier-body">
            Use <strong>Power Platform environment variables</strong>. Define them in the
            Environmental Variables Starter. They are stored in Dataverse, travel through the
            pipeline to Stage and Prod, and are never in source code.
          </div>
        </div>
        <div class="secrets-tier">
          <div class="tier-label tier-label--ok">For local-only development values</div>
          <div class="tier-body">
            Use <code>.env</code> files. The <code>.gitignore</code> in this starter already
            blocks <code>.env*</code> files from being committed. Never reference these values
            in deployed code — they don't exist in the cloud environment.
          </div>
        </div>
        <div class="secrets-tier">
          <div class="tier-label tier-label--bad">Never hardcode in source files</div>
          <div class="tier-body">
            API keys, passwords, access tokens, and Bearer tokens must never appear in
            <code>.ts</code>, <code>.vue</code>, <code>.json</code>, or any source file.
            The pre-deploy security check scans for these patterns and blocks deployment
            if any are found.
          </div>
        </div>
      </div>

      <p class="section-note">
        Secret patterns the security check scans for:
      </p>
      <div class="secret-patterns">
        <code v-for="p in secretPatterns" :key="p" class="secret-pattern">{{ p }}</code>
      </div>
    </div>

    <!-- ── Section 5: Mock data rules ─────────────────────────────────── -->
    <div class="section">
      <h2>Mock data rules</h2>
      <p>
        SMKB-Apps-Dev is a <strong>shared environment</strong>. Every developer working on
        any SMKB solution has read access to every table in that Dataverse instance.
        Anything you upload there is visible to your colleagues.
      </p>

      <div class="mock-rules">
        <div v-for="rule in mockRules" :key="rule.title" class="mock-rule">
          <div :class="['mock-icon', rule.danger ? 'mock-icon--danger' : 'mock-icon--ok']">
            {{ rule.danger ? '!' : '✓' }}
          </div>
          <div>
            <div class="mock-title">{{ rule.title }}</div>
            <div class="mock-desc">{{ rule.desc }}</div>
          </div>
        </div>
      </div>

      <InfoCallout type="rule">
        If you find real student or staff PII already in the Dev environment — names, emails,
        ID numbers — from a previous accidental upload, do not ignore it. Report it to the
        tech lead immediately. It must be deleted from Dataverse, not just left there.
      </InfoCallout>
    </div>

    <!-- ── Section 6: Local machine hygiene ───────────────────────────── -->
    <div class="section">
      <h2>Local machine hygiene</h2>

      <div class="hygiene-list">
        <div v-for="item in hygieneItems" :key="item.title" class="hygiene-item">
          <div class="hygiene-title">{{ item.title }}</div>
          <div class="hygiene-desc">{{ item.desc }}</div>
        </div>
      </div>
    </div>

    <ModuleNav module-id="ai-security" />
  </div>
</template>

<script setup lang="ts">
import InfoCallout from '../components/InfoCallout.vue'
import ModuleNav from '../components/ModuleNav.vue'

const shareRules = [
  {
    type: 'Source code, YAML schemas, XML files',
    level: 'yes', label: 'Yes',
    why: 'This is what Claude is here to work with — no PII in these files',
  },
  {
    type: 'Error messages and stack traces',
    level: 'yes', label: 'Yes',
    why: 'These are technical output with no personal data',
  },
  {
    type: 'console.log output containing record values',
    level: 'sanitize', label: 'Sanitize first',
    why: 'Strip real names, emails, and IDs before sharing — describe the shape instead',
  },
  {
    type: 'Dataverse record exports, CSV files',
    level: 'no', label: 'Never',
    why: 'Contains real student/staff PII — describe the schema instead',
  },
  {
    type: 'API responses with user data',
    level: 'no', label: 'Never',
    why: 'Share the field names and types, not the actual record values',
  },
  {
    type: 'Auth tokens, PAC credentials, API keys',
    level: 'no', label: 'Never',
    why: 'Rotate immediately if shared accidentally — treat as compromised',
  },
]

const githubPractices = [
  {
    safe: true,
    title: '.gitignore already covers the most common risks',
    desc: '.env*, _dist/, dist/, *.zip, node_modules/ — all excluded. Do not remove these entries.',
  },
  {
    safe: true,
    title: 'GitHub PAT: fine-grained, org-scoped, rotated every 90 days',
    desc: 'Create tokens at github.com/settings/personal-access-tokens. Scope to SMKB-AC-IL org only, with the minimum permissions you actually need.',
  },
  {
    safe: false,
    title: 'Never commit .env files, solution zip exports, or exported data',
    desc: 'Even a single accidental commit of a .env file exposes credentials permanently in the git history.',
  },
  {
    safe: false,
    title: 'Never paste secrets into commit messages, PR descriptions, or issue comments',
    desc: 'GitHub indexes all of this text. Credentials in PR descriptions are just as exposed as credentials in code.',
  },
]

const secretPatterns = [
  'PRIVATE_KEY =',
  'password = "..."',
  'secret = "..."',
  'api_key = "..."',
  'Bearer <token>',
]

const mockRules = [
  {
    danger: false,
    title: 'Create synthetic test data with fake names and emails',
    desc: 'Use names like "John Test", emails like test@example.com, and made-up ID numbers. The goal is valid schema — not realistic data.',
  },
  {
    danger: false,
    title: 'Use your own email (or a test mailbox) when testing flows',
    desc: 'When testing Power Automate flows that send emails, the recipient must be you — never a real student.',
  },
  {
    danger: false,
    title: 'Submit Power Pages forms with fake data',
    desc: 'Fill registration forms with synthetic data. If a form has required fields you do not control, use placeholder values that are obviously fake.',
  },
  {
    danger: true,
    title: 'Never upload real student or staff records for testing',
    desc: 'Do not use a data export from production as "test data". Every record you upload to Dev is visible to all SMKB developers.',
  },
  {
    danger: true,
    title: 'Never use production data to reproduce a bug',
    desc: 'Recreate the minimum data structure that triggers the bug using synthetic values. Do not copy the actual record.',
  },
]

const hygieneItems = [
  {
    title: 'Lock your screen when away from your desk',
    desc: 'PAC CLI stores authentication tokens in Windows Credential Manager. An unlocked machine is a live connection to the SMKB environment.',
  },
  {
    title: 'Never run pac auth create with SMKB credentials on a shared or public machine',
    desc: 'Auth tokens are stored per Windows user profile. On a shared machine, the next user inherits your PAC auth session.',
  },
  {
    title: 'VS Code and Cursor: only install extensions from trusted publishers',
    desc: 'Extensions run with full access to your file system and can read files in open workspaces — including .env files and source code. Install only from Microsoft, well-known open source projects, or publishers you have verified.',
  },
  {
    title: 'Review global Claude Code settings if you work on multiple projects',
    desc: 'Global settings live in ~\\.claude\\ on your machine. If you have added permissive allow rules for another project, they apply to all projects. Keep global settings conservative and use project-level .claude/settings.json for per-project permissions.',
  },
  {
    title: 'Rotate credentials after any suspected exposure',
    desc: 'If you suspect a PAC auth token, GitHub PAT, or API key was exposed — shared in a chat, visible on screen during a meeting, accidentally committed — rotate it immediately. Do not wait to confirm the exposure.',
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

.section-note {
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-tertiary);
  margin-bottom: var(--smkb-space-2);
}

code {
  background: var(--smkb-color-surface-subtle);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-sm);
  padding: 2px 6px;
  font-family: monospace;
  font-size: 0.9em;
}

/* ── Share table ─────────────────────────────────────────────────────────── */
.share-table {
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
  margin-bottom: var(--smkb-space-4);
  font-size: var(--smkb-font-size-sm);
}

.share-row {
  display: grid;
  grid-template-columns: 1fr 110px 1fr;
  gap: var(--smkb-space-4);
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border-bottom: 1px solid var(--smkb-color-border);
  align-items: center;
  line-height: 1.4;
}

.share-row:last-child { border-bottom: none; }

.share-header {
  background: var(--smkb-color-surface-raised);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
}

.share-type { color: var(--smkb-color-text-primary); }
.share-why  { color: var(--smkb-color-text-secondary); }

.share-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--smkb-radius-sm);
  font-size: 11px;
  font-weight: var(--smkb-font-weight-semibold);
}

.share-badge--yes {
  background: color-mix(in srgb, var(--smkb-color-success) 12%, transparent);
  color: var(--smkb-color-success);
}

.share-badge--sanitize {
  background: color-mix(in srgb, var(--smkb-color-warning) 15%, transparent);
  color: color-mix(in srgb, var(--smkb-color-warning) 80%, var(--smkb-color-text-primary));
}

.share-badge--no {
  background: color-mix(in srgb, var(--smkb-color-destructive) 12%, transparent);
  color: var(--smkb-color-destructive);
}

/* ── Workspace permission rules ─────────────────────────────────────────── */
.perm-rules {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-4);
  margin-bottom: var(--smkb-space-4);
}

.perm-rule {
  padding: var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  background: var(--smkb-color-surface-subtle);
}

.perm-rule-title {
  font-size: var(--smkb-font-size-sm);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin-bottom: var(--smkb-space-2);
}

.perm-rule p {
  font-size: var(--smkb-font-size-sm);
  margin-bottom: 0;
}

/* ── GitHub practices ────────────────────────────────────────────────────── */
.practice-list {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-3);
  margin-bottom: var(--smkb-space-4);
}

.practice-item {
  display: flex;
  gap: var(--smkb-space-3);
  align-items: flex-start;
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  font-size: var(--smkb-font-size-sm);
}

.practice-icon {
  font-weight: var(--smkb-font-weight-bold);
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 1px;
}

.practice-icon--safe    { color: var(--smkb-color-success); }
.practice-icon--danger  { color: var(--smkb-color-destructive); }

.practice-title {
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin-bottom: var(--smkb-space-1);
}

.practice-desc { color: var(--smkb-color-text-secondary); line-height: 1.5; }

/* ── Secrets tiers ───────────────────────────────────────────────────────── */
.secrets-tiers {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-3);
  margin-bottom: var(--smkb-space-4);
}

.secrets-tier {
  padding: var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  font-size: var(--smkb-font-size-sm);
}

.tier-label {
  font-weight: var(--smkb-font-weight-semibold);
  margin-bottom: var(--smkb-space-2);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tier-label--good { color: var(--smkb-color-success); }
.tier-label--ok   { color: color-mix(in srgb, var(--smkb-color-warning) 80%, var(--smkb-color-text-primary)); }
.tier-label--bad  { color: var(--smkb-color-destructive); }

.tier-body { color: var(--smkb-color-text-secondary); line-height: 1.6; }

.secret-patterns {
  display: flex;
  flex-wrap: wrap;
  gap: var(--smkb-space-2);
  margin-bottom: var(--smkb-space-4);
}

.secret-pattern {
  font-size: 12px;
  background: color-mix(in srgb, var(--smkb-color-destructive) 8%, transparent);
  border-color: color-mix(in srgb, var(--smkb-color-destructive) 25%, transparent);
  color: var(--smkb-color-destructive);
}

/* ── Mock data rules ─────────────────────────────────────────────────────── */
.mock-rules {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-3);
  margin-bottom: var(--smkb-space-4);
}

.mock-rule {
  display: flex;
  gap: var(--smkb-space-3);
  align-items: flex-start;
  padding: var(--smkb-space-3) var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  font-size: var(--smkb-font-size-sm);
}

.mock-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: var(--smkb-font-weight-bold);
  flex-shrink: 0;
  margin-top: 1px;
}

.mock-icon--ok     { background: color-mix(in srgb, var(--smkb-color-success) 15%, transparent); color: var(--smkb-color-success); }
.mock-icon--danger { background: color-mix(in srgb, var(--smkb-color-destructive) 12%, transparent); color: var(--smkb-color-destructive); }

.mock-title { font-weight: var(--smkb-font-weight-semibold); color: var(--smkb-color-text-primary); margin-bottom: var(--smkb-space-1); }
.mock-desc  { color: var(--smkb-color-text-secondary); line-height: 1.5; }

/* ── Local machine hygiene ───────────────────────────────────────────────── */
.hygiene-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--smkb-color-border);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
}

.hygiene-item {
  padding: var(--smkb-space-4);
  background: var(--smkb-color-surface);
  font-size: var(--smkb-font-size-sm);
}

.hygiene-title {
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin-bottom: var(--smkb-space-1);
}

.hygiene-desc { color: var(--smkb-color-text-secondary); line-height: 1.5; }
</style>
