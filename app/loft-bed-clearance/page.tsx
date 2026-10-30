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
import LoftClearance, { type ClearanceItem, type ClearancePreset } from "@/components/tools/LoftClearance";
import { BED_MODES } from "@/lib/bed-config";
import { FURNITURE_LIBRARY } from "@/lib/furniture-library";
import { allBedRules, checkedLabel } from "@/lib/bed-rules";
import { getSchool } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { pageMetadata, fitDescription, fitTitle, breadcrumbJsonLd, absoluteUrl, guidePageJsonLd } from "@/lib/seo";
import { shortDate } from "@/components/blog/topics";
import dsz from "@/components/dorm-size/DormSize.module.css";

// Bed heights are the planner's own settings (lib/bed-config) and item heights its
// furniture library's typical sizes (lib/furniture-library); school ranges come
// from the published rules (lib/bed-rules).
const PATH = "/loft-bed-clearance";
const UPDATED = "2026-10-30";
const inches = (feet: number) => Math.round(feet * 12);

const presets: ClearancePreset[] = (["standard", "raised", "lofted"] as const).map((m) => ({
  label: BED_MODES[m].label,
  inches: inches(BED_MODES[m].underside),
}));
const ITEM_KEYS = ["bin", "desk", "fridge", "chair", "dresser", "shelf"];
const items: ClearanceItem[] = ITEM_KEYS.flatMap((k) => {
  const p = FURNITURE_LIBRARY.find((x) => x.key === k);
  return p ? [{ name: p.name, inches: inches(p.h) }] : [];
});
const lofted = inches(BED_MODES.lofted.underside);
const raised = inches(BED_MODES.raised.underside);
const desk = items.find((i) => i.name === "Study desk");
const fridge = items.find((i) => i.name === "Mini fridge");
const dresser = items.find((i) => i.name === "Dresser");

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

const FAQS = [
  {
    q: "What fits under a lofted dorm bed?",
    a: `In the planner, a lofted bed leaves about ${lofted} inches underneath, enough for a ${desk?.inches}-inch desk, a ${fridge?.inches}-inch mini fridge or a ${dresser?.inches}-inch dresser. Your hall's loft height decides the real number, so measure yours.`,
  },
  {
    q: "What fits under a raised dorm bed?",
    a: `Raised beds in the planner leave about ${raised} inches: enough for storage bins and drawers, but usually not a desk (${desk?.inches} in) or a mini fridge (${fridge?.inches} in).`,
  },
  {
    q: "How do I measure the space under my bed?",
    a: "Measure from the floor to the lowest part of the bed above it, usually the frame's side rail or the slats, not the mattress. On carpet, measure where the item will actually stand.",
  },
  {
    q: "Can I loft my dorm bed?",
    a: "It depends on your school and sometimes your building. Some halls let you adjust the bed yourself, some do it by request, and some don't allow it at all. Check your school's rules before you buy anything that only fits under a loft.",
  },
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
            {FAQS.map(({ q, a }) => (
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
