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
import { SIZES, TWIN_XL_FAQS, exceptions, other, shortBy, xl } from "@/lib/guide-twin-xl";
import { pageMetadata, fitDescription, fitTitle, breadcrumbJsonLd, guidePageJsonLd } from "@/lib/seo";
import { shortDate } from "@/components/blog/topics";
import dsz from "@/components/dorm-size/DormSize.module.css";

// Mattress sizes and the schools with other beds come from lib/guide-twin-xl.
const PATH = "/twin-xl-sheets";
const UPDATED = "2026-10-30";
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
            mainEntity: TWIN_XL_FAQS.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
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
            {TWIN_XL_FAQS.map(({ q, a }) => (
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
