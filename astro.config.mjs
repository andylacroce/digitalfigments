// @ts-check
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

import vercel from '@astrojs/vercel';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import { siteConfig } from './src/site.config.ts';
import { contentTypeFor } from './scripts/lib/media.mjs';

const MEDIA_PREFIX = '/media/';

// Dev-only: serves assets/media straight from disk so a newly-added file
// is playable in `astro dev` without syncing to R2 first (see
// src/lib/media.ts and README's "Media assets" section). Never runs in a
// real build — assets/ stays outside public/, so nothing here changes
// what ships in a deployment.
function devMediaMiddleware() {
  return {
    name: 'dev-media-middleware',
    hooks: {
      /** @param {{ server: import('vite').ViteDevServer }} args */
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          if (!req.url) return next();
          const { pathname } = new URL(req.url, 'http://localhost');
          if (!pathname.startsWith(MEDIA_PREFIX)) return next();

          const baseDir = path.join(import.meta.dirname, 'assets', 'media');
          const filePath = path.join(baseDir, decodeURIComponent(pathname.slice(MEDIA_PREFIX.length)));

          if (!filePath.startsWith(baseDir + path.sep) || !existsSync(filePath) || !statSync(filePath).isFile()) {
            return next();
          }

          res.setHeader('Content-Type', contentTypeFor(filePath));
          createReadStream(filePath).pipe(res);
        });
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  // Used to build absolute canonical/Open Graph URLs and the sitemap.
  site: 'https://digitalfigments.com',
  redirects: {
    '/portrayal': 'https://character-chatbot-generator.vercel.app',
    // Old post links were flat (/<slug>/); posts now live under
    // /posts/<slug>/. Closed list — newer posts only ever had the new
    // URL, so it never needs new entries.
    ...Object.fromEntries(
      [
        'basil', 'baum', 'bird-of-prey', 'blue-heaven-butterfly-bush', 'cutie-petunia',
        'dont-think-you-knew-you-were-in-this-song', 'down-by-the-river', 'fall', 'floating',
        'forget-the-flowers', 'honk-honk', 'im-mai', 'in-bloom',
        'johnny-appleseed-cover-of-original-song-by-gbv', 'life-is-but-a-dream', 'more-autumn-magic',
        'mr-bluebird-on-my-shoulder', 'neverending-summer', 'note-20-ultra-doodle', 'note-5-doodles',
        'note-8-doodles', 'note-8-doodles-2', 'note-8-doodles-3', 'note8-slop-art', 'patience',
        'peace-lily', 'pretty-great', 'samvega', 'schnee-und-himmel', 'serenity', 'shes-pretty',
        'shhhhhh', 'summers-last-stand', 'sunnin', 'swan-memorial-fountain-logan-square', 'tranquility',
      ].map((slug) => [`/${slug}`, `/posts/${slug}/`])
    ),
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
    devMediaMiddleware(),
    sitemap({
      // Keep the sitemap in sync with the unexposed/noindex sections
      // declared in src/site.config.ts (robots.txt disallows the same paths).
      filter: (page) => !siteConfig.unindexedPaths.some((path) => new URL(page).pathname.startsWith(path)),
    }),
  ],
  adapter: vercel(),
  vite: {
    build: {
      // Keystatic's admin UI bundle (only loaded on /keystatic) is well
      // over the default 500kB warning threshold; it's a third-party
      // admin-only chunk we can't meaningfully split further ourselves.
      chunkSizeWarningLimit: 3000,
    },
  },
});