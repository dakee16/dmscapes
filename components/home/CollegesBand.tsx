import css from "./Home.module.css";

/**
 * Under the tape band: every supported school's name drifting past. Names only,
 * no school logos (those are the schools' trademarks). Pure CSS: it holds still
 * with motion paused or reduced.
 */
export default function CollegesBand({ names }: { names: string[] }) {
  return (
    <section className={css.colleges} aria-labelledby="colleges-title">
      <h2 id="colleges-title" className={`ds-eyebrow ${css.collegesTitle}`}>
        Supporting students at {names.length} schools
      </h2>
      <div className={css.collegesView} aria-hidden="true">
        <ul className={css.collegesTrack} style={{ "--dur": `${names.length * 3}s` } as React.CSSProperties}>
          {[...names, ...names].map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
