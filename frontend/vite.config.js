import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/api/openalex": {
        target: "https://api.openalex.org",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/openalex/, ""),
      },
    },
  },
});