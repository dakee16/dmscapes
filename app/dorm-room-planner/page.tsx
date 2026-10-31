import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import Crumbs from "@/components/ds/Crumbs";
import TapeStats from "@/components/ds/TapeStats";
import CtaBand from "@/components/ds/CtaBand";
import SchoolSearch from "@/components/ds/SchoolSearch";
import SectionRail from "@/components/ds/SectionRail";
import { ArrowRight } from "@/components/ds/Icons";
import PlanCta from "@/components/site/PlanCta";
import JsonLd from "@/components/site/JsonLd";
import Reviews from "@/components/site/Reviews";
import ScalePlan from "@/components/hall/ScalePlan";
import { HALL_COUNT, LAYOUT_COUNT, SCHOOL_COUNT } from "@/lib/home-data";
import { ft } from "@/lib/room-preview";
import { BED_MODES } from "@/lib/bed-config";
import { MIN_REVIEWS_FOR_RATING, publicReviews } from "@/lib/reviews";
import { PLANNER_FAQS, S, bedSqFt, desk, dims, double, doubleFit, doubleOpen, fmt, inches, rules } from "@/lib/guide-planner";
import { pageMetadata, fitDescription, fitTitle, breadcrumbJsonLd, softwareApplicationJsonLd, absoluteUrl, guidePageJsonLd } from "@/lib/seo";
import { shortDate } from "@/components/blog/topics";
import dsz from "@/components/dorm-size/DormSize.module.css";
import css from "@/components/planner-landing/Landing.module.css";

// The page for people searching "dorm room planner". Every number comes from the
// school data, lib/plan or the planner's own furniture and bed settings; reviews
// and their stars appear only once real, approved reviews exist (lib/reviews).
export const revalidate = 86400;

const PATH = "/dorm-room-planner";
const UPDATED = "2026-10-30";
const TITLE = fitTitle(
  `Dorm Room Planner: Free, With Real Room Sizes for ${SCHOOL_COUNT} Colleges`,
  "Dorm Room Planner: Free, With Real Room Sizes",
  "Free Dorm Room Planner",
);
const DESCRIPTION = fitDescription(
  `Plan your dorm room to scale with the real dimensions of ${fmt(HALL_COUNT)} residence halls at ${SCHOOL_COUNT} colleges. Pick your room, a style and a budget, and get a layout that fits and a shopping list. Free to start.`,
  `Plan your dorm room to scale with real room dimensions from ${SCHOOL_COUNT} colleges. Get a layout that fits and a shopping list. Free to start.`,
);

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Dorm room planner", path: PATH },
];

const STEPS = [
  {
    name: "Find your room",
    text: `Search your school, then pick your residence hall and room type. The planner loads the room's dimensions as your housing office publishes them, for ${fmt(HALL_COUNT)} halls at ${SCHOOL_COUNT} schools; any estimated size is labelled.`,
  },
  {
    name: "Pick a style and a budget",
    text: "Choose a vibe for the room and set what you want to spend. Three vibes are free, and Plus unlocks all nine.",
  },
  {
    name: "Get a layout that fits",
    text: "Beds, desks and dressers are placed to scale in your actual room, with a shopping list matched to your budget and live Amazon links.",
  },
  {
    name: "Adjust and share it",
    text: "Drag pieces around in 2D, swap products and share the room with a link. Pro adds 3D and a shared room for you and your roommates.",
  },
];

const TOOLS = [
  { href: "/dorm-room-size", title: "Dorm room sizes", text: "Typical single, double and triple sizes, and sizes by school." },
  { href: "/dorm-bed-rules", title: "Loft & bunk rules", text: "Whether each school lets you loft or bunk your bed, with sources." },
  { href: "/dorm-rug-size", title: "Rug size calculator", text: "The biggest standard rug that fits your room's open floor." },
  { href: "/loft-bed-clearance", title: "Under-loft clearance", text: "What fits under a lofted or raised bed, inch by inch." },
  { href: "/twin-xl-sheets", title: "Twin XL sheets", text: "Which bed your dorm has, and which sheets fit it." },
  { href: "/compare", title: "Compare planners", text: "dormscape next to other dorm room planners, feature by feature." },
];

export default async function DormRoomPlannerPage() {
  const reviews = await publicReviews();
  const app = softwareApplicationJsonLd();
  return (
    <PageShell navOverlay>
      <SectionRail
        sections={[
          { id: "how-title", label: "How it works" },
          { id: "beds-title", label: "Bed setups" },
          { id: "sizes-title", label: "Real sizes" },
          { id: "tools-title", label: "Tools" },
          ...(reviews.count ? [{ id: "reviews-title", label: "Reviews" }] : []),
          { id: "faq-title", label: "Questions" },
        ]}
      />
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          guidePageJsonLd({ path: PATH, name: "Plan your dorm in your real room.", description: DESCRIPTION, datePublished: "2026-10-28", dateModified: UPDATED }),
          reviews.count >= MIN_REVIEWS_FOR_RATING
            ? { ...app, aggregateRating: { "@type": "AggregateRating", ratingValue: reviews.average, reviewCount: reviews.count, bestRating: 5, worstRating: 1 } }
            : app,
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "How to plan a dorm room with dormscape",
            url: absoluteUrl(PATH),
            step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: PLANNER_FAQS.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          },
        ]}
      />
      <PageHero
        bg="var(--ds-sky)"
        crumbs={<Crumbs items={crumbs} />}
        eyebrow={
          <>
            {SCHOOL_COUNT} schools · {fmt(HALL_COUNT)} halls · free to start
          </>
        }
        lines={[
          { text: "Plan your dorm", riso: true },
          { text: "in your real room.", serif: true },
        ]}
        lede={
          <p>
            Pick your school, residence hall and room type, and dormscape lays your room out to scale with the dimensions
            your housing office publishes: beds, desks and dressers where they fit, and a shopping list that fits your
            budget. Free to start, no account needed.
          </p>
        }
        visual={
          <figure className={dsz.heroPlan}>
            <ScalePlan
              uid="planner-hero"
              draw="load"
              room={doubleFit}
              title={`A typical double dorm room, ${ft(double.lengthFt)} by ${ft(double.widthFt)} feet, laid out the way the planner starts it`}
              className={dsz.plan}
            />
            <figcaption>
              <span>
                Typical double · {dims(double)} · about {fmt(doubleOpen)} sq ft open
              </span>
              <span className="ds-mono">1 square = 1 ft</span>
            </figcaption>
          </figure>
        }
      >
        <div className={css.start}>
          <SchoolSearch to="plan" button="Plan my room" placeholder={`Search ${SCHOOL_COUNT} schools`} />
          <p className={css.startLinks}>
            <Link href="/plan/draw" className="ds-link">
              School not listed? Draw your room
            </Link>
            <Link href="/plan?typical=2" className="ds-link">
              No room yet? Start with a typical double
            </Link>
          </p>
        </div>
      </PageHero>

      <TapeStats
        label="What the planner knows"
        items={[
          <>{SCHOOL_COUNT} schools</>,
          <>{fmt(HALL_COUNT)} residence halls</>,
          <>{fmt(LAYOUT_COUNT)} room types</>,
          <>Typical double · {fmt(double.median)} sq ft</>,
        ]}
      />

      <section className="ds-section" aria-labelledby="how-title">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            How the dorm room planner works
          </p>
          <Headline id="how-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Four steps," }, { text: "one real room.", serif: true }]} />
          <ol className={css.steps}>
            {STEPS.map((s) => (
              <li key={s.name} data-reveal="">
                <h3>{s.name}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`ds-section ${dsz.numbers}`} aria-labelledby="beds-title">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Dorm room layout ideas
          </p>
          <Headline id="beds-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Decide the beds" }, { text: "first.", serif: true }]} />
          <p className={dsz.caption} data-reveal="">
            The bed is the biggest thing in the room, so its height decides what fits around it. These are the setups you can
            give any bed in a dormscape workspace, with the space the planner leaves underneath.
          </p>
          <ul className={css.setups}>
            <li data-reveal="">
              <b>{BED_MODES.standard.label}</b>
              <strong>~{inches(BED_MODES.standard.underside)} in</strong>
              <p>Under the bed: flat storage bins. Both beds on the floor, usually along opposite walls in a double.</p>
            </li>
            <li data-reveal="">
              <b>{BED_MODES.raised.label}</b>
              <strong>~{inches(BED_MODES.raised.underside)} in</strong>
              <p>Raised on its frame or risers for taller storage underneath, where your hall allows it.</p>
            </li>
            <li data-reveal="">
              <b>{BED_MODES.lofted.label}</b>
              <strong>~{inches(BED_MODES.lofted.underside)} in</strong>
              <p>
                High enough for a {inches(desk.h)}-inch desk underneath, which gives the floor back. Check{" "}
                <Link href="/loft-bed-clearance" className="ds-link">
                  what fits under a loft
                </Link>
                .
              </p>
            </li>
            <li data-reveal="">
              <b>{BED_MODES.bunked.label}</b>
              <strong>+{bedSqFt} sq ft</strong>
              <p>Two beds stacked frees a whole Twin XL footprint of floor, often enough for a rug or a second chair.</p>
            </li>
          </ul>
          <div className={css.rules} data-reveal="">
            <p>
              {rules.schools
                ? `Your hall decides which of these you can have. Of the ${rules.schools} schools whose rules we've collected from their housing pages, ${rules.loft.yes} allow lofting and ${rules.bunk.yes} allow bunking, and more allow them only in some halls.`
                : "Your hall decides which of these you can have, so check your housing office's furniture rules before you plan around a loft or bunks."}
            </p>
            <Link href="/dorm-bed-rules" className="ds-btn ds-btn--ink ds-btn--sm">
              Loft & bunk rules by school <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <section className="ds-section" aria-labelledby="sizes-title">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Dorm room dimensions
          </p>
          <Headline id="sizes-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Real sizes," }, { text: "not guesses.", serif: true }]} />
          <div className={dsz.tableWrap} data-reveal="">
            <table className="ds-table">
              <thead>
                <tr>
                  <th scope="col">Room</th>
                  <th scope="col">Typical size</th>
                  <th scope="col">Floor area</th>
                  <th scope="col">Most rooms</th>
                  <th scope="col">Per person</th>
                </tr>
              </thead>
              <tbody>
                {S.byType.map((t) => (
                  <tr key={t.occupants}>
                    <th scope="row">{t.occupants === 1 ? "Single" : t.occupants === 2 ? "Double" : "Triple"}</th>
                    <td>{dims(t)}</td>
                    <td>{fmt(t.median)} sq ft</td>
                    <td>
                      {fmt(t.p25)}–{fmt(t.p75)} sq ft
                    </td>
                    <td>{fmt(t.perPerson)} sq ft</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={dsz.caption}>
            Medians of {fmt(S.rooms)} room sizes published by the housing offices of {S.schools}{" "}colleges. Your room can be
            different: the planner uses your own hall&apos;s published size, and{" "}
            <Link href="/dorm-room-size" className="ds-link">
              dorm room sizes
            </Link>{" "}
            breaks them down by school.
          </p>
        </div>
      </section>

      <section className={`ds-section ${dsz.numbers}`} aria-labelledby="tools-title">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Free dorm planning tools
          </p>
          <Headline id="tools-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Before you" }, { text: "buy anything.", serif: true }]} />
          <ul className={css.tools}>
            {TOOLS.map((t) => (
              <li key={t.href} data-reveal="">
                <Link href={t.href}>
                  <strong>{t.title}</strong>
                  <span>{t.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Reviews {...reviews} />

      <section className="ds-section" aria-labelledby="faq-title">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Dorm room planner questions
          </p>
          <Headline id="faq-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Short answers," }, { text: "straight from the planner.", serif: true }]} />
          <div className={dsz.answers}>
            {PLANNER_FAQS.map(({ q, a }) => (
              <div key={q} data-reveal="">
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </div>
          <p className={dsz.caption} style={{ marginTop: 32 }}>
            Updated <time dateTime={UPDATED}>{shortDate(UPDATED)}</time>. Room sizes come from what each school&apos;s housing
            office publishes.
          </p>
        </div>
      </section>

      <CtaBand lead="Your dorm," tail="planned to the inch." note="Find your hall, see your room drawn to scale, then lay it out for free.">
        <PlanCta href="/plan" className="ds-btn ds-btn--yellow ds-btn--lg" freeLabel="Plan my room free" paidLabel="Plan my room" icon={<ArrowRight />} />
      </CtaBand>
    </PageShell>
  );
}
