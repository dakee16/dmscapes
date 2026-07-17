"use client";

import { useEffect, useRef, useState } from "react";
import { searchSchools } from "@/lib/schools";
import type { SchoolSummary } from "@/lib/types";

export default function CollegeSearch({
  selectedName,
  onSelect,
  onNoMatches,
}: {
  selectedName: string | null;
  onSelect: (school: SchoolSummary) => void;
  onNoMatches?: () => void;
}) {
  const [query, setQuery] = useState(selectedName ?? "");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep the input in sync when a selection is restored from the store.
  useEffect(() => {
    if (selectedName) setQuery(selectedName);
  }, [selectedName]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const results = searchSchools(query).slice(0, 8);

  function choose(school: SchoolSummary) {
    onSelect(school);
    setQuery(school.name);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIdx]) choose(results[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor="college-search" className="sr-only">
        Search your college
      </label>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          id="college-search"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="college-results"
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Search your college…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIdx(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-13 w-full rounded-xl border border-ink/15 bg-white py-3.5 pl-11 pr-4 text-base text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt"
        />
      </div>

      {open && (
        <ul
          id="college-results"
          role="listbox"
          aria-label="Matching colleges"
          className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-ink/10 bg-white py-1.5 shadow-[0_16px_40px_-20px_rgba(23,23,43,0.35)]"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-soft">
              No matches —{" "}
              <button
                type="button"
                className="font-semibold text-cobalt underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(false);
                  onNoMatches?.();
                }}
              >
                request your school
              </button>{" "}
              and we&apos;ll add it.
            </li>
          ) : (
            results.map((school, i) => (
              <li key={school.id} role="option" aria-selected={i === activeIdx}>
                <button
                  type="button"
                  onClick={() => choose(school)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`flex w-full items-baseline justify-between gap-3 px-4 py-3 text-left transition-colors ${
                    i === activeIdx ? "bg-cobalt/5" : ""
                  }`}
                >
                  <span className="text-[15px] font-medium text-ink">{school.name}</span>
                  {school.city && (
                    <span className="shrink-0 text-xs text-ink-soft">
                      {school.city}, {school.state}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
