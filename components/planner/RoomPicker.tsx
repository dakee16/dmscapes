"use client";

import { useId } from "react";
import { bedName, ft, sqFtOf } from "@/lib/room-preview";
import type { DormSummary, RoomSummary } from "@/lib/types";
import css from "@/components/plan-steps/Room.module.css";

/** Stable key for a room row within a dorm (types can repeat with variant dims). */
export function roomKey(room: RoomSummary, index: number): string {
  return `${room.type}-${room.length_ft ?? "x"}-${room.width_ft ?? "x"}-${index}`;
}

/**
 * The hall's room types as radio cards. Choosing one sets the room (and
 * redraws the plan); nothing is committed until "Use this room".
 */
export default function RoomPicker({
  dorm,
  selectedKey,
  onSelect,
}: {
  dorm: DormSummary;
  selectedKey: string | null;
  onSelect: (room: RoomSummary, key: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className={css.types}>
      <legend className={css.typesLegend}>Room type</legend>
      <div className={css.typeGrid} data-count={Math.min(dorm.rooms.length, 3)}>
        {dorm.rooms.map((room, i) => {
          const key = roomKey(room, i);
          const selected = key === selectedKey;
          const hasDims = Boolean(room.length_ft && room.width_ft);
          const sq = sqFtOf(room);
          const meta = [
            sq ? `${sq.toLocaleString("en-US")} sq ft` : null,
            room.occupants != null ? `Sleeps ${room.occupants}` : null,
            bedName(room.bed_size),
          ].filter(Boolean);
          return (
            <label key={key} className={css.type} data-selected={selected}>
              <input
                type="radio"
                name={name}
                value={key}
                checked={selected}
                onChange={() => onSelect(room, key)}
                className={css.typeRadio}
              />
              <span className={css.typeName} title={room.label}>
                {room.label}
              </span>
              {hasDims ? (
                <span className={css.typeDims}>
                  {ft(Math.max(room.length_ft!, room.width_ft!))} × {ft(Math.min(room.length_ft!, room.width_ft!))} ft
                  {room.dims_estimated && <span className={css.est}>est.</span>}
                </span>
              ) : (
                <span className={css.typeDims} data-missing="">
                  Size not published
                </span>
              )}
              <span className={css.typeMeta}>{meta.join(" · ")}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
