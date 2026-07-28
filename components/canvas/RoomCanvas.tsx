"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Stage, Layer, Group, Rect, Line, Arc, Text } from "react-konva";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { FurnitureItem } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/styles";
import { usePlannerStore } from "@/lib/store";
import { furnitureCategory } from "@/lib/highlight";
import { clamp, footprint, invalidItems, layerOf, snapHalfFt } from "./geometry";

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
  onMove: (id: string, xFt: number, yFt: number) => void;
  /** Quarter-turn the item (1 = CW, -1 = CCW); wired to the store's rotateItem. */
  onRotate?: (id: string, dir: 1 | -1) => void;
  onReset: () => void;
  readOnly?: boolean;
  /**
   * Cross-highlight furniture with the product list (hover/pin a category to
   * glow the matching pieces). Off in fullscreen, where there is no product
   * list to cross-reference; single-item selection for rotating still works.
   */
  crossHighlight?: boolean;
}

const PAD = 28;
const INK = "#17172b";
const GRID = "#e4e9f4";
const COBALT = "#2b4eff";
const RED = "#dc2626";
// Brand-mark colors for the export watermark (match app/icon.svg + the wordmark).
const AMBER = "#f0b100";
const HIGHLIGHT = "#ffd84d";
const MARK_GRAY = "#d7d9e0";

/**
 * Bottom-right brand lockup baked into exported PNGs: the four-square icon mark
 * plus the "dormscape" wordmark on a soft, mostly-transparent backing. Subtle
 * over the room, but crisp enough to read as intentional branding when shared.
 */
function buildBrandWatermark(stageW: number, stageH: number): Konva.Group {
  const WM_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  const fontSize = 14;
  const iconSize = 16;
  const sq = 7; // icon square side; two squares + a 2px gutter = 16
  const gutter = iconSize - sq * 2;
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
    fill: AMBER,
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
      cornerRadius: 9,
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
  const squares: Array<[number, number, string]> = [
    [ix, iy, COBALT],
    [ix + sq + gutter, iy, HIGHLIGHT],
    [ix, iy + sq + gutter, MARK_GRAY],
    [ix + sq + gutter, iy + sq + gutter, INK],
  ];
  for (const [x, y, fill] of squares) {
    group.add(new Konva.Rect({ x, y, width: sq, height: sq, cornerRadius: 1.6, fill }));
  }

  const tx = padX + iconSize + gap;
  const ty = (pillH - textH) / 2;
  dorm.position({ x: tx, y: ty });
  scape.position({ x: tx + dorm.width(), y: ty });
  group.add(dorm, scape);

  return group;
}
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;

// Matches the zoom buttons; enabled/disabled variants for the rotate pair.
const ROTATE_BTN =
  "grid h-8 w-8 place-items-center rounded-lg border border-ink/15 bg-white text-ink shadow-sm transition-colors enabled:cursor-pointer enabled:hover:border-cobalt enabled:hover:text-cobalt disabled:text-ink/25";

const RoomCanvas = forwardRef<RoomCanvasHandle, RoomCanvasProps>(function RoomCanvas(
  {
    roomL,
    roomW,
    templateId,
    furniture,
    closet,
    onMove,
    onRotate,
    onReset,
    readOnly = false,
    crossHighlight = true,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [containerW, setContainerW] = useState(0);
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
  const activeCategory = readOnly || !crossHighlight ? null : hoveredCategory ?? selectedCategory;

  // Rotate-control target: the pinned canvas item, or, when the pin came
  // from a product tile, the sole movable item of that category.
  const rotateTarget = useMemo(() => {
    if (readOnly) return null;
    if (selectedItemId) {
      const f = furniture.find((x) => x.id === selectedItemId);
      return f && f.movable ? f : null;
    }
    if (selectedCategory) {
      const matches = furniture.filter(
        (f) => f.movable && furnitureCategory(f) === selectedCategory
      );
      return matches.length === 1 ? matches[0] : null;
    }
    return null;
  }, [readOnly, selectedItemId, selectedCategory, furniture]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerW(entries[0].contentRect.width);
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

  // Base scale: fit the room's length across the container width.
  const pxFt = containerW > 0 ? (containerW - PAD * 2) / roomL : 0;
  const roomWpx = roomL * pxFt;
  const roomHpx = roomW * pxFt;
  const stageW = containerW;
  const stageH = roomHpx + PAD * 2;

  const invalid = useMemo(() => invalidItems(furniture, roomL, roomW), [furniture, roomL, roomW]);

  const isCorridor = templateId?.startsWith("corridor-") ?? false;

  const ordered = useMemo(() => {
    const rank = { rug: 0, solid: 1, wall: 2 } as const;
    return [...furniture].sort((a, b) => rank[layerOf(a)] - rank[layerOf(b)]);
  }, [furniture]);

  function applyZoom(next: number) {
    const z = clamp(next, MIN_ZOOM, MAX_ZOOM);
    // Keep the stage center fixed while zooming.
    const cx = stageW / 2;
    const cy = stageH / 2;
    setStagePos((pos) => ({
      x: cx - ((cx - pos.x) / zoom) * z,
      y: cy - ((cy - pos.y) / zoom) * z,
    }));
    setZoom(z);
  }

  function handleTouchMove(e: KonvaEventObject<TouchEvent>) {
    const touches = e.evt.touches;
    if (touches.length !== 2) return;
    e.evt.preventDefault();
    const dist = Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
    if (lastPinch.current !== null) {
      applyZoom(zoom * (dist / lastPinch.current));
    }
    lastPinch.current = dist;
  }

  function handleDragEnd(f: FurnitureItem, e: KonvaEventObject<DragEvent>) {
    const node = e.target;
    const fp = footprint(f);
    let xFt = snapHalfFt((node.x() - PAD) / pxFt);
    let yFt = snapHalfFt((node.y() - PAD) / pxFt);
    xFt = clamp(xFt, 0, Math.max(0, roomL - fp.w));
    yFt = clamp(yFt, 0, Math.max(0, roomW - fp.h));
    node.position({ x: PAD + xFt * pxFt, y: PAD + yFt * pxFt });
    dragGuard.current = Date.now();
    onMove(f.id, xFt, yFt);
  }

  // True for a beat after any drag/pan, so a furniture drag doesn't also
  // register as a click that toggles the selection.
  const justDragged = () => Date.now() - dragGuard.current < 250;

  function handleItemClick(f: FurnitureItem) {
    if (readOnly || justDragged()) return;
    // Pin the item itself (rotate target) plus its product category so the
    // product-list cross-highlight keeps working exactly as before.
    toggleSelectedItem(f.id, furnitureCategory(f));
  }

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const stage = stageRef.current;
      if (!stage) return null;
      const layer = stage.getLayers()[0];
      // Brand watermark, added just for the export then removed so the live
      // canvas is untouched.
      const mark = buildBrandWatermark(stage.width(), stage.height());
      layer.add(mark);
      layer.draw();
      const url = stage.toDataURL({ pixelRatio: 2 });
      mark.destroy();
      layer.draw();
      return url;
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

  return (
    <div ref={containerRef} className="relative w-full select-none">
      {pxFt > 0 && (
        <Stage
          ref={stageRef}
          width={stageW}
          height={stageH}
          scaleX={zoom}
          scaleY={zoom}
          x={stagePos.x}
          y={stagePos.y}
          draggable={zoom > 1}
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
          onTouchEnd={() => (lastPinch.current = null)}
        >
          <Layer>
            {/* Room shell */}
            <Rect x={PAD} y={PAD} width={roomWpx} height={roomHpx} fill="#ffffff" />
            {gridLines.map((l) => (
              <Line key={l.key} points={l.points} stroke={GRID} strokeWidth={1} listening={false} />
            ))}
            <Rect
              x={PAD}
              y={PAD}
              width={roomWpx}
              height={roomHpx}
              stroke={INK}
              strokeWidth={2}
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

            {/* Furniture */}
            {ordered.map((f) => {
              const fp = footprint(f);
              const w = fp.w * pxFt;
              const h = fp.h * pxFt;
              const bad = invalid.has(f.id);
              const layer = layerOf(f);
              const color = CATEGORY_COLORS[f.color_category] ?? "#94a3b8";
              const draggable = !readOnly && f.movable;
              const labelSize = Math.max(9, Math.min(13, h * 0.35, w * 0.16));
              const showLabel = w >= 34 && h >= 15;
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
                  x={PAD + fp.x * pxFt}
                  y={PAD + fp.y * pxFt}
                  draggable={draggable}
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
                  <Rect
                    width={w}
                    height={h}
                    fill={color}
                    opacity={layer === "rug" ? 0.4 : f.built_in ? 0.55 : 0.92}
                    cornerRadius={Math.min(4, w / 4, h / 4)}
                    stroke={bad ? RED : INK}
                    strokeWidth={bad ? 2 : 0.75}
                    shadowColor={INK}
                    shadowOpacity={draggable ? 0.12 : 0}
                    shadowBlur={draggable ? 4 : 0}
                    shadowOffsetY={draggable ? 1 : 0}
                  />
                  {showLabel && (
                    <Text
                      width={w}
                      height={h}
                      text={f.label}
                      align="center"
                      verticalAlign="middle"
                      fontSize={labelSize}
                      fontFamily={labelFont}
                      fontStyle="500"
                      letterSpacing={0.2}
                      fill="#ffffff"
                      listening={false}
                      wrap="word"
                      ellipsis
                    />
                  )}
                  {/* Cross-highlight ring, cobalt glow, distinct from the red
                      collision flag; sits outside the item so small unlabeled
                      pieces are easy to spot. */}
                  {highlighted && (
                    <Rect
                      x={-3.5}
                      y={-3.5}
                      width={w + 7}
                      height={h + 7}
                      cornerRadius={Math.min(7, (w + 7) / 3, (h + 7) / 3)}
                      stroke={COBALT}
                      strokeWidth={2.5}
                      fillEnabled={false}
                      shadowColor={COBALT}
                      shadowBlur={12}
                      shadowOpacity={0.9}
                      listening={false}
                    />
                  )}
                </Group>
              );
            })}
          </Layer>
        </Stage>
      )}

      {/* Scale bar (DOM overlay so it stays crisp) */}
      {pxFt > 0 && (
        <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-white/85 px-1.5 py-1">
          <span className="block h-[2px] bg-ink" style={{ width: `${pxFt * zoom}px` }} />
          <span className="font-mono text-[10px] leading-none text-ink">1 ft</span>
        </div>
      )}

      {/* Controls overlay */}
      {!readOnly && (
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => applyZoom(zoom + 0.25)}
            aria-label="Zoom in"
            className="h-8 w-8 cursor-pointer rounded-lg border border-ink/15 bg-white text-base font-semibold text-ink shadow-sm transition-colors hover:border-cobalt hover:text-cobalt"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => applyZoom(zoom - 0.25)}
            aria-label="Zoom out"
            className="h-8 w-8 cursor-pointer rounded-lg border border-ink/15 bg-white text-base font-semibold text-ink shadow-sm transition-colors hover:border-cobalt hover:text-cobalt"
          >
            −
          </button>
        </div>
      )}
      {/* Rotate the selected item, same control language as the zoom cluster,
          anchored to the opposite corner. Stays visible (muted) when nothing
          is selected so the affordance is discoverable. */}
      {!readOnly && (
        <div className="absolute bottom-2 right-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => rotateTarget && onRotate?.(rotateTarget.id, -1)}
            disabled={!rotateTarget}
            aria-label="Rotate selected item counter-clockwise"
            title={rotateTarget ? "Rotate 90° counter-clockwise" : "Select an item to rotate"}
            className={ROTATE_BTN}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => rotateTarget && onRotate?.(rotateTarget.id, 1)}
            disabled={!rotateTarget}
            aria-label="Rotate selected item clockwise"
            title={rotateTarget ? "Rotate 90° clockwise" : "Select an item to rotate"}
            className={ROTATE_BTN}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
            </svg>
          </button>
        </div>
      )}
      {!readOnly && (
        <button
          type="button"
          onClick={onReset}
          className="absolute left-2 top-2 cursor-pointer rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wide text-ink-soft shadow-sm transition-colors hover:border-cobalt hover:text-cobalt"
        >
          Reset layout
        </button>
      )}
    </div>
  );
});

export default RoomCanvas;
