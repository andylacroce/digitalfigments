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
  MDX build) but this is a strong candidate to just delete. Still undecided —
  still built and reachable by direct URL, not linked from nav.
- **`obamas-audacity` page**: a genuine personal essay, not photo/media content —
  kept, but doesn't fit the nav or the "media blog" framing. Still undecided
  whether it becomes a regular post, stays a standalone page, or gets dropped
  from nav. Still built and reachable by direct URL, not linked from nav.
- ~~Nav currently only links to Home / Music / Donate~~ — resolved this session:
  **`donate` page deleted outright** (its content was just a personal list of
  charity links), and **`music` is intentionally unlinked from nav but still
  live** at `/music/`. Nav is now just the brand wordmark (linking home) plus
  the theme toggle and a scroll-triggered "back to top" button —
  `privacy-policy`, `job-stuff`, `obamas-audacity` remain reachable only by
  direct URL pending the calls above.

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
5. ~~No visual design pass.~~ Done this session — see below. A real, opinionated
   look now exists (earthy/retro palette, display font, tiled photo galleries,
   lightbox, dark mode). Still open: no design pass on the `covers`/`music`/
   `demos`/`a2z`/`obamas-audacity`/`privacy-policy` page templates specifically
   (they inherit the global look but haven't been individually reviewed).
6. **`old-site/`** is served as static files but not linked from anywhere in the
   new nav — decide if/where it should be discoverable.
7. **Git LFS is enabled** (`.gitattributes`) for `*.zip .mp4 .mp3 .m4a .wav .mov .mid`
   — audio/video/the a2z zip total ~419MB, which is under GitHub's free 1GB LFS
   storage quota today but worth watching if more audio/video content gets added.
   Vercel needs LFS objects fetched during build — confirm the Vercel project has
   "Enable Git LFS" turned on when it's created, or the build will only see
   pointer files instead of real media.
8. ~~Two content posts had no WP category...~~ Moot — categories were dropped
   entirely (see below).

## Session updates (2026-09-06)

- **Keystatic admin UI verified working** end to end via `npm run dev` →
  `/keystatic`: all three collections (posts, covers, pages) load with their
  full entry lists, schema fields render correctly (including the covers
  conditional audio/embed field), and a real edit-and-save round-trip was
  tested on `privacy-policy.mdx` — Keystatic writes valid MDX back to disk
  with correct escaping. One cosmetic rough edge: the posts `date` field is
  stored as a full ISO datetime (`2018-06-03T12:35:39`) but Keystatic's date
  picker expects `yyyy-MM-dd`, which throws a harmless console warning in the
  admin UI — not fixed yet.
- **Post categories/tags removed entirely** (was `images`/`video`/`music`/
  `gif`/`text` per post) — dropped from `keystatic.config.ts`,
  `src/content.config.ts`, the post templates (`index.astro`,
  `posts/[slug].astro`), all 36 post `.mdx` files, and
  `scripts/migrate-wp-content.mjs` so re-running the migration won't
  reintroduce it.
- **Fixed a real CSS bug**: `Layout.astro`'s scoped `<style>` never applied to
  post/page content rendered via `<Content />`/`<slot />` (Astro only scopes
  elements written literally in the defining file), so images in posts were
  rendering at native size with no styling at all. Moved all site CSS out of
  `Layout.astro` into `src/styles/global.css` (a plain, unscoped stylesheet
  imported in the layout) — fixes the bug and makes the CSS easier to
  maintain in one place. No visual design pass has happened beyond this fix;
  item 5 below still stands.

## Session updates, part 2 (2026-09-06, design + content-bug pass)

- **Fixed 4 posts that were rendering completely blank**: `serenity`,
  `more-autumn-magic`, `samvega`, and the Johnny Appleseed cover. Root cause
  was in `scripts/migrate-wp-content.mjs` — its image-extraction regex assumed
  `src` always came before `alt` in an `<img>` tag, but Jetpack's tiled-gallery
  blocks (used by these 3 posts) emit `alt` first, so nothing matched; the 4th
  post used an old-style `[audio mp3="..."][/audio]` shortcode the script
  didn't recognize at all. Both bugs are fixed in the shared script (order-
  independent attribute parsing, shortcode support, blockquote fallback), and
  the 4 affected posts were regenerated from the original WP export — Samvega
  now has 18 images, More Autumn Magic 15, Serenity 2, and the Johnny
  Appleseed post has its audio player and lyric blockquote back.
- **Fixed cover-song ordering on `/covers/`**: the migration script assigned
  the `order` field in three separate passes (all audio entries first, then
  all YouTube embeds, then all native-video entries), so anything not
  audio — the embedded "Suzanne" cover and the "Tiny Dancer" video — got
  pushed to the end instead of appearing where they actually sat on the old
  WordPress page. Fixed by collecting all three block types with their true
  position in the source document and sorting by that before assigning
  order; the 32 `covers/*.json` files were regenerated with correct order
  values.
- **Categories/tags removed entirely** from posts (was `images`/`video`/
  `music`/`gif`/`text`) — dropped from both schemas, both templates, all 36
  post files, and the migration script.
- **`donate` page deleted** (full removal — content was just a personal list
  of charity links, not migration-relevant). **`music` unlinked from nav**
  but still live at `/music/`.
- **Real visual design pass** (previously fully unstyled/default):
  - Display serif (Fraunces, via Google Fonts) for headings/brand, system-ui
    body text.
  - Earthy, natural two-tone accent palette — terracotta + sage green — with
    separate light/dark variants (`src/styles/global.css` `:root` custom
    properties), plus a manual light/dark toggle in the header (persisted to
    `localStorage`, defaults to OS preference via `prefers-color-scheme`).
  - Sticky header with a solid accent bottom border; a "back to top" button
    that appears after scrolling ~400px and animates back up with a fast
    (350ms) custom eased scroll rather than relying on native smooth-scroll.
  - Posts with 2+ standalone images are auto-detected client-side and laid
    out as a tiled photo grid (`.gallery`/`.gallery-item`, replacing what were
    Jetpack tiled-gallery blocks on the old WP site); every post image is
    click-to-enlarge via a small lightbox (no dependency — vanilla JS/CSS).
  - Fixed the actual "images render huge with no styling" bug: `Layout.astro`'s
    old scoped `<style>` never reached content injected via `<Content />`/
    `<slot />` (Astro only scopes elements written literally in the defining
    file) — CSS now lives in `src/styles/global.css`, a plain unscoped
    stylesheet, plus `max-height: 80vh` so tall portrait phone photos don't
    dominate the viewport.
  - Home feed is now paginated (`src/pages/[...page].astro`, replacing the old
    unpaginated `index.astro`), 10 posts per page.
  - Subtle entrance-fade animations on post cards and single-post articles,
    all gated behind `prefers-reduced-motion`.
  - Responsive pass for phones: tighter header/main padding, smaller gallery
    tiles, adjusted heading sizes under a 480px breakpoint.
- **Performance**: a small rehype plugin in `astro.config.mjs` adds
  `loading="lazy" decoding="async"` to every MDX-rendered `<img>` at compile
  time (applies uniformly rather than per-post — deliberate tradeoff, see the
  comment in that file). Added `vercel.json` with 1-year immutable
  `Cache-Control` headers for `/media/`, `/posts-media/`, `/covers-audio/`,
  and `/old-site/` — worth knowing: because these paths aren't
  content-hashed, overwriting a file at the same path (e.g. re-uploading
  through Keystatic with an identical filename) could serve a stale cached
  copy for up to a year in browsers/CDN that already fetched it.
- Note: **the local dev server needs a restart to notice new files added
  under `public/`** after it's already running (e.g. media copied in by the
  migration script mid-session) — a plain browser refresh isn't enough and
  will 404. Not an issue for a fresh `npm run dev` or for the production
  build/deploy.

## Explicitly NOT done (requires your final approval first)

- No DNS changes.
- No changes to the live IIS/WordPress site.
- No production deploy — everything above is local + a private GitHub repo only.
