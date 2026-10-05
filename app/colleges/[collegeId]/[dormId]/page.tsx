import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import Crumbs from "@/components/ds/Crumbs";
import CtaBand from "@/components/ds/CtaBand";
import PlanCta from "@/components/site/PlanCta";
import JsonLd from "@/components/site/JsonLd";
import EstimatedDimsNote from "@/components/room/EstimatedDimsNote";
import { ArrowRight } from "@/components/ds/Icons";
import ScalePlan from "@/components/hall/ScalePlan";
import { allDormPaths, getDorm, formatDims, hallIsIndexable } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { formatRoomType } from "@/lib/format";
import { beddingAdvisory } from "@/lib/bedding";
import { bedName, fitRoom, ft, hasDims, isPublished, roomName, sqFtOf, type FittedRoom } from "@/lib/room-preview";
import { footprint } from "@/components/canvas/geometry";
import { pageMetadata, fitDescription, breadcrumbJsonLd, postalAddressJsonLd, absoluteUrl } from "@/lib/seo";
import type { RoomSummary } from "@/lib/types";
import css from "@/components/hall/Hall.module.css";

// One page per residence hall. Every page carries data that is genuinely
// specific to the building: the room types it has, their measured dimensions,
// bed size, closet footprint, and each room drawn from its actual dimensions.

export function generateStaticParams() {
  return allDormPaths();
}

const areaOf = (r: RoomSummary) =>
  r.length_ft && r.width_ft ? r.length_ft * r.width_ft : (r.sqft ?? 0);

export async function generateMetadata(props: {
  params: Promise<{ collegeId: string; dormId: string }>;
}): Promise<Metadata> {
  const { collegeId, dormId } = await props.params;
  const found = getDorm(collegeId, dormId);
  if (!found) return {};
  const { school, dorm } = found;
  const types = dorm.rooms.length;
  const sizes = dorm.rooms
    .map((r) => formatDims(r.length_ft, r.width_ft))
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
  const where = shortName(school);
  const count = `${types} room type${types === 1 ? "" : "s"}${sizes ? ` (${sizes})` : ""}`;
  const extras = dorm.rooms.some((r) => r.closet) ? "bed and closet sizes" : "bed sizes";
  return pageMetadata({
    title: `${dorm.name} Room Dimensions, ${where}`,
    description: fitDescription(
      `${dorm.name} at ${school.name}: ${count}, ${extras}, and a to-scale layout you can plan for free.`,
      `${dorm.name} at ${where}: ${count}, ${extras}, and a to-scale layout you can plan for free.`,
      `${dorm.name} at ${where}: ${count} and a to-scale layout you can plan for free.`,
      `${dorm.name} at ${where}: ${types} room type${types === 1 ? "" : "s"}, drawn to scale. Plan your room for free.`,
    ),
    path: `/colleges/${school.id}/${dorm.id}`,
    ogTitle: `${dorm.name} dorm room dimensions and layouts`,
    ...(hallIsIndexable(dorm) ? {} : { noIndex: true }),
  });
}

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const word = (n: number) => WORDS[n] ?? String(n);
const PIECE_NAMES: Record<string, string> = { bed: "Bed", desk: "Desk", desk_chair: "Desk chair", dresser: "Dresser" };
const FOOT_PX = 20;

export default async function DormPage(props: {
  params: Promise<{ collegeId: string; dormId: string }>;
}) {
  const { collegeId, dormId } = await props.params;
  const found = getDorm(collegeId, dormId);
  if (!found) notFound();
  const { school, dorm } = found;

  const place = [school.city, school.state].filter(Boolean).join(", ");
  const address = postalAddressJsonLd(school.city, school.state);
  const short = shortName(school);
  const published = dorm.rooms.filter(isPublished);
  const siblings = school.dorms.filter((d) => d.id !== dorm.id).slice(0, 12);
  const planHref = `/plan?school=${school.id}&dorm=${dorm.id}`;
  const n = dorm.rooms.length;

  const rooms = dorm.rooms.map((r) => ({ r, fit: fitRoom(r) }));
  const fitted = rooms.filter((x): x is { r: RoomSummary; fit: FittedRoom } => x.fit !== null);
  const maxL = Math.max(0, ...fitted.map((x) => x.fit.lengthFt));
  // one scale for every plan on the page, sized so the longest room fits a card
  const ppf = maxL ? Math.min(26, 500 / (maxL + 3)) : 20;

  // Built-in footprints from the biggest measured room's starting layout.
  const primary = [...fitted].sort((a, b) => areaOf(b.r) - areaOf(a.r))[0];
  const pieces = (() => {
    if (!primary) return [];
    const seen = new Set<string>();
    return primary.fit.furniture
      .filter((f) => !seen.has(f.type) && seen.add(f.type))
      .map((f) => ({ type: f.type, w: f.width_ft, l: f.length_ft }));
  })();
  const closet = dorm.rooms.find((r) => r.closet)?.closet ?? null;

  const openFloor = fitted.map(({ r, fit }) => {
    const area = sqFtOf(r) ?? Math.round(fit.lengthFt * fit.widthFt);
    const furn = Math.round(
      fit.furniture.reduce((s, f) => {
        const fp = footprint(f);
        return s + fp.w * fp.h;
      }, 0)
    );
    return { name: roomName(r), area, furn: Math.min(furn, area), estimated: Boolean(r.dims_estimated) };
  });
  const maxArea = Math.max(1, ...openFloor.map((o) => o.area));

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Colleges", path: "/colleges" },
    { name: school.name, path: `/colleges/${school.id}` },
    { name: dorm.name, path: `/colleges/${school.id}/${dorm.id}` },
  ];

  const chips: string[] = [
    ...dorm.rooms
      .filter(hasDims)
      .slice(0, 3)
      .map((r) => `${roomName(r)} · ${ft(Math.max(r.length_ft!, r.width_ft!))} × ${ft(Math.min(r.length_ft!, r.width_ft!))} ft${r.dims_estimated ? " (est.)" : ""}`),
    ...[...new Set(dorm.rooms.map((r) => `${bedName(r.bed_size)} beds`))],
    ...(closet ? ["Closet as published"] : []),
  ];

  return (
    <PageShell navOverlay>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          {
            "@context": "https://schema.org",
            "@type": "Residence",
            name: dorm.name,
            url: absoluteUrl(`/colleges/${school.id}/${dorm.id}`),
            containedInPlace: {
              "@type": "CollegeOrUniversity",
              name: school.name,
              url: absoluteUrl(`/colleges/${school.id}`),
              ...(address ? { address } : {}),
            },
            // Room sizes as data for search and answer engines; published
            // dimensions only, never our estimates.
            containsPlace: dorm.rooms.filter(isPublished).map((r) => ({
              "@type": "Room",
              name: roomName(r),
              description: `${ft(Math.max(r.length_ft!, r.width_ft!))} × ${ft(Math.min(r.length_ft!, r.width_ft!))} ft, ${bedName(r.bed_size)} beds`,
              floorSize: { "@type": "QuantitativeValue", value: Math.round(r.length_ft! * r.width_ft!), unitCode: "FTK" },
              ...(r.occupants ? { occupancy: { "@type": "QuantitativeValue", value: r.occupants } } : {}),
            })),
          },
        ]}
      />
      <PageHero
        bg="#E5E7F7"
        className={css.hero}
        crumbs={
          <Crumbs
            items={[
              { name: "Colleges", path: "/colleges" },
              { name: short, path: `/colleges/${school.id}` },
              { name: dorm.name, path: `/colleges/${school.id}/${dorm.id}` },
            ]}
          />
        }
        eyebrow={
          <>
            {short} · Residence hall · {n} room type{n === 1 ? "" : "s"}
          </>
        }
        lines={[
          { text: dorm.name, riso: true },
          { text: "room dimensions.", serif: true },
        ]}
        lede={
          <>
            <p>
              {n} room type{n === 1 ? "" : "s"} at{" "}
              <Link href={`/colleges/${school.id}`} className="ds-link">
                {school.name}
              </Link>
              {place ? ` in ${place}` : ""}
              {published.length > 0 ? `, ${published.length} with dimensions published by the university.` : "."} Use
              them to plan the room to scale before move-in.
            </p>
            <ul className={css.chips}>
              {chips.map((c) => (
                <li key={c} className="ds-chip">
                  {c}
                </li>
              ))}
            </ul>
          </>
        }
        art={{
          src: "/redesign/site-hall-clay-room.jpg",
          alt: "A white clay model of a furnished dorm room with two beds, two desks and dressers, its walls edged in blue.",
          ratio: 1440 / 1280,
          fit: "contain",
          position: "50% 60%",
        }}
      >
        <PlanCta
          href={planHref}
          className="ds-btn ds-btn--ink-yellow ds-btn--lg"
          freeLabel={`Plan your ${dorm.name} room`}
          paidLabel={`Plan a ${dorm.name} room`}
          icon={<ArrowRight size={20} />}
        />
        <a href="#rooms" className="ds-btn ds-btn--ghost">
          {n === 1 ? "See the room" : n === 2 ? "See both rooms" : `See all ${n} rooms`}
        </a>
      </PageHero>

      {/* Room types: the substance of the page. */}
      <section
        id="rooms"
        className={`ds-section ${css.rooms}`}
        aria-labelledby="rooms-title"
        style={{ "--ppf-base": ppf.toFixed(2) } as React.CSSProperties}
      >
        <div className="ds-wrap">
          <div className={css.roomsHead}>
            <div>
              <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
                {n === 1 ? "Drawn to scale" : n === 2 ? "Both rooms at the same scale" : `All ${n} rooms at the same scale`}
              </p>
              <Headline
                id="rooms-title"
                className="ds-h2 ds-h2--inline"
                lines={[
                  { text: n === 1 ? "One room type," : `${word(n)} room types,` },
                  { text: "drawn to scale.", serif: true },
                ]}
              />
            </div>
            {fitted.length > 0 && (
              <label className={css.toggle}>
                <input type="checkbox" defaultChecked className={css.toggleInput} />
                <span>Show standard furniture</span>
              </label>
            )}
          </div>

          <ul className={css.roomGrid}>
            {rooms.map(({ r, fit }, i) => {
              const area = sqFtOf(r);
              const bed = beddingAdvisory(r.bed_size);
              const featured = primary && r === primary.r && n > 1;
              return (
                <li key={`${r.type}-${i}`} className={css.roomCard} data-featured={featured || undefined} data-reveal="">
                  <div className={css.roomTop}>
                    <div>
                      <p className={css.roomKicker}>
                        {roomName(r)}
                        {r.occupants ? ` · Sleeps ${r.occupants}` : ""}
                      </p>
                      <h3 className={css.roomDims}>
                        {fit ? (
                          <>
                            {ft(fit.lengthFt)} × {ft(fit.widthFt)} ft
                          </>
                        ) : (
                          "Size not published"
                        )}
                      </h3>
                      <p className={css.roomMeta}>
                        {area ? `${area} sq ft · ` : ""}
                        {bedName(r.bed_size)}
                        {r.dims_estimated && <span className={css.estTag}>Estimated</span>}
                      </p>
                    </div>
                    <PlanCta
                      href={planHref}
                      className={`ds-btn ds-btn--sm ${featured ? "ds-btn--ink-yellow" : "ds-btn--ghost-ink"}`}
                      freeLabel="Plan this room"
                      paidLabel="Plan this room"
                    />
                  </div>
                  {r.dims_estimated && (
                    <div className={css.note}>
                      <EstimatedDimsNote />
                    </div>
                  )}
                  {bed?.level === "warning" && <p className={css.note}>{bed.message}</p>}
                  <div className={css.planWrap}>
                    {fit ? (
                      <ScalePlan
                        uid={`${i}`}
                        room={fit}
                        title={`${roomName(r)} at ${dorm.name}, ${ft(fit.lengthFt)} by ${ft(fit.widthFt)} feet, with a bed, desk and dresser placed where a typical layout puts them`}
                        furnitureClassName={css.furn}
                        className={css.plan}
                      />
                    ) : (
                      <div className={css.noPlan}>
                        <p>The school doesn&apos;t publish this room&apos;s size.</p>
                        <Link href="/plan/draw" className="ds-link">
                          Measure it and draw it in 2D
                        </Link>
                      </div>
                    )}
                  </div>
                  {fit && (
                    <div className={css.roomFoot}>
                      <span>Pieces placed where a typical layout puts them</span>
                      <span className="ds-mono">1 square = 1 ft</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {closet && (
            <p className={css.closetLine}>
              Closet: {closet.width_ft}′ wide × {closet.depth_ft}′ deep, as published for this building.
            </p>
          )}
        </div>
      </section>

      {pieces.length > 0 && (
        <section className={`ds-section ${css.pieces}`} aria-labelledby="pieces-title">
          <div className="ds-wrap">
            <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
              Standard furniture footprints
            </p>
            <Headline
              id="pieces-title"
              className="ds-h2 ds-h2--inline"
              lines={[{ text: "What's already" }, { text: "in the room.", serif: true }]}
            />
            <ul className={css.pieceGrid} data-stagger="">
              {pieces.map((p) => (
                <li key={p.type} className={css.piece} data-reveal="">
                  <span className={css.pieceDraw} aria-hidden="true">
                    <span
                      className={css.pieceRect}
                      data-type={p.type}
                      style={{ width: p.w * FOOT_PX, height: p.l * FOOT_PX }}
                    />
                  </span>
                  <b>
                    {PIECE_NAMES[p.type] ?? p.type}
                    {p.type === "bed" ? ` · ${bedName(primary!.r.bed_size)}` : ""}
                  </b>
                  <span>
                    {p.w}′ × {p.l}′
                  </span>
                </li>
              ))}
              {closet && (
                <li className={css.piece} data-dark="" data-reveal="">
                  <span className={css.pieceDraw} aria-hidden="true">
                    <span
                      className={css.pieceRect}
                      data-type="closet"
                      style={{ width: closet.width_ft * FOOT_PX, height: closet.depth_ft * FOOT_PX }}
                    />
                  </span>
                  <b>Closet</b>
                  <span>
                    {closet.width_ft}′ × {closet.depth_ft}′ · as published for this building
                  </span>
                </li>
              )}
            </ul>
            <p className={css.pieceNote}>
              The built-in pieces the layouts plan around, at the sizes we use for fit checks. All drawn at the same
              scale · {FOOT_PX} px per ft
            </p>
          </div>
        </section>
      )}

      {openFloor.length > 0 && (
        <section className="ds-section" aria-labelledby="open-title">
          <div className={`ds-wrap ${css.open}`}>
            <div>
              <Headline
                id="open-title"
                className="ds-h2"
                lines={[{ text: "Open floor," }, { text: "once it's all in.", serif: true }]}
              />
              <p className={css.openLede} data-reveal="">
                Our estimate from the footprints above, one of each piece per person. For most furnished singles and
                doubles, a 5 × 7 rug fits the open floor better than a larger size.
              </p>
            </div>
            <div>
              <ul className={css.legend} aria-hidden="true">
                <li data-k="furn">Standard furniture</li>
                <li data-k="open">Open floor</li>
              </ul>
              <ul className={css.openBars}>
                {openFloor.map((o, i) => (
                  <li key={i}>
                    <b>
                      {o.name} · {o.area} sq ft{o.estimated ? " (estimated size)" : ""}
                    </b>
                    <span className={css.openTrack} style={{ width: `${(o.area / maxArea) * 100}%` }}>
                      <span className={css.openFurn} style={{ flexBasis: `${(o.furn / o.area) * 100}%` }}>
                        {o.furn} sq ft<span className="ds-sr"> of standard furniture</span>
                      </span>
                      <span className={css.openFree} data-bar="">
                        about {o.area - o.furn} sq ft open
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Internal linking: sibling buildings keep crawl depth shallow. */}
      {siblings.length > 0 && (
        <section className={`ds-section ${css.more}`} aria-labelledby="more-title">
          <div className="ds-wrap">
            <div className={css.moreHead}>
              <h2 id="more-title" className={css.moreTitle} data-reveal="">
                More halls at {short}
              </h2>
              <Link href={`/colleges/${school.id}`} className={css.allLink}>
                All {school.dorms.length} {short} buildings <ArrowRight size={16} />
              </Link>
            </div>
            <ul className={css.sibGrid}>
              {siblings.map((d, i) => {
                const withDims = d.rooms.filter(hasDims);
                const summary = withDims
                  .slice(0, 2)
                  .map((r) => `${formatRoomType(r.type)} ${formatDims(r.length_ft, r.width_ft)}`)
                  .join(" · ");
                return (
                  <li key={d.id} data-reveal="" style={{ "--i": i % 4 } as React.CSSProperties}>
                    <Link href={`/colleges/${school.id}/${d.id}`} className={`ds-card ${css.sib}`}>
                      <b>{d.name}</b>
                      <span className={css.sibThumbs} aria-hidden="true">
                        {withDims.slice(0, 3).map((r, k) => (
                          <span
                            key={k}
                            data-est={r.dims_estimated || undefined}
                            style={{
                              width: Math.min(60, Math.max(r.length_ft!, r.width_ft!) * 2.6),
                              height: Math.min(40, Math.min(r.length_ft!, r.width_ft!) * 2.6),
                            }}
                          />
                        ))}
                      </span>
                      <span className={css.sibMeta}>
                        {summary || `${d.rooms.length} room type${d.rooms.length === 1 ? "" : "s"}`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <CtaBand
        lead={`${dorm.name},`}
        tail="furnished."
        note={
          <>
            {published.length > 0
              ? "Measurements as published for this building."
              : "Sizes here are estimated from similar rooms."}{" "}
            <Link href="/methodology">How we measure</Link>
          </>
        }
      >
        <PlanCta
          href={planHref}
          className="ds-btn ds-btn--yellow ds-btn--lg"
          freeLabel={`Plan your ${dorm.name} room`}
          paidLabel={`Plan a ${dorm.name} room`}
          icon={<ArrowRight size={20} />}
        />
      </CtaBand>
    </PageShell>
  );
}
