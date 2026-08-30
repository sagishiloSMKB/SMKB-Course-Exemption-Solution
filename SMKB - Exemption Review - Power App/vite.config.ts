import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { powerApps } from "@microsoft/power-apps-vite/plugin";

export default defineConfig(({ mode }) => ({
  plugins: [vue(), powerApps()],
  build: {
    sourcemap: false,
  },
  optimizeDeps: {
    exclude: ["@smkbacil/design-ui"],
  },
  resolve: mode === "development"
    ? {
        alias: [
          {
            // Dev/prod service swap: any bare-barrel import (`from '.../generated'`)
            // is redirected to the in-memory mock so `pnpm dev` runs offline with no
            // wired flow. Deep imports (`../generated/models/XModel`) end in the model
            // name, NOT `/generated`, so type-only deep imports still resolve to the
            // real files. In build/prod `resolve` is undefined → the real barrel is used.
            find: /^.*\/generated$/,
            replacement: fileURLToPath(
              new URL("src/services/mock/generated.ts", import.meta.url)
            ).replace(/\\/g, "/"),
          },
        ],
      }
    : undefined,
}));
