import js from "@eslint/js";
import solid from "eslint-plugin-solid/configs/recommended";
import globals from "globals";

// Flat config (ESLint 9+). Only src/ is linted; build output and
// node_modules are excluded by default (no need to list them here).
export default [
  js.configs.recommended,
  solid,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        // Injected by vite.config.js's `define`; a build-time string
        // replacement, not a real runtime global.
        __APP_NAME__: "readonly",
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },
  {
    // Root-level config files (vite.config.js, etc.) run under Node,
    // not the browser, so they need Node globals like `process`.
    files: ["*.config.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
