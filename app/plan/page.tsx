"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CollegeSearch from "@/components/planner/CollegeSearch";
import DormPicker from "@/components/planner/DormPicker";
import RoomPicker, { roomKey } from "@/components/planner/RoomPicker";
import ManualEntry, { type ManualEntryValues } from "@/components/planner/ManualEntry";
import RequestSchoolModal from "@/components/planner/RequestSchoolModal";
import DrawnRoomsReuse from "@/components/planner/DrawnRoomsReuse";
import { track } from "@/lib/analytics";
import { roomTypeLabel } from "@/lib/format";
import { getSchool, formatDims } from "@/lib/schools";
import { usePlannerStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { isPaid } from "@/lib/plan";
import EstimatedDimsNote from "@/components/room/EstimatedDimsNote";
import type { RoomSummary, SchoolSummary } from "@/lib/types";

let flowTracked = false;

export default function PlanSelectPage() {
  const router = useRouter();
  const college = usePlannerStore((s) => s.college);
  const dorm = usePlannerStore((s) => s.dorm);
  const room = usePlannerStore((s) => s.room);
  const setCollege = usePlannerStore((s) => s.setCollege);
  const setDorm = usePlannerStore((s) => s.setDorm);
  const setRoom = usePlannerStore((s) => s.setRoom);
  const { profile, loading: authLoading } = useAuth();
  const { openUpgrade } = useUpgrade();
  // "Draw your own room" is a Plus feature (Plus + Pro): free/flex/logged-out
  // see the lock and get the upgrade modal on click.
  const drawLocked = !authLoading && !isPaid(profile);

  function handleDraw() {
    if (drawLocked) {
      track("draw_room_locked_clicked");
      openUpgrade("draw-room");
      return;
    }
    track("draw_room_opened");
    router.push("/plan/draw");
  }

  const [mounted, setMounted] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [pendingDimsRoom, setPendingDimsRoom] = useState<RoomSummary | null>(null);
  const [selectedRoomKey, setSelectedRoomKey] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!flowTracked) {
      flowTracked = true;
      track("flow_started");
    }
  }, []);

  const school = useMemo(
    () => (college?.id ? getSchool(college.id) : undefined),
    [college?.id]
  );
  const dormSummary = useMemo(
    () => school?.dorms.find((d) => d.id === dorm?.id),
    [school, dorm?.id]
  );

  function handleCollege(next: SchoolSummary) {
    setManualOpen(false);
    setPendingDimsRoom(null);
    setSelectedRoomKey(null);
    setCollege({ id: next.id, name: next.name });
    track("college_selected", { college_id: next.id });
  }

  function handleRoom(next: RoomSummary, key: string) {
    setSelectedRoomKey(key);
    if (next.length_ft && next.width_ft) {
      setPendingDimsRoom(null);
      setRoom({
        type: next.type,
        occupants: next.occupants ?? 2,
        lengthFt: next.length_ft,
        widthFt: next.width_ft,
        bedSize: next.bed_size ?? "twin_xl",
        source: "catalog",
        dimsEstimated: next.dims_estimated ?? false,
      });
    } else {
      setRoom(null);
      setPendingDimsRoom(next);
    }
  }

  function handleManual(values: ManualEntryValues) {
    setCollege({ id: null, name: values.collegeName || "My school" });
    setDorm(null);
    setRoom({
      type: values.roomType,
      occupants: values.occupants,
      lengthFt: values.lengthFt,
      widthFt: values.widthFt,
      bedSize: "twin_xl", // user's own school; bed size unknown, assume standard
      source: "manual",
    });
    setPendingDimsRoom(null);
    setSelectedRoomKey(null);
  }

  function handleDimsOnly(values: ManualEntryValues) {
    setRoom({
      type: values.roomType,
      occupants: values.occupants,
      lengthFt: values.lengthFt,
      widthFt: values.widthFt,
      // keep the catalog room's known bed size, these schools publish no
      // dimensions, so every bed-size exception arrives through this path
      bedSize: pendingDimsRoom?.bed_size ?? "twin_xl",
      source: "manual",
    });
    setPendingDimsRoom(null);
  }

  if (!mounted) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-5 sm:px-8" aria-busy="true" aria-label="Loading planner">
        <div className="h-9 w-3/4 animate-pulse rounded-lg bg-ink/8" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-ink/8" />
        <div className="h-13 animate-pulse rounded-xl bg-ink/8" />
        <div className="h-40 animate-pulse rounded-xl bg-ink/8" />
      </div>
    );
  }

  const confirmDims = room ? formatDims(room.lengthFt, room.widthFt) : null;

  return (
    <div className="mx-auto max-w-2xl px-5 pb-36 sm:px-8 sm:pb-24">
      <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
        Step 1 · Your room
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Find your <span className="hl">exact dorm</span>
      </h1>
      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-soft">
        We&apos;ve measured the rooms so you don&apos;t have to. Pick your school, building,
        and room type.
      </p>

      <div className="mt-7 space-y-6">
        <CollegeSearch
          selectedName={college?.id ? college.name : null}
          onSelect={handleCollege}
          onNoMatches={() => setRequestOpen(true)}
        />

        {school && (
          <DormPicker
            school={school}
            selectedDormId={dorm?.id ?? null}
            onSelect={(d) => {
              setDorm(d);
              setPendingDimsRoom(null);
              setSelectedRoomKey(null);
            }}
          />
        )}

        {school && dormSummary && (
          <RoomPicker dorm={dormSummary} selectedKey={selectedRoomKey} onSelect={handleRoom} />
        )}

        {pendingDimsRoom && (
          <ManualEntry
            mode="dims-only"
            prefillType={pendingDimsRoom.type}
            prefillOccupants={pendingDimsRoom.occupants ?? 2}
            onSubmit={handleDimsOnly}
          />
        )}

        {room && (
          <div className="snap-in flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-cobalt/30 bg-cobalt/5 px-4 py-3.5">
            <svg className="h-5 w-5 shrink-0 text-cobalt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="min-w-0 text-sm font-semibold text-ink">
              {[college?.name, dorm?.name, roomTypeLabel(room)].filter(Boolean).join(" · ")}
            </span>
            {confirmDims && (
              <span className="whitespace-nowrap font-mono text-sm font-semibold text-cobalt">
                {confirmDims}
              </span>
            )}
            {room.dimsEstimated && (
              <EstimatedDimsNote className="basis-full" />
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setManualOpen((v) => !v);
              setPendingDimsRoom(null);
            }}
            className="font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-4 transition-colors hover:text-cobalt"
          >
            Enter my room size manually
          </button>
          <button
            type="button"
            onClick={() => setRequestOpen(true)}
            className="text-ink-soft underline-offset-4 transition-colors hover:text-cobalt hover:underline"
          >
            Add my school
          </button>
        </div>

        {manualOpen && <ManualEntry mode="school" onSubmit={handleManual} />}

        {/* Alternative path, given its own prominence as a headline new feature:
            hand-draw any room outline (Plus). */}
        <div className="pt-2">
          <div className="mb-4 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-ink/10" />
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
              or
            </span>
            <span className="h-px flex-1 bg-ink/10" />
          </div>
          <button
            type="button"
            onClick={handleDraw}
            className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-cobalt/30 bg-gradient-to-br from-cobalt/[0.08] via-white to-highlight/[0.14] p-5 text-left shadow-[0_18px_44px_-28px_rgba(43,78,255,0.5)] transition-all hover:-translate-y-0.5 hover:border-cobalt/60 hover:shadow-[0_24px_52px_-26px_rgba(43,78,255,0.6)] sm:p-6"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-cobalt text-white shadow-[0_10px_24px_-10px_rgba(43,78,255,0.7)] sm:h-14 sm:w-14" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-display text-lg font-extrabold tracking-tight text-ink sm:text-xl">
                  Draw your own room
                </span>
                <span className="inline-flex items-center rounded-full bg-cobalt px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-white">
                  New
                </span>
                {drawLocked && (
                  <span className="inline-flex items-center rounded-full bg-highlight px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-ink">
                    Plus
                  </span>
                )}
              </span>
              <span className="mt-1 block text-sm leading-snug text-ink-soft">
                Not on the list, or an odd shape? Sketch your exact floor plan,
                even an L-shape, with doors, windows, and closets, and we fit a
                full layout to it.
              </span>
            </span>
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-cobalt transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14m0 0l-5-5m5 5l-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Quick-start from a room this user has already drawn (signed-in only). */}
        <DrawnRoomsReuse />
      </div>

      {/* Next: sticky on mobile, inline on desktop */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/8 bg-paper/92 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:z-auto sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button
          type="button"
          disabled={!room}
          onClick={() => router.push("/plan/style")}
          className="h-13 w-full cursor-pointer rounded-xl bg-cobalt text-base font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink-soft sm:h-12 sm:w-auto sm:px-10"
        >
          Next: pick your style →
        </button>
      </div>

      <RequestSchoolModal open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  );
}
