"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import RoomThumb from "@/components/room/RoomThumb";
import Avatar from "@/components/site/Avatar";
import Modal, { ModalClose } from "@/components/site/Modal";
import type { FurnitureItem, RoomOutline } from "@/lib/types";
import g from "@/components/growth/Growth.module.css";
import css from "./Gallery.module.css";

/** One shared layout, prepared on the server: labels and the drawing only (no ids, owners or exact dates). */
export type BoardRoom = {
  key: string;
  /** 0 = newest (the page loads newest first). */
  order: number;
  schoolId: string;
  dormId: string;
  school: string;
  hall: string;
  roomType: string;
  size: string;
  lenLabel: string;
  widLabel: string;
  sqft: number;
  lengthFt: number;
  widthFt: number;
  /** The drawing's width in its 4:3 frame, %, so every card shares one scale. */
  fit: number;
  furniture: FurnitureItem[];
  outline: RoomOutline | null;
  vibeId: string;
  vibe: string;
  vibeColor: string;
  /** Rounded to $50 already. */
  budget: number;
  shared: string;
  byline: { username: string; avatar: string | null } | null;
};

type Sort = "newest" | "small" | "large" | "budget";
const SORTS: [Sort, string][] = [
  ["newest", "Newest"],
  ["small", "Smallest room"],
  ["large", "Largest room"],
  ["budget", "Lowest budget"],
];
const ORDER: Record<Sort, (a: BoardRoom, b: BoardRoom) => number> = {
  newest: (a, b) => a.order - b.order,
  small: (a, b) => a.sqft - b.sqft || a.order - b.order,
  large: (a, b) => b.sqft - a.sqft || a.order - b.order,
  budget: (a, b) => a.budget - b.budget || a.order - b.order,
};

/**
 * Shared layouts with a filter bar (Kokonut Swipe Tabs for vibe, school and sort
 * selects), a card grid (Kokonut Lightbox Grid) and a dialog with the plan large.
 * Filters work on the layouts the page already loaded.
 */
export default function GalleryBoard({
  rooms,
  vibes,
  schools,
  creatorTip,
}: {
  rooms: BoardRoom[];
  vibes: { id: string; name: string }[];
  schools: { id: string; name: string }[];
  creatorTip: string;
}) {
  const [vibe, setVibe] = useState("all");
  const [school, setSchool] = useState("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [open, setOpen] = useState<BoardRoom | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const wasOpen = useRef(false);
  const track = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  const shown = useMemo(
    () =>
      rooms
        .filter((r) => (vibe === "all" || r.vibeId === vibe) && (school === "all" || r.schoolId === school))
        .sort(ORDER[sort]),
    [rooms, vibe, school, sort],
  );

  // The ink pill slides to the active tab.
  useLayoutEffect(() => {
    const measure = () => {
      const b = track.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (b) setPill({ x: b.offsetLeft, w: b.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [vibe]);

  // Esc closes the dialog; focus goes back to the card that opened it.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      opener.current?.focus({ preventScroll: true });
    }
  }, [open]);

  const pickVibe = (id: string, el: HTMLButtonElement) => {
    setVibe(id);
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  return (
    <div data-anim="">
      <div className={css.filters}>
        <div ref={track} className={css.tabs} role="group" aria-label="Filter by vibe" data-ready={pill ? "" : undefined}>
          {pill && <span className={css.tabPill} aria-hidden="true" style={{ transform: `translateX(${pill.x}px)`, width: pill.w }} />}
          {[{ id: "all", name: "All vibes" }, ...vibes].map((v) => (
            <button key={v.id} type="button" className={css.tab} aria-pressed={vibe === v.id} onClick={(e) => pickVibe(v.id, e.currentTarget)}>
              {v.name}
            </button>
          ))}
        </div>
        <div className={css.selects}>
          <label className={css.selectWrap}>
            <span className="ds-sr">School</span>
            <select className={css.select} value={school} onChange={(e) => setSchool(e.target.value)}>
              <option value="all">All schools</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className={css.selectWrap}>
            <span className="ds-sr">Sort</span>
            <select className={css.select} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {SORTS.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <p className={css.count} aria-live="polite">
        {shown.length} {shown.length === 1 ? "layout" : "layouts"}
      </p>

      {shown.length ? (
        <ul className={css.grid} aria-label="Shared layouts">
          {shown.map((r, i) => (
            <li key={r.key} className={css.gcell} style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
              <button
                type="button"
                className={css.gcard}
                aria-label={`${r.school} · ${r.hall}: ${r.size}, ${r.vibe}, about $${r.budget}. Open the plan`}
                onClick={(e) => {
                  opener.current = e.currentTarget;
                  setOpen(r);
                }}
              >
                <span className={css.gPlan} aria-hidden="true">
                  <RoomThumb lengthFt={r.lengthFt} widthFt={r.widthFt} furniture={r.furniture} outline={r.outline} style={{ width: `${r.fit}%` }} />
                </span>
                <span className={css.gTitle}>
                  {r.school} · {r.hall}
                </span>
                <span className={css.chips} aria-hidden="true">
                  <span className={css.chip}>
                    <i className={css.dot} style={{ background: r.vibeColor }} />
                    {r.vibe}
                  </span>
                  <span className={css.chip}>{r.size}</span>
                  <span className={css.chip}>About ${r.budget}</span>
                  <span className={css.chip}>Shared {r.shared}</span>
                </span>
              </button>
              {r.byline && (
                <p className={`${g.byline} ${css.byline}`}>
                  <Avatar className={g.bylineAvatar} src={r.byline.avatar} name={r.byline.username} />
                  <span>@{r.byline.username}</span>
                  <span className={g.creatorTag} tabIndex={0} data-tip={creatorTip}>
                    Creator
                  </span>
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={css.noMatch}>No shared layouts match these filters yet.</p>
      )}

      {open && (
        <Modal className={css.lbScrim} aria-labelledby="lb-title">
          <div className={css.lb}>
            <ModalClose className={css.lbClose} onClick={() => setOpen(null)} />
            <div
              className={css.lbPlan}
              role="img"
              aria-label={`${open.school}, ${open.hall}${open.roomType ? `, ${open.roomType}` : ""}: a shared ${open.vibe} layout, ${open.size}`}
            >
              <span className={css.lbRoom} style={{ width: `${Math.min(78, 58 * (open.lengthFt / open.widthFt))}%` }} aria-hidden="true">
                <RoomThumb lengthFt={open.lengthFt} widthFt={open.widthFt} furniture={open.furniture} outline={open.outline} />
                <span className={css.dimL}>
                  <em>{open.lenLabel}</em>
                </span>
                <span className={css.dimW}>
                  <em>{open.widLabel}</em>
                </span>
              </span>
            </div>
            <div className={css.lbInfo}>
              <p className={css.kicker}>{open.school}</p>
              <h2 id="lb-title" className={css.lbTitle}>
                {open.hall}
              </h2>
              <dl className={css.facts}>
                <div><dt>Room size</dt><dd>{[open.roomType, open.size].filter(Boolean).join(" · ")}</dd></div>
                <div><dt>Floor area</dt><dd>{open.sqft} sq ft</dd></div>
                <div><dt>Vibe</dt><dd>{open.vibe}</dd></div>
                <div><dt>Budget</dt><dd>About ${open.budget}</dd></div>
                <div><dt>Shared</dt><dd>{open.shared}</dd></div>
              </dl>
              <p className={css.lbNote}>Names and shopping lists stay private.</p>
              <div className={css.lbCtas}>
                <Link href={`/plan?school=${open.schoolId}&dorm=${open.dormId}`} className="ds-btn ds-btn--ink">
                  Plan this room
                </Link>
                <Link href={`/colleges/${open.schoolId}/${open.dormId}`} className="ds-link">
                  {open.hall} page
                </Link>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
