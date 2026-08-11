// frontend/vite.config.js
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

// Single source of truth for this build: also read by __APP_NAME__ below
// and by the index.html %APP_NAME% placeholder, so the value only has to
// be resolved once. Backed by the same APP_NAME the Go backend reads
// (see epoche.env), so both sides agree without duplicating the value.
const appName = process.env.APP_NAME;

export default defineConfig({
  plugins: [
    solid(),
    tailwindcss(),
    {
      // index.html isn't JS, so Vite's `define` (below) can't reach it;
      // this replaces the %APP_NAME% placeholder at build/serve time
      // instead, without widening envPrefix to expose non-VITE_ vars.
      name: "inject-app-name-html",
      transformIndexHtml(html) {
        return html.replace(/%APP_NAME%/g, appName);
      },
    },
  ],
  // __APP_NAME__ is a build-time constant (not a runtime env var), so it
  // can be referenced anywhere in src/ without an import.
  define: {
    __APP_NAME__: JSON.stringify(appName),
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
      "/health": { target: "http://127.0.0.1:3000", changeOrigin: true },
    },
  },
  build: {
    outDir: "../internal/static/dist",
    emptyOutDir: true,
  },
});
