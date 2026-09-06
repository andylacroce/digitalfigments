# Migrating off WordPress — status

Source: `D:\wordpress` (self-hosted WordPress/IIS on the local desktop, serving
digitalfigments.com in production). Goal: get production off that box entirely.
**No DNS or production cutover has happened. The live site is untouched.**

## Decision

Astro (static site generator) + Keystatic (git-backed CMS admin, no database/server),
deployed on Vercel. Content lives as files in this repo. Chosen because:

- User wants off self-hosting-on-a-desktop, is fine with something technical, wants
  something modern/trendy among devs, free, and specifically asked whether Vercel
  was an option — which is what most self-hosted CMS options (Kirby, Grav,
  PocketBase, Ghost) don't fit, since they need a persistent server process/disk.
  Keystatic's git-backed model has no server at all: it reads/writes files via the
  GitHub API, so it runs natively on Vercel.
- User is tired of building yet another plain Next.js app — Astro was picked
  specifically as a different, content-first framework.
- The actual site content (36 posts spanning 2016–2026, mostly single photos/short
  videos/doodles, plus a handful of static pages) doesn't need a database or a
  plugin ecosystem — it's a good fit for flat files.

## What's done

- New private GitHub repo: `andylacroce/digitalfigments` (pushed, `main` branch).
- Astro project scaffolded with: `@astrojs/react`, `@keystatic/core` +
  `@keystatic/astro`, `@astrojs/mdx`, `@astrojs/vercel` (adapter — needed because
  Keystatic's admin UI requires server-rendered routes, not because the content
  pages themselves need SSR; posts/pages/covers are all prerendered static routes).
- `keystatic.config.ts` defines three collections: `posts`, `covers`, `pages`.
  **Storage kind is currently `local`**, which only allows editing via
  `npm run dev` on a machine with the repo cloned — it does *not* support editing
  from the deployed Vercel site yet. See "Still to do" below; switching to GitHub
  storage mode is what actually replaces the WordPress-app mobile-posting workflow.
- `src/content.config.ts` — Astro's own content-collection schemas (separate from
  `keystatic.config.ts`; they currently have to be kept in sync by hand — see
  "Known rough edges").
- All WordPress content exported and converted:
  - **36 posts** → `src/content/posts/*.mdx` (frontmatter: title, date, category).
    Categories: images/video/music/gif/text, matching the original WP taxonomy.
  - **32 cover-song entries** → `src/content/covers/*.json` (song, artist, date,
    audio-file-or-embed-url, sort order) — this was the "Covers" WP page, now a
    structured collection instead of one giant hand-maintained page.
  - **7 remaining pages** → `src/content/pages/*.mdx`: `music`, `donate`, `demos`,
    `a2z` (a2z Covers 2008), `job-stuff`, `obamas-audacity`, `privacy-policy`.
  - All referenced media (images/audio/video actually used by the above — not the
    full 1.4GB WP uploads library, which includes plugin caches, unused thumbnail
    sizes, etc.) copied into `public/media/`, ~454MB.
  - The legacy 2000s static band site (`D:\wordpress\old-site`) copied verbatim
    into `public/old-site/` — will be served as-is at `/old-site/...`.
- Page templates: `src/pages/index.astro` (post feed), `src/pages/posts/[slug].astro`
  (single post), `src/pages/covers.astro` (song archive), `src/pages/[slug].astro`
  (generic static page), `src/layouts/Layout.astro` (shared shell/nav/styles).
- `npm run build` succeeds end to end (verified locally, not yet deployed).
- Migration script preserved at `scripts/migrate-wp-content.mjs` — re-runnable if
  WP content changes before final cutover (see header comment for how to re-export
  from WordPress via `wp-cli eval` and where to point `WP_EXPORT_DIR`).

## Content decisions flagged for you, not yet made

- **`job-stuff` page**: only ever contained a dead Voiceflow chatbot embed script,
  no real content. Migrated as-is (wrapped in a code block so it doesn't break the
  MDX build) but this is a strong candidate to just delete.
- **`obamas-audacity` page**: a genuine personal essay, not photo/media content —
  kept, but doesn't fit the nav or the "media blog" framing. Decide whether it
  becomes a regular post, stays a standalone page, or gets dropped from nav.
- Nav currently only links to Home / Music / Donate — `job-stuff`,
  `obamas-audacity`, and `privacy-policy` are built and reachable by direct URL
  but not linked from anywhere. Intentional pending the calls above.

## Known rough edges / not yet done

1. **Keystatic storage mode is `local`, not `github`.** This means Keystatic's
   admin UI (`/keystatic`) only works when running `npm run dev` locally — it
   won't work on the deployed Vercel site yet, which means no phone/browser
   editing until this is switched. Switching to `storage: { kind: 'github', repo:
   'andylacroce/digitalfigments' }` requires creating a GitHub OAuth App (manual,
   needs browser + GitHub login) and setting `KEYSTATIC_GITHUB_CLIENT_ID`,
   `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET` as env vars on Vercel.
   This is the single most important remaining piece — it's what actually
   replaces "post a photo from the WordPress phone app."
2. **`keystatic.config.ts` and `src/content.config.ts` are two separate schemas**
   that happen to describe the same files. They were kept separate for this first
   pass to reduce risk (Astro's content collections are well-documented and known
   to work; I wasn't fully certain of Keystatic's exact on-disk data shapes without
   testing against the live admin UI). Keystatic docs describe a pattern for
   using `@keystatic/core/reader` as the single source of truth for both — worth
   doing once the admin UI itself has been opened and verified against real edits.
   **Next session should open `npm run dev` → `/keystatic` and confirm each
   collection (posts, covers, pages) loads and saves correctly before trusting it.**
3. **No Vercel project created yet.** Nothing has been deployed anywhere. Next
   step is `vercel link` / `vercel --prod` (or connect the GitHub repo in the
   Vercel dashboard) to get a preview URL — deploy to preview only, not
   production, until final approval.
4. **URL redirects not yet built.** The old WP site's `Redirection` plugin holds
   the andylacroce.com → digitalfigments.com URL history; that mapping needs to be
   exported and turned into Vercel redirects (`vercel.json`) before cutover, or
   old links will 404.
5. **No visual design pass.** Templates are intentionally plain right now —
   layout/typography/spacing has had no real design attention yet.
6. **`old-site/`** is served as static files but not linked from anywhere in the
   new nav — decide if/where it should be discoverable.
7. **Git LFS is enabled** (`.gitattributes`) for `*.zip .mp4 .mp3 .m4a .wav .mov .mid`
   — audio/video/the a2z zip total ~419MB, which is under GitHub's free 1GB LFS
   storage quota today but worth watching if more audio/video content gets added.
   Vercel needs LFS objects fetched during build — confirm the Vercel project has
   "Enable Git LFS" turned on when it's created, or the build will only see
   pointer files instead of real media.
8. Two content posts had no WP category (`Im Mai`, `Sunnin'`, `Blue Heaven
   Butterfly Bush`, `Floating`) and were defaulted to `images` by the migration
   script based on their content (all four are image posts) — verify this is
   correct.

## Explicitly NOT done (requires your final approval first)

- No DNS changes.
- No changes to the live IIS/WordPress site.
- No production deploy — everything above is local + a private GitHub repo only.
