import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    open: false,
    // Proxy /api to the backend so the browser only ever talks to Vite.
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
