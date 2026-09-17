"use client";

import { normalizeRotation } from "./geometry";
import s from "./RotationControl.module.css";

export default function RotationControl({ degrees, disabled, onCommit }: {
  degrees: number; disabled?: boolean; onCommit: (degrees: number) => void;
}) {
  const angle = Math.round(normalizeRotation(degrees) * 1000) / 1000;
  return <label className={s.control}>Angle
    <span><input key={degrees} aria-label="Rotation angle in degrees" title="Enter any angle; press Enter or leave the field to apply"
      type="number" inputMode="decimal" step="any" defaultValue={angle} disabled={disabled}
      onBlur={event => {
        const value = event.currentTarget.valueAsNumber;
        if (Number.isFinite(value)) {
          onCommit(value);
          event.currentTarget.value = String(Math.round(normalizeRotation(value) * 1000) / 1000);
        } else event.currentTarget.value = String(angle);
      }}
      onKeyDown={event => {
        if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
        if (event.key === "Escape") { event.currentTarget.value = String(angle); event.currentTarget.blur(); }
      }}/><span aria-hidden="true">°</span></span>
  </label>;
}
