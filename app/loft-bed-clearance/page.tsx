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
import LoftClearance from "@/components/tools/LoftClearance";
import { CLEARANCE_FAQS, desk, items, lofted, presets } from "@/lib/guide-loft-clearance";
import { allBedRules, checkedLabel } from "@/lib/bed-rules";
import { getSchool } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { pageMetadata, fitDescription, fitTitle, breadcrumbJsonLd, absoluteUrl, guidePageJsonLd } from "@/lib/seo";
import { shortDate } from "@/components/blog/topics";
import dsz from "@/components/dorm-size/DormSize.module.css";

// Bed and item heights come from the planner (lib/guide-loft-clearance); school
// ranges come from the published rules (lib/bed-rules).
const PATH = "/loft-bed-clearance";
const UPDATED = "2026-10-30";
// Schools that publish an adjustable bed-height range.
const ranges = allBedRules()
  .filter(([, r]) => r.bed_height_in)
  .map(([id, r]) => {
    const s = getSchool(id);
    return s ? { id, name: shortName(s), min: r.bed_height_in!.min, max: r.bed_height_in!.max, url: r.sources[0]?.url } : null;
  })
  .filter((x): x is NonNullable<typeof x> => x !== null)
  .sort((a, b) => a.name.localeCompare(b.name));

const DESCRIPTION = fitDescription(
  `A lofted dorm bed leaves about ${lofted} inches underneath in the dormscape planner: room for a ${desk?.inches ?? 30}-inch desk or a mini fridge. Enter your bed's height to see what fits under it.`,
  "Enter the space under your dorm bed to see whether a desk, mini fridge, dresser or storage fits under it."
);

export const metadata: Metadata = pageMetadata({
  title: fitTitle("What Fits Under a Lofted Dorm Bed? Clearance Calculator", "What Fits Under a Lofted Dorm Bed?", "What Fits Under a Lofted Bed?", "Loft Bed Clearance Calculator"),
  description: DESCRIPTION,
  path: PATH,
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Under-loft clearance", path: PATH },
];

export default function LoftBedClearancePage() {
  return (
    <PageShell navOverlay>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          guidePageJsonLd({ path: PATH, name: "What fits under a lofted bed?", description: DESCRIPTION, datePublished: "2026-10-28", dateModified: UPDATED }),
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Loft bed clearance calculator",
            url: absoluteUrl(PATH),
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Any (web browser)",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: CLEARANCE_FAQS.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
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
          { text: "What fits under", riso: true },
          { text: "a lofted bed?", serif: true },
        ]}
        lede={
          <p>
            A lofted dorm bed leaves{" "}
            <mark className="ds-marker" data-mark="load">
              about {lofted} inches
            </mark>{" "}
            underneath in the planner: room for a desk, a mini fridge or a dresser. Enter your own bed&apos;s height to check
            what fits under yours before you buy it.
          </p>
        }
      />

      <section className="ds-section" aria-labelledby="calc-title">
        <div className="ds-wrap">
          <Headline id="calc-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Your bed," }, { text: "inch by inch.", serif: true }]} />
          <LoftClearance presets={presets} items={items} />
        </div>
      </section>

      {ranges.length > 0 && (
        <section className={`ds-section ${dsz.numbers}`} aria-labelledby="ranges-title">
          <div className="ds-wrap">
            <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
              Dorm bed heights by school
            </p>
            <Headline id="ranges-title" className="ds-h2 ds-h2--inline" lines={[{ text: "What schools" }, { text: "publish.", serif: true }]} />
            <div className={dsz.tableWrap} data-reveal="">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th scope="col">School</th>
                    <th scope="col">Published bed height</th>
                    <th scope="col">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {ranges.map((r) => (
                    <tr key={r.id}>
                      <th scope="row">
                        <Link href={`/colleges/${r.id}#bed-rules`} className="ds-link">
                          {r.name}
                        </Link>
                      </th>
                      <td>
                        {r.min}–{r.max} in
                      </td>
                      <td>
                        {r.url ? (
                          <a href={r.url} rel="noopener noreferrer" target="_blank" className="ds-link">
                            Housing page
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={dsz.caption}>
              The adjustable range each school publishes, checked {checkedLabel()}. Schools measure it differently (to the
              frame, the rail or the mattress), so read the source and measure your own bed. Every school&apos;s rules are on{" "}
              <Link href="/dorm-bed-rules" className="ds-link">
                loft and bunk rules by school
              </Link>
              .
            </p>
          </div>
        </section>
      )}

      <section className="ds-section" aria-labelledby="answers-title">
        <div className="ds-wrap">
          <Headline id="answers-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Short answers," }, { text: "before you buy.", serif: true }]} />
          <div className={dsz.answers}>
            {CLEARANCE_FAQS.map(({ q, a }) => (
              <div key={q} data-reveal="">
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand lead="Loft it," tail="then plan it." note="Set any bed to lofted or bunked in your workspace and see what fits around it.">
        <PlanCta href="/plan" className="ds-btn ds-btn--yellow ds-btn--lg" freeLabel="Plan my room free" paidLabel="Plan my room" icon={<ArrowRight />} />
      </CtaBand>
    </PageShell>
  );
}
