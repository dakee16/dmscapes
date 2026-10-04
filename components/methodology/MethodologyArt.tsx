import { ArrowRight } from "@/components/ds/Icons";
import css from "./Methodology.module.css";

/** Small line drawings for the four house rules (Methodology.dc.html). */
export function RuleArt({ kind }: { kind: "feet" | "type" | "bed" | "closet" }) {
  if (kind === "feet") {
    return (
      <div className={css.ruleArt} aria-hidden="true">
        <span className={css.feetRoom} data-grow="" />
        <span className={css.feetLength}>LENGTH 16.4</span>
        <span className={css.feetWidth}>12</span>
      </div>
    );
  }
  if (kind === "type") {
    return (
      <div className={css.ruleArt} aria-hidden="true">
        <span className={css.typeA} />
        <span className={css.typeB} />
        <span className={css.typeC} />
        <ArrowRight size={22} strokeWidth={2.8} className={css.typeArrow} />
        <span className={css.typeOne} data-grow="" />
      </div>
    );
  }
  if (kind === "bed") {
    return (
      <div className={css.ruleArt} aria-hidden="true">
        <span className={css.bedXl} data-grow="" />
        <span className={css.bedTwin} data-grow="" style={{ "--i": 1 } as React.CSSProperties} />
        <span className={css.bedLabel}>
          TWIN XL
          <br />
          <span>TWIN</span>
        </span>
      </div>
    );
  }
  return (
    <div className={css.ruleArt} aria-hidden="true">
      <span className={css.closetRoom} data-grow="" />
      <span className={css.closet} data-grow="" style={{ "--i": 2 } as React.CSSProperties} />
    </div>
  );
}

/*
 * The same bed, desk and dresser in two rooms at one scale. Drawn in feet
 * (viewBox units) so both rooms share --ft and the pieces never change size.
 */
const WALL = 5 / 22; // the 5px wall at 22px per foot
const PIECES = { bed: [3.18, 6.68], desk: [3.5, 2], dresser: [2.5, 2] } as const;

function Room({ l, w, desk, dresser, i }: { l: number; w: number; desk: number; dresser: number; i: number }) {
  const piece = (x: number, [pw, ph]: readonly [number, number]) => (
    <rect
      x={x + 0.045}
      y={WALL + 0.045}
      width={pw - 0.09}
      height={ph - 0.09}
      fill="#EEF1FD"
      stroke="var(--ds-blue)"
      strokeWidth={0.09}
    />
  );
  return (
    <svg
      viewBox={`0 0 ${l} ${w}`}
      className={css.scaleRoom}
      style={{ "--l": l, "--w": w, "--i": i } as React.CSSProperties}
      data-grow=""
      aria-hidden="true"
    >
      <rect x={0} y={0} width={l} height={w} fill="#fff" />
      {piece(WALL, PIECES.bed)}
      {piece(desk, PIECES.desk)}
      {piece(dresser, PIECES.dresser)}
      <rect x={WALL / 2} y={WALL / 2} width={l - WALL} height={w - WALL} fill="none" stroke="var(--ds-ink)" strokeWidth={WALL} />
    </svg>
  );
}

export function SameScale() {
  return (
    <figure
      className={css.scale}
      aria-label="The same bed, desk and dresser footprints placed in a 12 by 10 foot room and a 16.4 by 12 foot room, unchanged in size"
    >
      <div className={css.scaleItem}>
        <Room l={12} w={10} desk={5} dresser={9.27} i={0} />
        <span className={css.scaleCap}>12 × 10 ft</span>
      </div>
      <div className={css.scaleItem}>
        <Room l={16.4} w={12} desk={6.36} dresser={13.68} i={2} />
        <span className={css.scaleCap}>16.4 × 12 ft · same pieces, same size</span>
      </div>
    </figure>
  );
}
