// Isometric "Room in 3D" preview. Same line-art language as StyleScene, but an
// angled, perspective view with real depth cues (two walls, a floor plane,
// furniture drawn as boxes with shaded faces) so it reads as an actual 3D room
// instead of a flat top-down plan. The room is split down the middle, your side
// in cobalt and their side in amber, echoing the shared-room concept, and a
// small orbit control is overlaid to imply you can spin it.

const INK = "#17172b";
const COBALT = "#2b4eff";
const AMBER = "#f0b100";
const STROKE = "rgba(23,23,43,0.28)";

type P3 = [number, number, number];

// Isometric projection. The floor's near corner is the world origin: x runs
// toward the right wall, y into the left wall, z is height. Tuned so the floor
// reads as a wide diamond and the walls rise at a believable angle.
function iso(x: number, y: number, z: number): [number, number] {
  return [150 + (x - y) * 30, 150 - (x + y) * 10 - z * 13];
}
const P = (x: number, y: number, z: number) => iso(x, y, z).join(",");
const poly = (pts: P3[]) => pts.map(([x, y, z]) => P(x, y, z)).join(" ");

// A furniture box: three visible faces (top plus the two that face the viewer),
// shaded lightest-on-top for depth.
function Box({
  x0,
  x1,
  y0,
  y1,
  z0,
  z1,
  top,
  right,
  left,
  stroke,
}: {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
  top: string;
  right: string;
  left: string;
  stroke: string;
}) {
  return (
    <g stroke={stroke} strokeWidth={1.1} strokeLinejoin="round">
      {/* Face toward front-left (x = x0). */}
      <polygon
        points={poly([
          [x0, y0, z0],
          [x0, y1, z0],
          [x0, y1, z1],
          [x0, y0, z1],
        ])}
        fill={left}
      />
      {/* Face toward front-right (y = y0). */}
      <polygon
        points={poly([
          [x0, y0, z0],
          [x1, y0, z0],
          [x1, y0, z1],
          [x0, y0, z1],
        ])}
        fill={right}
      />
      {/* Top (z = z1). */}
      <polygon
        points={poly([
          [x0, y0, z1],
          [x1, y0, z1],
          [x1, y1, z1],
          [x0, y1, z1],
        ])}
        fill={top}
      />
    </g>
  );
}

function CubeIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden="true">
      <path
        d="M8 1.6 14 5v6l-6 3.4L2 11V5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M2 5l6 3.4L14 5M8 8.4V14.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrbitIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <ellipse
        cx="10"
        cy="10"
        rx="8"
        ry="3.6"
        stroke="currentColor"
        strokeWidth="1.4"
        transform="rotate(-30 10 10)"
      />
      <circle cx="10" cy="10" r="2.2" fill="currentColor" />
      <path
        d="M15.5 5.3l1.1-2M16.6 5.5l-2 .3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Room3DScene({ className = "" }: { className?: string }) {
  const grid = [1, 2, 3];

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-ink/10 bg-gradient-to-b from-white to-[#eef1fb] ${className}`}
    >
      {/* Cobalt glow up top for a bit of depth and lift. */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(130% 90% at 50% 8%, rgba(43,78,255,0.10), transparent 62%)",
        }}
      />

      <svg viewBox="0 0 300 180" className="relative block w-full" aria-hidden="true">
        {/* Soft contact shadow beneath the whole room. */}
        <ellipse cx="150" cy="160" rx="128" ry="13" fill={INK} opacity="0.06" />

        {/* Floor plane. */}
        <polygon
          points={poly([
            [0, 0, 0],
            [4, 0, 0],
            [4, 4, 0],
            [0, 4, 0],
          ])}
          fill="#ffffff"
          stroke={STROKE}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Your side (left) and their side (right), tinted. */}
        <polygon
          points={poly([
            [0, 0, 0],
            [4, 4, 0],
            [0, 4, 0],
          ])}
          fill={COBALT}
          opacity="0.06"
        />
        <polygon
          points={poly([
            [0, 0, 0],
            [4, 0, 0],
            [4, 4, 0],
          ])}
          fill={AMBER}
          opacity="0.08"
        />
        {/* Floor grid for depth. */}
        <g stroke={INK} strokeOpacity="0.06" strokeWidth="1">
          {grid.map((i) => (
            <line key={`gx${i}`} x1={iso(i, 0, 0)[0]} y1={iso(i, 0, 0)[1]} x2={iso(i, 4, 0)[0]} y2={iso(i, 4, 0)[1]} />
          ))}
          {grid.map((i) => (
            <line key={`gy${i}`} x1={iso(0, i, 0)[0]} y1={iso(0, i, 0)[1]} x2={iso(4, i, 0)[0]} y2={iso(4, i, 0)[1]} />
          ))}
        </g>
        {/* Center divider, front corner to back corner. */}
        <line
          x1={iso(0, 0, 0)[0]}
          y1={iso(0, 0, 0)[1]}
          x2={iso(4, 4, 0)[0]}
          y2={iso(4, 4, 0)[1]}
          stroke={INK}
          strokeOpacity="0.3"
          strokeWidth="1.4"
          strokeDasharray="5 5"
        />

        {/* Left wall (plane y = 4). */}
        <polygon
          points={poly([
            [0, 4, 0],
            [4, 4, 0],
            [4, 4, 4],
            [0, 4, 4],
          ])}
          fill="#e8ecf7"
          stroke={STROKE}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Right wall (plane x = 4). */}
        <polygon
          points={poly([
            [4, 0, 0],
            [4, 4, 0],
            [4, 4, 4],
            [4, 0, 4],
          ])}
          fill="#f1f4fb"
          stroke={STROKE}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Back corner seam. */}
        <line
          x1={iso(4, 4, 0)[0]}
          y1={iso(4, 4, 0)[1]}
          x2={iso(4, 4, 4)[0]}
          y2={iso(4, 4, 4)[1]}
          stroke={INK}
          strokeOpacity="0.14"
          strokeWidth="1"
        />

        {/* Framed print on the left wall. */}
        <polygon
          points={poly([
            [1.3, 4, 1.9],
            [2.5, 4, 1.9],
            [2.5, 4, 3.1],
            [1.3, 4, 3.1],
          ])}
          fill={AMBER}
          fillOpacity="0.16"
          stroke={AMBER}
          strokeOpacity="0.5"
          strokeWidth="1"
        />
        <line
          x1={iso(1.4, 4, 2.0)[0]}
          y1={iso(1.4, 4, 2.0)[1]}
          x2={iso(2.4, 4, 3.0)[0]}
          y2={iso(2.4, 4, 3.0)[1]}
          stroke={AMBER}
          strokeOpacity="0.45"
          strokeWidth="1"
        />

        {/* Window on the right wall. */}
        <polygon
          points={poly([
            [4, 0.7, 1.7],
            [4, 1.9, 1.7],
            [4, 1.9, 3.1],
            [4, 0.7, 3.1],
          ])}
          fill={COBALT}
          fillOpacity="0.14"
          stroke={COBALT}
          strokeOpacity="0.5"
          strokeWidth="1"
        />
        <line
          x1={iso(4, 1.3, 1.7)[0]}
          y1={iso(4, 1.3, 1.7)[1]}
          x2={iso(4, 1.3, 3.1)[0]}
          y2={iso(4, 1.3, 3.1)[1]}
          stroke={COBALT}
          strokeOpacity="0.4"
          strokeWidth="1"
        />
        <line
          x1={iso(4, 0.7, 2.4)[0]}
          y1={iso(4, 0.7, 2.4)[1]}
          x2={iso(4, 1.9, 2.4)[0]}
          y2={iso(4, 1.9, 2.4)[1]}
          stroke={COBALT}
          strokeOpacity="0.4"
          strokeWidth="1"
        />

        {/* Contact shadows under the beds. */}
        <ellipse cx={iso(0.9, 2.4, 0)[0]} cy={iso(0.9, 2.4, 0)[1]} rx="30" ry="9" fill={INK} opacity="0.05" />
        <ellipse cx={iso(2.4, 0.9, 0)[0]} cy={iso(2.4, 0.9, 0)[1]} rx="30" ry="9" fill={INK} opacity="0.05" />

        {/* Left bed: your side (cobalt). */}
        <Box
          x0={0.45}
          x1={1.35}
          y0={1.5}
          y1={3.3}
          z0={0}
          z1={0.72}
          top="#e0e5ff"
          right="#bcc6ff"
          left="#aab5f5"
          stroke="rgba(43,78,255,0.55)"
        />
        {/* Pillow, against the wall end. */}
        <Box
          x0={0.55}
          x1={1.25}
          y0={2.95}
          y1={3.25}
          z0={0.72}
          z1={1.0}
          top="#ffffff"
          right="#eef0fb"
          left="#e2e6f6"
          stroke="rgba(43,78,255,0.4)"
        />
        {/* Blanket fold line across the mattress. */}
        <line
          x1={iso(0.45, 2.5, 0.72)[0]}
          y1={iso(0.45, 2.5, 0.72)[1]}
          x2={iso(1.35, 2.5, 0.72)[0]}
          y2={iso(1.35, 2.5, 0.72)[1]}
          stroke="rgba(43,78,255,0.4)"
          strokeWidth="1"
        />

        {/* Right bed: their side (amber). */}
        <Box
          x0={1.5}
          x1={3.3}
          y0={0.45}
          y1={1.35}
          z0={0}
          z1={0.72}
          top="#ffe9a8"
          right="#f7d472"
          left="#e9c65e"
          stroke="rgba(240,177,0,0.6)"
        />
        {/* Pillow, against the wall end. */}
        <Box
          x0={2.95}
          x1={3.25}
          y0={0.55}
          y1={1.25}
          z0={0.72}
          z1={1.0}
          top="#ffffff"
          right="#fbf3d8"
          left="#f4ebc9"
          stroke="rgba(240,177,0,0.45)"
        />
        {/* Blanket fold line across the mattress. */}
        <line
          x1={iso(2.5, 0.45, 0.72)[0]}
          y1={iso(2.5, 0.45, 0.72)[1]}
          x2={iso(2.5, 1.35, 0.72)[0]}
          y2={iso(2.5, 1.35, 0.72)[1]}
          stroke="rgba(240,177,0,0.55)"
          strokeWidth="1"
        />
      </svg>

      {/* 3D badge, top-left, like a viewer chrome label. */}
      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-cobalt shadow-sm ring-1 ring-ink/5">
        <CubeIcon />
        3D
      </span>

      {/* Orbit control, bottom-right, implying you can spin the room. */}
      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-ink/90 px-2.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-white shadow-lg backdrop-blur-sm">
        <OrbitIcon />
        Orbit
      </span>
    </div>
  );
}
