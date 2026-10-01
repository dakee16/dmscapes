import css from "./About.module.css";

/**
 * "Buying blind" as three small floor plans (About.dc.html · The problem):
 * the rug that won't unroll, two mini fridges, the stranded storage cart.
 * Shapes are SVG in the design's 416 × 380 card space; labels are HTML laid
 * over it so they keep their own width, sized in container units so the
 * whole card scales like a drawing.
 */

const W = 416;
const H = 380;

function Room() {
  return <rect x={42.5} y={42.5} width={331} height={295} fill="none" stroke="var(--ds-ink)" strokeWidth={5} />;
}

/** A piece of furniture drawn the way the planner draws it. */
function Piece({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect x={x + 0.75} y={y + 0.75} width={w - 1.5} height={h - 1.5} fill="#EEF1FD" stroke="var(--ds-blue)" strokeWidth={1.5} />;
}

/** An overlay label, positioned in the 416 × 380 card space. */
function Label({ x, y, className, children, i = 0 }: { x: number; y: number; className: string; children: React.ReactNode; i?: number }) {
  return (
    <span
      className={className}
      data-pop=""
      style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, "--i": i } as React.CSSProperties}
    >
      {children}
    </span>
  );
}

function Plan({ label, i, children, overlay }: { label: string; i: number; children: React.ReactNode; overlay: React.ReactNode }) {
  return (
    <div className={css.plan} role="img" aria-label={label}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={css.planSvg}
        data-grow=""
        style={{ "--i": i } as React.CSSProperties}
        aria-hidden="true"
      >
        {children}
      </svg>
      {overlay}
    </div>
  );
}

export default function BlindPlans() {
  return (
    <ul className={css.plans}>
      <li>
        <figure className={css.planFig} data-reveal="">
          <Plan
            i={0}
            label="A rug too big for the floor, running under the bed and desk and curling against the wall"
            overlay={
              <Label x={150} y={300} className={css.pill} i={8}>
                8 × 10 rug, 12 × 10 room
              </Label>
            }
          >
            <defs>
              <pattern id="bp-rug" width="9" height="9" patternUnits="userSpaceOnUse">
                <rect width="9" height="7" fill="rgba(227, 207, 174, 0.85)" />
                <rect y="7" width="9" height="2" fill="rgba(210, 182, 140, 0.85)" />
              </pattern>
              <pattern id="bp-clash" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="3" height="8" fill="var(--ds-pink)" />
              </pattern>
            </defs>
            <Room />
            <Piece x={45} y={45} w={72} h={150} />
            <Piece x={300} y={45} w={71} h={80} />
            <rect x={89} y={121} width={248} height={168} fill="url(#bp-rug)" stroke="#9C7A4E" strokeWidth={2} />
            <rect x={88} y={120} width={29} height={75} fill="url(#bp-clash)" />
            <rect x={300} y={120} width={38} height={5} fill="url(#bp-clash)" />
            <path d="M318 180h0a20 20 0 0 1 20 20v70a20 20 0 0 1-20 20z" fill="#C9AF86" />
            <path d="M333 186.5a20 20 0 0 1 5 13.5v70a20 20 0 0 1-5 13.5z" fill="rgba(90, 60, 30, 0.25)" />
          </Plan>
          <figcaption className={css.planCap}>Rugs that don&rsquo;t unroll all the way.</figcaption>
        </figure>
      </li>
      <li>
        <figure className={css.planFig} data-reveal="" style={{ "--i": 1 } as React.CSSProperties}>
          <Plan
            i={1}
            label="Two identical mini fridges side by side in one room, each marked mini fridge"
            overlay={
              <>
                <Label x={174} y={126} className={`${css.pill} ${css.pillRound}`} i={9}>
                  × 2
                </Label>
                <Label x={110} y={250} className={css.aside} i={10}>
                  Nobody asked the roommate.
                </Label>
              </>
            }
          >
            <Room />
            <Piece x={45} y={45} w={72} h={150} />
            <Piece x={299} y={45} w={72} h={150} />
            {[150, 214].map((x) => (
              <g key={x}>
                <rect x={x + 1.5} y={61.5} width={49} height={49} fill="#FFF0F7" stroke="var(--ds-magenta)" strokeWidth={3} />
                <text x={x + 26} y={89} className={css.fridge} textAnchor="middle">
                  FRIDGE
                </text>
              </g>
            ))}
          </Plan>
          <figcaption className={css.planCap}>Two mini fridges.</figcaption>
        </figure>
      </li>
      <li>
        <figure className={css.planFig} data-reveal="" style={{ "--i": 2 } as React.CSSProperties}>
          <Plan
            i={2}
            label="A rolling storage cart parked in the only walkway, leaving no space to stand"
            overlay={
              <Label x={250} y={160} className={css.pill} i={10}>
                no room to stand
              </Label>
            }
          >
            <defs>
              <pattern id="bp-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="4" height="9" fill="rgba(36, 73, 255, 0.10)" />
              </pattern>
            </defs>
            <Room />
            <Piece x={45} y={45} w={72} h={150} />
            <Piece x={191} y={45} w={180} h={60} />
            <rect x={45.75} y={250.75} width={178.5} height={83.5} fill="url(#bp-hatch)" stroke="var(--ds-blue)" strokeWidth={1.5} />
            <rect x={137.5} y={151.5} width={43} height={43} rx={5} fill="#FFF0F7" stroke="var(--ds-magenta)" strokeWidth={3} />
            <circle cx={219} cy={173} r={21.5} fill="none" stroke="rgba(22, 22, 29, 0.35)" strokeWidth={3} strokeDasharray="7 5" />
          </Plan>
          <figcaption className={css.planCap}>A storage cart with nowhere to stand.</figcaption>
        </figure>
      </li>
    </ul>
  );
}
