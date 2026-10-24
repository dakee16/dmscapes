"use client";

// The Hall Finder draft, one per college: places with days, filters, the last schedule
// read. Persisted to localStorage (not sessionStorage) because email verification opens
// a new tab, and mirrored to ?s= by the finder so Google's redirect carries it too.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MAX_PLACES, NO_FILTERS, type DayMask, type Draft, type DraftPlace, type Filters } from "./hall-finder";

export const EMPTY_DRAFT: Draft = { places: [], filters: NO_FILTERS };

interface HallFinderState {
  drafts: Record<string, Draft>;
  /** The saved setup (Plus and Pro) this browser's draft autosaves into, per college. */
  setupIds: Record<string, string>;
  setSetupId: (collegeId: string, id: string | null) => void;
  setDraft: (collegeId: string, draft: Draft) => void;
  /** "append" (the default for the picker) always adds a new entry; "merge" (schedules) folds days into a building already listed. */
  addPlaces: (collegeId: string, places: DraftPlace[], how?: "append" | "merge") => void;
  removePlace: (collegeId: string, index: number) => void;
  setDays: (collegeId: string, index: number, days: DayMask) => void;
  /** Flip one weekday (bit) against the stored days, so quick taps don't undo each other. */
  toggleDay: (collegeId: string, index: number, bit: number) => void;
  setFilter: (collegeId: string, key: keyof Filters, on: boolean) => void;
  setIcs: (collegeId: string, ics: Draft["ics"]) => void;
}

const sameSpot = (a: DraftPlace, b: DraftPlace) =>
  a.placeId ? a.placeId === b.placeId : Boolean(a.pin && b.pin && a.pin[0] === b.pin[0] && a.pin[1] === b.pin[1]);

/** Add places as new entries, even for a building already listed (two classes in one building,
 *  or going home between them, are two trips). */
export function appendPlaces(list: DraftPlace[], places: DraftPlace[]): DraftPlace[] {
  return [...list, ...places].slice(0, MAX_PLACES);
}

/** Add places from a schedule: a building already listed has its days merged in, so back-to-back
 *  classes in one building count as one trip a day rather than several. */
export function mergePlaces(list: DraftPlace[], places: DraftPlace[]): DraftPlace[] {
  const next = [...list];
  for (const p of places) {
    const at = next.findIndex((q) => sameSpot(q, p));
    if (at >= 0) next[at] = { ...next[at], days: next[at].days | p.days };
    else if (next.length < MAX_PLACES) next.push(p);
  }
  return next;
}

export const useHallFinder = create<HallFinderState>()(
  persist(
    (set) => {
      const edit = (collegeId: string, fn: (d: Draft) => Draft) =>
        set((s) => ({ drafts: { ...s.drafts, [collegeId]: fn(s.drafts[collegeId] ?? EMPTY_DRAFT) } }));
      return {
        drafts: {},
        setupIds: {},
        setSetupId: (collegeId, id) =>
          set((s) => {
            const next = { ...s.setupIds };
            if (id) next[collegeId] = id;
            else delete next[collegeId];
            return { setupIds: next };
          }),
        setDraft: (collegeId, draft) => edit(collegeId, () => draft),
        addPlaces: (collegeId, places, how = "append") => edit(collegeId, (d) => ({ ...d, places: (how === "merge" ? mergePlaces : appendPlaces)(d.places, places) })),
        removePlace: (collegeId, index) => edit(collegeId, (d) => ({ ...d, places: d.places.filter((_, i) => i !== index) })),
        setDays: (collegeId, index, days) => edit(collegeId, (d) => ({ ...d, places: d.places.map((p, i) => (i === index ? { ...p, days } : p)) })),
        toggleDay: (collegeId, index, bit) => edit(collegeId, (d) => ({ ...d, places: d.places.map((p, i) => (i === index ? { ...p, days: p.days ^ (1 << bit) } : p)) })),
        setFilter: (collegeId, key, on) => edit(collegeId, (d) => ({ ...d, filters: { ...d.filters, [key]: on } })),
        setIcs: (collegeId, ics) => edit(collegeId, (d) => ({ ...d, ics })),
      };
    },
    { name: "dormscape-hall-finder-v1", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
