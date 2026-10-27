import Link from "next/link";
import { ArrowRight } from "@/components/ds/Icons";
import { feetInches, spokenFeet, type FeaturedRoom } from "@/lib/home-data";
import H2 from "./H2";
import css from "./Home.module.css";

const PX_PER_FT = 14;
const MORPH_SCHOOLS = ["Penn State", "Michigan", "UCLA", "Georgia"];

/**
 * 08 · Real rooms. A plan outline morphs between four real rooms at 14 px/ft
 * while their square footage rolls digit by digit (outline morph, Vengeance
 * Animated Number; CSS keyframes fed from the data, transform and opacity
 * only). Below, twelve real rooms drawn at the same 7 px per foot.
 */
export default function SchoolsSection({ rooms, schoolCount }: { rooms: FeaturedRoom[]; schoolCount: number }) {
  const picked = MORPH_SCHOOLS.map((s) => rooms.find((r) => r.school === s)).filter((r): r is FeaturedRoom => !!r);
  const morph = picked.length === 4 ? picked : rooms.slice(0, 4);
  const maxW = Math.max(...morph.map((r) => r.lengthFt)) * PX_PER_FT;
  const maxH = Math.max(...morph.map((r) => r.widthFt)) * PX_PER_FT;
  const vars: Record<string, string> = {};
  morph.forEach((r, i) => {
    vars[`--x${i}`] = ((r.lengthFt * PX_PER_FT) / maxW).toFixed(4);
    vars[`--y${i}`] = ((r.widthFt * PX_PER_FT) / maxH).toFixed(4);
    String(r.sqft).padStart(3, "0").slice(-3).split("").forEach((d, k) => (vars[`--d${k}${i}`] = `${-Number(d)}em`));
  });

  return (
    <section id="schools" className={css.schools} data-bg="#f4f3ee" aria-labelledby="schools-title">
      <div className="ds-wrap">
        <div className={css.scHead}>
          <div>
            <p className="ds-eyebrow" data-rv="">
              Supported schools · {schoolCount} and counting
            </p>
            <H2 id="schools-title" s="We already know" f="your room." />
            <p className={`ds-lede ${css.lede}`} data-rv="">
              Floor plans and dimensions from official housing documents. A few of them, drawn to the same scale:
            </p>
          </div>
          {morph.length === 4 && (
            <div className={css.morph} aria-hidden="true" data-rv="" data-anim="" style={vars as React.CSSProperties}>
              <svg className={css.mRect} width={maxW} height={maxH + 14} viewBox={`0 -14 ${maxW} ${maxH + 14}`}>
                <g className={css.mLine}>
                  <line x1="0" y1="-11" x2={maxW} y2="-11" />
                </g>
                <g className={css.mBox}>
                  <rect x="0" y="0" width={maxW} height={maxH} />
                </g>
              </svg>
              <div className={css.mInfo}>
                <div className={css.mNames}>
                  {morph.map((r) => (
                    <span key={r.href}>
                      {r.school}
                      <em>{r.hall}</em>
                    </span>
                  ))}
                </div>
              </div>
              <div className={css.mSq}>
                <span className={css.num}>
                  {[0, 1, 2].map((k) => (
                    <span key={k} className={`${css.dg} ${css[`d${k}`]}`}>
                      <span>
                        {"0123456789".split("").map((d) => (
                          <b key={d}>{d}</b>
                        ))}
                      </span>
                    </span>
                  ))}
                </span>
                <small>SQ FT</small>
              </div>
              <div className={css.mScale}>
                <i />
                10 FT
              </div>
            </div>
          )}
        </div>
        <div className={css.scLinks} data-rv="">
          <Link href="/colleges" className="ds-btn ds-btn--ink">
            See all supported schools
            <ArrowRight />
          </Link>
          <p>
            Don&apos;t see yours?{" "}
            <Link href="/add-school" className="ds-link">
              Add my school
            </Link>
          </p>
          <div className={css.scale} aria-hidden="true">
            <i />
            10 FT
          </div>
        </div>
        <ul className={css.cards}>
          {rooms.map((r) => (
            <li key={r.href} data-rv="row">
              <Link
                href={r.href}
                className={css.card}
                aria-label={`${r.school}, ${r.hall}: ${spokenFeet(r.lengthFt)} by ${spokenFeet(r.widthFt)}, ${r.sqft} square feet`}
              >
                <span className={css.ct}>
                  <span className={css.school}>{r.school}</span>
                  <span className={css.hall}>{r.hall}</span>
                  <span className={css.dims2}>
                    {feetInches(r.lengthFt)} × {feetInches(r.widthFt)}
                  </span>
                  <span className={css.sq}>{r.sqft} SQ FT</span>
                </span>
                <span className={css.rect} aria-hidden="true" style={{ "--l": r.lengthFt, "--w": r.widthFt } as React.CSSProperties} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
