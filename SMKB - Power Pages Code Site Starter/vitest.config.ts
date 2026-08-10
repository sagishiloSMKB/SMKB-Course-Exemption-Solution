import { defineConfig } from 'vitest/config'

// Standalone Vitest config (not the Vite build config) so tests don't load the Power Pages build
// plugins.
//
// `environment: 'node'` for pure logic, with jsdom for the files that touch the browser. That
// second half is not a convenience: useAuth.ts reads `sessionStorage` and adds `window` listeners
// at MODULE scope, so under the node environment importing it threw before a single assertion
// ran - the idle timer, the expiry timer and the revoke path were UNTESTABLE, not merely
// untested. environmentMatchGlobs keeps the fast node default for everything else.
export default defineConfig({
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/modules/**/*.spec.ts', 'jsdom'],
      ['src/composables/**/*.spec.ts', 'jsdom'],
      ['src/**/*.dom.spec.ts', 'jsdom'],
    ],
    include: ['src/**/*.spec.ts'],
  },
})
