import { SCHOOLS } from "@/lib/schools";
import { searchPages } from "@/lib/search-catalog";

/**
 * The site search's data (components/site/SearchPalette): every school and residence hall by name, and
 * every page and feature (lib/search-catalog), small enough to fetch when the search opens instead of
 * shipping it on every page. One row per school: [id, name, "City, ST", aliases, [[hallId, hallName], …]];
 * one per page: [title, detail, href, words, Hall Finder only]. Built at deploy.
 */
export const dynamic = "force-static";

export function GET() {
  const schools = SCHOOLS.map((s) => [
    s.id,
    s.name,
    [s.city, s.state].filter(Boolean).join(", "),
    (s.aliases ?? []).join(" "),
    s.dorms.map((d) => [d.id, d.name]),
  ]);
  return Response.json({ schools, pages: searchPages() }, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
