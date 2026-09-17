"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeRotation } from "./geometry";
import { pointerRotation } from "./viewport";
import s from "./CanvasStudio.module.css";

type Point = { x: number; y: number };
type Gesture = { center: Point; start: Point; initial: number; angle: number; moved: boolean; released: boolean; pointerId: number | null; touch: boolean };

export default function RotationHandle({ label, center, position, degrees, onPreview, onCommit, onCancel }: {
  label: string; center: Point; position: Point; degrees: number;
  onPreview: (degrees: number) => void; onCommit: (degrees: number) => void; onCancel: () => void;
}) {
  const [active, setActive] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  const callbacks = useRef({ onPreview, onCommit, onCancel });
  callbacks.current = { onPreview, onCommit, onCancel };

  function start(button: HTMLButtonElement, point: Point, pointerId: number | null, touch = false) {
    const bounds = button.parentElement!.getBoundingClientRect();
    gesture.current = { center: { x: bounds.left + center.x, y: bounds.top + center.y }, start: point,
      initial: degrees, angle: degrees, moved: false, released: pointerId === null, pointerId, touch };
    button.focus({ preventScroll: true });
    setActive(true);
  }

  useEffect(() => {
    if (!active) return;
    function finish(commit: boolean) {
      const current = gesture.current;
      if (!current) return;
      gesture.current = null;
      setActive(false);
      if (commit) callbacks.current.onCommit(current.angle);
      else callbacks.current.onCancel();
    }
    function move(event: PointerEvent) {
      const current = gesture.current;
      if (!current || (!current.released && current.pointerId !== event.pointerId)) return;
      const point = { x: event.clientX, y: event.clientY };
      if (Math.hypot(point.x - current.start.x, point.y - current.start.y) > 3) current.moved = true;
      if (!current.moved || Math.hypot(point.x - current.center.x, point.y - current.center.y) < 4) return;
      current.angle = pointerRotation(current.initial, current.center, current.start, point);
      callbacks.current.onPreview(current.angle);
      event.preventDefault();
    }
    function down(event: PointerEvent) {
      if (!gesture.current?.released || event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      move(event);
      finish(true);
    }
    function up(event: PointerEvent) {
      const current = gesture.current;
      if (!current || current.released || current.pointerId !== event.pointerId) return;
      move(event);
      if (current.moved || current.touch) finish(true);
      else current.released = true;
    }
    function key(event: KeyboardEvent) {
      const undo = (event.ctrlKey || event.metaKey) && ["z", "y"].includes(event.key.toLowerCase());
      if (event.key !== "Escape" && event.key !== "Enter" && !undo) return;
      event.preventDefault(); event.stopPropagation();
      finish(event.key === "Enter");
    }
    const cancel = () => finish(false);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key, true);
    window.addEventListener("blur", cancel);
    window.addEventListener("resize", cancel);
    window.addEventListener("wheel", cancel, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("resize", cancel);
      window.removeEventListener("wheel", cancel, true);
    };
  }, [active]);

  return <button type="button" className={s.rotationHandle} style={{ left: position.x, top: position.y }}
    aria-label={`Rotate ${label}`} aria-pressed={active}
    title="Drag to rotate, or click, move, then click to place. Arrow keys adjust; Escape cancels."
    onPointerDown={event => {
      if (event.button !== 0 || !event.isPrimary) return;
      event.preventDefault(); event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      start(event.currentTarget, { x: event.clientX, y: event.clientY }, event.pointerId, event.pointerType === "touch");
    }}
    onClick={event => {
      event.stopPropagation();
      if (event.detail !== 0) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      start(event.currentTarget, { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }, null);
    }}
    onKeyDown={event => {
      const direction = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key];
      if (!direction) return;
      event.preventDefault(); event.stopPropagation();
      const angle = normalizeRotation(degrees + direction * (event.shiftKey ? 15 : 1));
      if (gesture.current) { gesture.current.angle = angle; onPreview(angle); }
      else onCommit(angle);
    }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 4v6h-6m5-1a8 8 0 1 0 1 8"/></svg>
  </button>;
}
