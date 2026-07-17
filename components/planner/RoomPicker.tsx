"use client";

import { formatDims } from "@/lib/schools";
import type { DormSummary, RoomSummary } from "@/lib/types";

/** Stable key for a room row within a dorm (types can repeat with variant dims). */
export function roomKey(room: RoomSummary, index: number): string {
  return `${room.type}-${room.length_ft ?? "x"}-${room.width_ft ?? "x"}-${index}`;
}

export default function RoomPicker({
  dorm,
  selectedKey,
  onSelect,
}: {
  dorm: DormSummary;
  selectedKey: string | null;
  onSelect: (room: RoomSummary, key: string) => void;
}) {
  return (
    <div className="rise">
      <h2 className="mb-3 font-display text-lg font-bold tracking-tight">
        Pick your room type
      </h2>
      <ul className="space-y-1.5 rounded-xl border border-ink/10 bg-white p-2">
        {dorm.rooms.map((room, i) => {
          const key = roomKey(room, i);
          const selected = key === selectedKey;
          const dims = formatDims(room.length_ft, room.width_ft);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onSelect(room, key)}
                aria-pressed={selected}
                className={`flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border px-3.5 py-3 text-left transition-colors ${
                  selected
                    ? "border-cobalt bg-cobalt/5"
                    : "border-transparent hover:border-ink/10 hover:bg-paper"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-ink">
                    {room.label}
                  </span>
                  {room.occupants != null && (
                    <span className="text-xs text-ink-soft">
                      sleeps {room.occupants}
                    </span>
                  )}
                </span>
                {dims ? (
                  <span className="shrink-0 font-mono text-sm font-medium text-cobalt">
                    {dims}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-highlight/40 px-2.5 py-0.5 font-mono text-[11px] font-medium text-ink">
                    size not published
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
