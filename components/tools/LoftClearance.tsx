"use client";

import { useState } from "react";
import css from "./Tools.module.css";

export interface ClearancePreset {
  label: string;
  inches: number;
}
export interface ClearanceItem {
  name: string;
  inches: number;
}

// "Tight" when it fits with less than this to spare: room to slide it in, and for carpet or uneven floors.
const SPARE_IN = 2;

function verdict(clearance: number, height: number) {
  const spare = clearance - height;
  if (spare >= SPARE_IN) return { v: "fits", label: "Fits", spare };
  if (spare >= 0) return { v: "tight", label: "Tight", spare };
  return { v: "no", label: "Too tall", spare };
}

/**
 * What fits under a bed: the space under the frame against the heights the
 * planner uses for common pieces (lib/furniture-library), plus one of your own.
 */
export default function LoftClearance({ presets, items }: { presets: ClearancePreset[]; items: ClearanceItem[] }) {
  const lofted = presets.find((p) => /loft/i.test(p.label)) ?? presets[0];
  const [clearance, setClearance] = useState(String(lofted.inches));
  const [ownName, setOwnName] = useState("");
  const [ownHeight, setOwnHeight] = useState("");
  const c = Number(clearance);
  const valid = clearance !== "" && Number.isFinite(c) && c > 0 && c <= 96;
  const own = Number(ownHeight);
  const list = [...items, ...(ownHeight !== "" && Number.isFinite(own) && own > 0 ? [{ name: ownName.trim() || "Your item", inches: own }] : [])];

  return (
    <div className={css.tool}>
      <div className={css.form}>
        <div>
          <span className="ds-label">Bed setup</span>
          <div className={css.presets} role="group" aria-label="Bed setups">
            {presets.map((p) => (
              <button key={p.label} type="button" aria-pressed={Number(clearance) === p.inches} onClick={() => setClearance(String(p.inches))}>
                {p.label} · {p.inches} in
              </button>
            ))}
          </div>
        </div>
        <label className={css.field}>
          <span className="ds-label">Space under your bed (in)</span>
          <input className="ds-input" type="number" inputMode="decimal" min={1} max={96} step={0.5} value={clearance} onChange={(e) => setClearance(e.target.value)} />
        </label>
        <p className={css.note}>Measure from the floor to the underside of the bed frame or its rails, whichever is lower.</p>
        <div>
          <span className="ds-label">Add your own item</span>
          <div className={css.fields2}>
            <label className={css.field}>
              <span className="ds-sr">Item name</span>
              <input className="ds-input" placeholder="e.g. Storage cart" maxLength={40} value={ownName} onChange={(e) => setOwnName(e.target.value)} />
            </label>
            <label className={css.field}>
              <span className="ds-sr">Item height in inches</span>
              <input className="ds-input" type="number" inputMode="decimal" min={1} max={96} step={0.5} placeholder="Height (in)" value={ownHeight} onChange={(e) => setOwnHeight(e.target.value)} />
            </label>
          </div>
        </div>
      </div>

      <div className={css.result} aria-live="polite">
        <p className={css.answer}>
          <span>Space under the bed</span>
          {valid ? `${c} in` : "Enter a height up to 96 in"}
        </p>
        {valid && (
          <ul className={css.items}>
            {list.map((item) => {
              const r = verdict(c, item.inches);
              return (
                <li key={item.name}>
                  <b>{item.name}</b>
                  <small>
                    {item.inches} in tall · {r.spare >= 0 ? `${Math.round(r.spare * 10) / 10} in to spare` : `${Math.round(-r.spare * 10) / 10} in too tall`}
                  </small>
                  <span className={css.verdict} data-v={r.v}>
                    {r.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className={css.note}>
          Item heights are typical sizes the planner uses, not any product&apos;s spec. Measure yours, and check your hall&apos;s
          rules before you loft or raise a bed.
        </p>
      </div>
    </div>
  );
}
