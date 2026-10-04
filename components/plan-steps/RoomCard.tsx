"use client";

import Link from "next/link";
import ScalePlan from "@/components/hall/ScalePlan";
import { roomTypeLabel } from "@/lib/format";
import { usePlannerStore } from "@/lib/store";
import { dimsOf, fitSelected, schoolLabel, sqftOfSelected, usd, vibeMeta } from "./room-model";
import type { SelectedRoom } from "@/lib/types";
import css from "./RoomCard.module.css";

/** A hand-drawn room's real outline (no furniture yet), scaled into the card. */
function OutlinePlan({ room, label }: { room: SelectedRoom; label: string }) {
  const pts = room.outline?.points ?? [];
  const U = 20;
  const pad = 6;
  const w = room.lengthFt * U + pad * 2;
  const h = room.widthFt * U + pad * 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className={css.outline}>
      <polygon
        points={pts.map((p) => `${pad + p.x * U},${pad + p.y * U}`).join(" ")}
        fill="#fff"
        stroke="var(--ds-ink)"
        strokeWidth="5"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function useRoomSummary() {
  const college = usePlannerStore((s) => s.college);
  const dorm = usePlannerStore((s) => s.dorm);
  const room = usePlannerStore((s) => s.room);
  const style = usePlannerStore((s) => s.style);
  const customVibe = usePlannerStore((s) => s.customVibe);
  const budget = usePlannerStore((s) => s.budget);
  const school = schoolLabel(college);
  const where = [school, dorm?.name].filter(Boolean).join(" · ");
  const typeLabel = room
    ? room.source === "drawn"
      ? "Drawn room"
      : roomTypeLabel(room)
    : "";
  return { school, dorm, room, budget, where, typeLabel, vibe: vibeMeta(style, customVibe) };
}

/**
 * "Your room": the room carried through every step, drawn to scale, with the
 * vibe and budget picked so far. Desktop rail card; phones get the compact
 * line or summary (RoomLine).
 */
export default function RoomCard({ showBudget = false, vibeChange = false }: { showBudget?: boolean; vibeChange?: boolean }) {
  const { room, where, typeLabel, vibe, budget, dorm } = useRoomSummary();
  if (!room) return null;
  const fit = room.outline ? null : fitSelected(room);
  const L = Math.max(room.lengthFt, room.widthFt);
  const W = Math.min(room.lengthFt, room.widthFt);
  const ppf = Math.min(16, 286 / (L + 1.75), 150 / (W + 1.6));
  const planLabel = `${dorm?.name ?? "Your"} ${typeLabel.toLowerCase()} plan, ${dimsOf(room.lengthFt, room.widthFt)}`;

  return (
    <aside className={css.card} aria-label="Your room so far">
      <div className={css.head}>
        <span className={css.label}>Your room</span>
        <Link href="/plan" className={css.change} aria-label="Change your room">
          Change
        </Link>
      </div>
      <div className={css.plan} style={{ "--ppf": ppf } as React.CSSProperties}>
        {fit ? (
          <ScalePlan uid="plan-card" room={fit} title={planLabel} className={css.planSvg} />
        ) : (
          <OutlinePlan room={room} label={planLabel} />
        )}
      </div>
      <p className={css.where}>{where || typeLabel}</p>
      <p className={css.what}>
        {where ? `${typeLabel} · ` : ""}
        {dimsOf(room.lengthFt, room.widthFt)} · {sqftOfSelected(room).toLocaleString("en-US")} sq ft
      </p>
      <div className={css.row}>
        <span className={css.rowText}>
          <span className={css.rowLabel}>Vibe</span>
          <span className={css.rowValue}>{vibe ? vibe.name : "Not picked yet"}</span>
        </span>
        {vibeChange ? (
          <Link href="/plan/style" className={css.change} aria-label="Change your vibe">
            Change
          </Link>
        ) : (
          vibe && (
            <span className={css.dots} aria-hidden="true">
              {vibe.dots.map((c, i) => (
                <span key={i} style={{ background: c }} />
              ))}
            </span>
          )
        )}
      </div>
      {showBudget && (
        <div className={css.row}>
          <span className={css.rowText}>
            <span className={css.rowLabel}>Budget</span>
            <span className={`${css.rowValue} ${css.num}`}>{usd(budget)}</span>
          </span>
        </div>
      )}
    </aside>
  );
}

/** Phones: the room as one line (vibe step) or a small summary card (budget step). */
export function RoomLine({ variant }: { variant: "pill" | "summary" }) {
  const { room, school, typeLabel, vibe, dorm } = useRoomSummary();
  if (!room) return null;
  const dims = dimsOf(room.lengthFt, room.widthFt);
  if (variant === "pill") {
    const short = typeLabel.replace(/\s+Room$/i, "");
    return (
      <Link href="/plan" className={css.pill} aria-label={`Your room: ${[dorm?.name, short, dims].filter(Boolean).join(", ")}. Change`}>
        <span className={css.pillText}>{[dorm?.name, short, dims].filter(Boolean).join(" · ")}</span>
        <span className={css.pillChange}>Change</span>
      </Link>
    );
  }
  return (
    <div className={css.summary}>
      <strong>{[dorm?.name, typeLabel].filter(Boolean).join(" · ")}</strong>
      <span>{[school, dims, vibe?.name].filter(Boolean).join(" · ")}</span>
    </div>
  );
}
