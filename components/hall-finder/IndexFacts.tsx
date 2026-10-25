import Link from "next/link";
import { longDate, type SchoolFaq } from "@/lib/hall-finder-seo";
import styles from "./SchoolFacts.module.css";

// The written part of /hall-finder (the all-schools page): what the tool is, where it works with
// the numbers, how the minutes are counted, and the common questions. Plain server HTML; the
// counts and dates come from each school's campus data.

export interface IndexRow {
  id: string;
  name: string;
  ranked: number;
  places: number;
  /** ISO timestamp the school's walking data was built. */
  built: string;
}

export default function IndexFacts({ rows, faqs }: { rows: IndexRow[]; faqs: SchoolFaq[] }) {
  return (
    <section className={styles.facts} aria-labelledby="hf-index-about">
      <div className={styles.wrap}>
        <p className="ds-eyebrow">About this tool</p>
        <h2 id="hf-index-about" className={styles.h2}>How Hall Finder works</h2>
        <p className={styles.p}>
          Hall Finder ranks a school&rsquo;s residence halls by the weekly walk to class. Pick a school, add the buildings where classes meet and the days of the
          week for each, and it lists the halls from the shortest week of walking to the longest, with the walking routes on a map.
        </p>
        <ol className={styles.steps}>
          <li><strong>Add classes.</strong> Upload a schedule or search the school&rsquo;s buildings, libraries, gyms and dining halls.</li>
          <li><strong>Pick the days.</strong> Choose which weekdays each place is visited.</li>
          <li><strong>Rank the halls.</strong> The shortest weekly walk comes first.</li>
        </ol>

        <h2 className={styles.h2}>Where it works</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="ds-sr">Schools with Hall Finder, the halls it ranks and the campus places it covers</caption>
            <thead>
              <tr>
                <th scope="col">School</th>
                <th scope="col">Halls ranked</th>
                <th scope="col">Campus places</th>
                <th scope="col">Data built</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <th scope="row"><Link href={`/colleges/${r.id}/hall-finder`}>{r.name}</Link></th>
                  <td>{r.ranked}</td>
                  <td>{r.places}</td>
                  <td>{longDate(r.built)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.p}>
          Campus places are the classroom buildings, libraries, gyms and dining halls a class or a meal can be added from. A school can list more halls than it
          ranks; a hall with no spot on the map cannot be ranked.
        </p>

        <h2 className={styles.h2}>How the walking time is counted</h2>
        <p className={styles.p}>
          Walks follow real paths and sidewalks from OpenStreetMap, door to door, at an average walking pace of about 3 mph. A hall&rsquo;s weekly walk is, for every
          place, the days visited times the one-way minutes times two. Buses, waiting at crossings and the order of classes are not counted. The details are on{" "}
          <Link href="/methodology#walk-times">how we measure</Link>, and each school&rsquo;s page lists its sources.
        </p>

        <h2 className={styles.h2}>Questions about Hall Finder</h2>
        <dl className={styles.faq}>
          {faqs.map((f) => (
            <div key={f.q}>
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.p}>
          Read the guide: <Link href="/blog/find-the-dorm-closest-to-your-classes">how to find the dorm closest to your classes</Link>. Walking data was last built on{" "}
          {longDate(rows.map((r) => r.built).sort().at(-1) ?? new Date().toISOString())}.
        </p>
      </div>
    </section>
  );
}
