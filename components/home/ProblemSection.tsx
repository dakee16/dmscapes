"use client";

import { useRef } from "react";
import { HERO_ROOM, SHOWCASE_BUDGET, examplePlan, feetInches, spokenFeet } from "@/lib/home-data";
import { scrub, useScene } from "./flow";
import H2 from "./H2";
import css from "./Home.module.css";

const EXAMPLE = examplePlan(SHOWCASE_BUDGET);
const BARS = 36;

/**
 * 02 · Why plan. A Kokonut Widget Grid of the three questions, each answered by a
 * drawing of the real Geary Hall double that plays out as the card scrolls up: the
 * exact size replaces "approx.", the furniture and rug land and fit, and a generic
 * list becomes the example plan. Nothing pins: each card's --q runs 0 → 1 with its
 * own position (the card's <li>, which the row reveal never moves, top at 88% → 22% of the screen), and CSS draws everything from it.
 * Still (no JS, reduced motion, Motion off), --q stays 1: every drawing finished.
 */
export default function ProblemSection() {
  const grid = useRef<HTMLUListElement>(null);

  useScene((A) => {
    const cards = Array.from(grid.current?.querySelectorAll<HTMLElement>("[data-q]") ?? []);
    const offs = cards.map((c) => scrub(A, c, "--q", { target: c, enter: "88% start", leave: "22% start" }));
    return () => offs.forEach((off) => off());
  });

  return (
    <section id="why" className={css.problem} data-bg="#f5e9d8" aria-labelledby="problem-title">
      <div className="ds-wrap">
        <div className={css.prHead}>
          <div>
            <p className="ds-eyebrow" data-rv="">
              Why dorm shopping goes wrong
            </p>
            <H2 id="problem-title" s="Winging it gets returned." f="Planning fits." />
          </div>
          <p className={`ds-lede ${css.lede}`} data-rv="">
            Housing pages list room sizes as approximate, if they list them at all. Generic packing lists run to dozens
            of items. So families buy blind, and{" "}
            <mark className={css.marker} data-rv="marker" data-anim="">
              the futon goes back.
            </mark>
          </p>
        </div>
        <ul ref={grid} className={css.wg}>
          <Card k={0} n="01" q="“How big is my room?”" a="Real dimensions for your exact hall">
            {HERO_ROOM && <SizeArt />}
          </Card>
          <Card k={1} n="02" q="“Will it fit?”" a="Every piece placed on your floor plan">
            {HERO_ROOM && <FitArt />}
          </Card>
          <Card k={2} n="03" q="“Do I need all this?”" a="A list for your room, not every room">
            <ListArt />
          </Card>
        </ul>
      </div>
    </section>
  );
}

function Card({ k, n, q, a, children }: { k: number; n: string; q: string; a: string; children: React.ReactNode }) {
  return (
    <li data-q="" style={{ "--k": k } as React.CSSProperties}>
      <div data-rv="row">
        <div className={css.wc}>
          <div className={css.wcText}>
            <span className={css.wcN} aria-hidden="true">
              {n}
            </span>
            <p className={css.wcQ}>{q}</p>
            <p className={css.wcA}>{a}</p>
          </div>
          {children}
        </div>
      </div>
    </li>
  );
}

/** The real Geary Hall double, to scale: window on the top wall, door and swing on the bottom. */
function Room({ children }: { children?: React.ReactNode }) {
  const room = HERO_ROOM!;
  return (
    <div className={css.rm}>
      <div className={css.rmBox} style={{ aspectRatio: `${room.lengthFt} / ${room.widthFt}` }}>
        <span className={css.rmWin} />
        <span className={css.rmDoor} />
        <span className={css.rmSwing} />
        {children}
      </div>
    </div>
  );
}

function SizeArt() {
  const room = HERO_ROOM!;
  const len = feetInches(room.lengthFt), wid = feetInches(room.widthFt);
  return (
    <div
      className={css.wcArt}
      role="img"
      aria-label={`The ${room.school} ${room.hall} double drawn to its real size, ${spokenFeet(room.lengthFt)} by ${spokenFeet(room.widthFt)}, in place of the bigger “approx.” outline from the housing page.`}
    >
      <span className={css.wcTag} aria-hidden="true">
        {room.school} · {room.hall} · Double
      </span>
      <div aria-hidden="true" style={{ display: "contents" }}>
        <Room>
          <span className={css.ax}>
            <i className={css.axLine} />
            <em className={css.axTag}>“Approx.” on the housing page</em>
          </span>
          <span className={css.dw} />
          <em className={`${css.dimL} ${css.dwL}`}>{len}</em>
          <span className={css.dh} />
          <em className={`${css.dimL} ${css.dhL}`}>{wid}</em>
        </Room>
      </div>
    </div>
  );
}

function FitArt() {
  const room = HERO_ROOM!;
  return (
    <div
      className={css.wcArt}
      role="img"
      aria-label={`The same ${room.hall} double with two beds, two desks and a 6 by 4 foot rug placed on the floor plan: everything fits.`}
    >
      <span className={css.wcTag} aria-hidden="true">
        Fit check · 5 pieces
      </span>
      <div aria-hidden="true" style={{ display: "contents" }}>
        <Room>
          <span className={`${css.fu} ${css.bed} ${css.bedA}`} />
          <span className={`${css.fu} ${css.bed} ${css.bedB}`} />
          <span className={`${css.fu} ${css.desk} ${css.deskA}`} />
          <span className={`${css.fu} ${css.desk} ${css.deskB}`} />
          <span className={css.rug}>
            <em>6′0″ × 4′0″</em>
          </span>
          <span className={css.fits}>
            <svg width="11" height="11" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 5l3.5 3.5L11 1" />
            </svg>
            Fits
          </span>
        </Room>
      </div>
    </div>
  );
}

function ListArt() {
  const spare = SHOWCASE_BUDGET - EXAMPLE.total;
  return (
    <div
      className={css.wcArt}
      role="img"
      aria-label={`A generic list of dozens of items shrinks to a ${EXAMPLE.pieces}-piece example plan: $${EXAMPLE.total} of a $${SHOWCASE_BUDGET} budget, $${spare} to spare.`}
    >
      <div className={css.ls} aria-hidden="true">
        <p className={css.lsH}>
          <span className={css.lsG}>Generic list · dozens of items</span>
          <span className={css.lsP}>Example plan · {EXAMPLE.pieces} pieces</span>
        </p>
        <div className={css.lsBars}>
          {Array.from({ length: BARS }, (_, i) => (
            <i key={i} {...(i < EXAMPLE.pieces ? { "data-keep": "" } : { "data-drop": "" })} />
          ))}
        </div>
        <p className={css.lsF}>
          <span>
            ${EXAMPLE.total} of ${SHOWCASE_BUDGET}
          </span>
          <b>${spare} to spare</b>
        </p>
      </div>
    </div>
  );
}
