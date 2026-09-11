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

const mediaDirs = { '/media/': 'media', '/covers-audio/': 'covers-audio' };
/** @type {Record<string, string>} */
const mediaContentTypes = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.zip': 'application/zip',
};

// Dev-only: serves assets/media|covers-audio straight from disk so a
// newly-added file is playable in `astro dev` without syncing to R2 first
// (see src/lib/media.ts and README's "Media assets" section). Never runs
// in a real build — assets/ stays outside public/, so nothing here changes
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
          const prefix = /** @type {(keyof typeof mediaDirs)[]} */ (Object.keys(mediaDirs)).find((p) =>
            pathname.startsWith(p)
          );
          if (!prefix) return next();

          const baseDir = path.join(import.meta.dirname, 'assets', mediaDirs[prefix]);
          const filePath = path.join(baseDir, decodeURIComponent(pathname.slice(prefix.length)));

          if (!filePath.startsWith(baseDir + path.sep) || !existsSync(filePath) || !statSync(filePath).isFile()) {
            return next();
          }

          res.setHeader('Content-Type', mediaContentTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream');
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