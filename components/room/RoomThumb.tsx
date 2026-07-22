import type { FurnitureItem } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/styles";

// Tiny top-down layout preview (account tiles). Room shell + furniture blocks
// only — labels, door, and scale bar are unreadable at thumbnail size.
// Same coordinate convention as StaticRoomView.
const WALL_TYPES = new Set(["string_lights", "wall_decor", "power_strip"]);

function footprint(f: FurnitureItem) {
  // mod 180: user rotation covers full quarter turns (0/90/180/270)
  const swap = f.rotation_deg % 180 === 90;
  const w = swap ? f.length_ft : f.width_ft;
  const h = swap ? f.width_ft : f.length_ft;
  return { x: f.x_ft, y: f.y_ft, w, h };
}

export default function RoomThumb({
  lengthFt,
  widthFt,
  furniture,
  className,
}: {
  lengthFt: number;
  widthFt: number;
  furniture: FurnitureItem[];
  className?: string;
}) {
  const PX = 10;
  const PAD = 1;
  const W = lengthFt * PX + PAD * 2;
  const H = widthFt * PX + PAD * 2;

  // z-order: rugs under, wall items over, solids in between
  const sorted = [...furniture].sort((a, b) => {
    const z = (f: FurnitureItem) =>
      f.type === "rug" ? 0 : WALL_TYPES.has(f.type) ? 2 : 1;
    return z(a) - z(b);
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className={className}>
      <rect
        x={PAD}
        y={PAD}
        width={lengthFt * PX}
        height={widthFt * PX}
        fill="#ffffff"
        stroke="#17172b"
        strokeWidth={1.5}
      />
      {sorted.map((f) => {
        const fp = footprint(f);
        return (
          <rect
            key={f.id}
            x={PAD + fp.x * PX}
            y={PAD + fp.y * PX}
            width={Math.max(fp.w * PX, 1.5)}
            height={Math.max(fp.h * PX, 1.5)}
            rx={1}
            fill={CATEGORY_COLORS[f.color_category] ?? "#94a3b8"}
            opacity={f.type === "rug" ? 0.45 : f.built_in ? 0.55 : 0.9}
          />
        );
      })}
    </svg>
  );
}
