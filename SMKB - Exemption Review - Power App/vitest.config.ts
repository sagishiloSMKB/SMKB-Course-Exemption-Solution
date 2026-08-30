import { defineConfig } from 'vitest/config'

// Standalone Vitest config (not the Vite build config) so tests don't load the Power Apps Vite
// plugin. Convention: colocate a `*.spec.ts` next to the module it covers.
//
// `environment: 'node'` is the fast default for pure logic; a spec that needs the browser globals
// (a composable reading sessionStorage, a component) uses jsdom via the globs below. Without that
// escape hatch, any module touching `window` at import time is UNTESTABLE rather than untested -
// the import throws before the first assertion runs.
export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/composables/**/*.spec.ts', 'jsdom'],
      ['src/**/*.dom.spec.ts', 'jsdom'],
    ],
    include: ['src/**/*.spec.ts'],
  },
})
