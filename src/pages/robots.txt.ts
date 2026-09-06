import type { APIRoute } from "astro";
import { siteConfig } from "../site.config";

export const GET: APIRoute = () => {
  const lines = ["User-agent: *", ...siteConfig.unindexedPaths.map((path) => `Disallow: ${path}`)];
  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain" },
  });
};
