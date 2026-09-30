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

  test("steps through gallery images, showing an arrow only where there's somewhere to go", async ({ page }) => {
    await page.goto("/posts/more-autumn-magic");
    const total = await page.locator(".gallery img").count();
    const lightbox = page.locator("#lightbox");
    const count = lightbox.locator(".lightbox-count");
    const prev = lightbox.locator(".lightbox-prev");
    const next = lightbox.locator(".lightbox-next");

    await page.locator(".gallery img").first().click();
    await expect(count).toHaveText(`1 / ${total}`);
    await expect(prev).toBeHidden();
    await expect(next).toBeVisible();

    await next.click();
    await expect(count).toHaveText(`2 / ${total}`);
    await expect(prev).toBeVisible();
    await expect(next).toBeVisible();

    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(count).toHaveText(`1 / ${total}`);
  });

  test("hides carousel controls for a lone image", async ({ page }) => {
    await page.goto("/posts/basil");
    await page.locator("main img").first().click();
    await expect(page.locator("#lightbox .lightbox-next")).toBeHidden();
  });
});

test.describe("theme toggle", () => {
  test("defaults to light even when the OS prefers dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(250, 246, 238)");
  });

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
