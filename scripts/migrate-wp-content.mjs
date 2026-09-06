// One-time migration: converts exported WordPress post/page JSON into
// Astro content files (src/content/posts, src/content/covers, src/content/pages)
// and copies referenced media into public/media.
//
// Input JSON is produced by wp-cli `eval` dumps (see MIGRATION.md) and is not
// checked into the repo. Re-run with `node scripts/migrate-wp-content.mjs`
// after regenerating those exports if content changes before cutover.

import fs from "node:fs";
import path from "node:path";
import TurndownService from "turndown";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCRATCH = process.env.WP_EXPORT_DIR;
if (!SCRATCH) {
  console.error("Set WP_EXPORT_DIR to the folder containing wp-posts-export.json / wp-pages-export.json");
  process.exit(1);
}
const WP_UPLOADS = "D:/wordpress/wp-content/uploads";
const MEDIA_OUT = path.join(ROOT, "public", "media");

const posts = JSON.parse(fs.readFileSync(path.join(SCRATCH, "wp-posts-export.json"), "utf8"));
const pages = JSON.parse(fs.readFileSync(path.join(SCRATCH, "wp-pages-export.json"), "utf8"));

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

function copyMedia(url) {
  const marker = "/wp-content/uploads/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const rel = url.slice(idx + marker.length);
  const src = path.join(WP_UPLOADS, rel);
  const dest = path.join(MEDIA_OUT, rel);
  if (!fs.existsSync(src)) {
    console.warn("  ! missing media file, leaving remote URL:", rel);
    return url;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return "/media/" + rel.replace(/\\/g, "/");
}

// Strip a WP resized-image suffix (-1024x1024 etc.) so we copy the original file.
function toOriginal(url) {
  return url.replace(/-\d+x\d+(\.\w+)$/, "$1");
}

function frontmatterYaml(obj) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") lines.push(`${k}: ${JSON.stringify(v)}`);
    else lines.push(`${k}: ${v}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['".]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------- Posts ----------

const postsDir = path.join(ROOT, "src", "content", "posts");
fs.mkdirSync(postsDir, { recursive: true });
fs.mkdirSync(path.join(ROOT, "src", "content", "posts", "images"), { recursive: true });

// Strip a query string (e.g. Jetpack Photon's "?ssl=1") off a URL.
function stripQuery(url) {
  return url.split("?")[0];
}

// Extract every <img> tag's src/data-url and alt attribute regardless of
// attribute order — Jetpack tiled-gallery blocks emit alt before src, which
// breaks an order-dependent regex. Prefers data-url (the original-domain,
// query-string-free URL) over src (often a Photon CDN URL with "?ssl=1").
function extractImages(html) {
  const tags = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  return tags.map((tag) => {
    const dataUrl = tag.match(/\bdata-url="([^"]+)"/);
    const src = tag.match(/\bsrc="([^"]+)"/);
    const alt = tag.match(/\balt="([^"]*)"/);
    return { url: stripQuery((dataUrl || src)?.[1] || ""), alt: alt?.[1] || "" };
  }).filter((img) => img.url);
}

let convertedPosts = 0;
for (const p of posts) {
  const html = p.content;
  const bodyParts = [];

  const images = extractImages(html);
  const videoTag = [...html.matchAll(/<video[^>]*src="([^"]+)"[^>]*>[\s\S]*?(?:<figcaption[^>]*>([^<]*)<\/figcaption>)?/g)];
  const audioTag = [...html.matchAll(/<audio[^>]*src="([^"]+)"/g)];
  const audioShortcode = [...html.matchAll(/\[audio mp3="([^"]+)"\]\[\/audio\]/g)];
  const youtube = [...html.matchAll(/wp:embed[^}]*"url":"([^"]+)"[\s\S]*?is-provider-youtube/g)];

  for (const { url, alt } of images) {
    const local = copyMedia(toOriginal(url));
    bodyParts.push(`![${alt}](${local})`);
  }
  if (videoTag.length) {
    for (const [, src, caption] of videoTag) {
      const local = copyMedia(src);
      bodyParts.push(`<video controls src="${local}"></video>`);
      if (caption) bodyParts.push(caption);
    }
  }
  if (audioTag.length) {
    for (const [, src] of audioTag) {
      const local = copyMedia(src);
      bodyParts.push(`<audio controls src="${local}"></audio>`);
    }
  }
  if (audioShortcode.length) {
    for (const [, src] of audioShortcode) {
      const local = copyMedia(src);
      bodyParts.push(`<audio controls src="${local}"></audio>`);
    }
  }
  if (youtube.length) {
    for (const [, url] of youtube) {
      bodyParts.push(`<VideoEmbed url="${url}" />`);
    }
  }
  // Fallback: any leftover paragraph or blockquote text
  const paragraphs = [...html.matchAll(/<p>(.*?)<\/p>/gs)].map((m) => m[1].trim()).filter(Boolean);
  for (const para of paragraphs) {
    bodyParts.push(turndown.turndown(para));
  }
  const blockquotes = [...html.matchAll(/<blockquote>(.*?)<\/blockquote>/gs)].map((m) => m[1].trim()).filter(Boolean);
  for (const bq of blockquotes) {
    bodyParts.push(turndown.turndown(`<blockquote>${bq}</blockquote>`));
  }

  const slug = p.slug || slugify(p.title);
  const fm = frontmatterYaml({ title: p.title, date: p.date.replace(" ", "T") });
  const body = bodyParts.join("\n\n") + "\n";
  fs.writeFileSync(path.join(postsDir, `${slug}.mdx`), fm + body);
  convertedPosts++;
}
console.log(`Converted ${convertedPosts} posts -> src/content/posts/`);

// ---------- Covers (song archive) ----------

const coversDir = path.join(ROOT, "src", "content", "covers");
fs.mkdirSync(coversDir, { recursive: true });
const coversPage = pages.find((p) => p.slug === "covers");

function parseCoverCaption(caption) {
  const m = caption.match(/^(.*?)\s+by\s+(.*?)\s+\(([^)]*)\)\s*$/i);
  return {
    song: m ? m[1].trim() : caption.trim(),
    artist: m ? m[2].trim() : "",
    date: m ? m[3].trim() : "",
  };
}

// Each block type is matched separately, but string.matchAll() preserves each
// match's position in the source document (`.index`) — collecting all three
// kinds together and sorting by that position (rather than writing each type
// in its own pass) is what keeps the on-page order matching the original.
const audioBlocks = [...coversPage.content.matchAll(
  /<audio controls src="([^"]+)"><\/audio><figcaption[^>]*>([^<]*)<\/figcaption>/g
)].map((m) => ({ index: m.index, kind: "audio", src: m[1], caption: m[2] }));

const embedBlocks = [...coversPage.content.matchAll(
  /wp:embed[^}]*"url":"([^"]+)"[\s\S]*?is-provider-youtube[\s\S]*?<figcaption[^>]*>([^<]*)<\/figcaption>/g
)].map((m) => ({ index: m.index, kind: "embed", url: m[1], caption: m[2] }));

const videoBlocksInCovers = [...coversPage.content.matchAll(
  /<video[^>]*src="([^"]+)"><\/video><figcaption[^>]*>([^<]*)<\/figcaption>/g
)].map((m) => ({ index: m.index, kind: "video", src: m[1], caption: m[2] }));

const allCoverBlocks = [...audioBlocks, ...embedBlocks, ...videoBlocksInCovers].sort(
  (a, b) => a.index - b.index
);

let coverOrder = 0;
let convertedCovers = 0;
for (const block of allCoverBlocks) {
  const { song, artist, date } = parseCoverCaption(block.caption);
  const slug = slugify(song) || `cover-${coverOrder}`;
  const media =
    block.kind === "audio"
      ? { discriminant: "audio", value: copyMedia(block.src) }
      : block.kind === "video"
      ? { discriminant: "embed", value: copyMedia(block.src) }
      : { discriminant: "embed", value: block.url };
  const data = { song, artist, date, media, order: coverOrder++ };
  fs.writeFileSync(path.join(coversDir, `${slug}.json`), JSON.stringify(data, null, 2));
  convertedCovers++;
}
console.log(`Converted ${convertedCovers} covers -> src/content/covers/`);

// ---------- Other static pages ----------

const pagesDir = path.join(ROOT, "src", "content", "pages");
fs.mkdirSync(pagesDir, { recursive: true });
const SKIP_SLUGS = new Set(["covers"]); // handled above as structured data

let convertedPages = 0;
for (const pg of pages) {
  if (SKIP_SLUGS.has(pg.slug)) continue;
  // Internal links to the live domain become site-relative once this replaces it.
  let html = pg.content.replace(/https?:\/\/(www\.)?digitalfigments\.com(?!\/wp-content)/g, "");
  const placeholders = [];
  const stash = (tag) => {
    const token = `ZZMEDIAPLACEHOLDER${placeholders.length}ZZ`;
    placeholders.push(tag);
    return `<p>${token}</p>`;
  };

  // wp:audio figure blocks -> <audio>
  html = html.replace(
    /<figure class="wp-block-audio">\s*<audio controls src="([^"]+)"><\/audio>\s*(?:<figcaption[^>]*>([^<]*)<\/figcaption>)?\s*<\/figure>/g,
    (_, src, caption) => {
      const local = copyMedia(src);
      const cap = caption ? `<figcaption>${caption}</figcaption>` : "";
      return stash(`<audio controls src="${local}"></audio>${cap}`);
    }
  );
  // wp:video figure blocks -> <video>
  html = html.replace(
    /<figure class="wp-block-video">\s*<video controls src="([^"]+)"><\/video>\s*(?:<figcaption[^>]*>([^<]*)<\/figcaption>)?\s*<\/figure>/g,
    (_, src, caption) => {
      const local = copyMedia(src);
      const cap = caption ? `<figcaption>${caption}</figcaption>` : "";
      return stash(`<video controls src="${local}"></video>${cap}`);
    }
  );
  // Old Shortcodes Ultimate audio shortcode, preceded by a redundant link with the same file
  html = html.replace(
    /<a href="([^"]+\.mp3)">([^<]*)<\/a>\s*\[audio mp3="([^"]+)"\]\[\/audio\]/g,
    (_, _href, label, src) => {
      const local = copyMedia(src);
      return stash(`<audio controls src="${local}"></audio><figcaption>${label}</figcaption>`);
    }
  );

  // Rewrite any remaining bare media URLs, then hand the rest to turndown.
  html = html.replace(/(https?:\/\/www\.digitalfigments\.com)?\/wp-content\/uploads\/[^\s"')]+/g, (u) =>
    copyMedia(toOriginal(u))
  );
  let md = turndown.turndown(html);
  placeholders.forEach((tag, i) => {
    md = md.replace(`ZZMEDIAPLACEHOLDER${i}ZZ`, tag);
  });
  const fm = frontmatterYaml({ title: pg.title });
  fs.writeFileSync(path.join(pagesDir, `${pg.slug}.mdx`), fm + md.trim() + "\n");
  convertedPages++;
}
console.log(`Converted ${convertedPages} pages -> src/content/pages/`);
