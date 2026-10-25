import Link from "next/link";
import type { Metadata } from "next";
import PageShell from "@/components/ds/PageShell";
import Headline from "@/components/ds/Headline";
import Crumbs from "@/components/ds/Crumbs";
import JsonLd from "@/components/site/JsonLd";
import LastSchool from "@/components/hall-finder/LastSchool";
import IndexFacts, { type IndexRow } from "@/components/hall-finder/IndexFacts";
import { getSchool } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { breadcrumbJsonLd, itemListJsonLd, pageMetadata } from "@/lib/seo";
import { PILOT_SCHOOLS, hallFinderLive, rankedHalls } from "@/lib/hall-finder";
import { loadCampus } from "@/lib/hall-finder-server";
import { datedPageJsonLd, indexFaqs } from "@/lib/hall-finder-seo";
import { faqPageJsonLd } from "@/lib/blog";
import css from "@/components/colleges/Colleges.module.css";

// The nav's Hall Finder link (design-handoff/hall-finder plan.md "Nav target"): the pilot
// schools, plus "More schools soon"; remembers the last school used.
export const metadata: Metadata = pageMetadata({
  title: "Hall Finder: Rank Dorms by Your Walk to Class",
  description: "Add the buildings you have classes in and rank your school's residence halls by your weekly walk, with real walking routes.",
  path: "/hall-finder",
  noIndex: !hallFinderLive(),
});

const TONES = ["blue", "yellow", "white"] as const;

export default async function HallFinderIndex() {
  const schools = PILOT_SCHOOLS.map((id) => getSchool(id)).filter((s) => s !== undefined);
  const names = Object.fromEntries(schools.map((s) => [s.id, shortName(s)]));
  const crumbs = [{ name: "Hall Finder", path: "/hall-finder" }];
  // What each finder really ranks (a school can list more halls than have a spot on the map).
  const loaded = await Promise.all(schools.map((s) => loadCampus(s.id)));
  const rows: IndexRow[] = schools.flatMap((s, i) => {
    const campus = loaded[i]?.campus;
    return campus ? [{ id: s.id, name: s.name, ranked: rankedHalls(campus), places: campus.places.length, built: campus.generatedAt }] : [];
  });
  const rankedOf = Object.fromEntries(rows.map((r) => [r.id, r.ranked]));
  const built = loaded.flatMap((l) => (l ? [l.campus.generatedAt] : [])).sort().at(-1) ?? new Date().toISOString();
  const faqs = indexFaqs({ schools: schools.map((s) => names[s.id]), ranked: rows.reduce((n, r) => n + r.ranked, 0) });
  return (
    <PageShell>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          { ...datedPageJsonLd({ path: "/hall-finder", name: "Hall Finder: rank dorms by your walk to class", dateModified: built }), "@type": "CollectionPage" },
          itemListJsonLd("Schools with Hall Finder", schools.map((s) => ({ name: `${s.name} Hall Finder`, path: `/colleges/${s.id}/hall-finder` }))),
          faqPageJsonLd(faqs),
        ]}
      />
      <section className="ds-section">
        <div className="ds-wrap">
          <Crumbs items={crumbs} />
          <p className="ds-eyebrow" style={{ marginTop: 18 }}>Now at {schools.length} schools</p>
          <Headline as="h1" load className="ds-h1" lines={[{ text: "Pick the hall", riso: true }, { text: "closest to class.", serif: true }]} />
          <p className="ds-lede" style={{ maxWidth: 620 }}>
            Add the buildings you have classes in and we rank your school&apos;s halls by your weekly walk. Most schools
            assign rooms, so use it to rank your housing preferences.
          </p>
          <LastSchool names={names} />
          <ul className={css.cards} style={{ marginTop: 32 }}>
            {schools.map((s, i) => (
              <li key={s.id} className={css.cardItem}>
                <Link href={`/colleges/${s.id}/hall-finder`} className={css.indexCard}>
                  <span className={css.cardTab} data-tone={TONES[i % 3]} aria-hidden="true">{shortName(s)[0]}</span>
                  <span className={css.cardName}>{s.name}</span>
                  <span className={css.cardPlace}>{[s.city, s.state].filter(Boolean).join(", ")}</span>
                  <span className={css.cardMeta}>
                    <span>{rankedOf[s.id] ?? s.dorms.length} halls ranked</span>
                    <span className={css.cardGo} aria-hidden="true">Rank halls →</span>
                  </span>
                </Link>
              </li>
            ))}
            <li className={css.cardItem}>
              <div className={css.indexCard} data-soon="" style={{ cursor: "default" }}>
                <span className={css.cardName}>More schools soon</span>
                <span className={css.cardPlace}>
                  Hall Finder is at {schools.length} schools to start. <Link href="/colleges" className="ds-link">Every school</Link> still has room sizes and planning.
                </span>
              </div>
            </li>
          </ul>
        </div>
      </section>
      <IndexFacts rows={rows} faqs={faqs} />
    </PageShell>
  );
}
