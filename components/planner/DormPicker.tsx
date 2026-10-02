"use client";

import { useId, useState } from "react";
import { Check, SearchIcon } from "@/components/ds/Icons";
import { ft } from "@/lib/room-preview";
import type { DormSummary, SchoolSummary } from "@/lib/types";
import css from "@/components/plan-steps/Room.module.css";

const short = (label: string) => label.replace(/\s+Room$/i, "");

/** "Single 12 × 10 ft · Double 16.4 × 12 ft" for the chosen hall's row. */
function roomLine(dorm: DormSummary): string {
  const sized = dorm.rooms.filter((r) => r.length_ft && r.width_ft);
  if (!sized.length || dorm.rooms.length > 2) return roomCount(dorm);
  return sized
    .map((r) => `${short(r.label)} ${ft(Math.max(r.length_ft!, r.width_ft!))} × ${ft(Math.min(r.length_ft!, r.width_ft!))} ft`)
    .join(" · ");
}

const roomCount = (d: DormSummary) => `${d.rooms.length} room type${d.rooms.length === 1 ? "" : "s"}`;

/** The school's residence halls, searchable, with each hall's room-type count. */
export default function DormPicker({
  school,
  selectedDormId,
  onSelect,
}: {
  school: SchoolSummary;
  selectedDormId: string | null;
  onSelect: (dorm: { id: string; name: string }) => void;
}) {
  const [filter, setFilter] = useState("");
  const id = useId();
  const f = filter.trim().toLowerCase();
  const dorms = f ? school.dorms.filter((d) => d.name.toLowerCase().includes(f)) : school.dorms;

  return (
    <div className={css.halls}>
      <label htmlFor={`${id}-q`} className="ds-sr">
        Search buildings
      </label>
      <div className={css.hallSearch}>
        <SearchIcon size={18} />
        <input
          id={`${id}-q`}
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={`Search ${school.dorms.length} buildings`}
          autoComplete="off"
          className={css.hallInput}
        />
      </div>
      {dorms.length === 0 ? (
        <p className={css.hallEmpty}>No buildings match &ldquo;{filter}&rdquo;.</p>
      ) : (
        <ul className={css.hallList} aria-label={`${school.dorms.length} buildings`}>
          {dorms.map((dorm) => {
            const selected = dorm.id === selectedDormId;
            return (
              <li key={dorm.id}>
                <button
                  type="button"
                  onClick={() => onSelect({ id: dorm.id, name: dorm.name })}
                  aria-pressed={selected}
                  className={css.hall}
                >
                  <span className={css.hallText}>
                    <span className={css.hallName}>{dorm.name}</span>
                    <span className={css.hallSub}>{selected ? roomLine(dorm) : roomCount(dorm)}</span>
                  </span>
                  {selected && (
                    <span className={css.hallCheck} aria-hidden="true">
                      <Check size={14} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
