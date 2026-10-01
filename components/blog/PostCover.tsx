import type { ReactNode } from "react";
import { PLUS_PRICE_USD } from "@/lib/plan";
import css from "./Cover.module.css";

/**
 * The blog's cover system (design-handoff/designs/site/Blog): every post gets
 * art built from plans, tape and swatches instead of stock photos. Each cover
 * is drawn on a 416×220 board and scales to any card. Posts without a drawn
 * cover get one of the generic plan covers, picked from the slug so it never
 * changes between renders.
 */

const INK = "#16161D";
const BLUE = "#2449FF";
const YELLOW = "#FFD83D";
const GLOW = "#8FB2FF";
const MAGENTA = "#C0186F";

type Bg = "night" | "paper" | "blue" | "sky" | "warm" | "yellow" | "ink" | "rose" | "white" | "taped";

interface Cover {
  bg: Bg;
  /** grid size for the paper / night backgrounds */
  grid?: number;
  tag?: string;
  art?: ReactNode;
  /** full-bleed art that ignores the 416×220 board (fabric swatches) */
  full?: ReactNode;
}

/** A strip of measuring tape with inch and foot ticks. */
function Tape({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const small = Math.floor(w / 9);
  const big = Math.floor(w / 45);
  return (
    <g>
      <rect x={x} y={y + 4} width={w} height={h} fill="#C99A06" />
      <rect x={x} y={y} width={w} height={h} fill="#F3C21A" />
      {Array.from({ length: small }, (_, i) => (
        <rect key={`s${i}`} x={x + i * 9} y={y} width={1.5} height={h * 0.19} fill="rgba(22,22,29,0.6)" />
      ))}
      {Array.from({ length: big }, (_, i) => (
        <rect key={`b${i}`} x={x + i * 45} y={y} width={2} height={h * 0.34} fill={INK} />
      ))}
    </g>
  );
}

function Cursor({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <path
      d={`M${x} ${y}l0 17 4.6-4.2 3.2 7.4 3-1.3-3.2-7.2 6.4-.2z`}
      fill={color}
      stroke="#fff"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  );
}

/** Rounded-top bar standing on the baseline (cost chart). */
const bar = (x: number, h: number, base = 190, w = 56) =>
  `M${x} ${base - h + 4}a4 4 0 0 1 4-4h${w - 8}a4 4 0 0 1 4 4V${base}H${x}z`;

function checkRow(y: number, label: string, state: "on" | "done" | "off" | "yellow", x = 60, size = 18) {
  const box = 22;
  return (
    <g key={label}>
      {state === "off" ? (
        <rect x={x + 1.25} y={y - box / 2 + 1.25} width={box - 2.5} height={box - 2.5} rx="4" fill="none" stroke="#9C9AA8" strokeWidth="2.5" />
      ) : (
        <rect x={x} y={y - box / 2} width={box} height={box} rx="5" fill={state === "yellow" ? YELLOW : state === "done" ? INK : BLUE} />
      )}
      {state === "done" && (
        <path d={`M${x + 6} ${y}l3.6 3.6 6.4-7`} fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
      <text x={x + 34} y={y + 6.5} className={css.label} style={{ fontSize: size }} fill={state === "off" ? "#9C9AA8" : INK}>
        {label}
      </text>
    </g>
  );
}

function layoutRoom(x: number, kind: number) {
  const w = 84.5;
  const top = 28;
  const h = 164;
  const ix = x + 6;
  return (
    <g key={kind}>
      <rect x={x + 1.5} y={top + 1.5} width={w - 3} height={h - 3} fill="#fff" stroke={INK} strokeWidth="3" />
      {kind === 0 && (
        <>
          <rect x={ix} y={34} width={18} height={60} fill={BLUE} />
          <rect x={x + w - 24} y={34} width={18} height={60} fill={BLUE} />
        </>
      )}
      {kind === 1 && (
        <>
          <rect x={ix} y={34} width={18} height={60} fill={BLUE} />
          <rect x={ix + 22} y={34} width={18} height={60} fill={BLUE} />
        </>
      )}
      {kind === 2 && (
        <>
          <rect x={ix} y={34} width={40} height={22} fill={BLUE} />
          <rect x={ix} y={61} width={40} height={16} fill={YELLOW} />
        </>
      )}
      {kind === 3 && (
        <>
          <rect x={ix} y={34} width={18} height={60} fill={BLUE} />
          <rect x={ix} y={168} width={50} height={18} fill={BLUE} />
        </>
      )}
    </g>
  );
}

const plainRoom = (
  <>
    <rect x="62.5" y="62.5" width="295" height="125" fill="none" stroke={INK} strokeWidth="5" />
    <rect x="65.75" y="65.75" width="48.5" height="98.5" fill="#EEF1FD" stroke={BLUE} strokeWidth="1.5" />
    <rect x="150" y="100" width="120" height="70" fill={YELLOW} />
  </>
);

const COVERS: Record<string, Cover> = {
  "build-a-dorm-room-in-3d": {
    bg: "night",
    art: (
      <>
        <polygon points="113,66 323,66 333,36 123,36" fill="rgba(91,124,255,0.18)" stroke={GLOW} strokeWidth="2" className={css.glow} />
        <polygon points="122.5,61 332.5,61 293.5,181 83.5,181" fill="none" stroke="#F4F3EE" strokeWidth="3" />
        <circle cx="314.5" cy="177.5" r="10.5" fill="rgba(111,146,255,0.45)" />
        <circle cx="314.5" cy="177.5" r="6.5" fill="#fff" className={css.glow} />
      </>
    ),
  },
  "plan-an-irregular-dorm-room-in-3d": {
    bg: "night",
    art: <path d="M90 50H240V118H320V176H90Z" fill="none" stroke={GLOW} strokeWidth="4" strokeLinejoin="miter" className={css.glow} />,
  },
  "introducing-dormscape-3d-room-studio": {
    bg: "blue",
    tag: "Live 3D",
    art: (
      <>
        <rect x="60" y="40" width="300" height="150" rx="10" fill="#FFE9C7" />
        <path d="M60 150H360V180a10 10 0 0 1-10 10H70a10 10 0 0 1-10-10z" fill="#C79A6B" />
        <rect x="100" y="90" width="70" height="40" rx="4" fill="#EAD7BC" />
        <rect x="250" y="70" width="12" height="70" fill={INK} />
        <path d="M236 60a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v18h-40z" fill={YELLOW} />
      </>
    ),
  },
  "arrange-a-dorm-room-in-3d": {
    bg: "sky",
    art: (
      <>
        <g transform="rotate(-8 210 110)">
          <rect x="112" y="42" width="196" height="136" fill="#fff" stroke={INK} strokeWidth="4" />
          <rect x="150" y="80" width="80" height="56" fill={BLUE} />
          <circle cx="262" cy="72" r="20.5" fill="none" stroke={BLUE} strokeWidth="3" strokeDasharray="6 5" />
        </g>
        <g transform="translate(262 122) scale(1.35)" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 4v6h-6" />
          <path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10" />
        </g>
      </>
    ),
  },
  "how-to-plan-a-college-dorm-room": {
    bg: "paper",
    grid: 20,
    art: (
      <>
        <text x="60" y="41" className={css.mono} fill={BLUE}>
          01 ROOM · 02 LAYOUT · 03 STYLE · 04 LIST
        </text>
        {plainRoom}
      </>
    ),
  },
  "dorm-room-layout-ideas": {
    bg: "warm",
    art: <>{[0, 1, 2, 3].map((k) => layoutRoom(24 + k * 94.5, k))}</>,
  },
  "design-your-own-dorm-room": {
    bg: "paper",
    grid: 24,
    art: (
      <>
        <rect x="72" y="48" width="200" height="6" fill={INK} />
        <rect x="266" y="48" width="6" height="90" fill={INK} />
        <line x1="270.5" y1="136" x2="270.5" y2="196" stroke={BLUE} strokeWidth="5" strokeDasharray="10 6" />
        <circle cx="269" cy="197" r="9.5" fill={BLUE} stroke="#fff" strokeWidth="3" />
        <rect x="290" y="150" width="46" height="24" rx="6" fill={BLUE} />
        <text x="313" y="166.5" textAnchor="middle" className={css.dim} fill="#fff">
          2′ 6″
        </text>
        <rect x="140" y="18" width="46" height="24" rx="6" fill={INK} />
        <text x="163" y="34.5" textAnchor="middle" className={css.dim} fill="#fff">
          8′ 4″
        </text>
      </>
    ),
  },
  "describe-your-dorm-room-in-words": {
    bg: "yellow",
    art: (
      <text textAnchor="middle" className={css.quote} fill={INK}>
        <tspan x="208" y="80">“Soft sage and</tspan>
        <tspan x="208" y="124">cream with</tspan>
        <tspan x="208" y="168">warm wood”</tspan>
      </text>
    ),
  },
  "is-dormscape-plus-worth-it": {
    bg: "ink",
    art: (
      <>
        <text x="208" y="124" textAnchor="middle" className={css.price} fill={YELLOW}>
          ${PLUS_PRICE_USD.toFixed(2)}
        </text>
        <text x="208" y="158" textAnchor="middle" className={css.mono} style={{ fontSize: 12, letterSpacing: "0.12em" }} fill="#C9C6D4">
          ONCE · WORTH IT?
        </text>
      </>
    ),
  },
  "compare-two-dorm-room-designs": {
    bg: "sky",
    art: (
      <>
        <rect x="50" y="64" width="126" height="92" fill="#fff" stroke={INK} strokeWidth="4" />
        <rect x="54" y="68" width="24" height="50" fill="#EAD7BC" />
        <rect x="92" y="96" width="60" height="40" fill="#D2B68C" />
        <text x="208" y="117" textAnchor="middle" className={css.label} style={{ fontSize: 20, fontWeight: 900 }} fill={INK}>
          vs
        </text>
        <rect x="240" y="64" width="126" height="92" fill="#fff" stroke={INK} strokeWidth="4" />
        <rect x="244" y="68" width="24" height="50" fill="#16244F" />
        <rect x="282" y="96" width="60" height="40" fill="#FFB3CE" />
      </>
    ),
  },
  "how-to-measure-your-dorm-room": {
    bg: "taped",
    art: (
      <>
        <g transform="rotate(-6 220 112)">
          <Tape x={-30} y={80} w={500} h={64} />
          <rect x="296" y="72" width="3" height="80" fill="#D7262E" />
        </g>
        <text x="392" y="198" textAnchor="end" className={css.mono} fill="#55555F">
          WALL TO WALL
        </text>
      </>
    ),
  },
  "dorm-packing-list-nobody-gives-you": {
    bg: "white",
    art: (
      <>
        {checkRow(74, "Surge protector", "on")}
        {checkRow(110, "Mattress topper", "on")}
        {checkRow(146, "Drying rack", "off")}
      </>
    ),
  },
  "how-much-does-a-dorm-room-cost": {
    bg: "rose",
    art: (
      <>
        {[
          { x: 98, h: 50, label: "$300", fill: INK },
          { x: 180, h: 90, label: "$600", fill: INK },
          { x: 262, h: 140, label: "$1,200", fill: BLUE },
        ].map((b) => (
          <g key={b.label}>
            <path d={bar(b.x, b.h)} fill={b.fill} />
            <text x={b.x + 28} y={190 - b.h - 8} textAnchor="middle" className={css.label} style={{ fontSize: 14 }} fill={INK}>
              {b.label}
            </text>
          </g>
        ))}
      </>
    ),
  },
  "small-dorm-room-ideas-that-work": {
    bg: "paper",
    grid: 16,
    art: (
      <>
        <rect x="152" y="62" width="116" height="92" fill="#fff" stroke={INK} strokeWidth="4" />
        <rect x="154" y="64" width="30" height="60" fill={BLUE} />
        <rect x="190" y="64" width="22" height="86" fill={YELLOW} />
        <text x="208" y="186" textAnchor="middle" className={css.mono} fill={INK}>
          LOFT IT · GO VERTICAL · ONE RUG
        </text>
      </>
    ),
  },
  "how-to-pick-a-dorm-room-style": {
    bg: "white",
    full: (
      <span className={css.swatches}>
        <span style={{ background: "#7B4A2C" }} />
        <span style={{ background: "#C8834F" }} />
        <span style={{ background: "#F4E4CC" }} />
        <span style={{ background: BLUE }} />
      </span>
    ),
  },
  "plan-a-dorm-room-with-roommates": {
    bg: "sky",
    art: (
      <>
        <rect x="98" y="42" width="220" height="136" fill="#fff" stroke={INK} strokeWidth="4" />
        <rect x="104" y="48" width="40" height="76" fill={BLUE} />
        <rect x="272" y="48" width="40" height="76" fill={MAGENTA} />
        <rect x="168" y="134" width="80" height="36" fill={YELLOW} />
        <path d="M168 170l36-36M184 170l36-36M200 170l36-36M216 170l32-32M168 154l20-20M232 170l16-16" stroke="rgba(22,22,29,0.28)" strokeWidth="2" />
        <rect x="202" y="28" width="12" height="164" fill="rgba(79,143,224,0.85)" transform="rotate(2 208 110)" />
        <Cursor x={150} y={92} color={BLUE} />
        <Cursor x={252} y={100} color={MAGENTA} />
      </>
    ),
  },
  "shared-dorm-shopping-list": {
    bg: "warm",
    art: (
      <>
        <rect x="88" y="32" width="240" height="156" rx="14" fill="#fff" />
        {checkRow(72, "To buy", "on", 112, 17)}
        {checkRow(110, "Already have", "done", 112, 17)}
        {checkRow(148, "School provides", "yellow", 112, 17)}
      </>
    ),
  },
};

/** Generic covers for posts that don't have a drawn one yet. */
const FALLBACKS: Cover[] = [
  { bg: "paper", grid: 20, art: plainRoom },
  { bg: "sky", art: plainRoom },
  { bg: "warm", art: <>{[0, 1, 2, 3].map((k) => layoutRoom(24 + k * 94.5, k))}</> },
  { bg: "taped", art: <g transform="rotate(-6 220 112)"><Tape x={-30} y={80} w={500} h={64} /></g> },
];

function pick(slug: string): Cover {
  if (COVERS[slug]) return COVERS[slug];
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return FALLBACKS[h % FALLBACKS.length];
}

/** Decorative cover art for a post; the card around it carries the title. */
export default function PostCover({
  slug,
  className = "",
  tag,
}: {
  slug: string;
  className?: string;
  /** label in the top-left corner; defaults to the cover's own tag */
  tag?: ReactNode;
}) {
  const c = pick(slug);
  const label = tag ?? c.tag;
  return (
    <span
      className={`${css.cover} ${className}`}
      data-bg={c.bg}
      style={c.grid ? ({ "--grid": `${c.grid}px` } as React.CSSProperties) : undefined}
      aria-hidden="true"
    >
      {c.full ?? (
        <svg className={css.art} viewBox="0 0 416 220" preserveAspectRatio="xMidYMid meet" focusable="false">
          {c.art}
        </svg>
      )}
      {label && <span className={css.tag}>{label}</span>}
    </span>
  );
}
