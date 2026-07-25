import { defineConfig } from 'vitest/config'

// Standalone Vitest config (not the Vite build config) so tests don't load the
// Power Apps Vite plugin. Pure-logic unit tests run in the Node environment.
// Convention: colocate a `*.spec.ts` next to the module it covers.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
})
