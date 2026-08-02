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
                className={`flex w-full items-start justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors ${
                  selected
                    ? "border-cobalt bg-cobalt/5"
                    : "border-transparent hover:border-ink/10 hover:bg-paper"
                }`}
              >
                {/* Label column wraps; dims stay pinned top-right so long
                    labels never collide with or displace the size. */}
                <span className="min-w-0 flex-1">
                  <span
                    className="block text-[15px] font-medium leading-snug text-ink"
                    title={room.label}
                  >
                    {room.label}
                  </span>
                  {room.occupants != null && (
                    <span className="text-xs text-ink-soft">
                      sleeps {room.occupants}
                    </span>
                  )}
                </span>
                {dims ? (
                  // Estimated sizes read muted (vs. cobalt for published) with an
                  // "est." tag, so the distinction is honest at a glance.
                  <span className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5">
                    <span
                      className={`whitespace-nowrap font-mono text-sm font-medium ${
                        room.dims_estimated ? "text-ink-soft" : "text-cobalt"
                      }`}
                    >
                      {dims}
                    </span>
                    {room.dims_estimated && (
                      <span className="font-mono text-[9px] font-medium uppercase tracking-wide text-ink-soft/70">
                        est.
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-highlight/40 px-2.5 py-0.5 font-mono text-[11px] font-medium text-ink">
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
