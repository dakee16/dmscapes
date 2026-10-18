import css from "./Season.module.css";

// Halloween season marks (design-handoff/halloween/Main.dc.html · Pieces): ink
// outlines at the plan drawings' weight, so they sit with the rest of the brand.
// Every placement gates them with data-season-show (app/ds.css).

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

/**
 * A string of bulbs on a drooping wire. Two drapes: the desktop one (600 wide)
 * and the phone one (360 wide), with the bulb positions taken from the designs.
 */
const DRAPES = {
  wide: {
    w: 600, h: 46, top: 4, sag: 26, swoop: 300,
    bulbs: [[13, 20.8], [39, 27.3], [65, 32.4], [91, 36.2], [117, 38.5], [143, 38.9], [169, 38.5], [195, 36.3], [221, 32.4], [247, 27.3], [273, 20.8], [299, 13.4], [325, 20.8], [351, 27.3], [377, 32.4], [403, 36.2], [429, 38.5], [455, 38.9], [481, 38.5], [507, 36.3], [533, 32.4], [559, 27.3], [585, 20.8]],
  },
  narrow: {
    w: 360, h: 34, top: 3, sag: 18, swoop: 180,
    bulbs: [[12, 15.7], [36, 22.6], [60, 27.6], [84, 29.9], [108, 29.1], [132, 25.4], [156, 19.3], [180, 12], [204, 19.3], [228, 25.4], [252, 29.1], [276, 29.9], [300, 27.6], [324, 22.6], [348, 15.7]],
  },
} as const;
const BULB_COLORS = ["var(--ds-pumpkin)", "#8e63c9", "#ffc24b"];
// The design staggers the twinkle by bulb: every 3rd at 0.9 s, the ones after at 1.8 s.
const TWINKLE_DELAY = [0.9, 1.8, 0];

export function SeasonLights({ drape, className }: { drape: keyof typeof DRAPES; className?: string }) {
  const { w, h, top, sag, swoop, bulbs } = DRAPES[drape];
  let d = "";
  for (let x = 0; x <= w; x += 6) d += `${x ? "L" : "M"}${x} ${(top + sag * Math.sin((Math.PI * (x % swoop)) / swoop)).toFixed(1)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className={`${css.lights} ${className ?? ""}`}>
      <path d={d} fill="none" stroke="var(--ds-ink)" strokeWidth="1.4" />
      {bulbs.map(([cx, cy], i) => {
        const fill = BULB_COLORS[i % 3];
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
