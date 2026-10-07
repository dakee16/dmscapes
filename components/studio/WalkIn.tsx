"use client";
import type { KeyboardEvent, PointerEvent } from "react";
import type { FurnitureItem, SelectedRoom } from "@/lib/types";
import { footprint } from "@/components/canvas/geometry";
import { modelKind, roomOutline } from "@/lib/studio";
import { ChevronLeft } from "@/components/studio-ui/icons";
import type { WalkInput } from "./RoomScene";
import s from "./Studio.module.css";

const PAD: [string, WalkInput, string, string][] = [
  ["Walk forward", { move: 1 }, "f", "M12 5l-7 9h14z"],
  ["Turn left", { turn: 1 }, "l", "M5 12l9-7v14z"],
  ["Turn right", { turn: -1 }, "r", "M19 12l-9-7v14z"],
  ["Walk back", { move: -1 }, "b", "M12 19l-7-9h14z"],
];

/**
 * Walk in controls, docked in the bar under the room (never over it): Back to
 * dollhouse, a mini-map (the 3D scene moves its marker), the keyboard hint, and
 * a hold-to-move pad on touch screens.
 */
export default function WalkIn({ room, items, onBack, onWalker, onWalk }: {
  room: SelectedRoom; items: FurnitureItem[]; onBack: () => void;
  onWalker: (node: SVGGElement | null) => void; onWalk: (input: WalkInput) => void;
}) {
  const outline = roomOutline(room), pts = outline.points, margin = 0.8;
  const along = (edge: number, from: number, to: number) => {
    const a = pts[edge], b = pts[(edge + 1) % pts.length], len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x1: a.x + (b.x - a.x) * from / len, y1: a.y + (b.y - a.y) * from / len, x2: a.x + (b.x - a.x) * to / len, y2: a.y + (b.y - a.y) * to / len };
  };
  const hold = (input: WalkInput) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => { e.currentTarget.setPointerCapture(e.pointerId); onWalk(input); },
    onPointerUp: () => onWalk({}), onPointerCancel: () => onWalk({}), onLostPointerCapture: () => onWalk({}),
    onKeyDown: (e: KeyboardEvent) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); onWalk(input); } },
    onKeyUp: (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") onWalk({}); },
    onBlur: () => onWalk({}),
  });
  return <div className={s.walkDock} role="group" aria-label="Walk in">
    <button type="button" className={`${s.pill} ${s.walkBack}`} onClick={onBack}><ChevronLeft size={16} />Back to dollhouse</button>
    <svg className={s.walkMap} viewBox={`${-margin} ${-margin} ${room.lengthFt + margin * 2} ${room.widthFt + margin * 2}`} role="img" aria-label="Mini-map of the room with your position and view">
      <polygon points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="#fff" stroke="#16161d" strokeWidth=".3" strokeLinejoin="round" />
      {outline.closets.map((c, i) => <rect key={`c${i}`} x={c.x_ft} y={c.y_ft} width={c.width_ft} height={c.depth_ft} fill="#e4e1d8" />)}
      {items.map((f) => { const b = footprint(f); return <rect key={f.id} x={b.x} y={b.y} width={b.w} height={b.h} rx=".15" fill={modelKind(f) === "rug" ? "rgba(22,22,29,.07)" : "rgba(22,22,29,.22)"} />; })}
      {outline.openings.map((o, i) => { const l = along(o.edge, o.offset_ft, o.offset_ft + o.width_ft); return o.kind === "door"
        ? <g key={`o${i}`}><line {...l} stroke="#fff" strokeWidth=".55" /><line {...l} stroke="#e8a622" strokeWidth=".22" /></g>
        : <line key={`o${i}`} {...l} stroke="#2b4eff" strokeWidth=".45" />; })}
      <g ref={onWalker}><path d="M0 0L-2.4-4.6A5.2 5.2 0 0 1 2.4-4.6Z" fill="rgba(43,78,255,.22)" /><circle r=".6" fill="#2b4eff" stroke="#fff" strokeWidth=".25" /></g>
    </svg>
    <p className={s.walkHint}>Walk with the arrow keys · drag to look around</p>
    <div className={s.walkPad} role="group" aria-label="Walk">
      {PAD.map(([label, input, area, d]) => <button key={area} type="button" aria-label={label} style={{ gridArea: area }} {...hold(input)} onContextMenu={(e) => e.preventDefault()}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d={d} fill="currentColor" /></svg>
      </button>)}
    </div>
  </div>;
}
