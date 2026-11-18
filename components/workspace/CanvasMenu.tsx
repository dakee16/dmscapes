"use client";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { CommentIcon } from "./RoomBar";
import s from "./Room.module.css";

export type CanvasMenuItem = { label: string; icon?: "comment" | "ping"; run: () => void };
/** The transient menu a right-click (or long press, or the Menu key) opens on the plan or the 3D room. It closes on
 * Escape, a click elsewhere, scrolling, zooming or orbiting; focus goes back to the canvas unless an item moves it. */
export default function CanvasMenu({ x, y, items, onClose }: { x: number; y: number; items: CanvasMenuItem[]; onClose: (refocus: boolean) => void }) {
  const menu = useRef<HTMLDivElement>(null), close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    menu.current?.querySelector("button")?.focus({ preventScroll: true });
    const outside = (e: Event) => { if (!menu.current?.contains(e.target as Node)) close.current(e.type !== "pointerdown"); };
    const dismiss = () => close.current(true);
    document.addEventListener("pointerdown", outside, true); addEventListener("wheel", dismiss, { capture: true, passive: true });
    addEventListener("scroll", dismiss, true); addEventListener("resize", dismiss); addEventListener("blur", dismiss);
    return () => { document.removeEventListener("pointerdown", outside, true); removeEventListener("wheel", dismiss, true); removeEventListener("scroll", dismiss, true); removeEventListener("resize", dismiss); removeEventListener("blur", dismiss); };
  }, []);
  function key(e: KeyboardEvent) {
    const buttons = [...(menu.current?.querySelectorAll("button") ?? [])], i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); e.stopPropagation(); onClose(true); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); buttons[(i + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus(); }
  }
  return <div ref={menu} role="menu" aria-label="Canvas actions" className={s.canvasMenu} onKeyDown={key} onContextMenu={e => e.preventDefault()}
    style={{ left: Math.max(8, Math.min(x, (typeof innerWidth === "number" ? innerWidth : x) - 228)), top: Math.max(8, Math.min(y, (typeof innerHeight === "number" ? innerHeight : y) - 24 - items.length * 44)) }}>
    {items.map(item => <button key={item.label} type="button" role="menuitem" onClick={item.run}>
      {item.icon === "ping" ? <span className={s.pingGlyph} aria-hidden="true" /> : <CommentIcon size={15} />}{item.label}
    </button>)}
  </div>;
}
