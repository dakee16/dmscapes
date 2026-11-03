"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@/components/ds/Icons";
import { scrub, useScene } from "./flow";
import H2 from "./H2";
import css from "./Home.module.css";

const FEATURES = [
  { h: "3D Room Builder", p: "Build the floor and walls, then add doors and windows." },
  { h: "Live 3D Room Studio", p: "Furnish the room and explore it from different views." },
  { h: "One layout, both views", p: "Switching between 2D and 3D uses no plan credits." },
];
/** Lights from the picture's scroll progress w (the same ramp as --L in Home.module.css). */
const lightsAt = (w: number) => Math.min(1, Math.max(0, (w - 0.22) / 0.62));

/**
 * 06 · Room Studio. Nothing pins: --w runs 0 → 1 as the picture's top moves from
 * 92% to 10% of the screen. The Kokonut Pull Cord tugs first, then the lights come
 * on (--L): the lit room wipes in over the wireframe from the right, a seam rides the
 * edge, the label swaps and the frame warms; each feature's line fills in turn. The
 * cord is a real button: it flips the lights by hand (and from then on scroll leaves
 * them alone). Still, --w and --L stay 1: lights on, lines full.
 */
export default function StudioSection() {
  const section = useRef<HTMLElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const cord = useRef<HTMLButtonElement>(null);
  const [scrollLit, setScrollLit] = useState(true);
  const [manual, setManual] = useState<boolean | null>(null);
  const lit = manual ?? scrollLit;

  const still = useScene((A) => {
    const st = section.current, pic = media.current;
    if (!st || !pic) return;
    const range = { target: pic, enter: "92% start", leave: "10% start" };
    const off = scrub(A, st, "--w", range);
    const watch = A.onScroll({ ...range, onUpdate: (o) => setScrollLit(lightsAt(o.progress) >= 0.5) });
    // onUpdate only runs in range, so start from where the picture is now.
    const top = pic.getBoundingClientRect().top, vh = window.innerHeight;
    setScrollLit(lightsAt((0.92 * vh - top) / (0.82 * vh)) >= 0.5);
    return () => {
      off();
      watch.revert();
      setScrollLit(true);
    };
  });

  function pull() {
    setManual(!lit);
    if (still) return;
    const line = cord.current?.querySelector<HTMLElement>("[data-line]");
    const bead = cord.current?.querySelector<HTMLElement>("[data-bead]");
    const spring = { duration: 720, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" };
    line?.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(1.2)", offset: 0.28 }, { transform: "scaleY(0.95)", offset: 0.6 }, { transform: "scaleY(1)" }], spring);
    bead?.animate([{ transform: "none" }, { transform: "translateY(27px)", offset: 0.28 }, { transform: "translateY(-6px)", offset: 0.6 }, { transform: "none" }], spring);
  }

  return (
    <section
      ref={section}
      id="room-in-3d"
      className={css.studio}
      data-bg="#04040f"
      data-dark=""
      data-manual={manual === null ? undefined : ""}
      style={manual === null ? undefined : ({ "--L": manual ? 1 : 0 } as React.CSSProperties)}
      aria-labelledby="studio-title"
    >
      <div className={`ds-wrap ${css.stGrid}`}>
        <div className={css.stCopy}>
          <p className="ds-eyebrow">
            The Room Studio · Included with Pro
          </p>
          <H2 id="studio-title" s="Your room." f="Now in 3D." />
          <p className={`ds-lede ${css.lede}`}>
            Build your walls. Move the desk. Find your light. Pro takes your own room from a blank 3D grid to a furnished
            space.
          </p>
          <ol className={css.sRows}>
            {FEATURES.map((f) => (
              <li key={f.h}>
                <h3>{f.h}</h3>
                <p>{f.p}</p>
              </li>
            ))}
          </ol>
          <div className={css.ctaRow}>
            <Link href="/plan/draw/3d" className="ds-btn ds-btn--studio">
              Build your room in 3D
              <ArrowRight />
            </Link>
            <Link href="/pricing#pro" className="ds-btn ds-btn--ghost">
              Explore Pro
            </Link>
          </div>
        </div>
        <div className={css.sfWrap}>
          <span className={css.sfGlow} aria-hidden="true" />
          <div ref={media} className={css.sfMedia}>
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
            <span className={`${css.wl} ${css.wlA}`} aria-hidden="true">
              3D ROOM BUILDER
            </span>
            <span className={`${css.wl} ${css.wlB}`} aria-hidden="true">
              ROOM STUDIO
            </span>
          </div>
          <button
            ref={cord}
            type="button"
            className={css.cord}
            aria-pressed={lit}
            aria-label="Light switch: pull the cord to turn the room's lights on or off"
            onClick={pull}
          >
            <span className={css.cordLine} data-line="" aria-hidden="true" />
            <span className={css.cordBead} data-bead="" aria-hidden="true" />
          </button>
          <span className={css.cordPill} aria-hidden="true">
            <b className={css.cpOff}>PULL FOR LIGHTS</b>
            <b className={css.cpOn}>LIGHTS ON</b>
          </span>
        </div>
      </div>
    </section>
  );
}
