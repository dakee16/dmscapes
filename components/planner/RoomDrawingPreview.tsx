"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useExperienceMotion } from "@/components/experience/MotionProvider";

const DURATION = 12;
const WALL = "M90 325V85H465V245H365V325Z";
const CORNERS = [[90, 325], [90, 85], [465, 85], [465, 245], [365, 245], [365, 325], [90, 325]];
// The pencil follows the same distances as the stroke being revealed.
const DISTANCES = [0, 240, 615, 775, 875, 955, 1230];
const PENCIL_TIMES = [0, ...DISTANCES.map(distance => .04 + .38 * distance / 1230), .46, 1];
const PENCIL_POINTS = [CORNERS[0], ...CORNERS, CORNERS[6], CORNERS[6]];

export default function RoomDrawingPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: .15 });
  const { paused } = useExperienceMotion();
  const [replay, setReplay] = useState(0);
  const active = inView && !paused;
  const cycle = { duration: DURATION, repeat: Infinity, ease: "linear" as const };

  function reveal(start: number) {
    return {
      initial: false as const,
      animate: active ? { opacity: [0, 0, 1, 1, 0], y: [12, 12, 0, 0, 12] } : { opacity: 1, y: 0 },
      transition: active ? { ...cycle, times: [0, start, start + .07, .9, 1] } : { duration: 0 },
    };
  }

  return <div ref={ref} className="dm-drawing-preview">
    <div className="dm-drawing-top"><span className="dm-eyebrow">From a blank page to your place</span><button type="button" onClick={() => setReplay(value => value + 1)} disabled={paused} aria-label="Replay the room drawing animation"><span aria-hidden="true">↻</span> Replay</button></div>
    <svg key={replay} viewBox="0 0 560 420" className="dm-drawing-scene" role="img" aria-label="An animated room drawing: a pencil traces an L-shaped room, adds a door and windows, then places a bed, desk, storage, and rug.">
      <path d={WALL} fill="white" stroke="#d5dcee" strokeWidth="1" strokeDasharray="4 6" />
      <motion.g {...reveal(.34)} stroke="#8997bf" fill="none" strokeWidth="1">
        <path d="M90 55H465M90 48V62M465 48V62M60 85V325M53 85H67M53 325H67" />
        <rect x="212" y="43" width="130" height="24" fill="#eef0f9" stroke="none" />
        <text x="277" y="59" textAnchor="middle" fill="#4c4f63" stroke="none">YOUR LENGTH</text>
        <text x="42" y="210" textAnchor="middle" transform="rotate(-90 42 210)" fill="#4c4f63" stroke="none">YOUR WIDTH</text>
      </motion.g>
      <motion.path d={WALL} fill="none" stroke="#2b4eff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={active ? { pathLength: [0, 0, 1, 1, 0] } : { pathLength: 1 }} transition={active ? { ...cycle, times: [0, .04, .42, .9, 1] } : { duration: 0 }} />
      <motion.g {...reveal(.43)}>
        <path d="M143 325H198" stroke="white" strokeWidth="7" />
        <path d="M143 325V270A55 55 0 0 1 198 325" fill="none" stroke="#2b4eff" strokeWidth="1.5" />
        <path d="M290 85H412" stroke="#eef0f9" strokeWidth="8" />
        <path d="M290 81H412M290 89H412M290 81V89M351 81V89M412 81V89" fill="none" stroke="#2b4eff" strokeWidth="2" />
        <rect x="403" y="174" width="43" height="51" fill="#f8efcd" stroke="#a99c75" />
        <path d="M407 178L442 221M442 178L407 221" stroke="#a99c75" strokeWidth="1" />
      </motion.g>
      <motion.g {...reveal(.53)}>
        <rect x="112" y="107" width="94" height="181" rx="4" fill="#dcc6a3" stroke="#a48c65" />
        <rect x="117" y="113" width="84" height="167" rx="6" fill="#f8f7f1" />
        <rect x="119" y="150" width="80" height="125" rx="4" fill="#2b4eff" />
        <rect x="128" y="121" width="61" height="27" rx="7" fill="white" stroke="#d8ddec" />
        <path d="M119 170H199" stroke="#8398ff" strokeWidth="2" />
      </motion.g>
      <motion.g {...reveal(.59)}>
        <rect x="277" y="108" width="163" height="53" rx="3" fill="#e6d5b7" stroke="#a48c65" />
        <rect x="326" y="118" width="54" height="30" rx="2" fill="#17172b" />
        <rect x="330" y="121" width="46" height="24" fill="#788bed" />
        <rect x="327" y="172" width="46" height="41" rx="10" fill="#2b4eff" stroke="#1e3ad6" />
        <path d="M333 202H367" stroke="#b5c3ff" strokeWidth="2" />
        <circle cx="423" cy="124" r="9" fill="#ffd84d" stroke="#baa34c" />
      </motion.g>
      <motion.g {...reveal(.65)}>
        <rect x="223" y="109" width="34" height="97" rx="2" fill="#e6d5b7" stroke="#a48c65" />
        <path d="M223 135H257M223 162H257M223 188H257" stroke="#a48c65" />
        <path d="M230 116V130M237 116V130M244 116V130M251 116V130" stroke="#2b4eff" strokeWidth="4" />
        <ellipse cx="289" cy="263" rx="61" ry="38" fill="#f3ead6" stroke="#bcac8e" />
        <ellipse cx="289" cy="263" rx="52" ry="30" fill="none" stroke="#d6c8ae" strokeDasharray="2 4" />
        <circle cx="424" cy="148" r="7" fill="#5b7960" />
        <circle cx="426" cy="146" r="4" fill="#81a078" />
      </motion.g>
      <motion.g {...reveal(.73)}>
        <circle cx="453" cy="323" r="19" fill="#ffd84d" />
        <path d="M444 323L450 329L463 316" fill="none" stroke="#17172b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="279" y="376" textAnchor="middle" fill="#4c4f63">YOUR ROOM. YOUR RULES.</text>
      </motion.g>
      {active && <motion.g animate={{ x: PENCIL_POINTS.map(point => point[0]), y: PENCIL_POINTS.map(point => point[1]), opacity: [0, 1, 1, 1, 1, 1, 1, 1, 0, 0] }} transition={{ ...cycle, times: PENCIL_TIMES }}>
        <circle r="10" fill="#2b4eff" opacity=".12" />
        <g transform="rotate(32)"><path d="M0 0L-5-12V-39H5V-12Z" fill="#ffd84d" stroke="#17172b" strokeWidth="1.2" /><path d="M-5-32H5M-5-12H5" stroke="#17172b" strokeWidth="1.2" /><path d="M0 0L-2-6H2Z" fill="#17172b" /></g>
      </motion.g>}
    </svg>
    <ol className="dm-drawing-steps" aria-label="Drawing steps">
      {["Trace the walls", "Add openings", "Make room"].map((label, index) => <li key={label}><span>{String(index + 1).padStart(2, "0")}</span>{label}</li>)}
    </ol>
    <div className="dm-drawing-progress" aria-hidden="true"><motion.div key={replay} initial={false} animate={active ? { scaleX: [0, 1, 1, 0] } : { scaleX: 1 }} transition={active ? { ...cycle, times: [0, .8, .9, 1] } : { duration: 0 }} /></div>
  </div>;
}
