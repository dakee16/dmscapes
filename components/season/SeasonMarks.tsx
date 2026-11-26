import css from "./Season.module.css";

// Season marks (design-handoff/halloween/Main.dc.html · Pieces): ink outlines at
// the plan drawings' weight, so they sit with the rest of the brand. Every
// placement gates them with data-season-show (app/ds.css).

/** The holiday season's bauble: a red ball with a gold band and cap on a gold loop. */
export function OrnamentMark({ size, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className={`${css.mark} ${className ?? ""}`}>
      <circle cx="16" cy="4.6" r="2.3" fill="none" stroke="var(--ds-tape)" strokeWidth="1.6" />
      <circle cx="16" cy="19.6" r="10.4" fill="var(--ds-red)" stroke="var(--ds-ink)" strokeWidth="1.8" />
      <path d="M6.4 17.6c4.4 2.4 14.8 2.4 19.2 0" fill="none" stroke="var(--ds-tape)" strokeWidth="2" />
      <rect x="12.4" y="6.4" width="7.2" height="4.4" rx="1" fill="var(--ds-tape)" stroke="var(--ds-ink)" strokeWidth="1.4" />
      <circle cx="12" cy="14.6" r="2" fill="#fff" opacity=".75" />
    </svg>
  );
}

/** The holiday 404's tree: three tiers, a gold star, red and gold baubles. */
export function TreeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 48" aria-hidden="true" className={className}>
      <rect x="17.5" y="37" width="5" height="7" fill="#8e6a43" stroke="var(--ds-ink)" strokeWidth="1.8" />
      <g fill="#2f7d4a" stroke="var(--ds-ink)" strokeWidth="2" strokeLinejoin="round">
        <path d="M20 19 35 38H5z" />
        <path d="M20 12 31 28H9z" />
        <path d="M20 6 28 18H12z" />
      </g>
      <path d="M20 .6l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="var(--ds-tape)" stroke="var(--ds-ink)" strokeWidth="1.2" strokeLinejoin="round" />
      {[[16, 24, "var(--ds-red)"], [24.5, 31, "var(--ds-tape)"], [13, 34, "var(--ds-tape)"], [25, 21, "var(--ds-red)"], [19, 33.5, "var(--ds-red)"]].map(([x, y, c]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.9" fill={c as string} />
      ))}
    </svg>
  );
}

/** The pumpkin: three lobes and a stem (green on the hero chip, ink elsewhere). */
export function PumpkinMark({ size, stem = "ink" }: { size: number; stem?: "green" | "ink" }) {
  const w = stem === "green" ? 1.6 : 1.8;
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className={css.mark}>
      <ellipse cx="10.5" cy="19" rx="8" ry="10" fill="var(--ds-pumpkin)" stroke="var(--ds-ink)" strokeWidth={w} />
      <ellipse cx="21.5" cy="19" rx="8" ry="10" fill="var(--ds-pumpkin)" stroke="var(--ds-ink)" strokeWidth={w} />
      <ellipse cx="16" cy="19" rx="6.2" ry="10.6" fill="#ff8f3a" stroke="var(--ds-ink)" strokeWidth={w} />
      <path d="M16 9c0-2.6.8-4.2 2.8-5.2" stroke={stem === "green" ? "#7bbf5a" : "var(--ds-ink)"} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const BAT_PATH =
  "M20 15C18.6 12.6 16.4 11.6 13.6 12.2C12.6 10.2 10.4 9.2 7.8 9.8C7.4 7.6 5.4 6 2 5.8C6 4 10.6 3.6 14.4 5.6C15.6 4.6 16.6 4.4 17.6 4.8L18.4 2.6L19.4 4.4L20.6 4.4L21.6 2.6L22.4 4.8C23.4 4.4 24.4 4.6 25.6 5.6C29.4 3.6 34 4 38 5.8C34.6 6 32.6 7.6 32.2 9.8C29.6 9.2 27.4 10.2 26.4 12.2C23.6 11.6 21.4 12.6 20 15Z";

export function BatMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 18" aria-hidden="true" className={className}>
      <path d={BAT_PATH} fill="var(--ds-ink)" />
    </svg>
  );
}

/** The holiday hero's festoon: 1920 wide in shallow 240-unit swoops with a bulb every 30, cropped to the hero's width. */
function festoon() {
  const w = 1920, top = 3, sag = 16, swoop = 240, wire = (x: number) => top + sag * Math.sin((Math.PI * (x % swoop)) / swoop);
  return { w, h: 38, top, sag, swoop, bulbs: Array.from({ length: 64 }, (_, i) => [15 + i * 30, +(wire(15 + i * 30) + 10).toFixed(1)]) };
}

/**
 * A string of bulbs on a drooping wire. Halloween's two drapes, the desktop one
 * (600 wide) and the phone one (360 wide), take their bulb positions from the
 * designs; the holiday festoon is computed and cropped to fit any width.
 */
const DRAPES: Record<"wide" | "narrow" | "festoon", { w: number; h: number; top: number; sag: number; swoop: number; bulbs: readonly (readonly number[])[] }> = {
  festoon: festoon(),
  wide: {
    w: 600, h: 46, top: 4, sag: 26, swoop: 300,
    bulbs: [[13, 20.8], [39, 27.3], [65, 32.4], [91, 36.2], [117, 38.5], [143, 38.9], [169, 38.5], [195, 36.3], [221, 32.4], [247, 27.3], [273, 20.8], [299, 13.4], [325, 20.8], [351, 27.3], [377, 32.4], [403, 36.2], [429, 38.5], [455, 38.9], [481, 38.5], [507, 36.3], [533, 32.4], [559, 27.3], [585, 20.8]],
  },
  narrow: {
    w: 360, h: 34, top: 3, sag: 18, swoop: 180,
    bulbs: [[12, 15.7], [36, 22.6], [60, 27.6], [84, 29.9], [108, 29.1], [132, 25.4], [156, 19.3], [180, 12], [204, 19.3], [228, 25.4], [252, 29.1], [276, 29.9], [300, 27.6], [324, 22.6], [348, 15.7]],
  },
};
const BULB_COLORS = ["var(--ds-pumpkin)", "#8e63c9", "#ffc24b"];
/** Christmas bulbs: red, gold, pine green and warm white. */
export const HOLIDAY_BULBS = ["var(--ds-red)", "var(--ds-tape)", "#2f8f4e", "#fff1d6"];
// The design staggers the twinkle by bulb: every 3rd at 0.9 s, the ones after at 1.8 s.
const TWINKLE_DELAY = [0.9, 1.8, 0];

export function SeasonLights({ drape, colors = BULB_COLORS, className }: { drape: keyof typeof DRAPES; colors?: string[]; className?: string }) {
  const { w, h, top, sag, swoop, bulbs } = DRAPES[drape];
  let d = "";
  for (let x = 0; x <= w; x += 6) d += `${x ? "L" : "M"}${x} ${(top + sag * Math.sin((Math.PI * (x % swoop)) / swoop)).toFixed(1)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio={drape === "festoon" ? "xMidYMin slice" : undefined} aria-hidden="true" className={`${css.lights} ${className ?? ""}`}>
      <path d={d} fill="none" stroke="var(--ds-ink)" strokeWidth="1.4" />
      {bulbs.map(([cx, cy], i) => {
        const fill = colors[i % colors.length];
        return (
          <g key={cx}>
            <circle cx={cx} cy={cy} r="9" fill={fill} opacity="0.22" />
            <rect x={cx - 2} y={cy - 8} width="4" height="4" fill="var(--ds-ink)" />
            <ellipse className={css.bulb} cx={cx} cy={cy} rx="3.6" ry="4.8" fill={fill} style={{ animationDelay: `${TWINKLE_DELAY[(i + 1) % 3]}s` }} />
          </g>
        );
      })}
    </svg>
  );
}

/** The 404's ghost: a sheet with a scalloped hem. */
export function GhostMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 48" aria-hidden="true" className={className}>
      <path d="M6 46V20a16 16 0 0 1 32 0v26l-5.3-5-5.4 5-5.3-5-5.4 5-5.3-5z" fill="#fff" stroke="var(--ds-ink)" strokeWidth="2.4" strokeLinejoin="round" />
      <ellipse cx="17" cy="20" rx="2.6" ry="3.6" fill="var(--ds-ink)" />
      <ellipse cx="27" cy="20" rx="2.6" ry="3.6" fill="var(--ds-ink)" />
      <ellipse cx="22" cy="30" rx="3" ry="2.2" fill="var(--ds-ink)" />
    </svg>
  );
}
