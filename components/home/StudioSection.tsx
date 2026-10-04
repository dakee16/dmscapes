"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Headline from "@/components/ds/Headline";
import { ArrowRight } from "@/components/ds/Icons";
import { useScrub, span, easeOutExpo } from "@/components/ds/useScrub";
import css from "./Home.module.css";

const FEATURES = [
  { h: "3D Room Builder", p: "Build the floor and walls, then add doors and windows." },
  { h: "Live 3D Room Studio", p: "Furnish the room and explore it from different views." },
  { h: "One layout, both views", p: "Switching between 2D and 3D uses no plan credits." },
];

const REST = 45;

/**
 * 06 · Room Studio. The lit room wipes across its own wireframe as you scroll
 * (pinned for half a screen on desktop) and comes to rest split down the
 * middle. After that the seam is yours: drag it, or use the arrow keys.
 */
export default function StudioSection() {
  const track = useRef<HTMLDivElement>(null);
  const wipe = useRef<HTMLDivElement>(null);
  const feats = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const [x, setX] = useState(REST);

  const apply = (v: number) => {
    wipe.current?.style.setProperty("--x", `${v.toFixed(2)}%`);
  };

  useScrub(
    track,
    (p) => {
      if (!touched.current) apply(100 - (100 - REST) * easeOutExpo(span(p, 0.12, 0.8)));
      feats.current?.querySelectorAll<HTMLElement>("[data-feat]").forEach((el, i) => {
        el.dataset.lit = String(p > 0.3 + i * 0.16);
      });
    },
    { from: [0, 0.9], to: [1, 1], smooth: 0.6, rest: 1 }
  );

  const setFromPointer = (clientX: number) => {
    const el = wipe.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const v = Math.min(96, Math.max(4, ((clientX - r.left) / r.width) * 100));
    touched.current = true;
    setX(v);
    apply(v);
  };

  return (
    <section id="room-in-3d" className={`${css.section} ${css.studio}`} aria-labelledby="studio-title">
      <div ref={track} className={css.studioTrack}>
        <div className={css.studioPin}>
          <div className={`${css.inner} ${css.studioGrid}`}>
            <div
              ref={wipe}
              className={css.wipe}
              data-reveal-img=""
              style={{ "--x": `${REST}%` } as React.CSSProperties}
              onPointerDown={(e) => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                setFromPointer(e.clientX);
              }}
              onPointerMove={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromPointer(e.clientX);
              }}
            >
              <Image
                src="/redesign/home-studio-wireframe.jpg"
                alt="A dorm room drawn as a glowing blue 3D wireframe: bed, desk, rug and string lights."
                fill
                quality={75}
                sizes="(min-width: 1024px) 45vw, 100vw"
              />
              <div className={css.wipeTop}>
                <Image
                  src="/redesign/home-studio-lit-room.jpg"
                  alt="The same room furnished and lit warm by string lights."
                  fill
                  quality={75}
                  sizes="(min-width: 1024px) 45vw, 100vw"
                />
              </div>
              <span className={`${css.seam} ${css.glow}`} aria-hidden="true" />
              <span className={css.wipeLabel} style={{ left: 16, color: "#8fa8ff" }} aria-hidden="true">
                3D ROOM BUILDER
              </span>
              <span className={css.wipeLabel} style={{ right: 16, color: "var(--ds-studio)" }} aria-hidden="true">
                ROOM STUDIO
              </span>
              <span
                className={css.handle}
                role="slider"
                tabIndex={0}
                aria-label="Compare the wireframe and the furnished room"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(x)}
                aria-valuetext={`${Math.round(100 - x)}% furnished`}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 15 : 5;
                  let v = x;
                  if (e.key === "ArrowLeft" || e.key === "ArrowDown") v = x - step;
                  else if (e.key === "ArrowRight" || e.key === "ArrowUp") v = x + step;
                  else if (e.key === "Home") v = 4;
                  else if (e.key === "End") v = 96;
                  else return;
                  e.preventDefault();
                  v = Math.min(96, Math.max(4, v));
                  touched.current = true;
                  setX(v);
                  apply(v);
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
                </svg>
              </span>
            </div>
            <div className={css.studioCopy}>
              <div className={css.studioHead}>
                <p className={`ds-eyebrow ${css.eyebrowGap} ${css.studioEyebrow}`} data-reveal="">
                  The Room Studio · Included with Pro
                </p>
                <Headline
                  id="studio-title"
                  className={css.h2d}
                  lines={[
                    { text: "Your room.", className: css.s },
                    { text: "Now in 3D.", serif: true, className: css.f },
                  ]}
                />
                <p className={`ds-lede ${css.studioLede}`} data-reveal="">
                  Build your walls. Move the desk. Find your light. Pro takes your own room from a blank 3D grid to a
                  furnished space.
                </p>
              </div>
              <div ref={feats} className={css.feats} data-stagger="">
                {FEATURES.map((f) => (
                  <div key={f.h} className={css.feat} data-feat="" data-reveal="">
                    <h3>{f.h}</h3>
                    <span>{f.p}</span>
                  </div>
                ))}
              </div>
              <div className={`${css.ctaRow} ${css.studioCtas}`} data-reveal="">
                <Link href="/plan/draw/3d" className="ds-btn ds-btn--studio">
                  Build your room in 3D
                  <ArrowRight />
                </Link>
                <Link href="/pricing#pro" className="ds-btn ds-btn--ghost">
                  Explore Pro
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
