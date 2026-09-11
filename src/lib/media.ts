// Audio/video/zip files are too large for Astro's build pipeline to process
// (no image-style optimization applies to them) and too large to keep
// re-shipping in every Vercel deployment, so they're hosted on Cloudflare
// R2 instead of public/ (see scripts/sync-media.mjs and MIGRATION.md).
// Stored paths still look like "/media/..." or "/covers-audio/..." — this
// just resolves them against the R2 bucket's public URL at render time.
const MEDIA_BASE_URL = import.meta.env.PUBLIC_MEDIA_BASE_URL ?? "";

export function mediaUrl(path: string): string {
  return path.startsWith("/media/") || path.startsWith("/covers-audio/")
    ? `${MEDIA_BASE_URL}${path}`
    : path;
}
