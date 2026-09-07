// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

import vercel from '@astrojs/vercel';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import { siteConfig } from './src/site.config.ts';

// https://astro.build/config
export default defineConfig({
  // Used to build absolute canonical/Open Graph URLs and the sitemap.
  site: 'https://digitalfigments.com',
  redirects: {
    '/portrayal': 'https://character-chatbot-generator.vercel.app',
  },
  // Post photos are full-resolution camera originals but display in a narrow
  // content column — 'constrained' generates a responsive srcset (plus
  // width/height, WebP/AVIF) so browsers fetch a size close to what's shown
  // instead of the original.
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  integrations: [
    react(),
    keystatic(),
    mdx(),
    sitemap({
      // Keep the sitemap in sync with the unexposed/noindex sections
      // declared in src/site.config.ts (robots.txt disallows the same paths).
      filter: (page) => !siteConfig.unindexedPaths.some((path) => new URL(page).pathname.startsWith(path)),
    }),
  ],
  adapter: vercel()
});