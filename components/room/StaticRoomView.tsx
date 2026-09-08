import type { FurnitureItem, Point, RoomOutline } from "@/lib/types";
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

function pointInPoly(px: number, py: number, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export default function StaticRoomView({
  lengthFt,
  widthFt,
  furniture,
  isCorridor,
  outline,
}: {
  lengthFt: number;
  widthFt: number;
  furniture: FurnitureItem[];
  isCorridor?: boolean;
  outline?: RoomOutline | null;
}) {
  const PX = 34; // px per foot at viewBox scale
  const PAD = 20;
  const W = lengthFt * PX + PAD * 2;
  const H = widthFt * PX + PAD * 2;
  const x = (ft: number) => PAD + ft * PX;
  const y = (ft: number) => PAD + ft * PX;

  // Hand-drawn room: the wall path, doors/windows, and closets in px.
  const drawn = (() => {
    if (!outline) return null;
    const pts = outline.points, n = pts.length;
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.x)} ${y(p.y)}`).join(" ") + " Z";
    const inwardNormal = (e: number) => {
      const a = pts[e], b = pts[(e + 1) % n];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const cs = [{ nx: -dy, ny: dx }, { nx: dy, ny: -dx }];
      return cs.find((c) => pointInPoly(mx + c.nx * 0.05, my + c.ny * 0.05, pts)) ?? cs[0];
    };
    const openings = outline.openings.map((op) => {
      const a = pts[op.edge], b = pts[(op.edge + 1) % n];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      const s = { x: a.x + ux * op.offset_ft, y: a.y + uy * op.offset_ft };
      const e = { x: a.x + ux * (op.offset_ft + op.width_ft), y: a.y + uy * (op.offset_ft + op.width_ft) };
      if (op.kind === "window") return { kind: "window" as const, s, e };
      const nrm = inwardNormal(op.edge);
      // swing (0-3): bit0 = hinge at gap end, bit1 = open outward.
      const swing = op.swing ?? 0;
      const hinge = swing & 1 ? e : s;
      const dirx = swing & 1 ? -ux : ux, diry = swing & 1 ? -uy : uy;
      const nx = swing & 2 ? -nrm.nx : nrm.nx, ny = swing & 2 ? -nrm.ny : nrm.ny;
      const closedEnd = { x: hinge.x + dirx * op.width_ft, y: hinge.y + diry * op.width_ft };
      const leaf = { x: hinge.x + nx * op.width_ft, y: hinge.y + ny * op.width_ft };
      const sweep = dirx * ny - diry * nx > 0 ? 1 : 0;
      return { kind: "door" as const, s: hinge, e: closedEnd, leaf, width: op.width_ft, sweep };
    });
    return { path, openings, closets: outline.closets };
  })();

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
        {drawn && (
          <clipPath id="room-clip">
            <path d={drawn.path} />
          </clipPath>
        )}
      </defs>
      <rect x={x(0)} y={y(0)} width={lengthFt * PX} height={widthFt * PX} fill="#ffffff" clipPath={drawn ? "url(#room-clip)" : undefined} />
      <rect x={x(0)} y={y(0)} width={lengthFt * PX} height={widthFt * PX} fill="url(#ft-grid)" clipPath={drawn ? "url(#room-clip)" : undefined} />
      {drawn?.closets.map((c, i) => (
        <rect key={`cl-${i}`} x={x(c.x_ft)} y={y(c.y_ft)} width={c.width_ft * PX} height={c.depth_ft * PX} fill="#17172b" opacity={0.08} stroke="#17172b" strokeWidth={1} strokeDasharray="4 3" />
      ))}

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
      {drawn ? (
        <path d={drawn.path} fill="none" stroke="#17172b" strokeWidth={3} strokeLinejoin="round" />
      ) : (
        <rect
          x={x(0)}
          y={y(0)}
          width={lengthFt * PX}
          height={widthFt * PX}
          fill="none"
          stroke="#17172b"
          strokeWidth={3}
        />
      )}

      {drawn ? (
        // Data-driven doors/windows on the drawn walls.
        drawn.openings.map((op, i) => (
          <g key={`op-${i}`}>
            <line x1={x(op.s.x)} y1={y(op.s.y)} x2={x(op.e.x)} y2={y(op.e.y)} stroke="#fafaf8" strokeWidth={5} />
            {op.kind === "window" ? (
              <line x1={x(op.s.x)} y1={y(op.s.y)} x2={x(op.e.x)} y2={y(op.e.y)} stroke="#2b4eff" strokeWidth={4} />
            ) : (
              <>
                <path
                  d={`M ${x(op.e.x)} ${y(op.e.y)} A ${op.width * PX} ${op.width * PX} 0 0 ${op.sweep} ${x(op.leaf.x)} ${y(op.leaf.y)}`}
                  fill="none"
                  stroke="#4c4f63"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <line x1={x(op.s.x)} y1={y(op.s.y)} x2={x(op.leaf.x)} y2={y(op.leaf.y)} stroke="#4c4f63" strokeWidth={1.5} />
              </>
            )}
          </g>
        ))
      ) : (
        <>
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
            <line x1={x(lengthFt * 0.35)} y1={y(0)} x2={x(lengthFt * 0.65)} y2={y(0)} stroke="#2b4eff" strokeWidth={4} />
          ) : (
            <line x1={x(lengthFt)} y1={y(widthFt * 0.3)} x2={x(lengthFt)} y2={y(widthFt * 0.7)} stroke="#2b4eff" strokeWidth={4} />
          )}
        </>
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
