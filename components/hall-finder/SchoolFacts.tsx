import Link from "next/link";
import { hallFinderLive, type Campus, type HallFacts } from "@/lib/hall-finder";
import { longDate, type SchoolFaq } from "@/lib/hall-finder-seo";
import styles from "./SchoolFacts.module.css";

// The text of a school's Hall Finder page (design-handoff/hall-finder: not in the designs, which
// show only the interactive finder). It is plain server HTML below the finder, so crawlers and
// answer engines that don't run JavaScript still get what the page is, which halls it ranks, how
// the minutes are counted, where the data comes from and the common questions. Everything is
// read from the school's campus data; the questions come from lib/hall-finder-seo.

interface Props {
  collegeId: string;
  short: string;
  schoolName: string;
  campus: Campus;
  facts: Record<string, HallFacts>;
  ranked: number;
  imagesOn: boolean;
  faqs: SchoolFaq[];
}

/** The ranked halls grouped by housing area, areas A to Z and halls with no area last. */
function byArea(campus: Campus, facts: Record<string, HallFacts>) {
  const groups = new Map<string, { dormId: string; name: string }[]>();
  for (const h of campus.halls) {
    if (h.lng === null || h.lat === null) continue;
    const area = facts[h.dormId]?.area ?? "";
    groups.set(area, [...(groups.get(area) ?? []), { dormId: h.dormId, name: h.name }]);
  }
  return [...groups.entries()]
    .map(([area, halls]) => ({ area, halls: halls.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => (a.area === "" ? 1 : b.area === "" ? -1 : a.area.localeCompare(b.area)));
}

/** The sources worth citing: linked ones, once each. The data lists one "Housing page" entry per hall
 *  (its year tag), which the housing source above it already covers; the entry for hand fixes has no link. */
function citedSources(campus: Campus) {
  const web = (url: string) => /^https?:\/\//.test(url);
  return { cited: campus.sources.filter((s) => web(s.url) && s.name !== "Housing page"), byHand: campus.sources.some((s) => !web(s.url)) };
}

export default function SchoolFacts({ collegeId, short, schoolName, campus, facts, ranked, imagesOn, faqs }: Props) {
  const groups = byArea(campus, facts);
  const { cited, byHand } = citedSources(campus);
  const grouped = groups.some((g) => g.area !== "");
  return (
    <section className={styles.facts} aria-labelledby="hf-about">
      <div className={styles.wrap}>
        <p className="ds-eyebrow">About this tool</p>
        <h2 id="hf-about" className={styles.h2}>How the {short} Hall Finder works</h2>
        <p className={styles.p}>
          {`Hall Finder ranks ${ranked} ${short} residence halls by the weekly walk to class. Add the buildings where classes meet and the days of the week for each. It adds up every hall's walk there and back, then lists the halls from the shortest week of walking to the longest, with the walking routes on a map.`}
        </p>
        <ol className={styles.steps}>
          <li>
            <strong>Add classes.</strong> {imagesOn ? "Upload an .ics calendar, a screenshot or a PDF of the schedule," : "Upload an .ics calendar file,"} or search{" "}
            {campus.places.length} campus places (classroom buildings, libraries, gyms and dining halls) by name or building code.
          </li>
          <li>
            <strong>Pick the days.</strong> Choose which weekdays each place is visited.
          </li>
          <li>
            <strong>Rank the halls.</strong> The shortest weekly walk comes first. Pick a hall to see each route and its minutes.
          </li>
        </ol>

        <h2 className={styles.h2}>The {ranked} {short} halls it ranks</h2>
        <p className={styles.p}>Each hall links to its own page, with room sizes and a to-scale floor plan.</p>
        {groups.map(({ area, halls }) => (
          <div key={area || "other"}>
            {grouped && <h3 className={styles.h3}>{area || "Other halls"}</h3>}
            <ul className={styles.halls}>
              {halls.map((h) => (
                <li key={h.dormId}>
                  <Link href={`/colleges/${collegeId}/${h.dormId}`}>{h.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <h2 className={styles.h2}>How the walking time is counted</h2>
        <p className={styles.p}>
          Walks follow real paths and sidewalks from OpenStreetMap, door to door, at an average walking pace of about 3 mph. A hall&rsquo;s weekly walk is, for every place, the days
          visited times the one-way minutes times two. Buses, waiting at crossings and the order of classes are not counted, so treat the result as a fair way to
          compare halls rather than a stopwatch. The details are on <Link href="/methodology#walk-times">how we measure</Link>.
        </p>

        <h2 className={styles.h2}>Where the data comes from</h2>
        <p className={styles.p}>Walking data for {short} was last built on {longDate(campus.generatedAt)} from these sources.</p>
        <ul className={styles.sources}>
          {cited.map((s) => (
            <li key={s.url}>
              <a href={s.url} rel="noopener">{s.name}</a>
              {s.use ? `: ${s.use}` : ""}
              {s.license ? ` (${s.license})` : ""}
            </li>
          ))}
        </ul>
        {byHand && <p className={styles.p}>Where those sources had gaps, a few building locations, codes and first-year tags were set by hand.</p>}

        <h2 className={styles.h2}>Questions about Hall Finder at {short}</h2>
        <dl className={styles.faq}>
          {faqs.map((f) => (
            <div key={f.q}>
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </div>
          ))}
        </dl>

        <p className={styles.p}>
          {hallFinderLive() && (
            <>
              Read the guide: <Link href="/blog/find-the-dorm-closest-to-your-classes">how to find the dorm closest to your classes</Link>.{" "}
            </>
          )}
          Browse <Link href={`/colleges/${collegeId}`}>every {short} building and its room sizes</Link>, or plan a room at{" "}
          <Link href="/plan">the room planner</Link>.
        </p>
      </div>
    </section>
  );
}
