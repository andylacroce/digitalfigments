import { describe, expect, it } from "vitest";
import type { APIContext } from "astro";
import { GET } from "./robots.txt";

describe("GET /robots.txt", () => {
  it("disallows each configured unindexed path", async () => {
    const response = await GET({} as unknown as APIContext);
    const body = await response.text();
    expect(body).toBe("User-agent: *\nDisallow: /blog\nDisallow: /music\n");
    expect(response.headers.get("Content-Type")).toBe("text/plain");
  });
});
