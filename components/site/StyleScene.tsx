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
};

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

const SCENES: Record<StyleId, () => React.ReactNode> = {
  minimalist: Minimalist,
  cozy: Cozy,
  gamer: Gamer,
  boho: Boho,
  preppy: Preppy,
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
