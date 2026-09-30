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
import { fixImages } from "./lib/images.mjs";

const DIST = path.resolve(import.meta.dirname, "..", "dist", "client");

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
  const fixed = fixImages(original);
  sizesFixed += fixed.sizesFixed;
  if (fixed.eagerMarked) eagerMarked++;
  if (fixed.html !== original) fs.writeFileSync(file, fixed.html);
}

console.log(`postprocess-images: fixed sizes on ${sizesFixed} image(s), marked ${eagerMarked} page(s)' first image as eager/high-priority.`);
