// @ts-check
import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
import globals from "globals";

export default defineConfig(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    // .astro files mix build-time frontmatter (Node) with client-side
    // <script> blocks (browser); config/scripts elsewhere are plain Node.
    // Astro's plugin extracts <script> content into virtual files whose
    // globs are awkward to target precisely, so both global sets are just
    // unioned everywhere rather than scoped per file type.
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    ignores: [
      "dist/**",
      ".astro/**",
      ".vercel/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "public/old-site/**",
    ],
  },
);
