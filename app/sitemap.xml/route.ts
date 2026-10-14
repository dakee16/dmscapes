import { SITEMAP_GROUPS, sitemapEntries } from "@/lib/sitemaps";
import { SITE_URL } from "@/lib/seo";

// The sitemap index, at the URL submitted to Search Console. Next serves each
// group at /sitemaps/sitemap/<group>.xml (app/sitemaps/sitemap.ts) but writes no index itself.
export const dynamic = "force-static";

// Each group's newest real date (see lib/sitemaps), so crawlers know which changed.
const newest = (id: string) =>
  sitemapEntries(id)
    .map((e) => e.lastModified)
    .filter(Boolean)
    .map(String)
    .sort()
    .at(-1);

export function GET() {
  const entries = SITEMAP_GROUPS.map((id) => {
    const lastmod = newest(id);
    return `  <sitemap>\n    <loc>${SITE_URL}/sitemaps/sitemap/${id}.xml</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n  </sitemap>`;
  }).join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`,
    { headers: { "Content-Type": "application/xml" } },
  );
}
