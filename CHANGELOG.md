# Changelog

Notable changes to [digitalfigments.com](https://digitalfigments.com), a
personal photo and video site built with Astro and Keystatic. Dates are
`YYYY-MM-DD`, newest first. See the [README](README.md) for how the site is
put together.

The commit history before 2026-09-30 was squashed when this repo went public.
This file is the record of what came before.

## 2026-09-30

### Added

- Pagination at the top of every page.
- MIT license for the code. Posts, photos, audio, and video stay all rights
  reserved.
- This changelog.

### Changed

- The pinwheel photo is now the favicon.
- Even spacing between pagination and the footer.
- GitHub Actions and the Vercel CLI are pinned to exact versions.
- README rewritten from the outside in.

### Removed

- The `/blog` section.
- Leftover migration notes, a one-off WordPress import script, and legacy FTP
  log files.

## 2026-09-20

### Fixed

- `robots.txt` now links to `sitemap.xml`.
- The `www` address redirects to the main domain, which cleared the remaining
  Google Search Console coverage issues.

## 2026-09-18

### Added

- Numbered pagination on the home feed.

### Fixed

- Video cursor and content spacing.

## 2026-09-16

### Fixed

- Old WordPress links (`/<slug>/`) redirect to their new home at
  `/posts/<slug>/`, so existing links keep working.

## 2026-09-11

### Changed

- Audio, video, and zip files are served from Cloudflare R2 at
  `media.digitalfigments.com` with CDN caching, instead of from Vercel.
- A GitHub Action copies `assets/media/` to R2 on every push, including uploads
  made through the Keystatic editor.
- Media deploys go through the Vercel CLI, so a page never goes live before its
  file is available.
- Local development serves media straight from disk. No R2 access is needed.
- Media folders merged into a single `assets/media/`.

## 2026-09-07

### Added

- Automated checks: lint, markdown lint, type checking, unit tests with a 90%
  coverage gate, a production build, and Playwright end-to-end tests.
- A privacy policy page.
- A redirect from `/portrayal` to the character chatbot generator app.

### Changed

- Photo gallery is now a CSS-grid masonry layout.
- Post images are optimized at build time, with responsive sizes and modern
  formats.
- Fonts are self-hosted, and the main above-the-fold image loads first.

## 2026-09-06

### Added

- The site, rebuilt from WordPress as a static Astro site with Keystatic as a
  git-backed editor. All content is plain files in this repo, hosted on Vercel.
- Posts, the covers archive, and static pages, migrated from WordPress.
- Covers, demos, and a2z recordings share a single tracks collection and page
  layout.
- Lightbox, back-to-top button, light and dark themes, and basic SEO.
- Security headers and a content security policy.

### Fixed

- A regular-expression denial-of-service vulnerability in a dependency.

### Changed

- The old WordPress server was retired and the domain moved to the new site.
