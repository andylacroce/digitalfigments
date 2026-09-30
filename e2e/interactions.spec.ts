import { test, expect } from "@playwright/test";

test.describe("photo gallery", () => {
  test("packs images into more than one column and fades each in", async ({ page }) => {
    await page.goto("/posts/more-autumn-magic");
    const gallery = page.locator(".gallery").first();
    await expect(gallery).toBeVisible();

    const items = gallery.locator(".gallery-item");
    await expect(items.first()).toHaveClass(/is-visible/);

    const lefts = await items.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
    expect(new Set(lefts).size).toBeGreaterThan(1);
  });
});

test.describe("lightbox", () => {
  test("opens on image click and closes on background click", async ({ page }) => {
    await page.goto("/posts/basil");
    const lightbox = page.locator("#lightbox");
    await expect(lightbox).toBeHidden();

    await page.locator("main img").first().click();
    await expect(lightbox).toBeVisible();

    await lightbox.click({ position: { x: 5, y: 5 } });
    await expect(lightbox).toBeHidden();
  });
});

test.describe("theme toggle", () => {
  test("switches theme and persists across reload", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const initial = (await html.getAttribute("data-theme")) ?? "light";
    const next = initial === "dark" ? "light" : "dark";

    await page.locator("#theme-toggle").click();
    await expect(html).toHaveAttribute("data-theme", next);

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", next);
  });
});

test.describe("back to top", () => {
  test("appears after scrolling and returns to the top on click", async ({ page }) => {
    await page.goto("/");
    const button = page.locator("#back-to-top");
    await expect(button).toBeHidden();

    await page.evaluate(() => window.scrollTo(0, 800));
    await expect(button).toBeVisible();

    await button.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50);
  });
});
