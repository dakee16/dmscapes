"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { footprint } from "@/components/canvas/geometry";
import { useExperienceMotion } from "@/components/experience/MotionProvider";
import { ArrowRight, Check } from "@/components/ds/Icons";
import { ft } from "@/lib/room-preview";
import { fitSelected } from "./room-model";
import type { SelectedRoom } from "@/lib/types";
import css from "./Generating.module.css";

/** The preset part of the animation. Generation never waits longer than this for it. */
export const INTRO_MS = 1400;
const U = 24; // viewBox units per foot

const STAGES = [
  { word: "Measure.", status: "Measuring your room" },
  { word: "Imagine.", status: "Choosing your pieces" },
  { word: "Make room.", status: "Placing every piece and checking that it fits" },
] as const;

export interface GeneratingPicks {
  bedding: boolean;
  rug: boolean;
  lamp: boolean;
}

/**
 * "Planning your room": the fit being made. Walls draw at real size, the
 * building's furniture drops in, then picks arrive as dashed outlines that
 * fill. A short preset (under INTRO_MS, skippable) runs alongside the real
 * request; if the request takes longer the screen settles into a calm loop
 * with no numbers. `onOpen` fires once, as soon as `ready` and the preset is
 * over or skipped.
 */
export default function Generating({
  room,
  summary,
  measure,
  imagine,
  picks,
  colors,
  ready,
  onOpen,
  eyebrow = "Planning your room",
  skippable = true,
}: {
  room: SelectedRoom;
  /** Header line, e.g. "Penn State · Atherton Hall · Cozy Aesthetic · $650". */
  summary: string;
  measure: string;
  imagine: string;
  picks: GeneratingPicks;
  /** The vibe's swatch colors: [main, light, dark]. */
  colors: [string, string, string];
  ready: boolean;
  onOpen: () => void;
  eyebrow?: string;
  /** False where there is nothing to open early (a regeneration in place). */
  skippable?: boolean;
}) {
  const { paused } = useExperienceMotion();
  const reduce = useReducedMotion();
  const still = paused || Boolean(reduce);
  const [phase, setPhase] = useState<"intro" | "hold">(still ? "hold" : "intro");
  const [stage, setStage] = useState(still ? 2 : 0);
  const opened = useRef(false);
  const skipRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Reduced motion or the site's pause toggle: no preset, just the final frame.
  useEffect(() => {
    if (still && phase === "intro") {
      setStage(2);
      setPhase("hold");
    }
  }, [still, phase]);

  // The skip button leaves with the preset; keep focus inside the screen.
  useEffect(() => {
    if (phase === "hold" && (!document.activeElement || document.activeElement === document.body)) {
      rootRef.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  // The preset: three beats inside INTRO_MS, then hold.
  useEffect(() => {
    if (phase !== "intro") return;
    const t1 = window.setTimeout(() => setStage(1), 450);
    const t2 = window.setTimeout(() => setStage(2), 900);
    const t3 = window.setTimeout(() => setPhase("hold"), INTRO_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [phase]);

  useEffect(() => {
    if (ready && phase === "hold" && !opened.current) {
      opened.current = true;
      onOpen();
    }
  }, [ready, phase, onOpen]);

  // Full-screen while it works: lock scroll, move focus in.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (skipRef.current ?? rootRef.current)?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function skip() {
    rootRef.current?.focus({ preventScroll: true });
    setStage(2);
    setPhase("hold");
  }

  const fit = fitSelected(room);
  const L = fit?.lengthFt ?? Math.max(room.lengthFt, room.widthFt);
  const W = fit?.widthFt ?? Math.min(room.lengthFt, room.widthFt);
  const pad = 10;
  const padT = 40;
  const vw = L * U + pad * 2;
  const vh = W * U + padT + pad;
  const X = (f: number) => pad + f * U;
  const Y = (f: number) => padT + f * U;
  const door = Math.min(3, W * 0.4) * U;
  const furniture = fit?.furniture ?? [];
  const beds = furniture.filter((f) => f.type === "bed");
  const desks = furniture.filter((f) => f.type === "desk");
  const rug = { w: Math.min(5, L * 0.36), h: Math.min(3.5, W * 0.3) };
  const fill = ready;
  let pickIndex = 0;

  return (
    <div
      ref={rootRef}
      className={css.screen}
      role="dialog"
      aria-modal="true"
      aria-labelledby="planning-title"
      tabIndex={-1}
      data-phase={phase}
      data-still={still}
      data-ready={ready}
      style={{ "--c-main": colors[0], "--c-light": colors[1], "--c-dark": colors[2] } as React.CSSProperties}
    >
      <header className={css.bar}>
        <span className={`ds-wordmark ${css.wordmark}`} aria-hidden="true">
          <span className="ds-wordmark__type">
            dormscape
            <span className="ds-wordmark__dot" />
          </span>
        </span>
        <span className={css.summary}>{summary}</span>
      </header>

      <div className={css.body}>
        <section className={css.stages}>
          <p id="planning-title" className={`ds-eyebrow ${css.eyebrow}`}>
            {eyebrow}
          </p>
          <ol className={css.stageList}>
            {STAGES.map((s, i) => {
              // Stages finish in order; the last one only once the plan is ready.
              const doneUpTo = ready && stage === 2 ? 3 : stage;
              const state = i < doneUpTo ? "done" : i === stage ? "active" : "todo";
              return (
                <li key={s.word} className={css.stage} data-state={state} data-i={i}>
                  <span className={css.word}>
                    <span className={i === 1 ? css.serif : css.sans}>{s.word}</span>
                    {state === "done" && (
                      <span className={css.done} aria-hidden="true">
                        <Check size={22} strokeWidth={3.2} />
                      </span>
                    )}
                    {state === "active" && (
                      <span className={css.dots} aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                    )}
                  </span>
                  <span className={css.note}>{i === 0 ? measure : i === 1 ? imagine : "Placing every piece and checking that it fits."}</span>
                </li>
              );
            })}
          </ol>
          <p className="ds-sr" role="status" aria-live="polite">
            {ready ? "Your plan is ready." : STAGES[stage].status}
          </p>
        </section>

        <div className={css.drawing}>
          <svg
            viewBox={`0 0 ${vw} ${vh}`}
            className={css.svg}
            role="img"
            aria-label={`Your ${ft(L)} by ${ft(W)} foot room being drawn: walls, the building's furniture, then your picks`}
          >
            {/* dimension */}
            <g className={css.dim}>
              <line x1={X(0)} y1={16} x2={X(L)} y2={16} stroke="var(--ds-ink)" strokeWidth="1.5" />
              <rect x={X(L / 2) - 36} y={4} width={72} height={24} fill="var(--ds-paper)" />
              <text x={X(L / 2)} y={21} textAnchor="middle" fontFamily="var(--ds-sans)" fontWeight="800" fontSize="15" fill="var(--ds-ink)">
                {ft(L)} ft
              </text>
            </g>

            {/* floor */}
            <rect x={X(0)} y={Y(0)} width={L * U} height={W * U} fill="#fff" className={css.floor} />

            {/* rug lands under the furniture */}
            {picks.rug && (
              <g className={css.pick} style={{ "--i": pickIndex++ } as React.CSSProperties}>
                <rect
                  x={X(L / 2 - rug.w / 2)}
                  y={Y(W / 2 - rug.h / 2)}
                  width={rug.w * U}
                  height={rug.h * U}
                  rx={4}
                  className={css.pickShape}
                  data-fill={fill}
                  data-kind="rug"
                />
                <text x={X(L / 2)} y={Y(W / 2) + 3} className={css.pickLabel} textAnchor="middle">
                  RUG
                </text>
              </g>
            )}

            {/* the building's furniture drops in */}
            {furniture.map((f, i) => {
              const fp = footprint(f);
              const w = f.width_ft * U;
              const h = f.length_ft * U;
              const cx = X(fp.x + fp.w / 2);
              const cy = Y(fp.y + fp.h / 2);
              return (
                <g key={f.id} className={css.piece} style={{ "--i": i } as React.CSSProperties}>
                  <g transform={`rotate(${f.rotation_deg} ${cx} ${cy})`}>
                    <rect
                      x={cx - w / 2}
                      y={cy - h / 2}
                      width={w}
                      height={h}
                      rx={f.type === "desk_chair" ? 6 : 2}
                      fill="#EEF1FD"
                      stroke="var(--ds-blue)"
                      strokeWidth="1.6"
                    />
                    {f.type === "bed" && (
                      <rect
                        x={cx - w / 2 + w * 0.12}
                        y={cy - h / 2 + 5}
                        width={w * 0.76}
                        height={Math.min(18, h * 0.16)}
                        rx={4}
                        fill="#fff"
                        stroke="var(--ds-blue)"
                        strokeWidth="1.2"
                      />
                    )}
                  </g>
                </g>
              );
            })}

            {/* picks arrive as dashed outlines, then fill */}
            {picks.bedding &&
              beds.map((f, n) => {
                const fp = footprint(f);
                const w = f.width_ft * U;
                const h = f.length_ft * U;
                const cx = X(fp.x + fp.w / 2);
                const cy = Y(fp.y + fp.h / 2);
                return (
                  <g key={`bedding-${f.id}`} className={css.pick} style={{ "--i": pickIndex++ } as React.CSSProperties}>
                    <g transform={`rotate(${f.rotation_deg} ${cx} ${cy})`}>
                      <rect
                        x={cx - w / 2 + 3}
                        y={cy - h / 2 + h * 0.3}
                        width={w - 6}
                        height={h * 0.7 - 3}
                        rx={3}
                        className={css.pickShape}
                        data-fill={fill}
                        data-kind="bedding"
                      />
                    </g>
                    {n === 0 && (
                      <text x={cx} y={cy + 3} className={css.pickLabel} textAnchor="middle">
                        BEDDING
                      </text>
                    )}
                  </g>
                );
              })}
            {picks.lamp &&
              desks.map((f, n) => {
                const fp = footprint(f);
                const cx = X(fp.x + fp.w / 2);
                const cy = Y(fp.y + fp.h / 2);
                return (
                  <g key={`lamp-${f.id}`} className={css.pick} style={{ "--i": pickIndex++ } as React.CSSProperties}>
                    <circle cx={cx} cy={cy} r={0.6 * U} className={css.pickShape} data-fill={fill} data-kind="lamp" />
                    {n === 0 && (
                      <text x={cx} y={cy - 0.6 * U - 6} className={css.pickLabel} textAnchor="middle">
                        LAMP
                      </text>
                    )}
                  </g>
                );
              })}

            {/* walls draw at real size */}
            <path
              d={`M ${X(0)} ${Y(0)} H ${X(L)} V ${Y(W)} H ${X(0)} Z`}
              pathLength={1}
              fill="none"
              stroke="var(--ds-ink)"
              strokeWidth="6"
              strokeLinejoin="miter"
              className={css.walls}
            />
            <g className={css.openings}>
              <line x1={X(0)} y1={Y(W) - door} x2={X(0)} y2={Y(W)} stroke="#fff" strokeWidth="8" />
              <path
                d={`M ${X(0)} ${Y(W) - door} A ${door} ${door} 0 0 1 ${X(0) + door} ${Y(W)}`}
                fill="none"
                stroke="#9AA3C7"
                strokeWidth="1.4"
                strokeDasharray="4 4"
              />
              <line x1={X(L)} y1={Y(W * 0.3)} x2={X(L)} y2={Y(W * 0.7)} stroke="var(--ds-blue)" strokeWidth="6" />
            </g>
          </svg>

          <div className={css.progress}>
            <span className={css.progressLabel}>{ready ? "Opening your plan" : STAGES[stage].status}</span>
            <span className={css.track} aria-hidden="true">
              <span className={css.tapeRun} />
            </span>
          </div>
        </div>
      </div>

      <footer className={css.foot}>
        <p className={css.tip}>
          <span className={css.tipTag}>Good to know</span>
          Switching between 2D and 3D uses no plan credits.
        </p>
        {skippable && phase === "intro" && (
          <button ref={skipRef} type="button" className={css.skip} onClick={skip}>
            Open my plan
            <ArrowRight size={16} />
          </button>
        )}
      </footer>
    </div>
  );
}
