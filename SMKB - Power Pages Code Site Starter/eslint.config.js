// ESLint flat config — Vue 3 + TypeScript (Power Pages Code Site).
//
// Enforces the security rules this starter relies on:
//   • vue/no-v-html        — block raw HTML injection (XSS). Render all dynamic
//                            content via interpolation; there is deliberately no v-html.
//   • no-console           — no stray console.log in shipped code (warn/error allowed).
//   • no-restricted-syntax — the SPA is flows-only: reach the backend through a Power
//                            Automate cloud flow (services/cloudFlow.ts). Direct fetch /
//                            XHR / WebSocket is forbidden EXCEPT in the sanctioned
//                            transport (cloudFlow.ts / csrf.ts), which use same-origin
//                            /_api/cloudflow and /_layout/tokenhtml.
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default tseslint.config(
  // `*.config.*` was ignored, so vite.config.ts (which holds the cache-buster plugin and the
  // manualChunks map - the two pieces of build logic a Power Pages deploy depends on) was the
  // only unlinted TypeScript in the repo. It is linted now; `no-console` is relaxed for it below
  // because build-time progress output is legitimate there.
  { ignores: ['dist/**', 'node_modules/**', '.powerpages-site/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.{ts,tsx,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { parser: tseslint.parser },
    },
    rules: {
      // `no-undef` (from js.configs.recommended) cannot see TypeScript types, so it reports
      // type-only DOM references such as `IntersectionObserverInit` or `ScrollIntoViewOptions`
      // as undefined globals. typescript-eslint recommends turning it off on TS files for
      // exactly this reason - nothing is lost, because `vue-tsc` (run by `npm run build`)
      // already fails on any genuinely undefined identifier.
      'no-undef': 'off',
      'vue/no-v-html': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        // MEMBER FORMS TOO. `callee.name='fetch'` matches a bare `fetch(...)` and nothing else, so
        // `window.fetch()`, `globalThis.fetch()`, `navigator.sendBeacon()` and `new EventSource()`
        // all went to the network with this ban in force and the lint green. sendBeacon is not a
        // hypothetical: it is the first thing anyone reaches for when a request has to survive a
        // navigation (see authService.revokeSession, which deliberately does NOT use it).
        { selector: "CallExpression[callee.name='fetch']", message: 'This SPA is flows-only: reach the backend through a cloud flow (services/cloudFlow.ts), not direct fetch.' },
        { selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='fetch']", message: 'This SPA is flows-only: window.fetch / globalThis.fetch is still a direct network call. Use services/cloudFlow.ts.' },
        { selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='sendBeacon']", message: 'This SPA is flows-only: navigator.sendBeacon is a direct network call. Use services/cloudFlow.ts.' },
        { selector: "NewExpression[callee.name='XMLHttpRequest']", message: 'This SPA is flows-only: use a cloud flow via services/cloudFlow.ts.' },
        { selector: "NewExpression[callee.name='WebSocket']", message: 'This SPA is flows-only: use a cloud flow via services/cloudFlow.ts.' },
        { selector: "NewExpression[callee.name='EventSource']", message: 'This SPA is flows-only: EventSource opens a network stream. Use a cloud flow via services/cloudFlow.ts.' },
        // Lazy route imports emit a separate chunk per view. Power Pages serves index.html for
        // any file the deployed index.html references but that was never uploaded, so the app
        // 404s / MIME-errors at runtime. This was documented in prose and grepped for by a skill;
        // a rule catches it at the moment it is typed.
        { selector: "ImportExpression", message: 'No dynamic import(): a lazy route emits its own chunk, which Power Pages then does not serve. Use a direct import, or add an explicit manualChunks entry AND the output filename to bundleFilePatterns.' },
      ],
      // ERROR, not warn. `any` switches off the type system at the one place a reviewer is least
      // likely to notice, and this SPA's whole flow boundary is typed generics over unknown JSON -
      // exactly where a stray `any` erases the checking that boundary exists for. Use `unknown`
      // and narrow, and if a cast is genuinely unavoidable disable the rule on that line with a
      // reason.
      '@typescript-eslint/no-explicit-any': 'error',
      // Allow the common `cond ? sideEffect() : other()` / `cond && fn()` statement forms.
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    },
  },
  {
    // The sanctioned flow transport + CSRF helper legitimately use fetch (same-origin
    // /_api/cloudflow and /_layout/tokenhtml). Everything else must route through them.
    // If you opt out of flows-only via /ppcs-enable-web-api, the skill adds the restored
    // src/services/portalApi.ts to this files list.
    files: ['src/services/cloudFlow.ts', 'src/services/csrf.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Build/tooling config: Node globals, and console output is how a build plugin reports.
    // The network ban and the import() ban still apply - neither belongs in a config either.
    files: ['*.config.ts', '*.config.js', '*.config.mts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
)
