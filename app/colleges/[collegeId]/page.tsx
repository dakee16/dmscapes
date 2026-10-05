import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import Crumbs from "@/components/ds/Crumbs";
import TapeStats from "@/components/ds/TapeStats";
import CtaBand from "@/components/ds/CtaBand";
import PlanCta from "@/components/site/PlanCta";
import JsonLd from "@/components/site/JsonLd";
import { ArrowRight } from "@/components/ds/Icons";
import HallDirectory, { type HallCard } from "@/components/college/HallDirectory";
import { SCHOOLS, formatDims, getSchool, publishedDimsCount } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { isPublished, roomFamily, roomName, sqFtOf, ft } from "@/lib/room-preview";
import { formatRoomType } from "@/lib/format";
import { pageMetadata, fitDescription, breadcrumbJsonLd, postalAddressJsonLd, itemListJsonLd, absoluteUrl } from "@/lib/seo";
import type { RoomSummary, SchoolSummary } from "@/lib/types";
import css from "@/components/college/College.module.css";

// SEO pages targeting "[College Name] dorm room planner / dimensions" queries,
// and the hub that links out to every residence-hall page for the school.
export function generateStaticParams() {
  return SCHOOLS.map((s) => ({ collegeId: s.id }));
}

export async function generateMetadata(props: {
  params: Promise<{ collegeId: string }>;
}): Promise<Metadata> {
  const { collegeId } = await props.params;
  const school = getSchool(collegeId);
  if (!school) return {};
  // Estimated dims are populated too, so both the description and the on-page
  // copy count only *published* sizes; a fully-estimated school must not claim
  // measurements it doesn't have.
  const dimsClause =
    publishedDimsCount(school) > 0 ? " with real room dimensions" : "";
  const halls = `${school.dorms.length} residence hall${school.dorms.length === 1 ? "" : "s"}`;
  return pageMetadata({
    title: `${school.name} Dorm Room Dimensions`,
    description: fitDescription(
      `Plan your ${school.name} dorm room before move-in. ${halls}${dimsClause}, room-by-room layouts, and a shoppable list. Free.`,
      `Plan your ${shortName(school)} dorm room before move-in. ${halls}${dimsClause}, room-by-room layouts, and a shoppable list. Free.`,
      `${shortName(school)}: ${halls}${dimsClause}, drawn to scale. Plan your dorm room before move-in, free.`,
    ),
    path: `/colleges/${school.id}`,
  });
}

const hallShort = (name: string) => name.replace(/\s+(Hall|House|Residence Hall|Residence)$/i, "");
const familyLabel: Record<string, string> = { Single: "single", Double: "double", Triple: "triple", Quad: "quad", Suite: "suite" };

type Placed = { key: string; hall: string; type: string; l: number; w: number; href: string; sqft: number };

/** Up to a dozen distinct published sizes, from the biggest down, for the one-scale wall. */
function scaleWall(school: SchoolSummary): Placed[] {
  const seen = new Set<string>();
  const all: Placed[] = [];
  for (const d of school.dorms)
    for (const r of d.rooms) {
      if (!isPublished(r)) continue;
      const l = Math.max(r.length_ft!, r.width_ft!);
      const w = Math.min(r.length_ft!, r.width_ft!);
      const key = `${l.toFixed(1)}x${w.toFixed(1)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push({ key, hall: hallShort(d.name), type: formatRoomType(r.type), l, w, href: `/colleges/${school.id}/${d.id}`, sqft: sqFtOf(r) ?? Math.round(l * w) });
    }
  all.sort((a, b) => b.l * b.w - a.l * a.w);
  if (all.length <= 11) return all;
  // keep the extremes and an even spread between them
  const pick: Placed[] = [];
  for (let i = 0; i < 11; i++) pick.push(all[Math.round((i * (all.length - 1)) / 10)]);
  return [...new Map(pick.map((p) => [p.key, p])).values()];
}

/** The room type with the widest spread of published sizes, grouped by size. */
function spread(school: SchoolSummary) {
  const byFam = new Map<string, Map<string, { l: number; w: number; sqft: number; halls: string[]; type: string }>>();
  for (const d of school.dorms)
    for (const r of d.rooms as RoomSummary[]) {
      if (!isPublished(r)) continue;
      const fam = roomFamily(r.type);
      if (!["Double", "Single", "Triple"].includes(fam)) continue;
      const l = Math.max(r.length_ft!, r.width_ft!);
      const w = Math.min(r.length_ft!, r.width_ft!);
      const key = `${l.toFixed(1)}x${w.toFixed(1)}`;
      const m = byFam.get(fam) ?? new Map();
      const g = m.get(key) ?? { l, w, sqft: sqFtOf(r) ?? Math.round(l * w), halls: [], type: formatRoomType(r.type) };
      if (!g.halls.includes(hallShort(d.name))) g.halls.push(hallShort(d.name));
      m.set(key, g);
      byFam.set(fam, m);
    }
  const order = ["Double", "Single", "Triple"];
  const fam = order.find((f) => (byFam.get(f)?.size ?? 0) >= 3);
  if (!fam) return null;
  let groups = [...byFam.get(fam)!.values()].sort((a, b) => b.sqft - a.sqft);
  if (groups[0].sqft === groups[groups.length - 1].sqft) return null;
  if (groups.length > 9) {
    const g = groups;
    groups = [...new Set(Array.from({ length: 9 }, (_, i) => g[Math.round((i * (g.length - 1)) / 8)]))];
  }
  return { family: familyLabel[fam], groups };
}

const names = (halls: string[]) =>
  halls.length <= 2 ? halls.join(" or ") : `${halls.slice(0, 2).join(", ")} and ${halls.length - 2} more`;

export default async function CollegePage(props: {
  params: Promise<{ collegeId: string }>;
}) {
  const { collegeId } = await props.params;
  const school = getSchool(collegeId);
  if (!school) notFound();

  const withDims = publishedDimsCount(school);
  const place = [school.city, school.state].filter(Boolean).join(", ");
  const address = postalAddressJsonLd(school.city, school.state);
  const short = shortName(school);
  const roomTypes = school.dorms.reduce((n, d) => n + d.rooms.length, 0);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Colleges", path: "/colleges" },
    { name: school.name, path: `/colleges/${school.id}` },
  ];

  const wall = scaleWall(school);
  const maxL = Math.max(0, ...wall.map((p) => p.l));
  const ppf = maxL ? Math.min(7, 560 / maxL) : 7;
  const featured = wall.find((p) => /double/i.test(p.type)) ?? wall[0];
  const doubles = wall.filter((p) => /double/i.test(p.type));
  const caption =
    doubles.length >= 2 && doubles[0].sqft !== doubles[doubles.length - 1].sqft
      ? `The same “double” can be ${doubles[doubles.length - 1].sqft} or ${doubles[0].sqft} square feet here. Seeing them side by side is the whole point.`
      : `Published sizes at ${short}, drawn side by side at one scale.`;

  const bars = spread(school);
  const maxSq = bars ? bars.groups[0].sqft : 1;

  const halls: HallCard[] = [...school.dorms]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => ({
      id: d.id,
      name: d.name,
      href: `/colleges/${school.id}/${d.id}`,
      planHref: `/plan?school=${school.id}&dorm=${d.id}`,
      rooms: d.rooms.map((r) => ({
        label: roomName(r),
        dims: formatDims(r.length_ft, r.width_ft) ?? (r.sqft ? `${r.sqft} sq ft` : null),
        estimated: Boolean(r.dims_estimated),
        l: r.length_ft && r.width_ft ? Math.max(r.length_ft, r.width_ft) : null,
        w: r.length_ft && r.width_ft ? Math.min(r.length_ft, r.width_ft) : null,
        family: roomFamily(r.type),
      })),
    }));
  const famOrder = ["Single", "Double", "Triple", "Quad", "Suite"];
  const families = famOrder.filter((f) => halls.some((h) => h.rooms.some((r) => r.family === f)));
  const anyEstimated = halls.some((h) => h.rooms.some((r) => r.estimated));

  return (
    <PageShell navOverlay>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          itemListJsonLd(
            `${school.name} residence halls`,
            school.dorms.map((d) => ({
              name: d.name,
              path: `/colleges/${school.id}/${d.id}`,
            }))
          ),
          {
            "@context": "https://schema.org",
            "@type": "CollegeOrUniversity",
            name: school.name,
            url: absoluteUrl(`/colleges/${school.id}`),
            ...(address ? { address } : {}),
          },
        ]}
      />
      <PageHero
        bg="var(--ds-sky)"
        crumbs={<Crumbs items={[{ name: "Colleges", path: "/colleges" }, { name: short, path: `/colleges/${school.id}` }]} />}
        eyebrow={
          <>
            {school.name}
            {place && school.name.includes(school.city ?? "\u0000") ? "" : place ? ` · ${place}` : ""}
          </>
        }
        lines={[
          { text: short, riso: true },
          { text: "dorm room planner.", serif: true },
        ]}
        className={css.hero}
        lede={
          <p>
            {school.dorms.length} residence halls
            {withDims > 0 && <> · {withDims} room types with real measured dimensions</>}. Pick your building, get a
            layout that fits to the inch, and a shoppable list that fits your budget.
          </p>
        }
        visual={
          wall.length > 0 ? (
            <figure className={`ds-plan-paper ${css.wall}`} style={{ "--ppf": ppf } as React.CSSProperties}>
              <figcaption className={css.wallHead}>
                <span>Every room type, one scale</span>
                <span className="ds-mono">1 square = 1 ft</span>
              </figcaption>
              <ul className={css.wallStage}>
                {wall.map((p, i) => (
                  <li key={p.key}>
                    <Link
                      href={p.href}
                      className={css.wallRoom}
                      data-featured={p === featured || undefined}
                      data-grow="load"
                      style={{ "--l": p.l, "--w": p.w, "--i": i } as React.CSSProperties}
                    >
                      <b>
                        {p.hall} · {p.type}
                      </b>
                      <span>
                        {ft(p.l)} × {ft(p.w)} ft
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className={css.wallFoot}>
                <p>{caption}</p>
                <span className={css.tenFt} aria-hidden="true">
                  <i style={{ width: `calc(10 * var(--ppf) * var(--k, 1) * 1px)` }} />
                  10 ft
                </span>
              </div>
            </figure>
          ) : undefined
        }
      >
        <PlanCta
          className="ds-btn ds-btn--ink-yellow ds-btn--lg"
          href={`/plan?school=${school.id}`}
          freeLabel="Design your room for free"
          paidLabel="Design your room"
          icon={<ArrowRight size={20} />}
        />
        <a href="#halls" className="ds-btn ds-btn--ghost">
          Start with your building
        </a>
      </PageHero>

      <TapeStats
        label={`${short} totals`}
        items={[
          <>{short}</>,
          <>{school.dorms.length} residence halls</>,
          <>{roomTypes} room types</>,
          withDims > 0 ? <>{withDims} published sizes</> : <>Sizes estimated, clearly marked</>,
        ]}
      />

      <section id="halls" className="ds-section" aria-labelledby="halls-title" style={{ scrollMarginTop: 80 }}>
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Residence halls · A to Z
          </p>
          <Headline
            id="halls-title"
            className="ds-h2 ds-h2--inline"
            lines={[{ text: "Pick your" }, { text: "building.", serif: true }]}
          />
          <p className={css.hallsLede} data-reveal="">
            Open a building for its room types, measured dimensions, bed and closet sizes, and an example layout drawn
            to scale.
            {anyEstimated && (
              <>
                {" "}
                Sizes marked ≈ are estimated from similar rooms because the school doesn&apos;t publish them.{" "}
                <Link href="/methodology" className="ds-link">
                  How we measure these rooms
                </Link>
              </>
            )}
          </p>
          <HallDirectory halls={halls} families={families} />
        </div>
      </section>

      {bars && (
        <section className={`ds-section ${css.barsSection}`} aria-labelledby="bars-title">
          <div className="ds-wrap">
            <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
              Floor area · {bars.family} rooms · published sizes
            </p>
            <Headline
              id="bars-title"
              className="ds-h2 ds-h2--inline"
              lines={[{ text: `Not all ${bars.family}s` }, { text: "are equal.", serif: true }]}
            />
            <p className={css.barsLede} data-reveal="">
              A {bars.family} at {names(bars.groups[0].halls)} is {bars.groups[0].sqft} sq ft. At{" "}
              {names(bars.groups[bars.groups.length - 1].halls)} it&apos;s {bars.groups[bars.groups.length - 1].sqft}.
              Published dimensions describe room types, not individual rooms, so confirm anything tight on move-in day.
            </p>
            <table className={css.bars}>
              <caption className="ds-sr">
                Floor area of {bars.family} rooms at {school.name}, largest first
              </caption>
              <thead className="ds-sr">
                <tr>
                  <th scope="col">Halls and size</th>
                  <th scope="col">Floor area</th>
                </tr>
              </thead>
              <tbody>
                {bars.groups.map((g, i) => (
                  <tr key={i}>
                    <th scope="row">
                      <b>
                        {g.halls.length > 3 ? `${g.halls.slice(0, 3).join(", ")} +${g.halls.length - 3}` : g.halls.join(", ")} · {g.type}
                      </b>
                      <span>
                        {ft(g.l)} × {ft(g.w)} ft
                      </span>
                    </th>
                    <td>
                      <span className={css.barCell}>
                      <span className={css.barTrack}>
                        <span
                          className={css.bar}
                          data-bar=""
                          style={{ width: `${(g.sqft / maxSq) * 100}%`, "--i": i } as React.CSSProperties}
                        />
                      </span>
                      <span className={css.barValue}>{g.sqft} sq ft</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <CtaBand
        lead={`Your room at ${short},`}
        tail="planned."
        note={
          <>
            Your {school.name} room, planned to the inch.{" "}
            <Link href="/methodology">How we measure these rooms</Link>
          </>
        }
      >
        <PlanCta
          href={`/plan?school=${school.id}`}
          className="ds-btn ds-btn--yellow ds-btn--lg"
          freeLabel="Design your room for free"
          paidLabel="Design your room"
          icon={<ArrowRight size={20} />}
        />
        <span className="ds-mono" style={{ fontSize: 11, color: "#c9c6d4" }}>
          No card · No account needed to start
        </span>
      </CtaBand>
    </PageShell>
  );
}
