# digitalfigments.com

Astro + Keystatic site, live at **https://digitalfigments.com**. Replaced a
self-hosted WordPress/IIS install — see [MIGRATION.md](./MIGRATION.md) for
the full migration history, decisions, and rough edges.

## Editing content

**Day to day, use Keystatic at https://digitalfigments.com/keystatic** — log
in with GitHub when prompted. Every save commits directly to the `main`
branch of the `andylacroce/digitalfigments` repo, which auto-deploys via
Vercel's GitHub integration within about a minute. This is what replaced
posting from the WordPress phone app.

There are three collections:

### Posts (the photo/video blog feed)

- **Add**: Posts → Add. Fill in a title (the URL slug is generated from it),
  a date, and the content — usually a single image or video/audio, but the
  editor supports a full rich-text/Markdown body too. Save.
- **Edit**: click into any post from the Posts list, change whatever, Save.
- **Delete**: open the post, use the delete option in its item view.
- If a post has 2 or more standalone images, the site automatically tiles
  them into a photo grid with a click-to-enlarge lightbox — no extra field
  or setup needed, it's detected client-side.
- There's no tags/category field anymore (removed — the old WordPress
  images/video/music/gif/text taxonomy wasn't adding value).

### Covers (the song-cover archive at `/covers/`)

- **Add**: Covers → Add. Fill in song title, original artist, a free-text
  date (some originals only have an approximate year), pick **Audio file**
  (upload an mp3/m4a/wav) or **YouTube / video embed** (paste a URL), and a
  **sort order** (lower numbers appear first on the page).
- Order isn't automatic — if you want a new entry to appear in a specific
  spot in the list, set its order number relative to the existing entries.

### Static pages

- Things like `/music/`, `/demos/`, `/a2z/`, `/privacy-policy/`. Same
  add/edit/delete flow. Most don't need a date — the optional **Date** field
  only matters for pages routed under `/blog/` (see below).

### Editing content by hand instead (fallback)

Keystatic just reads/writes plain files — you can also edit
`src/content/posts/*.mdx`, `src/content/covers/*.json`, or
`src/content/pages/*.mdx` directly and `git push`. Same result, useful for
bulk edits or anything easier to script than click through.

## Site sections and what's exposed

- **Home (`/`, paginated)** and **`/covers/`** — linked from the header/nav,
  fully public, indexed by search engines.
- **`/music/`** — a static page, intentionally not linked from anywhere, but
  still live and reachable by direct URL. Excluded from search indexing
  (`robots.txt` + a per-page `noindex` tag).
- **`/blog/`** — a small second content area for standalone essay-like
  writing that doesn't fit the photo-blog framing (currently just
  `obamas-audacity`). Also unlinked and excluded from indexing. Which
  `pages` entries live under `/blog/` instead of the generic `/[slug]/`
  route is controlled by `src/site.config.ts` (`blog.pageSlugs`) — add a
  slug there to move a page into this section.
- `src/site.config.ts` is the single source of truth for "unexposed"
  routes — it drives `robots.txt` (`src/pages/robots.txt.ts`), each
  affected page's `noindex` meta tag, and the `/blog` vs `/[slug]` split,
  so those three can't drift out of sync with each other.

## Structure

```
src/
├── content/
│   ├── posts/    photo/video blog posts, .mdx (title, date)
│   ├── covers/   cover-song archive entries, .json
│   └── pages/    static pages (music, demos, a2z, blog essays, etc.), .mdx
├── content.config.ts   Astro content-collection schemas
├── site.config.ts       "unexposed" routes + /blog slug list (see above)
├── lib/                 formatDate, OG-image extraction, pages-collection helpers
├── components/          BackLink (dynamic "back" button used on every content page)
├── styles/global.css    all site CSS (plain/unscoped — see note below)
├── layouts/Layout.astro shared shell: nav, theme toggle, lightbox, SEO meta tags
└── pages/
    ├── [...page].astro    paginated home feed
    ├── posts/[slug].astro single post
    ├── covers.astro        covers archive
    ├── [slug].astro        generic static pages
    ├── blog/                index + [slug] for the /blog section
    └── robots.txt.ts        generated from site.config.ts

keystatic.config.ts   CMS schema — storage: github, repo andylacroce/digitalfigments
scripts/migrate-wp-content.mjs   one-time WP → Astro converter, re-runnable
vercel.json            security headers, media cache headers
public/media/          post/page media
public/covers-audio/   Keystatic-uploaded cover audio
public/old-site/       legacy 2000s static band site, preserved as-is
```

Note: `Layout.astro`'s own `<style>` block only reaches elements written
literally in that file — Astro scopes component styles, and content
rendered via `<Content />`/`<slot />` (every post/page body) doesn't get
that scope applied. That's why all site CSS lives in the plain, unscoped
`src/styles/global.css` instead.

## Commands

| Command           | Action                                  |
| :----------------- | :--------------------------------------- |
| `npm install`       | Install dependencies                     |
| `npm run dev`       | Local dev server (Keystatic admin at `/keystatic` won't complete GitHub login locally — its OAuth callback only matches digitalfigments.com; see MIGRATION.md) |
| `npm run build`     | Build to `./dist/`                       |
| `npm run preview`   | Preview the production build locally     |

## Deployment

Vercel project `digitalfigments` (team `andylacroces-projects`), connected
to this GitHub repo — every push to `main` auto-deploys to production.
`vercel.json` holds security headers and long-lived cache headers for media
paths. No manual deploy step needed for normal content/code changes.
