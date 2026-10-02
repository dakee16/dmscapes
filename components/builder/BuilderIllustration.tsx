import s from "./Builder.module.css";

/**
 * Small plans for the 3D Room Builder page (design-handoff designs/site/Builder):
 * the three steps drawn on a dark grid, and the four room shapes the builder
 * supports. Decorative; the copy beside them says the same thing.
 */
export type BuilderFigureKind = "shape" | "details" | "furnish" | "rectangle" | "l" | "alcove" | "angled";

export default function BuilderIllustration({ kind }: { kind: BuilderFigureKind }) {
  if (kind === "shape" || kind === "details" || kind === "furnish") {
    return (
      <figure className={s.figure} aria-hidden="true">
        <svg viewBox="0 0 260 170" fill="none">
          {kind === "shape" && <>
            <path d="M20 20H200V90H240V150H20Z" stroke="#8FB2FF" strokeWidth="4" strokeLinejoin="round" />
            {[[20, 20], [200, 20], [200, 90], [240, 150], [20, 150]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="7" fill="#FFFFFF" />)}
            <circle className={s.figPulse} cx="240" cy="90" r="11" fill="#FFB866" />
          </>}
          {kind === "details" && <>
            <path d="M20 20H240V150H150M100 150H20Z" stroke="#F4F3EE" strokeWidth="5" />
            <path d="M100 150V100A50 50 0 0 1 150 150" stroke="#8FB2FF" strokeWidth="2.5" strokeDasharray="6 5" />
            <path d="M90 20H170" stroke="#8FB2FF" strokeWidth="9" />
            <path d="M90 20H170" stroke="#0A102C" strokeWidth="3" />
            <rect x="170" y="110" width="66" height="36" fill="rgba(255,184,102,0.18)" stroke="#FFB866" strokeWidth="2.5" />
          </>}
          {kind === "furnish" && <>
            <path d="M20 20H240V150H20Z" stroke="#F4F3EE" strokeWidth="5" />
            <rect x="26" y="26" width="40" height="80" rx="3" fill="#E6C29A" />
            <rect x="26" y="84" width="40" height="22" fill="#B5562F" />
            <rect x="92" y="60" width="90" height="62" rx="3" fill="#E3CFAE" />
            <rect x="196" y="26" width="38" height="40" fill="#8FB2FF" />
            <circle cx="214" cy="120" r="12" fill="#FFB866" />
          </>}
        </svg>
      </figure>
    );
  }
  const path = {
    rectangle: "M10 10H160V110H10Z",
    l: "M10 10H110V60H160V110H10Z",
    alcove: "M10 10H160V110H115V85H55V110H10Z",
    angled: "M10 10H120L160 50V110H10Z",
  }[kind];
  return (
    <svg className={s.shapeArt} viewBox="0 0 170 120" fill="none" aria-hidden="true">
      <path d={path} stroke="#8FB2FF" strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}
