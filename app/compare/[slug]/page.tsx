import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import Crumbs from "@/components/ds/Crumbs";
import CtaBand from "@/components/ds/CtaBand";
import { ArrowRight } from "@/components/ds/Icons";
import PlanCta from "@/components/site/PlanCta";
import JsonLd from "@/components/site/JsonLd";
import { COMPETITORS, DORMSCAPE_STRENGTHS, STRENGTHS, checkedOn, compareRows, competitor, shortCompetitorName } from "@/lib/compare";
import { pageMetadata, fitDescription, fitTitle, breadcrumbJsonLd } from "@/lib/seo";
import dsz from "@/components/dorm-size/DormSize.module.css";
import css from "@/components/compare/Compare.module.css";

export function generateStaticParams() {
  return COMPETITORS.map((c) => ({ slug: c.slug }));
}
export const dynamicParams = false;

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = competitor((await props.params).slug);
  if (!c) return {};
  const name = shortCompetitorName(c);
  return pageMetadata({
    title: fitTitle(`dormscape vs ${name}: Dorm Room Planner Comparison`, `dormscape vs ${name}`),
    description: fitDescription(
      `dormscape and ${name} side by side for planning a dorm room: real room sizes, floor plans, 3D, shopping, roommates and price, from each product's own pages.`,
      `dormscape vs ${name} for planning a dorm room, feature by feature.`
    ),
    path: `/compare/${c.slug}`,
  });
}

export default async function ComparePage(props: { params: Promise<{ slug: string }> }) {
  const c = competitor((await props.params).slug);
  if (!c) notFound();
  const name = shortCompetitorName(c);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Compare", path: "/compare" },
    { name: `dormscape vs ${name}`, path: `/compare/${c.slug}` },
  ];
  return (
    <PageShell navOverlay>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <PageHero
        size="md"
        bg="var(--ds-sky)"
        crumbs={<Crumbs items={crumbs} />}
        eyebrow={<>Dorm room planner comparison · checked {checkedOn(c)}</>}
        lines={[
          { text: "dormscape", riso: true },
          { text: `vs ${name}.`, serif: true },
        ]}
        lede={
          <p>
            {c.summary}{" "}Here&apos;s how it compares with dormscape for planning a dorm room, using only what each product
            says about itself.
          </p>
        }
      />

      <section className="ds-section" aria-labelledby="table-title">
        <div className="ds-wrap">
          <Headline id="table-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Side by side," }, { text: "feature by feature.", serif: true }]} />
          <div className={dsz.tableWrap} data-reveal="">
            <table className={`ds-table ${css.table}`}>
              <thead>
                <tr>
                  <th scope="col">For a dorm room</th>
                  <th scope="col">dormscape</th>
                  <th scope="col">{name}</th>
                </tr>
              </thead>
              <tbody>
                {compareRows(c).map(([what, us, them]) => (
                  <tr key={what}>
                    <th scope="row">{what}</th>
                    <td>{us}</td>
                    <td>{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={dsz.caption}>
            How {name} works: {c.how_it_works}
          </p>
          {c.observed && <p className={css.observed}>{c.observed}</p>}
        </div>
      </section>

      <section className={`ds-section ${dsz.numbers}`} aria-labelledby="picks-title">
        <div className="ds-wrap">
          <Headline id="picks-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Which one" }, { text: "fits you?", serif: true }]} />
          <div className={css.picks}>
            <div className={css.pick} data-reveal="">
              <h3>{name} may suit you better if</h3>
              <ul>
                {(STRENGTHS[c.slug] ?? []).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className={css.pick} data-us="" data-reveal="">
              <h3>dormscape fits better if</h3>
              <ul>
                {DORMSCAPE_STRENGTHS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="ds-section" aria-labelledby="sources-title">
        <div className="ds-wrap">
          <Headline id="sources-title" className="ds-h2 ds-h2--inline" lines={[{ text: "Where these" }, { text: "facts come from.", serif: true }]} />
          <p className={dsz.caption}>
            Everything about {name} is quoted from its own pages, checked {checkedOn(c)}. Products change, so check{" "}
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="ds-link">
              {name}&apos;s site
            </a>{" "}
            for the latest. dormscape&apos;s column comes straight from our pricing and school data. Spot something out of
            date?{" "}
            <Link href="/contact" className="ds-link">
              Tell us
            </Link>
            .
          </p>
          <ol className={css.sources}>
            {c.sources.map((s, i) => (
              <li key={i}>
                <q>{s.quote}</q>{" "}
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="ds-link">
                  Source
                </a>
              </li>
            ))}
          </ol>
          <p className={dsz.caption} style={{ marginTop: 24 }}>
            <Link href="/compare" className="ds-link">
              Compare other dorm room planners
            </Link>
          </p>
        </div>
      </section>

      <CtaBand lead="Try it on" tail="your real room." note="Find your hall, see your room drawn to scale, then lay it out for free.">
        <PlanCta href="/plan" className="ds-btn ds-btn--yellow ds-btn--lg" freeLabel="Plan my room free" paidLabel="Plan my room" icon={<ArrowRight />} />
      </CtaBand>
    </PageShell>
  );
}
