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
  { ignores: ['dist/**', 'node_modules/**', 'src/generated/**', '*.config.*', '.power/**'] },
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
        { selector: "CallExpression[callee.name='fetch']", message: 'UI-only app: no direct network calls. Use a generated flow service (src/generated).' },
        { selector: "NewExpression[callee.name='XMLHttpRequest']", message: 'UI-only app: no direct network calls. Use a generated flow service.' },
        { selector: "NewExpression[callee.name='WebSocket']", message: 'UI-only app: no direct network calls. Use a generated flow service.' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Underscore-prefixed args/vars are intentional placeholders (matches tsconfig's
      // noUnusedParameters exemption) — e.g. a mock `Run(_input)` that ignores its arg.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Allow the common `cond ? sideEffect() : other()` / `cond && fn()` statement forms.
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    },
  },
)
