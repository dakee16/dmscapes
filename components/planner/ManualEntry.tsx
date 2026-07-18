"use client";

import { useState } from "react";

const ROOM_TYPES = ["single", "double", "triple", "suite"] as const;

export interface ManualEntryValues {
  collegeName?: string;
  roomType: string;
  occupants: number;
  lengthFt: number;
  widthFt: number;
}

/**
 * Manual dimensions form. Two modes:
 * - "school": full form incl. college name ("My school isn't listed")
 * - "dims-only": just length/width for a catalog room whose size isn't published
 */
export default function ManualEntry({
  mode,
  prefillType,
  prefillOccupants,
  onSubmit,
}: {
  mode: "school" | "dims-only";
  prefillType?: string;
  prefillOccupants?: number;
  onSubmit: (values: ManualEntryValues) => void;
}) {
  const [collegeName, setCollegeName] = useState("");
  const [roomType, setRoomType] = useState(prefillType ?? "double");
  const [occupants, setOccupants] = useState(prefillOccupants ?? 2);
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lengthFt = parseFloat(length);
    const widthFt = parseFloat(width);
    if (
      Number.isNaN(lengthFt) ||
      Number.isNaN(widthFt) ||
      lengthFt < 4 ||
      lengthFt > 60 ||
      widthFt < 4 ||
      widthFt > 60
    ) {
      setError("Enter room sides between 4 and 60 feet.");
      return;
    }
    setError("");
    onSubmit({
      collegeName: mode === "school" ? collegeName.trim() || undefined : undefined,
      roomType,
      occupants,
      lengthFt,
      widthFt,
    });
  }

  const inputCls =
    "h-12 w-full rounded-xl border border-ink/15 bg-white px-4 text-base text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt";

  return (
    <form
      onSubmit={handleSubmit}
      className="rise rounded-xl border border-ink/10 bg-white p-4 sm:p-5"
    >
      {mode === "dims-only" ? (
        <p className="mb-4 text-sm leading-relaxed text-ink-soft">
          Your school doesn&apos;t publish this room&apos;s size. Grab a tape measure, ask
          your RA, or estimate. Close is good enough.
        </p>
      ) : (
        <p className="mb-4 text-sm leading-relaxed text-ink-soft">
          No problem. Tell us about your room and we&apos;ll plan around your exact
          measurements.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {mode === "school" && (
          <div className="col-span-2">
            <label htmlFor="me-college" className="mb-1.5 block text-sm font-medium">
              College <span className="font-normal text-ink-soft">(optional)</span>
            </label>
            <input
              id="me-college"
              type="text"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="e.g. University of Washington"
              className={inputCls}
            />
          </div>
        )}

        <div>
          <label htmlFor="me-length" className="mb-1.5 block text-sm font-medium">
            Length (ft)
          </label>
          <input
            id="me-length"
            type="number"
            inputMode="decimal"
            min={4}
            max={60}
            step="0.1"
            required
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="15"
            className={`${inputCls} font-mono`}
          />
        </div>
        <div>
          <label htmlFor="me-width" className="mb-1.5 block text-sm font-medium">
            Width (ft)
          </label>
          <input
            id="me-width"
            type="number"
            inputMode="decimal"
            min={4}
            max={60}
            step="0.1"
            required
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            placeholder="12"
            className={`${inputCls} font-mono`}
          />
        </div>

        {mode === "school" && (
          <>
            <div>
              <label htmlFor="me-type" className="mb-1.5 block text-sm font-medium">
                Room type
              </label>
              <select
                id="me-type"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className={`${inputCls} appearance-none pr-9`}
              >
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="me-occ" className="mb-1.5 block text-sm font-medium">
                Roommates total
              </label>
              <select
                id="me-occ"
                value={occupants}
                onChange={(e) => setOccupants(Number(e.target.value))}
                className={`${inputCls} appearance-none pr-9`}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "person" : "people"}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-[#c2321e]" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="mt-4 h-12 w-full cursor-pointer rounded-xl bg-cobalt px-6 text-base font-semibold text-white transition-colors hover:bg-cobalt-deep sm:w-auto"
      >
        Use these dimensions
      </button>
    </form>
  );
}
