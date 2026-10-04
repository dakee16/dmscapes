import type { FittedRoom } from "@/lib/room-preview";
import { ft } from "@/lib/room-preview";
import { footprint } from "@/components/canvas/geometry";

const LABELS: Record<string, string> = { bed: "Bed", desk: "Desk", dresser: "Dresser" };
const U = 24; // viewBox units per foot

/**
 * A room drawn to scale on plan paper: walls, the door swing, the window and
 * the built-in furniture where the planner's starting layout puts it.
 * Rendered on the server. Its on-screen size is length × --ppf, so several
 * plans with the same --ppf share one scale.
 */
export default function ScalePlan({
  room,
  title,
  className = "",
  furnitureClassName = "",
  uid,
}: {
  /** unique per page, for the grid pattern id */
  uid: string;
  room: FittedRoom;
  title: string;
  className?: string;
  /** hook for a "show standard furniture" toggle */
  furnitureClassName?: string;
}) {
  const { lengthFt: L, widthFt: W, furniture, isCorridor } = room;
  const padT = 34;
  const padR = 34;
  const pad = 8;
  const vw = L * U + pad + padR;
  const vh = W * U + padT + pad;
  const X = (f: number) => pad + f * U;
  const Y = (f: number) => padT + f * U;
  const door = Math.min(3, W * 0.4) * U;
  const id = `plan-grid-${uid}`;

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      role="img"
      aria-label={title}
      className={className}
      style={{ width: `calc(${vw / U} * var(--ppf, 20) * 1px)`, maxWidth: "100%", height: "auto", display: "block" }}
    >
      <defs>
        <pattern id={id} width={U} height={U} patternUnits="userSpaceOnUse" x={pad} y={padT}>
          <path d={`M ${U} 0 L 0 0 0 ${U}`} fill="none" stroke="rgba(36,73,255,0.12)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* dimension lines */}
      <g stroke="var(--ds-ink)" strokeWidth="1.5" fill="none">
        <line x1={X(0)} y1={12} x2={X(L)} y2={12} />
        <line x1={X(0)} y1={6} x2={X(0)} y2={18} />
        <line x1={X(L)} y1={6} x2={X(L)} y2={18} />
        <line x1={X(L) + 20} y1={Y(0)} x2={X(L) + 20} y2={Y(W)} />
        <line x1={X(L) + 14} y1={Y(0)} x2={X(L) + 26} y2={Y(0)} />
        <line x1={X(L) + 14} y1={Y(W)} x2={X(L) + 26} y2={Y(W)} />
      </g>
      <g fontFamily="var(--ds-sans)" fontWeight="800" fontSize="15" fill="var(--ds-ink)" textAnchor="middle">
        <rect x={X(L / 2) - 34} y={2} width={68} height={20} fill="var(--ds-card-bg, #fff)" />
        <text x={X(L / 2)} y={17}>{ft(L)} ft</text>
        <g transform={`translate(${X(L) + 20} ${Y(W / 2)}) rotate(90)`}>
          <rect x={-30} y={-10} width={60} height={20} fill="var(--ds-card-bg, #fff)" />
          <text y={5}>{ft(W)} ft</text>
        </g>
      </g>

      {/* floor */}
      <rect x={X(0)} y={Y(0)} width={L * U} height={W * U} fill="#fff" />
      <rect x={X(0)} y={Y(0)} width={L * U} height={W * U} fill={`url(#${id})`} />

      {/* furniture */}
      <g className={furnitureClassName}>
        {furniture.map((f) => {
          const fp = footprint(f);
          const w = f.width_ft * U;
          const h = f.length_ft * U;
          const cx = X(fp.x + fp.w / 2);
          const cy = Y(fp.y + fp.h / 2);
          const label = LABELS[f.type];
          const vertical = fp.h > fp.w;
          return (
            <g key={f.id}>
              <rect
                x={cx - w / 2}
                y={cy - h / 2}
                width={w}
                height={h}
                rx={f.type === "desk_chair" ? 6 : 2}
                transform={`rotate(${f.rotation_deg} ${cx} ${cy})`}
                fill="#EEF1FD"
                stroke="var(--ds-blue)"
                strokeWidth="1.6"
              />
              {f.type === "bed" && (
                <rect
                  x={cx - w / 2 + w * 0.12}
                  y={cy - h / 2 + 5}
                  width={w * 0.76}
                  height={Math.min(18, h * 0.16)}
                  rx={4}
                  transform={`rotate(${f.rotation_deg} ${cx} ${cy})`}
                  fill="#fff"
                  stroke="var(--ds-blue)"
                  strokeWidth="1.2"
                />
              )}
              {label && Math.max(fp.w, fp.h) * U > 44 && (
                <text
                  x={cx}
                  y={cy}
                  transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="var(--ds-mono)"
                  fontWeight="700"
                  fontSize="9"
                  letterSpacing="0.8"
                  fill="var(--ds-blue)"
                >
                  {label.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* walls */}
      <rect x={X(0)} y={Y(0)} width={L * U} height={W * U} fill="none" stroke="var(--ds-ink)" strokeWidth="5" />

      {/* door: bottom of the left wall (corridor: left end), as the templates are authored */}
      <line x1={X(0)} y1={Y(W) - door} x2={X(0)} y2={Y(W)} stroke="#fff" strokeWidth="7" />
      <path
        d={`M ${X(0)} ${Y(W) - door} A ${door} ${door} 0 0 1 ${X(0) + door} ${Y(W)}`}
        fill="none"
        stroke="#9AA3C7"
        strokeWidth="1.4"
        strokeDasharray="4 4"
      />

      {/* window */}
      {isCorridor ? (
        <line x1={X(L * 0.35)} y1={Y(0)} x2={X(L * 0.65)} y2={Y(0)} stroke="var(--ds-blue)" strokeWidth="5" />
      ) : (
        <line x1={X(L)} y1={Y(W * 0.3)} x2={X(L)} y2={Y(W * 0.7)} stroke="var(--ds-blue)" strokeWidth="5" />
      )}
    </svg>
  );
}
