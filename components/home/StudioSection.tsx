"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@/components/ds/Icons";
import { isWide, useScene } from "./flow";
import H2 from "./H2";
import css from "./Home.module.css";

const FEATURES = [
  { h: "3D Room Builder", p: "Build the floor and walls, then add doors and windows." },
  { h: "Live 3D Room Studio", p: "Furnish the room and explore it from different views." },
  { h: "One layout, both views", p: "Switching between 2D and 3D uses no plan credits." },
];

/**
 * 06 · Room Studio (Skiper Apple Feature Block). Each feature changes the
 * room: the wireframe, the lit room, then both split down the middle. On wide
 * screens the section holds while scroll steps through the three and the
 * active one's bar fills; a click works too. Still, it shows the split.
 */
export default function StudioSection() {
  const section = useRef<HTMLElement>(null);
  const pinned = useRef(false);
  const [feat, setFeat] = useState(2);

  useScene((A) => {
    const st = section.current;
    if (!st) return;
    const wide = isWide();
    pinned.current = wide;
    setFeat(0);
    const obs = A.onScroll({
      target: st,
      enter: wide ? "start start" : "62% start",
      leave: wide ? "end end" : "38% end",
      onUpdate: (o) => {
        const x = o.progress * 3;
        const i = Math.min(2, Math.floor(x));
        st.style.setProperty("--fp", Math.min(1, x - i).toFixed(3));
        setFeat(i);
      },
    });
    return () => {
      obs.revert();
      st.style.removeProperty("--fp");
      pinned.current = false;
      setFeat(2);
    };
  });

  // While the section holds, a feature lives at its own stretch of the scroll.
  const pick = (k: number) => {
    const st = section.current;
    if (!pinned.current || !st) return setFeat(k);
    const range = st.offsetHeight - window.innerHeight;
    window.scrollTo({ top: st.getBoundingClientRect().top + window.scrollY + range * ((k + 0.5) / 3), behavior: "smooth" });
  };

  return (
    <section ref={section} id="room-in-3d" className={css.studio} data-bg="#04040f" data-dark="" aria-labelledby="studio-title">
      <div className={`ds-wrap ${css.stGrid}`}>
        <div className={css.stCopy}>
          <p className="ds-eyebrow" data-rv="">
            The Room Studio · Included with Pro
          </p>
          <H2 id="studio-title" s="Your room." f="Now in 3D." />
          <p className={`ds-lede ${css.lede}`} data-rv="">
            Build your walls. Move the desk. Find your light. Pro takes your own room from a blank 3D grid to a furnished
            space.
          </p>
          <ol className={css.sfeats} data-rv="">
            {FEATURES.map((f, i) => (
              <li key={f.h} data-on={feat === i || undefined}>
                <h3>
                  <button type="button" className={css.sfBtn} aria-expanded={feat === i} aria-controls={`studio-feat-${i}`} onClick={() => pick(i)}>
                    <span className={css.sfN} aria-hidden="true">0{i + 1}</span>
                    <span>{f.h}</span>
                    <span className={css.sfPm} aria-hidden="true" />
                  </button>
                </h3>
                <div className={css.sfD} id={`studio-feat-${i}`}>
                  <p>{f.p}</p>
                </div>
                <span className={css.sfBar} aria-hidden="true">
                  <i />
                </span>
              </li>
            ))}
          </ol>
          <div className={css.ctaRow} data-rv="">
            <Link href="/plan/draw/3d" className="ds-btn ds-btn--studio">
              Build your room in 3D
              <ArrowRight />
            </Link>
            <Link href="/pricing#pro" className="ds-btn ds-btn--ghost">
              Explore Pro
            </Link>
          </div>
        </div>
        <div className={css.sfMedia} data-f={feat}>
          <Image
            src="/redesign/home-studio-wireframe.webp"
            alt="A dorm room drawn as a glowing blue 3D wireframe: bed, desk, rug and string lights."
            fill
            quality={75}
            sizes="(max-width: 1023px) min(520px, 100vw), 45vw"
          />
          <div className={css.sfLit}>
            <Image
              src="/redesign/home-studio-lit-room.webp"
              alt="The same room furnished and lit warm by string lights."
              fill
              quality={75}
              sizes="(max-width: 1023px) min(520px, 100vw), 45vw"
            />
          </div>
          <span className={css.sfSeam} aria-hidden="true" />
          <span className={`${css.wl} ${css.wlL}`} aria-hidden="true">
            3D ROOM BUILDER
          </span>
          <span className={`${css.wl} ${css.wlR}`} aria-hidden="true">
            ROOM STUDIO
          </span>
        </div>
      </div>
    </section>
  );
}
