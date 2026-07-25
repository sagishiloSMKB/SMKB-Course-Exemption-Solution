import { defineConfig } from 'vitest/config'

// Standalone Vitest config (not the Vite build config) so tests don't load the
// Power Pages build plugins. Pure-logic unit tests run in the Node environment.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
})
