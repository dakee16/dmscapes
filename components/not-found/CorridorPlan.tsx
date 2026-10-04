import css from "./NotFound.module.css";

/** Room numbers along the corridor; 404 is the one that isn't there. */
const TOP = [
  { n: "401", x: 64 },
  { n: "402", x: 194 },
  { n: "403", x: 324 },
  { n: "405", x: 454 },
];

/** Positions are in the design's 608 × 600 plan units, scaled to fit. */
const box = (x: number, y: number, w: number, h: number) =>
  ({
    left: `${(x / 608) * 100}%`,
    top: `${(y / 600) * 100}%`,
    width: `${(w / 608) * 100}%`,
    height: `${(h / 600) * 100}%`,
  }) as React.CSSProperties;
const at = (x: number, y: number) =>
  ({ left: `${(x / 608) * 100}%`, top: `${(y / 600) * 100}%` }) as React.CSSProperties;

/**
 * Floor 4, east wing: rooms 401–407 drawn on plan paper, with a dashed pink
 * outline where 404 should be (design-handoff/designs/site/NotFound.dc.html).
 * Purely decorative.
 */
export default function CorridorPlan() {
  return (
    <div className={`ds-plan-paper ${css.plan}`} aria-hidden="true" data-reveal-img="load">
      <span className={css.planLabel} style={{ left: "4.6%", top: "4%" }}>
        FLOOR 4 · EAST WING
      </span>
      <span className={`${css.planLabel} ${css.north}`} style={{ right: "4.6%", top: "4%" }}>
        <svg width="10" height="12" viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 11V1M1.5 4.5 5 1l3.5 3.5" />
        </svg>
        N
      </span>

      {/* Top row: 401, 402, 403, 405 */}
      <span className={css.wallBox} style={box(40, 64, 528, 200)} data-grow="" />
      {[170, 300, 430].map((x) => (
        <span key={x} className={css.wall} style={box(x, 64, 6, 200)} data-grow="" />
      ))}
      {[100, 230, 360, 490].map((x) => (
        <span key={x} className={css.door} style={box(x, 258, 44, 6)} />
      ))}
      {TOP.map((r) => (
        <span key={r.n} className={css.roomNo} style={at(r.x, 150)}>
          {r.n}
        </span>
      ))}

      {/* Corridor */}
      <span className={css.corridor} style={box(40, 264, 528, 90)} />
      <span className={css.corridorLabel} style={at(60, 300)}>
        CORRIDOR
      </span>

      {/* Bottom row: 406, (404), 407 */}
      <span className={`${css.wallBox} ${css.wallBoxOpen}`} style={box(40, 354, 528, 200)} data-grow="" />
      <span className={css.wall} style={box(40, 354, 150, 6)} />
      <span className={css.wall} style={box(418, 354, 150, 6)} />
      <span className={css.wall} style={box(184, 354, 6, 200)} />
      <span className={css.wall} style={box(418, 354, 6, 200)} />
      <span className={css.roomNo} style={at(70, 440)}>
        406
      </span>
      <span className={css.roomNo} style={at(454, 440)}>
        407
      </span>

      {/* 404: the missing room */}
      <span className={css.missing} style={box(196, 368, 216, 172)} data-pop="" />
      <span className={css.missingNo} style={{ ...at(196, 394), width: `${(216 / 608) * 100}%` }}>
        404
      </span>
      <span className={css.missingNote} style={{ ...at(196, 496), width: `${(216 / 608) * 100}%` }}>
        no such room
      </span>

      {/* You are here */}
      <span className={css.here} style={box(294, 296, 24, 24)} />
      <span className={css.hereTag} style={at(330, 290)}>
        YOU ARE HERE
      </span>

      <span className={css.planFoot}>ROOM COUNT CHECKED TWICE. STILL MISSING.</span>
    </div>
  );
}
