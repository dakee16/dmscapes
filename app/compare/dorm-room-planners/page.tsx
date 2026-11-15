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
import FounderLink from "@/components/site/FounderLink";
import { pageMetadata, fitDescription, fitTitle, breadcrumbJsonLd, guidePageJsonLd, SITE_URL } from "@/lib/seo";
import { CHECKED, COLUMNS, CTA, HERO, META, PICKS, PUBLISHED_ON, SOURCES, TABLE } from "@/content/compare/dorm-room-planners";
import dsz from "@/components/dorm-size/DormSize.module.css";
import css from "@/components/compare/Compare.module.css";

// dormscape, Planner 5D and EZDorms on one page. All copy is in content/compare/dorm-room-planners.
const PATH = "/compare/dorm-room-planners";
const DESCRIPTION = fitDescription(...META.descriptions);
const checked = new Date(`${CHECKED}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export const metadata: Metadata = pageMetadata({ title: fitTitle(...META.titles), description: DESCRIPTION, path: PATH });

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Compare", path: "/compare" },
  { name: META.name, path: PATH },
];

export default function DormRoomPlannersComparePage() {
  return (
    <PageShell navOverlay>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          guidePageJsonLd({
            path: PATH,
            name: META.name,
            description: DESCRIPTION,
            datePublished: PUBLISHED_ON,
            dateModified: CHECKED,
            about: [
              { "@id": `${SITE_URL}/#organization` },
              { "@type": "Thing", name: "Planner 5D", url: "https://planner5d.com/use/dorm-room-planner" },
              { "@type": "Thing", name: "EZDorms", url: "https://ezdorms.com/" },
            ],
          }),
        ]}
      />
      <PageHero
        size="md"
        bg="var(--ds-sky)"
        crumbs={<Crumbs items={crumbs} />}
        eyebrow={
          <>
            {HERO.eyebrow} · {HERO.checked} <time dateTime={CHECKED}>{checked}</time> · {HERO.by} <FounderLink />
          </>
        }
        lines={HERO.lines}
        lede={<p>{HERO.lede}</p>}
      />

      <section className="ds-section" aria-labelledby="table-title">
        <div className="ds-wrap">
          <Headline id="table-title" className="ds-h2 ds-h2--inline" lines={TABLE.title} />
          {/* Scrolls sideways inside its box on a phone; the page itself never does. */}
          <div className={dsz.tableWrap} role="region" aria-labelledby="table-title" tabIndex={0} data-reveal="">
            <table className={`ds-table ${css.table}`}>
              <thead>
                <tr>
                  <th scope="col">{TABLE.corner}</th>
                  {COLUMNS.map((name) => (
                    <th scope="col" key={name}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE.rows.map(([what, ...cells]) => (
                  <tr key={what}>
                    <th scope="row">{what}</th>
                    {cells.map((v, i) => (
                      <td key={COLUMNS[i]}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={dsz.caption}>
            {TABLE.caption}{" "}<time dateTime={CHECKED}>{checked}</time>.
          </p>
        </div>
      </section>

      <section className={`ds-section ${dsz.numbers}`} aria-labelledby="picks-title">
        <div className="ds-wrap">
          <Headline id="picks-title" className="ds-h2 ds-h2--inline" lines={PICKS.title} />
          <div className={`${css.picks} ${css.trio}`}>
            {PICKS.cards.map((card) => (
              <div key={card.heading} className={css.pick} data-us={card.us ? "" : undefined} data-reveal="">
                <h3>{card.heading}</h3>
                <ul>
                  {card.items.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ds-section" aria-labelledby="sources-title">
        <div className="ds-wrap">
          <Headline id="sources-title" className="ds-h2 ds-h2--inline" lines={SOURCES.title} />
          <p className={dsz.caption}>
            {SOURCES.note}{" "}{SOURCES.read}{" "}<time dateTime={CHECKED}>{checked}</time>. {SOURCES.report}{" "}
            <Link href="/contact" className="ds-link">
              {SOURCES.reportLink}
            </Link>
            .
          </p>
          <ol className={css.sources}>
            {SOURCES.list.map((s, i) => (
              <li key={i}>
                {s.product}: <q cite={s.url}>{s.quote}</q>
                {s.context ? ` ${s.context}` : ""}{" "}
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="ds-link">
                  {SOURCES.linkLabel}
                </a>
              </li>
            ))}
          </ol>
          <p className={dsz.caption} style={{ marginTop: 24 }}>
            <Link href="/compare" className="ds-link">
              {SOURCES.more}
            </Link>
          </p>
        </div>
      </section>

      <CtaBand lead={CTA.lead} tail={CTA.tail} note={CTA.note}>
        <PlanCta href="/plan" className="ds-btn ds-btn--yellow ds-btn--lg" freeLabel={CTA.freeLabel} paidLabel={CTA.paidLabel} icon={<ArrowRight />} />
      </CtaBand>
    </PageShell>
  );
}
