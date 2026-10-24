import Link from "next/link";
import type { Metadata } from "next";
import PageShell from "@/components/ds/PageShell";
import Headline from "@/components/ds/Headline";
import Crumbs from "@/components/ds/Crumbs";
import JsonLd from "@/components/site/JsonLd";
import LastSchool from "@/components/hall-finder/LastSchool";
import { getSchool } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { PILOT_SCHOOLS, hallFinderLive } from "@/lib/hall-finder";
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

export default function HallFinderIndex() {
  const schools = PILOT_SCHOOLS.map((id) => getSchool(id)).filter((s) => s !== undefined);
  const names = Object.fromEntries(schools.map((s) => [s.id, shortName(s)]));
  const crumbs = [{ name: "Hall Finder", path: "/hall-finder" }];
  return (
    <PageShell>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />
      <section className="ds-section">
        <div className="ds-wrap">
          <Crumbs items={crumbs} />
          <p className="ds-eyebrow" style={{ marginTop: 18 }}>Now at {schools.length} schools</p>
          <Headline className="ds-h1" lines={[{ text: "Pick the hall", riso: true }, { text: "closest to class.", serif: true }]} />
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
                    <span>{s.dorms.length} halls</span>
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
    </PageShell>
  );
}
