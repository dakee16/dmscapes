import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import TapeStats from "@/components/ds/TapeStats";
import SchoolSearch from "@/components/ds/SchoolSearch";
import CollegeDrawers, { type Campus } from "@/components/colleges/CollegeDrawers";
import { ArrowRight } from "@/components/ds/Icons";
import JsonLd from "@/components/site/JsonLd";
import { SCHOOLS, publishedDimsCount } from "@/lib/schools";
import { shortName, sortKey } from "@/lib/school-names";
import { pageMetadata, breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo";
import css from "@/components/colleges/Colleges.module.css";

const DORM_COUNT = SCHOOLS.reduce((n, s) => n + s.dorms.length, 0);
const ROOM_TYPES = SCHOOLS.reduce((n, s) => n + s.dorms.reduce((m, d) => m + d.rooms.length, 0), 0);
const PUBLISHED = SCHOOLS.reduce((n, s) => n + publishedDimsCount(s), 0);

export const metadata: Metadata = pageMetadata({
  title: "Dorm Room Dimensions by College",
  description: `Browse ${SCHOOLS.length} colleges and ${DORM_COUNT} residence halls with dorm room dimensions preloaded. Pick your school and building, then plan your exact room free.`,
  path: "/colleges",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Colleges", path: "/colleges" },
];

const fmt = (n: number) => n.toLocaleString("en-US");

export default function CollegesPage() {
  const campuses: Campus[] = SCHOOLS.map((s) => ({
    id: s.id,
    name: s.name,
    sort: sortKey(s.name),
    city: s.city,
    state: s.state,
    buildings: s.dorms.length,
    rooms: s.dorms.reduce((n, d) => n + d.rooms.length, 0),
  })).sort((a, b) => a.sort.localeCompare(b.sort));

  const big = [...campuses].sort((a, b) => b.buildings - a.buildings || a.sort.localeCompare(b.sort)).slice(0, 12);
  const maxB = big[0]?.buildings ?? 1;

  return (
    <PageShell navOverlay>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          itemListJsonLd(
            "Colleges with dorm room dimensions",
            SCHOOLS.map((s) => ({ name: s.name, path: `/colleges/${s.id}` }))
          ),
        ]}
      />
      <PageHero
        bg="var(--ds-warm)"
        eyebrow={
          <>
            {SCHOOLS.length} schools · {fmt(DORM_COUNT)} residence halls
          </>
        }
        lines={[
          { text: "Find your", riso: true },
          { text: "campus.", serif: true },
        ]}
        className={css.hero}
        lede={
          <p>
            Start with your campus. Explore residence halls, room types, published dimensions, and example layouts
            drawn to scale. A little planning now makes move-in feel a lot more familiar.
          </p>
        }
        art={{
          src: "/redesign/site-colleges-card-catalog.jpg",
          alt: "A wooden card catalog with its P–R drawer pulled out and one index card raised.",
          ratio: 1400 / 1440,
          position: "40% 50%",
        }}
      >
        <div className={css.heroSearch}>
          <SchoolSearch
            to="college"
            tone="ink"
            button="Find your school"
            placeholder={`Search ${SCHOOLS.length} schools`}
          />
          <p className={css.heroNote}>
            <span className="ds-mono">Not listed?</span>{" "}
            <Link href="/add-school" className="ds-link">
              Add your school
            </Link>{" "}
            or{" "}
            <Link href="/plan/draw" className="ds-link">
              draw your room in 2D
            </Link>
          </p>
        </div>
      </PageHero>

      <TapeStats
        label="Directory totals"
        items={[
          <>{SCHOOLS.length} schools</>,
          <>{fmt(DORM_COUNT)} residence halls</>,
          <>{fmt(ROOM_TYPES)} room types</>,
          <>{fmt(PUBLISHED)} published sizes</>,
        ]}
      />

      <section className="ds-section" aria-labelledby="directory-title" id="directory">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            The directory · {campuses.length} of {SCHOOLS.length} schools
          </p>
          <Headline
            id="directory-title"
            className="ds-h2 ds-h2--inline"
            lines={[
              { text: "Every school," },
              { text: "filed A to Z.", serif: true },
            ]}
          />
          <CollegeDrawers schools={campuses} />
        </div>
      </section>

      <section className={`ds-section ${css.bigSection}`} aria-labelledby="big-title">
        <div className="ds-wrap">
          <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
            Sorted by number of buildings
          </p>
          <Headline
            id="big-title"
            className="ds-h2 ds-h2--inline"
            lines={[{ text: "The big" }, { text: "campuses.", serif: true }]}
          />
          <ul className={css.bigGrid}>
            {big.map((c, i) => (
              <li key={c.id} data-reveal="" style={{ "--i": i % 4 } as React.CSSProperties}>
                <Link href={`/colleges/${c.id}`} className={css.bigCard} data-first={i === 0 || undefined}>
                  <span className={css.bigTop}>
                    <span className={css.bigName}>{shortName(c)}</span>
                    <span className={css.bigPlace}>{[c.city, c.state].filter(Boolean).join(", ")}</span>
                  </span>
                  <span className={css.bigRow}>
                    <span className={`ds-num ${css.bigNum}`} data-count={c.buildings}>
                      {c.buildings}
                    </span>
                    <span className={css.bigMeta}>buildings · {c.rooms} room types</span>
                  </span>
                  <span className={css.bigBar} aria-hidden="true">
                    <span data-bar="" style={{ width: `${(c.buildings / maxB) * 100}%` }} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ds-section" aria-labelledby="eventually-title">
        <div className={`ds-wrap ${css.eventually}`}>
          <div>
            <Headline
              id="eventually-title"
              className="ds-h2"
              lines={[{ text: "Every" }, { text: <>campus, <em className="ds-serif ds-serif--blue" style={{ fontStyle: "italic" }}>eventually.</em></> }]}
            />
            <p className="ds-lede" style={{ marginTop: 18, maxWidth: 520 }} data-reveal="">
              Know your room&apos;s size? Even better. Measurements help us support your dorm faster.
            </p>
            <div className={css.eventuallyCtas} data-reveal="">
              <Link href="/add-school" className="ds-btn ds-btn--ink-yellow">
                Add your school
                <ArrowRight />
              </Link>
              <Link href="/plan/draw" className="ds-btn ds-btn--ghost-ink">
                Draw your room in 2D
              </Link>
            </div>
          </div>
          <Link href="/add-school" className={css.yourSchool} data-reveal="">
            <span className={css.plus} aria-hidden="true">
              +
            </span>
            <span className={css.yourSchoolText}>Your school here</span>
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
