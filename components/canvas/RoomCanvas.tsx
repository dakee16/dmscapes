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
  onReset: () => void;
  readOnly?: boolean;
}

const PAD = 28;
const INK = "#17172b";
const GRID = "#e4e9f4";
const COBALT = "#2b4eff";
const RED = "#dc2626";
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;

const RoomCanvas = forwardRef<RoomCanvasHandle, RoomCanvasProps>(function RoomCanvas(
  { roomL, roomW, templateId, furniture, closet, onMove, onReset, readOnly = false },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [containerW, setContainerW] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const lastPinch = useRef<number | null>(null);
  // Suppresses the click that Konva fires right after a drag/pan release.
  const dragGuard = useRef(0);

  // Shared cross-highlight state (result page). Hover wins over the pinned
  // click-selection visually, without clearing it.
  const hoveredCategory = usePlannerStore((s) => s.hoveredCategory);
  const selectedCategory = usePlannerStore((s) => s.selectedCategory);
  const setHoveredCategory = usePlannerStore((s) => s.setHoveredCategory);
  const toggleSelectedCategory = usePlannerStore((s) => s.toggleSelectedCategory);
  const clearSelectedCategory = usePlannerStore((s) => s.clearSelectedCategory);
  const activeCategory = readOnly ? null : hoveredCategory ?? selectedCategory;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerW(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
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
    const cat = furnitureCategory(f);
    if (cat) toggleSelectedCategory(cat);
    else clearSelectedCategory();
  }

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const stage = stageRef.current;
      if (!stage) return null;
      const layer = stage.getLayers()[0];
      const mark = new Konva.Text({
        text: "Designed with Dormscape",
        fontFamily: "IBM Plex Mono, ui-monospace, monospace",
        fontSize: 12,
        fill: INK,
        opacity: 0.75,
      });
      mark.position({
        x: stage.width() - mark.width() - 10,
        y: stage.height() - mark.height() - 8,
      });
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
              const linkable = !readOnly && furnitureCategory(f) !== null;
              const highlighted =
                activeCategory !== null && furnitureCategory(f) === activeCategory;
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
                    if (!readOnly) setHoveredCategory(furnitureCategory(f));
                    const stage = e.target.getStage();
                    if (stage)
                      stage.container().style.cursor = draggable
                        ? "grab"
                        : linkable
                          ? "pointer"
                          : "default";
                  }}
                  onMouseLeave={(e) => {
                    if (!readOnly) setHoveredCategory(null);
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
                      fontFamily="Instrument Sans, system-ui, sans-serif"
                      fill="#ffffff"
                      listening={false}
                      wrap="word"
                      ellipsis
                    />
                  )}
                  {/* Cross-highlight ring — cobalt glow, distinct from the red
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
