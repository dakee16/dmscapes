"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import BrandLoader from "@/components/site/BrandLoader";
import SchoolStep from "@/components/plan-steps/SchoolStep";
import RoomStep from "@/components/plan-steps/RoomStep";
import ResumeRoom from "@/components/plan-steps/ResumeRoom";
import { roomKey } from "@/components/planner/RoomPicker";
import type { ManualEntryValues } from "@/components/planner/ManualEntry";
import RequestSchoolModal from "@/components/planner/RequestSchoolModal";
import { track } from "@/lib/analytics";
import { getSchool } from "@/lib/schools";
import { usePlannerStore } from "@/lib/store";
import { RECOVERY_KEY } from "@/lib/planner-storage";
import type { RoomSummary, SchoolSummary, SelectedRoom } from "@/lib/types";
import css from "@/components/plan-steps/Page.module.css";

let flowTracked = false;

/**
 * Before first paint on a full page load: does this visitor have a planner to
 * restore (a stored school or room, or a ?school= link)? Then the School step
 * the server sent isn't what they'll see, so show the loader until the store
 * is applied, as before. Fresh visitors and crawlers get the School step as is.
 * Mirrors plannerStorage: the tab's draft, else a recovery copy with a room.
 */
const RESTORE_GATE = `try{var d=document.currentScript.parentElement,t=JSON.parse(sessionStorage.getItem("dormscape-planner")||"null"),s=t&&t.state;if(!s){var r=JSON.parse(localStorage.getItem("${RECOVERY_KEY}")||"null");s=r&&r.state&&r.state.room&&Array.isArray(r.state.furniture)?r.state:null}if((s&&((s.college&&s.college.id)||s.room))||/[?&]school=/.test(location.search))d.setAttribute("data-restoring","")}catch(e){}`;

/** The same check on a client-side visit, where the store is already in memory. */
function hasPlannerToRestore() {
  const s = usePlannerStore.getState();
  return Boolean(s.college?.id || s.room || new URLSearchParams(window.location.search).get("school"));
}

const noSubscribe = () => () => {};

/** Which catalog row (if any) the stored room came from, so a return visit shows it chosen. */
function keyForStoredRoom(rooms: RoomSummary[], room: SelectedRoom | null): string | null {
  if (!room || room.source !== "catalog") return null;
  const i = rooms.findIndex(
    (r) =>
      r.type === room.type &&
      ((r.length_ft === room.lengthFt && r.width_ft === room.widthFt) ||
        (r.length_ft === room.widthFt && r.width_ft === room.lengthFt))
  );
  return i >= 0 ? roomKey(rooms[i], i) : null;
}

export default function PlanSelectPage() {
  const router = useRouter();
  const college = usePlannerStore((s) => s.college);
  const dorm = usePlannerStore((s) => s.dorm);
  const room = usePlannerStore((s) => s.room);
  const setCollege = usePlannerStore((s) => s.setCollege);
  const setDorm = usePlannerStore((s) => s.setDorm);
  const setRoom = usePlannerStore((s) => s.setRoom);

  // `ready` once the stored planner (and any ?school= link) is applied. Until
  // then the page renders exactly what the server sent: the School step.
  const [ready, setReady] = useState(false);
  // False while rendering on the server and while hydrating; true on a client-side visit.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const restoring = hydrated && !ready && hasPlannerToRestore();
  const root = useRef<HTMLDivElement>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [showSchools, setShowSchools] = useState(false);
  const [pendingDimsRoom, setPendingDimsRoom] = useState<RoomSummary | null>(null);
  const [selectedRoomKey, setSelectedRoomKey] = useState<string | null>(null);

  useEffect(() => {
    setReady(true);
    if (!flowTracked) {
      flowTracked = true;
      track("flow_started");
    }
    // Deep link from the college / residence-hall pages:
    // /plan?school=penn-state&dorm=atherton-hall preselects the school (and
    // building) so those pages hand off with the student's context intact.
    // Read from location rather than useSearchParams so this page keeps
    // rendering statically (same pattern as the Step 2 auth-gate resume).
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if (view === "2d" || view === "3d") usePlannerStore.getState().setPlannerView(view);
    const schoolId = params.get("school");
    if (!schoolId) {
      // A return visit: show the stored catalog room as chosen.
      const s = usePlannerStore.getState();
      const d = s.college?.id ? getSchool(s.college.id)?.dorms.find((x) => x.id === s.dorm?.id) : undefined;
      if (d) setSelectedRoomKey(keyForStoredRoom(d.rooms, s.room));
      return;
    }
    const s = getSchool(schoolId);
    if (!s) return;
    setCollege({ id: s.id, name: s.name });
    const dormId = params.get("dorm");
    const d = dormId ? s.dorms.find((x) => x.id === dormId) : undefined;
    if (d) setDorm({ id: d.id, name: d.name });
  }, [setCollege, setDorm]);

  const school = useMemo(() => (college?.id ? getSchool(college.id) : undefined), [college?.id]);
  const dormSummary = useMemo(() => school?.dorms.find((d) => d.id === dorm?.id), [school, dorm?.id]);
  const view: "school" | "room" = ready && school && !showSchools ? "room" : "school";

  // Back to the top when the step changes, or when a restored Room step replaces
  // the loader; a visitor already reading the server-rendered School step stays put.
  const shownView = useRef<"school" | "room" | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (shownView.current !== view && (shownView.current !== null || view !== "school")) window.scrollTo(0, 0);
    shownView.current = view;
  }, [view, ready]);
  // The restored view is committed: lift the full-load gate before it paints.
  useLayoutEffect(() => {
    if (ready) root.current?.removeAttribute("data-restoring");
  }, [ready]);

  function handleCollege(next: SchoolSummary) {
    setPendingDimsRoom(null);
    setShowSchools(false);
    // Picking the same school again keeps the building and room already chosen.
    if (next.id !== college?.id) {
      setSelectedRoomKey(null);
      setCollege({ id: next.id, name: next.name });
    }
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

  const catalogRoom = (() => {
    if (!dormSummary || !selectedRoomKey) return pendingDimsRoom;
    const i = dormSummary.rooms.findIndex((r, idx) => roomKey(r, idx) === selectedRoomKey);
    return i >= 0 ? dormSummary.rooms[i] : null;
  })();

  return (
    // display: contents, so the wrapper never affects layout. The gate script
    // marks it on a full load; React only sets data-restoring on client visits.
    <div ref={root} className={css.restore} data-restoring={restoring || undefined} suppressHydrationWarning>
      {!hydrated && <script dangerouslySetInnerHTML={{ __html: RESTORE_GATE }} suppressHydrationWarning />}
      <div className={`${css.loading} ${css.restoreLoader}`}>
        <BrandLoader label="Opening your planner…" />
      </div>
      <div className={css.restoreStep}>
        {view === "room" && school ? (
          <RoomStep
            school={school}
            dormId={dorm?.id ?? null}
            selectedKey={selectedRoomKey}
            catalogRoom={catalogRoom}
            room={room}
            pendingDimsRoom={pendingDimsRoom}
            onBack={() => setShowSchools(true)}
            onDorm={(d) => {
              if (d.id !== dorm?.id) {
                setDorm(d);
                setPendingDimsRoom(null);
                setSelectedRoomKey(null);
              }
            }}
            onRoom={handleRoom}
            onDimsOnly={handleDimsOnly}
            onNext={() => router.push("/plan/style")}
          />
        ) : (
          <SchoolStep
            onSelect={handleCollege}
            onRequest={() => setRequestOpen(true)}
            onManual={handleManual}
            resume={
              ready && room ? (
                <ResumeRoom
                  college={college}
                  dorm={dorm}
                  room={room}
                  onUse={() => router.push("/plan/style")}
                  onEdit={school ? () => setShowSchools(false) : undefined}
                />
              ) : null
            }
          />
        )}
      </div>
      <RequestSchoolModal open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  );
}
