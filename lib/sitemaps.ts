import type { MetadataRoute } from "next";
import { SCHOOLS, hallIsIndexable } from "@/lib/schools";
import { POSTS } from "@/content/blog";
import { SITE_URL as BASE } from "@/lib/seo";

/**
 * The sitemap groups. Each is served at /sitemaps/sitemap/<group>.xml (app/sitemaps/sitemap.ts)
 * and listed by the index at /sitemap.xml (app/sitemap.xml/route.ts). Every URL
 * is an indexable page that is its own canonical, with no query string.
 * lastModified appears only where a real date exists (blog posts, and the blog
 * index from its newest post), never the build date.
 */
export const SITEMAP_GROUPS = ["pages", "colleges", "halls", "blog"] as const;

const postDate = (p: (typeof POSTS)[number]) => p.updated ?? p.date;

export function sitemapEntries(group: string): MetadataRoute.Sitemap {
  switch (group) {
    case "pages":
      return [
        { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
        { url: `${BASE}/plan`, changeFrequency: "weekly", priority: 0.9 },
        { url: `${BASE}/plan/draw`, changeFrequency: "monthly", priority: 0.8 },
        { url: `${BASE}/plan/draw/3d`, changeFrequency: "monthly", priority: 0.8 },
        { url: `${BASE}/colleges`, changeFrequency: "weekly", priority: 0.8 },
        { url: `${BASE}/pricing`, changeFrequency: "monthly", priority: 0.7 },
        { url: `${BASE}/blog`, lastModified: POSTS.map(postDate).sort().at(-1), changeFrequency: "weekly", priority: 0.7 },
        { url: `${BASE}/faq`, changeFrequency: "monthly", priority: 0.6 },
        { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.5 },
        { url: `${BASE}/methodology`, changeFrequency: "monthly", priority: 0.6 },
        { url: `${BASE}/add-school`, changeFrequency: "monthly", priority: 0.5 },
        { url: `${BASE}/contact`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${BASE}/cookies`, changeFrequency: "yearly", priority: 0.3 },
      ];
    case "colleges":
      return SCHOOLS.map((s) => ({ url: `${BASE}/colleges/${s.id}`, changeFrequency: "monthly", priority: 0.8 }));
    case "halls":
      // One entry per residence hall with measured rooms (the rest are noindex).
      return SCHOOLS.flatMap((s) =>
        s.dorms.filter(hallIsIndexable).map((d) => ({ url: `${BASE}/colleges/${s.id}/${d.id}`, changeFrequency: "monthly" as const, priority: 0.7 }))
      );
    case "blog":
      return POSTS.map((p) => ({ url: `${BASE}/blog/${p.slug}`, lastModified: postDate(p), changeFrequency: "monthly", priority: 0.6 }));
    default:
      return [];
  }
}
