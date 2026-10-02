"use client";

import { useId, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useExperienceMotion } from "@/components/experience/MotionProvider";
import { SwingIcon } from "@/components/draw/DrawIcons";
import css from "@/components/draw/DrawPreview.module.css";

/* An example room traced on plan paper, 24 units per foot (six-inch grid =
   12 units): an L-shaped single, 15′6″ by 10′0″ with a 4′ by 3′6″ notch. */
const DURATION = 12;
const WALL = "M90 325V85H462V241H366V325Z";
const CORNERS = [[90, 325], [90, 85], [462, 85], [462, 241], [366, 241], [366, 325], [90, 325]];
// The live corner follows the same distances as the stroke being revealed.
const DISTANCES = [0, 240, 612, 768, 864, 948, 1224];
const TOTAL = 1224;
const PEN_TIMES = [0, ...DISTANCES.map(distance => .04 + .38 * distance / TOTAL), .46, 1];
const PEN_POINTS = [CORNERS[0], ...CORNERS, CORNERS[6], CORNERS[6]];
// One label per wall, just outside it, shown as that wall is finished.
const LABELS: { x: number; y: number; text: string }[] = [
  { x: 56, y: 205, text: "10′ 0″" },
  { x: 276, y: 60, text: "15′ 6″" },
  { x: 496, y: 163, text: "6′ 6″" },
  { x: 414, y: 263, text: "4′ 0″" },
  { x: 398, y: 304, text: "3′ 6″" },
  { x: 228, y: 350, text: "11′ 6″" },
];

export default function RoomDrawingPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const inView = useInView(ref, { amount: .15 });
  const { paused } = useExperienceMotion();
  const [replay, setReplay] = useState(0);
  const active = inView && !paused;
  const cycle = { duration: DURATION, repeat: Infinity, ease: "linear" as const };

  function reveal(start: number) {
    return {
      initial: false as const,
      animate: active ? { opacity: [0, 0, 1, 1, 0], y: [8, 8, 0, 0, 8] } : { opacity: 1, y: 0 },
      transition: active ? { ...cycle, times: [0, start, start + .05, .9, 1] } : { duration: 0 },
    };
  }

  return <div ref={ref} className={css.card}>
    <div className={css.top}>
      <span className={css.eyebrow}>From a blank page to your place</span>
      <button type="button" className={css.replay} onClick={() => setReplay(value => value + 1)} disabled={paused} aria-label="Replay the room drawing animation"><SwingIcon size={15} /> Replay</button>
    </div>
    <svg key={replay} viewBox="0 0 560 400" className={css.scene} role="img" aria-label="An animated room drawing on a six-inch grid: an L-shaped room is traced wall by wall with each length labelled in feet and inches, then a door, a window, a closet, a bed, a desk and a dresser are added.">
      <defs>
        <pattern id={`g6-${uid}`} width="12" height="12" patternUnits="userSpaceOnUse" x="90" y="85"><path d="M12 0H0V12" fill="none" stroke="rgba(36,73,255,0.06)" /></pattern>
        <pattern id={`g12-${uid}`} width="24" height="24" patternUnits="userSpaceOnUse" x="90" y="85"><path d="M24 0H0V24" fill="none" stroke="rgba(36,73,255,0.14)" /></pattern>
        <pattern id={`hatch-${uid}`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#fff" /><path d="M0 0V9" stroke="rgba(36,73,255,0.16)" strokeWidth="3.5" /></pattern>
      </defs>
      <rect width="560" height="400" fill={`url(#g6-${uid})`} />
      <rect width="560" height="400" fill={`url(#g12-${uid})`} />
      <path d={WALL} fill="none" stroke="rgba(22,22,29,0.22)" strokeWidth="3" strokeDasharray="9 7" />

      {/* furniture and fixtures, in the planner's plan style */}
      <motion.g {...reveal(.5)} fontFamily="var(--ds-mono)" fontSize="9" fontWeight="700" letterSpacing=".08em" fill="#2449FF">
        <rect x="96" y="91" width="78" height="158" rx="3" fill="#EEF1FD" stroke="#2449FF" strokeWidth="1.5" />
        <rect x="104" y="99" width="62" height="24" rx="6" fill="#fff" stroke="#2449FF" strokeWidth="1.5" />
        <text x="135" y="190" textAnchor="middle">BED</text>
      </motion.g>
      <motion.g {...reveal(.56)} fontFamily="var(--ds-mono)" fontSize="9" fontWeight="700" letterSpacing=".08em" fill="#2449FF">
        <rect x="290" y="91" width="96" height="46" fill="#EEF1FD" stroke="#2449FF" strokeWidth="1.5" />
        <text x="338" y="118" textAnchor="middle">DESK</text>
        <rect x="320" y="146" width="36" height="34" rx="9" fill="#fff" stroke="#2449FF" strokeWidth="1.5" />
        <rect x="408" y="140" width="48" height="92" fill="#EEF1FD" stroke="#2449FF" strokeWidth="1.5" />
        <text x="432" y="190" textAnchor="middle" fontSize="8">DRESSER</text>
      </motion.g>
      <motion.g {...reveal(.62)}>
        <rect x="200" y="170" width="100" height="66" fill="rgba(36,73,255,0.05)" stroke="rgba(36,73,255,0.45)" strokeWidth="1.5" strokeDasharray="4 4" />
      </motion.g>

      {/* the walls being traced */}
      <motion.path d={WALL} fill="none" stroke="#16161D" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" initial={false} animate={active ? { pathLength: [0, 0, 1, 1, 0] } : { pathLength: 1 }} transition={active ? { ...cycle, times: [0, .04, .42, .9, 1] } : { duration: 0 }} />

      <motion.g {...reveal(.44)}>
        {/* door: gap, leaf and dashed swing */}
        <path d="M130 325H202" stroke="#fff" strokeWidth="8" />
        <path d="M130 325V253" stroke="#16161D" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M130 253A72 72 0 0 1 202 325" fill="none" stroke="rgba(22,22,29,0.45)" strokeWidth="1.5" strokeDasharray="5 4" />
        {/* window: gap with a double blue line */}
        <path d="M290 85H386" stroke="#fff" strokeWidth="8" />
        <path d="M290 82.5H386M290 87.5H386M290 82.5V87.5M386 82.5V87.5" fill="none" stroke="#2449FF" strokeWidth="1.5" />
        {/* closet */}
        <rect x="300" y="274" width="60" height="47" fill={`url(#hatch-${uid})`} stroke="#2449FF" strokeWidth="1.5" />
        <text x="330" y="301" textAnchor="middle" fontFamily="var(--ds-mono)" fontSize="8" fontWeight="700" letterSpacing=".08em" fill="#2449FF">CLOSET</text>
      </motion.g>

      {/* feet-and-inch labels, one per finished wall */}
      {LABELS.map((label, i) => {
        const w = label.text.length > 5 ? 56 : 48;
        return <motion.g key={label.text + i} {...reveal(.04 + .38 * DISTANCES[i + 1] / TOTAL)}>
          <rect x={label.x - w / 2} y={label.y - 12} width={w} height="24" rx="5" fill="#16161D" />
          <text x={label.x} y={label.y + 5} textAnchor="middle" fontFamily="var(--ds-sans)" fontSize="13" fontWeight="800" fill="#fff">{label.text}</text>
        </motion.g>;
      })}

      <motion.text {...reveal(.7)} x="280" y="388" textAnchor="middle" fontFamily="var(--ds-mono)" fontSize="10" fontWeight="700" letterSpacing=".12em" fill="#55555F">YOUR ROOM. YOUR RULES.</motion.text>

      {/* the first corner, and the live corner that does the drawing */}
      <circle cx="90" cy="325" r="16" fill="rgba(255,216,61,0.55)" />
      <circle cx="90" cy="325" r="8" fill="#fff" stroke="#16161D" strokeWidth="3" />
      {active && <motion.g animate={{ x: PEN_POINTS.map(point => point[0]), y: PEN_POINTS.map(point => point[1]), opacity: [0, 1, 1, 1, 1, 1, 1, 1, 0, 0] }} transition={{ ...cycle, times: PEN_TIMES }}>
        <circle r="11" fill="#2449FF" stroke="#fff" strokeWidth="4" />
      </motion.g>}
    </svg>
    <ol className={css.steps} aria-label="Drawing steps">
      {["Trace the walls", "Add openings", "Make room"].map((label, index) => <li key={label}><span>{String(index + 1).padStart(2, "0")}</span>{label}</li>)}
    </ol>
    <div className={css.progress} aria-hidden="true"><motion.div key={replay} initial={false} animate={active ? { scaleX: [0, 1, 1, 0] } : { scaleX: 1 }} transition={active ? { ...cycle, times: [0, .8, .9, 1] } : { duration: 0 }} /></div>
  </div>;
}
