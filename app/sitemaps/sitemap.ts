import type { MetadataRoute } from "next";
import { SITEMAP_GROUPS, sitemapEntries } from "@/lib/sitemaps";

/**
 * One sitemap per group, at /sitemaps/sitemap/pages.xml, …/colleges.xml,
 * …/halls.xml and …/blog.xml. It lives in its own segment because a root
 * app/sitemap.ts would claim /sitemap.xml, which is the sitemap index
 * (app/sitemap.xml/route.ts, the URL submitted to Search Console).
 */
export async function generateSitemaps() {
  return SITEMAP_GROUPS.map((id) => ({ id }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(await id);
}
