import { useId } from "react";
import type { FurnitureItem, RoomOutline } from "@/lib/types";
import { footprint } from "@/components/canvas/geometry";
import { linePositions, sideOf, splitAxis, type SplitMode } from "./split";

const STROKE = { me: "#2449FF", them: "#C0186F", shared: "#16161D" } as const;

/** A saved room drawn to scale, each piece tinted by the side it starts on.
 * With no split it's a plain plan in ink and paper. */
export default function PlanSketch({ lengthFt, widthFt, furniture, outline, split, mineLeft = true, maxWidth = 410, maxHeight = 300, label }: {
  lengthFt: number; widthFt: number; furniture: FurnitureItem[]; outline?: RoomOutline | null;
  split?: SplitMode; mineLeft?: boolean; maxWidth?: number; maxHeight?: number; label?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, ""), hatch = `mr-hatch-${uid}`, clip = `mr-room-${uid}`;
  const px = Math.min(maxWidth / lengthFt, maxHeight / widthFt), pad = 4;
  const W = lengthFt * px + pad * 2, H = widthFt * px + pad * 2;
  const x = (ft: number) => pad + ft * px, y = (ft: number) => pad + ft * px;
  const path = outline ? outline.points.map((p, i) => `${i ? "L" : "M"}${x(p.x)} ${y(p.y)}`).join(" ") + "Z" : `M${x(0)} ${y(0)}H${x(lengthFt)}V${y(widthFt)}H${x(0)}Z`;
  const axis = splitAxis(furniture, lengthFt, widthFt), E = axis === "x" ? lengthFt : widthFt;
  const lines = split ? linePositions(E, split) : [];
  const zones = (split === "middle" ? [[0, E / 2, mineLeft ? "me" : "them"], [E / 2, E, mineLeft ? "them" : "me"]]
    : split === "beds" ? [[0, E / 3, mineLeft ? "me" : "them"], [E / 3, (E * 2) / 3, "shared"], [(E * 2) / 3, E, mineLeft ? "them" : "me"]]
    : split === "none" ? [[0, E, "shared"]] : []) as [number, number, string][];
  const band = (a: number, b: number) => axis === "x" ? { x: x(a), y: y(0), width: (b - a) * px, height: widthFt * px } : { x: x(0), y: y(a), width: lengthFt * px, height: (b - a) * px };
  const sorted = [...furniture].sort((a, b) => (a.type === "rug" ? -1 : 0) - (b.type === "rug" ? -1 : 0));
  return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ display: "block", maxWidth: "100%", height: "auto" }}>
    <defs>
      <pattern id={hatch} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#FFD83D" /><rect width="3" height="8" fill="#F3C21A" /></pattern>
      <clipPath id={clip}><path d={path} /></clipPath>
    </defs>
    <path d={path} fill="#fff" />
    <g clipPath={`url(#${clip})`}>
      {zones.map(([a, b, side]) => <rect key={a} {...band(a, b)} fill={side === "me" ? "#EBEFFE" : side === "them" ? "#FCEAF2" : "rgba(255,216,61,.28)"} />)}
      {sorted.map(f => {
        const b = footprint(f), cx = x(b.x + b.w / 2), cy = y(b.y + b.h / 2), w = Math.max(f.width_ft * px, 2), h = Math.max(f.length_ft * px, 2);
        const side = split ? sideOf(f, E, split, mineLeft, axis) : null;
        return <rect key={f.id} x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={2} transform={`rotate(${f.rotation_deg} ${cx} ${cy})`}
          fill={side ? (side === "shared" ? `url(#${hatch})` : "#fff") : f.built_in ? "#F1F2F7" : "#fff"} stroke={side ? STROKE[side] : f.built_in ? "#9AA3C7" : "#16161D"} strokeWidth={side ? 1.6 : 1.2} opacity={f.type === "rug" ? 0.85 : 1} />;
      })}
      {lines.map(l => <line key={l} {...(axis === "x" ? { x1: x(l), x2: x(l), y1: y(0), y2: y(widthFt) } : { x1: x(0), x2: x(lengthFt), y1: y(l), y2: y(l) })} stroke="#4F8FE0" strokeWidth={4} strokeDasharray="14 2" />)}
    </g>
    <path d={path} fill="none" stroke="#16161D" strokeWidth={Math.max(3, px * 0.3)} strokeLinejoin="miter" />
  </svg>;
}
