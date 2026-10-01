import PostCover from "./PostCover";
import css from "./Post.module.css";

const INK = "#16161D";
const BLUE = "#2449FF";
const MAGENTA = "#C0186F";

/** A strip of tape-measure blade, drawn on its own centre line. */
function Blade({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y + 5} width={w} height={h} fill="#C99A06" />
      <rect x={x} y={y} width={w} height={h} fill="#F3C21A" />
      {Array.from({ length: Math.floor(w / 10) }, (_, i) => (
        <rect key={`s${i}`} x={x + i * 10} y={y} width={1.5} height={12} fill="rgba(22,22,29,0.6)" />
      ))}
      {Array.from({ length: Math.floor(w / 50) }, (_, i) => (
        <rect key={`b${i}`} x={x + i * 50} y={y} width={2.5} height={22} fill={INK} />
      ))}
      <rect x={x - 8} y={y - 6} width={14} height={h + 12} rx="3" fill="#9C9AA8" />
    </g>
  );
}

/** The measuring guide's hero: a room sketched on graph paper on move-in day. */
function MeasureSketch() {
  return (
    <svg className={css.sketch} viewBox="0 0 540 550" focusable="false" aria-hidden="true">
      <defs>
        <pattern id="post-sketch-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="rgba(36,73,255,0.1)" strokeWidth="1" />
        </pattern>
      </defs>
      <g transform="rotate(2.2 260 250)" className={css.sketchSheet}>
        <rect x="20" y="20" width="480" height="460" fill="#fff" />
        <rect x="20" y="20" width="480" height="460" fill="url(#post-sketch-grid)" />
        <g transform="translate(20 20)">
          {/* dimension lines */}
          <rect x="50" y="60" width="300" height="2" fill={BLUE} />
          <rect x="50" y="52" width="2" height="18" fill={BLUE} />
          <rect x="348" y="52" width="2" height="18" fill={BLUE} />
          <rect x="150" y="44" width="96" height="34" fill="#fff" />
          <text x="198" y="71" textAnchor="middle" className={css.sketchDim}>
            11′ 6″
          </text>
          <rect x="376" y="90" width="2" height="260" fill={BLUE} />
          <rect x="368" y="90" width="18" height="2" fill={BLUE} />
          <rect x="368" y="348" width="18" height="2" fill={BLUE} />
          <text x="388" y="229" className={css.sketchDim}>
            13′ 2″
          </text>
          {/* walls, window, radiator */}
          <rect x="53" y="93" width="294" height="254" fill="none" stroke={INK} strokeWidth="6" />
          <rect x="131" y="86" width="108" height="14" fill="#DCE1F5" stroke={INK} strokeWidth="2" />
          <g opacity="0.55">
            {Array.from({ length: 13 }, (_, i) => (
              <rect key={i} x={136 + i * 8} y="104" width="2" height="16" fill={INK} />
            ))}
          </g>
          <text x="150" y="141" className={css.sketchNote} fill={MAGENTA}>
            radiator
          </text>
          {/* door */}
          <rect x="56" y="343" width="64" height="8" fill="#fff" />
          <path d="M56 282A64 64 0 0 1 120 346" fill="none" stroke={BLUE} strokeWidth="2" strokeDasharray="6 4" />
          <rect x="56" y="282" width="3" height="64" fill={INK} />
          {/* outlet */}
          <rect x="338" y="236" width="12" height="18" rx="3" fill={INK} />
          <text x="244" y="268" className={css.sketchNote} style={{ fontSize: 20 }} fill={MAGENTA}>
            outlet!
          </text>
          <path d="M310 262h18m-6-6 6 6-6 6" fill="none" stroke={MAGENTA} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="150" y="196" className={css.sketchNote} style={{ fontSize: 20 }} fill="#55555F">
            ceiling 8′ 9″?
          </text>
          <text x="60" y="401" className={css.sketchCaption}>
            ROOM 214 · SKETCHED ON MOVE-IN DAY
          </text>
        </g>
        {/* painter's tape corners */}
        <rect x="-6" y="30" width="116" height="30" fill="rgba(79,143,224,0.82)" transform="rotate(-34 52 45)" />
        <rect x="410" y="30" width="116" height="30" fill="rgba(79,143,224,0.82)" transform="rotate(34 468 45)" />
      </g>
      <g transform="rotate(-3 132 480)" className={css.sketchTape}>
        <Blade x={-168} y={460} w={600} h={40} />
      </g>
      <g transform="rotate(-3 458 474)" className={css.sketchCase}>
        <rect x="394" y="410" width="128" height="128" rx="34" fill={INK} />
        <circle cx="458" cy="474" r="40" fill="#FFD83D" />
        <circle cx="458" cy="474" r="20" fill={INK} />
        <circle cx="458" cy="474" r="6" fill={BLUE} />
      </g>
    </svg>
  );
}

/** Right-hand hero art for a post: a drawn scene, or the post's cover taped to the page. */
export default function PostHeroArt({ slug }: { slug: string }) {
  if (slug === "how-to-measure-your-dorm-room") return <MeasureSketch />;
  return (
    <div className={css.heroSheet}>
      <PostCover slug={slug} />
    </div>
  );
}
