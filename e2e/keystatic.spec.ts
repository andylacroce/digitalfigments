import { test, expect } from "@playwright/test";

// The Keystatic admin is server-rendered (it isn't in dist/client), so this
// spec runs against the `astro dev` server in playwright.config.ts instead
// of the static build. It guards the part dependency bumps can silently
// break: the admin bundle loading and its editor config being accepted.
test.use({ baseURL: "http://localhost:4322" });

test.describe("Keystatic admin", () => {
  // The first request compiles the admin bundle on demand.
  test.setTimeout(90_000);

  test("lists every collection on the dashboard", async ({ page }) => {
    await page.goto("/keystatic");
    for (const name of [
      "Posts",
      "Tracks (covers, demos, a2z)",
      "Static pages",
    ]) {
      await expect(page.getByRole("link", { name }).first()).toBeVisible({
        timeout: 60_000,
      });
    }
  });

  test("opens the new post editor", async ({ page }) => {
    await page.goto("/keystatic/collection/posts/create");
    await expect(
      page.getByText("Content", { exact: true }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: "Create" })).toBeVisible();
  });
});
