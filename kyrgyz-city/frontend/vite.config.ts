import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "/static/app/",
  build: {
    outDir: "../static/app",
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (id.includes("/node_modules/three/")) return "three-core";
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
          if (
            id.includes("/node_modules/@react-three/") ||
            id.includes("/node_modules/three-stdlib/")
          )
            return "three-react";
        },
      },
    },
  },
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
});
