import { SITEMAP_GROUPS } from "@/lib/sitemaps";
import { SITE_URL } from "@/lib/seo";

// The sitemap index, at the URL submitted to Search Console. Next serves each
// group at /sitemaps/sitemap/<group>.xml (app/sitemaps/sitemap.ts) but writes no index itself.
export const dynamic = "force-static";

export function GET() {
  const entries = SITEMAP_GROUPS.map((id) => `  <sitemap>\n    <loc>${SITE_URL}/sitemaps/sitemap/${id}.xml</loc>\n  </sitemap>`).join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`,
    { headers: { "Content-Type": "application/xml" } },
  );
}
