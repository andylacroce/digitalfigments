# digitalfigments.com

Astro + Keystatic replacement for the WordPress site currently self-hosted at
`D:\wordpress`. See [MIGRATION.md](./MIGRATION.md) for full migration status,
decisions, and what's left before cutover.

**Not deployed anywhere yet.** The live site remains on WordPress until this is
finished and explicitly approved for cutover.

## Structure

```
src/
├── content/
│   ├── posts/    36 migrated blog posts (photos/doodles/video), .mdx
│   ├── covers/   cover-song archive entries, .json
│   └── pages/    static pages (music, donate, demos, a2z, etc.), .mdx
├── content.config.ts   Astro content-collection schemas
├── layouts/Layout.astro
└── pages/        routes (index, posts/[slug], covers, [slug])

keystatic.config.ts   CMS admin schema (see MIGRATION.md — currently local-only)
scripts/migrate-wp-content.mjs   one-time WP → Astro converter, re-runnable
public/media/     migrated media referenced by posts/pages
public/old-site/  legacy 2000s static site, preserved as-is
```

## Commands

| Command           | Action                                  |
| :----------------- | :--------------------------------------- |
| `npm install`       | Install dependencies                     |
| `npm run dev`       | Local dev server, and Keystatic admin at `/keystatic` |
| `npm run build`     | Build to `./dist/`                       |
| `npm run preview`   | Preview the production build locally     |
