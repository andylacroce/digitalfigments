import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      // Scoped to plain TS logic that's practical to unit test in isolation.
      // .astro files (markup + client <script>) and content.config.ts
      // (declarative schema, exercised by every build/dev run) are covered
      // by the E2E suite and the build itself instead.
      include: ["src/lib/**/*.ts", "src/pages/robots.txt.ts"],
      exclude: ["src/**/*.test.ts"],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
});
