import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { doable } from "./doable.plugin.ts";

export default defineConfig(({ command }) => ({
  plugins: [command === "serve" ? doable() : null, react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  // Errors are shown in the Doable editor (with "Try to fix"), not in Vite's overlay.
  server: { host: "127.0.0.1", strictPort: true, cors: true, allowedHosts: true, hmr: { overlay: false } },
}));
