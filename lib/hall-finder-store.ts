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
  setDraft: (collegeId: string, draft: Draft) => void;
  addPlaces: (collegeId: string, places: DraftPlace[]) => void;
  removePlace: (collegeId: string, index: number) => void;
  setDays: (collegeId: string, index: number, days: DayMask) => void;
  /** Flip one weekday (bit) against the stored days, so quick taps don't undo each other. */
  toggleDay: (collegeId: string, index: number, bit: number) => void;
  setFilter: (collegeId: string, key: keyof Filters, on: boolean) => void;
  setIcs: (collegeId: string, ics: Draft["ics"]) => void;
}

const sameSpot = (a: DraftPlace, b: DraftPlace) =>
  a.placeId ? a.placeId === b.placeId : Boolean(a.pin && b.pin && a.pin[0] === b.pin[0] && a.pin[1] === b.pin[1]);

export const useHallFinder = create<HallFinderState>()(
  persist(
    (set) => {
      const edit = (collegeId: string, fn: (d: Draft) => Draft) =>
        set((s) => ({ drafts: { ...s.drafts, [collegeId]: fn(s.drafts[collegeId] ?? EMPTY_DRAFT) } }));
      return {
        drafts: {},
        setDraft: (collegeId, draft) => edit(collegeId, () => draft),
        // The same building twice merges its days rather than listing it twice.
        addPlaces: (collegeId, places) =>
          edit(collegeId, (d) => {
            const next = [...d.places];
            for (const p of places) {
              const at = next.findIndex((q) => sameSpot(q, p));
              if (at >= 0) next[at] = { ...next[at], days: next[at].days | p.days };
              else if (next.length < MAX_PLACES) next.push(p);
            }
            return { ...d, places: next };
          }),
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
