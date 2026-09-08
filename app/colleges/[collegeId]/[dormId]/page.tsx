import Footer from "@/components/Footer";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import PlanCta from "@/components/site/PlanCta";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import JsonLd from "@/components/site/JsonLd";
import EstimatedDimsNote from "@/components/room/EstimatedDimsNote";
import StaticRoomView from "@/components/room/StaticRoomView";
import { allDormPaths, getDorm, formatDims } from "@/lib/schools";
import { formatRoomType } from "@/lib/format";
import { beddingAdvisory } from "@/lib/bedding";
import { matchTemplate } from "@/templates/template-matcher";
import { fitTemplateToRoom } from "@/lib/layout-fit";
import { pageMetadata, breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import type { RoomSummary } from "@/lib/types";

// One page per residence hall (760 of them). Every page carries data that is
// genuinely specific to the building: the room types it has, their measured
// dimensions, bed size, closet footprint, and a real example layout rendered
// from that room's actual dimensions. Nothing here is boilerplate-only.

export function generateStaticParams() {
  return allDormPaths();
}

const areaOf = (r: RoomSummary) =>
  r.length_ft && r.width_ft ? r.length_ft * r.width_ft : (r.sqft ?? 0);

const sqFt = (r: RoomSummary) =>
  r.sqft ?? (r.length_ft && r.width_ft ? Math.round(r.length_ft * r.width_ft) : null);

export async function generateMetadata(props: {
  params: Promise<{ collegeId: string; dormId: string }>;
}): Promise<Metadata> {
  const { collegeId, dormId } = await props.params;
  const found = getDorm(collegeId, dormId);
  if (!found) return {};
  const { school, dorm } = found;
  const measured = dorm.rooms.filter((r) => r.length_ft && r.width_ft).length;
  const types = dorm.rooms.length;
  const sizes = dorm.rooms
    .map((r) => formatDims(r.length_ft, r.width_ft))
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
  return pageMetadata({
    title: `${dorm.name} Room Dimensions`,
    description: `${dorm.name} at ${school.name}: ${types} room type${
      types === 1 ? "" : "s"
    }${sizes ? ` (${sizes})` : ""}, bed sizes, closet sizes, and a to-scale layout you can plan for free.`,
    path: `/colleges/${school.id}/${dorm.id}`,
    ogTitle: `${dorm.name} dorm room dimensions and layouts`,
    ...(measured === 0 ? { noIndex: true } : {}),
  });
}

export default async function DormPage(props: {
  params: Promise<{ collegeId: string; dormId: string }>;
}) {
  const { collegeId, dormId } = await props.params;
  const found = getDorm(collegeId, dormId);
  if (!found) notFound();
  const { school, dorm } = found;

  const place = [school.city, school.state].filter(Boolean).join(", ");
  const measured = dorm.rooms.filter((r) => r.length_ft && r.width_ft);
  const published = measured.filter((r) => !r.dims_estimated);
  const siblings = school.dorms.filter((d) => d.id !== dorm.id).slice(0, 12);

  // Example layout: the biggest measured room in this building, laid out with
  // the same template engine the planner uses, rendered as server-side SVG so
  // it is real, crawlable content rather than a client-only canvas.
  const primary = [...measured].sort((a, b) => areaOf(b) - areaOf(a))[0];
  let preview: {
    room: RoomSummary;
    lengthFt: number;
    widthFt: number;
    furniture: ReturnType<typeof fitTemplateToRoom>;
    isCorridor: boolean;
  } | null = null;
  if (primary?.length_ft && primary?.width_ft) {
    const match = matchTemplate({
      length_ft: primary.length_ft,
      width_ft: primary.width_ft,
      occupants: primary.occupants ?? 2,
      room_type: primary.type,
    });
    preview = {
      room: primary,
      lengthFt: primary.length_ft,
      widthFt: primary.width_ft,
      furniture: fitTemplateToRoom(
        match.template.furniture,
        match.template_id,
        primary.length_ft,
        primary.width_ft
      ),
      isCorridor: match.template_id.startsWith("corridor-"),
    };
  }

  // Real furniture footprints for this room, taken from the fitted layout (the
  // same measurements the planner uses), deduped by piece type.
  const furnitureSpecs = (() => {
    if (!preview) return [];
    const seen = new Set<string>();
    return preview.furniture
      .filter((f) => f.built_in && !seen.has(f.type) && seen.add(f.type))
      .map((f) => ({
        label: f.label.replace(/\s+[AB]$/, ""),
        dims: `${f.width_ft}′ × ${f.length_ft}′`,
      }));
  })();

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Colleges", path: "/colleges" },
    { name: school.name, path: `/colleges/${school.id}` },
    { name: dorm.name, path: `/colleges/${school.id}/${dorm.id}` },
  ];

  const planHref = `/plan?school=${school.id}&dorm=${dorm.id}`;

  return (
    <div>
      <SiteHeader gridClassName="h-[26rem]" />
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
              ...(place ? { address: place } : {}),
            },
          },
        ]}
      />
      <main id="page-content" tabIndex={-1}>
        <section className="mx-auto max-w-5xl px-5 pb-10 pt-10 sm:px-8 sm:pt-14">
          <Breadcrumbs items={crumbs} />
          <h1 className="dm-page-title mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl">
            {dorm.name} <span className="hl">room dimensions</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
            {dorm.rooms.length} room type{dorm.rooms.length === 1 ? "" : "s"} at{" "}
            <Link
              href={`/colleges/${school.id}`}
              className="font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-4 transition-colors hover:text-cobalt"
            >
              {school.name}
            </Link>
            {place ? ` in ${place}` : ""}
            {published.length > 0
              ? `, ${published.length} with dimensions published by the university.`
              : "."}{" "}
            Use them to plan the room to scale before move-in.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <PlanCta
              href={planHref}
              className="inline-block rounded-lg bg-cobalt px-6 py-3 font-semibold text-white transition-colors hover:bg-cobalt-deep"
              freeLabel={`Plan a ${dorm.name} room free`}
              paidLabel={`Plan a ${dorm.name} room`}
            />
            <Link
              href="/methodology"
              className="text-sm text-ink-soft underline-offset-4 transition-colors hover:text-cobalt hover:underline"
            >
              Where these measurements come from
            </Link>
          </div>
        </section>

        {/* Room types: the substance of the page. */}
        <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Room types and sizes
          </h2>
          <div className="dm-editorial-card mt-5 overflow-x-auto rounded-xl border border-ink/10 bg-card">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  <th scope="col" className="px-4 py-3 font-medium">Room type</th>
                  <th scope="col" className="px-4 py-3 font-medium">Sleeps</th>
                  <th scope="col" className="px-4 py-3 font-medium">Dimensions</th>
                  <th scope="col" className="px-4 py-3 font-medium">Floor area</th>
                  <th scope="col" className="px-4 py-3 font-medium">Bed</th>
                </tr>
              </thead>
              <tbody>
                {dorm.rooms.map((r, i) => {
                  const area = sqFt(r);
                  const bed = beddingAdvisory(r.bed_size);
                  return (
                    <tr key={`${r.type}-${i}`} className="border-b border-ink/8 align-top last:border-0">
                      <th scope="row" className="px-4 py-3 font-semibold text-ink">
                        {r.label || formatRoomType(r.type)}
                      </th>
                      <td className="px-4 py-3 text-ink-soft">{r.occupants ?? "Not listed"}</td>
                      <td className="px-4 py-3">
                        <span className="whitespace-nowrap font-mono text-ink">
                          {formatDims(r.length_ft, r.width_ft) ?? "Not published"}
                        </span>
                        {r.dims_estimated && <EstimatedDimsNote className="mt-1 block" />}
                      </td>
                      <td className="px-4 py-3 font-mono text-ink-soft">
                        {area ? `${area} sq ft` : "Not published"}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {r.bed_size === "twin_xl"
                          ? "Twin XL"
                          : r.bed_size === "full_xl"
                            ? "Full XL"
                            : r.bed_size === "full"
                              ? "Full"
                              : "Twin"}
                        {bed?.level === "warning" && (
                          <span className="mt-1 block text-[11px] leading-snug text-ink-soft">
                            {bed.message}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {dorm.rooms.some((r) => r.closet) && (
            <p className="mt-3 text-sm text-ink-soft">
              Closet:{" "}
              {(() => {
                const c = dorm.rooms.find((r) => r.closet)?.closet;
                return c ? `${c.width_ft}′ wide × ${c.depth_ft}′ deep` : "";
              })()}
              , as published for this building.
            </p>
          )}
        </section>

        {/* A real, to-scale example layout for the largest measured room. */}
        {preview && (
          <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Example layout: {preview.room.label || formatRoomType(preview.room.type)}
            </h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
              A starting layout drawn to this room&rsquo;s actual{" "}
              {formatDims(preview.lengthFt, preview.widthFt)} footprint. In the
              planner you can drag, rotate, and swap anything, and the pieces stay
              measured against your walls.
            </p>
            <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start">
              <div className="rounded-xl border border-ink/10 bg-card p-4">
                <StaticRoomView
                  lengthFt={preview.lengthFt}
                  widthFt={preview.widthFt}
                  furniture={preview.furniture}
                  isCorridor={preview.isCorridor}
                />
              </div>
              {furnitureSpecs.length > 0 && (
                <div className="rounded-xl border border-ink/10 bg-card p-5">
                  <h3 className="font-display text-base font-bold tracking-tight">
                    Standard furniture footprints
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    The built-in pieces this layout plans around, at the sizes we
                    use for fit checks.
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {furnitureSpecs.map((f) => (
                      <li
                        key={f.label}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span className="text-ink-soft">{f.label}</span>
                        <span className="shrink-0 whitespace-nowrap font-mono text-xs text-ink">
                          {f.dims}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Internal linking: sibling buildings keep crawl depth shallow. */}
        {siblings.length > 0 && (
          <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Other {school.name} residence halls
            </h2>
            <ul className="mt-5 flex flex-wrap gap-2">
              {siblings.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/colleges/${school.id}/${d.id}`}
                    className="inline-block rounded-lg border border-ink/12 bg-card px-3 py-1.5 text-sm text-ink transition-colors hover:border-cobalt hover:text-cobalt"
                  >
                    {d.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={`/colleges/${school.id}`}
              className="mt-4 inline-block text-sm font-semibold text-cobalt underline-offset-4 hover:underline"
            >
              All {school.dorms.length} {school.name} buildings
            </Link>
          </section>
        )}

        <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
          <div className="rounded-xl bg-ink p-8 text-center sm:p-10">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Plan your {dorm.name} room to the inch.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/80">
              Load this building&rsquo;s real dimensions, arrange a layout that
              fits, set your style and budget, and get a shoppable list.
            </p>
            <PlanCta
              href={planHref}
              className="mt-6 inline-block rounded-lg bg-highlight px-6 py-3 font-semibold text-ink transition-colors hover:bg-white"
              freeLabel="Start planning free"
              paidLabel="Start planning"
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
