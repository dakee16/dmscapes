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
import { COMPETITORS, checkedOn, compareRows, shortCompetitorName } from "@/lib/compare";
import { pageMetadata, fitDescription, fitTitle, breadcrumbJsonLd, guidePageJsonLd, itemListJsonLd } from "@/lib/seo";
import dsz from "@/components/dorm-size/DormSize.module.css";
import css from "@/components/compare/Compare.module.css";

const PATH = "/compare";

const DESCRIPTION = fitDescription(
  `How dormscape compares with ${COMPETITORS.map(shortCompetitorName).join(", ")} for planning a dorm room: room sizes, floor plans, 3D, shopping, roommates and price.`,
  "How dormscape compares with other dorm room planners, feature by feature."
);

export const metadata: Metadata = pageMetadata({
  title: fitTitle("Dorm Room Planners Compared: dormscape vs the Alternatives", "Dorm Room Planners Compared"),
  description: DESCRIPTION,
  path: PATH,
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Compare", path: PATH },
];

// The rows that answer in a word or two; prices, shopping and sources are on each comparison.
const GLANCE = new Set(["Real room sizes for your residence hall", "To-scale floor plan", "3D view", "AI redesign of a room photo", "Planning with roommates", "Account to start"]);
const tables = COMPETITORS.map(compareRows);
const glance = (tables[0] ?? []).flatMap(([what, us], i) => (GLANCE.has(what) ? [{ what, us, them: tables.map((t) => t[i][2]) }] : []));
// The most recent check of any competitor's pages.
const latest = COMPETITORS.reduce((a, c) => (c.checked > a.checked ? c : a), COMPETITORS[0]);

export default function CompareIndexPage() {
  return (
    <PageShell navOverlay>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          guidePageJsonLd({ path: PATH, name: "Which planner fits your dorm?", description: DESCRIPTION, datePublished: "2026-10-28", dateModified: latest.checked }),
          itemListJsonLd(
            "Dorm room planner comparisons",
            COMPETITORS.map((c) => ({ name: `dormscape vs ${shortCompetitorName(c)}`, path: `/compare/${c.slug}` }))
          ),
        ]}
      />
      <PageHero
        size="md"
        bg="var(--ds-sky)"
        crumbs={<Crumbs items={crumbs} />}
        eyebrow={
          <>
            Dorm room planners compared · checked <time dateTime={latest.checked}>{checkedOn(latest)}</time>
          </>
        }
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

      <section className={`ds-section ${dsz.numbers}`} aria-labelledby="glance-title">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Dorm room planners at a glance
          </p>
          <Headline id="glance-title" className="ds-h2 ds-h2--inline" lines={[{ text: "All of them," }, { text: "side by side.", serif: true }]} />
          <div className={dsz.tableWrap} data-reveal="">
            <table className={`ds-table ${css.table}`}>
              <thead>
                <tr>
                  <th scope="col">For a dorm room</th>
                  <th scope="col">dormscape</th>
                  {COMPETITORS.map((c) => (
                    <th scope="col" key={c.slug}>
                      <Link href={`/compare/${c.slug}`} className="ds-link">
                        {shortCompetitorName(c)}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {glance.map((row) => (
                  <tr key={row.what}>
                    <th scope="row">{row.what}</th>
                    <td>{row.us}</td>
                    {row.them.map((v, i) => (
                      <td key={COMPETITORS[i].slug}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={dsz.caption}>
            From each product&apos;s own pages, last checked {checkedOn(latest)}. Open a comparison for prices, shopping and
            every source.
          </p>
        </div>
      </section>

      <CtaBand lead="Or just try it" tail="on your room." note="Find your hall, see your room drawn to scale, then lay it out for free.">
        <PlanCta href="/plan" className="ds-btn ds-btn--yellow ds-btn--lg" freeLabel="Plan my room free" paidLabel="Plan my room" icon={<ArrowRight />} />
      </CtaBand>
    </PageShell>
  );
}
