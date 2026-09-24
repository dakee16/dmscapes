"use client";
import BrandMark from "@/components/site/BrandMark";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { motion, useInView, useTransform, type MotionValue } from "framer-motion";
import { useExperienceMotion } from "./MotionProvider";
import styles from "./StudioMotion.module.css";
import { styleById } from "@/lib/styles";
import type { StyleId } from "@/lib/types";

function MotionFrame({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "80px" });
  const { paused } = useExperienceMotion();
  return <div ref={ref} className={`${styles.frame} ${className}`} style={style} data-running={inView && !paused} aria-hidden="true">{children}</div>;
}

/** Scroll draws the plan, then places the furnishings and shopping notes. */
export function PlanningBlueprint({ progress }: { progress: MotionValue<number> }) {
  const { paused } = useExperienceMotion();
  const walls = useTransform(progress, [0, 0.4], [0.12, 1]);
  const pieces = useTransform(progress, [0.25, 0.64], [0, 1]);
  const lift = useTransform(progress, [0.25, 0.64], [24, 0]);
  const receipt = useTransform(progress, [0.6, 0.95], [0, 1]);
  return <MotionFrame className={styles.blueprint}>
    <div className={styles.planLegend}><span>PLAN / 001</span><span>15′6″ × 12′0″</span></div>
    <svg viewBox="0 0 520 400" fill="none">
      <defs><pattern id="story-dot-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#2b4eff" opacity=".16" /></pattern></defs>
      <rect width="520" height="400" fill="url(#story-dot-grid)" />
      <path d="M64 50H454M64 43V57M454 43V57M474 76V330M467 76H481M467 330H481" stroke="#2b4eff" strokeWidth="1" />
      <motion.path d="M64 284V76H454V330H111" stroke="#17172b" strokeWidth="5" style={{ pathLength: paused ? 1 : walls }} />
      <path d="M64 284H110M110 284A46 46 0 0 1 64 330" stroke="#2b4eff" strokeDasharray="4 3" />
      <path d="M201 76H312" stroke="#2b4eff" strokeWidth="6" />
      <motion.g style={{ opacity: paused ? 1 : pieces, y: paused ? 0 : lift }}>
        <rect x="81" y="93" width="102" height="175" rx="4" fill="#d6b791" stroke="#17172b" />
        <rect x="87" y="99" width="90" height="160" rx="6" fill="#fafaf8" />
        <rect x="93" y="106" width="78" height="35" rx="7" fill="white" stroke="#d6d7dd" />
        <rect x="87" y="156" width="90" height="86" rx="3" fill="#2b4eff" />
        <path d="M92 167H172M92 174H172" stroke="white" opacity=".3" />
        <rect x="210" y="170" width="126" height="130" rx="3" fill="#e6dbc9" stroke="#bca788" strokeDasharray="3 3" />
        <rect x="363" y="93" width="74" height="125" rx="3" fill="#d6b791" stroke="#17172b" />
        <rect x="374" y="116" width="52" height="43" rx="2" fill="#17172b" />
        <rect x="379" y="121" width="42" height="31" fill="#b5c2ff" />
        <circle cx="382" cy="193" r="12" fill="#ffd84d" stroke="#17172b" />
        <rect x="347" y="242" width="91" height="68" rx="2" fill="#f3ede4" stroke="#17172b" />
        <path d="M353 265H432M353 288H432" stroke="#bca788" />
      </motion.g>
      <motion.g style={{ opacity: paused ? 1 : receipt }}>
        <rect x="218" y="217" width="150" height="118" fill="white" stroke="#17172b" />
        <path d="M232 262H354M232 288H354" stroke="#e4e9f4" />
        <text x="232" y="243" fill="#2b4eff" fontSize="12" fontFamily="monospace">YOUR MOVE-IN LIST</text>
        <text x="232" y="280" fill="#17172b" fontSize="13">14 pieces</text>
        <text x="232" y="315" fill="#17172b" fontSize="22" fontWeight="600">$612</text>
        <circle cx="343" cy="309" r="12" fill="#ffd84d" /><path d="m338 309 3 3 6-7" stroke="#17172b" strokeWidth="2" />
      </motion.g>
    </svg>
    <div className={styles.planLegend}><span>Dimensions → Layout → List</span><span>Example plan</span></div>
  </MotionFrame>;
}

/** Material swatches change with the real style selection. */
export function PaletteStudy({ vibe = "cozy" }: { vibe?: string }) {
  const source = styleById(vibe as StyleId).palette;
  const colors = [source[1], source[0], source[2]];
  return <MotionFrame className={styles.palette} style={{ "--swatch-a": colors[0], "--swatch-b": colors[1], "--swatch-c": colors[2] } as CSSProperties}>
    <div className={styles.paletteRing} />
    <div className={`${styles.material} ${styles.materialOne}`}><i /><span>01 / Texture</span></div>
    <div className={`${styles.material} ${styles.materialTwo}`}><i /><span>02 / Tone</span></div>
    <div className={`${styles.material} ${styles.materialThree}`}><i /><span>03 / Accent</span></div>
    <div className={styles.paletteLabel}><span>THE PALETTE</span><strong>{vibe.replaceAll("_", " ")}</strong></div>
  </MotionFrame>;
}

/** A typed brief becomes a physical collage, rather than another house. */
export function VibeMoodboard() {
  return <MotionFrame className={styles.moodboard}>
    <div className={styles.briefStrip}><span>YOUR WORDS</span><p>Warm oak. Cobalt. A little retro.<i /></p></div>
    <div className={styles.collage}>
      <div className={styles.fabric}><span>01 / Softness</span><i /><b>Touch of blue.</b></div>
      <div className={styles.artPrint}><svg viewBox="0 0 150 190"><rect width="150" height="190" fill="#f8f0db" /><circle cx="75" cy="76" r="51" fill="#ffd84d" /><path d="M24 164V100a51 51 0 0 1 102 0v64H99v-64a24 24 0 0 0-48 0v64Z" fill="#2b4eff" /></svg><span>02 / Something bold</span></div>
      <div className={styles.lamp}><svg viewBox="0 0 150 190" fill="none"><ellipse cx="78" cy="168" rx="40" ry="8" fill="#17172b" opacity=".12" /><path d="M70 84H85V157H70Z" fill="#ceaa7e" stroke="#17172b" /><ellipse cx="77" cy="157" rx="29" ry="6" fill="#dfc5a3" stroke="#17172b" /><path d="M24 89C24 18 130 18 130 89Z" fill="#ffd84d" stroke="#17172b" /><ellipse cx="77" cy="89" rx="53" ry="8" fill="#e1b73b" stroke="#17172b" /></svg><span>03 / Warmth</span></div>
      <span className={styles.boardSticker}>Very.<br /><em>You.</em></span>
    </div>
    <div className={styles.boardSwatches}><i /><i /><i /><span>An aesthetic, taking shape.</span></div>
  </MotionFrame>;
}

export function CampusMap() {
  return <MotionFrame className={styles.campus}>
    <svg viewBox="0 0 500 350" fill="none">
      <path d="M-30 250 265-20M60 410 420 50M-20 90 360 370M145-20 510 240" stroke="white" strokeWidth="26" />
      <g stroke="#c4c9d7" fill="#dce1ed"><path d="m55 100 81-72 80 59-81 73Z" /><path d="m306 97 55-49 79 61-53 49Z" /><path d="m107 292 76-68 72 54-75 69Z" /><path d="m332 256 65-57 77 57-64 56Z" /></g>
      <path d="m176 165 90-80 97 74-90 80Z" fill="#2b4eff" stroke="#17172b" /><path d="m176 165 97 74v25l-97-74ZM273 239l90-80v25l-90 80Z" fill="#1932ba" />
      <path className={styles.mapRoute} d="M6 300 92 224 147 266 254 172" stroke="#2b4eff" strokeWidth="3" strokeDasharray="6 6" />
      <g className={styles.mapPin}><circle cx="266" cy="135" r="34" fill="#2b4eff" opacity=".12" /><path d="M266 157s23-24 23-39a23 23 0 0 0-46 0c0 15 23 39 23 39Z" fill="#ffd84d" stroke="#17172b" /><circle cx="266" cy="118" r="7" fill="#fafaf8" stroke="#17172b" /></g>
    </svg>
    <div className={styles.mapCard}><span>FIND YOUR PLACE</span><strong>Campus → Hall → Your room</strong><i /></div>
  </MotionFrame>;
}

export function ProductRadar() {
  return <MotionFrame className={styles.radar}>
    <div className={styles.radarRings}><i /><i /><i /><span /></div>
    <div className={styles.radarCore}><BrandMark size={60}/><span>Matching<br />your brief</span></div>
    {["TEXTURES", "LIGHTING", "THE DETAILS"].map((name, i) => <div key={name} className={styles.radarCard} style={{ "--i": i } as CSSProperties}><span>0{i + 1} / {name}</span><svg viewBox="0 0 100 64" fill="none" stroke="currentColor" strokeWidth="2">{i === 0 ? <><rect x="18" y="10" width="64" height="44" rx="3" /><path d="M25 18h50M25 25h50M25 32h50M25 39h50M25 46h50" opacity=".3" /></> : i === 1 ? <><path d="M25 34C25 1 75 1 75 34ZM50 34v21M34 55h32" /><ellipse cx="50" cy="34" rx="25" ry="3" /></> : <><rect x="25" y="5" width="50" height="54" /><circle cx="50" cy="26" r="12" /><path d="m30 52 13-14 12 9 15-17" /></>}</svg><i /></div>)}
  </MotionFrame>;
}

export function DesignStack() {
  return <MotionFrame className={styles.stack}>
    <div className={styles.stackSheet}><span>01 / THE PLAN</span><svg viewBox="0 0 260 160" fill="none" stroke="#2b4eff" strokeWidth="2"><path d="M20 130V20H240V140H65M20 95H65V140" /><rect x="35" y="33" width="55" height="80" /><rect x="161" y="33" width="62" height="40" /><rect x="120" y="87" width="70" height="39" /></svg></div>
    <div className={styles.stackSheet}><span>02 / THE STYLE</span><div className={styles.stackPalette}><i /><i /><i /></div><strong>Everything,<br /><em>in harmony.</em></strong></div>
    <div className={styles.stackSheet}><span>03 / THE LIST</span><p>Bedding <b>✓</b></p><p>Lighting <b>✓</b></p><p>The finishing touches <b>✓</b></p></div>
  </MotionFrame>;
}
