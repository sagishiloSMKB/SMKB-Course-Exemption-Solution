import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  // Vue 3 recommended rules (correctness + best practices)
  ...pluginVue.configs['flat/recommended'],
  // TypeScript support for .ts/.tsx files
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
  },
  // TypeScript parser for Vue SFCs
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  // Project rules: security-focused, style rules off (handled by formatter)
  {
    files: ['**/*.{ts,tsx,vue}'],
    rules: {
      'vue/no-v-html': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // Style/formatting rules — off; use a formatter for these
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/first-attribute-linebreak': 'off',
    },
  },
)
