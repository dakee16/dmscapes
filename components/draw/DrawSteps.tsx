import css from "./DrawPage.module.css";

/** The three drawing steps on the /plan/draw landing, each with a small plan on paper. */
const STEPS = [
  {
    n: "01",
    title: "Trace the walls",
    text: "Tap to place corners and trace your walls. You can adjust the walls and add details as you go.",
    art: (
      <>
        <path d="M20 150V20H200V90" stroke="#16161D" strokeWidth="6" strokeLinecap="square" />
        <path d="M200 90H240" stroke="#2449FF" strokeWidth="4" strokeDasharray="9 6" />
        <path d="M240 90V150H20" stroke="rgba(22,22,29,0.22)" strokeWidth="3" strokeDasharray="8 6" />
        <circle cx="20" cy="150" r="15" fill="rgba(255,216,61,0.55)" />
        <circle cx="20" cy="150" r="7.5" fill="#fff" stroke="#16161D" strokeWidth="3" />
        <circle cx="20" cy="20" r="6" fill="#fff" stroke="#16161D" strokeWidth="3" />
        <circle cx="200" cy="20" r="6" fill="#fff" stroke="#16161D" strokeWidth="3" />
        <circle cx="200" cy="90" r="6" fill="#fff" stroke="#16161D" strokeWidth="3" />
        <circle cx="240" cy="90" r="9" fill="#2449FF" stroke="#fff" strokeWidth="3" />
      </>
    ),
  },
  {
    n: "02",
    title: "Add openings",
    text: "Tap a wall where your door goes, add your windows, and tap inside your room to add a closet.",
    art: (
      <>
        <path d="M20 20H240V150H150M100 150H20Z" stroke="#16161D" strokeWidth="6" strokeLinecap="square" />
        <path d="M100 150V100" stroke="#16161D" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M100 100A50 50 0 0 1 150 150" stroke="rgba(22,22,29,0.45)" strokeWidth="1.5" strokeDasharray="5 4" />
        <path d="M90 20H170" stroke="#fff" strokeWidth="8" />
        <path d="M90 17.5H170M90 22.5H170" stroke="#2449FF" strokeWidth="1.5" />
        <rect x="170" y="108" width="64" height="36" fill="rgba(36,73,255,0.08)" stroke="#2449FF" strokeWidth="1.5" />
        <path d="M178 144L206 108M192 144L220 108M206 144L234 112" stroke="rgba(36,73,255,0.3)" strokeWidth="2" />
      </>
    ),
  },
  {
    n: "03",
    title: "Make room",
    text: "Choose a vibe. We’ll create a layout based on your room, ready to rearrange.",
    art: (
      <>
        <path d="M20 20H240V150H20Z" stroke="#16161D" strokeWidth="6" strokeLinecap="square" />
        <rect x="27" y="27" width="44" height="84" rx="3" fill="#EEF1FD" stroke="#2449FF" strokeWidth="1.5" />
        <rect x="33" y="33" width="32" height="14" rx="4" fill="#fff" stroke="#2449FF" strokeWidth="1.5" />
        <rect x="100" y="60" width="86" height="56" fill="rgba(36,73,255,0.05)" stroke="rgba(36,73,255,0.45)" strokeWidth="1.5" strokeDasharray="4 4" />
        <rect x="190" y="27" width="43" height="38" fill="#EEF1FD" stroke="#2449FF" strokeWidth="1.5" />
        <rect x="194" y="74" width="26" height="24" rx="7" fill="#fff" stroke="#2449FF" strokeWidth="1.5" />
        <circle cx="216" cy="128" r="11" fill="#FFD83D" stroke="#16161D" strokeWidth="1.5" />
      </>
    ),
  },
];

export default function DrawSteps() {
  return (
    <ol className={css.steps} data-stagger="">
      {STEPS.map((step, i) => (
        <li key={step.n} className={css.step} data-reveal="" style={{ "--i": i } as React.CSSProperties}>
          <span className={css.stepNum}>{step.n}</span>
          <h3 className={css.stepTitle}>{step.title}</h3>
          <p className={css.stepText}>{step.text}</p>
          <svg className={css.stepArt} viewBox="0 0 260 170" fill="none" aria-hidden="true">{step.art}</svg>
        </li>
      ))}
    </ol>
  );
}
