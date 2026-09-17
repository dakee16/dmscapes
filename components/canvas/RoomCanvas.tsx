"use client";

import {
  type KeyboardEvent,
  useId,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Stage, Layer, Group, Rect, Line, Arc, Text } from "react-konva";
import Konva from "konva";

// Cap the canvas backing-store resolution. High-DPR phones (devicePixelRatio 2-3)
// otherwise rasterize 2-3x the pixels on every drag/zoom/pinch redraw, which is a
// real mobile lag source; 2x keeps retina crispness while halving work on 3x screens.
if (typeof window !== "undefined") {
  Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
}
import type { KonvaEventObject } from "konva/lib/Node";
import type { FurnitureItem, ProductCategory, RoomOutline } from "@/lib/types";
import { CATEGORY_COLORS, styleById } from "@/lib/styles";
import { usePlannerStore } from "@/lib/store";
import { furnitureCategory } from "@/lib/highlight";
import { bedLabel, isBunkBed } from "@/lib/bedding";
import { clamp, footprint, invalidItems, layerOf, pointInPolygon, rotateFurniture } from "./geometry";

import { createPortal } from "react-dom";
import { useCanvasDock } from "./CanvasControlsContext";
import CanvasToolRail from "./CanvasToolRail";
import FurnitureGlyph from "./FurnitureGlyph";
import RotationHandle from "./RotationHandle";
import { feetLabel, fitViewport, placedCoordinate, zoomAt } from "./viewport";
import styles from "./CanvasStudio.module.css";

function Icon({ path }: { path: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>;
}

export interface RoomCanvasHandle {
  /** PNG data URL of the current layout with a Dormscape watermark. */
  exportPNG: () => string | null;
}

interface RoomCanvasProps {
  roomL: number;
  roomW: number;
  templateId: string | null;
  furniture: FurnitureItem[];
  /** Optional closet footprint (ft), rendered as a hatched block when present. */
  closet?: { width_ft: number; depth_ft: number } | null;
  /**
   * Hand-drawn rooms: the rectilinear outline + placed doors/windows/closets.
   * When present the canvas draws that shape (grid clipped to it, data-driven
   * openings) instead of the default rectangle with a fixed door/window.
   */
  outline?: RoomOutline | null;
  onMove: (id: string, xFt: number, yFt: number) => void;
  /** Quarter-turn the item (1 = CW, -1 = CCW); wired to the store's rotateItem. */
  onRotate?: (id: string, dir: 1 | -1) => void;
  onSetRotation?: (id: string, degrees: number) => void;
  /** Toolbar "delete": move the selected purchasable item's category to the
   *  Catalog (same as the product list's Remove). Built-ins can't be deleted. */
  onDeleteItem?: (f: FurnitureItem) => void;
  onReset: () => void;
  history?: { canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void };
  fullscreen?: boolean;
  readOnly?: boolean;
  /**
   * Cross-highlight furniture with the product list (hover/pin a category to
   * glow the matching pieces). Off in fullscreen, where there is no product
   * list to cross-reference; single-item selection for rotating still works.
   */
  crossHighlight?: boolean;
  /**
   * Product categories parked in the "Things to add" panel. Their purchasable
   * canvas pieces are hidden until moved back into the cart; built-in pieces
   * (bed, desk) are never hidden. Positions are retained, so a piece reappears
   * exactly where it was when added back.
   */
  hiddenCategories?: ProductCategory[];
}

const PAD = 28;
const INK = "#17172b";
const GRID = "#dce0e7";
const COBALT = "#2b4eff";
const RED = "#dc2626";
// Brand-mark color for the export watermark (matches the "d" badge + wordmark).
const AMBER = "#f0b100";

/**
 * Bottom-right brand lockup baked into exported PNGs: the "d" badge plus the
 * "dormscape" wordmark on a soft, mostly-transparent backing. Subtle
 * over the room, but crisp enough to read as intentional branding when shared.
 */
function buildBrandWatermark(stageW: number, stageH: number): Konva.Group {
  const WM_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  const fontSize = 14;
  const iconSize = 16;
  const gap = 6; // icon-to-wordmark
  const padX = 9;
  const padY = 6;
  const edge = 12; // inset from the canvas edges

  const dorm = new Konva.Text({
    text: "dorm",
    fontFamily: WM_FONT,
    fontStyle: "700",
    fontSize,
    fill: INK,
  });
  const scape = new Konva.Text({
    text: "scape",
    fontFamily: WM_FONT,
    fontStyle: "700",
    fontSize,
    fill: COBALT,
  });
  const textW = dorm.width() + scape.width();
  const textH = dorm.height();
  const contentH = Math.max(iconSize, textH);
  const pillW = padX * 2 + iconSize + gap + textW;
  const pillH = padY * 2 + contentH;

  const group = new Konva.Group({
    x: stageW - pillW - edge,
    y: stageH - pillH - edge,
  });

  group.add(
    new Konva.Rect({
      width: pillW,
      height: pillH,
      cornerRadius: 3,
      fill: "#ffffff",
      opacity: 0.7,
      shadowColor: INK,
      shadowBlur: 10,
      shadowOpacity: 0.1,
      shadowOffsetY: 2,
    })
  );

  const ix = padX;
  const iy = (pillH - iconSize) / 2;
  group.add(
    new Konva.Rect({
      x: ix,
      y: iy,
      width: iconSize,
      height: iconSize,
      cornerRadius: 3.5,
      fill: COBALT,
    })
  );
  group.add(
    new Konva.Text({
      text: "d",
      x: ix,
      y: iy,
      width: iconSize,
      height: iconSize,
      align: "center",
      verticalAlign: "middle",
      fontFamily: WM_FONT,
      fontStyle: "800",
      fontSize: 12,
      fill: INK,
    })
  );

  const tx = padX + iconSize + gap;
  const ty = (pillH - textH) / 2;
  dorm.position({ x: tx, y: ty });
  scape.position({ x: tx + dorm.width(), y: ty });
  group.add(dorm, scape);

  return group;
}
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

const RoomCanvas = forwardRef<RoomCanvasHandle, RoomCanvasProps>(function RoomCanvas(
  {
    roomL,
    roomW,
    templateId,
    furniture,
    closet,
    onMove,
    onRotate,
    onSetRotation,
    onDeleteItem,
    onReset,
    history,
    fullscreen = false,
    readOnly = false,
    crossHighlight = true,
    hiddenCategories,
    outline,
  },
  ref
) {
  const dock = useCanvasDock();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const labelRefs = useRef(new Map<string, Konva.Group>());
  const [viewport, setViewport] = useState({ width: 0, height: 420 });
  const [panMode, setPanMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [snapping, setSnapping] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; x: number; y: number } | null>(null);
  const [rotationPreview, setRotationPreview] = useState<{ id: string; degrees: number } | null>(null);
  const helpId = useId();
  const selectId = useId();
  const lastPinchCenter = useRef<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  // Konva draws to <canvas>, so it needs the *real* font family next/font
  // generated (a hashed name), not the human name, otherwise it silently
  // falls back to a system font and the labels look off. We read it from the
  // CSS variable the layout sets (the same --font-plex-mono the static share
  // view uses for furniture labels) and force a redraw once webfonts finish.
  const [labelFont, setLabelFont] = useState("ui-monospace, monospace");
  const lastPinch = useRef<number | null>(null);
  // Suppresses the click that Konva fires right after a drag/pan release.
  const dragGuard = useRef(0);

  // Shared cross-highlight state (result page). Hover wins over the pinned
  // click-selection visually, without clearing it.
  const hoveredCategory = usePlannerStore((s) => s.hoveredCategory);
  const selectedCategory = usePlannerStore((s) => s.selectedCategory);
  const selectedItemId = usePlannerStore((s) => s.selectedItemId);
  const setHoveredCategory = usePlannerStore((s) => s.setHoveredCategory);
  const toggleSelectedItem = usePlannerStore((s) => s.toggleSelectedItem);
  const clearSelectedCategory = usePlannerStore((s) => s.clearSelectedCategory);
  const hiddenItemIds = usePlannerStore((s) => s.hiddenItemIds);
  const selectedStyle = usePlannerStore(s => s.style);
  const palette = styleById(selectedStyle ?? "minimalist").palette;
  const lockedItemIds = usePlannerStore((s) => s.lockedItemIds);
  const toggleHiddenItem = usePlannerStore((s) => s.toggleHiddenItem);
  const toggleLockedItem = usePlannerStore((s) => s.toggleLockedItem);
  const activeCategory = readOnly || !crossHighlight ? null : hoveredCategory ?? selectedCategory;

  // Preview the whole attachment group locally; commit only the finished gesture.
  const displayFurniture = useMemo(() => {
    const item = rotationPreview && furniture.find(f => f.id === rotationPreview.id);
    if (!item || !rotationPreview) return furniture;
    const b = footprint(item), pivot = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    return furniture.map(f => f.id === item.id || f.parent_id === item.id
      ? rotateFurniture(f, rotationPreview.degrees - item.rotation_deg, pivot) : f);
  }, [furniture, rotationPreview]);

  useEffect(() => { setRotationPreview(null); }, [furniture, selectedItemId, selectedCategory, lockedItemIds, hiddenItemIds, panMode, readOnly, dock?.active]);

  // Rotate-control target: the pinned canvas item, or, when the pin came
  // from a product tile, the sole movable item of that category.
  const rotateTarget = useMemo(() => {
    if (readOnly) return null;
    if (selectedItemId) {
      const f = displayFurniture.find((x) => x.id === selectedItemId);
      return f && f.movable ? f : null;
    }
    if (selectedCategory) {
      const matches = displayFurniture.filter(
        (f) => f.movable && furnitureCategory(f) === selectedCategory
      );
      return matches.length === 1 ? matches[0] : null;
    }
    return null;
  }, [readOnly, selectedItemId, selectedCategory, displayFurniture]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setViewport({ width: entries[0].contentRect.width, height: entries[0].contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Resolve the mono label font from the CSS variable, then redraw the layer
  // once the webfont is actually loaded so text metrics (wrap/ellipsis) are
  // measured against the real glyphs rather than the fallback.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const family = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-plex-mono")
      .trim();
    if (family) setLabelFont(`${family}, ui-monospace, monospace`);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) stageRef.current?.getLayers()[0]?.batchDraw();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const stageW = viewport.width;
  const stageH = viewport.height;
  const fitted = fitViewport(stageW, stageH, roomL, roomW, stageW < 450 ? 36 : 48);
  const pxFt = fitted.scale;
  const roomWpx = roomL * pxFt;
  const roomHpx = roomW * pxFt;

  // Resize and room changes always begin with the whole room in view.
  useEffect(() => { setZoom(1); setStagePos({ x: 0, y: 0 }); }, [stageW, stageH, roomL, roomW]);

  const isCorridor = templateId?.startsWith("corridor-") ?? false;

  const ordered = useMemo(() => {
    const rank = { rug: 0, solid: 1, wall: 2 } as const;
    return [...displayFurniture].sort((a, b) => rank[layerOf(a)] - rank[layerOf(b)]);
  }, [displayFurniture]);

  // Purchasable pieces whose category was moved to "Things to add" are hidden
  // from the canvas (built-ins always render). Layout positions are untouched,
  // so moving a piece back re-renders it in the same spot.
  const hiddenSet = useMemo(() => new Set(hiddenCategories ?? []), [hiddenCategories]);
  const visible = useMemo(
    () =>
      ordered.filter((f) => {
        if (!f.product_category) return true;
        const cat = furnitureCategory(f);
        return !(cat && hiddenSet.has(cat));
      }),
    [ordered, hiddenSet]
  );

  const activeFurniture = useMemo(() => visible.filter(f => !hiddenItemIds.includes(f.id)), [visible, hiddenItemIds]);
  const invalid = useMemo(() => invalidItems(
    activeFurniture.map(f => dragging?.id === f.id ? { ...f, x_ft: dragging.x, y_ft: dragging.y } : f),
    roomL, roomW, outline ?? undefined
  ), [activeFurniture, dragging, roomL, roomW, outline]);

  function fitRoom() { setZoom(1); setStagePos({ x: 0, y: 0 }); }
  function applyZoom(next: number, anchor = { x: stageW / 2, y: stageH / 2 }) {
    const z = clamp(next, MIN_ZOOM, MAX_ZOOM);
    setStagePos(pos => zoomAt(pos, zoom, z, anchor));
    setZoom(z);
  }
  function handleTouchMove(e: KonvaEventObject<TouchEvent>) {
    const touches = e.evt.touches;
    if (touches.length !== 2) return;
    e.evt.preventDefault();
    const stage = stageRef.current;
    stage?.stopDrag();
    stage?.find(".furniture").forEach(node => { if (node.isDragging()) node.stopDrag(); });
    const rect = stage?.container().getBoundingClientRect();
    if (!rect) return;
    const center = { x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left, y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top };
    const dist = Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    if (lastPinch.current !== null && lastPinchCenter.current) {
      const z = clamp(zoom * dist / lastPinch.current, MIN_ZOOM, MAX_ZOOM);
      const previous = lastPinchCenter.current;
      setStagePos(pos => {
        const next = zoomAt(pos, zoom, z, previous);
        return { x: next.x + center.x - previous.x, y: next.y + center.y - previous.y };
      });
      setZoom(z);
    }
    lastPinch.current = dist;
    lastPinchCenter.current = center;
    dragGuard.current = Date.now();
  }
  function dragPosition(f: FurnitureItem, node: Konva.Node) {
    const fp = footprint(f);
    return { x: placedCoordinate((node.x() - PAD) / pxFt, fp.w, roomL, snapping), y: placedCoordinate((node.y() - PAD) / pxFt, fp.h, roomW, snapping) };
  }
  function handleDragEnd(f: FurnitureItem, e: KonvaEventObject<DragEvent>) {
    e.cancelBubble = true;
    const point = dragPosition(f, e.target);
    e.target.position({ x: PAD + point.x * pxFt, y: PAD + point.y * pxFt });
    labelRefs.current.get(f.id)?.position(e.target.position());
    dragGuard.current = Date.now();
    setDragging(null);
    if (point.x !== f.x_ft || point.y !== f.y_ft) onMove(f.id, point.x, point.y);
  }
  // True for a beat after any drag/pan, so a furniture drag doesn't also
  // register as a click that toggles the selection.
  const justDragged = () => Date.now() - dragGuard.current < 250;

  function handleItemClick(f: FurnitureItem) {
    if (readOnly || panMode || justDragged()) return;
    // Pin the item itself (rotate target) plus its product category so the
    // product-list cross-highlight keeps working exactly as before.
    toggleSelectedItem(f.id, furnitureCategory(f));
  }

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const stage = stageRef.current;
      if (!stage) return null;
      const layer = stage.getLayers()[0];
      const transform = { x: stage.x(), y: stage.y(), scaleX: stage.scaleX(), scaleY: stage.scaleY() };
      const editorNodes = stage.find(".editor-only");
      const visibleBefore = editorNodes.map(node => node.visible());
      const mark = buildBrandWatermark(stage.width(), stage.height());
      try {
        // Export the complete fitted plan, even when the editor is zoomed/panned.
        stage.setAttrs({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
        editorNodes.forEach(node => node.hide());
        layer.add(mark);
        layer.draw();
        return stage.toDataURL({ pixelRatio: 2 });
      } finally {
        mark.destroy();
        editorNodes.forEach((node, i) => node.visible(visibleBefore[i]));
        stage.setAttrs(transform);
        layer.draw();
      }
    },
  }));

  // Door: bottom of the left wall, 2.5 ft leaf swinging into the room.
  const doorHinge = { x: PAD, y: PAD + (roomW - 3) * pxFt };
  const doorR = 2.5 * pxFt;
  // Window: centered on the right wall (top wall for corridor rooms), 4 ft wide.
  const winHalf = 2 * pxFt;

  const gridLines = useMemo(() => {
    const lines: { key: string; points: number[] }[] = [];
    for (let i = 1; i < roomL; i++) {
      lines.push({ key: `v${i}`, points: [PAD + i * pxFt, PAD, PAD + i * pxFt, PAD + roomHpx] });
    }
    for (let j = 1; j < roomW; j++) {
      lines.push({ key: `h${j}`, points: [PAD, PAD + j * pxFt, PAD + roomWpx, PAD + j * pxFt] });
    }
    return lines;
  }, [roomL, roomW, pxFt, roomHpx, roomWpx]);

  // Hand-drawn rooms: precompute the wall path, closets, and door/window shapes
  // in canvas px. Doors swing along the edge's inward normal so the arc opens
  // into the room; windows are a flush cobalt line in the wall gap.
  const drawn = useMemo(() => {
    if (!outline || pxFt <= 0) return null;
    const pts = outline.points;
    const n = pts.length;
    const px = (xFt: number, yFt: number): [number, number] => [PAD + xFt * pxFt, PAD + yFt * pxFt];
    const flat = pts.flatMap((p) => px(p.x, p.y));

    // Unit inward normal of edge e: the perpendicular that points into the room.
    const inwardNormal = (e: number) => {
      const a = pts[e], b = pts[(e + 1) % n];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const cands = [{ nx: -dy, ny: dx }, { nx: dy, ny: -dx }];
      return cands.find((c) => pointInPolygon(mx + c.nx * 0.05, my + c.ny * 0.05, pts)) ?? cands[0];
    };

    const openings = outline.openings.map((op) => {
      const a = pts[op.edge], b = pts[(op.edge + 1) % n];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
      const s = { x: a.x + dx * op.offset_ft, y: a.y + dy * op.offset_ft };
      const e = { x: a.x + dx * (op.offset_ft + op.width_ft), y: a.y + dy * (op.offset_ft + op.width_ft) };
      const gap = [...px(s.x, s.y), ...px(e.x, e.y)];
      if (op.kind === "window") return { kind: "window" as const, gap };
      const nrm = inwardNormal(op.edge);
      // swing (0-3): bit0 = hinge at gap end, bit1 = open outward.
      const swing = op.swing ?? 0;
      const hinge = swing & 1 ? e : s;
      const dirx = swing & 1 ? -dx : dx, diry = swing & 1 ? -dy : dy;
      const nx = swing & 2 ? -nrm.nx : nrm.nx, ny = swing & 2 ? -nrm.ny : nrm.ny;
      const angleD = (Math.atan2(diry, dirx) * 180) / Math.PI;
      const angleN = (Math.atan2(ny, nx) * 180) / Math.PI;
      const delta = (((angleN - angleD) % 360) + 360) % 360;
      const [hx, hy] = px(hinge.x, hinge.y);
      return {
        kind: "door" as const,
        gap,
        door: {
          x: hx,
          y: hy,
          radius: op.width_ft * pxFt,
          rotation: delta < 180 ? angleD : angleN,
          leaf: [hx, hy, ...px(hinge.x + nx * op.width_ft, hinge.y + ny * op.width_ft)],
        },
      };
    });

    const closets = outline.closets.map((c) => {
      const [x, y] = px(c.x_ft, c.y_ft);
      return { x, y, w: c.width_ft * pxFt, h: c.depth_ft * pxFt };
    });

    return { flat, openings, closets };
  }, [outline, pxFt]);

  const toolbarItem = rotateTarget && visible.some(f => f.id === rotateTarget.id) ? rotateTarget : null;
  const toolbarHidden = toolbarItem ? hiddenItemIds.includes(toolbarItem.id) : false;
  const toolbarLocked = toolbarItem ? lockedItemIds.includes(toolbarItem.id) : false;
  const canEditItem = !!toolbarItem && !toolbarLocked && !toolbarHidden;
  const toolbarDeletable = !!toolbarItem && !toolbarItem.built_in && !toolbarLocked && !!furnitureCategory(toolbarItem) && !!onDeleteItem;
  const selectedFootprint = toolbarItem ? footprint(toolbarItem) : null;
  const rotationCenter = selectedFootprint ? {
    x: stagePos.x + (fitted.x + (selectedFootprint.x + selectedFootprint.w / 2) * pxFt) * zoom,
    y: stagePos.y + (fitted.y + (selectedFootprint.y + selectedFootprint.h / 2) * pxFt) * zoom,
  } : null;
  const rotationPosition = toolbarItem && rotationCenter ? (() => {
    const angle = toolbarItem.rotation_deg * Math.PI / 180;
    const x = toolbarItem.width_ft * pxFt * zoom / 2, y = -toolbarItem.length_ft * pxFt * zoom / 2;
    return { x: clamp(rotationCenter.x + x * Math.cos(angle) - y * Math.sin(angle), 22, stageW - 22),
      y: clamp(rotationCenter.y + x * Math.sin(angle) + y * Math.cos(angle), 22, stageH - 22) };
  })() : null;

  function finishRotation(degrees?: number) {
    dragGuard.current = Date.now();
    setRotationPreview(null);
    if (degrees !== undefined && toolbarItem && canEditItem) onSetRotation?.(toolbarItem.id, degrees);
  }

  function nudge(dx: number, dy: number, large = false) {
    if (!toolbarItem || !canEditItem) return;
    const fp = footprint(toolbarItem);
    const step = large ? 1 : snapping ? .5 : 1 / 12;
    onMove(toolbarItem.id, placedCoordinate(fp.x + dx * step, fp.w, roomL, snapping), placedCoordinate(fp.y + dy * step, fp.h, roomW, snapping));
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (readOnly || (event.target as HTMLElement).closest("input,textarea,select,[contenteditable=true]")) return;
    const key = event.key.toLowerCase();
    if (event.ctrlKey || event.metaKey) {
      if (key === "z" || key === "y") { event.preventDefault(); key === "y" || event.shiftKey ? history?.redo() : history?.undo(); }
      return;
    }
    if (key === "escape") {
      if (dock?.expanded) { event.stopPropagation(); dock.expand(); }
      else if (selectedItemId || selectedCategory || panMode) event.stopPropagation();
      clearSelectedCategory(); setPanMode(false); return;
    }
    if ((event.target as HTMLElement).closest("button")) return;
    if (key === "0") { event.preventDefault(); fitRoom(); }
    if (key === "+" || key === "=") { event.preventDefault(); applyZoom(zoom + .25); }
    if (key === "-") { event.preventDefault(); applyZoom(zoom - .25); }
    if (key === "v") setPanMode(false);
    if (key === "h") setPanMode(true);
    if (key === "g") setShowGrid(value => !value);
    if (key === "r" && canEditItem && toolbarItem) { event.preventDefault(); onRotate?.(toolbarItem.id, event.shiftKey ? -1 : 1); }
    const arrows: Record<string, [number, number]> = { arrowleft: [-1,0], arrowright: [1,0], arrowup: [0,-1], arrowdown: [0,1] };
    if (arrows[key] && canEditItem) { event.preventDefault(); nudge(...arrows[key], event.shiftKey); }
    if ((key === "delete" || key === "backspace") && toolbarDeletable && toolbarItem) { event.preventDefault(); onDeleteItem?.(toolbarItem); clearSelectedCategory(); }
  }

  return (
    <div className={`${styles.studio} dm-room-canvas ${dock ? styles.dockedCanvas : ""}`} onKeyDown={keyboard}>
      {dock?.host && dock.active && createPortal(<CanvasToolRail dock={dock} pan={panMode} setPan={setPanMode} grid={showGrid} labels={showLabels} snap={snapping} zoom={zoom}
        roomLabel={feetLabel(roomL)+" × "+feetLabel(roomW)} toggleGrid={()=>setShowGrid(v=>!v)} toggleLabels={()=>setShowLabels(v=>!v)} toggleSnap={()=>setSnapping(v=>!v)} zoomTo={applyZoom} fit={fitRoom}
        undo={()=>history?.undo()} redo={()=>history?.redo()} canUndo={!!history?.canUndo} canRedo={!!history?.canRedo}
        selected={toolbarItem} locked={toolbarLocked} hidden={toolbarHidden} canEdit={canEditItem&&!!onRotate} canDelete={toolbarDeletable}
        rotate={()=>toolbarItem&&onRotate?.(toolbarItem.id,1)} toggleLock={()=>toolbarItem&&toggleLockedItem(toolbarItem.id)} toggleHide={()=>toolbarItem&&toggleHiddenItem(toolbarItem.id)}
        remove={()=>{if(toolbarItem){onDeleteItem?.(toolbarItem);clearSelectedCategory();}}} hiddenItems={visible.filter(f=>hiddenItemIds.includes(f.id))} showItem={toggleHiddenItem} invalidCount={invalid.size}/>,dock.host)}
      {!dock && <>
      <div className={styles.topbar}>
        <div className={styles.title}><i /><strong>Your room studio</strong></div>
        <span className={styles.meta}>{feetLabel(roomL)} × {feetLabel(roomW)} · Top view</span>
      </div>
      <div className={styles.toolbar} aria-label="Floor plan tools">
        {!readOnly && <div className={styles.group}>
          <button type="button" aria-label="Select and move furniture" aria-pressed={!panMode} onClick={() => setPanMode(false)} title="Select (V)"><Icon path="m5 3 15 9-7 2-3 7Z" />Select</button>
          <button type="button" aria-label="Pan the room" aria-pressed={panMode} onClick={() => setPanMode(true)} title="Pan (H)"><Icon path="M8 13V6a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9c0 4-3 6-7 6-2 0-4-1-5-3l-4-5a2 2 0 0 1 3-2l1 1" /></button>
          <span className={styles.divider} />
          <button type="button" onClick={() => history?.undo()} disabled={!history?.canUndo} aria-label="Undo layout edit" title="Undo (Ctrl/⌘ Z)"><Icon path="M4 10h10a6 6 0 0 1 0 12M8 5l-5 5 5 5" /></button>
          <button type="button" onClick={() => history?.redo()} disabled={!history?.canRedo} aria-label="Redo layout edit" title="Redo (Ctrl/⌘ Shift Z)"><Icon path="M20 10H10a6 6 0 0 0 0 12m6-17 5 5-5 5" /></button>
        </div>}
        <div className={styles.group}>
          <button type="button" onClick={() => setShowGrid(!showGrid)} aria-pressed={showGrid} title="Show grid (G)"><Icon path="M4 4h16v16H4zM4 12h16M12 4v16" />Grid</button>
          <button type="button" onClick={() => setShowLabels(!showLabels)} aria-pressed={showLabels}>Labels</button>
          {!readOnly && <button type="button" onClick={() => setSnapping(!snapping)} aria-pressed={snapping} title="Snap to a 6-inch grid. Turn off for 1-inch positioning.">Snap</button>}
        </div>
        <button type="button" aria-expanded={showHelp} aria-controls={helpId} onClick={() => setShowHelp(!showHelp)} aria-label="Canvas help and shortcuts" title="Help & shortcuts"><Icon path="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 4h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0" /></button>
      </div>
      {showHelp && <div id={helpId} className={styles.help}>
        <p><strong>Make yourself at home.</strong> Drag a piece to move it, or choose it from the furniture menu. Drag its circular arrow to rotate, or click the arrow, move your cursor, then click to place. Escape cancels rotation. A red outline marks a possible overlap or wall crossing.</p>
        <p><kbd>R</kbd> Rotate · <kbd>↑ ↓ ← →</kbd> Nudge · <kbd>Shift</kbd> + arrows: 1 ft · <kbd>0</kbd> Fit room · <kbd>H</kbd> Pan · <kbd>V</kbd> Select · <kbd>Esc</kbd> Deselect</p>
        <p>Pinch with two fingers to zoom and pan. With a mouse, use Ctrl/⌘ + scroll to zoom at the pointer. Hiding a piece only changes the view; removing it moves its category to the catalog.</p>
      </div>}
      </>}
      <div ref={containerRef} className={`${styles.surface} dm-room-viewport`} data-rotating={rotationPreview ? true : undefined} tabIndex={0} role="region" aria-label="Interactive room floor plan" onPointerDown={() => containerRef.current?.focus({ preventScroll: true })} style={!dock && fullscreen ? { height: "clamp(320px, calc(100svh - 300px), 850px)" } : undefined}>
      {pxFt > 0 && (
        <Stage
          ref={stageRef}
          width={stageW}
          height={stageH}
          scaleX={zoom}
          scaleY={zoom}
          x={stagePos.x}
          y={stagePos.y}
          draggable
          onDragMove={(e) => { if (e.target === stageRef.current) setStagePos({ x: e.target.x(), y: e.target.y() }); }}
          onWheel={(e) => { if (e.evt.ctrlKey || e.evt.metaKey) { e.evt.preventDefault(); const pointer = stageRef.current?.getPointerPosition(); if (pointer) applyZoom(zoom * Math.exp(-e.evt.deltaY * .006), pointer); } }}
          onDragEnd={(e) => {
            if (e.target === stageRef.current) {
              dragGuard.current = Date.now();
              setStagePos({ x: e.target.x(), y: e.target.y() });
            }
          }}
          onClick={(e) => {
            // A click on empty canvas (not a furniture node) clears the pin.
            if (!readOnly && e.target === e.target.getStage() && !justDragged()) {
              clearSelectedCategory();
            }
          }}
          onTap={(e) => {
            if (!readOnly && e.target === e.target.getStage() && !justDragged()) {
              clearSelectedCategory();
            }
          }}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => { lastPinch.current = null; lastPinchCenter.current = null; }}
          onTouchCancel={() => { lastPinch.current = null; lastPinchCenter.current = null; setDragging(null); }}
          style={{ cursor: panMode ? "grab" : "default" }}
        >
          <Layer>
            <Rect width={stageW} height={stageH} fill="#f0f1f4" listening={false} />
            <Group x={fitted.x - PAD} y={fitted.y - PAD}>
            {drawn ? (
              <>
                {/* Hand-drawn room: white fill + grid clipped to the outline,
                    then the wall stroke, closets, and data-driven openings. */}
                <Group
                  listening={false}
                  clipFunc={(ctx) => {
                    ctx.beginPath();
                    for (let i = 0; i < drawn.flat.length; i += 2) {
                      if (i === 0) ctx.moveTo(drawn.flat[0], drawn.flat[1]);
                      else ctx.lineTo(drawn.flat[i], drawn.flat[i + 1]);
                    }
                    ctx.closePath();
                  }}
                >
                  <Rect x={PAD} y={PAD} width={roomWpx} height={roomHpx} fill="#fafaf8" listening={false} />
                  {showGrid && gridLines.map((l) => (
                    <Line key={l.key} points={l.points} stroke={GRID} strokeWidth={1} listening={false} />
                  ))}
                </Group>
                <Line points={drawn.flat} closed stroke={INK} strokeWidth={5} listening={false} />
                {drawn.closets.map((c, i) => (
                  <Rect
                    key={`closet-${i}`}
                    x={c.x}
                    y={c.y}
                    width={c.w}
                    height={c.h}
                    fill={INK}
                    opacity={0.08}
                    stroke={INK}
                    strokeWidth={1}
                    dash={[4, 3]}
                    listening={false}
                  />
                ))}
                {drawn.openings.map((op, i) => (
                  <Group key={`opening-${i}`} listening={false}>
                    <Line points={op.gap} stroke="#ffffff" strokeWidth={4} />
                    {op.kind === "window" ? (
                      <Line points={op.gap} stroke={COBALT} strokeWidth={4} />
                    ) : (
                      <>
                        <Arc x={op.door.x} y={op.door.y} innerRadius={0} outerRadius={op.door.radius} angle={90} rotation={op.door.rotation} fill={COBALT} opacity={0.07} />
                        <Arc x={op.door.x} y={op.door.y} innerRadius={op.door.radius} outerRadius={op.door.radius} angle={90} rotation={op.door.rotation} stroke={COBALT} strokeWidth={1.5} opacity={0.5} />
                        <Line points={op.door.leaf} stroke={COBALT} strokeWidth={2} opacity={0.6} />
                      </>
                    )}
                  </Group>
                ))}
              </>
            ) : (
              <>
            {/* Room shell */}
            <Rect x={PAD} y={PAD} width={roomWpx} height={roomHpx} fill="#fafaf8" listening={false} />
            {showGrid && gridLines.map((l) => (
              <Line key={l.key} points={l.points} stroke={GRID} strokeWidth={1} listening={false} />
            ))}
            <Rect
              x={PAD}
              y={PAD}
              width={roomWpx}
              height={roomHpx}
              stroke={INK}
              strokeWidth={5}
              listening={false}
            />

            {/* Closet (only when the school publishes one) */}
            {closet && (
              <Rect
                x={PAD + 2}
                y={PAD + 2}
                width={closet.width_ft * pxFt}
                height={closet.depth_ft * pxFt}
                fill={INK}
                opacity={0.08}
                stroke={INK}
                strokeWidth={1}
                dash={[4, 3]}
                listening={false}
              />
            )}

            {/* Door: gap in the wall + swing arc */}
            <Line
              points={[doorHinge.x, doorHinge.y, doorHinge.x, doorHinge.y + doorR]}
              stroke="#ffffff"
              strokeWidth={4}
              listening={false}
            />
            <Arc
              x={doorHinge.x}
              y={doorHinge.y}
              innerRadius={0}
              outerRadius={doorR}
              angle={90}
              rotation={0}
              fill={COBALT}
              opacity={0.07}
              listening={false}
            />
            <Arc
              x={doorHinge.x}
              y={doorHinge.y}
              innerRadius={doorR}
              outerRadius={doorR}
              angle={90}
              rotation={0}
              stroke={COBALT}
              strokeWidth={1.5}
              opacity={0.5}
              listening={false}
            />
            <Line
              points={[doorHinge.x, doorHinge.y, doorHinge.x + doorR, doorHinge.y]}
              stroke={COBALT}
              strokeWidth={2}
              opacity={0.6}
              listening={false}
            />

            {/* Window */}
            {isCorridor ? (
              <Line
                points={[PAD + roomWpx / 2 - winHalf, PAD, PAD + roomWpx / 2 + winHalf, PAD]}
                stroke={COBALT}
                strokeWidth={4}
                listening={false}
              />
            ) : (
              <Line
                points={[
                  PAD + roomWpx,
                  PAD + roomHpx / 2 - winHalf,
                  PAD + roomWpx,
                  PAD + roomHpx / 2 + winHalf,
                ]}
                stroke={COBALT}
                strokeWidth={4}
                listening={false}
              />
            )}
              </>
            )}

            <Group listening={false}>
              <Line points={[PAD, PAD-19, PAD+roomWpx, PAD-19]} stroke="#8d95a8" strokeWidth={.75} />
              <Line points={[PAD-19, PAD, PAD-19, PAD+roomHpx]} stroke="#8d95a8" strokeWidth={.75} />
              {[0, roomWpx].map(x => <Line key={`tick-x${x}`} points={[PAD+x, PAD-24, PAD+x, PAD-14]} stroke="#8d95a8" strokeWidth={1} />)}
              {[0, roomHpx].map(y => <Line key={`tick-y${y}`} points={[PAD-24, PAD+y, PAD-14, PAD+y]} stroke="#8d95a8" strokeWidth={1} />)}
              <Rect x={PAD+roomWpx/2-28} y={PAD-26} width={56} height={14} fill="#f0f1f4" />
              <Text x={PAD+roomWpx/2-28} y={PAD-25} width={56} text={feetLabel(roomL)} fontFamily={labelFont} fontSize={11} align="center" fill="#555967" />
              <Text x={PAD-28} y={PAD+roomHpx/2+28} width={56} text={feetLabel(roomW)} fontFamily={labelFont} fontSize={11} align="center" rotation={-90} fill="#555967" />
            </Group>
            {dragging && <Group name="editor-only" listening={false}>
              <Line points={[PAD + dragging.x*pxFt, PAD, PAD + dragging.x*pxFt, PAD+roomHpx]} stroke={COBALT} strokeWidth={.8} dash={[4,4]} />
              <Line points={[PAD, PAD + dragging.y*pxFt, PAD+roomWpx, PAD + dragging.y*pxFt]} stroke={COBALT} strokeWidth={.8} dash={[4,4]} />
            </Group>}
            {/* Furniture */}
            {visible.map((f) => {
              const fp = footprint(f);
              const w = f.width_ft * pxFt;
              const h = f.length_ft * pxFt;
              const bad = invalid.has(f.id);
              const layer = layerOf(f);
              const color = f.type === "bed" || f.type === "rug" ? palette[2] : CATEGORY_COLORS[f.color_category] ?? "#94a3b8";
              const isHidden = hiddenItemIds.includes(f.id);
              const isLocked = lockedItemIds.includes(f.id);
              const draggable = !readOnly && !panMode && f.movable && !isLocked && !isHidden;
              // Every item is clickable in edit mode now (selection is the
              // rotate target); category-less items just don't cross-light
              // the product list.
              const selected = !readOnly && selectedItemId === f.id;
              const highlighted =
                selected ||
                (activeCategory !== null && furnitureCategory(f) === activeCategory);
              return (
                <Group
                  key={f.id}
                  name="furniture"
                  x={PAD + fp.x * pxFt}
                  y={PAD + fp.y * pxFt}
                  draggable={draggable}
                  onDragStart={(e) => { e.cancelBubble = true; if (selectedItemId !== f.id) toggleSelectedItem(f.id, furnitureCategory(f)); setDragging({ id: f.id, x: f.x_ft, y: f.y_ft }); }}
                  onDragMove={(e) => {
                    e.cancelBubble = true;
                    // Furniture moves in Konva before React renders. Update the
                    // overlay label in the same draw, using raw pixels instead
                    // of the snapped coordinates used by guides and fit checks.
                    labelRefs.current.get(f.id)?.position(e.target.position());
                    const point = dragPosition(f, e.target);
                    setDragging(previous => previous?.id === f.id && previous.x === point.x && previous.y === point.y
                      ? previous : { id: f.id, ...point });
                  }}
                  onDragEnd={(e) => handleDragEnd(f, e)}
                  onClick={() => handleItemClick(f)}
                  onTap={() => handleItemClick(f)}
                  onMouseEnter={(e) => {
                    if (!readOnly && crossHighlight) setHoveredCategory(furnitureCategory(f));
                    const stage = e.target.getStage();
                    if (stage)
                      stage.container().style.cursor = draggable
                        ? "grab"
                        : readOnly
                          ? "default"
                          : "pointer";
                  }}
                  onMouseLeave={(e) => {
                    if (!readOnly && crossHighlight) setHoveredCategory(null);
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = "default";
                  }}
                >
                  <Group x={fp.w*pxFt/2} y={fp.h*pxFt/2} offsetX={w/2} offsetY={h/2} rotation={f.rotation_deg}>
                  <Rect
                    width={w}
                    height={h}
                    fill="#fafaf8"
                    opacity={isHidden ? 0.16 : 1}
                    cornerRadius={Math.min(4, w / 4, h / 4)}
                    stroke={bad ? RED : isLocked ? AMBER : INK}
                    strokeWidth={bad ? 2 : isLocked ? 1.75 : 0.75}
                    dash={isHidden ? [4, 3] : undefined}
                    hitStrokeWidth={10}
                    shadowColor={INK}
                    shadowOpacity={draggable ? 0.12 : 0}
                    shadowBlur={layer === "rug" ? 0 : dragging?.id === f.id ? 14 : 5}
                    shadowOffsetY={draggable ? 1 : 0}
                  />
                  <Group opacity={isHidden ? .12 : 1} listening={false}><FurnitureGlyph item={f} scale={pxFt} color={color} /></Group>
                  {bad && !isHidden && <Rect name="editor-only" width={w} height={h} stroke={RED} strokeWidth={2} fillEnabled={false} listening={false} />}
                  {/* Cross-highlight ring, cobalt glow, distinct from the red
                      collision flag; sits outside the item so small unlabeled
                      pieces are easy to spot. */}
                  {highlighted && (
                    <Rect
                      name="editor-only"
                      x={-3.5}
                      y={-3.5}
                      width={w + 7}
                      height={h + 7}
                      cornerRadius={Math.min(7, (w + 7) / 3, (h + 7) / 3)}
                      stroke={COBALT}
                      strokeWidth={2.5}
                      fillEnabled={false}
                      shadowColor={COBALT}
                      shadowBlur={0}
                      shadowOpacity={0.9}
                      listening={false}
                    />
                  )}
                  </Group>
                </Group>
              );
            })}
            {/* Labels sit above the furnishing layer, so under-bed storage and
                other small pieces never obscure a bed or desk name. */}
            <Group listening={false}>
              {showLabels && visible.map(f => {
                const fp = footprint(f);
                const w = fp.w * pxFt, h = fp.h * pxFt;
                if (w < 50 || h < 28 || hiddenItemIds.includes(f.id) || !["bed", "desk", "dresser", "rug"].includes(f.type)) return null;
                const size = Math.max(9, Math.min(11, w * .14));
                const stacked = isBunkBed(f) && w < 125;
                const label = stacked ? bedLabel(f).replace(" · ", "\n") : bedLabel(f);
                const labelH = stacked ? 30 : 16;
                const width = Math.min(w-8, (Math.max(...label.split("\n").map(line=>line.length))+2)*size*.61);
                const x = (w-width)/2;
                const y = (f.type === "desk" && f.rotation_deg % 180 === 0 ? h*.85 : h/2) - labelH/2;
                return <Group
                  key={`label-${f.id}`}
                  ref={node => { if (node) labelRefs.current.set(f.id, node); else labelRefs.current.delete(f.id); }}
                  x={PAD + fp.x*pxFt}
                  y={PAD + fp.y*pxFt}
                >
                  <Rect x={x} y={y-1} width={width} height={labelH+2} fill="#fffffff0" cornerRadius={2} />
                  <Text x={x+2} y={y} width={width-4} height={labelH} text={label} align="center" verticalAlign="middle" fontSize={size} fontFamily={labelFont} fontStyle="500" letterSpacing={.2} fill={INK} wrap="none" ellipsis />
                </Group>;
              })}
            </Group>
            </Group>
          </Layer>
        </Stage>
      )}

      {pxFt > 0 && toolbarItem && canEditItem && onSetRotation && !panMode && !dragging && rotationCenter && rotationPosition &&
        <RotationHandle key={toolbarItem.id} label={toolbarItem.label} center={rotationCenter} position={rotationPosition} degrees={toolbarItem.rotation_deg}
          onPreview={degrees=>setRotationPreview({id:toolbarItem.id,degrees})} onCommit={finishRotation} onCancel={()=>finishRotation()}/>}
      {pxFt > 0 && <div className={styles.scale}><i style={{ width: pxFt * zoom }} /><span>1 ft</span></div>}
      {!dock&&<div className={styles.viewportControls} aria-label="View controls">
        <button type="button" onClick={() => applyZoom(zoom - .25)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">−</button>
        <output aria-label="Zoom level">{Math.round(zoom * 100)}%</output>
        <button type="button" onClick={() => applyZoom(zoom + .25)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">+</button>
        <span className={styles.divider} />
        <button type="button" onClick={fitRoom} title="Fit the whole room (0)"><Icon path="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8z" />Fit</button>
      </div>}
      </div>
      {!dock&&<>
      {!readOnly && <div className={styles.inspector}>
        <div className={styles.selection}>
          <label htmlFor={selectId}>SELECT A PIECE TO EDIT</label>
          <select id={selectId} value={toolbarItem?.id ?? ""} onChange={event => {
            if (!event.target.value) clearSelectedCategory();
            else { const item = visible.find(f => f.id === event.target.value); if (item && item.id !== selectedItemId) toggleSelectedItem(item.id, furnitureCategory(item)); }
          }}>
            <option value="">Choose furniture or click the plan</option>
            {visible.filter(f => f.movable).map(f => <option key={f.id} value={f.id}>{f.label}{lockedItemIds.includes(f.id) ? " (locked)" : ""}{hiddenItemIds.includes(f.id) ? " (hidden)" : ""}</option>)}
          </select>
          <small>{toolbarItem && selectedFootprint ? `${feetLabel(selectedFootprint.w)} × ${feetLabel(selectedFootprint.h)} · ${toolbarLocked ? "Locked in place" : toolbarHidden ? "Hidden from view" : toolbarItem.built_in ? "Provided furniture" : "Move it to make it yours"}` : "Drag to arrange. Use the controls for the details."}</small>
        </div>
        <div className={styles.group}>
          <button type="button" disabled={!canEditItem || !onRotate} onClick={() => toolbarItem && onRotate?.(toolbarItem.id,1)} title="Rotate 90° clockwise (R)" aria-label="Rotate selected item 90° clockwise"><Icon path="M20 4v6h-6m5-1a8 8 0 1 0 1 8" />Rotate 90°</button>
          <button type="button" disabled={!toolbarItem} onClick={() => toolbarItem && toggleLockedItem(toolbarItem.id)} aria-pressed={toolbarLocked} aria-label={toolbarLocked ? "Unlock selected item" : "Lock selected item"}><Icon path={toolbarLocked ? "M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3" : "M5 10h14v11H5zM8 10V7a4 4 0 0 1 7-2"} /></button>
          <button type="button" disabled={!toolbarItem} onClick={() => toolbarItem && toggleHiddenItem(toolbarItem.id)} aria-pressed={toolbarHidden} aria-label={toolbarHidden ? "Show selected item" : "Hide selected item"}><Icon path="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0" /></button>
          <button type="button" disabled={!toolbarDeletable} onClick={() => { if (toolbarItem) { onDeleteItem?.(toolbarItem); clearSelectedCategory(); } }} className={styles.danger} aria-label="Remove selected item to catalog"><Icon path="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></button>
        </div>
      </div>}
      <div className={styles.footer}>
        <p className={`${styles.status} ${invalid.size ? styles.warning : ""}`} role="status">
          <i />{invalid.size ? `${invalid.size} ${invalid.size === 1 ? "piece needs" : "pieces need"} a fit check. Look for red outlines.` : `${activeFurniture.length} pieces in your room.`}
          {dragging ? ` Position: ${feetLabel(dragging.x)} / ${feetLabel(dragging.y)}` : ""}
        </p>
        {!readOnly && <button type="button" onClick={onReset} title="Restore the starting layout. You can undo this.">Reset layout</button>}
      </div>
      </>}
    </div>
  );
});

export default RoomCanvas;
