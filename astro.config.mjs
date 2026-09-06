// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

import vercel from '@astrojs/vercel';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), keystatic(), mdx()],
  adapter: vercel()
});