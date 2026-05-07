import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**", "**/.planning/**"],
    },
  },
  build: {
    // Sprint 5 PR-B (audit Performance P1 #7): split the 780 KB
    // monolithic chunk into deps + per-page chunks. Combined with
    // React.lazy on the page router (`DashboardApp.tsx`), this
    // means a cold start only downloads + parses the Dashboard
    // route + shared deps. Other routes stream in on first nav.
    rollupOptions: {
      output: {
        manualChunks: {
          // React core (loaded immediately, every route uses it)
          react: ["react", "react-dom", "react/jsx-runtime"],
          // Heaviest 3rd-party bundles — split so they cache
          // independently across deploys (changing icons doesn't
          // bust the dnd-kit chunk and vice versa).
          lucide: ["lucide-react"],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          tauri: [
            "@tauri-apps/api",
            "@tauri-apps/plugin-shell",
            "@tauri-apps/plugin-global-shortcut",
            "@tauri-apps/plugin-autostart",
          ],
        },
      },
    },
    // 600 kB ceiling so the legitimate React+react-dom chunk
    // (~140 kB gzip) doesn't trigger a noisy warning on every
    // build. Individual page chunks land well under this.
    chunkSizeWarningLimit: 600,
  },
}));
