"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/ds/Icons";
import css from "./College.module.css";

export type HallRoom = {
  label: string;
  dims: string | null;
  estimated: boolean;
  l: number | null;
  w: number | null;
  family: string;
};
export type HallCard = {
  id: string;
  name: string;
  href: string;
  planHref: string;
  rooms: HallRoom[];
};

const FIRST = 9;
const PX = 2; // px per foot in the card thumbnails

/**
 * Every hall at the school as a card: its room types drawn at 2 px per foot,
 * a link to the hall page and a straight shot into the planner. All halls are
 * in the HTML (the overflow is only `hidden`), so every hall link is crawlable.
 */
export default function HallDirectory({ halls, families }: { halls: HallCard[]; families: string[] }) {
  const [q, setQ] = useState("");
  const [family, setFamily] = useState("All");
  const [all, setAll] = useState(false);
  const uid = useId();

  const visible = useMemo(() => {
    const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return new Set(
      halls
        .filter((h) => terms.every((t) => h.name.toLowerCase().includes(t)))
        .filter((h) => family === "All" || h.rooms.some((r) => r.family === family))
        .map((h) => h.id)
    );
  }, [halls, q, family]);

  const filtering = q.trim() !== "" || family !== "All";
  let shown = 0;

  return (
    <div>
      <div className={css.dirTools}>
        <div className={css.filter}>
          <label htmlFor={`${uid}-q`} className="ds-sr">
            Search buildings
          </label>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id={`${uid}-q`}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${halls.length} buildings`}
            autoComplete="off"
          />
        </div>
        {families.length > 1 && (
          <div className={css.chips} role="group" aria-label="Room type">
            {["All", ...families].map((f) => (
              <button key={f} type="button" aria-pressed={family === f} onClick={() => setFamily(f)}>
                {f === "Suite" ? "Suite & apt" : f}
              </button>
            ))}
          </div>
        )}
        <span className={css.scaleNote} aria-hidden="true">
          Rooms drawn at {PX} px per ft
        </span>
      </div>

      <p className="ds-sr" role="status">
        {visible.size} of {halls.length} buildings shown
      </p>

      <ul className={css.halls}>
        {halls.map((h) => {
          const match = visible.has(h.id);
          if (match) shown += 1;
          const hide = !match || (!all && !filtering && shown > FIRST);
          const extra = h.rooms.length - 4;
          return (
            <li key={h.id} hidden={hide} className={css.hallCard}>
              <div className={css.hallHead}>
                <h3>
                  <Link href={h.href}>{h.name}</Link>
                </h3>
                <span>
                  {h.rooms.length} room type{h.rooms.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className={css.hallRooms}>
                {h.rooms.slice(0, 4).map((r, i) => (
                  <li key={i} data-dim={family !== "All" && r.family !== family ? "true" : undefined}>
                    <span className={css.thumbBox} aria-hidden="true">
                      {r.l && r.w ? (
                        <span
                          className={css.thumb}
                          data-est={r.estimated || undefined}
                          style={{ width: Math.min(52, r.l * PX), height: Math.min(30, r.w * PX) }}
                        />
                      ) : (
                        <span className={css.thumb} data-blank="" />
                      )}
                    </span>
                    <span className={css.roomLabel}>{r.label}</span>
                    <span className={css.roomDims} title={r.estimated ? "Estimated from similar rooms; the school doesn't publish this size" : undefined}>
                      {r.dims ? (
                        <>
                          {r.estimated && <span aria-label="about">≈ </span>}
                          {r.dims}
                        </>
                      ) : (
                        "Not published"
                      )}
                    </span>
                  </li>
                ))}
                {extra > 0 && <li className={css.more}>+ {extra} more room type{extra === 1 ? "" : "s"}</li>}
              </ul>
              <div className={css.hallFoot}>
                <Link href={h.href} className={css.viewLink}>
                  View dimensions <span aria-hidden="true">→</span>
                  <span className="ds-sr"> for {h.name}</span>
                </Link>
                <Link href={h.planHref} className="ds-btn ds-btn--ghost-ink ds-btn--sm">
                  Plan this hall
                  <span className="ds-sr">: {h.name}</span>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {visible.size === 0 && (
        <p className={css.empty}>
          No buildings match. Try another name, or{" "}
          <Link href="/add-school" className="ds-link">
            tell us which hall is missing
          </Link>
          .
        </p>
      )}

      {!filtering && !all && halls.length > FIRST && (
        <div className={css.showAll}>
          <button type="button" className="ds-btn ds-btn--ghost-ink" onClick={() => setAll(true)}>
            Show all {halls.length} buildings
            <ArrowRight />
          </button>
        </div>
      )}
    </div>
  );
}
