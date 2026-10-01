import Image from "next/image";
import Link from "next/link";
import Headline from "@/components/ds/Headline";
import { ArrowUpRight } from "@/components/ds/Icons";
import css from "./Home.module.css";

/** 10 · Final call to action. */
export default function FinalCta() {
  return (
    <section className={`${css.section} ${css.final}`} aria-labelledby="final-title">
      <div className={`${css.inner} ${css.finalGrid}`}>
        <div className={css.finalCopy}>
          <p className={`ds-eyebrow ${css.finalEyebrow}`} data-reveal="">
            Your next chapter starts here
          </p>
          <Headline
            id="final-title"
            className={css.h2h}
            lines={[
              { text: "Your room", riso: true, className: css.s },
              { text: "is waiting.", serif: true, className: css.f },
            ]}
          />
          <div className={`${css.ctaRow} ${css.finalCtas}`} data-reveal="">
            <Link href="/plan" className={`ds-btn ds-btn--ink-yellow ds-btn--lg ${css.nudge}`}>
              Make room
              <ArrowUpRight size={22} />
            </Link>
            <span className={`${css.note} ${css.finalNote}`}>Plan my room for free · No account needed</span>
          </div>
        </div>
        <div className={css.finalArt} data-reveal-img="">
          <Image
            src="/redesign/home-cta-room-door.jpg"
            alt="A freestanding dorm room with its door open, a made bed visible inside, and warm light spilling across the doormat."
            fill
            quality={75}
            sizes="(min-width: 1024px) 33vw, 80vw"
          />
        </div>
      </div>
    </section>
  );
}
