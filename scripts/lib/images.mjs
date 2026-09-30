// Pure HTML rewrite used by scripts/postprocess-images.mjs — see the notes
// there for why each fix is needed.
const SIZES_PATTERN = /sizes="\(min-width: \d+px\) \d+px, 100vw"/g;
const SIZES_FIX = 'sizes="(min-width: 780px) 780px, calc(100vw - 2.5rem)"';

export function fixImages(original) {
  let sizesFixed = 0;
  let html = original.replace(SIZES_PATTERN, () => {
    sizesFixed++;
    return SIZES_FIX;
  });

  let eagerMarked = false;
  const firstImg = html.match(/<img\b[^>]*>/);
  if (firstImg && firstImg[0].includes('loading="lazy"')) {
    const eager = firstImg[0]
      .replace('loading="lazy"', 'loading="eager"')
      .replace('decoding="async"', 'decoding="async" fetchpriority="high"');
    html = html.slice(0, firstImg.index) + eager + html.slice(firstImg.index + firstImg[0].length);
    eagerMarked = true;
  }

  return { html, sizesFixed, eagerMarked };
}
