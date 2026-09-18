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

- **First Keystatic-authored production post took ~12.5 minutes for Vercel
  to even register a deployment**, out of an ~18.5-minute total commit-to-live
  time (2026-09-18, `watching-the-wheels` post). Confirmed via the GitHub and
  Vercel APIs: the commit landed on GitHub normally (its own CI check-run
  fired immediately), but no Vercel deployment record existed for that SHA
  for over 12 minutes, then one appeared and queued on its own — nobody
  triggered it manually. GitHub App installation and Vercel's Git connection
  were both manually checked and look healthy, so this reads as a delayed
  webhook delivery (GitHub retries failed deliveries automatically) rather
  than a config problem. The build itself, once started, was ~2 minutes and
  not the bottleneck — image caching (Astro's built-in per-image build cache)
  worked correctly, reusing 686 of 687 images and only processing the one
  genuinely new photo. Unresolved: whether this recurs on future
  Keystatic-authored commits. If it does, escalate to Vercel support — it's
  not something fixable from this repo.
- **`www.digitalfigments.com` needs a domain-level redirect to the apex
  domain, set manually in the Vercel dashboard** (Project Settings →
  Domains → Edit `www.digitalfigments.com` → Redirect to →
  `digitalfigments.com`). Both domains currently serve the full site with no
  redirect between them — confirmed as the cause of Search Console's
  "Alternate page with proper canonical tag" exclusions (see 2026-09-16
  changelog). Can't be done from `vercel.json`/code; this is a one-time
  manual step.
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
- **URL redirects from the old site were never built**, beyond the post/essay
  redirects added 2026-09-16 (see changelog) — those cover every real post's
  old flat permalink (`/<slug>/` → `/posts/<slug>/`) and the essay page, but
  the old `Redirection` plugin's full URL-history mapping (categories, tags,
  feeds, and one-off WordPress attachment pages per uploaded image) was never
  recovered, so links into those still 404. Left as-is deliberately: there's
  no single sensible destination for that cruft, and redirecting orphaned
  URLs to the homepage is worse for SEO than a real 404.
- **`/old-site/`** (the legacy static band site) is served but not linked
  from anywhere in the current nav — undecided if/where it should be
  discoverable.
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

### 2026-09-16

- **SEO: diagnosed the `www` duplicate-content bug, added legacy post
  redirects**, prompted by Search Console reporting most of the site as
  "Discovered/Crawled — currently not indexed" or "Alternate page with
  proper canonical tag" shortly after launch.
  - `www.digitalfigments.com` was found serving a full, unredirected
    duplicate of the site (both hostnames resolved on Vercel, only the apex
    was ever set as canonical) — every page's `www` copy was live and
    getting crawled against a canonical tag pointing elsewhere; confirmed
    via GSC's sample URLs (all `www.digitalfigments.com/?attachment_id=N`,
    old WordPress attachment links whose query string gets dropped by the
    canonical tag, landing on the apex homepage's canonical). A `vercel.json`
    host-matching redirect was tried first and confirmed *not* to work —
    Vercel's own docs say cross-domain redirects between two domains on the
    same project are a per-domain dashboard setting (**Project Settings →
    Domains → Edit `www.digitalfigments.com` → Redirect to →
    digitalfigments.com**), not something `vercel.json` can express. That
    dashboard step is still outstanding (see below).
  - Added the flat pre-migration permalink → `/posts/<slug>/` (and
    `/blog/obamas-audacity/`) redirects described in "Outstanding items"
    above, via `astro.config.mjs`'s `redirects`.
  - Considered also adding `trailingSlash: 'always'` to stop
    `/posts/basil` and `/posts/basil/` serving as separate duplicate URLs,
    but reverted it: the Vercel adapter's own slash-enforcing redirect runs
    ahead of the legacy-permalink redirects above in the generated route
    list, so it silently broke them (`/basil` → `/basil/` → 404 instead of
    → `/posts/basil/`). Not worth the added complexity for a real but minor,
    unconfirmed contributor to the GSC report — left as-is.

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
- **R2 media now on a real CDN** — `digitalfigments.com`'s DNS was moved to
  Cloudflare's nameservers (the "phase 2" deferred in the entry above),
  which unblocked attaching a proper custom domain,
  `media.digitalfigments.com`, to the R2 bucket via
  `wrangler r2 bucket domain add` (needed the zone ID from the dashboard —
  the wrangler OAuth token only carries `zone:read`, not `zone:edit`, so it
  can't look zones up itself). Verified edge caching is live: a fetch
  through the new domain returns `cf-cache-status` and
  `Cache-Control: max-age=14400` headers that `r2.dev` never sent.
  `PUBLIC_MEDIA_BASE_URL` (local `.env`, plus Vercel's Production/Preview
  env vars) and `vercel.json`'s CSP `media-src` were repointed from
  `pub-5d33fff496254a2a8c09165a5d5ff997.r2.dev` to
  `media.digitalfigments.com`.
- **Closed the Keystatic-upload sync gap** — the pre-commit hook only ever
  covers local commits; Keystatic's GitHub-storage mode commits straight to
  GitHub via API, bypassing it entirely. Added
  `.github/workflows/sync-media.yml`: on push to `main` touching
  `assets/media/**` or `assets/covers-audio/**`, it reruns
  `sync-media.mjs --all` (content-hash diffed against the same manifest, so
  it's still a no-op for unchanged files) and commits the updated manifest
  back. Needs `CLOUDFLARE_API_TOKEN` (Account → Workers R2 Storage → Edit)
  and `CLOUDFLARE_ACCOUNT_ID` as repo secrets — both added and verified
  end-to-end (a manual `sync-media.mjs --all` run using the same
  token-based auth the Action uses reported `0 uploaded, 71 unchanged`, and
  a scratch object upload/delete round-trip confirmed write access).
- **Fixed the deploy-race between Vercel and the sync workflow** — both
  fired off the same push with no ordering guarantee, so a newly-published
  track's page could go live on Vercel before `sync-media.yml` finished
  uploading its file to R2 (brief 404 window). `vercel.json`'s
  `ignoreCommand` now makes Vercel skip its own auto-deploy for any commit
  touching `assets/media`/`assets/covers-audio` (`git diff --quiet HEAD^
  HEAD -- <paths>`, inverted since Vercel's convention is exit 0 = skip).
  Verified Vercel's exit-code convention and clone depth (`--depth=10`, so
  `HEAD^` is always available) against Vercel's own docs before shipping,
  given a wrong polarity here could have silently stopped all future
  deploys.
  - First attempt had `sync-media.yml`'s last step call a Vercel deploy
    hook once the sync was done. This shipped, and **didn't work**: the
    flatten commit below landed with both the auto-deploy *and* the
    hook-triggered build canceled, because a deploy hook just re-triggers
    a normal git-integration build, which re-evaluates the same
    `ignoreCommand` and gets skipped too — confirmed as a documented
    Vercel limitation (deploy hooks and `ignoreCommand` share one gate,
    with no way to tell them apart from inside the command). Caught
    immediately by actually checking `vercel ls`/`vercel inspect --logs`
    after shipping rather than assuming the hook call succeeding meant
    the deploy did — production was briefly stuck on the prior commit
    until a manual `vercel --prod` closed the gap. Replaced with an
    actual Vercel CLI deploy (`vercel pull` / `build` / `deploy
    --prebuilt --prod`, needs `VERCEL_TOKEN`/`VERCEL_ORG_ID`/
    `VERCEL_PROJECT_ID` as repo secrets) — a CLI-driven deploy doesn't go
    through the git-integration pipeline at all, so `ignoreCommand` never
    sees it.
- **Local dev no longer needs R2 at all** — previously, `mediaUrl()` always
  resolved through the CDN even in `astro dev`, so a file you'd just added
  locally 404'd until manually synced. `astro.config.mjs` now runs a
  dev-only middleware serving `assets/media`/`assets/covers-audio`
  straight from disk under those same paths; `mediaUrl()` checks
  `import.meta.env.DEV` and leaves the path relative instead of prefixing
  the CDN domain when true. Verified end-to-end (file-size integrity,
  404 fallthrough for missing files, path-traversal rejection, and that no
  CDN domain leaks into dev-rendered HTML) — a real build is unaffected,
  `DEV` is always false there.
- **Flattened `assets/media/`** — the `YYYY/MM/` nesting was inherited
  verbatim from WordPress's old upload-date folder convention and wasn't
  used by anything; asked to clean it up. Flattened all 71 files to
  `assets/media/<filename>` (one exact byte-for-byte duplicate,
  `JohnnyAppleseed.mp3`, existed under two different dates — collapsed to
  a single file both the post and the track entry now reference), rewrote
  all 71 references across 6 MDX posts, ~64 track JSON files, and
  `a2z.astro`, cleared and rebuilt `.media-manifest.json` against the new
  flat keys, re-synced all 70 files to R2 under their new keys, and
  explicitly deleted all 71 old nested-path objects from R2 (verified via
  a direct origin read, bypassing the CDN cache, that each is actually
  gone — not just evicted from cache). Also fixed a `spawnSync npx.cmd
  EINVAL` in `sync-media.mjs` surfaced by this bulk run — a Node
  26/Windows regression spawning long-running `.cmd` children without a
  shell; worked around with `shell: true` on Windows only (script-controlled
  args, not user input, so the usual shell-escaping risk doesn't apply).
  After an unrelated mid-run interruption, verified no corruption:
  compared all 70 files' sizes between local disk and R2 directly (not
  just via the CDN), zero mismatches.
- **Merged `assets/covers-audio/` into `assets/media/`** — the split
  (Keystatic-uploaded cover audio in one folder, hand-placed post/page
  media in another) was inherited structure, not something this migration
  introduced, and added confusion for no real benefit. Nothing had ever
  actually been uploaded through Keystatic yet, so this was a config-only
  change with zero real content to move: updated `keystatic.config.ts`'s
  audio field to write to `assets/media`/`/media/` instead, removed the
  `covers-audio` branch from `mediaUrl()`, `sync-media.mjs`'s watched
  directories, and `astro.config.mjs`'s dev middleware. One folder, one
  namespace, going forward.
