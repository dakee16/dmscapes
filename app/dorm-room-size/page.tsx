import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import Crumbs from "@/components/ds/Crumbs";
import TapeStats from "@/components/ds/TapeStats";
import CtaBand from "@/components/ds/CtaBand";
import SchoolSearch from "@/components/ds/SchoolSearch";
import { ArrowRight } from "@/components/ds/Icons";
import PlanCta from "@/components/site/PlanCta";
import JsonLd from "@/components/site/JsonLd";
import ScalePlan from "@/components/hall/ScalePlan";
import { SCHOOLS } from "@/lib/schools";
import { dormSizeStats, MAX_SQFT_PER_PERSON, MIN_SCHOOL_ROOMS, type TypeStats } from "@/lib/dorm-sizes";
import { fitRoom, ft, type FittedRoom } from "@/lib/room-preview";
import { pageMetadata, fitDescription, breadcrumbJsonLd, absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import css from "@/components/dorm-size/DormSize.module.css";

// Every number on this page comes from the published sizes in the school index
// (lib/dorm-sizes); nothing is typed in by hand.
const S = dormSizeStats(SCHOOLS);
const [single, double, triple] = S.byType;

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const NAME: Record<number, string> = { 1: "Single", 2: "Double", 3: "Triple" };
const dims = (t: TypeStats) => `${ft(t.lengthFt)} × ${ft(t.widthFt)} ft`;
const twinXl = Math.round(S.twinXlShare * 100);

// The typical room for each type, fitted with the planner's starting furniture.
const typical = S.byType.map((t) => ({
  t,
  fit: fitRoom({
    type: NAME[t.occupants].toLowerCase(),
    label: NAME[t.occupants],
    occupants: t.occupants,
    length_ft: t.lengthFt,
    width_ft: t.widthFt,
    sqft: null,
    bed_size: "twin_xl",
    closet: null,
  }) as FittedRoom,
}));
// One scale for all three cards, sized so the longest fits a narrow card.
const ppf = Math.min(18, 300 / (Math.max(...typical.map((x) => x.fit.lengthFt)) + 1.75));

const PATH = "/dorm-room-size";
const TITLE = "How Big Is a Dorm Room? Average Dorm Room Size";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: fitDescription(
    `The average dorm room is ${fmt(double.median)} sq ft for a double (${dims(double)}) and ${fmt(single.median)} sq ft for a single, from ${fmt(S.rooms)} room sizes published by ${S.schools} colleges.`,
    `The average double dorm room is ${fmt(double.median)} sq ft (${dims(double)}), from ${fmt(S.rooms)} room sizes published by ${S.schools} colleges.`
  ),
  path: PATH,
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Dorm room size", path: PATH },
];

const answers = [
  {
    q: "What is the average dorm room size?",
    a: `The typical double dorm room is ${dims(double)}, about ${fmt(double.median)} square feet. Averaged the other way (the mean), doubles come to ${fmt(double.mean)} sq ft, pulled up by a few unusually large rooms. A typical single is ${fmt(single.median)} sq ft and a triple ${fmt(triple.median)} sq ft.`,
  },
  {
    q: "How big is a single dorm room?",
    a: `A typical single is ${dims(single)}, about ${fmt(single.median)} sq ft. Half of all published singles fall between ${fmt(single.p25)} and ${fmt(single.p75)} sq ft.`,
  },
  {
    q: "How big is a double dorm room?",
    a: `A typical double is ${dims(double)}, about ${fmt(double.median)} sq ft, or ${fmt(double.perPerson)} sq ft per person. Most doubles fall between ${fmt(double.p25)} and ${fmt(double.p75)} sq ft.`,
  },
  {
    q: "How big is a triple dorm room?",
    a: `A typical triple is ${dims(triple)}, about ${fmt(triple.median)} sq ft, or ${fmt(triple.perPerson)} sq ft per person, the least floor per person of any room type.`,
  },
  {
    q: "What size bed comes in a dorm room?",
    a: `Twin XL. ${twinXl}% of the published rooms here come with Twin XL beds, so buy Twin XL sheets unless your housing office says otherwise.`,
  },
  {
    q: "Why is my dorm room a different size?",
    a: "Sizes change by school, building and room type, and older halls vary room to room. These figures describe room types as schools publish them, not any one room, so check your own hall before you buy.",
  },
];

export default function DormRoomSizePage() {
  return (
    <PageShell navOverlay>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "Dorm room sizes published by US colleges",
            description: `Length, width and floor area of ${fmt(S.rooms)} single, double and triple dorm room types, as published by the housing offices of ${S.schools} US colleges, with typical sizes by room type and by college.`,
            url: absoluteUrl(PATH),
            creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            isAccessibleForFree: true,
            spatialCoverage: "United States",
            measurementTechnique: "Room dimensions as published by each college's housing office; estimated sizes excluded",
            variableMeasured: ["Room length (ft)", "Room width (ft)", "Floor area (sq ft)", "Occupants"],
          },
        ]}
      />
      <PageHero
        bg="var(--ds-sky)"
        crumbs={<Crumbs items={crumbs} />}
        eyebrow={<>{fmt(S.rooms)} published rooms · {S.schools} colleges</>}
        lines={[
          { text: "How big is a", riso: true },
          { text: "dorm room?", serif: true },
        ]}
        lede={
          <p>
            {`A typical double dorm room is ${dims(double)}, about ${fmt(double.median)} square feet. A single is about ${fmt(single.median)} sq ft and a triple about ${fmt(triple.median)}. These are the middle values of ${fmt(S.rooms)} room sizes that ${S.schools} colleges publish, so you know what's normal before you find your own room.`}
          </p>
        }
        visual={
          <figure className={css.heroPlan}>
            <ScalePlan
              uid="hero"
              room={typical[1].fit}
              title={`A typical double dorm room, ${ft(double.lengthFt)} by ${ft(double.widthFt)} feet, with two beds, desks and dressers`}
              className={css.plan}
            />
            <figcaption>
              <span>Typical double · {fmt(double.median)} sq ft</span>
              <span className="ds-mono">1 square = 1 ft</span>
            </figcaption>
          </figure>
        }
      >
        <PlanCta href="/plan" className="ds-btn ds-btn--ink-yellow" freeLabel="Plan my room free" paidLabel="Plan my room" icon={<ArrowRight />} />
        <a href="#by-college" className="ds-btn ds-btn--ghost-ink">
          Sizes by college
        </a>
      </PageHero>

      <TapeStats
        label="Typical dorm room sizes"
        items={[
          <>Single · {fmt(single.median)} sq ft</>,
          <>Double · {fmt(double.median)} sq ft</>,
          <>Triple · {fmt(triple.median)} sq ft</>,
          <>{twinXl}% Twin XL beds</>,
        ]}
      />

      <section className="ds-section" aria-labelledby="types-title" id="sizes">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Single, double and triple dorm room dimensions
          </p>
          <Headline
            id="types-title"
            className="ds-h2 ds-h2--inline"
            lines={[{ text: "The typical room," }, { text: "drawn to scale.", serif: true }]}
          />
          <ul className={css.cards} style={{ "--ppf": ppf.toFixed(2) } as React.CSSProperties}>
            {typical.map(({ t, fit }) => (
              <li key={t.occupants} className={css.card} data-featured={t.occupants === 2 || undefined} data-reveal="">
                <p className={css.kicker}>
                  {NAME[t.occupants]} · Sleeps {t.occupants}
                </p>
                <h3 className={css.dims}>{dims(t)}</h3>
                <p className={css.meta}>
                  <strong>{fmt(t.median)} sq ft</strong> typical · most between {fmt(t.p25)} and {fmt(t.p75)}
                </p>
                <div className={css.planWrap}>
                  <ScalePlan
                    uid={`type-${t.occupants}`}
                    room={fit}
                    title={`A typical ${NAME[t.occupants].toLowerCase()} dorm room, ${ft(t.lengthFt)} by ${ft(t.widthFt)} feet, with its furniture placed where a typical layout puts it`}
                    className={css.plan}
                  />
                </div>
                <div className={css.foot}>
                  <span>
                    Median of {fmt(t.rooms)} rooms at {t.schools} schools
                  </span>
                  <span className="ds-mono">1 square = 1 ft</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`ds-section ${css.numbers}`} aria-labelledby="numbers-title">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Average dorm room size in feet
          </p>
          <Headline
            id="numbers-title"
            className="ds-h2 ds-h2--inline"
            lines={[{ text: "The numbers," }, { text: "room by room.", serif: true }]}
          />
          <div className={css.tableWrap} data-reveal="">
            <table className="ds-table">
              <thead>
                <tr>
                  <th scope="col">Room</th>
                  <th scope="col">Typical size</th>
                  <th scope="col">Median</th>
                  <th scope="col">Average</th>
                  <th scope="col">Most rooms</th>
                  <th scope="col">Per person</th>
                </tr>
              </thead>
              <tbody>
                {S.byType.map((t) => (
                  <tr key={t.occupants}>
                    <th scope="row">{NAME[t.occupants]}</th>
                    <td>{dims(t)}</td>
                    <td>{fmt(t.median)} sq ft</td>
                    <td>{fmt(t.mean)} sq ft</td>
                    <td>
                      {fmt(t.p25)}–{fmt(t.p75)} sq ft
                    </td>
                    <td>{fmt(t.perPerson)} sq ft</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={css.caption}>
            Typical size is the median length and median width. &ldquo;Most rooms&rdquo; is the middle half: a quarter of rooms are
            smaller, a quarter larger.
          </p>
          <ul className={css.common} aria-label="The most common published dorm room sizes">
            {S.commonSizes.map((c) => (
              <li key={`${c.occupants}-${c.lengthFt}-${c.widthFt}`}>
                {ft(c.lengthFt)} × {ft(c.widthFt)} ft {NAME[c.occupants].toLowerCase()}
                <span>{c.rooms} rooms</span>
              </li>
            ))}
          </ul>
          <p className={css.caption}>The exact sizes schools publish most often.</p>
        </div>
      </section>

      <section className="ds-section" aria-labelledby="answers-title">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Dorm room size questions
          </p>
          <Headline
            id="answers-title"
            className="ds-h2 ds-h2--inline"
            lines={[{ text: "Short answers," }, { text: "real numbers.", serif: true }]}
          />
          <div className={css.answers}>
            {answers.map(({ q, a }) => (
              <div key={q} data-reveal="">
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </div>
          <div className={css.find} data-reveal="">
            <h3>How big is your dorm room? Find your hall.</h3>
            <SchoolSearch to="college" tone="ink" button="Find my room" placeholder={`Search ${SCHOOLS.length} schools`} />
          </div>
        </div>
      </section>

      <section className={`ds-section ${css.numbers}`} aria-labelledby="college-title" id="by-college">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Dorm room size by college
          </p>
          <Headline
            id="college-title"
            className="ds-h2 ds-h2--inline"
            lines={[{ text: "Doubles, school" }, { text: "by school.", serif: true }]}
          />
          <div className={css.tableWrap} data-reveal="">
            <table className="ds-table">
              <thead>
                <tr>
                  <th scope="col">College</th>
                  <th scope="col">Typical double</th>
                  <th scope="col">Range</th>
                  <th scope="col">Doubles listed</th>
                </tr>
              </thead>
              <tbody>
                {S.doublesBySchool.map((s) => (
                  <tr key={s.schoolId}>
                    <th scope="row">
                      <Link href={`/colleges/${s.schoolId}`} className={`ds-link ${css.schoolLink}`}>
                        {s.schoolName}
                      </Link>
                    </th>
                    <td>{fmt(s.median)} sq ft</td>
                    <td>{s.min === s.max ? `${fmt(s.min)} sq ft` : `${fmt(s.min)}–${fmt(s.max)} sq ft`}</td>
                    <td>{s.rooms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={css.caption}>
            The median published double at each of the {S.doublesBySchool.length} schools with at least {MIN_SCHOOL_ROOMS} published
            doubles, largest first. Pick a school to see every hall drawn to scale.
          </p>
        </div>
      </section>

      <section className="ds-section" aria-labelledby="method-title">
        <div className="ds-wrap">
          <Headline
            id="method-title"
            className="ds-h2 ds-h2--inline"
            lines={[{ text: "Where these" }, { text: "numbers come from.", serif: true }]}
          />
          <ul className={css.method}>
            <li>
              Only sizes a college publishes. Estimated sizes are left out, so {fmt(S.rooms)} room types across {fmt(S.halls)} halls at{" "}
              {S.schools} schools count.
            </li>
            <li>
              Singles, doubles and triples only. Graduate and family housing, studios, quads and any listing over{" "}
              {MAX_SQFT_PER_PERSON} sq ft per person are left out: those describe a whole apartment, not a room.
            </li>
            <li>Typical means the median, the middle room, so a handful of big suites can&apos;t skew it. The average (mean) is shown too.</li>
            <li>
              Sizes describe a room type as the school publishes it, not your exact room. See{" "}
              <Link href="/methodology" className="ds-link">
                how we measure dorm rooms
              </Link>
              .
            </li>
          </ul>
        </div>
      </section>

      <CtaBand
        lead="Your room,"
        tail="not the average."
        note="Find your hall, see your actual room drawn to scale, then lay it out for free."
      >
        <PlanCta href="/plan" className="ds-btn ds-btn--yellow ds-btn--lg" freeLabel="Plan my room free" paidLabel="Plan my room" icon={<ArrowRight />} />
      </CtaBand>
    </PageShell>
  );
}
