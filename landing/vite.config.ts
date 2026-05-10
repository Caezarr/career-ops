import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Marketing landing — separate bundle from the Tauri app so it can deploy
// to Cloudflare Pages without dragging in the full dashboard tree. The
// build is plain static HTML/JS/CSS, no SSR, no runtime backend.
export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    cssCodeSplit: false,
    sourcemap: false,
    // Single chunk = simpler hosting, smaller TTFB on Cloudflare's edge.
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
