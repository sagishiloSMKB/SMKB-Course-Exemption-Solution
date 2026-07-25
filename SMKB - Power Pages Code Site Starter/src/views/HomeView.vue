<template>
  <div class="home">

    <!-- ── Hero ──────────────────────────────────────────────────────────── -->
    <div class="hero">
      <div class="status-badge">✓ Site is live on Power Pages</div>
      <h1>Hello World</h1>
      <p class="subtitle">Power Pages Vue Starter is running!</p>
    </div>

    <!-- ── User info ──────────────────────────────────────────────────────── -->
    <div class="user-section">
      <template v-if="user.isAuthenticated">
        <h2>Welcome, {{ user.firstName }}!</h2>
        <dl class="user-details">
          <dt>Name</dt>
          <dd>{{ user.firstName }} {{ user.lastName }}</dd>
          <dt>Email</dt>
          <dd>{{ user.email }}</dd>
          <dt>Contact ID</dt>
          <dd>{{ user.contactId }}</dd>
        </dl>
        <SmkbButton variant="secondary" @click="handleSignOut">Sign Out</SmkbButton>
      </template>

      <template v-else>
        <p class="anon-message">You are browsing anonymously.</p>
        <SmkbButton variant="primary" @click="handleSignIn">Sign In</SmkbButton>
      </template>
    </div>

    <!-- ── Cloud flow demo ────────────────────────────────────────────────── -->
    <!-- This starter is flows-only: all backend work goes through Power Automate
         cloud flows via invokeFlow(). Register a flow with /ppcs-register-flow
         and this card lights up. -->
    <div class="user-section flow-demo">
      <h2>Call a cloud flow</h2>
      <template v-if="firstFlowGuid">
        <p class="anon-message">
          Invokes the first flow registered in <code>src/config/flows.ts</code>
          (<code>{{ firstFlowName }}</code>).
        </p>
        <SmkbButton variant="primary" :loading="flowLoading" @click="callExampleFlow">
          Invoke {{ firstFlowName }}
        </SmkbButton>
        <pre v-if="flowResult" class="flow-result">{{ flowResult }}</pre>
      </template>
      <template v-else>
        <p class="anon-message">
          No flows registered yet. Build a flow with the
          <em>"When Power Pages calls a flow"</em> trigger, register it in Power Pages
          Studio, then run <code>/ppcs-register-flow</code> to add its GUID to
          <code>src/config/flows.ts</code> — this card will enable itself.
        </p>
      </template>
    </div>

    <!-- ── Next steps ─────────────────────────────────────────────────────── -->
    <details class="next-steps">
      <summary>Next steps after confirming this page works</summary>
      <ol>
        <li>
          Set up local development: copy <code>.env.example</code> → <code>.env.local</code>,
          fill in <code>VITE_PORTAL_URL</code>, then run <code>npm run dev</code>
          (requires <code>NPM_TOKEN</code> for <code>npm install</code>).
        </li>
        <li>
          Edit <code>src/views/HomeView.vue</code> — this is the starting point for your app.
        </li>
        <li>
          Download site components with
          <code>pac pages download --path "./.powerpages-site" --webSiteId &lt;GUID&gt; --modelVersion 2</code>
          to manage web roles and site settings in code.
        </li>
        <li>
          Register a cloud flow with <code>/ppcs-register-flow</code> — flows are this
          starter's only backend channel (see <code>docs/FLOW-ERROR-CONTRACT.md</code>).
        </li>
        <li>
          Optional: enable phone-OTP login with <code>/ppcs-enable-otp-auth</code>
          (module ships dormant in <code>src/modules/otp-auth/</code>).
        </li>
        <li>
          Read <a href="/POWER-PAGES-CODE-SITE-GUIDE.md" target="_blank">POWER-PAGES-CODE-SITE-GUIDE.md</a>
          for the full reference on ALM, CI/CD, and deployment profiles.
        </li>
        <li>
          Configure the GitHub Actions pipeline in
          <code>.github/workflows/deploy.yml</code> for automated deployments.
        </li>
      </ol>
    </details>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePortalUser } from '../composables/usePortalUser'
import { signIn, signOut } from '../services/auth'
import { invokeFlow } from '../services/cloudFlow'
import { useFlowErrorToast } from '../composables/useFlowErrorToast'
import { FLOWS } from '../config/flows'

const { user } = usePortalUser()
const showFlowError = useFlowErrorToast()

function handleSignIn()  { signIn() }
function handleSignOut() { signOut() }

// Demo: invoke the first registered flow (card is disabled while FLOWS is empty)
const firstFlowName = Object.keys(FLOWS)[0] ?? ''
const firstFlowGuid = firstFlowName ? FLOWS[firstFlowName] : ''
const flowLoading = ref(false)
const flowResult = ref('')

async function callExampleFlow() {
  if (!firstFlowGuid) return
  flowLoading.value = true
  flowResult.value = ''
  try {
    const result = await invokeFlow<unknown>(firstFlowGuid, {})
    flowResult.value = result === undefined
      ? 'Flow accepted (fire-and-forget — no return value).'
      : JSON.stringify(result, null, 2)
  } catch (e) {
    showFlowError(e)
  } finally {
    flowLoading.value = false
  }
}
</script>

<style scoped>
.flow-result {
  margin: var(--smkb-space-3, 0.75rem) 0 0;
  padding: var(--smkb-space-3, 0.75rem);
  background: var(--smkb-color-surface-secondary, #f5f5f5);
  border: 1px solid var(--smkb-color-border, #ddd);
  border-radius: var(--smkb-radius-md, 8px);
  font-size: var(--smkb-font-size-sm, 0.875rem);
  text-align: start;
  direction: ltr;
  overflow-x: auto;
}
</style>
