// ESLint flat config — Vue 3 + TypeScript (Power Apps Code App).
//
// This is a security/architecture policy, not just style. It enforces the rules a
// flow-based (UI-only) SMKB app relies on:
//   • no-restricted-syntax — this app is UI-ONLY: all backend access goes through the
//                            generated Power Automate flow services (src/generated).
//                            Direct fetch / XHR / WebSocket is forbidden by design.
//   • vue/no-v-html        — block raw HTML injection (XSS). If you ever need to render
//                            server HTML, sanitize to an allowlist or use a sandboxed
//                            <iframe srcdoc>, never v-html.
//   • no-console           — no stray console.log in shipped code (warn/error allowed).
//
// Generated code (src/generated) and connector schemas (.power) are auto-generated and
// exempt. Run `pnpm install && pnpm run lint` once to confirm the toolchain resolves.
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default tseslint.config(
  // `*.config.*` was ignored, which left vite.config.ts - including the dev-mode mock alias that
  // decides whether the app talks to real flows - as the only unlinted TypeScript here.
  { ignores: ['dist/**', 'node_modules/**', 'src/generated/**', '.power/**'] },
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
        // Member forms too: `callee.name='fetch'` matches a bare call only, so window.fetch(),
        // globalThis.fetch(), navigator.sendBeacon() and new EventSource() all slipped past this
        // ban with the lint green.
        { selector: "CallExpression[callee.name='fetch']", message: 'UI-only app: no direct network calls. Use a generated flow service (src/generated).' },
        { selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='fetch']", message: 'UI-only app: window.fetch / globalThis.fetch is still a direct network call. Use a generated flow service.' },
        { selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='sendBeacon']", message: 'UI-only app: navigator.sendBeacon is a direct network call. Use a generated flow service.' },
        { selector: "NewExpression[callee.name='XMLHttpRequest']", message: 'UI-only app: no direct network calls. Use a generated flow service.' },
        { selector: "NewExpression[callee.name='WebSocket']", message: 'UI-only app: no direct network calls. Use a generated flow service.' },
        { selector: "NewExpression[callee.name='EventSource']", message: 'UI-only app: EventSource opens a network stream. Use a generated flow service.' },
      ],
      // ERROR, not warn - see the note in the Code Site starter's config. The generated flow
      // services are excluded from linting entirely, so nothing here needs `any`.
      '@typescript-eslint/no-explicit-any': 'error',
      // Underscore-prefixed args/vars are intentional placeholders (matches tsconfig's
      // noUnusedParameters exemption) — e.g. a mock `Run(_input)` that ignores its arg.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Allow the common `cond ? sideEffect() : other()` / `cond && fn()` statement forms.
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    },
  },
  {
    // Build/tooling config: Node globals, and console output is how a build plugin reports.
    files: ['*.config.ts', '*.config.js', '*.config.mts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
)
