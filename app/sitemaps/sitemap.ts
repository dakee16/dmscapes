import type { MetadataRoute } from "next";
import { SITEMAP_GROUPS, sitemapEntries } from "@/lib/sitemaps";
import { recentGallery } from "@/lib/gallery";
import { SITE_URL } from "@/lib/seo";

/**
 * One sitemap per group, at /sitemaps/sitemap/pages.xml, …/colleges.xml,
 * …/halls.xml and …/blog.xml. It lives in its own segment because a root
 * app/sitemap.ts would claim /sitemap.xml, which is the sitemap index
 * (app/sitemap.xml/route.ts, the URL submitted to Search Console).
 */
export async function generateSitemaps() {
  return SITEMAP_GROUPS.map((id) => ({ id }));
}

// /gallery joins "pages" once a layout is shared (until then the page is noindex), dated
// by the newest one; re-checked hourly, like the hall pages' galleries.
export const revalidate = 3600;

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const group = await id;
  const entries = sitemapEntries(group);
  if (group !== "pages") return entries;
  const [newest] = await recentGallery(1);
  return newest
    ? [...entries, { url: `${SITE_URL}/gallery`, lastModified: newest.sharedAt, changeFrequency: "daily", priority: 0.6 }]
    : entries;
}
