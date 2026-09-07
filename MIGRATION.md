# Migrating off WordPress — status

Source: `D:\wordpress` (self-hosted WordPress/IIS on the local desktop, formerly
serving digitalfigments.com in production).

**DNS cutover happened 2026-09-06.** `digitalfigments.com` and `www` now point
to Vercel (`76.76.21.21`, DNS-only/unproxied — see "Session updates, part 4"
below for why proxied mode didn't work) instead of the WordPress box
(`73.198.117.200`). Confirmed live: apex + www both serve the new Astro site
over HTTPS, `robots.txt` correct. **No redirects were built from the old WP
`Redirection` plugin data — explicitly accepted, some traffic/links may 404.**
**Both IIS sites on this box were stopped 2026-09-06**, `serverAutoStart` set
to `false` on each so neither comes back on its own after an IIS service
restart or reboot:

- **"Digital Figments"** (`id:1`, physical path `D:\wordpress`, bindings for
  `digitalfigments.com`/`www`) — the site this whole migration replaces.
- **"andylacroce.com"** (`id:2`, physical path `D:\andylacroce.com`) — a
  separate, unrelated site. Confirmed via Cloudflare (read-only DNS check)
  before touching it: `andylacroce.com`'s DNS already pointed entirely at
  Vercel (apex `A` → `76.76.21.21`, `www` CNAME → `cname.vercel-dns.com`) —
  not this box's IP at all — so this local IIS site wasn't receiving any
  real traffic regardless. Stopping it was confirmed safe, not just assumed.
  (That zone also has live MX/email records and an `emby` subdomain via
  Cloudflare Tunnel — untouched, not part of this migration.)

Nothing was deleted for either site — all files, databases, and IIS config
are still intact on disk; either can be restarted anytime via
`appcmd start site "<name>"` (as Administrator) if ever needed.

**The underlying IIS Windows service (`W3SVC`) itself was also stopped and
set to `Manual` startup** (was `Automatic`) — with both sites already
disabled individually, there was no remaining reason for IIS to start on
boot at all. This is the durable, boot-level guarantee that nothing on this
box auto-resumes serving traffic. Reversible: `Set-Service W3SVC
-StartupType Automatic; Start-Service W3SVC` (as Administrator) brings it
all back if ever needed.

**The `MySQL80` Windows service (WordPress's database) was also stopped and
set to `Manual` startup.** Checked first (read-only `SHOW DATABASES`) that
nothing else used this instance — only the built-in system schemas
(`information_schema`, `mysql`, `performance_schema`, `sys`) plus
`wordpress` existed, so nothing unrelated was at risk. Reversible the same
way: `Set-Service MySQL80 -StartupType Automatic; Start-Service MySQL80`.

**PHP has no separate service to stop** — checked (no matching Windows
service, no running `php`/`php-cgi` process) and confirmed it was never
more than IIS's FastCGI module spawning `php-cgi.exe` on demand per
request. With `W3SVC` already stopped, nothing invokes PHP anymore; there
was nothing further to disable.

At this point everything tied to the old WordPress stack on this box —
both IIS sites, the `W3SVC` service, and the `MySQL80` service — is stopped
and set to `Manual` startup (won't come back on reboot), with all files,
the database, and IIS config left fully intact on disk for a possible
future full decommission (deleting `D:\wordpress` and dropping the
`wordpress` database) whenever that's actually wanted.

**Jetpack's Downtime Monitor module was deactivated** (`wp jetpack module
deactivate monitor`, via WP-CLI at `D:\OneDrive\Desktop\wp-cli\wp-cli.phar`
— works directly against the DB/filesystem, no need for the site to be
"up" or for a wp-admin login) so it stops sending "your site is down"
alerts now that the WordPress site is intentionally, permanently offline.

**Incident during cutover**: a pre-existing hourly scheduled task
("Cloudflare IPv4 DNS Updater", `D:\code\cloudflare-ip-updater\`) — a
legitimate DDNS updater for tracking this network's Comcast dynamic IP —
reverted the DNS change back to `73.198.117.200` about an hour after the
original cutover, then restarted `W3SVC` (its own designed behavior,
unaware the domain had moved to Vercel). This caused a real, if brief,
outage for external visitors, not just a local artifact — caught via an
external check (Anthropic's own WebFetch infrastructure hit
`ECONNREFUSED 73.198.117.200`, not just a local-machine timeout). Fixed by
re-pointing the DNS record back to `76.76.21.21`, then removing the
scheduled task and deleting `D:\code\cloudflare-ip-updater\` entirely
(script, config — which held a separate Cloudflare API token and a Gmail
app password, both now gone from disk — state, and logs) per explicit
instruction, since this domain no longer lives on this network's dynamic
IP at all. If you want to be thorough, that embedded Cloudflare API token
was never revoked via Cloudflare's dashboard (only deleted locally) —
low risk since it was narrowly scoped to this one automation, but worth
knowing.

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
3. ~~No Vercel project created yet.~~ Done this session — `vercel link` created
   project `digitalfigments` (org/team `andylacroces-projects`) and connected
   the GitHub repo, then `vercel deploy` shipped it live at
   **<https://digitalfigments.vercel.app>**. Note: Vercel auto-assigns a brand
   new project's *first* deployment to "production" internally (its own
   platform quirk, not something `--prod` triggered) — this only affects that
   `.vercel.app` alias since no custom domain has ever been attached to the
   project (`domains: []`); digitalfigments.com and the WordPress box are
   untouched. If you don't see the Vercel app listed under the repo on
   GitHub's side, the Vercel GitHub App may be installed with "only select
   repositories" access — add this repo via GitHub → Settings → Applications
   → Vercel → Configure.
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
7. ~~Git LFS is enabled...~~ **Removed entirely** (see "Session updates, part
   5"). Vercel's git-triggered auto-deploys never fetched LFS content at all
   (plain `git clone`, no smudge step) — every audio/video file served a
   ~130-byte pointer instead of real content in production, even though my
   very first manual `vercel deploy` (a local-file upload, not a git clone)
   happened to work and briefly created a false sense that LFS was fine.
   All `*.mp3 .m4a .wav .mov .mid .mp4 .zip` content is now committed as
   regular git blobs — even the largest file (the a2z zip, ~97.09 MiB) is
   safely under GitHub's 100 MiB hard limit for non-LFS files.
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

## Session updates, part 3 (2026-09-06, DRY pass + SEO + first deployment)

- **DRY pass**: extracted `formatDate()` (`src/lib/format.ts`, was duplicated
  3x), a shared `getGenericPages()`/`getBlogPages()` pair (`src/lib/pages.ts`,
  replaces near-identical `getStaticPaths` filtering in `[slug].astro` and
  `blog/[slug].astro`), and CSS utility classes (`.plain-list`,
  `.divided-list-item`, `.kicker`) replacing several copy-pasted `<style>`
  blocks across `[...page].astro`, `posts/[slug].astro`, `blog/index.astro`,
  `covers.astro`.
- **Fixed a real spacing bug**: the home feed's `.post` items had
  `margin-bottom` *and* `padding-bottom` stacking with each post's own
  trailing-element margin (an image's `margin-bottom` sitting inside the next
  post's padding), producing ~120px gaps between single-image posts. Tightened
  the list rhythm and added a rule zeroing a post's last child's own margin.
- **Dynamic back links**: every content page (`posts/[slug]`, `[slug]`,
  `blog/[slug]`, `blog/index`, `covers`) now has a `BackLink` component that
  uses `history.back()` when the visit came from elsewhere on this same site
  (checked via `document.referrer`, not just `history.length` — an earlier
  version of this using only `history.length > 1` had a false positive in
  automated testing), falling back to a fixed href otherwise.
- **`/blog` section**: `obamas-audacity` moved from `/obamas-audacity/` to
  `/blog/obamas-audacity/` (old URL now 404s), plus a new `/blog/` index
  listing entries by date descending. Added an optional `date` field to the
  `pages` schema for this (only `obamas-audacity` has one so far — looked up
  its real WP publish date, 2026-02-07, via a **read-only** SQL query against
  the live WordPress database, since the page export JSON didn't capture
  dates. No writes were made to the WP database or site.).
- **`src/site.config.ts`**: single source of truth for which routes are
  "unexposed" (`/blog`, `/music`) — drives `robots.txt` (now generated
  dynamically at `src/pages/robots.txt.ts` instead of a static file), each
  page's `<meta name="robots">` tag, and the `/blog` vs generic `/[slug]`
  route split, so those three can't drift out of sync.
- **SEO pass**: meta description, Open Graph + Twitter Card tags, canonical
  URLs, and `sitemap.xml` (via `@astrojs/sitemap`, filtered to exclude the
  unexposed routes) added to every page (`Layout.astro`). Per-post OG image
  is best-effort — pulled from the first markdown image in the post's raw
  MDX body (`src/lib/og.ts`); posts/pages with no image just omit the image
  tags (valid, falls back to a plain "summary" Twitter card).
- Theme-toggle icon convention flipped: the icon shown now represents the
  mode a click switches *to* (moon while in light mode, sun while in dark
  mode), not the current mode — matches the more common convention.
- **`npm install @astrojs/sitemap`** surfaced 3 pre-existing high-severity
  `npm audit` findings in `@astrojs/vercel`'s dependency chain
  (`path-to-regexp` ReDoS, via `@vercel/routing-utils`) — pre-existing, not
  introduced this session, and the only fix is a semver-major bump of
  `@astrojs/vercel` to 8.0.4, which wasn't attempted (untested, out of scope
  for this session). Worth a dedicated pass before cutover.
- **First deployment**: `vercel link` created the Vercel project
  `digitalfigments` and connected the GitHub repo; `vercel deploy` shipped it
  live at **<https://digitalfigments.vercel.app>** (confirmed working: home
  page, `/blog/`, `/robots.txt`, `/sitemap-index.xml`, and — the thing
  flagged as a risk since the start — a Git-LFS-tracked audio file serving
  its real ~4.3MB content, not a pointer file, with zero extra Vercel
  configuration needed). GitHub's Deployments API confirms the
  `vercel[bot]` integration is genuinely posting deployment statuses against
  commits (there can be a short UI propagation delay before it's visible on
  github.com). **No custom domain is attached to the project and no DNS was
  touched** — digitalfigments.com and the WordPress box are completely
  unaffected by this.

## Session updates, part 4 (2026-09-06, security fixes + DNS cutover)

- **Fixed the npm audit ReDoS finding** without a risky major-version
  downgrade: added `"overrides": { "path-to-regexp": "6.3.0" }` to
  `package.json`. The vulnerable version was pulled in transitively even by
  the latest `@astrojs/vercel` (11.0.10) — npm audit's suggested fix (8.0.4)
  was actually an older major incompatible with this project's Astro 7.
  Verified `npm audit` → 0 vulnerabilities and the build still succeeds.
- **Deleted `job-stuff` page** (user decision — dead chatbot embed, no real
  content).
- **Added security headers** in `vercel.json`: `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS
  (`max-age=31536000; includeSubDomains` — **no `preload`**, since that's a
  much harder commitment to reverse and wasn't asked for), `X-XSS-Protection:
  0` (modern guidance — rely on CSP, not the deprecated legacy filter), and a
  CSP (`default-src 'self'`, `unsafe-inline` for script/style — permissive
  enough not to break Keystatic's bundled admin UI, which was verified
  working against the deployed CSP with zero console errors).
- **Lightbox fix**: clicking the enlarged image itself now closes it too
  (previously only the backdrop or the × button did).
- **First Vercel auto-deploys confirmed**: pushing to `main` triggers a
  production deployment via the GitHub↔Vercel integration automatically —
  independent of any manual `vercel deploy` CLI call.
- **Domain attached**: `vercel domains add digitalfigments.com` — Vercel's
  required record: `A digitalfigments.com 76.76.21.21`.
- **DNS cutover executed** (explicit, repeated user confirmation — including
  a final direct yes/no check right before the write) via the Cloudflare
  API, using a `CF_API_TOKEN` already present in this machine's environment.
  Read the zone first (only 2 records existed: apex + www A records at
  `73.198.117.200`, both proxied, no MX/email records to worry about) before
  changing anything. **Gotcha hit and fixed**: updating the IP while leaving
  Cloudflare's proxy (orange cloud) on produced a `525` SSL handshake error —
  Vercel's automatic domain verification/cert issuance checks the *public*
  DNS answer, which proxied mode replaces with Cloudflare's own edge IPs, so
  Vercel never saw the real record and never issued a certificate. Fixed by
  switching both records to DNS-only (`proxied: false`), letting Vercel's own
  edge network terminate TLS directly — confirmed working (HTTP 200 on both
  apex and `www`, correct page content, `robots.txt` intact) within about 30
  seconds of propagation.
- **URL redirects from the old WP `Redirection` plugin were explicitly not
  built** — user accepted the tradeoff of losing some traffic/links rather
  than build them before cutover.

## Session updates, part 5 (2026-09-06, Git LFS root-caused and removed)

- **Root-caused and fixed "a lot of the music players aren't working."**
  Every audio/video URL on the live site was serving a ~130-byte Git LFS
  pointer file instead of the real content. Diagnosis: a fresh, independent
  `git clone` (my own credentials) pulled all LFS objects fine — ruling out
  a GitHub-side storage/bandwidth problem — but Vercel's build logs for a
  normal GitHub-triggered deploy showed a plain `Cloning github.com/...`
  step with no LFS filtering/smudge output at all. The very first deployment
  this session *did* have real audio content, which briefly looked like
  confirmation LFS was working — but that deployment came from a manual
  `vercel deploy` CLI call, which uploads the local working directory
  directly (bypassing git and LFS entirely), not from a git clone. Every
  deployment since (all git-triggered, via the GitHub integration) has
  silently served pointer files.
- **Fix**: removed Git LFS entirely rather than hunt for an undocumented
  Vercel project toggle — deleted `.gitattributes`, ran
  `git add --renormalize .` to convert the 87 previously-LFS-tracked files
  back to regular git blobs, and pushed (~400MB). Confirmed on
  digitalfigments.com: `angie.mp3` (9.7MB), `JohnnyAppleseed.mp3` (4.3MB),
  and `andy-lacroce-a2z.zip` (97.09 MiB, the largest file — still safely
  under GitHub's 100 MiB hard limit for non-LFS files) all now serve their
  real content.
- Worth knowing for later: any *new* binary file Keystatic writes through
  GitHub's Contents API (once GitHub storage mode is live) will also land as
  a regular blob regardless of file extension — the GitHub API doesn't run
  git's LFS clean filter, so this isn't a regression risk going forward,
  just worth knowing the repo will grow by the full size of whatever's
  uploaded rather than being deduplicated/stored externally the way LFS did.

## Session updates, part 6 (2026-09-06, Keystatic GitHub storage completed)

- **Keystatic switched to `github` storage mode and verified end to end.**
  `keystatic.config.ts` now points at `{ owner: 'andylacroce', repo:
  'digitalfigments' }`. Set on Vercel (production env): `KEYSTATIC_GITHUB_CLIENT_ID`,
  `KEYSTATIC_GITHUB_CLIENT_SECRET` (from the GitHub OAuth App the user
  created — callback `https://digitalfigments.com/api/keystatic/github/oauth/callback`),
  and a freshly generated `KEYSTATIC_SECRET`. Confirmed working: `/keystatic`
  shows "Log in with GitHub", and following that link redirects to GitHub's
  real OAuth authorize page with the correct `client_id` and `redirect_uri`.
  Completing the actual login (and thus a real save-from-the-deployed-site
  test) needs the user's own GitHub session — see the README's "Editing
  content" section for how to actually use it day to day.
- This closes out the single most-flagged remaining item from the top of
  this file — editing content from the deployed site (phone or otherwise)
  now works the same way posting from the WordPress app used to.
- ~~`npm run dev` locally no longer authenticates against GitHub storage~~ —
  fixed right after: `keystatic.config.ts` now picks `local` storage under
  `import.meta.env.DEV` and `github` storage otherwise, so `npm run dev` →
  `/keystatic` works exactly like it did before this switch (no login,
  reads/writes files on disk directly), while the deployed site still uses
  GitHub storage. Verified both modes with a real build + a local dev check.

## Session updates, part 7 (2026-09-06, WordPress/IIS sites stopped)

- **Both IIS sites on the local box were stopped**, with `serverAutoStart`
  set to `false` on each: "Digital Figments" (`D:\wordpress`, the site this
  migration replaces) and "andylacroce.com" (`D:\andylacroce.com`, unrelated
  to this migration). Required Administrator privileges — the session
  didn't have them initially, the user re-elevated it, then this proceeded.
- The second site wasn't stopped on assumption — its Cloudflare DNS was
  checked first (read-only) and confirmed already pointing entirely at
  Vercel (apex `A` → `76.76.21.21`, `www` CNAME → `cname.vercel-dns.com`),
  meaning this local IIS site was receiving zero real traffic already.
  That zone's other records (MX/email, an `emby` Cloudflare Tunnel
  subdomain) were left untouched — read-only check only, nothing modified
  there.
- Nothing was deleted on the IIS box for either site — files, databases,
  and IIS site config are all still intact on disk. Either can be restarted
  anytime via `appcmd start site "<name>"` (as Administrator).

## Session updates, part 8 (2026-09-06, www TLS cert fix)

- **`/keystatic` (and everything else) was broken on `www.digitalfigments.com`**
  — TLS failed before any request-level routing even happened. Root cause:
  `vercel domains add digitalfigments.com digitalfigments` only registers
  the apex with the project; `www` had a correct DNS record pointing at
  Vercel, but was never separately added as a project domain, so Vercel had
  no certificate for that exact hostname and served the apex's cert instead
  (`CN=digitalfigments.com`, confirmed by connecting directly and reading
  back the presented certificate) — a plain TLS/SNI mismatch, not anything
  Keystatic- or routing-specific. Fixed with `vercel domains add
  www.digitalfigments.com digitalfigments`; Vercel issued a matching
  certificate within about 30 seconds. Confirmed: `www.digitalfigments.com/`
  and `/keystatic` both return 200 now.
- Lesson for next time a domain gets added to a Vercel project: **add every
  hostname you actually serve traffic on explicitly** (apex and `www`
  separately) — don't assume adding one implies the other.

## Session updates, part 9 (2026-09-06, CSP + wrong GitHub app type, twice-fixed)

- **CSP was blocking Keystatic's post-login GitHub calls entirely.**
  `connect-src 'self'` in `vercel.json` blocked the browser-side
  GraphQL/REST calls Keystatic makes to `api.github.com` after a
  successful login — every read/write would have failed silently from the
  user's perspective (visible only as browser console CSP violations).
  Fixed by adding `https://api.github.com` to `connect-src`,
  `https://avatars.githubusercontent.com` to `img-src` (user avatar), and
  `https://vercel.live` to `script-src`/`connect-src` (Vercel's own toolbar
  feedback widget, unrelated but also blocked).
- **Bigger mistake: the wrong GitHub integration type entirely.** GitHub
  has two distinct things confusingly both called "apps" — a plain **OAuth
  App** (simple client_id/secret, whatever scope you request) and a
  **GitHub App** (the installable kind, granted access per-repo with
  granular permissions). Part 6 above walked through creating an OAuth
  App — Keystatic's `github` storage mode actually requires a GitHub App.
  The OAuth App's login flow *looked* like it worked (GitHub's authorize
  page redirect is visually identical for both types), but after actually
  completing login, Keystatic's repo-access check — built around a GitHub
  App's installation model — failed with "Repo not found... you haven't
  added the GitHub app to it", which is really GitHub returning "not
  found" for a private repo the OAuth token didn't have properly-scoped
  access to.
- **Fix**: removed the OAuth App's `KEYSTATIC_GITHUB_CLIENT_ID`/`_SECRET`
  from Vercel, created a proper **GitHub App** instead (`digital-figments-
  keystatic`) with the same callback URL, "Request user authorization
  (OAuth) during installation" checked, webhook unchecked, Repository
  permissions → Contents: Read and write, installed specifically on
  `andylacroce/digitalfigments`. Set `KEYSTATIC_GITHUB_CLIENT_ID`,
  `KEYSTATIC_GITHUB_CLIENT_SECRET` (both from the GitHub App, not the old
  OAuth App), and `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG=digital-figments-
  keystatic` (lets Astro/Keystatic generate an "install this app" link).
  `KEYSTATIC_SECRET` didn't need to change — it's just a session-encryption
  key, unrelated to which app type is used.
- The original OAuth App (`Ov23liamyuofj7qpb03A`) was never deleted on
  GitHub's side — only its env vars were removed from Vercel. Since its
  secret passed through this conversation, deleting it entirely at
  github.com/settings/developers is worth doing for cleanliness/hygiene,
  though it's inert now (nothing references it).
- The GitHub App's **private key** (RSA, for server-to-server JWT auth) was
  also briefly shared in conversation by mistake — Keystatic's OAuth-based
  flow doesn't use it at all, so it was never used or stored anywhere, but
  regenerating it on the GitHub App's settings page is a reasonable hygiene
  step if desired.

## Session updates, part 10 (2026-09-07, Keystatic "Missing component" errors)

- **Opening `demos`, `a2z`, or any post with a `<video>` tag in Keystatic
  threw "Missing component definition for X"** (X = `audio`, `video`,
  `figcaption`). Cause: these pages/posts embed raw HTML tags straight from
  the original WordPress content (`<audio controls src="...">`,
  `<video controls src="...">`, and — only in `a2z.mdx` — `<figcaption>`
  for song captions), and Keystatic's MDX editor requires an explicit
  `components` definition for any non-standard-markdown element before it
  can open/validate an entry containing one.
- **Fix**: registered `audio` and `video` as MDX components in
  `keystatic.config.ts` (via `@keystatic/core/content-components`'
  `block()`), wired into both the `posts` and `pages` collections' `mdx()`
  fields.
- **`figcaption` needed a different fix, not just a component
  definition.** `a2z.mdx` had `</audio><figcaption>caption</figcaption>`
  crammed on one line with no blank-line separation — MDX's parser
  classifies that as *inline text content* within a paragraph rather than
  a block-level element, which doesn't match a `block()`-kind component
  registration (error changed to "mdxJsxTextElement has unexpected
  children" once `audio`/`video` were fixed, even after adding blank
  lines around the tags). Since `figcaption` had no CSS styling depending
  on the tag anyway, the simpler and more robust fix was converting all 26
  `<figcaption>...</figcaption>` captions in `a2z.mdx` to plain italic
  markdown text (`*caption*`) instead of fighting MDX's inline-vs-block
  classification with a custom component.
- Verified in Keystatic (local storage, `npm run dev`): `demos`, `a2z`,
  and `tranquility` (a post with an embedded video) all open with zero
  errors now.

## Session updates, part 11 (2026-09-07, unified covers/demos/a2z into one collection)

- **Unified `/covers/`, `/demos/`, `/a2z/` into a single `tracks` content
  collection** (replacing `covers` + the freeform `demos.mdx`/`a2z.mdx`
  pages), rendered through one shared `TrackList.astro` component, so all
  three pages are now visually and structurally identical — title → artist
  → date above the player, then a consistent divider between entries.
  Previously each page had its own ad-hoc formatting (`demos`/`a2z` were
  raw MDX with markdown `* * *` horizontal rules between entries and
  captions in inconsistent positions; `covers` was already a structured
  JSON collection with title/artist/date above the player).
- Schema: `tracks/*.json` — `song`, `section` (`covers`/`demos`/`a2z`,
  determines which page it appears on and sorts independently within that
  section), `artist` (blank for demos — those are originals), `date`
  (free text), `media` (audio file or embed URL, same conditional field as
  before), `order`.
- **Migration**: the 32 existing `covers/*.json` files moved to
  `tracks/*.json` with `section: "covers"` added. `demos.mdx`'s 7 tracks
  and `a2z.mdx`'s 26 tracks were parsed out of their raw MDX/HTML and
  converted to the same JSON shape. For `a2z`, the original captions were
  lowercase `"artist - song"` text (e.g. `"denver, john - country
  roads"`) — split into proper `artist`/`song` fields, with 6 "Lastname,
  Firstname" artist credits reordered to "Firstname Lastname" and casing
  cleaned up by hand (not naive title-casing, to avoid mangling the one
  genuine acronym, EWBCST, or other band-name conventions like "CCR" /
  "XTC" / "U2").
- `src/pages/covers.astro`, `demos.astro`, `a2z.astro` each just fetch
  their section of `tracks` and hand it to `<TrackList>`; `a2z.astro` also
  keeps its page-specific intro (download-all `.zip` link, header image)
  as hardcoded markup, since that's framing for the page, not a track.
- `content.config.ts` / `keystatic.config.ts`: `covers` collection renamed
  and reshaped to `tracks` (added `section` field, kept everything else).
  Verified in Keystatic: the new collection loads with all 65 entries;
  all three pages render identically structured lists with zero errors.
- Old `demos.mdx`/`a2z.mdx` deleted from the `pages` collection (they're
  now full Astro routes backed by `tracks`, not freeform content pages) —
  this also fully retires the `figcaption`-in-MDX problem from part 10,
  since a2z no longer has any raw HTML in its content at all.
- **Separately**: iterated on the photo gallery grid a few times, ending on
  a masonry-style column layout. First pass switched `auto-fill` to
  `auto-fit` so a 2-image post's tiles stretched to fill the row instead
  of sitting small with wasted space alongside them — but that made
  *larger* galleries look uneven (a partial last row stretched wider than
  the full rows above it), and forcing images into fixed-size boxes
  (`object-fit: cover`/`contain`) to fix that meant either cropping photos
  or letterboxing them, both rejected. Landed on: `src/layouts/Layout.astro`
  computes a column count from the post's available width and sets it as
  `--gallery-cols`; `src/styles/global.css`'s `.gallery` uses CSS
  multi-column layout (`columns: var(--gallery-cols, 3) 140px`) instead of
  grid, so each photo keeps its own natural aspect ratio (`width: 100%;
  height: auto`, no `object-fit` at all) and just flows into whichever
  column is currently shortest — no crop, no letterboxing, no forced grid
  cell shape.
- `/music` rewritten from a plain text/link page into a small animated
  3-tile icon menu (inline SVGs — eighth note / vinyl record / cassette —
  with a hover lift + icon rotate + staggered entrance), and the a2z
  project is now labeled "a2z Covers Project" consistently across
  `music.astro`'s tile and `a2z.astro`'s title/h1/description.

## Explicitly NOT done

- Actually decommissioning the WordPress/IIS box (removing the sites,
  files, database, freeing the disk space) — both sites are stopped and
  won't restart on their own, but everything is still present on disk.
