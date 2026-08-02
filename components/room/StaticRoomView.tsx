import type { FurnitureItem } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/styles";

// Server-renderable top-down room view for the read-only share page (/room/[id]).
// Same coordinate convention as the Konva canvas (templates/README.md):
// feet, origin top-left, x along length, rotation 0 = width_ft spans x.
const WALL_TYPES = new Set(["string_lights", "wall_decor", "power_strip"]);

function footprint(f: FurnitureItem) {
  // mod 180: user rotation covers full quarter turns (0/90/180/270)
  const swap = f.rotation_deg % 180 === 90;
  const w = swap ? f.length_ft : f.width_ft;
  const h = swap ? f.width_ft : f.length_ft;
  return { x: f.x_ft, y: f.y_ft, w, h };
}

export default function StaticRoomView({
  lengthFt,
  widthFt,
  furniture,
  isCorridor,
}: {
  lengthFt: number;
  widthFt: number;
  furniture: FurnitureItem[];
  isCorridor?: boolean;
}) {
  const PX = 34; // px per foot at viewBox scale
  const PAD = 20;
  const W = lengthFt * PX + PAD * 2;
  const H = widthFt * PX + PAD * 2;
  const x = (ft: number) => PAD + ft * PX;
  const y = (ft: number) => PAD + ft * PX;

  // z-order: rugs under, wall items over, solids in between
  const sorted = [...furniture].sort((a, b) => {
    const z = (f: FurnitureItem) =>
      f.type === "rug" ? 0 : WALL_TYPES.has(f.type) ? 2 : 1;
    return z(a) - z(b);
  });

  // Door: bottom of left wall (corridor: left end wall). Window: right wall
  // (corridor: top long wall). Matches how the templates were authored.
  const doorLen = 3 * PX;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Room layout, ${lengthFt} by ${widthFt} feet`}
      className="h-auto w-full"
    >
      {/* graph paper inside the room */}
      <defs>
        <pattern id="ft-grid" width={PX} height={PX} patternUnits="userSpaceOnUse">
          <path d={`M ${PX} 0 L 0 0 0 ${PX}`} fill="none" stroke="#e4e9f4" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x={x(0)} y={y(0)} width={lengthFt * PX} height={widthFt * PX} fill="#ffffff" />
      <rect x={x(0)} y={y(0)} width={lengthFt * PX} height={widthFt * PX} fill="url(#ft-grid)" />

      {sorted.map((f) => {
        const fp = footprint(f);
        const isWall = WALL_TYPES.has(f.type);
        const fill = CATEGORY_COLORS[f.color_category] ?? "#94a3b8";
        const opacity = f.type === "rug" ? 0.45 : f.built_in ? 0.55 : 0.9;
        const wPx = Math.max(fp.w * PX, 3);
        const hPx = Math.max(fp.h * PX, 3);
        const showLabel = !isWall && wPx > 44 && hPx > 20;
        return (
          <g key={f.id}>
            <rect
              x={x(fp.x)}
              y={y(fp.y)}
              width={wPx}
              height={hPx}
              rx={3}
              fill={fill}
              opacity={opacity}
              stroke="#17172b"
              strokeOpacity={0.35}
            />
            {showLabel && (
              <text
                x={x(fp.x) + wPx / 2}
                y={y(fp.y) + hPx / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.min(11, hPx * 0.4)}
                fill="#17172b"
                style={{ fontFamily: "var(--font-plex-mono), monospace" }}
              >
                {f.label.length > 18 ? `${f.label.slice(0, 17)}…` : f.label}
              </text>
            )}
          </g>
        );
      })}

      {/* walls on top so furniture tucks under the stroke */}
      <rect
        x={x(0)}
        y={y(0)}
        width={lengthFt * PX}
        height={widthFt * PX}
        fill="none"
        stroke="#17172b"
        strokeWidth={3}
      />

      {/* door: gap + swing arc; all templates put it at the bottom of the left wall */}
      <line x1={x(0)} y1={y(widthFt) - doorLen} x2={x(0)} y2={y(widthFt)} stroke="#fafaf8" strokeWidth={5} />
      <path
        d={`M ${x(0)} ${y(widthFt) - doorLen} A ${doorLen} ${doorLen} 0 0 1 ${x(0) + doorLen} ${y(widthFt)}`}
        fill="none"
        stroke="#4c4f63"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />

      {/* window: cobalt segment */}
      {isCorridor ? (
        <line
          x1={x(lengthFt * 0.35)}
          y1={y(0)}
          x2={x(lengthFt * 0.65)}
          y2={y(0)}
          stroke="#2b4eff"
          strokeWidth={4}
        />
      ) : (
        <line
          x1={x(lengthFt)}
          y1={y(widthFt * 0.3)}
          x2={x(lengthFt)}
          y2={y(widthFt * 0.7)}
          stroke="#2b4eff"
          strokeWidth={4}
        />
      )}

      {/* scale bar */}
      <g transform={`translate(${x(0)}, ${H - 8})`}>
        <line x1={0} y1={0} x2={PX} y2={0} stroke="#17172b" strokeWidth={2} />
        <line x1={0} y1={-3} x2={0} y2={3} stroke="#17172b" strokeWidth={2} />
        <line x1={PX} y1={-3} x2={PX} y2={3} stroke="#17172b" strokeWidth={2} />
        <text x={PX + 6} y={3} fontSize={10} fill="#4c4f63" style={{ fontFamily: "var(--font-plex-mono), monospace" }}>
          1 ft
        </text>
      </g>
    </svg>
  );
}
