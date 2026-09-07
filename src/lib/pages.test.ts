import { describe, expect, it, vi } from "vitest";

vi.mock("astro:content", () => ({
  getCollection: vi.fn(async () => [
    { id: "obamas-audacity", data: {} },
    { id: "some-photo-post", data: {} },
  ]),
}));

const { getBlogPages, getGenericPages } = await import("./pages");

describe("getBlogPages / getGenericPages", () => {
  it("routes the configured blog slugs to getBlogPages", async () => {
    const blogPages = await getBlogPages();
    expect(blogPages.map((page) => page.id)).toEqual(["obamas-audacity"]);
  });

  it("routes everything else to getGenericPages", async () => {
    const genericPages = await getGenericPages();
    expect(genericPages.map((page) => page.id)).toEqual(["some-photo-post"]);
  });
});
