// frontend/vite.config.js
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  // __APP_NAME__ is a build-time constant (not a runtime env var), so it
  // can be referenced anywhere in src/ without an import. Backed by the
  // same APP_NAME the Go backend reads, so both sides agree without
  // duplicating the value.
  define: {
    __APP_NAME__: JSON.stringify(process.env.APP_NAME ?? "epoche"),
  },
  server: {
    host: "0.0.0.0",
    port: 3001,
    allowedHosts: true,
    proxy: {
      // Use 127.0.0.1 explicitly to avoid localhost resolving to ::1 (IPv6)
      // while PocketBase only listens on 127.0.0.1 (IPv4).
      "/api": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/_": { target: "http://127.0.0.1:3000", changeOrigin: true },
    },
  },
  build: {
    outDir: "../internal/static/dist",
    emptyOutDir: true,
  },
});
