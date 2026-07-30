"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import RoomThumb from "@/components/room/RoomThumb";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { isPlus } from "@/lib/plan";
import { getBrowserClient } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import { getSchool, formatDims } from "@/lib/schools";
import { styleById } from "@/lib/styles";
import { formatRoomType } from "@/lib/format";
import type { AccountRoomSummary, AccountRoomsResponse } from "@/lib/api-types";

function detailsOf(room: AccountRoomSummary) {
  const school = room.college_id ? getSchool(room.college_id) : undefined;
  const dorm = school?.dorms.find((d) => d.id === room.dorm_id);
  return {
    place: [school?.name, dorm?.name].filter(Boolean).join(" · ") || "Custom room",
    style: styleById(room.style).name,
    roomType: formatRoomType(room.room_type),
    dims: formatDims(room.length_ft, room.width_ft),
    budget: room.budget,
  };
}

function DesignColumn({
  designs,
  value,
  onChange,
  label,
}: {
  designs: AccountRoomSummary[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const room = designs.find((d) => d.id === value);
  const meta = room ? detailsOf(room) : null;

  return (
    <div className="flex flex-col rounded-2xl border border-ink/10 bg-card p-5">
      <label className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-ink/15 bg-white px-3 text-sm font-semibold text-ink outline-none transition-colors focus:border-cobalt"
      >
        {designs.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      {room && meta && (
        <div className="mt-4">
          <div className="overflow-hidden rounded-xl border border-ink/10 bg-white p-2">
            {room.length_ft && room.width_ft && room.furniture?.length ? (
              <RoomThumb
                lengthFt={room.length_ft}
                widthFt={room.width_ft}
                furniture={room.furniture}
                className="h-auto w-full"
              />
            ) : (
              <div className="grid h-28 place-items-center rounded bg-paper text-sm text-ink-soft">
                No layout preview
              </div>
            )}
          </div>

          <dl className="mt-4 space-y-0">
            {[
              ["Budget", `$${room.budget}`],
              ["Style", meta.style],
              ["School", meta.place],
              ["Room", meta.roomType],
              ["Size", meta.dims ?? "Not set"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-baseline justify-between gap-3 border-b border-ink/8 py-2.5 last:border-0"
              >
                <dt className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  {k}
                </dt>
                <dd className="text-right text-sm font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <Link
            href={`/room/${room.id}`}
            className="mt-4 inline-block text-sm font-semibold text-cobalt underline decoration-highlight decoration-2 underline-offset-2"
          >
            Open this design
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  const router = useRouter();
  const { user, profile, loading, openAuthModal } = useAuth();
  const { openUpgrade } = useUpgrade();
  const plus = isPlus(profile);

  const [designs, setDesigns] = useState<AccountRoomSummary[] | null>(null);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const guardedRef = useRef(false);
  const promptedRef = useRef(false);

  // Logged-out visitors go home and get the login prompt.
  useEffect(() => {
    if (loading || user || guardedRef.current) return;
    guardedRef.current = true;
    router.replace("/");
    openAuthModal("profile");
  }, [loading, user, router, openAuthModal]);

  // Logged-in free users see the upgrade prompt (once).
  useEffect(() => {
    if (loading || !user || plus || promptedRef.current) return;
    promptedRef.current = true;
    openUpgrade("compare");
  }, [loading, user, plus, openUpgrade]);

  // Plus users: load the design library.
  useEffect(() => {
    if (loading || !user || !plus) return;
    let alive = true;
    (async () => {
      try {
        const supabase = getBrowserClient();
        const token = supabase
          ? (await supabase.auth.getSession()).data.session?.access_token
          : null;
        const res = await fetch("/api/account/rooms", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as AccountRoomsResponse;
        if (!alive) return;
        setDesigns(data.rooms);
        if (data.rooms[0]) setAId(data.rooms[0].id);
        if (data.rooms[1]) setBId(data.rooms[1].id);
        track("designs_compared", { count: data.rooms.length });
      } catch {
        if (alive) setDesigns([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loading, user, plus]);

  const ready = !loading && Boolean(user);

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Saved designs
        </Link>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Compare designs
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Put two of your saved rooms side by side before you commit to one.
        </p>

        {!ready ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2" aria-busy="true">
            <div className="h-80 animate-pulse rounded-2xl bg-ink/8" />
            <div className="h-80 animate-pulse rounded-2xl bg-ink/8" />
          </div>
        ) : !plus ? (
          <div className="mt-8 rounded-2xl border border-ink/10 bg-card p-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-highlight px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
              <span className="font-display text-sm font-extrabold leading-none">+</span>
              Plus feature
            </span>
            <h2 className="mt-4 font-display text-xl font-bold tracking-tight">
              Comparison is part of Plus
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">
              Upgrade once and line up any two of your designs, budgets and all,
              to settle the debate.
            </p>
            <Link
              href="/pricing"
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-cobalt"
            >
              See what Plus unlocks
            </Link>
          </div>
        ) : designs === null ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2" aria-busy="true">
            <div className="h-80 animate-pulse rounded-2xl bg-ink/8" />
            <div className="h-80 animate-pulse rounded-2xl bg-ink/8" />
          </div>
        ) : designs.length < 2 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-white px-6 py-12 text-center">
            <h2 className="font-display text-xl font-bold tracking-tight">
              Save two designs to compare
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">
              You have {designs.length} saved. Plan another room, save it, and
              come back to lay them side by side.
            </p>
            <Link
              href="/plan"
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-cobalt"
            >
              Plan another room
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <DesignColumn designs={designs} value={aId} onChange={setAId} label="Design A" />
            <DesignColumn designs={designs} value={bId} onChange={setBId} label="Design B" />
          </div>
        )}
      </main>
    </div>
  );
}
