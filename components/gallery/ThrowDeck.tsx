"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/ds/Icons";
import css from "./Gallery.module.css";

/** One real room, sized from the school data on the server (app/gallery/page.tsx). */
export type DeckRoom = {
  schoolId: string;
  dormId: string;
  school: string;
  hall: string;
  type: string;
  lengthFt: number;
  widthFt: number;
  sqft: number;
  lenLabel: string;
  widLabel: string;
  /** "fourteen feet eleven by twelve feet five", for the drawing's label. */
  spoken: string;
};

const SHOWN = 4;
const pad = (n: number) => String(n).padStart(2, "0");

/** The room drawn to scale: a white box with a 1 ft grid, the window on the top wall, the door gap bottom-left, blue dimension lines. */
export function PlanDrawing({ room, px }: { room: DeckRoom; px: number }) {
  return (
    <div
      className={css.pl}
      role="img"
      aria-label={`${room.school}, ${room.hall}, ${room.type}: ${room.spoken}, ${room.sqft} square feet`}
      style={{ "--l": room.lengthFt, "--w": room.widthFt, "--px": `${px}px` } as React.CSSProperties}
    >
      <span className={css.plBox} aria-hidden="true">
        <i className={css.plWin} />
        <i className={css.plDoor} />
      </span>
      <span className={css.dimL} aria-hidden="true">
        <em>{room.lenLabel}</em>
      </span>
      <span className={css.dimW} aria-hidden="true">
        <em>{room.widLabel}</em>
      </span>
    </div>
  );
}

/**
 * Kokonut Throw Deck: twelve real rooms stacked at one scale. Next throws the top
 * card off to the left and the rest move up; Previous brings it back. Positions are
 * CSS (data-pos), so the throw is a transition and Motion off simply jumps.
 * Only the top card is in the accessibility tree and the tab order.
 */
export default function ThrowDeck({ rooms, px }: { rooms: DeckRoom[]; px: number }) {
  const [top, setTop] = useState(0);
  const n = rooms.length;
  if (!n) return null;
  const go = (step: number) => setTop((t) => (t + step + n) % n);

  return (
    <div className={css.deckWrap}>
      <div className={css.deck}>
        {rooms.map((r, i) => {
          const pos = (i - top + n) % n;
          // The card just thrown waits off to the left (so Previous can bring it back); the rest wait behind.
          const at = pos < SHOWN ? String(pos) : pos === n - 1 ? "out" : "back";
          const isTop = pos === 0;
          return (
            <article
              key={`${r.schoolId}/${r.dormId}`}
              className={css.card}
              data-pos={at}
              style={{ "--d": Math.min(pos, SHOWN) } as React.CSSProperties}
              aria-hidden={isTop ? undefined : true}
              inert={!isTop}
            >
              <p className={css.cSchool}>{r.school}</p>
              <p className={css.cHall}>{r.hall}</p>
              <div className={css.cPanel}>
                <PlanDrawing room={r} px={px} />
              </div>
              <div className={css.cFoot}>
                <span>{r.sqft} SQ FT · 1 SQUARE = 1 FT</span>
                <Link href={`/plan?school=${r.schoolId}&dorm=${r.dormId}`} className={`ds-link ${css.cLink}`}>
                  Plan this room
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      <div className={css.deckNav}>
        <button type="button" className={css.navBtn} aria-label="Previous room" onClick={() => go(-1)}>
          <span className={css.flip}>
            <ArrowRight size={18} />
          </span>
        </button>
        <p className={css.counter} aria-live="polite">
          {pad(top + 1)} / {pad(n)}
        </p>
        <button type="button" className={css.navBtn} aria-label="Next room" onClick={() => go(1)}>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
