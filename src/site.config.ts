// Single source of truth for "unexposed" parts of the site — reachable by
// direct URL, not linked from nav, and kept out of search engines. Drives
// robots.txt, each page's noindex meta tag, and the /blog route filtering,
// so those three things can't drift out of sync with each other.
export const siteConfig = {
  blog: {
    // "pages" collection entries served at /blog/[slug]/ instead of the
    // generic /[slug]/ route — essay-like content that doesn't fit the
    // photo-blog nav or framing.
    pageSlugs: ["obamas-audacity"],
  },
  // Route path prefixes that stay unlinked from nav and excluded from
  // search indexing (see src/pages/robots.txt.ts and each template's
  // `noindex` prop on Layout).
  unindexedPaths: ["/blog", "/music"],
};
