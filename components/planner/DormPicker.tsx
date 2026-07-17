"use client";

import { useState } from "react";
import type { SchoolSummary } from "@/lib/types";

export default function DormPicker({
  school,
  selectedDormId,
  onSelect,
}: {
  school: SchoolSummary;
  selectedDormId: string | null;
  onSelect: (dorm: { id: string; name: string }) => void;
}) {
  const [filter, setFilter] = useState("");
  const dorms = filter.trim()
    ? school.dorms.filter((d) => d.name.toLowerCase().includes(filter.trim().toLowerCase()))
    : school.dorms;

  return (
    <div className="rise">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold tracking-tight">Pick your dorm</h2>
        <span className="font-mono text-xs text-ink-soft">{school.dorms.length} buildings</span>
      </div>

      {school.dorms.length > 12 && (
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter buildings…"
          aria-label="Filter dorm buildings"
          className="mb-3 h-11 w-full rounded-xl border border-ink/15 bg-white px-4 text-sm outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt"
        />
      )}

      <div className="max-h-72 overflow-y-auto rounded-xl border border-ink/10 bg-white p-2">
        {dorms.length === 0 ? (
          <p className="px-3 py-4 text-sm text-ink-soft">No buildings match “{filter}”.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {dorms.map((dorm) => {
              const selected = dorm.id === selectedDormId;
              return (
                <li key={dorm.id}>
                  <button
                    type="button"
                    onClick={() => onSelect({ id: dorm.id, name: dorm.name })}
                    aria-pressed={selected}
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                      selected
                        ? "border-cobalt bg-cobalt/5 text-ink"
                        : "border-transparent text-ink-soft hover:border-ink/10 hover:bg-paper hover:text-ink"
                    }`}
                  >
                    {dorm.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
