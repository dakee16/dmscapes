import Footer from "@/components/Footer";
import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import PlanCta from "@/components/site/PlanCta";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import JsonLd from "@/components/site/JsonLd";
import { SCHOOLS } from "@/lib/schools";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "How We Measure Dorm Rooms",
  description:
    "Where Dormscape's dorm room dimensions come from, how they are recorded and verified, what 'estimated' means, and how to report a correction.",
  path: "/methodology",
});

// Live coverage numbers, computed from the shipped index so this page can never
// drift from the data it describes.
const stats = (() => {
  let dorms = 0, rooms = 0, published = 0, estimated = 0, unknown = 0;
  for (const s of SCHOOLS) {
    dorms += s.dorms.length;
    for (const d of s.dorms) {
      for (const r of d.rooms) {
        rooms++;
        if (r.length_ft && r.width_ft) {
          if (r.dims_estimated) estimated++;
          else published++;
        } else unknown++;
      }
    }
  }
  return { schools: SCHOOLS.length, dorms, rooms, published, estimated, unknown };
})();

const TEXT_LINK =
  "font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-4 transition-colors hover:text-cobalt";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "How we measure", path: "/methodology" },
];

export default function MethodologyPage() {
  return (
    <div>
      <SiteHeader gridClassName="h-[26rem]" />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <main id="page-content" tabIndex={-1} className="dm-page relative">
        <div className="mx-auto max-w-[50rem] px-5 py-10 sm:px-8 sm:py-14">
          <Breadcrumbs items={crumbs} />
          <p className="mt-4 font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            Data and methodology
          </p>
          <h1 className="dm-page-title mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            How we measure <span className="hl">dorm rooms.</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Dormscape only works if the numbers are right. This page explains
            exactly where every dimension comes from, how we label the ones we
            are less sure about, and what we refuse to do.
          </p>

          {/* Live coverage */}
          <div className="mt-10 grid grid-cols-2 gap-4 rounded-2xl border border-ink/10 bg-card/70 px-4 py-6 sm:grid-cols-4 sm:px-8">
            {[
              { n: stats.schools.toLocaleString(), l: "Schools" },
              { n: stats.dorms.toLocaleString(), l: "Residence halls" },
              { n: stats.rooms.toLocaleString(), l: "Room types" },
              { n: stats.published.toLocaleString(), l: "Published sizes" },
            ].map((s) => (
              <div key={s.l}>
                <p className="dm-numeric text-3xl font-semibold tracking-tight">
                  {s.n}
                </p>
                <p className="mt-1 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">
                  {s.l}
                </p>
              </div>
            ))}
          </div>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Where the measurements come from
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Every dimension starts at the university. We work from official
              housing sources only: residence-life websites, published room
              dimension tables, official floor plans and room-layout PDFs, and in
              some cases the dimensioned room drawings schools publish as images.
              We do not scrape student forums, listing sites, or apartment
              marketing pages, and we do not use another planner&rsquo;s numbers.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Schools publish this very differently. Some list per-room-type
              dimensions on every hall page. Some publish one average room size
              for a whole building. Some publish nothing at all and only offer a
              virtual tour. We record what each school actually says, and we
              record how specific it was.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              How a room is recorded
            </h2>
            <ul className="mt-4 space-y-3">
              {[
                {
                  t: "Feet, length first",
                  b: "Sizes are stored in feet, normalized so the longer wall is the length. That matches how our layout templates are authored, so a 12 x 16 and a 16 x 12 room resolve to the same plan.",
                },
                {
                  t: "Per room type, not per room",
                  b: "A building gets one entry per room type it offers (single, double, triple, suite). Individual rooms of the same type vary slightly; we plan against the published type.",
                },
                {
                  t: "Bed size is tracked separately",
                  b: "Twin XL is the near-universal default, but plenty of halls use standard twin, full, or full XL. We store the exception when a school documents one, because it changes which bedding actually fits.",
                },
                {
                  t: "Closets when published",
                  b: "Where a school publishes closet dimensions, we store them and draw the closet as a real obstacle in the layout.",
                },
              ].map((row) => (
                <li key={row.t} className="rounded-xl border border-ink/10 bg-card p-5">
                  <h3 className="font-display text-base font-bold tracking-tight">
                    {row.t}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{row.b}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Published, estimated, or blank
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Every size on the site is in one of three states, and we label them
              honestly rather than smoothing over the gaps.
            </p>
            <dl className="mt-5 space-y-4">
              <div className="rounded-xl border border-ink/10 bg-card p-5">
                <dt className="font-display text-base font-bold">
                  Published ({stats.published.toLocaleString()} room types)
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  The university publishes this size. Shown plainly, with no
                  qualifier.
                </dd>
              </div>
              <div className="rounded-xl border border-ink/10 bg-card p-5">
                <dt className="font-display text-base font-bold">
                  Estimated ({stats.estimated.toLocaleString()} room types)
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  The school does not publish a size for this room type, so we
                  use the median of the same room type across schools that do. It
                  is always labeled &ldquo;estimated&rdquo; wherever it appears,
                  so you know to check it with a tape measure.
                </dd>
              </div>
              <div className="rounded-xl border border-ink/10 bg-card p-5">
                <dt className="font-display text-base font-bold">
                  Blank ({stats.unknown.toLocaleString()} room types)
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  No credible source and no comparable room to estimate from. We
                  leave it empty and ask you for the measurement instead of
                  inventing one.
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">
              The rule behind all three: a blank is better than a guess. If we
              cannot source a number, we would rather ask you to{" "}
              <Link href="/blog/how-to-measure-your-dorm-room" className={TEXT_LINK}>
                measure it yourself
              </Link>{" "}
              than quietly make one up.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              How layouts are generated
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Layouts are not decorative mockups. Each starts from a hand-authored
              template validated against real furniture footprints, then gets
              refit to your room&rsquo;s actual dimensions: pieces that hug a wall
              stay against it, everything else keeps its proportional position,
              and footprints are never resized, because real furniture does not
              shrink. Anything that cannot fit is flagged rather than hidden.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              If your room is not a rectangle, or your school is not covered yet,
              you can{" "}
              <Link href="/plan/draw" className={TEXT_LINK}>
                draw the floor plan yourself
              </Link>{" "}
              and we lay furniture out against the walls you drew.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Limits worth knowing
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Published dimensions describe a room type, not your specific room.
              Radiators, angled walls, built-ins, door swings, and lofted or
              bunked furniture all change what actually fits. Treat a Dormscape
              layout as a well-measured starting point and confirm anything tight
              with a tape measure on move-in day. Our{" "}
              <Link href="/terms" className={TEXT_LINK}>
                Terms
              </Link>{" "}
              say the same thing in the formal version.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Found something wrong?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Corrections are welcome and they are the fastest way this data gets
              better. Tell us the school, the building, and the room type, and
              ideally where the university publishes the real number.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-block rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cobalt"
              >
                Report a correction
              </Link>
              <Link
                href="/add-school"
                className="inline-block rounded-lg border border-ink/15 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-cobalt/50 hover:text-cobalt"
              >
                Add my school
              </Link>
            </div>
          </section>

          <section className="mt-14">
            <div className="rounded-2xl bg-ink px-6 py-10 text-center sm:px-12">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                See it on your own room.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-white/80">
                Pick your building and get a layout measured against its real
                dimensions.
              </p>
              <PlanCta className="mt-6 inline-block rounded-lg bg-highlight px-6 py-3 font-semibold text-ink transition-colors hover:bg-white" />
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
