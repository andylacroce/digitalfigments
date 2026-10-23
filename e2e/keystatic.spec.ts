import { test, expect, type Page } from "@playwright/test";

// The Keystatic admin is server-rendered (it isn't in dist/client), so this
// spec runs against the `astro dev` server in playwright.config.ts instead
// of the static build. It guards the part dependency bumps can silently
// break: the admin bundle loading and its editor config being accepted.
test.use({ baseURL: "http://localhost:4322" });

// A cold dev server re-optimizes Keystatic's dependencies on the first load
// and answers the stale chunk requests with 504 "Outdated Optimize Dep", so
// the admin island fails to hydrate until a reload. Retry the navigation
// until the expected UI shows up.
async function openAdmin(
  page: Page,
  path: string,
  expected: () => Promise<void>,
) {
  await expect(async () => {
    await page.goto(path);
    await expected();
  }).toPass({ timeout: 80_000 });
}

test.describe("Keystatic admin", () => {
  test.setTimeout(90_000);

  test("lists every collection on the dashboard", async ({ page }) => {
    await openAdmin(page, "/keystatic", async () => {
      for (const name of [
        "Posts",
        "Tracks (covers, demos, a2z)",
        "Static pages",
      ]) {
        await expect(page.getByRole("link", { name }).first()).toBeVisible({
          timeout: 10_000,
        });
      }
    });
  });

  test("opens the new post editor", async ({ page }) => {
    await openAdmin(page, "/keystatic/collection/posts/create", async () => {
      await expect(
        page.getByText("Content", { exact: true }).first(),
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});
