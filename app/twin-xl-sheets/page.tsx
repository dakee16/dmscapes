import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import Crumbs from "@/components/ds/Crumbs";
import CtaBand from "@/components/ds/CtaBand";
import { ArrowRight } from "@/components/ds/Icons";
import PlanCta from "@/components/site/PlanCta";
import JsonLd from "@/components/site/JsonLd";
import { SCHOOLS } from "@/lib/schools";
import { LAYOUT_COUNT } from "@/lib/home-data";
import { bedName } from "@/lib/room-preview";
import type { BedSize } from "@/lib/types";
import { pageMetadata, fitDescription, fitTitle, breadcrumbJsonLd, guidePageJsonLd } from "@/lib/seo";
import { shortDate } from "@/components/blog/topics";
import dsz from "@/components/dorm-size/DormSize.module.css";

// Mattress sizes are the standard US sizes; which schools publish another bed
// comes from the room data (Twin XL is the planner's default unless a school says otherwise).
const PATH = "/twin-xl-sheets";
const UPDATED = "2026-10-30";
const SIZES: { size: BedSize; w: number; l: number }[] = [
  { size: "twin", w: 38, l: 75 },
  { size: "twin_xl", w: 38, l: 80 },
  { size: "full", w: 54, l: 75 },
  { size: "full_xl", w: 54, l: 80 },
  { size: "queen", w: 60, l: 80 },
];
const dim = (b: BedSize) => SIZES.find((s) => s.size === b)!;
const xl = dim("twin_xl");
const twin = dim("twin");
const shortBy = xl.l - twin.l;

const rooms = SCHOOLS.flatMap((s) => s.dorms.flatMap((d) => d.rooms.map((r) => ({ school: s, bed: r.bed_size }))));
const other = rooms.filter((r) => r.bed !== "twin_xl");
// Schools that publish a bed other than Twin XL for some room types, with how many.
const exceptions = [...new Set(other.map((r) => r.school.id))]
  .map((id) => {
    const mine = other.filter((r) => r.school.id === id);
    const school = mine[0].school;
    const beds = [...new Set(mine.map((r) => bedName(r.bed)))];
    return { id, name: school.name, beds, count: mine.length };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const DESCRIPTION = fitDescription(
  `Almost every dorm bed is a Twin XL (${xl.w} × ${xl.l} in), ${shortBy} inches longer than a Twin. Of ${LAYOUT_COUNT.toLocaleString("en-US")} room types we track, schools list another size for ${other.length}. See which schools, and which sheets fit.`,
  `Almost every dorm bed is a Twin XL (${xl.w} × ${xl.l} in). See which schools use other sizes, and which sheets fit.`
);

export const metadata: Metadata = pageMetadata({
  title: fitTitle("Twin XL Sheets for Dorms: Do Dorms Use Twin XL Beds?", "Twin XL Sheets for Dorm Beds", "Twin XL Dorm Sheets"),
  description: DESCRIPTION,
  path: PATH,
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Twin XL sheets", path: PATH },
];

const FAQS = [
  {
    q: "Do dorms use Twin XL beds?",
    a: `Almost all of them. Of the ${LAYOUT_COUNT.toLocaleString("en-US")} room types we track at ${SCHOOLS.length} colleges, schools list a different bed for ${other.length}, at ${exceptions.length} schools. Everywhere else it's a Twin XL.`,
  },
  {
    q: "Will Twin sheets fit a Twin XL dorm bed?",
    a: `Not well. A Twin XL mattress is ${xl.l} inches long and a Twin is ${twin.l}, so a Twin fitted sheet is ${shortBy} inches too short and will pop off the corners. Buy Twin XL fitted sheets.`,
  },
  {
    q: "How big is a Twin XL mattress?",
    a: `A standard Twin XL is ${xl.w} × ${xl.l} inches. Some schools list their dorm mattresses at slightly different widths, so check your housing office's furniture page if you're buying a topper.`,
  },
  {
    q: "What if my dorm has a Full bed?",
    a: "A few schools put Full or Full XL beds in some rooms. The school list below shows which ones, and your hall's page on dormscape shows the bed for each room type.",
  },
];

export default function TwinXlSheetsPage() {
  return (
    <PageShell navOverlay>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          guidePageJsonLd({ path: PATH, name: "Twin XL sheets, not Twin.", description: DESCRIPTION, datePublished: "2026-10-28", dateModified: UPDATED }),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          },
        ]}
      />
      <PageHero
        size="md"
        bg="var(--ds-sky)"
        crumbs={<Crumbs items={crumbs} />}
        eyebrow={
          <>
            Dorm bed sizes · updated <time dateTime={UPDATED}>{shortDate(UPDATED)}</time>
          </>
        }
        lines={[
          { text: "Twin XL sheets,", riso: true },
          { text: "not Twin.", serif: true },
        ]}
        lede={
          <p>
            Almost every dorm bed is a{" "}
            <mark className="ds-marker" data-mark="load">
              Twin XL, {xl.w} × {xl.l} inches
            </mark>
            , {shortBy} inches longer than a regular Twin. Of {LAYOUT_COUNT.toLocaleString("en-US")} room types at{" "}
            {SCHOOLS.length} colleges, schools list another bed for just {other.length}.
          </p>
        }
      />

      <section className="ds-section" aria-labelledby="sizes-title">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Mattress sizes compared
          </p>
          <Headline id="sizes-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Five inches" }, { text: "make the difference.", serif: true }]} />
          <div className={dsz.tableWrap} data-reveal="">
            <table className="ds-table">
              <thead>
                <tr>
                  <th scope="col">Mattress</th>
                  <th scope="col">Width</th>
                  <th scope="col">Length</th>
                  <th scope="col">Next to a Twin XL</th>
                </tr>
              </thead>
              <tbody>
                {SIZES.map((s) => (
                  <tr key={s.size}>
                    <th scope="row">{bedName(s.size)}</th>
                    <td>{s.w} in</td>
                    <td>{s.l} in</td>
                    <td>
                      {s.size === "twin_xl"
                        ? "The usual dorm bed"
                        : [s.w !== xl.w ? `${Math.abs(s.w - xl.w)} in ${s.w > xl.w ? "wider" : "narrower"}` : null, s.l !== xl.l ? `${Math.abs(s.l - xl.l)} in ${s.l > xl.l ? "longer" : "shorter"}` : null]
                            .filter(Boolean)
                            .join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={dsz.caption}>Standard US mattress sizes. Fitted sheets are cut to these, so match the size exactly.</p>
        </div>
      </section>

      {exceptions.length > 0 && (
        <section className={`ds-section ${dsz.numbers}`} aria-labelledby="exceptions-title">
          <div className="ds-wrap">
            <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
              Dorms without Twin XL beds
            </p>
            <Headline id="exceptions-title" className="ds-h2 ds-h2--inline" lines={[{ text: "The few" }, { text: "exceptions.", serif: true }]} />
            <div className={dsz.tableWrap} data-reveal="">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th scope="col">College</th>
                    <th scope="col">Other bed listed</th>
                    <th scope="col">Room types</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map((e) => (
                    <tr key={e.id}>
                      <th scope="row">
                        <Link href={`/colleges/${e.id}`} className={`ds-link ${dsz.schoolLink}`}>
                          {e.name}
                        </Link>
                      </th>
                      <td>{e.beds.join(", ")}</td>
                      <td>{e.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={dsz.caption}>
              Room types whose school lists a bed other than Twin XL. Every other room type here is a Twin XL. Open your
              school to see the bed for each hall and room.
            </p>
          </div>
        </section>
      )}

      <section className="ds-section" aria-labelledby="answers-title">
        <div className="ds-wrap">
          <Headline id="answers-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Short answers," }, { text: "before you buy.", serif: true }]} />
          <div className={dsz.answers}>
            {FAQS.map(({ q, a }) => (
              <div key={q} data-reveal="">
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand lead="Sheets sorted." tail="Now the room." note="Find your hall to see its bed, then get a layout and a shopping list that fit.">
        <PlanCta href="/plan" className="ds-btn ds-btn--yellow ds-btn--lg" freeLabel="Plan my room free" paidLabel="Plan my room" icon={<ArrowRight />} />
      </CtaBand>
    </PageShell>
  );
}
