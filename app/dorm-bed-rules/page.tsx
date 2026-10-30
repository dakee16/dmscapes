import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import Crumbs from "@/components/ds/Crumbs";
import TapeStats from "@/components/ds/TapeStats";
import CtaBand from "@/components/ds/CtaBand";
import { ArrowRight } from "@/components/ds/Icons";
import PlanCta from "@/components/site/PlanCta";
import JsonLd from "@/components/site/JsonLd";
import { SCHOOLS } from "@/lib/schools";
import { ALLOWED_LABEL, YES_NO_LABEL, BED_RULES_CHECKED, bedRuleFor, checkedLabel } from "@/lib/bed-rules";
import { pageMetadata, fitDescription, fitTitle, breadcrumbJsonLd, absoluteUrl, guidePageJsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";
import { BED_RULE_FAQS, R } from "@/lib/guide-bed-rules";
import dsz from "@/components/dorm-size/DormSize.module.css";

// Every answer comes from lib/bed-rules: a school's own housing pages, quoted in
// data/bed-rules-quotes.json. Anything a school doesn't publish says so.
const PATH = "/dorm-bed-rules";
const rows = [...SCHOOLS].map((s) => ({ id: s.id, name: s.name, rule: bedRuleFor(s.id) })).sort((a, b) => a.name.localeCompare(b.name));

const DESCRIPTION = fitDescription(
  `Whether ${SCHOOLS.length} colleges let you loft or bunk your dorm bed, use bed risers or bring a loft kit, from each school's own housing pages, with sources.`,
  "Dorm loft and bunk bed rules by college, from each school's own housing pages, with sources."
);

export const metadata: Metadata = pageMetadata({
  title: fitTitle(
    `Can You Loft or Bunk Your Dorm Bed? Rules for ${SCHOOLS.length} Colleges`,
    "Dorm Loft and Bunk Bed Rules by College",
    "Dorm Loft and Bunk Rules"
  ),
  description: DESCRIPTION,
  path: PATH,
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Loft & bunk rules", path: PATH },
];

export default function DormBedRulesPage() {
  return (
    <PageShell navOverlay>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          guidePageJsonLd({ path: PATH, name: "Can you loft your dorm bed?", description: DESCRIPTION, datePublished: "2026-10-28", dateModified: BED_RULES_CHECKED }),
          {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "Dorm bed lofting and bunking rules by US college",
            description: `Whether ${SCHOOLS.length} US colleges allow lofted beds, bunked beds, bed risers and personal loft kits in their residence halls, from each school's housing pages.`,
            url: absoluteUrl(PATH),
            creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            dateModified: BED_RULES_CHECKED,
            isAccessibleForFree: true,
            spatialCoverage: "United States",
            variableMeasured: ["Lofting allowed", "Bunking allowed", "Bed risers allowed", "Personal loft kits allowed"],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: BED_RULE_FAQS.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          },
        ]}
      />
      <PageHero
        size="md"
        bg="var(--ds-sky)"
        crumbs={<Crumbs items={crumbs} />}
        eyebrow={
          <>
            {R.schools} of {SCHOOLS.length} colleges publish rules · checked{" "}
            <time dateTime={BED_RULES_CHECKED}>{checkedLabel()}</time>
          </>
        }
        lines={[
          { text: "Can you loft", riso: true },
          { text: "your dorm bed?", serif: true },
        ]}
        lede={
          <p>
            It depends on your school, and sometimes your building. Here&apos;s what each college&apos;s housing pages say
            about lofting, bunking, bed risers and loft kits, with links to the source, checked {checkedLabel()}.
          </p>
        }
      />

      <TapeStats
        label="Loft and bunk rules at a glance"
        items={[
          <>{R.schools} colleges publish rules</>,
          <>{R.loft.yes} allow lofting</>,
          <>{R.bunk.yes} allow bunking</>,
          <>{R.loft.no} don&apos;t allow lofting</>,
        ]}
      />

      <section className="ds-section" aria-labelledby="rules-title">
        <div className="ds-wrap">
          <Headline id="rules-title" className="ds-h2 ds-h2--inline" lines={[{ text: "School" }, { text: "by school.", serif: true }]} />
          <div className={dsz.tableWrap} data-reveal="">
            <table className="ds-table">
              <thead>
                <tr>
                  <th scope="col">College</th>
                  <th scope="col">Lofting</th>
                  <th scope="col">Bunking</th>
                  <th scope="col">Bed risers</th>
                  <th scope="col">Own loft kit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ id, name, rule }) => (
                  <tr key={id}>
                    <th scope="row">
                      <Link href={`/colleges/${id}#bed-rules`} className={`ds-link ${dsz.schoolLink}`}>
                        {name}
                      </Link>
                    </th>
                    {rule ? (
                      <>
                        <td>{ALLOWED_LABEL[rule.loft]}</td>
                        <td>{ALLOWED_LABEL[rule.bunk]}</td>
                        <td>
                          {YES_NO_LABEL[rule.risers]}
                          {rule.risers === "yes" && rule.riser_max_in ? ` (up to ${rule.riser_max_in} in)` : ""}
                        </td>
                        <td>{YES_NO_LABEL[rule.own_loft_kits]}</td>
                      </>
                    ) : (
                      <td colSpan={4}>Not published, so ask housing</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={dsz.caption}>
            &ldquo;In some halls&rdquo; means only certain buildings or rooms, or only when staff set it up. Each school&apos;s
            page has the details, exceptions and sources.
          </p>
        </div>
      </section>

      <section className={`ds-section ${dsz.numbers}`} aria-labelledby="answers-title">
        <div className="ds-wrap">
          <Headline id="answers-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Short answers," }, { text: "with sources.", serif: true }]} />
          <div className={dsz.answers}>
            {BED_RULE_FAQS.map(({ q, a }) => (
              <div key={q} data-reveal="">
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </div>
          <ul className={dsz.method} style={{ marginTop: 40 }}>
            <li>Only what a college&apos;s own housing pages or documents say. Each rule links to its source.</li>
            <li>&ldquo;Not published&rdquo; means we couldn&apos;t find it on an official page, not that it&apos;s banned.</li>
            <li>Some sources are last year&apos;s guides or name dates for the 2026&ndash;27 year; the school page notes these.</li>
            <li>
              See something out of date?{" "}
              <Link href="/report" className="ds-link">
                Tell us
              </Link>{" "}
              and we&apos;ll recheck it.
            </li>
          </ul>
        </div>
      </section>

      <CtaBand lead="Lofted, bunked," tail="or on the floor." note="Plan your room with the beds set the way your hall allows, and see what fits around them.">
        <PlanCta href="/plan" className="ds-btn ds-btn--yellow ds-btn--lg" freeLabel="Plan my room free" paidLabel="Plan my room" icon={<ArrowRight />} />
      </CtaBand>
    </PageShell>
  );
}
