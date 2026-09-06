import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import PlanCta from "@/components/site/PlanCta";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import JsonLd from "@/components/site/JsonLd";
import { SCHOOLS, formatDims, getSchool, publishedDimsCount } from "@/lib/schools";
import { pageMetadata, breadcrumbJsonLd, itemListJsonLd, absoluteUrl } from "@/lib/seo";

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
  return pageMetadata({
    title: `${school.name} Dorm Room Planner`,
    description: `Plan your ${school.name} dorm room before move-in. ${school.dorms.length} residence halls${dimsClause}, room-by-room layouts, and a shoppable list. Free.`,
    path: `/colleges/${school.id}`,
  });
}

export default async function CollegePage(props: {
  params: Promise<{ collegeId: string }>;
}) {
  const { collegeId } = await props.params;
  const school = getSchool(collegeId);
  if (!school) notFound();

  const withDims = publishedDimsCount(school);
  const place = [school.city, school.state].filter(Boolean).join(", ");
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Colleges", path: "/colleges" },
    { name: school.name, path: `/colleges/${school.id}` },
  ];

  return (
    <div>
      <SiteHeader gridClassName="h-[26rem]" />
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
            ...(place ? { address: place } : {}),
          },
        ]}
      />
      <main>
        <section className="relative">
          <div className="mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 sm:pt-14">
            <Breadcrumbs items={crumbs} />
            <p className="mt-4 font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
              {place}
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              {school.name} <span className="hl">dorm room planner</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-ink-soft">
              {school.dorms.length} residence halls
              {withDims > 0 && (
                <> · {withDims} room types with real measured dimensions</>
              )}
              . Pick your building, get a layout that fits to the inch, and a
              shoppable list that fits your budget.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <PlanCta
                className="inline-block rounded-lg bg-cobalt px-6 py-3 font-semibold text-white transition-colors hover:bg-cobalt-deep"
                href={`/plan?school=${school.id}`}
                freeLabel="Design your room for free"
                paidLabel="Design your room"
              />
              <Link
                href="/methodology"
                className="text-sm text-ink-soft underline-offset-4 transition-colors hover:text-cobalt hover:underline"
              >
                How we measure these rooms
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {school.name} residence halls
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            Open a building for its room types, measured dimensions, bed and
            closet sizes, and an example layout drawn to scale.
          </p>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {school.dorms.map((d) => {
              const measured = d.rooms.filter((r) => r.length_ft && r.width_ft).length;
              return (
                <li key={d.id}>
                  <Link
                    href={`/colleges/${school.id}/${d.id}`}
                    className="group block h-full rounded-xl border border-ink/10 bg-card p-5 transition-colors hover:border-cobalt"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-base font-bold transition-colors group-hover:text-cobalt">
                        {d.name}
                      </h3>
                      <span className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                        {d.rooms.length} room type{d.rooms.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {d.rooms.slice(0, 5).map((r, i) => (
                        <li
                          key={`${r.type}-${i}`}
                          className="flex items-baseline justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0 text-ink-soft">{r.label}</span>
                          <span className="shrink-0 whitespace-nowrap font-mono text-xs text-ink">
                            {formatDims(r.length_ft, r.width_ft) ??
                              (r.sqft ? `${r.sqft} sq ft` : "size varies")}
                          </span>
                        </li>
                      ))}
                      {d.rooms.length > 5 && (
                        <li className="text-xs text-ink-soft">
                          + {d.rooms.length - 5} more room types
                        </li>
                      )}
                    </ul>
                    <span className="mt-3 inline-block font-mono text-[11px] uppercase tracking-wide text-cobalt">
                      {measured > 0 ? "View dimensions" : "View building"} →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-12 rounded-xl bg-cobalt p-8 text-center">
            <p className="font-display text-2xl font-extrabold tracking-tight text-white">
              Your {school.name} room, planned to the inch.
            </p>
            <Link
              href={`/plan?school=${school.id}`}
              className="mt-4 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-ink transition-colors hover:bg-highlight"
            >
              Start with your building
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
