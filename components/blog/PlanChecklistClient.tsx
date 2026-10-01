"use client";

import { useState, type ReactNode } from "react";
import css from "./Post.module.css";

export type Spot = "room" | "walls" | "ceiling" | "underbed" | "window" | "door" | "closet" | "furniture";

type Zone = { x: number; y: number; w: number; h: number; r?: number } | { d: string };

/** Where each measurement lives on the example plan (a 460×400 board). */
const SPOTS: Record<Spot, { pin: [number, number]; zones: Zone[]; tag: string }> = {
  room: { pin: [13, 200], zones: [{ x: 24, y: 34, w: 412, h: 332, r: 4 }], tag: "Length × width" },
  walls: { pin: [223, 326], zones: [{ x: 120, y: 334, w: 206, h: 32, r: 4 }], tag: "Clear wall run" },
  ceiling: { pin: [230, 200], zones: [{ x: 36, y: 46, w: 388, h: 308, r: 2 }], tag: "Floor to ceiling" },
  underbed: { pin: [81, 150], zones: [{ x: 32, y: 42, w: 98, h: 198, r: 8 }], tag: "Under the bed" },
  window: { pin: [300, 42], zones: [{ x: 146, y: 30, w: 148, h: 26, r: 4 }], tag: "Window + sill" },
  door: { pin: [100, 318], zones: [{ d: "M52 357V285A72 72 0 0 1 124 357z" }], tag: "Door + swing" },
  closet: { pin: [381, 150], zones: [{ x: 334, y: 42, w: 94, h: 132, r: 4 }], tag: "Closet" },
  furniture: {
    pin: [372, 286],
    zones: [
      { x: 32, y: 42, w: 98, h: 198, r: 8 },
      { x: 320, y: 258, w: 108, h: 100, r: 6 },
    ],
    tag: "Fixed furniture",
  },
};

const INK = "#16161D";
const BLUE = "#2449FF";

export default function PlanChecklistClient({
  label,
  items,
}: {
  label: string;
  items: { title: ReactNode; body: ReactNode; spot: Spot }[];
}) {
  const [sel, setSel] = useState(0);
  const cur = SPOTS[items[sel].spot];

  return (
    <div className={css.checklist}>
      <div className={css.clList}>
        <div className={css.clHead}>
          <span>{label}</span>
          <span aria-live="polite">
            {sel + 1} of {items.length}
          </span>
        </div>
        <ol>
          {items.map((it, i) => {
            const state = i === sel ? "on" : i < sel ? "done" : "todo";
            return (
              <li key={i} data-state={state}>
                <button
                  type="button"
                  aria-expanded={i === sel}
                  aria-controls={`plan-check-${i}`}
                  onClick={() => setSel(i)}
                >
                  <span className={css.clNum} aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className={css.clTitle}>{it.title}</span>
                </button>
                <div id={`plan-check-${i}`} className={css.clBody} hidden={i !== sel}>
                  {it.body}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <figure className={css.clPlan}>
        <svg viewBox="0 0 460 400" focusable="false" aria-hidden="true">
          {/* dimension guides */}
          <rect x="30" y="16" width="400" height="2" fill="#9C9AA8" />
          <rect x="12" y="40" width="2" height="320" fill="#9C9AA8" />
          {/* walls */}
          <rect x="33" y="43" width="394" height="314" fill="#fff" stroke={INK} strokeWidth="6" />
          {/* window + radiator */}
          <rect x="151" y="36" width="138" height="14" fill="#DCE1F5" stroke={INK} strokeWidth="2" />
          <g opacity="0.5">
            {Array.from({ length: 15 }, (_, i) => (
              <rect key={i} x={170 + i * 7} y="52" width="2" height="16" fill={INK} />
            ))}
          </g>
          {/* bed + pillow */}
          <rect x="37" y="47" width="88" height="188" rx="6" fill="#EEF1FD" stroke={INK} strokeWidth="2" />
          <rect x="47" y="55" width="68" height="28" rx="6" fill="#fff" stroke={INK} strokeWidth="2" />
          {/* closet */}
          <rect x="339" y="47" width="84" height="122" fill="rgba(22,22,29,0.04)" stroke={INK} strokeWidth="2" strokeDasharray="6 4" />
          <text x="381" y="112" textAnchor="middle" className={css.clPlanLabel}>
            CLOSET
          </text>
          {/* desk */}
          <rect x="325" y="263" width="98" height="90" rx="4" fill="#F5ECDE" stroke={INK} strokeWidth="2" />
          <text x="374" y="334" textAnchor="middle" className={css.clPlanLabel}>
            DESK
          </text>
          {/* outlets */}
          <rect x="418" y="224" width="12" height="18" rx="3" fill={INK} />
          <rect x="30" y="250" width="12" height="18" rx="3" fill={INK} />
          {/* door */}
          <rect x="52" y="352" width="70" height="10" fill="#fff" />
          <path d="M52 285A70 70 0 0 1 122 355" fill="none" stroke="#9C9AA8" strokeWidth="2" strokeDasharray="6 4" />
          <rect x="52" y="285" width="3" height="70" fill={INK} />

          {/* the lit spot */}
          <g key={items[sel].spot} className={css.clZone}>
            {cur.zones.map((z, i) =>
              "d" in z ? (
                <path key={i} d={z.d} fill="rgba(36,73,255,0.14)" stroke={BLUE} strokeWidth="3" strokeDasharray="8 5" />
              ) : (
                <rect key={i} x={z.x} y={z.y} width={z.w} height={z.h} rx={z.r} fill="rgba(36,73,255,0.14)" stroke={BLUE} strokeWidth="3" strokeDasharray="8 5" />
              )
            )}
          </g>

          {/* numbered pins: a mouse shortcut for the list buttons */}
          {items.map((it, i) => {
            const [x, y] = SPOTS[it.spot].pin;
            const on = i === sel;
            const done = i < sel;
            const r = on ? 20 : 15;
            return (
              <g key={i} className={css.clPin} onClick={() => setSel(i)}>
                {on && (
                  <>
                    <circle cx={x + 3} cy={y + 2} r={r} fill="rgba(255,79,168,0.85)" />
                    <circle cx={x - 3} cy={y - 2} r={r} fill="rgba(36,73,255,0.4)" />
                  </>
                )}
                <circle cx={x} cy={y} r={r} fill={on ? BLUE : done ? INK : "#fff"} stroke={INK} strokeWidth="2.5" />
                <text x={x} y={y + 5} textAnchor="middle" className={css.clPinNum} fill={on || done ? "#fff" : INK}>
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
        <figcaption>
          <span>Example double · not to scale</span>
          <span className={css.clTag}>{cur.tag}</span>
        </figcaption>
      </figure>
    </div>
  );
}
