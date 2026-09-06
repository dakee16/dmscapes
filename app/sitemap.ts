import type { MetadataRoute } from "next";
import { SCHOOLS, allDormPaths } from "@/lib/schools";
import { POSTS } from "@/content/blog";
import { SITE_URL as BASE } from "@/lib/seo";

/**
 * Every indexable URL: marketing pages, the college hubs, one page per
 * residence hall, and the blog. Well under the 50,000-URL / 50 MB limit for a
 * single sitemap, so no index-sitemap split is needed yet.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const statics: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/plan`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/colleges`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/pricing`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/methodology`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/add-school`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/cookies`, changeFrequency: "yearly", priority: 0.3 },
  ];
  const colleges: MetadataRoute.Sitemap = SCHOOLS.map((s) => ({
    url: `${BASE}/colleges/${s.id}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  // One entry per residence hall: the deepest, most specific pages we have.
  const dorms: MetadataRoute.Sitemap = allDormPaths().map(({ collegeId, dormId }) => ({
    url: `${BASE}/colleges/${collegeId}/${dormId}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const posts: MetadataRoute.Sitemap = POSTS.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.updated ?? p.date,
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  return [...statics, ...colleges, ...dorms, ...posts];
}
