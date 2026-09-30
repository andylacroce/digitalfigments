import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      // Scoped to plain logic that's practical to unit test in isolation:
      // src/lib, robots.txt.ts, and the pure helpers under scripts/lib (the
      // scripts themselves are thin I/O glue around them). .astro files
      // (markup + client <script>) and content.config.ts (declarative
      // schema, exercised by every build/dev run) are covered by the E2E
      // suite and the build itself instead.
      include: ["src/lib/**/*.ts", "src/pages/robots.txt.ts", "scripts/lib/**/*.mjs"],
      exclude: ["**/*.test.*"],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
});
