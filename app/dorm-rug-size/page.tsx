import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import Crumbs from "@/components/ds/Crumbs";
import CtaBand from "@/components/ds/CtaBand";
import { ArrowRight } from "@/components/ds/Icons";
import PlanCta from "@/components/site/PlanCta";
import JsonLd from "@/components/site/JsonLd";
import RugCalculator from "@/components/tools/RugCalculator";
import { ft } from "@/lib/room-preview";
import { RUG_FAQS, S, double, doubleRug, presets, rows, rugText } from "@/lib/guide-rug-size";
import { pageMetadata, fitDescription, fitTitle, breadcrumbJsonLd, absoluteUrl, guidePageJsonLd } from "@/lib/seo";
import { shortDate } from "@/components/blog/topics";
import dsz from "@/components/dorm-size/DormSize.module.css";

// Rug sizes from the planner's own starting layouts for the room sizes colleges
// publish; the numbers and answers live in lib/guide-rug-size.
const PATH = "/dorm-rug-size";
const UPDATED = "2026-10-30";
const DESCRIPTION = fitDescription(
  `A ${doubleRug} rug fits the open floor of a typical ${ft(double.lengthFt)} × ${ft(double.widthFt)} ft double once the beds, desks and dressers are in. Enter your room to find the biggest rug that fits yours.`,
  `Find the biggest standard rug that fits your dorm room's open floor, around the beds, desks and dressers.`
);

export const metadata: Metadata = pageMetadata({
  title: fitTitle(`What Size Rug for a Dorm Room? ${doubleRug} in a Typical Double`, "What Size Rug for a Dorm Room? Rug Size Calculator", "What Size Rug for a Dorm Room?", "Dorm Rug Size Calculator"),
  description: DESCRIPTION,
  path: PATH,
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Dorm rug size", path: PATH },
];

export default function DormRugSizePage() {
  return (
    <PageShell navOverlay>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          guidePageJsonLd({ path: PATH, name: "What size rug fits your dorm?", description: DESCRIPTION, datePublished: "2026-10-28", dateModified: UPDATED }),
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Dorm rug size calculator",
            url: absoluteUrl(PATH),
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Any (web browser)",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: RUG_FAQS.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          },
        ]}
      />
      <PageHero
        size="md"
        bg="var(--ds-sky)"
        crumbs={<Crumbs items={crumbs} />}
        eyebrow={
          <>
            Free calculator · updated <time dateTime={UPDATED}>{shortDate(UPDATED)}</time>
          </>
        }
        lines={[
          { text: "What size rug", riso: true },
          { text: "fits your dorm?", serif: true },
        ]}
        lede={
          <p>
            In a typical {ft(double.lengthFt)} × {ft(double.widthFt)} ft double, a{" "}
            <mark className="ds-marker" data-mark="load">
              {doubleRug} rug
            </mark>{" "}
            fits the floor that&apos;s left once the beds, desks and dressers are in. Enter your room to see the biggest rug
            that fits yours, drawn to scale.
          </p>
        }
      />

      <section className="ds-section" aria-labelledby="calc-title">
        <div className="ds-wrap">
          <Headline id="calc-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Your room," }, { text: "your rug.", serif: true }]} />
          <Suspense fallback={null}>
            <RugCalculator presets={presets} />
          </Suspense>
        </div>
      </section>

      <section className={`ds-section ${dsz.numbers}`} aria-labelledby="table-title">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Rug sizes for common dorm rooms
          </p>
          <Headline id="table-title" className="ds-h2 ds-h2--inline" lines={[{ text: "The rooms schools" }, { text: "publish most.", serif: true }]} />
          <div className={dsz.tableWrap} data-reveal="">
            <table className="ds-table">
              <thead>
                <tr>
                  <th scope="col">Room</th>
                  <th scope="col">Size</th>
                  <th scope="col">Biggest rug that fits</th>
                  <th scope="col">Why this room</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.room}>
                    <th scope="row">{r.room}</th>
                    <td>
                      {ft(r.l)} × {ft(r.w)} ft
                    </td>
                    <td>{rugText(r.l, r.w, r.o)}</td>
                    <td>{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={dsz.caption}>
            From {S.rooms.toLocaleString("en-US")} room sizes published by {S.schools} colleges, laid out the way the planner
            starts them. See{" "}
            <Link href="/dorm-room-size" className="ds-link">
              dorm room sizes
            </Link>{" "}
            for the full numbers.
          </p>
        </div>
      </section>

      <section className="ds-section" aria-labelledby="answers-title">
        <div className="ds-wrap">
          <Headline id="answers-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Short answers," }, { text: "real rooms.", serif: true }]} />
          <div className={dsz.answers}>
            {RUG_FAQS.map(({ q, a }) => (
              <div key={q} data-reveal="">
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </div>
          <p className={dsz.caption} style={{ marginTop: 32 }}>
            Thinking about a loft?{" "}
            <Link href="/loft-bed-clearance" className="ds-link">
              See what fits under a lofted bed
            </Link>{" "}
            and{" "}
            <Link href="/dorm-bed-rules" className="ds-link">
              your school&apos;s loft and bunk rules
            </Link>
            .
          </p>
        </div>
      </section>

      <CtaBand lead="The rug is easy." tail="Plan the rest." note="Find your hall, see your room drawn to scale, and try a rug in your own layout.">
        <PlanCta href="/plan" className="ds-btn ds-btn--yellow ds-btn--lg" freeLabel="Plan my room free" paidLabel="Plan my room" icon={<ArrowRight />} />
      </CtaBand>
    </PageShell>
  );
}
