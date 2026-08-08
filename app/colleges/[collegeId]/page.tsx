import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import PlanCta from "@/components/site/PlanCta";
import { SCHOOLS, formatDims, getSchool } from "@/lib/schools";

// SEO pages targeting "[College Name] dorm room layout" queries.
export function generateStaticParams() {
  return SCHOOLS.map((s) => ({ collegeId: s.id }));
}

export async function generateMetadata(props: {
  params: Promise<{ collegeId: string }>;
}): Promise<Metadata> {
  const { collegeId } = await props.params;
  const school = getSchool(collegeId);
  if (!school) return {};
  const title = `${school.name} Dorm Room Planner`;
  const description = `Plan your ${school.name} dorm room before move-in. ${school.dorms.length} residence halls with real room dimensions, layout templates, and a shoppable list. Free.`;
  return {
    title,
    description,
    openGraph: {
      title: `${title} | Dormscape`,
      description,
      siteName: "Dormscape",
      type: "website",
      url: `/colleges/${school.id}`,
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "Dormscape, the free AI dorm room planner",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Dormscape`,
      description,
      images: ["/og.png"],
    },
  };
}

export default async function CollegePage(props: {
  params: Promise<{ collegeId: string }>;
}) {
  const { collegeId } = await props.params;
  const school = getSchool(collegeId);
  if (!school) notFound();

  const withDims = school.dorms.reduce(
    (n, d) => n + d.rooms.filter((r) => r.length_ft && r.width_ft).length,
    0
  );

  return (
    <div>
      <SiteHeader gridClassName="h-[26rem]" />
      <main>
        <section className="relative">
          <div className="mx-auto max-w-6xl px-5 pb-12 pt-14 sm:px-8 sm:pt-20">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
              {[school.city, school.state].filter(Boolean).join(", ")}
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
            <PlanCta
              className="mt-7 inline-block rounded-lg bg-cobalt px-6 py-3 font-semibold text-white transition-colors hover:bg-cobalt-deep"
              freeLabel="Design your room for free"
              paidLabel="Design your room"
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Supported buildings
          </h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {school.dorms.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-ink/10 bg-card p-5"
              >
                <h3 className="font-display text-base font-bold">{d.name}</h3>
                <ul className="mt-2 space-y-1">
                  {d.rooms.slice(0, 6).map((r, i) => (
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
                  {d.rooms.length > 6 && (
                    <li className="text-xs text-ink-soft">
                      + {d.rooms.length - 6} more room types
                    </li>
                  )}
                </ul>
              </li>
            ))}
          </ul>

          <div className="mt-12 rounded-xl bg-cobalt p-8 text-center">
            <p className="font-display text-2xl font-extrabold tracking-tight text-white">
              Your {school.name} room, planned to the inch.
            </p>
            <Link
              href="/plan"
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
