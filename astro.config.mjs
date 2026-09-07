// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

import vercel from '@astrojs/vercel';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import { siteConfig } from './src/site.config.ts';

// Content images come from hand-authored MDX/markdown (no per-image control at
// the authoring layer), so lazy-loading is applied uniformly at compile time
// instead. The very first image on a post can be above the fold, but native
// lazy loading already fetches near-viewport images promptly enough that the
// blanket rule is the right tradeoff for a personal blog over per-post logic.
function rehypeLazyImages() {
  return (tree) => {
    function visit(node) {
      if (node.tagName === 'img') {
        node.properties ??= {};
        node.properties.loading ??= 'lazy';
        node.properties.decoding ??= 'async';
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}

// https://astro.build/config
export default defineConfig({
  // Used to build absolute canonical/Open Graph URLs and the sitemap.
  site: 'https://digitalfigments.com',
  integrations: [
    react(),
    keystatic(),
    mdx({ rehypePlugins: [rehypeLazyImages] }),
    sitemap({
      // Keep the sitemap in sync with the unexposed/noindex sections
      // declared in src/site.config.ts (robots.txt disallows the same paths).
      filter: (page) => !siteConfig.unindexedPaths.some((path) => new URL(page).pathname.startsWith(path)),
    }),
  ],
  adapter: vercel()
});