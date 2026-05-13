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
    exclude: ["@smkb/design-ui"],
  },
  resolve: mode === "development"
    ? {
        alias: [
          {
            find: /^.*\/services\/dataService$/,
            replacement: fileURLToPath(
              new URL("src/services/mock/mockDataService.ts", import.meta.url)
            ).replace(/\\/g, "/"),
          },
        ],
      }
    : undefined,
}));
