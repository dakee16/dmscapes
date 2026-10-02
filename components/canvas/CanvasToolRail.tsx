"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { FurnitureItem } from "@/lib/types";
import type { CanvasDock } from "./CanvasControlsContext";
import { EyeIcon, FitIcon, GridIcon, HelpIcon, MagnetIcon, MinusIcon, MoreIcon, PanIcon, PlusIcon, RedoIcon, ResetIcon, RoomIcon, RulerIcon, SelectIcon, UndoIcon, ExpandIcon } from "@/components/studio-ui/icons";
import s from "./CanvasToolRail.module.css";

export interface CanvasToolRailProps {
  dock: CanvasDock; pan: boolean; grid: boolean; labels: boolean; snap: boolean; zoom: number; roomLabel: string;
  setPan: (v: boolean) => void; toggleGrid: () => void; toggleLabels: () => void; toggleSnap: () => void; zoomTo: (v: number) => void; fit: () => void;
  undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean;
  hiddenItems: FurnitureItem[]; showItem: (id: string) => void;
}

/**
 * The plan's tool rail (Planner.dc.html): select, pan, measurements, add a
 * piece, doors and windows, zoom. On phones it's the row of icons under the
 * app bar. Less-used tools (grid, snap, focus mode, hidden pieces, help,
 * reset) live under More.
 */
export default function CanvasToolRail(p: CanvasToolRailProps) {
  const [more, setMore] = useState(false);
  const [help, setHelp] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const planner = p.dock.variant === "planner";

  useEffect(() => {
    if (!more) return;
    const outside = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setMore(false); };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setMore(false);
      wrap.current?.querySelector<HTMLButtonElement>("[aria-controls]")?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key, true); };
  }, [more]);

  const tool = (label: string, icon: ReactNode, onClick: () => void, opts: { pressed?: boolean; disabled?: boolean; className?: string; title?: string; toggle?: boolean } = {}) => (
    <button type="button" aria-label={label} title={opts.title ?? label} aria-pressed={opts.pressed} disabled={opts.disabled}
      data-toggle={opts.toggle || undefined} className={`${s.tool} ${opts.className ?? ""}`} onClick={onClick}>{icon}</button>
  );

  return (
    <div className={s.rail} data-testid="canvas-tool-rail" data-variant={p.dock.variant ?? "workspace"}>
      <div className={s.group}>
        {tool("Select and move", <SelectIcon />, () => p.setPan(false), { pressed: !p.pan, className: s.desk, title: "Select and move (V)" })}
        {tool("Pan the plan", <PanIcon />, () => p.setPan(true), { pressed: p.pan, className: s.desk, title: "Pan (H)" })}
        {tool("Labels and measurements", <RulerIcon />, p.toggleLabels, { pressed: p.labels, toggle: true })}
        {p.dock.addPiece && tool("Add a piece", <PlusIcon />, p.dock.addPiece)}
        {tool("Doors and windows", <RoomIcon />, p.dock.editOpenings, { className: s.desk, title: "Edit walls, doors and windows" })}
        {tool("Undo", <UndoIcon />, p.undo, { disabled: !p.canUndo, className: planner ? s.phone : "", title: "Undo (Ctrl/⌘ Z)" })}
        {!planner && tool("Redo", <RedoIcon />, p.redo, { disabled: !p.canRedo, className: s.desk, title: "Redo (Ctrl/⌘ Shift Z)" })}
      </div>
      <div className={s.bottom}>
        <div className={s.zoom} role="group" aria-label="Plan zoom">
          {tool("Zoom in", <PlusIcon size={18} />, () => p.zoomTo(p.zoom + 0.25), { disabled: p.zoom >= 3, className: s.small })}
          <output aria-label="Zoom level" className={s.pct}>{Math.round(p.zoom * 100)}%</output>
          {tool("Zoom out", <MinusIcon size={18} />, () => p.zoomTo(p.zoom - 0.25), { disabled: p.zoom <= 0.5, className: s.small })}
          {tool("Fit the room to the screen", <FitIcon size={18} />, p.fit, { className: s.small, title: "Fit room (0)" })}
        </div>
        <div className={s.moreWrap} ref={wrap}>
          <button type="button" className={`${s.tool} ${s.small}`} aria-label="More plan tools" title="More plan tools"
            aria-expanded={more} aria-controls={menuId} onClick={() => setMore((v) => !v)}><MoreIcon /></button>
          {more && (
            <div id={menuId} className={s.menu} role="group" aria-label="More plan tools">
              <p className={s.menuHead}>Plan · {p.roomLabel}</p>
              <div className={`${s.seg} ${s.phoneFlex}`} role="group" aria-label="Pointer">
                <button type="button" aria-pressed={!p.pan} onClick={() => p.setPan(false)}><SelectIcon size={16} />Select</button>
                <button type="button" aria-pressed={p.pan} onClick={() => p.setPan(true)}><PanIcon size={16} />Pan</button>
              </div>
              <button type="button" className={s.item} aria-pressed={p.grid} onClick={p.toggleGrid}><GridIcon size={16} />Grid<span>{p.grid ? "On" : "Off"}</span></button>
              <button type="button" className={s.item} aria-pressed={p.snap} onClick={p.toggleSnap} title="Snap to a 6-inch grid. Turn off for 1-inch positioning."><MagnetIcon size={16} />Snap to 6 inches<span>{p.snap ? "On" : "Off"}</span></button>
              <button type="button" className={`${s.item} ${s.phoneFlex}`} onClick={() => { setMore(false); p.dock.editOpenings(); }}><RoomIcon size={16} />Doors &amp; windows</button>
              {planner && <button type="button" className={`${s.item} ${s.phoneFlex}`} disabled={!p.canRedo} onClick={p.redo}><RedoIcon size={16} />Redo</button>}
              <button type="button" className={s.item} onClick={() => { setMore(false); p.dock.expand(); }}>
                <ExpandIcon size={16} />{p.dock.expanded ? "Exit fullscreen" : planner ? "Focus on the plan" : "Expand"}
              </button>
              {p.hiddenItems.length > 0 && (
                <div className={s.hidden}>
                  <p className={s.menuHead}>Hidden ({p.hiddenItems.length})</p>
                  {p.hiddenItems.map((f) => (
                    <button type="button" key={f.id} className={s.item} onClick={() => p.showItem(f.id)}><EyeIcon size={16} />Show {f.label}</button>
                  ))}
                </div>
              )}
              <button type="button" className={s.item} aria-expanded={help} onClick={() => setHelp((v) => !v)}><HelpIcon size={16} />Help &amp; keys</button>
              {help && (
                <div className={s.help}>
                  <p>Click a piece, then drag to move. Drag its round handle to rotate, or click the handle, move your cursor, then click to place.</p>
                  <p>Esc: cancel rotation · R: rotate 90° · Shift + R: rotate −90° · Arrow keys: nudge · Ctrl / ⌘ Z: undo · 0: fit · Esc: deselect</p>
                  <p>Pinch with two fingers to zoom and pan. With a mouse, use Ctrl/⌘ + scroll to zoom at the pointer.</p>
                </div>
              )}
              <button type="button" className={`${s.item} ${s.reset}`} onClick={() => { setMore(false); p.dock.reset(); }}><ResetIcon size={16} />Reset layout</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
