import type { FurnitureItem, RoomOutline } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/styles";
import { footprint } from "@/components/canvas/geometry";

// Tiny top-down layout preview (account tiles). Room shell + furniture blocks
// only, labels, door, and scale bar are unreadable at thumbnail size.
// Same coordinate convention as StaticRoomView.
const WALL_TYPES = new Set(["string_lights", "wall_decor", "power_strip"]);

export default function RoomThumb({
  lengthFt,
  widthFt,
  furniture,
  outline,
  className,
}: {
  lengthFt: number;
  widthFt: number;
  furniture: FurnitureItem[];
  /** Hand-drawn rooms: draw the real outline instead of a plain rectangle. */
  outline?: RoomOutline | null;
  className?: string;
}) {
  const PX = 10;
  const PAD = 1;
  const W = lengthFt * PX + PAD * 2;
  const H = widthFt * PX + PAD * 2;
  const shapePath = outline
    ? outline.points.map((p, i) => `${i === 0 ? "M" : "L"} ${PAD + p.x * PX} ${PAD + p.y * PX}`).join(" ") + " Z"
    : null;

  // z-order: rugs under, wall items over, solids in between
  const sorted = [...furniture].sort((a, b) => {
    const z = (f: FurnitureItem) =>
      f.type === "rug" ? 0 : WALL_TYPES.has(f.type) ? 2 : 1;
    return z(a) - z(b);
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className={className}>
      {shapePath ? (
        <path d={shapePath} fill="#ffffff" stroke="#17172b" strokeWidth={1.5} strokeLinejoin="round" />
      ) : (
        <rect
          x={PAD}
          y={PAD}
          width={lengthFt * PX}
          height={widthFt * PX}
          fill="#ffffff"
          stroke="#17172b"
          strokeWidth={1.5}
        />
      )}
      {sorted.map((f) => {
        const fp = footprint(f);
        const cx = PAD + (fp.x + fp.w / 2) * PX, cy = PAD + (fp.y + fp.h / 2) * PX;
        return (
          <rect
            key={f.id}
            x={cx - f.width_ft * PX / 2}
            y={cy - f.length_ft * PX / 2}
            width={Math.max(f.width_ft * PX, 1.5)}
            height={Math.max(f.length_ft * PX, 1.5)}
            transform={`rotate(${f.rotation_deg} ${cx} ${cy})`}
            rx={1}
            fill={CATEGORY_COLORS[f.color_category] ?? "#94a3b8"}
            opacity={f.type === "rug" ? 0.45 : f.built_in ? 0.55 : 0.9}
          />
        );
      })}
    </svg>
  );
}
