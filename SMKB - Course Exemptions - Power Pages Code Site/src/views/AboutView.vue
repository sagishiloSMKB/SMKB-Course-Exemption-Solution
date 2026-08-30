<template>
  <div class="about">
    <h1>About this starter</h1>

    <p>
      This is the <strong>Power Pages Vue Starter</strong> — a minimal Vue 3 + Vite SPA
      deployed as a Power Pages Code Site (Model A, GA February 2026).
    </p>

    <p>
      It is intentionally plain — deploy it first to confirm the site is live, then replace
      <code>src/views/HomeView.vue</code> with your own UI.
    </p>

    <h2>Architecture</h2>
    <p>
      The starter is <strong>flows-only</strong>: every backend call goes through a
      Power Automate cloud flow via <code>invokeFlow()</code>
      (<code>src/services/cloudFlow.ts</code>) — there is no direct Dataverse Web API
      client, and ESLint enforces it. Flows return business errors as HTTP&nbsp;200 with
      an <code>errorCode</code> body; see
      <a href="/docs/FLOW-ERROR-CONTRACT.md" target="_blank">docs/FLOW-ERROR-CONTRACT.md</a>.
      Per-solution identity (prefix, app name, title, language) lives in
      <code>src/config/solution.ts</code>. An optional phone-OTP login module ships
      dormant in <code>src/modules/otp-auth/</code>.
    </p>

    <h2>Local resources</h2>
    <ul>
      <li>
        <a href="/GETTING-STARTED.md" target="_blank">GETTING-STARTED.md</a>
        — step-by-step setup and first-deploy guide
      </li>
      <li>
        <a href="/POWER-PAGES-CODE-SITE-GUIDE.md" target="_blank">POWER-PAGES-CODE-SITE-GUIDE.md</a>
        — full reference: ALM, CI/CD, Web API, auth, pitfalls
      </li>
      <li>
        <a href="/docs/FLOW-ERROR-CONTRACT.md" target="_blank">docs/FLOW-ERROR-CONTRACT.md</a>
        — the HTTP-200 + errorCode contract every flow must follow
      </li>
    </ul>

    <h2>Microsoft documentation</h2>
    <ul>
      <li>
        <a href="https://learn.microsoft.com/en-us/power-pages/configure/create-code-sites" target="_blank">
          Create and deploy a code site
        </a>
      </li>
      <li>
        <a href="https://learn.microsoft.com/en-us/power-pages/configure/cloud-flow-integration" target="_blank">
          Cloud flow integration
        </a>
      </li>
      <li>
        <a href="https://learn.microsoft.com/en-us/power-pages/configure/web-api-overview" target="_blank">
          Power Pages Web API overview
        </a>
      </li>
      <li>
        <a href="https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/pages" target="_blank">
          PAC CLI pages command reference
        </a>
      </li>
      <li>
        <a href="https://learn.microsoft.com/en-us/power-pages/configure/portals-alm" target="_blank">
          Power Pages ALM overview
        </a>
      </li>
    </ul>

    <h2>Community & samples</h2>
    <ul>
      <li>
        <a href="https://github.com/microsoft/power-pages-samples" target="_blank">
          microsoft/power-pages-samples — official Vue + React samples
        </a>
      </li>
    </ul>
  </div>
</template>
