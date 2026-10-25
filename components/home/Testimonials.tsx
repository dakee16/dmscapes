"use client";

import { useRef } from "react";
import Headline from "@/components/ds/Headline";
import { ArrowRight } from "@/components/ds/Icons";
import { useExperienceMotion } from "@/components/experience/MotionProvider";
import { TESTIMONIALS } from "@/lib/home-data";
import css from "./Home.module.css";

/** What students say: a swipeable row of quotes. Hidden until TESTIMONIALS has real ones. */
export default function Testimonials() {
  const track = useRef<HTMLUListElement>(null);
  const { paused } = useExperienceMotion();
  if (!TESTIMONIALS.length) return null;

  const step = (dir: number) => {
    const el = track.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    el.scrollBy({ left: dir * (card.offsetWidth + 20), behavior: paused ? "auto" : "smooth" });
  };

  return (
    <section className={`${css.section} ${css.quotes}`} aria-labelledby="quotes-title">
      <div className={css.inner}>
        <div className={css.quotesHead}>
          <div>
            <p className={`ds-eyebrow ${css.eyebrowGap}`} data-reveal="">
              What students say
            </p>
            <Headline
              id="quotes-title"
              className={css.h2a}
              lines={[
                { text: "Move-in day,", className: css.s },
                { text: "sorted.", serif: true, className: css.f },
              ]}
            />
          </div>
          <div className={css.quotesNav}>
            <button type="button" className={css.quotesBtn} onClick={() => step(-1)} aria-label="Previous quotes">
              <ArrowRight className={css.flip} />
            </button>
            <button type="button" className={css.quotesBtn} onClick={() => step(1)} aria-label="More quotes">
              <ArrowRight />
            </button>
          </div>
        </div>
        <ul ref={track} className={css.quotesTrack} tabIndex={0} aria-label="Student quotes">
          {TESTIMONIALS.map((t) => (
            <li key={t.name} className={css.quote}>
              <blockquote>“{t.quote}”</blockquote>
              <p className={css.quoteBy}>
                <strong>{t.name}</strong>
                <span>{t.detail}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
