import { getCollection } from "astro:content";
import { siteConfig } from "../site.config";

// The "pages" collection is split across two routes: essay-like entries at
// /blog/[slug]/ (see siteConfig.blog.pageSlugs) and everything else at the
// generic /[slug]/ route. These two fetchers keep that split's filter logic
// in one place instead of duplicated (and inverted) across both templates.
export async function getGenericPages() {
  const pages = await getCollection("pages");
  return pages.filter((page) => !siteConfig.blog.pageSlugs.includes(page.id));
}

export async function getBlogPages() {
  const pages = await getCollection("pages");
  return pages.filter((page) => siteConfig.blog.pageSlugs.includes(page.id));
}
