import s from "./BrandLoader.module.css";

/**
 * The loading mark shared by route and studio loading states: a tape measure
 * pulls out across a sheet of plan paper while the room draws itself (walls,
 * then the door, then the furniture drops in), over the wordmark with its
 * hopping dot. Static in reduced motion and when motion is paused.
 */
export default function BrandLoader({label="Loading…",className=""}:{label?:string;className?:string}) {
  return <div className={s.loader+" "+className} role="status" aria-live="polite" aria-label={label || "Loading Dormscape"}>
    <div className={s.sheet} aria-hidden="true">
      <span className={s.tape}><i/></span>
      <svg viewBox="0 0 240 150" fill="none">
        <path className={s.wall} pathLength="1" d="M112 132H30V24h180v108h-62" stroke="var(--ds-ink, #16161d)" strokeWidth="5" strokeLinecap="square"/>
        <path d="M86 24h44" stroke="#fbfaf6" strokeWidth="5"/>
        <path className={s.window} d="M86 21.5h44M86 26.5h44" stroke="var(--ds-ink, #16161d)" strokeWidth="1.2"/>
        <path className={s.door} pathLength="1" d="M112 132V96a36 36 0 0 1 36 36" stroke="var(--ds-blue, #2449ff)" strokeWidth="1.6" strokeDasharray="0.03 0.025"/>
        <g className={s.bed}><rect x="40" y="34" width="44" height="74" rx="3" fill="#dce1f5" stroke="var(--ds-ink, #16161d)" strokeWidth="1.6"/><path d="M40 52h44M47 39h30v9H47z" stroke="var(--ds-ink, #16161d)" strokeWidth="1.3"/></g>
        <g className={s.desk}><rect x="146" y="34" width="54" height="22" rx="2" fill="var(--ds-yellow, #ffd83d)" stroke="var(--ds-ink, #16161d)" strokeWidth="1.6"/><rect x="163" y="62" width="20" height="16" rx="4" fill="#fff" stroke="var(--ds-ink, #16161d)" strokeWidth="1.6"/></g>
        <g className={s.rug}><rect x="110" y="70" width="58" height="34" rx="2" fill="rgba(255,79,168,0.2)"/><path d="M117 70v34M125 70v34M133 70v34M141 70v34M149 70v34M157 70v34M165 70v34" stroke="rgba(255,79,168,0.55)" strokeWidth="2.2"/></g>
      </svg>
    </div>
    <span className={s.wordmark} aria-hidden="true">dormscape<i/></span>
    {label&&<span className={s.caption} aria-hidden="true">{label}</span>}
  </div>;
}
