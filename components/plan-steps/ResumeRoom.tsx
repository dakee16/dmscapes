"use client";

import { ArrowRight } from "@/components/ds/Icons";
import EstimatedDimsNote from "@/components/room/EstimatedDimsNote";
import { roomTypeLabel } from "@/lib/format";
import { dimsOf, schoolLabel } from "./room-model";
import type { SelectedRoom } from "@/lib/types";
import css from "./Page.module.css";

/**
 * The room already chosen (from the catalog, typed in, or drawn), shown on
 * the school list so a return visit can carry straight on.
 */
export default function ResumeRoom({
  college,
  dorm,
  room,
  onUse,
  onEdit,
}: {
  college: { id: string | null; name: string } | null;
  dorm: { id: string; name: string } | null;
  room: SelectedRoom;
  onUse: () => void;
  onEdit?: () => void;
}) {
  const where = [schoolLabel(college), dorm?.name].filter(Boolean).join(" · ");
  const what =
    room.source === "drawn" ? "Your drawn room" : room.source === "manual" ? "Your measurements" : roomTypeLabel(room);
  return (
    <div className={css.resume} role="group" aria-label="Your room">
      <div className={css.resumeText}>
        <span className={css.resumeLabel}>Your room</span>
        <strong>{where || what}</strong>
        <span>
          {where ? `${what} · ` : ""}
          {dimsOf(room.lengthFt, room.widthFt)}
        </span>
        {room.dimsEstimated && <EstimatedDimsNote />}
      </div>
      <div className={css.resumeActions}>
        {onEdit && (
          <button type="button" className={css.resumeEdit} onClick={onEdit}>
            Change room
          </button>
        )}
        <button type="button" className={css.resumeUse} onClick={onUse}>
          Use this room
          <ArrowRight size={18} strokeWidth={2.8} />
        </button>
      </div>
    </div>
  );
}
