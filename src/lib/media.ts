// Audio/video/zip files are too large for Astro's build pipeline to process
// (no image-style optimization applies to them) and too large to keep
// re-shipping in every Vercel deployment, so they're hosted on Cloudflare
// R2 instead of public/ (see scripts/sync-media.mjs and MIGRATION.md).
// Stored paths still look like "/media/..." or "/covers-audio/..." — this
// resolves them against the R2 bucket's custom domain at render time.
//
// In dev, the base URL is deliberately left blank: astro.config.mjs runs a
// dev-only middleware that serves assets/media|covers-audio directly from
// disk under those same paths, so newly-added files are playable without
// syncing to R2 first. Never applies to a real build — import.meta.env.DEV
// is always false there.
export function mediaUrl(path: string): string {
  if (!path.startsWith("/media/") && !path.startsWith("/covers-audio/")) return path;
  const baseUrl = import.meta.env.DEV ? "" : (import.meta.env.PUBLIC_MEDIA_BASE_URL ?? "");
  return `${baseUrl}${path}`;
}
