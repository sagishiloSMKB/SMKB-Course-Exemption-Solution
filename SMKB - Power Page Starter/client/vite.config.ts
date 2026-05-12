import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    exclude: ['@smkb/design-ui'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Fixed filenames so the Liquid web template can hard-reference them
        // without needing to parse the Vite manifest after each build.
        entryFileNames: 'smkb/app.js',
        chunkFileNames: 'smkb/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'smkb/app.css'
          }
          return 'smkb/[name][extname]'
        },
      },
    },
  },
})
