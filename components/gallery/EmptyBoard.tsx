"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/ds/Icons";
import RoomThumb from "@/components/room/RoomThumb";
import type { FurnitureItem } from "@/lib/types";
import type { DeckRoom } from "./ThrowDeck";
import css from "./Gallery.module.css";

/** A made-up furnished plan for the switch preview only (two Twin XL beds, two desks, a dresser, a rug). Never shown as a real layout. */
function sampleLayout(len: number, wid: number): FurnitureItem[] {
  const piece = (type: string, color_category: string, x_ft: number, y_ft: number, width_ft: number, length_ft: number): FurnitureItem =>
    ({ id: type + x_ft, type, label: "", owner: "", x_ft, y_ft, width_ft, length_ft, rotation_deg: 0, movable: true, built_in: false, color_category }) as FurnitureItem;
  return [
    piece("rug", "rug", (len - 6) / 2, (wid - 4) / 2, 6, 4),
    piece("bed", "bed", 0, 0, 3.25, 6.67),
    piece("bed", "bed", len - 3.25, 0, 3.25, 6.67),
    piece("dresser", "dresser", 3.6, 0, 2.5, 1.7),
    piece("desk", "desk", len - 3.5, wid - 2, 3.5, 2),
    piece("desk", "desk", len - 7.3, wid - 2, 3.5, 2),
  ];
}

/**
 * No shared layouts yet: how to add one, a preview of the sharing switch (Kokonut
 * Switch Button; it writes nothing), and six real halls waiting for a first layout
 * (Kokonut Lightbox Grid), each linking to the planner for that hall.
 */
export default function EmptyBoard({ halls }: { halls: DeckRoom[] }) {
  const [on, setOn] = useState(false);
  return (
    <div className={css.emptyCard} data-anim="">
      <div>
        <p className={css.kicker}>Nothing shared yet</p>
        <h2 className={css.emptyTitle}>Be the first in your hall.</h2>
        <ol className={css.steps}>
          <li><b>1</b>Plan a room for your hall.</li>
          <li><b>2</b>Save it to your account.</li>
          <li><b>3</b>Tick &ldquo;Show this layout in the gallery.&rdquo;</li>
        </ol>
        <div className={css.switchBox}>
          <button type="button" role="switch" aria-checked={on} className={css.switch} onClick={() => setOn((v) => !v)}>
            <span className={css.track} aria-hidden="true">
              <span className={css.knob} />
            </span>
            Show this layout in the gallery
          </button>
          <p className={css.switchNote}>Preview. You&rsquo;ll find this switch on each design in My designs.</p>
        </div>
        <Link href="/plan" className={`ds-btn ds-btn--ink ${css.emptyCta}`}>
          Plan your room <ArrowRight size={18} />
        </Link>
      </div>
      <ul className={css.frames} aria-label="Halls waiting for a first layout">
        {halls.map((h, i) => {
          const mine = on && i === 0;
          return (
            <li key={`${h.schoolId}/${h.dormId}`}>
              <Link
                href={`/plan?school=${h.schoolId}&dorm=${h.dormId}`}
                className={css.frame}
                aria-label={`Plan a room in ${h.hall}, ${h.school}: ${h.lenLabel} by ${h.widLabel}`}
              >
                <span className={css.framePlan} aria-hidden="true">
                  {mine ? (
                    <span className={css.yours} key="yours">
                      <RoomThumb lengthFt={h.lengthFt} widthFt={h.widthFt} furniture={sampleLayout(h.lengthFt, h.widthFt)} style={{ width: `calc(${h.lengthFt} * var(--fpx))` }} />
                      <em>Yours</em>
                    </span>
                  ) : (
                    <span className={css.outline} style={{ "--l": h.lengthFt, "--w": h.widthFt } as React.CSSProperties}>
                      <span>Your layout here</span>
                    </span>
                  )}
                  <span className={css.planIt}>Plan it</span>
                </span>
                <span className={css.frameSchool}>{h.school}</span>
                <span className={css.frameHall}>{h.hall}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
