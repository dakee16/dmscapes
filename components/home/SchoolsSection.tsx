import Link from "next/link";
import Headline from "@/components/ds/Headline";
import { ArrowRight } from "@/components/ds/Icons";
import { feetInches, type FeaturedRoom } from "@/lib/home-data";
import css from "./Home.module.css";

/** 16.42 → "16 feet 5 inches", for screen readers */
function spoken(ft: number) {
  const [f, i] = feetInches(ft).replace("″", "").split("′").map(Number);
  return i ? `${f} feet ${i} inches` : `${f} feet`;
}

/**
 * 08 · Supported schools. Twelve real rooms from the data, every rectangle
 * drawn at the same 7 px per foot so you can compare them at a glance.
 */
export default function SchoolsSection({ rooms, schoolCount }: { rooms: FeaturedRoom[]; schoolCount: number }) {
  return (
    <section id="schools" className={`${css.section} ${css.schools}`} aria-labelledby="schools-title">
      <div className={css.inner}>
        <div className={css.schoolsHead}>
          <div>
            <p className={`ds-eyebrow ${css.eyebrowGap}`} data-reveal="">
              Supported schools · {schoolCount} and counting
            </p>
            <Headline
              id="schools-title"
              className={css.h2f}
              lines={[
                { text: "We already know", className: css.s },
                { text: "your room.", serif: true, className: css.f },
              ]}
            />
            <p className={`ds-lede ${css.schoolsLede}`} data-reveal="">
              Floor plans and dimensions from official housing documents. A few of them, drawn to the same scale:
            </p>
          </div>
          <div className={css.schoolsLinks} data-reveal="">
            <Link href="/colleges" className="ds-btn ds-btn--ink">
              See all supported schools
              <ArrowRight />
            </Link>
            <p style={{ margin: 0, fontSize: 15 }}>
              Don&apos;t see yours?{" "}
              <Link href="/add-school" className="ds-link">
                Add my school
              </Link>
            </p>
            <div className={css.scale} aria-hidden="true">
              <span className={css.scaleBar} />
              <span className="ds-mono" style={{ fontSize: 11 }}>
                10 FT
              </span>
            </div>
          </div>
        </div>

        <ul className={css.cards} style={{ listStyle: "none", padding: 0 }}>
          {rooms.map((r, i) => (
            <li key={r.href} data-reveal="" style={{ "--i": i % 4 } as React.CSSProperties}>
              <Link
                href={r.href}
                className={css.card}
                aria-label={`${r.school}, ${r.hall}: ${spoken(r.lengthFt)} by ${spoken(r.widthFt)}, ${r.sqft} square feet`}
              >
                <span className={css.cardText}>
                  <span className={css.school}>{r.school}</span>
                  <span className={css.hall}>{r.hall}</span>
                  <span className={css.dims}>
                    {feetInches(r.lengthFt)} × {feetInches(r.widthFt)}
                  </span>
                  <span className={css.sqft}>
                    <span className="ds-num" data-count={r.sqft}>
                      {r.sqft}
                    </span>{" "}
                    SQ FT
                  </span>
                </span>
                <span
                  className={css.rect}
                  data-grow=""
                  aria-hidden="true"
                  style={{ "--l": r.lengthFt, "--w": r.widthFt } as React.CSSProperties}
                >
                  <span className={css.rectDim} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
