"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ScalePlan from "@/components/hall/ScalePlan";
import { fitRoom, ft } from "@/lib/room-preview";
import { fittingRugs } from "@/lib/rug-fit";
import css from "./Tools.module.css";

export interface RoomPreset {
  label: string;
  l: number;
  w: number;
  o: number;
}

const num = (v: string | null, min: number, max: number) => {
  const n = Number(v);
  return v && Number.isFinite(n) && n >= min && n <= max ? n : null;
};

/**
 * Which standard rug fits a dorm room: the room is laid out the way the planner
 * starts it (lib/room-preview fitRoom) and lib/rug-fit finds the biggest standard
 * rug that fits the floor left over. A hall page can link here with ?l=&w=&o=&room=.
 */
export default function RugCalculator({ presets }: { presets: RoomPreset[] }) {
  const params = useSearchParams();
  const fromHall = {
    l: num(params.get("l"), 6, 40),
    w: num(params.get("w"), 6, 30),
    o: num(params.get("o"), 1, 3),
    room: params.get("room")?.slice(0, 80) ?? null,
  };
  const start = fromHall.l && fromHall.w ? { l: fromHall.l, w: fromHall.w, o: fromHall.o ?? 2 } : presets[1] ?? presets[0];
  const [length, setLength] = useState(String(start.l));
  const [width, setWidth] = useState(String(start.w));
  const [people, setPeople] = useState(start.o);
  const [room, setRoom] = useState(fromHall.l && fromHall.w ? fromHall.room : null);

  const L = num(length, 6, 40);
  const W = num(width, 6, 30);
  const fit = useMemo(
    () =>
      L && W
        ? fitRoom({
            type: people === 1 ? "single" : people === 2 ? "double" : "triple",
            label: "",
            occupants: people,
            length_ft: L,
            width_ft: W,
            sqft: null,
            bed_size: "twin_xl",
            closet: null,
          })
        : null,
    [L, W, people]
  );
  const rugs = useMemo(() => (fit ? fittingRugs(fit) : []), [fit]);
  const best = rugs.at(-1);
  const size = (s: [number, number]) => `${s[0]} × ${s[1]}`;

  const choose = (p: RoomPreset) => {
    setLength(String(p.l));
    setWidth(String(p.w));
    setPeople(p.o);
    setRoom(null);
  };

  return (
    <div className={css.tool}>
      <div className={css.form}>
        <div>
          <span className="ds-label">Start from a typical room</span>
          <div className={css.presets} role="group" aria-label="Typical rooms">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                aria-pressed={!room && Number(length) === p.l && Number(width) === p.w && people === p.o}
                onClick={() => choose(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className={css.fields}>
          <label className={css.field}>
            <span className="ds-label">Length (ft)</span>
            <input
              className="ds-input"
              type="number"
              inputMode="decimal"
              min={6}
              max={40}
              step={0.5}
              value={length}
              onChange={(e) => {
                setLength(e.target.value);
                setRoom(null);
              }}
            />
          </label>
          <label className={css.field}>
            <span className="ds-label">Width (ft)</span>
            <input
              className="ds-input"
              type="number"
              inputMode="decimal"
              min={6}
              max={30}
              step={0.5}
              value={width}
              onChange={(e) => {
                setWidth(e.target.value);
                setRoom(null);
              }}
            />
          </label>
          <label className={css.field}>
            <span className="ds-label">People</span>
            <select
              className="ds-input"
              value={people}
              onChange={(e) => {
                setPeople(Number(e.target.value));
                setRoom(null);
              }}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
        </div>
        {room && (
          <p className={css.from}>
            Sized for <b>{room}</b>.
          </p>
        )}
        <p className={css.note}>
          The room is laid out the way the planner starts it: a bed, desk and dresser for each person, with the door swing
          kept clear. A rug can run under desk chairs.
        </p>
      </div>

      <div className={css.result} aria-live="polite">
        {!fit ? (
          <p className={css.answer}>
            <span>Biggest rug that fits</span>Enter a room 6 to 40 ft long and 6 to 30 ft wide.
          </p>
        ) : best ? (
          <>
            <p className={css.answer}>
              <span>Biggest rug that fits</span>
              {size(best.size)} ft
            </p>
            {rugs.length > 1 && (
              <p className={css.also}>
                Smaller sizes that also fit:{" "}
                {rugs
                  .slice(0, -1)
                  .map((r) => size(r.size))
                  .join(", ")}{" "}
                ft.
              </p>
            )}
          </>
        ) : (
          <p className={css.answer}>
            <span>Biggest rug that fits</span>Not even a 2 × 3
          </p>
        )}
        {fit && (
          <div className={css.plan}>
            <ScalePlan
              uid="rug-calc"
              room={fit}
              rug={best ? { x: best.x, y: best.y, w: best.w, l: best.l, label: `${size(best.size)} rug` } : undefined}
              title={
                best
                  ? `A ${ft(fit.lengthFt)} by ${ft(fit.widthFt)} foot room with a ${size(best.size)} foot rug on the open floor`
                  : `A ${ft(fit.lengthFt)} by ${ft(fit.widthFt)} foot room with no open floor for a standard rug`
              }
              className={css.planSvg}
            />
          </div>
        )}
        <p className={css.note}>
          Move the furniture and the answer changes.{" "}
          <Link href="/plan" className="ds-link">
            Plan your room
          </Link>{" "}
          to try your own layout with a rug in it.
        </p>
      </div>
    </div>
  );
}
