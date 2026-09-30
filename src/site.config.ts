// Single source of truth for "unexposed" parts of the site — reachable by
// direct URL, not linked from nav, and kept out of search engines. Drives
// robots.txt, the sitemap filter, and each page's noindex meta tag.
export const siteConfig = {
  // Route path prefixes that stay unlinked from nav and excluded from
  // search indexing (see src/pages/robots.txt.ts and each template's
  // `noindex` prop on Layout).
  unindexedPaths: ["/music"],
};
