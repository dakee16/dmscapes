"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CollegeSearch from "@/components/planner/CollegeSearch";
import DormPicker from "@/components/planner/DormPicker";
import RoomPicker, { roomKey } from "@/components/planner/RoomPicker";
import ManualEntry, { type ManualEntryValues } from "@/components/planner/ManualEntry";
import RequestSchoolModal from "@/components/planner/RequestSchoolModal";
import { track } from "@/lib/analytics";
import { roomTypeLabel } from "@/lib/format";
import { getSchool, formatDims } from "@/lib/schools";
import { usePlannerStore } from "@/lib/store";
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
      // keep the catalog room's known bed size — these schools publish no
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
