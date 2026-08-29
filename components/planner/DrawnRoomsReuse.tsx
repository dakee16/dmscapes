"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getBrowserClient } from "@/lib/supabase-browser";
import { usePlannerStore } from "@/lib/store";
import { track } from "@/lib/analytics";
import RoomThumb from "@/components/room/RoomThumb";
import { formatDims } from "@/lib/schools";
import type { AccountRoomSummary, AccountRoomsResponse } from "@/lib/api-types";

const OCC_FOR_TYPE: Record<string, number> = { single: 1, double: 2, triple: 3, quad: 4 };

/**
 * Quick-start from a room the user has already drawn: pick one and jump straight
 * to styling, keeping the exact outline but a fresh vibe/budget. Only renders for
 * a signed-in user who actually has saved drawn rooms (source "drawn" -> outline).
 */
export default function DrawnRoomsReuse() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const setRoom = usePlannerStore((s) => s.setRoom);
  const [rooms, setRooms] = useState<AccountRoomSummary[] | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    let alive = true;
    (async () => {
      try {
        const supabase = getBrowserClient();
        const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null;
        const res = await fetch("/api/account/rooms", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as AccountRoomsResponse;
        if (alive) setRooms(data.rooms.filter((r) => r.outline && r.length_ft && r.width_ft));
      } catch {
        if (alive) setRooms([]);
      }
    })();
    return () => { alive = false; };
  }, [loading, user]);

  if (!user || !rooms || rooms.length === 0) return null;

  function reuse(r: AccountRoomSummary) {
    if (!r.outline || !r.length_ft || !r.width_ft) return;
    setRoom({
      type: r.room_type,
      occupants: OCC_FOR_TYPE[r.room_type] ?? 1,
      lengthFt: r.length_ft,
      widthFt: r.width_ft,
      bedSize: "twin_xl",
      source: "drawn",
      outline: r.outline,
    });
    track("drawn_room_reused", { id: r.id });
    router.push("/plan/style");
  }

  return (
    <div>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
        Reuse a room you drew
      </p>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {rooms.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => reuse(r)}
            title={`Plan a new design for ${r.name}`}
            className="group flex w-40 shrink-0 flex-col rounded-xl border border-ink/10 bg-white p-2.5 text-left transition-colors hover:border-cobalt"
          >
            <span className="grid h-20 place-items-center overflow-hidden rounded-lg bg-paper">
              <RoomThumb
                lengthFt={r.length_ft!}
                widthFt={r.width_ft!}
                furniture={r.furniture ?? []}
                outline={r.outline}
                className="max-h-20 w-auto"
              />
            </span>
            <span className="mt-2 truncate text-sm font-semibold text-ink">{r.name}</span>
            <span className="font-mono text-[10px] uppercase tracking-wide text-ink-soft">
              {formatDims(r.length_ft, r.width_ft)} · drawn
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
