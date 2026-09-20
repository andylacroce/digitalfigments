import type { APIRoute } from "astro";
import { siteConfig } from "../site.config";

export const GET: APIRoute = ({ site }) => {
  const lines = [
    "User-agent: *",
    ...siteConfig.unindexedPaths.map((path) => `Disallow: ${path}`),
    `Sitemap: ${new URL("sitemap-index.xml", site)}`,
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain" },
  });
};
