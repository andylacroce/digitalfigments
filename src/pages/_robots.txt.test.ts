import { describe, expect, it } from "vitest";
import type { APIContext } from "astro";
import { GET } from "./robots.txt";

describe("GET /robots.txt", () => {
  it("disallows each configured unindexed path and links the sitemap", async () => {
    const response = await GET({ site: new URL("https://digitalfigments.com") } as unknown as APIContext);
    const body = await response.text();
    expect(body).toBe(
      "User-agent: *\nDisallow: /blog\nDisallow: /music\nSitemap: https://digitalfigments.com/sitemap-index.xml\n"
    );
    expect(response.headers.get("Content-Type")).toBe("text/plain");
  });
});
