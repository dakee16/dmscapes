import Headline from "@/components/ds/Headline";
import type { PublicReview } from "@/lib/reviews";
import css from "./Reviews.module.css";

const month = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

function Stars({ n }: { n: number }) {
  return (
    <span className={css.stars} aria-label={`${n} out of 5 stars`}>
      {"★★★★★".slice(0, n)}
      <span className={css.off}>{"★★★★★".slice(n)}</span>
    </span>
  );
}

/**
 * Real reviews people chose to publish from the feedback form, after the owner
 * approved them (lib/reviews). Renders nothing until there's at least one.
 */
export default function Reviews({ reviews, count, average }: { reviews: PublicReview[]; count: number; average: number }) {
  if (!reviews.length) return null;
  return (
    <section className="ds-section" aria-labelledby="reviews-title">
      <div className="ds-wrap">
        <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
          Reviews · {average.toFixed(1)} out of 5 from {count} {count === 1 ? "review" : "reviews"}
        </p>
        <Headline id="reviews-title" className="ds-h2 ds-h2--inline" lines={[{ text: "In their" }, { text: "own words.", serif: true }]} />
        <ul className={css.list}>
          {reviews.slice(0, 9).map((r, i) => (
            <li key={i} className={css.card} data-reveal="">
              <Stars n={r.rating} />
              <p className={css.text}>{r.text}</p>
              <p className={css.who}>
                {r.name}
                {r.school && <> · {r.school}</>} · {month(r.date)}
              </p>
            </li>
          ))}
        </ul>
        <p className={css.note}>From people who used dormscape and chose to share a review through the feedback form.</p>
      </div>
    </section>
  );
}
