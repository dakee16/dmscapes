import { SCHOOLS } from "@/lib/schools";

/**
 * The site search's data (components/site/SearchPalette): every school and residence hall by name, small
 * enough to fetch when the search opens instead of shipping the full schools index on every page.
 * One row per school: [id, name, "City, ST", aliases, [[hallId, hallName], …]]. Built at deploy.
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
  return Response.json({ schools }, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
