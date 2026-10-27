import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@/components/ds/Icons";
import { WORKSPACE_MEMBER_LIMIT } from "@/lib/workspace";
import H2 from "./H2";
import css from "./Home.module.css";

/**
 * 07 · My Room (Pro). The split-room render with the room call chip and
 * Cooper's note, and a row of seats (Vengeance Shared Tooltip Avatars): one
 * Pro host, a friend who joined free, and open seats up to the room's limit.
 */
export default function TogetherSection() {
  const open = Math.max(0, WORKSPACE_MEMBER_LIMIT - 2);
  return (
    <section id="together" className={css.together} data-bg="#e5e7f6" aria-labelledby="together-title">
      <div className={`ds-wrap ${css.tgGrid}`}>
        <div className={css.tgCopy}>
          <p className="ds-eyebrow" data-rv="">
            My Room · Included with Pro
          </p>
          <H2 id="together-title" s="Split the room," f="not the fridge." riso />
          <p className={`ds-lede ${css.lede}`} data-rv="">
            A shared room for your people. Bring your roommate into the same plan, mark what&apos;s yours, theirs and
            shared, settle who brings what, and talk it through on a call while you move things around.
          </p>
          <ul className={css.chips} data-rv="">
            <li className={css.chip}>Up to {WORKSPACE_MEMBER_LIMIT} people</li>
            <li className={css.chip}>Friends join free</li>
            <li className={css.chip}>Invites use no credits</li>
          </ul>
          <div className={css.people} data-rv="">
            <div className={css.avs} aria-hidden="true" data-anim="">
              <span className={`${css.tip} ${css.t1}`}>Luke · Pro host</span>
              <span className={`${css.tip} ${css.t2}`}>Cooper · joined free</span>
              <span className={`${css.tip} ${css.t3}`}>Invite a friend · no credits</span>
              <span className={`${css.av} ${css.avL}`}>L</span>
              <span className={`${css.av} ${css.avC}`}>C</span>
              {Array.from({ length: open }, (_, i) => (
                <span key={i} className={`${css.av} ${css.avAdd}`}>
                  +
                </span>
              ))}
            </div>
            <span className={css.peopleL}>One Pro host. Friends join free.</span>
          </div>
          <div className={css.ctaRow} data-rv="">
            <Link href="/my-room" className="ds-btn ds-btn--ink">
              Open My Room
              <ArrowRight />
            </Link>
            <Link href="/pricing#pro" className="ds-btn ds-btn--ghost-ink">
              See what Pro includes
            </Link>
          </div>
        </div>
        <div className={css.tgArt} data-rv="img">
          <Image
            src="/redesign/myroom-split-room-luke-cooper.webp"
            alt="A dorm double split down the middle by a strip of blue painter's tape. One bed on the left, one on the right, and a shared mini fridge and round yellow rug in the middle, each tagged with its owner."
            width={2000}
            height={1800}
            quality={75}
            sizes="(max-width: 1023px) 100vw, 55vw"
          />
          <div className={css.callchip} aria-hidden="true" data-rv="" data-anim="">
            <span className={css.faces}>
              <i className={`${css.av} ${css.avL}`}>L</i>
              <i className={`${css.av} ${css.avC}`}>C</i>
            </span>
            Room call
            <span className={css.eq}>
              <b />
              <b />
              <b />
              <b />
            </span>
          </div>
          <div className={css.notecard} aria-hidden="true" data-rv="" data-anim="">
            <i className={`${css.av} ${css.avC}`}>C</i>
            <span>
              <span>
                <strong>Cooper</strong> is bringing the <strong>mini fridge</strong> from home.
              </span>
              <small>Shared · $0 to buy</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
