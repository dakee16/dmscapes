import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@/components/ds/Icons";
import H2 from "./H2";
import css from "./Home.module.css";

/** 10 · Final call to action: Make room, with the corner brackets breathing around it (Vengeance Corner Button). */
export default function FinalCta() {
  return (
    <section id="start" className={css.final} data-bg="#e8a622" aria-labelledby="final-title">
      <div className={`ds-wrap ${css.fnGrid}`}>
        <div>
          <p className="ds-eyebrow" data-rv="">
            Your next chapter starts here
          </p>
          <H2 id="final-title" s="Your room" f="is waiting." riso />
          <div className={css.ctaRow} data-rv="">
            <span className={css.corner} data-anim="">
              <Link href="/plan" className="ds-btn ds-btn--ink-yellow ds-btn--lg">
                Make room
                <ArrowUpRight size={22} />
              </Link>
              <i className={css.tl} aria-hidden="true" />
              <i className={css.tr} aria-hidden="true" />
              <i className={css.bl} aria-hidden="true" />
              <i className={css.br} aria-hidden="true" />
            </span>
            <span className={css.note}>Plan my room for free · No account needed to start</span>
          </div>
        </div>
        <div className={css.fnArt} data-rv="img">
          <Image
            src="/redesign/home-cta-room-door.webp"
            alt="A freestanding dorm room with its door open, a made bed visible inside, and warm light spilling across the doormat."
            fill
            quality={75}
            sizes="(max-width: 1023px) min(440px, 100vw), 33vw"
          />
        </div>
      </div>
    </section>
  );
}
