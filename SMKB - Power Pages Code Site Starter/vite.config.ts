import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const portalUrl = env.VITE_PORTAL_URL

  const buildVersion = Date.now()

  return {
    plugins: [
      vue(),
      {
        name: 'cache-buster',
        // Patch asset URLs in index.html
        transformIndexHtml(html) {
          return html.replace(
            /(src|href)="(\/assets\/[^"]+\.(js|css))"/g,
            `$1="$2?v=${buildVersion}"`,
          )
        },
        // Patch cross-chunk import URLs inside the JS bundles.
        // Without this, index.js imports vue.js with no version, so the browser
        // can serve a stale cached vue.js from a previous build while index.js
        // is fresh — causing "does not provide an export named X" errors.
        generateBundle(_opts, bundle) {
          for (const chunk of Object.values(bundle)) {
            if (chunk.type === 'chunk') {
              chunk.code = chunk.code
                .replace(/from(["'])(\.\/[^"']+\.js)\1/g, `from$1$2?v=${buildVersion}$1`)
                .replace(/import\((["'])(\.\/[^"']+\.js)\1\)/g, `import($1$2?v=${buildVersion}$1)`)
            }
          }
        },
      },
    ],

    // '@' resolves to 'src/' — import { foo } from '@/services/foo'
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    // Must be '/' for a Power Pages code site (full-site SPA)
    base: '/',

    build: {
      outDir: 'dist',
      emptyOutDir: true,

      rollupOptions: {
        output: {
          // Stable filenames — no content hashes.
          // Hashed names create a new Dataverse Web File record on every build,
          // accumulating stale records. Stable names overwrite the same record each time.
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',

          manualChunks: {
            vue: ['vue', 'vue-router', 'pinia'],
            smkb: ['@smkbacil/design-ui'],
          },
        },
      },
    },

    // Vite's dep pre-bundler can mishandle @smkbacil/design-ui's named exports.
    // Excluding it forces Vite to process it as a standard ES module.
    optimizeDeps: {
      exclude: ['@smkbacil/design-ui'],
    },

    // Local dev proxy — forwards Power Pages API calls to the live site.
    // Set VITE_PORTAL_URL in .env.local to enable.
    server: portalUrl
      ? {
          proxy: {
            '/_api': {
              target: portalUrl,
              changeOrigin: true,
              secure: true,
            },
            '/_layout': {
              target: portalUrl,
              changeOrigin: true,
              secure: true,
            },
            '/Account': {
              target: portalUrl,
              changeOrigin: true,
              secure: true,
            },
          },
        }
      : undefined,
  }
})
