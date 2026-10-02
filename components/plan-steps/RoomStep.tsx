"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScalePlan from "@/components/hall/ScalePlan";
import DormPicker from "@/components/planner/DormPicker";
import RoomPicker from "@/components/planner/RoomPicker";
import ManualEntry, { type ManualEntryValues } from "@/components/planner/ManualEntry";
import EstimatedDimsNote from "@/components/room/EstimatedDimsNote";
import { ArrowRight, ChevronDown } from "@/components/ds/Icons";
import { shortName } from "@/lib/school-names";
import { bedName } from "@/lib/room-preview";
import { ChevronLeft } from "./icons";
import { dimsOf, fitSelected, plural, schoolCounts } from "./room-model";
import type { RoomSummary, SchoolSummary, SelectedRoom } from "@/lib/types";
import css from "./Room.module.css";

const PIECE_NAMES: Record<string, string> = { bed: "Bed", desk: "Desk", desk_chair: "Desk chair", dresser: "Dresser" };
/** Feet for the spec list, e.g. 3.17′ (set in Archivo: the mono face has no prime). */
const feet = (n: number) => `${Math.round(n * 100) / 100}′`;

/**
 * Step 01, second half: the hall and its room types on one screen, with the
 * chosen room drawn to scale from the building's published dimensions.
 */
export default function RoomStep({
  school,
  dormId,
  selectedKey,
  catalogRoom,
  room,
  pendingDimsRoom,
  onBack,
  onDorm,
  onRoom,
  onDimsOnly,
  onNext,
}: {
  school: SchoolSummary;
  dormId: string | null;
  selectedKey: string | null;
  /** The catalog row behind the selection (closet, bed size, estimate flag). */
  catalogRoom: RoomSummary | null;
  room: SelectedRoom | null;
  pendingDimsRoom: RoomSummary | null;
  onBack: () => void;
  onDorm: (dorm: { id: string; name: string }) => void;
  onRoom: (room: RoomSummary, key: string) => void;
  onDimsOnly: (values: ManualEntryValues) => void;
  onNext: () => void;
}) {
  const dorm = school.dorms.find((d) => d.id === dormId) ?? null;
  const counts = schoolCounts(school);
  const short = shortName(school);
  const [hallsOpen, setHallsOpen] = useState(!dorm);
  useEffect(() => {
    if (!dorm) setHallsOpen(true);
  }, [dorm]);

  const fit = fitSelected(room);
  const L = fit?.lengthFt ?? 0;
  const W = fit?.widthFt ?? 0;
  const ppf = fit ? Math.min(30, 520 / (L + 1.8), 380 / (W + 1.6)) : 30;
  const pieces = (() => {
    if (!fit) return [];
    const seen = new Set<string>();
    return fit.furniture.filter((f) => !seen.has(f.type) && seen.add(f.type));
  })();
  const closet = catalogRoom?.closet ?? null;
  const roomLabel = catalogRoom?.label ?? (room ? "Your room" : "");
  const estimated = Boolean(room?.dimsEstimated);

  return (
    <div className={css.layout}>
      <aside className={css.aside} aria-label="Buildings">
        <button type="button" className={css.back} onClick={onBack}>
          <ChevronLeft />
          <span className={css.backLong}>All schools</span>
          <span className={css.backShort}>Schools</span>
        </button>
        <h2 className={css.school}>{short}</h2>
        {short !== school.name && <p className={css.schoolFull}>{school.name}</p>}
        <p className={css.counts}>
          {plural(counts.buildings, "building")} · {plural(counts.roomTypes, "room type")}
        </p>

        <button
          type="button"
          className={css.hallToggle}
          aria-expanded={hallsOpen}
          aria-controls="plan-halls"
          onClick={() => setHallsOpen((v) => !v)}
        >
          <span className={css.hallToggleText}>
            <span className={css.hallToggleLabel}>Building</span>
            <span className={css.hallToggleName}>{dorm ? dorm.name : "Choose your building"}</span>
          </span>
          <span className={css.hallToggleMeta}>
            {dorm ? plural(dorm.rooms.length, "room type") : plural(counts.buildings, "building")}
            <ChevronDown size={16} />
          </span>
        </button>
        <div id="plan-halls" className={css.hallsWrap} data-open={hallsOpen}>
          <DormPicker
            school={school}
            selectedDormId={dormId}
            onSelect={(d) => {
              onDorm(d);
              setHallsOpen(false);
            }}
          />
        </div>
      </aside>

      <div className={css.main}>
        <div className={css.head}>
          <p className={`ds-eyebrow ${css.eyebrow}`}>Step 01 · Room</p>
          <h1 className={css.title}>
            {dorm ? (
              <>
                <span className={css.titleSans}>{dorm.name}</span>{" "}
                <span className={css.titleSerif}>which room?</span>
              </>
            ) : (
              <>
                <span className={css.titleSans}>Pick your building.</span>{" "}
                <span className={css.titleSerif}>then your room.</span>
              </>
            )}
          </h1>
        </div>

        {dorm ? (
          <>
            <RoomPicker key={dorm.id} dorm={dorm} selectedKey={selectedKey} onSelect={onRoom} />

            <div className={css.stage}>
              <figure className={css.plan} aria-live="polite">
                {fit && room ? (
                  <div
                    key={`${room.lengthFt}x${room.widthFt}-${room.occupants}`}
                    className={css.planDraw}
                    style={{ "--ppf": ppf } as React.CSSProperties}
                  >
                    <ScalePlan
                      uid="plan-step-room"
                      room={fit}
                      title={`Floor plan of ${dorm.name} ${roomLabel.toLowerCase()}, ${dimsOf(L, W)}, drawn to scale with the building's standard furniture`}
                      className={css.planSvg}
                    />
                    <span className={css.scaleBar} style={{ width: `${(2 / (L + 1.75)) * 100}%` }} aria-hidden="true">
                      <span>2 ft</span>
                    </span>
                  </div>
                ) : pendingDimsRoom ? (
                  <div className={css.planManual}>
                    <ManualEntry
                      key={pendingDimsRoom.label}
                      mode="dims-only"
                      prefillType={pendingDimsRoom.type}
                      prefillOccupants={pendingDimsRoom.occupants ?? 2}
                      onSubmit={onDimsOnly}
                    />
                  </div>
                ) : (
                  <p className={css.planEmpty}>Pick a room type to see it drawn to scale.</p>
                )}
                <figcaption className={css.planCaption}>
                  {fit && room ? (
<span>{roomLabel} · drawn to scale</span>
                  ) : (
                    <span>Drawn to scale from published dimensions</span>
                  )}
                </figcaption>
              </figure>

              <div className={css.specs}>
                {pieces.length > 0 && (
                  <>
                    <p className={css.specLabel}>Standard pieces</p>
                    <dl className={css.specList}>
                      {pieces.map((p) => (
                        <div key={p.type} className={css.spec}>
                          <dt>
                            {PIECE_NAMES[p.type] ?? p.label}
                            {p.type === "bed" && room ? ` · ${bedName(room.bedSize)}` : ""}
                          </dt>
                          <dd>
                            {feet(p.width_ft)} × {feet(p.length_ft)}
                          </dd>
                        </div>
                      ))}
                      {closet && (
                        <div className={css.spec}>
                          <dt>Closet</dt>
                          <dd>
                            {feet(closet.width_ft)} × {feet(closet.depth_ft)}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <p className={css.specNote}>
                      {closet ? "Closet as published for this building. " : "Standard footprints for this room. "}
                      <Link href="/methodology">How we measure</Link>
                    </p>
                  </>
                )}
                {estimated && <EstimatedDimsNote className={css.estNote} />}

                <div className={css.cta}>
                  <div className={css.nextBar}>
                    <button type="button" className={css.next} disabled={!room} onClick={onNext}>
                      Use this room
                      <ArrowRight size={20} strokeWidth={2.8} />
                    </button>
                  </div>
                  <Link href="/plan/draw" className={css.drawLink}>
                    Draw my own room instead
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={css.pickHall}>
            <p>
              {`Choose one of ${short}'s ${plural(counts.buildings, "building")} and we'll draw its rooms to scale.`}
            </p>
            <Link href="/plan/draw" className={css.drawLink}>
              Draw my own room instead
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
