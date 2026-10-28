import type { MetadataRoute } from "next";
import { SCHOOLS, hallIsIndexable } from "@/lib/schools";
import { POSTS } from "@/content/blog";
import { SITE_URL as BASE } from "@/lib/seo";
import SCHOOL_DATES from "@/lib/school-dates.json";
import { BED_RULES_CHECKED } from "@/lib/bed-rules";
import { COMPETITORS } from "@/lib/compare";
import { PILOT_SCHOOLS, hallFinderLive } from "@/lib/hall-finder";

/**
 * The sitemap groups. Each is served at /sitemaps/sitemap/<group>.xml (app/sitemaps/sitemap.ts)
 * and listed by the index at /sitemap.xml (app/sitemap.xml/route.ts). Every URL
 * is an indexable page that is its own canonical, with no query string.
 * lastModified appears only where a real date exists, never the build date:
 * blog posts (and the blog index and FAQ from the newest post), and school and
 * hall pages from the date their room data was collected (lib/school-dates.json,
 * written by scripts/build-schools-index.mjs). Pages built from the whole
 * dataset (home, colleges, dorm room size) take the newest of those dates.
 */
export const SITEMAP_GROUPS = ["pages", "colleges", "halls", "blog"] as const;

const postDate = (p: (typeof POSTS)[number]) => p.updated ?? p.date;
const NEWEST_POST = POSTS.map(postDate).sort().at(-1);
const schoolDate = (id: string): string | undefined => (SCHOOL_DATES as Record<string, string>)[id];
const NEWEST_DATA = Object.values(SCHOOL_DATES as Record<string, string>).sort().at(-1);

export function sitemapEntries(group: string): MetadataRoute.Sitemap {
  switch (group) {
    case "pages":
      return [
        { url: `${BASE}/`, lastModified: NEWEST_DATA, changeFrequency: "weekly", priority: 1 },
        { url: `${BASE}/plan`, changeFrequency: "weekly", priority: 0.9 },
        { url: `${BASE}/plan/draw`, changeFrequency: "monthly", priority: 0.8 },
        { url: `${BASE}/plan/draw/3d`, changeFrequency: "monthly", priority: 0.8 },
        { url: `${BASE}/colleges`, lastModified: NEWEST_DATA, changeFrequency: "weekly", priority: 0.8 },
        { url: `${BASE}/dorm-room-size`, lastModified: NEWEST_DATA, changeFrequency: "monthly", priority: 0.8 },
        { url: `${BASE}/dorm-room-planner`, lastModified: NEWEST_DATA, changeFrequency: "weekly", priority: 0.9 },
        { url: `${BASE}/dorm-bed-rules`, lastModified: BED_RULES_CHECKED, changeFrequency: "monthly", priority: 0.7 },
        { url: `${BASE}/dorm-rug-size`, lastModified: NEWEST_DATA, changeFrequency: "monthly", priority: 0.6 },
        { url: `${BASE}/loft-bed-clearance`, lastModified: BED_RULES_CHECKED, changeFrequency: "monthly", priority: 0.6 },
        { url: `${BASE}/twin-xl-sheets`, lastModified: NEWEST_DATA, changeFrequency: "monthly", priority: 0.6 },
        { url: `${BASE}/compare`, changeFrequency: "monthly", priority: 0.5 },
        ...COMPETITORS.map((c) => ({ url: `${BASE}/compare/${c.slug}`, lastModified: c.checked, changeFrequency: "monthly" as const, priority: 0.5 })),
        { url: `${BASE}/pricing`, changeFrequency: "monthly", priority: 0.7 },
        { url: `${BASE}/my-room`, changeFrequency: "monthly", priority: 0.6 },
        { url: `${BASE}/blog`, lastModified: NEWEST_POST, changeFrequency: "weekly", priority: 0.7 },
        // FAQ answers are the guides' FAQs, rolled up.
        { url: `${BASE}/faq`, lastModified: NEWEST_POST, changeFrequency: "monthly", priority: 0.6 },
        { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.5 },
        { url: `${BASE}/methodology`, changeFrequency: "monthly", priority: 0.6 },
        { url: `${BASE}/add-school`, changeFrequency: "monthly", priority: 0.5 },
        { url: `${BASE}/contact`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${BASE}/cookies`, changeFrequency: "yearly", priority: 0.3 },
        // Hall Finder pages only once it's live (until then they're noindex and unlinked).
        ...(hallFinderLive()
          ? [`${BASE}/hall-finder`, ...PILOT_SCHOOLS.map((id) => `${BASE}/colleges/${id}/hall-finder`)].map((url) => ({ url, changeFrequency: "monthly" as const, priority: 0.7 }))
          : []),
      ];
    case "colleges":
      return SCHOOLS.map((s) => ({ url: `${BASE}/colleges/${s.id}`, lastModified: schoolDate(s.id), changeFrequency: "monthly", priority: 0.8 }));
    case "halls":
      // One entry per residence hall with measured rooms (the rest are noindex).
      return SCHOOLS.flatMap((s) =>
        s.dorms.filter(hallIsIndexable).map((d) => ({ url: `${BASE}/colleges/${s.id}/${d.id}`, lastModified: schoolDate(s.id), changeFrequency: "monthly" as const, priority: 0.7 }))
      );
    case "blog":
      return POSTS.map((p) => ({ url: `${BASE}/blog/${p.slug}`, lastModified: postDate(p), changeFrequency: "monthly", priority: 0.6 }));
    default:
      return [];
  }
}
