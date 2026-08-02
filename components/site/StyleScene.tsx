import type { StyleId } from "@/lib/types";

/**
 * Illustrated mini room preview for a style card: a small elevation sketch in
 * the same line-art language as the room canvas. Pure SVG, decorative only.
 */

const INK = "#17172b";
const STROKE = "rgba(23, 23, 43, 0.35)";

const WALLS: Record<StyleId, string> = {
  minimalist: "#f2f2ef",
  cozy: "#f9efe3",
  gamer: "#eceafb",
  boho: "#f4eddd",
  preppy: "#e9eef9",
  team_spirit: "#eef1f9",
  academia: "#f3e9d4",
  y2k: "#f3e8ff",
  retro: "#f6e6c4",
  pastel: "#ffeef6",
};

const TEAM_NAVY = "#0b1f3a";
const TEAM_RED = "#c8102e";

function Frame({
  id,
  children,
}: {
  id: StyleId;
  children: React.ReactNode;
}) {
  const patternId = `style-scene-grid-${id}`;
  return (
    <>
      <rect width="256" height="144" fill={WALLS[id]} />
      <defs>
        <pattern id={patternId} width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke={INK} strokeOpacity="0.05" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="256" height="144" fill={`url(#${patternId})`} />
      {children}
      {/* floor */}
      <rect x="0" y="116" width="256" height="28" fill="#ffffff" opacity="0.3" />
      <line x1="0" y1="116" x2="256" y2="116" stroke={INK} strokeOpacity="0.2" />
    </>
  );
}

function Minimalist() {
  return (
    <Frame id="minimalist">
      {/* platform bed */}
      <rect x="24" y="86" width="92" height="24" rx="3" fill="#e9e8e2" stroke={STROKE} />
      <line x1="32" y1="110" x2="32" y2="116" stroke={STROKE} />
      <line x1="108" y1="110" x2="108" y2="116" stroke={STROKE} />
      <rect x="30" y="78" width="26" height="11" rx="4" fill="#ffffff" stroke={STROKE} />
      {/* single frame */}
      <rect x="56" y="34" width="30" height="22" fill="#ffffff" stroke={STROKE} />
      <line x1="62" y1="49" x2="80" y2="42" stroke={STROKE} />
      {/* side table + small plant */}
      <rect x="168" y="92" width="30" height="24" fill="#ffffff" stroke={STROKE} />
      <line x1="183" y1="92" x2="183" y2="82" stroke={STROKE} />
      <path d="M183 84 Q175 80 174 72" fill="none" stroke={STROKE} />
      <path d="M183 82 Q190 77 192 70" fill="none" stroke={STROKE} />
    </Frame>
  );
}

function Cozy() {
  const bulbs: [number, number][] = [
    [24, 23],
    [64, 26],
    [104, 23],
    [144, 19],
    [184, 16],
    [224, 19],
  ];
  return (
    <Frame id="cozy">
      {/* string lights */}
      <path d="M0 18 Q64 30 128 20 T256 22" fill="none" stroke={STROKE} />
      {bulbs.map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y + 4} r="5" fill="#ffd84d" opacity="0.25" />
          <circle cx={x} cy={y + 4} r="2.2" fill="#ffd84d" stroke={STROKE} strokeWidth="0.75" />
        </g>
      ))}
      {/* bed with layered throw */}
      <rect x="20" y="84" width="100" height="26" rx="4" fill="#f2ddc8" stroke={STROKE} />
      <path
        d="M20 95 L120 95 L120 106 Q110 111 100 106 Q90 111 80 106 Q70 111 60 106 Q50 111 40 106 Q30 111 20 106 Z"
        fill="#c96f4a"
        opacity="0.45"
      />
      <rect x="26" y="75" width="20" height="11" rx="3" fill="#ffffff" stroke={STROKE} />
      <rect x="48" y="75" width="20" height="11" rx="3" fill="#ffffff" stroke={STROKE} />
      {/* table lamp with warm glow */}
      <circle cx="196" cy="76" r="14" fill="#ffd84d" opacity="0.18" />
      <rect x="178" y="96" width="34" height="20" fill="#ffffff" stroke={STROKE} />
      <path d="M186 70 L206 70 L202 82 L190 82 Z" fill="#ffffff" stroke={STROKE} />
      <line x1="196" y1="82" x2="196" y2="96" stroke={STROKE} />
    </Frame>
  );
}

function Gamer() {
  return (
    <Frame id="gamer">
      {/* bed, small and out of the way */}
      <rect x="16" y="90" width="72" height="20" rx="3" fill="#ddd8f6" stroke={STROKE} />
      <rect x="21" y="83" width="18" height="9" rx="3" fill="#ffffff" stroke={STROKE} />
      {/* desk */}
      <rect x="140" y="88" width="100" height="5" rx="2" fill="#ffffff" stroke={STROKE} />
      <line x1="146" y1="93" x2="146" y2="116" stroke={STROKE} />
      <line x1="232" y1="93" x2="232" y2="116" stroke={STROKE} />
      {/* LED underglow */}
      <rect x="140" y="93" width="100" height="6" fill="#6d5bd0" opacity="0.15" />
      <rect x="144" y="94" width="92" height="3" rx="1.5" fill="#6d5bd0" opacity="0.45" />
      {/* monitor */}
      <rect x="158" y="56" width="52" height="30" rx="3" fill={INK} stroke={STROKE} />
      <rect x="164" y="62" width="18" height="3" fill="#22c8e0" opacity="0.8" />
      <rect x="164" y="68" width="26" height="2.5" fill="#6d5bd0" opacity="0.9" />
      <rect x="164" y="73" width="12" height="2.5" fill="#22c8e0" opacity="0.5" />
      <rect x="176" y="86" width="16" height="2" fill={INK} opacity="0.5" />
      {/* headset on stand */}
      <path d="M216 68 A8 8 0 0 1 232 68" fill="none" stroke={STROKE} strokeWidth="1.5" />
      <rect x="214" y="68" width="4" height="8" rx="2" fill="#6d5bd0" opacity="0.7" />
      <rect x="230" y="68" width="4" height="8" rx="2" fill="#6d5bd0" opacity="0.7" />
      <line x1="224" y1="78" x2="224" y2="88" stroke={STROKE} />
      {/* chair */}
      <rect x="110" y="72" width="7" height="30" rx="3.5" fill="#ffffff" stroke={STROKE} />
      <rect x="102" y="96" width="24" height="5" rx="2.5" fill="#ffffff" stroke={STROKE} />
      <line x1="114" y1="101" x2="114" y2="110" stroke={STROKE} />
      <path d="M104 114 Q114 108 124 114" fill="none" stroke={STROKE} />
    </Frame>
  );
}

function Boho() {
  return (
    <Frame id="boho">
      {/* macrame hanging */}
      <line x1="96" y1="26" x2="164" y2="26" stroke={STROKE} strokeWidth="1.5" />
      <path d="M102 26 L130 60 L158 26" fill="#ffffff" opacity="0.55" stroke={STROKE} />
      <line x1="114" y1="41" x2="114" y2="49" stroke={STROKE} />
      <line x1="122" y1="50" x2="122" y2="59" stroke={STROKE} />
      <line x1="130" y1="60" x2="130" y2="70" stroke={STROKE} />
      <line x1="138" y1="50" x2="138" y2="59" stroke={STROKE} />
      <line x1="146" y1="41" x2="146" y2="49" stroke={STROKE} />
      {/* bed with zigzag blanket */}
      <rect x="20" y="86" width="96" height="24" rx="4" fill="#ead9be" stroke={STROKE} />
      <path
        d="M20 100 L30 95 L40 100 L50 95 L60 100 L70 95 L80 100 L90 95 L100 100 L110 95 L116 98"
        fill="none"
        stroke="#8a7b4f"
        strokeOpacity="0.6"
      />
      <rect x="26" y="77" width="22" height="11" rx="3" fill="#ffffff" stroke={STROKE} />
      {/* monstera in basket */}
      <line x1="196" y1="96" x2="188" y2="72" stroke="#4f5d3f" strokeOpacity="0.7" />
      <line x1="198" y1="96" x2="201" y2="60" stroke="#4f5d3f" strokeOpacity="0.7" />
      <line x1="200" y1="96" x2="211" y2="72" stroke="#4f5d3f" strokeOpacity="0.7" />
      <ellipse cx="187" cy="66" rx="7" ry="10" fill="#4f5d3f" opacity="0.8" transform="rotate(-18 187 66)" />
      <ellipse cx="201" cy="54" rx="7" ry="11" fill="#5f7355" />
      <ellipse cx="212" cy="66" rx="6" ry="9" fill="#4f5d3f" opacity="0.65" transform="rotate(16 212 66)" />
      <path d="M186 96 L210 96 L206 114 L190 114 Z" fill="#dccba6" stroke={STROKE} />
      <line x1="190" y1="99" x2="205" y2="111" stroke={STROKE} strokeOpacity="0.6" />
      <line x1="206" y1="99" x2="191" y2="111" stroke={STROKE} strokeOpacity="0.6" />
      {/* jute rug */}
      <ellipse cx="90" cy="122" rx="46" ry="6" fill="none" stroke="#8a7b4f" strokeOpacity="0.55" strokeDasharray="4 3" />
    </Frame>
  );
}

function Preppy() {
  return (
    <Frame id="preppy">
      {/* pennant */}
      <line x1="36" y1="30" x2="36" y2="58" stroke={STROKE} strokeWidth="1.5" />
      <path d="M36 32 L92 41 L36 50 Z" fill="#1e3a8a" />
      <rect x="36" y="32" width="4" height="18" fill="#ffffff" opacity="0.4" />
      {/* striped bed */}
      <rect x="24" y="84" width="96" height="26" rx="4" fill="#d5dff5" stroke={STROKE} />
      <rect x="24" y="92" width="96" height="3.5" fill="#1e3a8a" opacity="0.3" />
      <rect x="24" y="100" width="96" height="3.5" fill="#0f6f4f" opacity="0.25" />
      {/* gingham pillow */}
      <rect x="30" y="73" width="22" height="12" rx="2" fill="#ffffff" stroke={STROKE} />
      <line x1="37" y1="73" x2="37" y2="85" stroke="#1e3a8a" strokeOpacity="0.3" />
      <line x1="44" y1="73" x2="44" y2="85" stroke="#1e3a8a" strokeOpacity="0.3" />
      <line x1="30" y1="77" x2="52" y2="77" stroke="#1e3a8a" strokeOpacity="0.3" />
      <line x1="30" y1="81" x2="52" y2="81" stroke="#1e3a8a" strokeOpacity="0.3" />
      {/* round mirror + shelf with books */}
      <circle cx="196" cy="62" r="20" fill="#ffffff" opacity="0.6" stroke="#f5c451" strokeWidth="2.5" />
      <circle cx="196" cy="62" r="15" fill="none" stroke={INK} strokeOpacity="0.1" />
      <line x1="176" y1="100" x2="216" y2="100" stroke={STROKE} strokeWidth="1.5" />
      <rect x="184" y="90" width="5" height="10" fill="#1e3a8a" opacity="0.85" />
      <rect x="191" y="88" width="5" height="12" fill="#0f6f4f" opacity="0.85" />
      <rect x="198" y="91" width="4" height="9" fill="#f5c451" />
    </Frame>
  );
}

function TeamSpirit() {
  return (
    <Frame id="team_spirit">
      {/* scoreboard */}
      <rect x="20" y="18" width="58" height="28" rx="4" fill={INK} stroke={STROKE} />
      <rect x="26" y="24" width="20" height="16" rx="2" fill={TEAM_RED} opacity="0.85" />
      <rect x="52" y="24" width="20" height="16" rx="2" fill="#ffffff" opacity="0.55" />
      <line x1="49" y1="24" x2="49" y2="40" stroke="#ffffff" strokeOpacity="0.4" />
      {/* pennant on a pole */}
      <line x1="150" y1="16" x2="150" y2="54" stroke={STROKE} strokeWidth="1.5" />
      <path d="M150 20 L208 30 L150 40 Z" fill={TEAM_NAVY} />
      <path d="M150 26 L190 30 L150 34" fill="none" stroke={TEAM_RED} strokeWidth="2" />
      {/* varsity-striped bed */}
      <rect x="20" y="86" width="100" height="26" rx="4" fill="#eef1f7" stroke={STROKE} />
      <rect x="20" y="92" width="100" height="4" fill={TEAM_NAVY} opacity="0.8" />
      <rect x="20" y="99" width="100" height="4" fill={TEAM_RED} opacity="0.7" />
      {/* jersey-number pillow */}
      <rect x="26" y="76" width="24" height="12" rx="2" fill="#ffffff" stroke={STROKE} />
      <path d="M35 79 L35 85 M35 79 L40 79 L40 82 L35 82" fill="none" stroke={TEAM_NAVY} strokeWidth="1.1" />
      {/* mini hoop over the door */}
      <rect x="196" y="70" width="36" height="24" rx="2" fill="#ffffff" stroke={STROKE} />
      <rect x="206" y="78" width="16" height="10" rx="1" fill="none" stroke={STROKE} />
      <path d="M205 94 Q214 104 223 94" fill="none" stroke={TEAM_RED} strokeWidth="1.5" />
      <path d="M207 95 L209 101 M214 96 L214 102 M221 95 L219 101" stroke={STROKE} strokeWidth="0.7" />
    </Frame>
  );
}

function Academia() {
  const AC_WOOD = "#7c5230";
  const AC_BRASS = "#c69a4f";
  return (
    <Frame id="academia">
      {/* framed vintage portrait */}
      <rect x="150" y="26" width="34" height="42" fill="#efe4cb" stroke={AC_BRASS} strokeWidth="2" />
      <circle cx="167" cy="42" r="7" fill="#d8c39a" stroke={STROKE} strokeWidth="0.75" />
      <path d="M158 60 Q167 50 176 60" fill="#d8c39a" stroke={STROKE} strokeWidth="0.75" />
      {/* bed with plaid blanket */}
      <rect x="18" y="86" width="98" height="26" rx="3" fill="#b78a5c" opacity="0.4" stroke={STROKE} />
      <line x1="18" y1="96" x2="116" y2="96" stroke={AC_WOOD} strokeOpacity="0.5" />
      <line x1="18" y1="104" x2="116" y2="104" stroke="#6b7f3a" strokeOpacity="0.4" />
      <line x1="46" y1="86" x2="46" y2="112" stroke={AC_WOOD} strokeOpacity="0.4" />
      <line x1="82" y1="86" x2="82" y2="112" stroke={AC_WOOD} strokeOpacity="0.4" />
      <rect x="24" y="77" width="22" height="11" rx="2" fill="#efe4cb" stroke={STROKE} />
      {/* bookshelf with spines */}
      <rect x="196" y="60" width="46" height="56" fill="#efe4cb" stroke={AC_WOOD} strokeWidth="1.5" />
      <line x1="196" y1="80" x2="242" y2="80" stroke={AC_WOOD} />
      <line x1="196" y1="98" x2="242" y2="98" stroke={AC_WOOD} />
      <rect x="200" y="64" width="4" height="16" fill="#7c2d2d" />
      <rect x="205" y="66" width="4" height="14" fill="#2f4a2f" />
      <rect x="210" y="63" width="4" height="17" fill={AC_BRASS} />
      <rect x="215" y="65" width="5" height="15" fill="#33465e" />
      <rect x="222" y="64" width="4" height="16" fill="#7c2d2d" />
      <rect x="200" y="83" width="4" height="15" fill="#33465e" />
      <rect x="205" y="82" width="4" height="16" fill={AC_BRASS} />
      <path d="M212 98 l3 -15 l3 1 l-3 15 z" fill="#2f4a2f" />
      <rect x="222" y="84" width="4" height="14" fill="#7c2d2d" />
      {/* banker's lamp with green glow */}
      <circle cx="150" cy="98" r="12" fill="#6b7f3a" opacity="0.18" />
      <path d="M140 92 Q150 84 160 92 Z" fill="#2f4a2f" stroke={STROKE} strokeWidth="0.75" />
      <line x1="150" y1="92" x2="150" y2="108" stroke={AC_BRASS} strokeWidth="1.5" />
      <rect x="142" y="108" width="16" height="4" rx="1" fill={AC_BRASS} />
    </Frame>
  );
}

function Y2K() {
  const Y_PINK = "#ff4fd8";
  const Y_PURPLE = "#7b5cff";
  const Y_SILVER = "#aab6c6";
  return (
    <Frame id="y2k">
      <defs>
        <linearGradient id="y2k-holo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={Y_PINK} stopOpacity="0.55" />
          <stop offset="0.5" stopColor={Y_PURPLE} stopOpacity="0.5" />
          <stop offset="1" stopColor="#54e0ff" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {/* holographic wall tapestry */}
      <rect x="150" y="24" width="52" height="46" fill="url(#y2k-holo)" stroke={STROKE} />
      <path d="M176 34 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z" fill="#ffffff" opacity="0.85" />
      {/* butterfly clip on wall */}
      <path d="M40 34 q-7 -7 -11 0 q4 5 11 3 q7 2 11 -3 q-4 -7 -11 0" fill={Y_PINK} opacity="0.8" />
      {/* bed with metallic pink throw */}
      <rect x="16" y="86" width="94" height="26" rx="4" fill="#ffd1ec" stroke={STROKE} />
      <path d="M16 97 L110 97 L110 108 Q95 112 80 108 Q65 112 50 108 Q35 112 16 108 Z" fill={Y_PURPLE} opacity="0.4" />
      <rect x="22" y="77" width="22" height="11" rx="4" fill={Y_SILVER} stroke={STROKE} />
      {/* inflatable blob chair */}
      <path d="M150 112 Q140 112 140 100 Q140 88 158 88 Q176 88 176 100 Q176 112 166 112 Z" fill={Y_PINK} opacity="0.35" stroke={STROKE} />
      <path d="M146 100 Q158 96 170 100" fill="none" stroke={STROKE} strokeOpacity="0.5" />
      {/* lava lamp with glow */}
      <circle cx="220" cy="86" r="12" fill={Y_PINK} opacity="0.18" />
      <path d="M214 108 L226 108 L222 78 L218 78 Z" fill="#ffe0f4" stroke={STROKE} />
      <ellipse cx="220" cy="90" rx="3" ry="5" fill={Y_PINK} opacity="0.85" />
      <ellipse cx="221" cy="98" rx="2.5" ry="3.5" fill={Y_PURPLE} opacity="0.75" />
      <rect x="214" y="108" width="12" height="4" rx="1" fill={Y_SILVER} />
    </Frame>
  );
}

function Retro() {
  const R_ORANGE = "#e08a2e";
  const R_RUST = "#a8471f";
  const R_AVO = "#6b7f3a";
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    return {
      x1: 170 + Math.cos(a) * 14,
      y1: 44 + Math.sin(a) * 14,
      x2: 170 + Math.cos(a) * 22,
      y2: 44 + Math.sin(a) * 22,
      i,
    };
  });
  return (
    <Frame id="retro">
      {/* sunburst mirror */}
      <g stroke={R_ORANGE} strokeWidth="1.5">
        {rays.map((r) => (
          <line key={r.i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
        ))}
      </g>
      <circle cx="170" cy="44" r="12" fill="#f2ddb5" stroke={R_RUST} strokeWidth="1.5" />
      {/* bed with wavy stripe blanket */}
      <rect x="18" y="86" width="98" height="26" rx="4" fill={R_ORANGE} opacity="0.3" stroke={STROKE} />
      <path d="M18 96 Q33 92 48 96 T78 96 T108 96" fill="none" stroke={R_RUST} strokeOpacity="0.6" />
      <path d="M18 103 Q33 99 48 103 T78 103 T108 103" fill="none" stroke={R_AVO} strokeOpacity="0.55" />
      <rect x="24" y="77" width="22" height="11" rx="3" fill="#f2ddb5" stroke={STROKE} />
      {/* mushroom lamp */}
      <circle cx="150" cy="98" r="12" fill={R_ORANGE} opacity="0.2" />
      <path d="M138 96 Q150 82 162 96 Z" fill={R_RUST} opacity="0.85" stroke={STROKE} strokeWidth="0.75" />
      <path d="M146 96 L154 96 L152 110 L148 110 Z" fill="#f2ddb5" stroke={STROKE} />
      {/* record on wall */}
      <circle cx="216" cy="54" r="15" fill={R_RUST} opacity="0.75" stroke={STROKE} />
      <circle cx="216" cy="54" r="4" fill="#f2ddb5" />
      {/* shag rug */}
      <ellipse cx="86" cy="122" rx="46" ry="6" fill="none" stroke={R_ORANGE} strokeOpacity="0.6" strokeDasharray="3 3" />
    </Frame>
  );
}

function Pastel() {
  const P_PINK = "#ffb3d9";
  const P_LAV = "#c8b6ff";
  const P_BLUE = "#bde0fe";
  return (
    <Frame id="pastel">
      {/* rainbow arc */}
      <path d="M150 66 A26 26 0 0 1 202 66" fill="none" stroke={P_PINK} strokeWidth="4" />
      <path d="M156 66 A20 20 0 0 1 196 66" fill="none" stroke={P_LAV} strokeWidth="4" />
      <path d="M162 66 A14 14 0 0 1 190 66" fill="none" stroke={P_BLUE} strokeWidth="4" />
      {/* cloud */}
      <path d="M40 40 q-8 0 -8 7 q0 7 8 7 h22 q8 0 8 -7 q0 -8 -9 -7 q-2 -7 -12 -3 q-4 -1 -7 3 z" fill="#ffffff" opacity="0.85" stroke={STROKE} strokeWidth="0.75" />
      {/* bed with plush pastel bedding */}
      <rect x="18" y="86" width="98" height="26" rx="6" fill="#ffd9ec" stroke={STROKE} />
      <path d="M18 98 Q33 94 48 98 T78 98 T108 98" fill="none" stroke={P_LAV} strokeOpacity="0.6" />
      {/* heart pillow */}
      <path d="M34 80 q-4 -5 -8 -1 q-3 3 0 6 l8 7 l8 -7 q3 -3 0 -6 q-4 -4 -8 1 z" fill={P_PINK} stroke={STROKE} strokeWidth="0.75" />
      {/* fluffy round rug */}
      <circle cx="150" cy="120" r="16" fill={P_BLUE} opacity="0.4" stroke={P_BLUE} strokeDasharray="2 2" />
      {/* plush bear blob */}
      <circle cx="212" cy="98" r="12" fill={P_LAV} opacity="0.5" stroke={STROKE} strokeWidth="0.75" />
      <circle cx="206" cy="88" r="4" fill={P_LAV} opacity="0.6" stroke={STROKE} strokeWidth="0.5" />
      <circle cx="218" cy="88" r="4" fill={P_LAV} opacity="0.6" stroke={STROKE} strokeWidth="0.5" />
      <circle cx="208" cy="97" r="1.3" fill={INK} />
      <circle cx="216" cy="97" r="1.3" fill={INK} />
    </Frame>
  );
}

const SCENES: Record<StyleId, () => React.ReactNode> = {
  minimalist: Minimalist,
  cozy: Cozy,
  gamer: Gamer,
  boho: Boho,
  preppy: Preppy,
  team_spirit: TeamSpirit,
  academia: Academia,
  y2k: Y2K,
  retro: Retro,
  pastel: Pastel,
};

export default function StyleScene({
  id,
  className,
}: {
  id: StyleId;
  className?: string;
}) {
  const Scene = SCENES[id];
  return (
    <svg
      viewBox="0 0 256 144"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <Scene />
    </svg>
  );
}
