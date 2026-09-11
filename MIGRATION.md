# Migrating off WordPress

Digital Figments used to run on a self-hosted WordPress/IIS install on a home
server. It has been migrated to Astro (static site generator) + Keystatic
(git-backed CMS, no database or server process), deployed on Vercel, with
content stored as files in this repo.

**Status: migration complete and live in production** at
[digitalfigments.com](https://digitalfigments.com) since 2026-09-06. A short
list of intentionally-deferred items remains — see "Outstanding items" below.

## Why Astro + Keystatic

- Moving off a self-hosted server onto something that doesn't need one to
  keep running. Most self-hosted CMS alternatives (Kirby, Grav, PocketBase,
  Ghost) still need a persistent server process and disk, which rules out a
  platform like Vercel. Keystatic's git-backed model has no server at all —
  it reads and writes files via the GitHub API — so it runs natively there.
- A deliberately different stack from "yet another Next.js app" — Astro is a
  content-first framework, a better fit for a site that's mostly static
  media and text.
- The content itself (a few dozen posts spanning 2016–2026, mostly single
  photos/short videos/doodles, plus a handful of static pages and a
  cover-songs archive) doesn't need a database or a plugin ecosystem — flat
  files are a good match.

## What was migrated

- All WordPress posts, converted to `.mdx` files with `title`/`date`
  frontmatter (WordPress's image/video/music/gif/text category taxonomy was
  dropped entirely rather than carried over — it wasn't adding value).
- The "Covers" page's song list, converted from one hand-maintained WP page
  into a structured `tracks` content collection (see below).
- A handful of remaining static pages (`music`, `privacy-policy`, and a
  couple of others) as `.mdx` files.
- All media actually referenced by the above (not WordPress's full uploads
  library, which also held plugin caches and unused thumbnail sizes).
- A legacy 2000s static band site, preserved byte-for-byte and served as-is
  at `/old-site/...`.
- The one-time conversion script is preserved at
  `scripts/migrate-wp-content.mjs`, re-runnable if the source WordPress
  export ever needs to be re-pulled (see its header comment).

The old WordPress/IIS box and its database were shut down (services
disabled, not set to auto-restart) rather than deleted, so a rollback stays
possible; nothing on it was removed. DNS for `digitalfigments.com` and `www`
now points at Vercel instead of that server.

## How content is organized today

Three content collections, defined in both `src/content.config.ts` (Astro's
schema) and `keystatic.config.ts` (the admin UI's schema — see "Outstanding
items" for why these are two separate files describing the same data):

- **`posts`** — the photo/video blog feed (title, date, MDX body).
- **`tracks`** — every cover, demo, and a2z-project track in one collection,
  with a `section` field routing each entry to `/covers/`, `/demos/`, or
  `/a2z/` and sorting independently within its section. All three pages
  render through one shared `TrackList` component, so they look and behave
  identically. This replaced an earlier split where `covers` was already a
  structured collection but `demos`/`a2z` were freeform MDX pages with
  inconsistent formatting.
- **`pages`** — static pages. A `blog.pageSlugs` list in `src/site.config.ts`
  routes specific entries (currently just one long-form essay) to `/blog/`
  instead of the generic `/[slug]/` route, so that split can't drift out of
  sync with the pages that actually use it.

Editing happens through Keystatic (`/keystatic`) — production uses GitHub
storage (reads/writes go straight to this repo via a GitHub App, no login
needed beyond GitHub OAuth), while local development uses `local` storage
(reads/writes files on disk directly, no login). See the README's "Editing
content" section for day-to-day usage.

## Outstanding items

- **`obamas-audacity` page**: a genuine personal essay, not photo/media
  content, so it doesn't fit the nav or the site's framing. Kept at
  `/blog/obamas-audacity/`, undecided whether it becomes a regular post,
  stays a standalone page, or drops out of the blog section.
- **`keystatic.config.ts` and `src/content.config.ts` describe the same data
  as two separate schemas**, kept in sync by hand. They were split
  deliberately for the initial migration to reduce risk while Keystatic's
  exact on-disk data shapes were still being verified against a live admin
  UI; that verification is done now (see the changelog), so unifying them
  via `@keystatic/core/reader` (Keystatic's documented pattern for a single
  source of truth) is worth doing when there's time.
- **URL redirects from the old site were never built.** The old
  `Redirection` plugin held the URL-history mapping needed to turn old links
  into Vercel redirects; cutover happened without it; some old links may
  404.
- **`/old-site/`** (the legacy static band site) is served but not linked
  from anywhere in the current nav — undecided if/where it should be
  discoverable.
- **R2 media isn't on a real CDN yet**: it's served from the bucket's
  `r2.dev` public URL (`pub-5d33fff496254a2a8c09165a5d5ff997.r2.dev`),
  which Cloudflare's own docs describe as a rate-limited debug endpoint —
  "not cached at the edge... should be treated as a debug hostname, not a
  production CDN." Fine for this site's traffic level today, but the
  documented production path is a custom domain (e.g.
  `media.digitalfigments.com`) attached to the bucket, which does get edge
  caching. Investigated attaching one: since `digitalfigments.com`'s DNS
  is on Vercel (not Cloudflare), that requires Cloudflare's CNAME-based
  "partial setup" for a subdomain zone — which turns out to require a
  Business or Enterprise Cloudflare plan, not Free. The actual free path
  is moving `digitalfigments.com`'s whole DNS to Cloudflare (a normal,
  well-supported "Cloudflare in front of Vercel" setup, and how most sites
  that get R2 edge caching for free actually do it) — a deliberate,
  bounded migration (recreate every existing DNS record, including mail/
  verification TXT records and the Keystatic GitHub App callback, then
  repoint the registrar's nameservers), not something to rush. Revisit as
  its own project.
- **GitHub App hygiene**: an earlier, incorrect OAuth App created during the
  Keystatic GitHub-storage setup (see changelog) was superseded by a proper
  GitHub App and is no longer referenced anywhere, but was never deleted on
  GitHub's side. The GitHub App's private key was also generated and, since
  Keystatic's OAuth flow never uses it, has sat unused since. Neither is a
  known live risk, but deleting the old OAuth App and rotating the unused
  private key would be reasonable hygiene.

## Explicitly not done

Actually decommissioning the WordPress/IIS box — removing the site files,
dropping the database, and freeing the disk space. Both sites are stopped
and won't restart on their own, but everything is still present on disk for
a possible rollback.

## Changelog

### 2026-09-06

- **Initial migration**
  - WordPress content exported and converted (see "What was migrated").
  - Astro project scaffolded (`@astrojs/react`, `@keystatic/core`/
    `@keystatic/astro`, `@astrojs/mdx`, `@astrojs/vercel` — the Vercel
    adapter is needed because Keystatic's admin UI requires
    server-rendered routes, not because the content pages themselves need
    SSR; posts/pages are all prerendered static routes).
  - Build verified working end to end locally.
- **First design and content-bug pass**
  - Fixed four posts that were rendering completely blank: a
    migration-script regex had assumed an `<img>` tag's `src` attribute
    always came before `alt`, which didn't hold for the WordPress gallery
    plugin's markup used by three of them, and the fourth used an
    old-style audio shortcode the script didn't recognize at all — both
    gaps were fixed in the shared script and the affected posts were
    regenerated.
  - Fixed cover-song ordering: the migration script had assigned sort
    order in three passes by media type instead of by each entry's real
    position in the source page, pushing non-audio entries to the end.
  - Fixed a real CSS bug where Astro's scoped styles never reached content
    rendered through `<Content />`/`<slot />`, so post images had been
    rendering with no styling at all — all site CSS was moved into a
    plain, unscoped stylesheet to fix it and to have one place for it
    going forward.
  - Categories/tags were dropped entirely (not carried over from
    WordPress).
  - The `donate` page (a personal list of charity links, not
    migration-relevant) was deleted outright, and `music` was unlinked
    from nav but kept live.
  - First real visual design pass: display serif for headings, an earthy
    two-tone accent palette with a light/dark toggle, a sticky header, a
    photo grid with lightbox for posts with multiple images, pagination
    for the home feed, reduced-motion-aware entrance animations, and a
    responsive pass for phones.
  - Images set to lazy-load at compile time; static assets got long-lived
    cache headers.
- **DRY pass, SEO, and first deployment**
  - Extracted duplicated date-formatting and page-filtering logic into
    shared helpers, and several copy-pasted `<style>` blocks into shared
    CSS utility classes.
  - Fixed a spacing bug where consecutive margins were stacking between
    home-feed posts.
  - Added a "back" link component that uses browser history when
    navigation came from elsewhere on the site, falling back to a fixed
    link otherwise.
  - Split a long-form essay page into its own unlinked `/blog/` section
    with an index page.
  - Added `site.config.ts` as the single source of truth for which routes
    are unindexed, driving `robots.txt`, per-page `noindex` tags, and the
    blog-routing split together so they can't drift out of sync.
  - Full SEO pass: meta description, Open Graph/Twitter Card tags,
    canonical URLs, sitemap, best-effort per-post preview image pulled
    from a post's first image.
  - Fixed three pre-existing high-severity `npm audit` findings (a ReDoS
    in a transitive dependency of the Vercel adapter).
  - First deployment shipped to a `vercel.app` URL, with no custom domain
    or DNS changes yet.
- **Security headers and DNS cutover**
  - Deleted the `job-stuff` page (a dead chatbot embed script, no real
    content).
  - Resolved the earlier `npm audit` findings properly via a dependency
    override rather than a risky downgrade.
  - Added a full set of security headers: content-type sniffing
    protection, frame-busting, referrer policy, permissions policy, HSTS
    without `preload`, and a content-security-policy permissive enough
    for Keystatic's admin UI, verified against the deployed policy with
    zero console errors.
  - Confirmed Vercel's GitHub integration auto-deploys on push to `main`,
    independent of any manual deploy.
  - Attached the production domain to the Vercel project, then cut over
    DNS from the old server to Vercel.
  - Gotcha hit and fixed: leaving DNS proxying on in front of Vercel broke
    TLS entirely, because Vercel's automatic certificate issuance checks
    the public DNS answer directly and never saw the real record once a
    proxy sat in front of it — fixed by pointing DNS directly at Vercel
    instead.
  - A pre-existing dynamic-DNS automation on the home network (unaware the
    domain had moved) reverted the DNS change and briefly caused a real
    outage about an hour after cutover; it was disabled and removed once
    identified.
  - URL redirects from the old site's redirect plugin were explicitly not
    built before cutover — an accepted tradeoff.
- **Git LFS root-caused and removed**
  - Root-caused "audio/video isn't playing" on the live site to Git LFS:
    Vercel's git-triggered deploys were cloning the repo without LFS's
    smudge filter, so every audio/video URL was serving a small LFS
    pointer file instead of real content in production (a single early
    manual deploy — which uploads a local working directory directly
    rather than cloning — had briefly masked this).
  - Fixed by removing LFS entirely and committing all previously-LFS-
    tracked files as regular git blobs; confirmed real content serving in
    production afterward, including the largest file at ~97MB, safely
    under GitHub's 100MB limit for regular files.
- **Keystatic switched to GitHub storage**
  - Configured Keystatic to read and write through the GitHub API in
    production (still using local disk storage for local development), so
    content can be edited directly from the deployed site — the actual
    replacement for posting from a phone app.
  - This took two attempts: the first used a plain GitHub OAuth App, which
    looked like it worked (the login screen is visually identical either
    way) but failed once Keystatic tried to actually check repo access,
    because its GitHub storage mode is built around a GitHub App's
    per-repo installation model, not a plain OAuth App's token scopes.
  - Replaced it with a proper GitHub App (repo-scoped, contents
    read/write, OAuth-during-installation enabled) and confirmed the full
    login → authorize → redirect flow works end to end.
- **Old server fully stopped**
  - Both IIS sites on the old server were stopped and disabled from
    auto-starting (confirmed one of them, unrelated to this migration, was
    already receiving zero real traffic before touching it), along with
    the underlying IIS service and the WordPress database service.
  - Nothing was deleted — see "Explicitly not done."
- **`www` TLS fix**
  - `www.digitalfigments.com` was serving the apex domain's TLS
    certificate (a hostname mismatch) because only the apex had been
    explicitly registered with the Vercel project — `www` had a correct
    DNS record but no certificate of its own.
  - Fixed by registering `www` as its own project domain explicitly; the
    lesson going forward is to register every hostname actually served,
    not assume one implies the other.
- **CSP fix and GitHub App correction**
  - The security-headers CSP from earlier was silently blocking
    Keystatic's post-login calls to GitHub's API (visible only as browser
    console violations) — fixed by allowlisting the specific GitHub/Vercel
    hosts it actually needs.
  - Cleaned up the GitHub App vs. OAuth App confusion from the
    storage-mode switch (see "Outstanding items" for the remaining
    hygiene step).

### 2026-09-07

- **Keystatic MDX component errors fixed**
  - Opening certain pages/posts in Keystatic threw "missing component
    definition" errors, because they embedded raw HTML (`<audio>`,
    `<video>`, and — in one page only — `<figcaption>`) carried over
    verbatim from WordPress, and Keystatic's MDX editor requires an
    explicit component definition for any non-standard element.
  - Registered `audio`/`video` as MDX components; converted the
    `<figcaption>` captions to plain markdown text instead, since they had
    no special styling depending on the tag and MDX's parser treated that
    particular markup as inline rather than block content, which doesn't
    fit a simple component registration.
- **Unified the tracks collections**
  - Merged `/covers/`, `/demos/`, and `/a2z/` into the single `tracks`
    collection described above, converting the two previously-freeform
    pages' entries into the same structured shape and retiring their raw
    MDX/HTML entirely (which also fully resolved the `figcaption` issue
    for that page).
  - `/music` was also rebuilt from a plain text page into a small animated
    icon menu.
- **Masonry gallery rework, header identity, and CI**
  - Replaced the photo gallery's CSS multi-column layout with a true CSS
    grid masonry: columns auto-fill the available width and each photo's
    row-span is computed from its real aspect ratio, so a gallery with
    few images now fills the row evenly instead of sitting cramped on one
    side, while photos keep their natural proportions with no cropping or
    letterboxing.
  - Standalone single images now center in the text column instead of
    sitting flush left.
  - The header's brand text was given its own gradient/animated identity,
    distinct from post titles.
  - The privacy policy page (still WordPress's unedited default
    boilerplate, and not linked from anywhere) was rewritten to describe
    this site specifically and linked from the footer.
  - Added a full CI pipeline (lint, markdown lint, typecheck, unit tests
    with a coverage gate, build, and a small Playwright end-to-end suite
    for the site's interactive behavior), running on every push via
    GitHub Actions, plus Dependabot for dependency updates and a local
    pre-commit secret scan (the practical equivalent of GitHub's
    secret/code scanning, which require a paid plan on a private
    repository).
  - Removed personal-name references from the site's own pages and
    metadata (page descriptions, the footer, the privacy policy) — the
    footer now just links to the privacy policy.
- **Post images moved into Astro's build-time optimization pipeline**
  - A real Lighthouse run found a 12544x2720, 14.5MB original JPEG being
    displayed at 372x81px on the home feed (43s LCP on throttled mobile) —
    images in `public/` are served byte-for-byte as authored and are never
    resized, reformatted, or made responsive by Astro, regardless of the
    lazy-loading/cache-header work noted above.
  - Moved all 76 post photos from `public/media` into
    `src/content/posts/images` and rewrote their MDX references to
    relative paths, so the build now generates resized, WebP/AVIF,
    responsive (`srcset`/`sizes`) variants with real `width`/`height`
    automatically; a global `image.layout: 'constrained'` config in
    `astro.config.mjs` drives this for every post image.
  - Updated the best-effort OG/Twitter preview-image lookup (previously a
    plain `new URL()` against the raw markdown path) to resolve the same
    relative path to its optimized build output instead.
  - Updated Keystatic's post image field (`publicPath`) to write the same
    relative-path convention, so images added through the CMS going
    forward get the same optimization as the migrated library.
  - Audio/video/zip files stayed in `public/media` untouched — this only
    affects photos.

### 2026-09-11

- **Moved audio/video/zip off Vercel's deployment storage**
  - Deployment Storage (the sum of build output across every retained
    deployment, not just the live one) hit ~24GB against the Hobby plan's
    free quota. Root cause: `public/media` (426MB of raw audio/video, plus
    a 98MB zip) was getting bundled into every single deployment — Astro
    copies `public/` byte-for-byte into build output, and there's no
    optimization pass for these formats the way there is for images (see
    the 2026-09-07 entry above), so they were always served as-is.
  - Cleared the existing backlog: removed all 43 stale deployments via
    `vercel remove` (kept the one live production deployment), and set
    deployment retention to 1 day in Vercel project settings so it can't
    reaccumulate.
  - Relocated `public/media` to `assets/media` (still git-tracked — commit
    history remains the source of truth) so it's outside `public/` and
    never bundled into a deployment again. `scripts/sync-media.mjs` mirrors
    `assets/media/` and `assets/covers-audio/` to a Cloudflare R2 bucket,
    diffing by content hash against a git-tracked manifest
    (`assets/.media-manifest.json`) so only new/changed files upload.
    Wired into `.husky/pre-commit`, so committing a new audio/video file
    syncs it to R2 automatically; a no-op (no network call) on any commit
    that doesn't touch those directories.
  - Added `src/lib/media.ts` (`mediaUrl()`) to resolve stored `/media/...`
    and `/covers-audio/...` paths against the R2 bucket's public URL
    (`PUBLIC_MEDIA_BASE_URL` env var) at render time; used by `TrackList`,
    `a2z.astro`, and the 6 posts with embedded audio/video.
  - Updated Keystatic's `tracks` audio field to write new uploads to
    `assets/covers-audio` instead of `public/covers-audio`, so future
    CMS-authored tracks don't reintroduce the same problem.
  - Removed the now-dead `/media/(.*)` and `/covers-audio/(.*)` cache
    header rules from `vercel.json` — nothing is served from those paths
    through Vercel anymore.
