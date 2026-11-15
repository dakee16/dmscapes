import type { MetadataRoute } from "next";
import { SCHOOLS, hallIsIndexable } from "@/lib/schools";
import { POSTS } from "@/content/blog";
import { SITE_URL as BASE } from "@/lib/seo";
import SCHOOL_DATES from "@/lib/school-dates.json";
import { BED_RULES_CHECKED } from "@/lib/bed-rules";
import { COMPETITORS } from "@/lib/compare";
import { CHECKED as DORM_PLANNERS_CHECKED } from "@/content/compare/dorm-room-planners";
import { PILOT_SCHOOLS, hallFinderLive } from "@/lib/hall-finder";
import { HALL_FINDER_BUILT, hallFinderUpdated } from "@/lib/hall-finder-seo";

/**
 * The sitemap groups. Each is served at /sitemaps/sitemap/<group>.xml (app/sitemaps/sitemap.ts)
 * and listed by the index at /sitemap.xml (app/sitemap.xml/route.ts). Every URL
 * is an indexable page that is its own canonical, with no query string.
 * lastModified appears only where a real date exists, never the build date:
 * blog posts (and the blog index and FAQ from the newest post), and school and
 * hall pages from the date their room data was collected (lib/school-dates.json,
 * written by scripts/build-schools-index.mjs). Pages built from the whole
 * dataset (home, colleges, dorm room size) take the newest of those dates, and
 * the hand-written pages (planner, pricing, legal…) the dates in PAGE_UPDATED.
 * No changefreq or priority: Google and Bing ignore both.
 */
export const SITEMAP_GROUPS = ["pages", "colleges", "halls", "blog"] as const;

const postDate = (p: (typeof POSTS)[number]) => p.updated ?? p.date;
const NEWEST_POST = POSTS.map(postDate).sort().at(-1);
// /faq dates itself by the newest post with FAQs (app/faq/page.tsx); same rule here.
const NEWEST_FAQ = POSTS.filter((p) => p.faqs?.length).map(postDate).sort().at(-1);
/** When /methodology last changed in substance: its eyebrow and structured data show this date. */
export const METHODOLOGY_UPDATED = "2026-11-03";
/**
 * When these hand-written pages last changed in substance (the page and the components on it).
 * They have no data date of their own, so bump the date here when you change one of them. The
 * three legal pages match the "Last updated" date each one shows.
 */
const PAGE_UPDATED: Record<string, string> = {
  "/plan": "2026-11-15",
  "/plan/draw": "2026-10-25",
  "/plan/draw/3d": "2026-10-31",
  "/compare": "2026-11-14",
  "/pricing": "2026-11-02",
  "/my-room": "2026-11-03",
  "/about": "2026-11-03",
  "/add-school": "2026-10-13",
  "/contact": "2026-11-03",
  "/terms": "2026-11-03",
  "/privacy": "2026-11-03",
  "/cookies": "2026-11-02",
};
const schoolDate = (id: string): string | undefined => (SCHOOL_DATES as Record<string, string>)[id];
const NEWEST_DATA = Object.values(SCHOOL_DATES as Record<string, string>).sort().at(-1);

export function sitemapEntries(group: string): MetadataRoute.Sitemap {
  switch (group) {
    case "pages":
      return [
        { url: `${BASE}/`, lastModified: NEWEST_DATA },
        { url: `${BASE}/plan`, lastModified: PAGE_UPDATED["/plan"] },
        { url: `${BASE}/plan/draw`, lastModified: PAGE_UPDATED["/plan/draw"] },
        { url: `${BASE}/plan/draw/3d`, lastModified: PAGE_UPDATED["/plan/draw/3d"] },
        { url: `${BASE}/colleges`, lastModified: NEWEST_DATA },
        { url: `${BASE}/dorm-room-size`, lastModified: NEWEST_DATA },
        { url: `${BASE}/dorm-room-planner`, lastModified: NEWEST_DATA },
        { url: `${BASE}/dorm-bed-rules`, lastModified: BED_RULES_CHECKED },
        { url: `${BASE}/dorm-rug-size`, lastModified: NEWEST_DATA },
        { url: `${BASE}/loft-bed-clearance`, lastModified: BED_RULES_CHECKED },
        { url: `${BASE}/twin-xl-sheets`, lastModified: NEWEST_DATA },
        { url: `${BASE}/compare`, lastModified: PAGE_UPDATED["/compare"] },
        ...COMPETITORS.map((c) => ({ url: `${BASE}/compare/${c.slug}`, lastModified: c.checked })),
        { url: `${BASE}/compare/dorm-room-planners`, lastModified: DORM_PLANNERS_CHECKED },
        { url: `${BASE}/pricing`, lastModified: PAGE_UPDATED["/pricing"] },
        { url: `${BASE}/my-room`, lastModified: PAGE_UPDATED["/my-room"] },
        { url: `${BASE}/blog`, lastModified: NEWEST_POST },
        // FAQ answers are the guides' FAQs, rolled up.
        { url: `${BASE}/faq`, lastModified: NEWEST_FAQ },
        { url: `${BASE}/about`, lastModified: PAGE_UPDATED["/about"] },
        { url: `${BASE}/methodology`, lastModified: METHODOLOGY_UPDATED },
        { url: `${BASE}/add-school`, lastModified: PAGE_UPDATED["/add-school"] },
        { url: `${BASE}/contact`, lastModified: PAGE_UPDATED["/contact"] },
        { url: `${BASE}/terms`, lastModified: PAGE_UPDATED["/terms"] },
        { url: `${BASE}/privacy`, lastModified: PAGE_UPDATED["/privacy"] },
        { url: `${BASE}/cookies`, lastModified: PAGE_UPDATED["/cookies"] },
        // Hall Finder pages only once it's live (until then they're noindex and unlinked), dated
        // by when each school's walking data was built (the hub by the newest).
        ...(hallFinderLive()
          ? [
              { url: `${BASE}/hall-finder`, built: hallFinderUpdated() },
              ...PILOT_SCHOOLS.map((id) => ({ url: `${BASE}/colleges/${id}/hall-finder`, built: HALL_FINDER_BUILT[id] ?? null })),
            ].map(({ url, built }) => ({ url, ...(built ? { lastModified: built } : {}) }))
          : []),
      ];
    case "colleges":
      return SCHOOLS.map((s) => ({ url: `${BASE}/colleges/${s.id}`, lastModified: schoolDate(s.id) }));
    case "halls":
      // One entry per residence hall with a published room size (the rest are noindex: see hallIsIndexable).
      return SCHOOLS.flatMap((s) =>
        s.dorms.filter(hallIsIndexable).map((d) => ({ url: `${BASE}/colleges/${s.id}/${d.id}`, lastModified: schoolDate(s.id) }))
      );
    case "blog":
      return POSTS.map((p) => ({ url: `${BASE}/blog/${p.slug}`, lastModified: postDate(p) }));
    default:
      return [];
  }
}
