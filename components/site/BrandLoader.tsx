import s from "./BrandLoader.module.css";

/** Lightweight floor-plan animation shared by route and studio loading states. */
export default function BrandLoader({label="Making room for your ideas…",className=""}:{label?:string;className?:string}) {
  return <div className={s.loader+" "+className} role="status" aria-live="polite" aria-label={label || "Loading Dormscape"}>
    <div className={s.drawing} aria-hidden="true">
      <svg viewBox="0 0 240 170" fill="none">
        <path d="M20 30H220M20 60H220M20 90H220M20 120H220M30 20V150M60 20V150M90 20V150M120 20V150M150 20V150M180 20V150M210 20V150" stroke="currentColor" opacity=".08"/>
        <path className={s.wall} pathLength="1" d="M107 140H42V30H198V140H141" stroke="currentColor" strokeWidth="3" strokeLinecap="square"/>
        <g className={s.bed}><rect x="54" y="43" width="43" height="76" rx="2" fill="#dfe5ff" stroke="currentColor" strokeWidth="1.5"/><path d="M54 68H97M61 51H90V62H61Z" stroke="currentColor"/></g>
        <g className={s.desk}><rect x="133" y="43" width="51" height="24" rx="2" fill="#ffd84d" stroke="currentColor" strokeWidth="1.5"/><rect x="149" y="75" width="20" height="17" rx="3" stroke="currentColor" strokeWidth="1.5"/></g>
        <g className={s.rug}><rect x="113" y="103" width="68" height="25" rx="1" fill="#2b4eff" opacity=".1"/><path d="M118 106V125M125 106V125M132 106V125M139 106V125M146 106V125M153 106V125M160 106V125M167 106V125M174 106V125" stroke="currentColor" opacity=".3"/></g>
        <path className={s.door} pathLength="1" d="M107 140V106C126 106 141 121 141 140" stroke="currentColor" strokeWidth="1.5"/>
        <g className={s.cursor}><path d="M0 0L3 21L9 15L16 24L21 20L14 12L23 9Z" fill="#17172b" stroke="#fafaf8" strokeWidth="2"/></g>
      </svg>
    </div>
    <span className={s.wordmark} aria-hidden="true">dormscape<span>.</span></span>
    {label&&<span className={s.caption} aria-hidden="true">{label}</span>}
    <div className={s.track} aria-hidden="true"><i/></div>
  </div>;
}
