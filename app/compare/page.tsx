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
import { COMPETITORS, shortCompetitorName } from "@/lib/compare";
import { pageMetadata, fitDescription, fitTitle, breadcrumbJsonLd } from "@/lib/seo";
import css from "@/components/compare/Compare.module.css";

const PATH = "/compare";

export const metadata: Metadata = pageMetadata({
  title: fitTitle("Dorm Room Planners Compared: dormscape vs the Alternatives", "Dorm Room Planners Compared"),
  description: fitDescription(
    `How dormscape compares with ${COMPETITORS.map(shortCompetitorName).join(", ")} for planning a dorm room: room sizes, floor plans, 3D, shopping, roommates and price.`,
    "How dormscape compares with other dorm room planners, feature by feature."
  ),
  path: PATH,
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Compare", path: PATH },
];

export default function CompareIndexPage() {
  return (
    <PageShell navOverlay>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <PageHero
        size="md"
        bg="var(--ds-sky)"
        crumbs={<Crumbs items={crumbs} />}
        eyebrow="Dorm room planners compared"
        lines={[
          { text: "Which planner", riso: true },
          { text: "fits your dorm?", serif: true },
        ]}
        lede={
          <p>
            Different tools are good at different things. Here&apos;s dormscape next to the other dorm room planners
            students find, using only what each product says about itself.
          </p>
        }
      />
      <section className="ds-section" aria-labelledby="list-title">
        <div className="ds-wrap">
          <Headline id="list-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Pick a" }, { text: "comparison.", serif: true }]} />
          <ul className={css.cards}>
            {COMPETITORS.map((c) => (
              <li key={c.slug} data-reveal="">
                <Link href={`/compare/${c.slug}`}>
                  <strong>dormscape vs {shortCompetitorName(c)}</strong>
                  <span>{c.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <CtaBand lead="Or just try it" tail="on your room." note="Find your hall, see your room drawn to scale, then lay it out for free.">
        <PlanCta href="/plan" className="ds-btn ds-btn--yellow ds-btn--lg" freeLabel="Plan my room free" paidLabel="Plan my room" icon={<ArrowRight />} />
      </CtaBand>
    </PageShell>
  );
}
