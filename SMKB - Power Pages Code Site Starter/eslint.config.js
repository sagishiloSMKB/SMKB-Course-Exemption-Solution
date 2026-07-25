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
  { ignores: ['dist/**', 'node_modules/**', '.powerpages-site/**', '*.config.*'] },
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
      'vue/no-v-html': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        { selector: "CallExpression[callee.name='fetch']", message: 'This SPA is flows-only: reach the backend through a cloud flow (services/cloudFlow.ts), not direct fetch.' },
        { selector: "NewExpression[callee.name='XMLHttpRequest']", message: 'This SPA is flows-only: use a cloud flow via services/cloudFlow.ts.' },
        { selector: "NewExpression[callee.name='WebSocket']", message: 'This SPA is flows-only: use a cloud flow via services/cloudFlow.ts.' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
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
)
