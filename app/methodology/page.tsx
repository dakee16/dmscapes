import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import Crumbs from "@/components/ds/Crumbs";
import TapeStats from "@/components/ds/TapeStats";
import CtaBand from "@/components/ds/CtaBand";
import { ArrowRight, Check, CloseIcon } from "@/components/ds/Icons";
import PlanCta from "@/components/site/PlanCta";
import JsonLd from "@/components/site/JsonLd";
import { RuleArt, SameScale } from "@/components/methodology/MethodologyArt";
import { SCHOOLS } from "@/lib/schools";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";
import css from "@/components/methodology/Methodology.module.css";

export const metadata: Metadata = pageMetadata({
  title: "How We Measure Dorm Rooms",
  description:
    "Where Dormscape's dorm room dimensions come from, how they are recorded and verified, what 'estimated' means, and how to report a correction.",
  path: "/methodology",
});

// Live coverage numbers, computed from the shipped index so this page can never
// drift from the data it describes. Published = the school's own size;
// estimated = a same-type median; blank = no size at all.
const stats = (() => {
  let dorms = 0, rooms = 0, published = 0, estimated = 0, unknown = 0;
  for (const s of SCHOOLS) {
    dorms += s.dorms.length;
    for (const d of s.dorms) {
      for (const r of d.rooms) {
        rooms++;
        if (r.dims_estimated) estimated++;
        else if (r.length_ft && r.width_ft) published++;
        else unknown++;
      }
    }
  }
  return { schools: SCHOOLS.length, dorms, rooms, published, estimated, unknown };
})();

const crumbs = [
  { name: "Home", path: "/" },
  { name: "How we measure", path: "/methodology" },
];

const fmt = (n: number) => n.toLocaleString("en-US");
const pct = (n: number) => Math.round((n / stats.rooms) * 100);

const RULES = [
  {
    kind: "feet",
    t: "Feet, length first",
    b: "Sizes are stored in feet, normalized so the longer wall is the length. That matches how our layout templates are authored, so a 12 x 16 and a 16 x 12 room resolve to the same plan.",
  },
  {
    kind: "type",
    t: "Per room type, not per room",
    b: "A building gets one entry per room type it offers (single, double, triple, suite). Individual rooms of the same type vary slightly; we plan against the published type.",
  },
  {
    kind: "bed",
    t: "Bed size is tracked separately",
    b: "Twin XL is the near-universal default, but plenty of halls use standard twin, full, or full XL. We store the exception when a school documents one, because it changes which bedding actually fits.",
  },
  {
    kind: "closet",
    t: "Closets when published",
    b: "Where a school publishes closet dimensions, we store them and draw the closet as a real obstacle in the layout.",
  },
] as const;

const STATES = [
  {
    k: "published",
    label: "Published",
    n: stats.published,
    body: "The university publishes this size. Shown plainly, with no qualifier.",
  },
  {
    k: "estimated",
    label: "Estimated",
    n: stats.estimated,
    body: (
      <>
        The school does not publish a size for this room type, so we use the median of the same room type across
        schools that do. It is always labeled &ldquo;estimated&rdquo; wherever it appears, so you know to check it with
        a tape measure.
      </>
    ),
  },
  {
    k: "blank",
    label: "Blank",
    n: stats.unknown,
    body: "No credible source and no comparable room to estimate from. We leave it empty and ask you for the measurement instead of inventing one.",
  },
];

const LIMITS = [
  "Published dimensions describe a room type, not your specific room.",
  "Radiators, angled walls, built-ins, door swings, and lofted or bunked furniture all change what actually fits.",
  "Treat a Dormscape layout as a well-measured starting point.",
  "Confirm anything tight with a tape measure on move-in day.",
];

export default function MethodologyPage() {
  return (
    <PageShell navOverlay>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <PageHero
        bg="#F6EFE4"
        className={css.hero}
        crumbs={<Crumbs items={crumbs} />}
        eyebrow="Data and methodology"
        lines={[
          { text: "How we measure", riso: true },
          { text: "dorm rooms.", serif: true },
        ]}
        lede={
          <p>
            Dormscape only works if the numbers are right. This page explains exactly where every dimension comes from,
            how we label the ones we are less sure about, and what we refuse to do.
          </p>
        }
        art={{
          src: "/redesign/site-methodology-blueprint.jpg",
          alt: "A blue floor-plan blueprint of an Atherton Hall double, 16.4 by 12 feet, stamped Published, with an architect's scale ruler, a pencil and a rubber stamp; a white sheet stamped Estimated lies underneath.",
          ratio: 1360 / 1320,
          position: "30% 50%",
        }}
      />

      <div className={css.tape}>
        <TapeStats
          label="Coverage"
          items={[
            { n: stats.schools, l: "Schools" },
            { n: stats.dorms, l: "Residence halls" },
            { n: stats.rooms, l: "Room types" },
            { n: stats.published, l: "Published sizes" },
          ].map((s) => (
            <>
              <span className={`ds-num ${css.tapeNum}`} data-count={s.n}>
                {fmt(s.n)}
              </span>
              {s.l}
            </>
          ))}
        />
      </div>

      <section className="ds-section" aria-labelledby="sources-title">
        <div className="ds-wrap">
          <Headline
            id="sources-title"
            className="ds-h2 ds-h2--inline"
            lines={[{ text: "Where the measurements" }, { text: "come from.", serif: true }]}
          />
          <div className={css.cols} data-reveal="">
            <p>
              Every dimension starts at the university. We work from official housing sources only: residence-life
              websites, published room dimension tables, official floor plans and room-layout PDFs, and in some cases
              the dimensioned room drawings schools publish as images. We do not scrape student forums, listing sites,
              or apartment marketing pages, and we do not use another planner&rsquo;s numbers.
            </p>
            <p>
              Schools publish this very differently. Some list per-room-type dimensions on every hall page. Some
              publish one average room size for a whole building. Some publish nothing at all and only offer a virtual
              tour. We record what each school actually says, and we record how specific it was.
            </p>
          </div>
          <div className={css.sourceCards}>
            <div className={css.okCard} data-reveal="">
              <h3 className={css.cardHead}>Official housing sources only</h3>
              <ul className={css.checks}>
                {[
                  "Residence-life websites",
                  "Published room dimension tables",
                  "Official floor plans and room-layout PDFs",
                  "Dimensioned room drawings",
                ].map((t) => (
                  <li key={t}>
                    <Check size={22} strokeWidth={3} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={css.noCard} data-reveal="" style={{ "--i": 1 } as React.CSSProperties}>
              <h3 className={css.cardHead}>Never used</h3>
              <ul className={css.checks}>
                {["Student forums", "Listing sites", "Apartment marketing pages", "Another planner’s numbers"].map(
                  (t) => (
                    <li key={t}>
                      <CloseIcon size={22} />
                      <span>{t}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={`ds-section ${css.record}`} aria-labelledby="record-title">
        <div className="ds-wrap">
          <p className={`ds-eyebrow ${css.eyebrow}`} data-reveal="">
            House rules
          </p>
          <Headline id="record-title" className="ds-h2" lines={[{ text: "How a room is recorded" }]} />
          <ul className={css.rules}>
            {RULES.map((row, i) => (
              <li key={row.t} data-reveal="" style={{ "--i": i } as React.CSSProperties}>
                <article className={css.rule}>
                  <RuleArt kind={row.kind} />
                  <h3>{row.t}</h3>
                  <p>{row.b}</p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ds-section" aria-labelledby="states-title">
        <div className="ds-wrap">
          <Headline
            id="states-title"
            className="ds-h2 ds-h2--inline"
            lines={[{ text: "Published, estimated," }, { text: "or blank.", serif: true }]}
          />
          <p className={css.intro} data-reveal="">
            Every size on the site is in one of three states, and we label them honestly rather than smoothing over the
            gaps.
          </p>

          <figure className={css.split} data-reveal="">
            <figcaption className={css.legend}>
              {STATES.map((s) => (
                <span key={s.k} className={css.key}>
                  <span className={css.swatch} data-k={s.k} aria-hidden="true" />
                  {s.label} · {fmt(s.n)}
                </span>
              ))}
              <span className={css.of}>of {fmt(stats.rooms)} room types</span>
            </figcaption>
            <div
              className={css.bar}
              role="img"
              aria-label={`Of ${fmt(stats.rooms)} room types, ${fmt(stats.published)} are published, ${fmt(stats.estimated)} estimated and ${fmt(stats.unknown)} blank`}
            >
              {STATES.map((s, i) => (
                <span
                  key={s.k}
                  className={css.seg}
                  data-k={s.k}
                  data-bar=""
                  style={{ flexGrow: s.k === "blank" ? undefined : s.n, "--i": i } as React.CSSProperties}
                >
                  {s.k !== "blank" && pct(s.n) >= 5 ? `${pct(s.n)}%` : null}
                </span>
              ))}
            </div>
          </figure>

          <dl className={css.states}>
            {STATES.map((s, i) => (
              <div key={s.k} className={css.state} data-reveal="" style={{ "--i": i } as React.CSSProperties}>
                <dt>
                  <span className={css.stamp} data-k={s.k} data-pop="" style={{ "--i": i + 3 } as React.CSSProperties}>
                    {s.label}
                  </span>
                  <span className={css.count}>{fmt(s.n)} room types</span>
                </dt>
                <dd>{s.body}</dd>
              </div>
            ))}
          </dl>

          <div className={css.maxim} data-reveal="">
            <p className={css.maximLead}>The rule behind all three</p>
            <p className={css.maximQuote}>&ldquo;A blank is better than a guess.&rdquo;</p>
            <p className={css.maximBody}>
              If we cannot source a number, we would rather ask you to{" "}
              <Link href="/blog/how-to-measure-your-dorm-room" className="ds-link">
                measure it yourself
              </Link>{" "}
              than quietly make one up.
            </p>
          </div>
        </div>
      </section>

      <section className={`ds-section ${css.layouts}`} aria-labelledby="layouts-title">
        <div className={`ds-wrap ${css.layoutsGrid}`}>
          <div className={css.layoutsCopy}>
            <Headline
              id="layouts-title"
              className="ds-h2"
              lines={[{ text: "How layouts are" }, { text: "generated.", serif: true }]}
            />
            <div data-reveal="">
              <p>
                Layouts are not decorative mockups. Each starts from a hand-authored template validated against real
                furniture footprints, then gets refit to your room&rsquo;s actual dimensions: pieces that hug a wall stay
                against it, and everything else keeps its proportional position. Anything that cannot fit is flagged
                rather than hidden.
              </p>
              <p className={css.callout}>Footprints are never resized, because real furniture does not shrink.</p>
              <p>
                If your room is not a rectangle, or your school is not covered yet, you can{" "}
                <Link href="/plan/draw" className="ds-link">
                  draw the floor plan yourself
                </Link>{" "}
                and we lay furniture out against the walls you drew.
              </p>
            </div>
          </div>
          <SameScale />
        </div>
      </section>

      <section className={`ds-section ${css.limits}`} aria-labelledby="limits-title">
        <div className="ds-wrap">
          <Headline id="limits-title" className="ds-h2" lines={[{ text: "Limits worth knowing" }]} />
          <ol className={css.limitGrid}>
            {LIMITS.map((t, i) => (
              <li key={t} data-reveal="" style={{ "--i": i } as React.CSSProperties}>
                <div className={css.limit} data-tone={i === LIMITS.length - 1 ? "yellow" : undefined}>
                  <span className={css.limitNum} aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className={css.limitText}>{t}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className={css.limitsNote} data-reveal="">
            Our{" "}
            <Link href="/terms" className="ds-link">
              Terms
            </Link>{" "}
            say the same thing in the formal version.
          </p>
        </div>
      </section>

      <section className="ds-section" aria-labelledby="fix-title" id="corrections">
        <div className="ds-wrap">
          <h2 id="fix-title" className={css.fixTitle} data-reveal="">
            Found something wrong?
          </h2>
          <p className={css.fixBody} data-reveal="">
            Corrections are welcome and they are the fastest way this data gets better. Tell us the school, the
            building, and the room type, and ideally where the university publishes the real number.
          </p>
          <div className={css.fixActions} data-reveal="">
            <Link href="/contact" className="ds-btn ds-btn--ink-yellow">
              Report a correction
              <ArrowRight />
            </Link>
            <Link href="/add-school" className="ds-btn ds-btn--ghost">
              Add my school
            </Link>
          </div>
        </div>
      </section>

      <CtaBand
        tone="blue"
        lead="See it on"
        tail="your own room."
        note="Pick your building and get a layout measured against its real dimensions."
      >
        <PlanCta
          className="ds-btn ds-btn--yellow ds-btn--lg"
          freeLabel="Plan my room for free"
          icon={<ArrowRight size={20} />}
        />
      </CtaBand>
    </PageShell>
  );
}
