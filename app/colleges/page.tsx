import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import JsonLd from "@/components/site/JsonLd";
import { SCHOOLS } from "@/lib/schools";
import { pageMetadata, breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo";

const DORM_COUNT = SCHOOLS.reduce((n, s) => n + s.dorms.length, 0);

export const metadata: Metadata = pageMetadata({
  title: "Dorm Room Dimensions by College",
  description: `Browse ${SCHOOLS.length} colleges and ${DORM_COUNT} residence halls with dorm room dimensions preloaded. Pick your school and building, then plan your exact room free.`,
  path: "/colleges",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Colleges", path: "/colleges" },
];

export default function CollegesPage() {
  return (
    <div>
      <SiteHeader gridClassName="h-[28rem]" />
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          itemListJsonLd(
            "Colleges with dorm room dimensions",
            SCHOOLS.map((s) => ({ name: s.name, path: `/colleges/${s.id}` }))
          ),
        ]}
      />
      <main>
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <Breadcrumbs items={crumbs} />
          <p className="mt-4 font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            {SCHOOLS.length} schools · {DORM_COUNT.toLocaleString()} residence halls
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Find your <span className="hl">campus.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            We&rsquo;ve measured the dorms so you don&rsquo;t have to. Pick your
            school for its residence halls, then open a building to see room
            types, measured dimensions, and an example layout drawn to scale.
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SCHOOLS.map((s) => {
              const rooms = s.dorms.reduce((n, d) => n + d.rooms.length, 0);
              return (
                <li key={s.id}>
                  <Link
                    href={`/colleges/${s.id}`}
                    className="block rounded-xl border border-ink/10 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-cobalt hover:shadow-md"
                  >
                    <h2 className="font-display text-lg font-bold tracking-tight">
                      {s.name}
                    </h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      {[s.city, s.state].filter(Boolean).join(", ")}
                    </p>
                    <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                      {s.dorms.length} buildings · {rooms} room types
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-12 rounded-xl border border-dashed border-ink/20 bg-card/60 p-6 text-center">
            <p className="font-medium">Don&rsquo;t see your school? It takes 30 seconds.</p>
            <Link
              href="/add-school"
              className="mt-3 inline-block rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cobalt"
            >
              Add my school
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
