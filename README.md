# digitalfigments.com

A personal photo/video blog and music archive, live at
**<https://digitalfigments.com>**. Built with [Astro](https://astro.build)
(static site) and [Keystatic](https://keystatic.com) (git-backed CMS),
hosted on Vercel. All content is plain files in this repo — no database, no
server.

## License

Code is MIT-licensed (see [LICENSE](LICENSE)). Content (posts, photos, audio, video) is all rights reserved, and covers belong to their original owners.

## How it fits together

```text
Keystatic (/keystatic)  ──commit──▶  GitHub (main)  ──push──▶  Vercel  ──▶  digitalfigments.com
                                          │
                                          └─ assets/media/ changes ─▶ GitHub Action ─▶ Cloudflare R2
                                                                       (media.digitalfigments.com)
```

- **Content** (posts, tracks, pages) lives in `src/content/`. Photos live next
  to their posts and go through Astro's image optimization.
- **Audio/video/zip** live in `assets/media/` and are served from a Cloudflare
  R2 bucket, not from Vercel (see [Media assets](#media-assets)).
- **Every push to `main`** deploys to production, including commits made from
  Keystatic.

## What it depends on

The repo builds and runs the site's code on its own, but a working deployment
relies on these outside services:

| Service | Used for | If it's down or missing |
| :--- | :--- | :--- |
| **GitHub** | Source of truth, Actions (CI, media sync), and the GitHub App Keystatic logs in through | No editing or deploys; the live site keeps serving |
| **Vercel** | Builds and hosts the site; every push to `main` deploys | No new deploys; the last one keeps serving |
| **Cloudflare R2** | Serves all audio, video, and zip files at `media.digitalfigments.com` | Pages load, but every audio/video file 404s |
| **Cloudflare DNS** | `digitalfigments.com` and `media.` records | Site unreachable |
| **YouTube** | Video embeds on some covers/demos pages | Those embeds don't play |

**R2 is the one to know about.** Media files are committed in `assets/media/`
as the source of truth, but the site never serves them from git or Vercel.
[`mediaUrl()`](src/lib/media.ts) rewrites each `/media/...` path to the R2
domain using the `PUBLIC_MEDIA_BASE_URL` build variable. Without that variable
a production build produces relative `/media/...` links that 404. Local
development needs no R2 access; see [Media assets](#media-assets).

Configuration a deployment needs:

- **Vercel environment variables:** `PUBLIC_MEDIA_BASE_URL` and the Keystatic
  GitHub App credentials (`KEYSTATIC_*`).
- **GitHub Actions secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
  `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (used by the media
  sync workflow).
- **One-time local login:** `npx wrangler login` so the pre-commit hook can
  upload media to R2.

## Quick start

```sh
npm install
npm run dev      # http://localhost:4321, Keystatic admin at /keystatic (local disk, no login)
npm run ci       # the full check — lint, markdown lint, typecheck, tests, build, e2e
```

Requires Node 24. For a local production preview, `npm run build` then
`npx serve dist/client` (`astro preview` doesn't work here).

## Editing content

**Day to day, use Keystatic at <https://digitalfigments.com/keystatic>** —
log in with GitHub. Every save commits to `main` and goes live in a few
minutes. You can also edit the files under `src/content/` by hand and push.

### Posts — the photo/video feed on the home page

Posts → Add: a title (becomes the URL slug), a date, and a body — usually one
image or video/audio, but the editor supports full rich text/Markdown. Posts
with 2+ standalone images are tiled into a grid with a click-to-enlarge
lightbox automatically. Files: `src/content/posts/*.mdx`.

### Tracks — `/covers/`, `/demos/`, `/a2z/`

One collection, one shared `TrackList` layout. Tracks → Add: song title,
**Section** (Covers, Demos, or a2z — this routes it to the right page),
original artist (blank for Demos), a free-text date, an **Audio file** upload
or **YouTube/video embed** URL, and a **sort order** (lower appears first,
independently per section). Files: `src/content/tracks/*.json`.

The `/a2z/` intro (download-all zip, header image) is hardcoded in
`src/pages/a2z.astro`; it isn't a track.

### Pages — static pages

`/privacy-policy/`, `/music/`, and similar. Files: `src/content/pages/*.mdx`.

## Media assets

Audio, video, and the a2z zip live flat in `assets/media/`. They're
git-tracked but deliberately **not** under `public/`: Vercel keeps a full copy
of `public/` in every retained deployment, and these files (hundreds of MB)
blew through the free storage quota that way. Instead they're mirrored to the
Cloudflare R2 bucket `digitalfigments-media`, served at
`media.digitalfigments.com`, and resolved at render time by `mediaUrl()`
([src/lib/media.ts](src/lib/media.ts)) using the `PUBLIC_MEDIA_BASE_URL` env
var. Keystatic's audio uploads land in the same directory.

How files get to R2 and how deploys are ordered:

- **Local commits** touching `assets/media/` run
  [scripts/sync-media.mjs](scripts/sync-media.mjs) from `.husky/pre-commit`,
  which uploads only changed files (content-hash diffed against the tracked
  `assets/.media-manifest.json`) and folds the manifest update into the same
  commit. Needs `npx wrangler login` once.
- **Keystatic commits** bypass local hooks, so
  `.github/workflows/sync-media.yml` does the same on any push to `main`
  touching `assets/media/`, then commits the updated manifest. Needs
  `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets.
- **Deploy ordering.** `vercel.json`'s `ignoreCommand` tells Vercel to skip
  its own auto-deploy for commits touching `assets/media`, so a page can't go
  live before its file is on R2. The workflow's last step deploys via the
  Vercel CLI instead (`vercel pull`/`build`/`deploy --prebuilt --prod`; needs
  `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets). A deploy hook
  wouldn't work — it goes through the same `ignoreCommand` gate and gets
  skipped too.
- **Local dev never touches R2.** A dev-only middleware in `astro.config.mjs`
  serves `assets/media/` from disk, and `mediaUrl()` leaves paths relative
  when `import.meta.env.DEV` is true.
- `npm run sync-media -- --all` forces a full rescan if the manifest drifts.

## Site sections

- **Public and indexed:** home (`/`, paginated), `/covers/`, `/demos/`, `/a2z/`.
- **Live but unlinked and `noindex`:** `/music/`.
- `src/site.config.ts` is the single source of truth for these "unexposed"
  routes: it drives `robots.txt`, each page's `noindex` tag, and the sitemap
  filter.
- `/old-site/` is a legacy 2000s static band site preserved as-is in
  `public/old-site/`.
- Old flat post links (`/<slug>/`) redirect to `/posts/<slug>/`; the
  closed list is in `astro.config.mjs`.

## Project layout

```text
src/
├── content/           posts/ (.mdx), tracks/ (.json), pages/ (.mdx)
├── content.config.ts  Astro content-collection schemas
├── site.config.ts     unexposed routes (noindex list)
├── lib/               date formatting, OG-image lookup, media URLs, page helpers
├── components/        BackLink, Pagination, TrackList
├── layouts/Layout.astro   shell: nav, theme toggle, lightbox, SEO meta
├── styles/global.css  all site CSS (see note below)
└── pages/             home feed, posts/, covers/demos/a2z, [slug], robots.txt.ts
keystatic.config.ts    CMS schema (GitHub storage in prod, local on disk in dev)
scripts/               run-ci.mjs, sync-media.mjs, postprocess-images.mjs
e2e/                   Playwright tests
assets/media/          audio/video/zip, mirrored to R2
vercel.json            security headers, cache headers, ignoreCommand
```

All site CSS lives in the plain `global.css` rather than component `<style>`
blocks: Astro scopes component styles, and scoped styles never reach content
rendered through `<Content />`/`<slot />` (every post/page body).

`keystatic.config.ts` and `src/content.config.ts` describe the same three
collections and are kept in sync by hand.

## Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Dev server; Keystatic uses local disk storage (the GitHub App's callback only matches the production domain) |
| `npm run build` | Build to `dist/` and post-process images |
| `npm run lint` | ESLint |
| `npm run lint:md` | markdownlint over every `.md` file |
| `npm run typecheck` | `astro check` |
| `npm run test` / `test:coverage` | Vitest unit tests / with the 90% coverage gate |
| `npm run test:e2e` | Playwright (gallery, lightbox, theme toggle, back-to-top); builds first |
| `npm run ci` | All of the above in order, stopping at the first failure — what GitHub Actions runs |
| `npm run sync-media` | Mirror `assets/media` to R2 (`-- --all` for a full rescan) |

## Testing and CI

`npm run ci` ([.github/workflows/ci.yml](.github/workflows/ci.yml)) is the
single definition of "done." A pre-commit hook runs `lint-staged`
(`secretlint` + ESLint on staged files — fast, not a replacement for `ci`)
and the media sync above. Dependabot opens daily grouped PRs for npm and
Actions. GitHub secret scanning with push protection covers the repo; `secretlint`
is the fast local check.

## Deployment and infrastructure

- **Vercel** project `digitalfigments` (team `andylacroces-projects`),
  connected to this repo. Deployment retention is 1 day to keep storage down.
  `www.digitalfigments.com` 301-redirects to the apex (a per-domain setting in
  the Vercel dashboard, not expressible in `vercel.json`).
- **Cloudflare** hosts DNS (nameservers `bill.ns.cloudflare.com` /
  `val.ns.cloudflare.com`, `A` record to Vercel) and the R2 bucket. Manage
  records, including `media.` and any mail/verification `TXT`, in Cloudflare,
  not Vercel. Keep the apex record DNS-only (not proxied) — Vercel's
  certificate issuance breaks behind a proxy.
- **Keystatic** authenticates through a GitHub App scoped to this repo
  (contents read/write). Its CSP allowlist in `vercel.json` must include the
  GitHub hosts it calls.
- The site prerenders to static HTML; the Vercel adapter is installed only
  because Keystatic's admin UI needs server-rendered routes.
