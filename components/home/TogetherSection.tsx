import Link from "next/link";
import Headline from "@/components/ds/Headline";
import { ArrowRight } from "@/components/ds/Icons";
import SplitRoomArt from "@/components/my-room/SplitRoomArt";
import css from "./Home.module.css";

/**
 * 07 · My Room (Pro). The /my-room render (SplitRoomArt) beside the copy: the
 * section takes the render's lavender ground so the art has no edge, and the
 * Room call chip and Maya's note pop in on scroll.
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

        <SplitRoomArt className={css.togetherArt} pop sizes="(min-width: 1024px) 50vw, 100vw" />
      </div>
    </section>
  );
}
