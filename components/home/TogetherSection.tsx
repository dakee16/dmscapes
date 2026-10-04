import Link from "next/link";
import Headline from "@/components/ds/Headline";
import { ArrowRight } from "@/components/ds/Icons";
import css from "./Home.module.css";

/**
 * 07 · My Room (Pro). A to-scale double drawn in CSS: tape runs down the
 * middle, the halves tint to their owners, the shared pieces fill with
 * yellow hatching and the owner chips pop on (MOTION.md · My Room).
 */
export default function TogetherSection() {
  return (
    <section id="together" className={`${css.section} ${css.together}`} aria-labelledby="together-title">
      <div className={`${css.inner} ${css.togetherGrid}`}>
        <div>
          <p className={`ds-eyebrow ${css.eyebrowGap}`} data-reveal="">
            My Room · Included with Pro
          </p>
          <Headline
            id="together-title"
            className={css.h2e}
            lines={[
              { text: "Split the room,", riso: true, className: css.s },
              { text: "not the fridge.", serif: true, className: css.f },
            ]}
          />
          <p className={`ds-lede ${css.togetherLede}`} data-reveal="">
            A shared room for your people. Bring your roommate into the same plan, mark what&apos;s yours, theirs and
            shared, settle who brings what, and talk it through on a call while you move things around.
          </p>
          <ul className={css.chips} data-stagger="" style={{ listStyle: "none", padding: 0 }}>
            <li className={`ds-tag ${css.chip}`} data-pop="">Up to 4 people</li>
            <li className={`ds-tag ${css.chip}`} data-pop="">Friends join free</li>
            <li className={`ds-tag ${css.chip}`} data-pop="">Invites use no credits</li>
          </ul>
          <div className={`${css.ctaRow} ${css.togetherCtas}`} data-reveal="">
            <Link href="/my-room" className="ds-btn ds-btn--ink">
              Open My Room
              <ArrowRight />
            </Link>
            <Link href="/pricing#pro" className="ds-btn ds-btn--ghost-ink">
              See what Pro includes
            </Link>
          </div>
        </div>

        <figure className={`ds-plan-paper ${css.room}`} data-reveal="" style={{ margin: 0 }}>
          <div className={css.roomLabels} aria-hidden="true">
            <span>JORDAN&apos;S HALF</span>
            <span>MAYA&apos;S HALF</span>
          </div>
          <div className={css.plan} role="img" aria-label="Floor plan of a shared double. Jordan's half on the left, Maya's on the right, a tape line down the middle. The mini fridge and the rug are marked shared.">
            <span className={`${css.half} ${css.halfL}`} />
            <span className={`${css.half} ${css.halfR}`} />
            <span className={css.tapeLine} />
            <span className={css.window} />
            <span className={css.door} />
            <span className={`${css.piece} ${css.bed} ${css.bedJ}`} />
            <span className={`${css.piece} ${css.bed} ${css.bedM}`} />
            <span className={`${css.piece} ${css.desk} ${css.deskJ}`} />
            <span className={`${css.piece} ${css.desk} ${css.deskM}`} />
            <span className={`${css.piece} ${css.hatch} ${css.rug}`} />
            <span className={`${css.piece} ${css.hatch} ${css.fridge}`} />
            <span className={`${css.ownerChip} ${css.chipJ}`}>JORDAN&apos;S</span>
            <span className={`${css.ownerChip} ${css.chipS}`}>SHARED</span>
            <span className={`${css.ownerChip} ${css.chipM}`}>MAYA&apos;S</span>
            <span className={css.cursor}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 3l15 7.5-6.5 1.8L10 19z" fill="#C0186F" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              <span className={css.cursorTag}>Maya</span>
            </span>
          </div>
          <figcaption className={css.toast}>
            <span className={css.avatar} style={{ background: "var(--ds-magenta)" }} aria-hidden="true">
              M
            </span>
            <span>
              <strong>Maya</strong> is bringing the <strong>mini fridge</strong> from home.
              <span className="ds-mono" style={{ display: "block", marginTop: 3, fontSize: 10, color: "var(--ds-yellow)" }}>
                Shared · $0 to buy
              </span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
