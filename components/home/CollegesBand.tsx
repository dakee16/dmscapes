import css from "./Home.module.css";

/**
 * Every supported school's name drifting past. Names only, no school logos
 * (those are the schools' trademarks). Pure CSS: it holds still with Motion
 * off or reduced motion.
 */
export default function CollegesBand({ names }: { names: string[] }) {
  return (
    <section id="colleges" className={css.colleges} data-bg="#f4f3ee" aria-labelledby="colleges-title">
      <h2 id="colleges-title" className={`ds-eyebrow ${css.collegesTitle}`} data-rv="">
        Supporting students at {names.length} schools
      </h2>
      <div className={css.cview} aria-hidden="true" data-rv="" data-anim="">
        <ul className={css.ctrack}>
          {names.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
          {/* The loop's second pass draws each name from its attribute, so the page text lists them once. */}
          {names.map((n, i) => (
            <li key={`again-${i}`} data-n={n} />
          ))}
        </ul>
      </div>
    </section>
  );
}
