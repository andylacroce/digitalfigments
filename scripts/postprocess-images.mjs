// Plain Markdown image syntax (`![]()`) has no per-image props, so two
// gaps in Astro's auto-generated <img> output can't be fixed from the
// authoring layer and are patched here instead, after `astro build`:
//
// 1. Every image defaults to loading="lazy", including each page's first
//    photo — typically its LCP element. Lighthouse flags lazy-loading the
//    LCP resource, since it delays the browser's discovery of it.
// 2. The auto `sizes` (e.g. "(min-width: 9296px) 9296px, 100vw") only
//    caps at the photo's own huge intrinsic width, so on any real
//    viewport it falls through to 100vw — ignoring that content actually
//    renders inside `main`, which is capped at 780px (see global.css)
//    with 1.25rem of padding on each side. That mismatch makes the
//    browser pick a larger responsive variant than it will ever display.
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "..", "dist", "client");
const SIZES_PATTERN = /sizes="\(min-width: \d+px\) \d+px, 100vw"/g;
const SIZES_FIX = 'sizes="(min-width: 780px) 780px, calc(100vw - 2.5rem)"';

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

let sizesFixed = 0;
let eagerMarked = 0;

for (const file of walk(DIST)) {
  const original = fs.readFileSync(file, "utf8");
  let html = original.replace(SIZES_PATTERN, () => {
    sizesFixed++;
    return SIZES_FIX;
  });

  const firstImg = html.match(/<img\b[^>]*>/);
  if (firstImg && firstImg[0].includes('loading="lazy"')) {
    const eager = firstImg[0]
      .replace('loading="lazy"', 'loading="eager"')
      .replace('decoding="async"', 'decoding="async" fetchpriority="high"');
    html = html.slice(0, firstImg.index) + eager + html.slice(firstImg.index + firstImg[0].length);
    eagerMarked++;
  }

  if (html !== original) fs.writeFileSync(file, html);
}

console.log(`postprocess-images: fixed sizes on ${sizesFixed} image(s), marked ${eagerMarked} page(s)' first image as eager/high-priority.`);
