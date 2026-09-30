import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 15_000,
  reporter: [
    ["dot"],
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
    ...(process.env.GITHUB_ACTIONS ? ([["github"]] as const) : []),
  ],
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // These interactions (masonry fade-in, theme toggle, back-to-top scroll)
    // all honor prefers-reduced-motion; forcing it keeps assertions from
    // racing an in-flight CSS transition/animation.
    reducedMotion: "reduce",
  },
  // A single Chromium project: this is a content blog with a handful of
  // small vanilla-JS behaviors, not an app — one engine is enough signal
  // without adding a cross-browser matrix's runtime/flake surface.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // The whole site prerenders to static HTML (see astro.config.mjs), so
    // `dist/client` is served directly rather than through `astro preview`
    // — the Vercel adapter's build output isn't meant to be previewed via
    // Astro's own preview server (it exits immediately, nothing to serve
    // from it locally). `npm run ci` runs `build` beforehand, so this
    // doesn't pay for a second one.
    command: `npx serve dist/client -l ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
