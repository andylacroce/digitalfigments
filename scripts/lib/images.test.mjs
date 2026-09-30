import { describe, expect, it } from "vitest";
import { fixImages } from "./images.mjs";

const AUTO_SIZES = 'sizes="(min-width: 9296px) 9296px, 100vw"';
const FIXED_SIZES = 'sizes="(min-width: 780px) 780px, calc(100vw - 2.5rem)"';

describe("fixImages", () => {
  it("replaces Astro's auto sizes on every image", () => {
    const html = `<img ${AUTO_SIZES} loading="eager"><img ${AUTO_SIZES} loading="lazy">`;
    const out = fixImages(html);
    expect(out.sizesFixed).toBe(2);
    expect(out.html).toBe(`<img ${FIXED_SIZES} loading="eager"><img ${FIXED_SIZES} loading="lazy">`);
  });

  it("makes only the first image eager and high-priority", () => {
    const html = '<img loading="lazy" decoding="async" src="a"><img loading="lazy" decoding="async" src="b">';
    const out = fixImages(html);
    expect(out.eagerMarked).toBe(true);
    expect(out.html).toBe(
      '<img loading="eager" decoding="async" fetchpriority="high" src="a"><img loading="lazy" decoding="async" src="b">',
    );
  });

  it("leaves pages with no images, or a non-lazy first image, unchanged", () => {
    for (const html of ["<p>no images</p>", '<img loading="eager" src="a">']) {
      expect(fixImages(html)).toEqual({ html, sizesFixed: 0, eagerMarked: false });
    }
  });
});
