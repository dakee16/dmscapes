"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Stage, Layer, Line, Rect, Circle, Text, Arc, Group } from "react-konva";
import Konva from "konva";
import type { ClosetRect, Point, RoomOutline, WallOpening, SelectedRoom, FurnitureItem } from "@/lib/types";

import { roomOutline } from "@/lib/studio";
import { roomEditError } from "@/lib/room-editing";
import { footprint } from "@/components/canvas/geometry";
import { fitViewport, zoomAt } from "@/components/canvas/viewport";
import { clamp, rectInsidePolygon } from "@/components/canvas/geometry";
import { ArrowRight } from "@/components/ds/Icons";
import { ClosetIcon, DoorIcon, HandIcon, InfoIcon, MinusIcon, PlusIcon, RedoIcon, ShapeIcon, SwingIcon, TrashIcon, UndoIcon, WallsIcon, WindowIcon } from "@/components/draw/DrawIcons";
import styles from "@/components/draw/DrawCanvas.module.css";

// Cap the backing-store resolution on high-DPR phones (same reasoning as RoomCanvas).
if (typeof window !== "undefined") {
  Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
}

// The blank drawing surface is a fixed grid in feet; the user clicks corners to
// trace a rectilinear outline, which is normalized to origin on completion.
const PAD = 24;
const DOOR_FT = 3;
const WINDOW_FT = 4;
const CLOSET_W = 2.5;
const CLOSET_D = 2;
const CLOSE_SNAP_FT = 0.75; // click within this of the start point to close the loop
// Walls snap to this angle increment, so diagonals are precise (0/15/.../90...)
// without being freeform. 15deg covers 45deg cut-corners and shallower bays.
const ANGLE_STEP = 15;

// Redesign plan colours (design-handoff designs/site/Draw + Hall plans).
const INK = "#16161D";
const BLUE = "#2449FF";
const PLAN = "#FBFAF6";
const GRID_MINOR = "rgba(36, 73, 255, 0.06)";
const GRID_MAJOR = "rgba(36, 73, 255, 0.14)";
const HALO = "rgba(255, 216, 61, 0.55)";
const SWING = "rgba(22, 22, 29, 0.45)";
const GHOST = "rgba(22, 22, 29, 0.22)";
const FURNITURE = "#EEF1FD";
const WHITE = "#ffffff";

type Tool = "wall" | "door" | "window" | "closet" | "pan";
type Selected = { kind: "opening" | "closet" | "wall" | "corner"; index: number } | null;

const snap = (v: number) => Math.round(v * 2) / 2;
const round2 = (v: number) => Math.round(v * 100) / 100;

/** Length in feet-and-inches, e.g. 10.5 -> 10′ 6″, 12 -> 12′ 0″ (set in Archivo: Martian Mono has no primes). */
function ftIn(ft: number): string {
  const t = Math.round(ft * 12);
  const f = Math.floor(t / 12);
  const i = t % 12;
  return `${f}′ ${i}″`;
}

/** Konva draws on a canvas, so it needs the real font family names behind next/font's CSS variables. */
const FALLBACK_FONTS = { sans: "Archivo, 'Arial Narrow', Arial, sans-serif", mono: "ui-monospace, monospace" };
function useCanvasFonts(ref: React.RefObject<HTMLElement | null>) {
  const [fonts, setFonts] = useState(FALLBACK_FONTS);
  useEffect(() => {
    let alive = true;
    const read = () => {
      const el = ref.current ?? document.body;
      const cs = getComputedStyle(el);
      const sans = cs.getPropertyValue("--font-archivo").trim();
      const mono = cs.getPropertyValue("--font-martian").trim();
      if (alive) setFonts({ sans: sans ? `${sans}, Arial, sans-serif` : FALLBACK_FONTS.sans, mono: mono ? `${mono}, ui-monospace, monospace` : FALLBACK_FONTS.mono });
    };
    read();
    document.fonts?.ready.then(read).catch(() => {});
    return () => { alive = false; };
  }, [ref]);
  return fonts;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(text: string, font: string): number {
  if (typeof document === "undefined") return text.length * 8;
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * 8;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

/** Closet hatch: blue 135° stripes on white (the planner's closet style). */
function hatchPattern(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 11;
  const g = c.getContext("2d");
  if (!g) return null;
  g.fillStyle = WHITE;
  g.fillRect(0, 0, 11, 11);
  g.strokeStyle = "rgba(36, 73, 255, 0.16)";
  g.lineWidth = 3.5;
  g.beginPath();
  for (const o of [-11, 0, 11]) { g.moveTo(o - 1, 12); g.lineTo(o + 12, -1); }
  g.stroke();
  return c;
}

/** Optional page chrome: the /plan/draw page passes its brand + title and its own panel extras. */
export interface RoomDrawChrome {
  /** replaces the built-in title at the start of the top bar */
  lead?: ReactNode;
  /** rendered at the foot of the side panel */
  panel?: ReactNode;
  /** fill the parent's height (full-screen tool) instead of a fixed canvas height */
  fill?: boolean;
}

/** Do two segments properly cross (interiors intersect)? Any angle; shared
 *  endpoints of adjacent walls don't count. */
function segCross(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const eps = 1e-9;
  const cross = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const o1 = cross(a1, a2, b1), o2 = cross(a1, a2, b2);
  const o3 = cross(b1, b2, a1), o4 = cross(b1, b2, a2);
  const straddle = (u: number, v: number) => (u > eps && v < -eps) || (u < -eps && v > eps);
  return straddle(o1, o2) && straddle(o3, o4);
}

/**
 * Door swing geometry (in feet). `swing` (0-3) cycles the hinge end (gap start
 * vs end) and the open side (into the room vs out), so the user can flip a door
 * to any of its four orientations. Returns the hinge, the 90-degree arc's start
 * angle, and the open leaf's far end.
 */
function doorGeom(
  s: Point,
  end: Point,
  u: { x: number; y: number },
  nIn: { x: number; y: number },
  width: number,
  swing: number
): { hinge: Point; rotation: number; leaf: Point } {
  const bit0 = swing & 1; // hinge: 0 = gap start, 1 = gap end
  const bit1 = (swing >> 1) & 1; // side: 0 = inward, 1 = outward
  const hinge = bit0 ? end : s;
  const dir = bit0 ? { x: -u.x, y: -u.y } : u;
  const normal = bit1 ? { x: -nIn.x, y: -nIn.y } : nIn;
  const angleDir = (Math.atan2(dir.y, dir.x) * 180) / Math.PI;
  const angleNorm = (Math.atan2(normal.y, normal.x) * 180) / Math.PI;
  const delta = (((angleNorm - angleDir) % 360) + 360) % 360;
  const rotation = delta < 180 ? angleDir : angleNorm;
  return { hinge, rotation, leaf: { x: hinge.x + normal.x * width, y: hinge.y + normal.y * width } };
}

/** No two non-adjacent edges of the closed ring cross. */
function isSimpleRing(pts: Point[]): boolean {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a1 = pts[i], a2 = pts[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      if (j === i || (i + 1) % n === j || (j + 1) % n === i) continue; // adjacent/shared vertex
      const b1 = pts[j], b2 = pts[(j + 1) % n];
      if (segCross(a1, a2, b1, b2)) return false;
    }
  }
  return true;
}

interface Snapshot {
  points: Point[];
  closed: boolean;
  openings: WallOpening[];
  closets: ClosetRect[];
}

export interface RoomDrawResult {
  outline: RoomOutline;
  lengthFt: number;
  widthFt: number;
  origin: Point;
}

/**
 * The "Design your room" editor. The user traces a rectilinear wall outline,
 * drops fixed-size doors/windows onto walls and resizable closets inside, then
 * "Plan this room" hands a normalized RoomOutline (+ bbox dims) back up.
 */
export default function RoomDrawCanvas({
  onComplete, initialRoom, furniture = [], onCancel, chrome,
}: {
  onComplete: (result: RoomDrawResult) => void;
  initialRoom?: SelectedRoom;
  furniture?: FurnitureItem[];
  onCancel?: () => void;
  chrome?: RoomDrawChrome;
}) {
  const initial = useRef(initialRoom ? roomOutline(initialRoom) : null).current;
  const SPAN_X = initialRoom ? Math.max(26, initialRoom.lengthFt + 4) : 26;
  const SPAN_Y = initialRoom ? Math.max(20, initialRoom.widthFt + 4) : 20;
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 420 });
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const inputId = useId();
  const lastDrag = useRef(0);

  const [tool, setTool] = useState<Tool>("wall");
  const [points, setPoints] = useState<Point[]>(initial?.points.map(p => ({...p})) ?? []);
  const [closed, setClosed] = useState(Boolean(initial));
  const [openings, setOpenings] = useState<WallOpening[]>(initial?.openings.map(o => ({...o})) ?? []);
  const [closets, setClosets] = useState<ClosetRect[]>(initial?.closets.map(c => ({...c})) ?? []);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [selected, setSelected] = useState<Selected>(null);
  const [hint, setHint] = useState<string | null>(null);
  const history = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => setViewport({ width: e[0].contentRect.width, height: e[0].contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stageW = viewport.width;
  const stageH = viewport.height;
  const fitted = fitViewport(stageW, stageH, SPAN_X, SPAN_Y, PAD + 10);
  const pxFt = fitted.scale;
  const ox = fitted.x, oy = fitted.y;
  const px = (xFt: number, yFt: number): [number, number] => [ox + xFt * pxFt, oy + yFt * pxFt];
  useEffect(() => { setZoom(1); setStagePos({ x: 0, y: 0 }); }, [stageW, stageH]);
  function applyZoom(next: number) {
    const z = clamp(next, .75, 3);
    setStagePos(pos => zoomAt(pos, zoom, z, { x: stageW/2, y: stageH/2 }));
    setZoom(z);
  }
  function toWorld(pos: { x: number; y: number }) {
    return stageRef.current?.getAbsoluteTransform().copy().invert().point(pos) ?? pos;
  }
  function toScreen(pos: { x: number; y: number }) {
    return stageRef.current?.getAbsoluteTransform().point(pos) ?? pos;
  }

  // ---- history / undo -------------------------------------------------------
  function snapshot(): Snapshot {
    return { points: [...points], closed, openings: [...openings], closets: [...closets] };
  }
  function commit(next: Partial<Snapshot>) {
    history.current.push(snapshot());
    if (history.current.length > 50) history.current.shift();
    future.current = [];
    if (next.points !== undefined) setPoints(next.points);
    if (next.closed !== undefined) setClosed(next.closed);
    if (next.openings !== undefined) setOpenings(next.openings);
    if (next.closets !== undefined) setClosets(next.closets);
  }
  function restore(prev: Snapshot) {
    setPoints(prev.points); setClosed(prev.closed); setOpenings(prev.openings); setClosets(prev.closets);
    setSelected(null); setHint(null); setCursor(null); setTool(prev.closed && !initialRoom ? "door" : "wall");
  }
  function undo() {
    const prev = history.current.pop();
    if (!prev) return;
    future.current.push(snapshot());
    restore(prev);
  }
  function redo() {
    const next = future.current.pop();
    if (!next) return;
    history.current.push(snapshot());
    restore(next);
  }
  function clearAll() {
    commit({ points: [], closed: false, openings: [], closets: [] });
    setSelected(null); setHint("Drawing cleared. Undo to bring it back."); setTool("wall"); setCursor(null);
  }

  // ---- cursor + rubber-band preview ----------------------------------------
  function pointerFt(stage: Konva.Stage | null): Point | null {
    const pointer = stage?.getPointerPosition();
    if (!pointer || pxFt <= 0) return null;
    const p = toWorld(pointer);
    return { x: snap((p.x - ox) / pxFt), y: snap((p.y - oy) / pxFt) };
  }

  const nearStart =
    cursor && points.length >= 3 && !closed
      ? Math.hypot(cursor.x - points[0].x, cursor.y - points[0].y) <= CLOSE_SNAP_FT
      : false;

  // Wall preview: snap the angle from the previous corner to ANGLE_STEP and the
  // length to the half-foot grid, so horizontal/vertical AND clean diagonals are
  // both easy to draw without going fully freeform.
  function nextWallPoint(target: Point): Point {
    const last = points[points.length - 1];
    if (!last) return target;
    if (points.length >= 3 && Math.hypot(target.x-points[0].x,target.y-points[0].y) <= CLOSE_SNAP_FT) return points[0];
    const dx = target.x-last.x, dy = target.y-last.y;
    const dist = Math.hypot(dx,dy);
    if (dist < 1e-6) return last;
    const angle = Math.round(Math.atan2(dy,dx)*180/Math.PI/ANGLE_STEP)*ANGLE_STEP*Math.PI/180;
    const len = Math.max(.5,snap(dist));
    return { x: round2(last.x+Math.cos(angle)*len), y: round2(last.y+Math.sin(angle)*len) };
  }
  const preview = tool === "wall" && !closed && cursor && points.length ? nextWallPoint(cursor) : null;

  // ---- edge helpers ---------------------------------------------------------
  const edges = useMemo(() => {
    if (!closed) return [];
    return points.map((a, i) => {
      const b = points[(i + 1) % points.length];
      return { a, b, len: Math.hypot(b.x - a.x, b.y - a.y), i };
    });
  }, [points, closed]);

  /** Nearest edge to a point + the offset (ft from edge start) of the projection. */
  function nearestEdge(pt: Point) {
    let best = -1, bestDist = Infinity, bestT = 0;
    for (const e of edges) {
      if (e.len === 0) continue;
      const ux = (e.b.x - e.a.x) / e.len, uy = (e.b.y - e.a.y) / e.len;
      const t = Math.max(0, Math.min(e.len, (pt.x - e.a.x) * ux + (pt.y - e.a.y) * uy));
      const cx = e.a.x + ux * t, cy = e.a.y + uy * t;
      const d = Math.hypot(pt.x - cx, pt.y - cy);
      if (d < bestDist) { bestDist = d; best = e.i; bestT = t; }
    }
    return { edge: best, t: bestT, dist: bestDist };
  }

  // ---- click handling -------------------------------------------------------
  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (tool === "pan" || Date.now() - lastDrag.current < 250) return;
    const ft = pointerFt(e.target.getStage());
    if (!ft) return;
    if (ft.x < 0 || ft.y < 0 || ft.x > SPAN_X || ft.y > SPAN_Y) { setHint("Place your room inside the drawing grid."); return; }
    setHint(null);

    if (tool === "wall") {
      if (closed) return;
      if (points.length === 0) {
        commit({ points: [ft] });
        return;
      }
      if (points.length >= 3 && Math.hypot(ft.x-points[0].x,ft.y-points[0].y) <= CLOSE_SNAP_FT) {
        finishOutline();
        return;
      }
      const clickedPoint = nextWallPoint(ft);
      if (clickedPoint) {
        // Ignore a zero-length repeat click on the same corner.
        const last = points[points.length - 1];
        if (clickedPoint.x === last.x && clickedPoint.y === last.y) return;
        if (clickedPoint.x < 0 || clickedPoint.y < 0 || clickedPoint.x > SPAN_X || clickedPoint.y > SPAN_Y) { setHint("That corner is outside the grid. Choose a closer point."); return; }
        commit({ points: [...points, clickedPoint] });
      }
      return;
    }

    if (!closed) {
      setHint("Finish drawing the walls first, then add doors, windows, and closets.");
      return;
    }

    if (tool === "door" || tool === "window") {
      const width = tool === "door" ? DOOR_FT : WINDOW_FT;
      const { edge, t, dist } = nearestEdge(ft);
      const e2 = edges[edge];
      if (!e2 || dist > 1.5) {
        setHint(`Tap on a wall to place the ${tool}.`);
        return;
      }
      if (e2.len < width) {
        setHint(`That wall is too short for a ${width}-ft ${tool}.`);
        return;
      }
      const offset = clamp(snap(t-width/2),0,e2.len-width);
      if (openings.some(o => o.edge === edge && offset < o.offset_ft+o.width_ft && offset+width > o.offset_ft)) { setHint("There is already an opening here. Leave a little space between them."); return; }
      commit({ openings: [...openings, { kind: tool, edge, offset_ft: offset, width_ft: width }] });
      setSelected({ kind: "opening", index: openings.length });
      return;
    }

    if (tool === "closet") {
      const x = snap(Math.max(0, ft.x - CLOSET_W / 2));
      const y = snap(Math.max(0, ft.y - CLOSET_D / 2));
      if (!rectInsidePolygon({ x, y, w: CLOSET_W, h: CLOSET_D }, points)) { setHint("Place the whole closet inside your walls."); return; }
      commit({ closets: [...closets, { x_ft: x, y_ft: y, width_ft: CLOSET_W, depth_ft: CLOSET_D }] });
      setSelected({ kind: "closet", index: closets.length });
    }
  }

  function finishOutline() {
    if (points.length < 3) return;
    const ring = [...points];
    const area = Math.abs(ring.reduce((sum,p,i) => { const next = ring[(i+1)%ring.length]; return sum+p.x*next.y-next.x*p.y; }, 0))/2;
    if (area < 1) { setHint("Give your room some floor space. Place at least three corners around an area."); return; }
    // The loop closes on the last-corner -> start edge (any angle is fine now).
    if (!isSimpleRing(ring)) {
      setHint("That outline crosses itself. Undo the last corner and try again.");
      return;
    }
    commit({ points: ring, closed: true });
    setTool("door");
    setHint(null);
  }

  // ---- delete selected ------------------------------------------------------
  function removeSelected() {
    if (!selected) return;
    if (selected.kind === "opening") {
      commit({ openings: openings.filter((_, i) => i !== selected.index) });
    } else if (selected.kind === "closet") {
      commit({ closets: closets.filter((_, i) => i !== selected.index) });
    }
    setSelected(null);
  }

  // Door swing: cycle the selected door through its four orientations (which end
  // it hinges on x whether it opens in or out), like the furniture rotate button.
  function rotateDoor() {
    if (!selected || selected.kind !== "opening") return;
    const op = openings[selected.index];
    if (!op || op.kind !== "door") return;
    commit({
      openings: openings.map((o, i) =>
        i === selected.index ? { ...o, swing: ((o.swing ?? 0) + 1) % 4 } : o
      ),
    });
  }
  const selectedDoor =
    selected?.kind === "opening" && openings[selected.index]?.kind === "door";

  function keyboard(ev: KeyboardEvent<HTMLDivElement>) {
    if ((ev.target as HTMLElement).closest("input,textarea,select,[contenteditable=true]")) return;
    if (ev.metaKey || ev.ctrlKey) {
      if (ev.key.toLowerCase() === "z" || ev.key.toLowerCase() === "y") { ev.preventDefault(); ev.shiftKey || ev.key.toLowerCase() === "y" ? redo() : undo(); }
      return;
    }
    if ((ev.key === "Delete" || ev.key === "Backspace") && selected) { ev.preventDefault(); removeSelected(); }
    if (ev.key === "Escape") { setSelected(null); setCursor(null); setTool(closed ? "pan" : "wall"); }
    if ((ev.target as HTMLElement).closest("button,summary")) return;
    if (ev.key === "Enter" && !closed && points.length >= 3) { ev.preventDefault(); finishOutline(); }
    if (ev.key.toLowerCase() === "r" && selectedDoor) { ev.preventDefault(); rotateDoor(); }
  }

  function editWallPoints(next: Point[]): boolean {
    if(next.some(p=>p.x<0||p.y<0||p.x>SPAN_X||p.y>SPAN_Y)){setHint("Keep the walls inside the drawing grid.");return false;}
    const error=roomEditError({points:next,openings,closets});
    if(error){setHint(error);return false;}
    commit({points:next});setHint("Room shape updated.");return true;
  }

  // ---- complete -------------------------------------------------------------
  function planRoom() {
    if (!closed || points.length < 3) return;
    const minX = Math.min(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const norm = points.map((p) => ({ x: p.x - minX, y: p.y - minY }));
    const lengthFt = Math.max(...norm.map((p) => p.x));
    const widthFt = Math.max(...norm.map((p) => p.y));
    const outline: RoomOutline = {
      points: norm,
      openings: openings.map((o) => ({ ...o })),
      closets: closets.map((c) => ({ ...c, x_ft: c.x_ft - minX, y_ft: c.y_ft - minY })),
    };
    const error = roomEditError(outline);
    if (error) { setHint(error); return; }
    onComplete({ outline, lengthFt, widthFt, origin: { x: minX, y: minY } });
  }

  // ---- inward normal (door swing) ------------------------------------------
  function pointInRing(x: number, y: number): boolean {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y, xj = points[j].x, yj = points[j].y;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function inwardNormal(i: number): { nx: number; ny: number } {
    const a = points[i], b = points[(i + 1) % points.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const cands = [{ nx: -dy, ny: dx }, { nx: dy, ny: -dx }];
    return cands.find((c) => pointInRing(mx + c.nx * 0.05, my + c.ny * 0.05)) ?? cands[0];
  }

  // ---- grid -----------------------------------------------------------------
  // Plan paper: a line every six inches (the snap step), stronger every foot.
  const gridLines = useMemo(() => {
    const l: { key: string; pts: number[]; strong: boolean }[] = [];
    for (let i = 0; i <= SPAN_X * 2; i++)
      l.push({ key: `v${i}`, pts: [ox + i * pxFt / 2, oy, ox + i * pxFt / 2, oy + SPAN_Y * pxFt], strong: i % 2 === 0 });
    for (let j = 0; j <= SPAN_Y * 2; j++)
      l.push({ key: `h${j}`, pts: [ox, oy + j * pxFt / 2, ox + SPAN_X * pxFt, oy + j * pxFt / 2], strong: j % 2 === 0 });
    return l;
  }, [pxFt, ox, oy, SPAN_X, SPAN_Y]);

  const wallFlat = useMemo(() => {
    const seq = closed ? points : preview ? [...points, preview] : points;
    return seq.flatMap((p) => px(p.x, p.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, preview, closed, pxFt, ox, oy]);

  // Live dimension labels: one per committed edge, plus the live preview edge.
  // Each sits just outside its wall, on the side away from the room's middle.
  const dimLabels = useMemo(() => {
    const labels: { key: string; x: number; y: number; nx: number; ny: number; text: string; live: boolean; edge: number }[] = [];
    const seq = closed ? points : preview ? [...points, preview] : points;
    const cx = seq.reduce((s, p) => s + p.x, 0) / (seq.length || 1);
    const cy = seq.reduce((s, p) => s + p.y, 0) / (seq.length || 1);
    const put = (a: Point, b: Point, key: string, live: boolean, edge: number) => {
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.25) return;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      let nx = (b.y - a.y) / len, ny = -(b.x - a.x) / len;
      const side = (mid.x - cx) * nx + (mid.y - cy) * ny;
      if (side < -1e-6) { nx = -nx; ny = -ny; }
      const [mx, my] = px(mid.x, mid.y);
      labels.push({ key, x: mx, y: my, nx, ny, text: ftIn(len), live, edge });
    };
    if (!closed) {
      for (let i = 0; i < points.length - 1; i++) put(points[i], points[i + 1], `d${i}`, false, i);
      if (preview && points.length > 0) put(points[points.length - 1], preview, "dlive", true, points.length - 1);
    } else {
      points.forEach((p, i) => put(p, points[(i + 1) % points.length], `d${i}`, false, i));
    }
    return labels;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, preview, closed, pxFt, ox, oy]);

  // Placement preview that follows the cursor: a ghost of the door/window/closet
  // where it would land. Driven by mouse-move, so it only appears on desktop
  // (touch devices have no hovering cursor).
  let ghostOpening:
    | null
    | { kind: "door" | "window"; gap: number[]; door?: { x: number; y: number; radius: number; rotation: number; leaf: number[] } } = null;
  let ghostCloset: null | { x: number; y: number; w: number; h: number } = null;
  if (closed && cursor && pxFt > 0) {
    if (tool === "door" || tool === "window") {
      const width = tool === "door" ? DOOR_FT : WINDOW_FT;
      const { edge, t, dist } = nearestEdge(cursor);
      const e2 = edges[edge];
      if (e2 && dist <= 1.5 && e2.len >= width) {
        const offset = clamp(snap(t-width/2),0,e2.len-width);
        const ux = (e2.b.x - e2.a.x) / (e2.len || 1), uy = (e2.b.y - e2.a.y) / (e2.len || 1);
        const s = { x: e2.a.x + ux * offset, y: e2.a.y + uy * offset };
        const en = { x: e2.a.x + ux * (offset + width), y: e2.a.y + uy * (offset + width) };
        const gap = [...px(s.x, s.y), ...px(en.x, en.y)];
        if (tool === "window") {
          ghostOpening = { kind: "window", gap };
        } else {
          const nrm = inwardNormal(edge);
          const dg = doorGeom(s, en, { x: ux, y: uy }, { x: nrm.nx, y: nrm.ny }, width, 0);
          const [hx, hy] = px(dg.hinge.x, dg.hinge.y);
          ghostOpening = {
            kind: "door",
            gap,
            door: {
              x: hx,
              y: hy,
              radius: width * pxFt,
              rotation: dg.rotation,
              leaf: [hx, hy, ...px(dg.leaf.x, dg.leaf.y)],
            },
          };
        }
      }
    } else if (tool === "closet") {
      const cx = snap(Math.max(0, cursor.x - CLOSET_W / 2));
      const cy = snap(Math.max(0, cursor.y - CLOSET_D / 2));
      const [gx, gy] = px(cx, cy);
      ghostCloset = { x: gx, y: gy, w: CLOSET_W * pxFt, h: CLOSET_D * pxFt };
    }
  }

  const canPlan = closed && points.length >= 3;
  const floorArea = closed ? Math.abs(points.reduce((sum,p,i) => { const next=points[(i+1)%points.length]; return sum+p.x*next.y-next.x*p.y; },0))/2 : 0;

  // ---- presentation ---------------------------------------------------------
  const rootRef = useRef<HTMLDivElement>(null);
  const fonts = useCanvasFonts(rootRef);
  const hatch = useMemo(() => hatchPattern(), []);
  const wallW = clamp(pxFt * 0.16, 3, 6);
  const hintText = hint ?? (tool === "pan" ? "Drag to move the view. Choose a tool to keep editing." : closed ? ({wall:"Drag a wall or corner to change the shape.",door:"Tap a wall where your door goes.",window:"Tap a wall to add a window.",closet:"Tap inside your room to add a closet."})[tool] : points.length ? "Tap to place each corner. Tap the first one to finish." : "Tap the grid to place your first corner.");
  const lastPoint = points[points.length - 1];
  const committedFlat = points.flatMap((p) => px(p.x, p.y));

  // The walls still to draw, squared back to the first corner (a guide, not geometry).
  let ghostWalls: number[] | null = null;
  if (!closed && tool === "wall" && points.length >= 2) {
    const from = preview ?? lastPoint, s = points[0];
    if (from.x !== s.x || from.y !== s.y) ghostWalls = [...px(from.x, from.y), ...px(s.x, from.y), ...px(s.x, s.y)];
  }
  // A right-angle tick where the live wall meets the last one at 90°.
  let rightAngle: number[] | null = null;
  if (preview && points.length >= 2) {
    const L = lastPoint, P = points[points.length - 2];
    const ux = P.x - L.x, uy = P.y - L.y, vx = preview.x - L.x, vy = preview.y - L.y;
    const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
    if (lu && lv && Math.abs((ux * vx + uy * vy) / (lu * lv)) < 0.01) {
      const [lx, ly] = px(L.x, L.y), s = 14;
      const a = { x: (ux / lu) * s, y: (uy / lu) * s }, b = { x: (vx / lv) * s, y: (vy / lv) * s };
      rightAngle = [lx + a.x, ly + a.y, lx + a.x + b.x, ly + a.y + b.y, lx + b.x, ly + b.y];
    }
  }
  const scaleFt = [1, 2, 5, 10].find((f) => f * pxFt * zoom >= 56) ?? 10;
  const scalePx = scaleFt * pxFt * zoom;

  const walls = closed
    ? edges.map((e) => ({ i: e.i, len: e.len }))
    : points.slice(1).map((p, i) => ({ i, len: Math.hypot(p.x - points[i].x, p.y - points[i].y) }));
  const liveLen = !closed && preview && lastPoint ? Math.hypot(preview.x - lastPoint.x, preview.y - lastPoint.y) : 0;
  const selectWall = (i: number) => { setTool("wall"); setCursor(null); setHint(null); setSelected({ kind: "wall", index: i }); };
  const choose = (id: Tool) => { setTool(id); setSelected(null); setHint(null); setCursor(null); };

  const TOOLS: { id: Tool; label: string; icon: ReactNode; needsRoom: boolean }[] = [
    { id: "wall", label: closed ? "Shape" : "Walls", icon: closed ? <ShapeIcon /> : <WallsIcon />, needsRoom: false },
    { id: "door", label: "Door", icon: <DoorIcon />, needsRoom: true },
    { id: "window", label: "Window", icon: <WindowIcon />, needsRoom: true },
    { id: "closet", label: "Closet", icon: <ClosetIcon />, needsRoom: true },
  ];
  const selectedLabel = selected?.kind === "closet" ? "Closet" : selected?.kind === "opening" ? (openings[selected.index]?.kind === "door" ? "Door" : "Window") : null;
  const closeTag = "CLOSE THE ROOM HERE";

  return (
    <div ref={rootRef} className={`${styles.root} ${chrome?.fill ? styles.fill : ""}`} data-edit={initialRoom && !chrome?.lead ? "" : undefined} onKeyDown={keyboard}>
      <div className={styles.frame}>
        <header className={styles.bar}>
          <div className={styles.lead}>
            {chrome?.lead ?? <p className={styles.title}>{initialRoom ? "Edit your room" : closed ? "Add your room’s details" : "Draw your walls"}</p>}
          </div>
          {!initialRoom && (
            <ol className={styles.steps} aria-label="Drawing steps">
              {["Trace the walls", "Add openings", "Make room"].map((label, i) => (
                <li key={label} aria-current={i === (closed ? 1 : 0) ? "step" : undefined}>
                  <span>{String(i + 1).padStart(2, "0")} <b>{label}</b></span>
                </li>
              ))}
            </ol>
          )}
          <div className={styles.actions}>
            <button type="button" className={styles.iconBtn} onClick={undo} disabled={!history.current.length} aria-label="Undo" title="Undo (Ctrl/⌘ Z)"><UndoIcon size={18} /></button>
            <button type="button" className={styles.iconBtn} onClick={redo} disabled={!future.current.length} aria-label="Redo" title="Redo (Ctrl/⌘ Shift Z)"><RedoIcon size={18} /></button>
            {onCancel && <button type="button" className={`ds-btn ds-btn--ghost-ink ds-btn--sm ${styles.btn}`} onClick={onCancel}>Cancel edits</button>}
            {!closed && <button type="button" className={`ds-btn ds-btn--ink-yellow ds-btn--sm ${styles.btn}`} onClick={finishOutline} disabled={points.length < 3}>Finish walls</button>}
            {canPlan && <button type="button" className={`ds-btn ds-btn--ink-yellow ds-btn--sm ${styles.btn}`} onClick={planRoom}>{initialRoom ? "Apply room changes" : "Choose my vibe"}<ArrowRight size={16} /></button>}
          </div>
        </header>

        <div className={styles.body}>
          <div className={styles.rail} role="group" aria-label="Drawing tools">
            {TOOLS.map((t) => (
              <button key={t.id} type="button" aria-pressed={tool === t.id} disabled={t.needsRoom && !closed} title={t.needsRoom && !closed ? "Finish the walls first" : undefined} onClick={() => choose(t.id)}>
                {t.icon}<span>{t.label}</span>
              </button>
            ))}
            <span className={styles.railRule} aria-hidden="true" />
            <button type="button" aria-pressed={tool === "pan"} onClick={() => { setTool(tool === "pan" ? "wall" : "pan"); setSelected(null); setHint(null); setCursor(null); }}>
              <HandIcon /><span>Move</span>
            </button>
          </div>

          <div ref={containerRef} className={styles.surface} tabIndex={0} role="region" aria-label="Room drawing canvas" onPointerDown={e => { if (!(e.target as HTMLElement).closest("button,input")) containerRef.current?.focus({ preventScroll: true }); }}>
            {pxFt > 0 && (
              <Stage
                ref={stageRef}
                x={stagePos.x} y={stagePos.y} scaleX={zoom} scaleY={zoom} draggable={tool === "pan"}
                onDragEnd={e => { if (e.target === stageRef.current) { setStagePos({ x:e.target.x(),y:e.target.y() }); lastDrag.current = Date.now(); } }}
                width={stageW}
                height={stageH}
                onClick={handleStageClick}
                onTap={handleStageClick}
                onMouseMove={(e) => setCursor(pointerFt(e.target.getStage()))}
                onMouseLeave={() => setCursor(null)}
                style={{ cursor: tool === "pan" ? "grab" : tool === "wall" ? "crosshair" : "copy" }}
              >
                <Layer>
                  <Rect x={ox} y={oy} width={SPAN_X*pxFt} height={SPAN_Y*pxFt} fill={PLAN} stroke="rgba(36, 73, 255, 0.22)" strokeWidth={1} listening={false} />
                  {/* Plan paper grid: six-inch squares, stronger every foot */}
                  {showGrid && gridLines.map((l) => (l.strong || pxFt * zoom >= 18) && (
                    <Line key={l.key} points={l.pts} stroke={l.strong ? GRID_MAJOR : GRID_MINOR} strokeWidth={1} listening={false} />
                  ))}

                  {/* Room floor once closed */}
                  {closed && <Line points={wallFlat} closed fill="rgba(255, 255, 255, 0.78)" listening={false} />}

                  {/* Keep furniture visible while editing walls, without changing placement. */}
                  {closed && furniture.map(f => { const b=footprint(f),[x,y]=px(f.x_ft,f.y_ft); return <Group key={f.id} listening={false} opacity={.5}>
                    <Rect x={x+b.w*pxFt/2} y={y+b.h*pxFt/2} offsetX={f.width_ft*pxFt/2} offsetY={f.length_ft*pxFt/2} width={f.width_ft*pxFt} height={f.length_ft*pxFt} rotation={f.rotation_deg} fill={FURNITURE} stroke={BLUE} strokeWidth={1.25} cornerRadius={2}/>
                    {b.w*pxFt>28&&b.h*pxFt>18&&<Text x={x+3} y={y+3} width={Math.max(1,b.w*pxFt-6)} height={Math.max(1,b.h*pxFt-6)} text={f.label} fontSize={10} fontFamily={fonts.sans} fontStyle="600" fill={INK} align="center" verticalAlign="middle"/>}
                  </Group>; })}

                  {/* Closets (drag to move, corner handle to resize) */}
                  {closets.map((c, i) => {
                    const [cx, cy] = px(c.x_ft, c.y_ft);
                    const w = c.width_ft * pxFt, h = c.depth_ft * pxFt;
                    const isSel = selected?.kind === "closet" && selected.index === i;
                    return (
                      <Group key={`closet-${i}`}>
                        <Rect
                          x={cx}
                          y={cy}
                          width={w}
                          height={h}
                          fillPatternImage={(hatch ?? undefined) as unknown as HTMLImageElement | undefined}
                          fill={hatch ? undefined : FURNITURE}
                          stroke={BLUE}
                          strokeWidth={isSel ? 3 : 1.5}
                          shadowColor={BLUE}
                          shadowBlur={isSel ? 12 : 0}
                          shadowOpacity={isSel ? .3 : 0}
                          draggable={tool !== "pan"}
                          onClick={(e) => { e.cancelBubble = true; setSelected({ kind: "closet", index: i }); }}
                          onTap={(e) => { e.cancelBubble = true; setSelected({ kind: "closet", index: i }); }}
                          onDragStart={(e) => { e.cancelBubble = true; setSelected({ kind: "closet", index: i }); }}
                          onDragEnd={(e) => {
                            lastDrag.current = Date.now();
                            const nx = snap((e.target.x() - ox) / pxFt);
                            const ny = snap((e.target.y() - oy) / pxFt);
                            if (!rectInsidePolygon({ x:nx, y:ny, w:c.width_ft, h:c.depth_ft },points)) { e.target.position({ x:cx,y:cy }); setHint("Keep the closet inside the room."); return; }
                            commit({ closets: closets.map((cc, k) => (k === i ? { ...cc, x_ft: Math.max(0, nx), y_ft: Math.max(0, ny) } : cc)) });
                          }}
                        />
                        {w >= 46 && h >= 14 && <Text x={cx} y={cy} width={w} height={h} text="CLOSET" wrap="none" align="center" verticalAlign="middle" fontSize={Math.max(7, Math.min(10, h * 0.32, w / 6.4))} fontFamily={fonts.mono} fontStyle="700" letterSpacing={0.8} fill={BLUE} listening={false} />}
                        {isSel && (
                          <Circle
                            x={cx + w}
                            y={cy + h}
                            radius={7}
                            hitStrokeWidth={14}
                            fill={WHITE}
                            stroke={BLUE}
                            strokeWidth={2.5}
                            draggable={tool !== "pan"}
                            onDragEnd={(e) => {
                              lastDrag.current = Date.now();
                              const nw = snap(Math.max(1, (e.target.x() - cx) / pxFt));
                              const nh = snap(Math.max(1, (e.target.y() - cy) / pxFt));
                              if (!rectInsidePolygon({ x:c.x_ft, y:c.y_ft, w:nw, h:nh },points)) { e.target.position({x:cx+w,y:cy+h}); setHint("Keep the closet inside the room."); return; }
                              commit({ closets: closets.map((cc, k) => (k === i ? { ...cc, width_ft: nw, depth_ft: nh } : cc)) });
                            }}
                          />
                        )}
                      </Group>
                    );
                  })}

                  {/* Walls still to draw (guide only) */}
                  {ghostWalls && <Line points={ghostWalls} stroke={GHOST} strokeWidth={Math.max(2, wallW / 2)} dash={[9, 7]} listening={false} />}

                  {/* Walls */}
                  {closed
                    ? wallFlat.length >= 4 && <Line points={wallFlat} closed stroke={INK} strokeWidth={wallW} lineJoin="miter" lineCap="square" listening={false} />
                    : committedFlat.length >= 4 && <Line points={committedFlat} stroke={INK} strokeWidth={wallW} lineJoin="miter" lineCap="square" listening={false} />}
                  {/* The wall being drawn */}
                  {preview && lastPoint && <Line points={[...px(lastPoint.x, lastPoint.y), ...px(preview.x, preview.y)]} stroke={BLUE} strokeWidth={Math.max(3, wallW - 1)} dash={[11, 7]} lineCap="butt" listening={false} />}
                  {rightAngle && <Line points={rightAngle} stroke={BLUE} strokeWidth={2} listening={false} />}

                  {/* Corner nodes; the first one glows once the room can be closed */}
                  {!closed &&
                    points.map((p, i) => {
                      const [dx, dy] = px(p.x, p.y);
                      const closable = i === 0 && points.length >= 3;
                      const r = closable ? (nearStart ? 13 : 11) : 8;
                      return (
                        <Group key={`pt-${i}`} listening={false}>
                          {closable && <Circle x={dx} y={dy} radius={r + 8} fill={HALO} />}
                          <Circle x={dx} y={dy} radius={r} fill={WHITE} stroke={INK} strokeWidth={3} />
                        </Group>
                      );
                    })}
                  {!closed && tool === "wall" && points.length >= 3 && (() => {
                    const [sx0, sy0] = px(points[0].x, points[0].y);
                    const w = textWidth(closeTag, `700 10px ${fonts.mono}`) + closeTag.length * 0.8 + 14;
                    return <Group listening={false} x={sx0 + 20} y={sy0 + 14}>
                      <Rect width={w} height={22} cornerRadius={4} fill="#FFF4C2" />
                      <Text width={w} height={22} text={closeTag} align="center" verticalAlign="middle" fontSize={10} fontFamily={fonts.mono} fontStyle="700" letterSpacing={0.8} fill="#8A6A00" />
                    </Group>;
                  })()}
                  {/* The live corner */}
                  {preview && <Circle x={px(preview.x, preview.y)[0]} y={px(preview.x, preview.y)[1]} radius={11} fill={BLUE} stroke={WHITE} strokeWidth={4} shadowColor={BLUE} shadowBlur={16} shadowOffsetY={6} shadowOpacity={.35} listening={false} />}
                  {!closed && tool === "wall" && !points.length && cursor && <Circle x={px(cursor.x, cursor.y)[0]} y={px(cursor.x, cursor.y)[1]} radius={8} fill={WHITE} stroke={BLUE} strokeWidth={3} opacity={.9} listening={false} />}

                  {closed && tool === "wall" && points.map((p,i) => {
                    const q=points[(i+1)%points.length],[ax,ay]=px(p.x,p.y),[bx,by]=px(q.x,q.y);
                    const cornerSel=selected?.kind==="corner"&&selected.index===i;
                    return <Group key={"wall-edit-"+i}>
                      <Line points={[ax,ay,bx,by]} stroke={selected?.kind==="wall"&&selected.index===i?BLUE:"transparent"} strokeWidth={wallW} lineCap="square" hitStrokeWidth={20} draggable
                        onClick={e=>{e.cancelBubble=true;setSelected({kind:"wall",index:i});}} onTap={e=>{e.cancelBubble=true;setSelected({kind:"wall",index:i});}}
                        onDragStart={()=>setSelected({kind:"wall",index:i})}
                        onDragEnd={e=>{lastDrag.current=Date.now();const dx=snap(e.target.x()/pxFt),dy=snap(e.target.y()/pxFt);e.target.position({x:0,y:0});editWallPoints(points.map((v,n)=>n===i||n===(i+1)%points.length?{x:v.x+dx,y:v.y+dy}:v));}}/>
                      <Circle x={ax} y={ay} radius={cornerSel?9:7} hitStrokeWidth={16} fill={cornerSel?BLUE:WHITE} stroke={cornerSel?WHITE:INK} strokeWidth={cornerSel?3:2.5} shadowColor={BLUE} shadowBlur={cornerSel?12:0} shadowOpacity={cornerSel?.35:0} draggable
                        onClick={e=>{e.cancelBubble=true;setSelected({kind:"corner",index:i});}} onTap={e=>{e.cancelBubble=true;setSelected({kind:"corner",index:i});}}
                        onDragStart={()=>setSelected({kind:"corner",index:i})}
                        onDragEnd={e=>{lastDrag.current=Date.now();const p={x:snap((e.target.x()-ox)/pxFt),y:snap((e.target.y()-oy)/pxFt)};e.target.position({x:ax,y:ay});editWallPoints(points.map((v,n)=>n===i?p:v));}}/>
                    </Group>;
                  })}

                  {/* Openings: door swing / window bar + a drag handle to slide along the wall */}
                  {closed &&
                    openings.map((op, i) => {
                      const e2 = edges[op.edge];
                      if (!e2) return null;
                      const ux = (e2.b.x - e2.a.x) / (e2.len || 1), uy = (e2.b.y - e2.a.y) / (e2.len || 1);
                      const s = { x: e2.a.x + ux * op.offset_ft, y: e2.a.y + uy * op.offset_ft };
                      const end = { x: e2.a.x + ux * (op.offset_ft + op.width_ft), y: e2.a.y + uy * (op.offset_ft + op.width_ft) };
                      const mid = { x: (s.x + end.x) / 2, y: (s.y + end.y) / 2 };
                      const [sx, sy] = px(s.x, s.y);
                      const [ex, ey] = px(end.x, end.y);
                      const [mxp, myp] = px(mid.x, mid.y);
                      const isSel = selected?.kind === "opening" && selected.index === i;
                      const nrm = inwardNormal(op.edge);
                      const dg =
                        op.kind === "door"
                          ? doorGeom(s, end, { x: ux, y: uy }, { x: nrm.nx, y: nrm.ny }, op.width_ft, op.swing ?? 0)
                          : null;
                      const hw = wallW / 2 - 0.75;
                      return (
                        <Group key={`op-${i}`}>
                          {/* a white gap erases the wall under the opening */}
                          <Line points={[sx, sy, ex, ey]} stroke={WHITE} strokeWidth={wallW + 1.5} listening={false} />
                          {op.kind === "window" ? (
                            <>
                              <Line points={[sx - uy * hw, sy + ux * hw, ex - uy * hw, ey + ux * hw]} stroke={BLUE} strokeWidth={isSel ? 2.5 : 1.5} listening={false} />
                              <Line points={[sx + uy * hw, sy - ux * hw, ex + uy * hw, ey - ux * hw]} stroke={BLUE} strokeWidth={isSel ? 2.5 : 1.5} listening={false} />
                              <Line points={[sx - uy * hw, sy + ux * hw, sx + uy * hw, sy - ux * hw]} stroke={BLUE} strokeWidth={1.5} listening={false} />
                              <Line points={[ex - uy * hw, ey + ux * hw, ex + uy * hw, ey - ux * hw]} stroke={BLUE} strokeWidth={1.5} listening={false} />
                            </>
                          ) : dg ? (
                            (() => {
                              const [hx, hy] = px(dg.hinge.x, dg.hinge.y);
                              const [lx, ly] = px(dg.leaf.x, dg.leaf.y);
                              return (
                                <>
                                  <Arc x={hx} y={hy} innerRadius={0} outerRadius={op.width_ft * pxFt} angle={90} rotation={dg.rotation} fill={BLUE} opacity={isSel ? 0.08 : 0.04} listening={false} />
                                  <Arc x={hx} y={hy} innerRadius={op.width_ft * pxFt} outerRadius={op.width_ft * pxFt} angle={90} rotation={dg.rotation} stroke={isSel ? BLUE : SWING} strokeWidth={1.5} dash={[5, 4]} listening={false} />
                                  <Line points={[hx, hy, lx, ly]} stroke={isSel ? BLUE : INK} strokeWidth={2.5} lineCap="round" listening={false} />
                                </>
                              );
                            })()
                          ) : null}
                          {/* Drag handle: constrained to slide along this wall. */}
                          <Circle
                            x={mxp}
                            y={myp}
                            radius={isSel ? 9 : 7}
                            hitStrokeWidth={16}
                            fill={isSel ? BLUE : WHITE}
                            stroke={isSel ? WHITE : op.kind === "door" ? INK : BLUE}
                            strokeWidth={isSel ? 3 : 2.5}
                            shadowColor={BLUE}
                            shadowBlur={isSel ? 12 : 0}
                            shadowOpacity={isSel ? .35 : 0}
                            draggable={tool !== "pan"}
                            onClick={(ev) => { ev.cancelBubble = true; setSelected({ kind: "opening", index: i }); }}
                            onTap={(ev) => { ev.cancelBubble = true; setSelected({ kind: "opening", index: i }); }}
                            onDragStart={(ev) => { ev.cancelBubble = true; setSelected({ kind: "opening", index: i }); }}
                            dragBoundFunc={(absolutePos) => {
                              const pos = toWorld(absolutePos);
                              // Project onto the edge, clamp so the opening stays on the wall.
                              const [ax, ay] = px(e2.a.x, e2.a.y);
                              const [bx, by] = px(e2.b.x, e2.b.y);
                              const vx = bx - ax, vy = by - ay;
                              const len2 = vx * vx + vy * vy || 1;
                              let t = ((pos.x - ax) * vx + (pos.y - ay) * vy) / len2;
                              const half = op.width_ft / 2 / (e2.len || 1);
                              t = Math.max(half, Math.min(1 - half, t));
                              return toScreen({ x: ax + vx * t, y: ay + vy * t });
                            }}
                            onDragEnd={(ev) => {
                              lastDrag.current = Date.now();
                              const [ax, ay] = px(e2.a.x, e2.a.y);
                              const dxft = (ev.target.x() - ax) / pxFt;
                              const dyft = (ev.target.y() - ay) / pxFt;
                              const along = dxft * ux + dyft * uy; // ft from edge start to handle (mid)
                              const offset = clamp(snap(along-op.width_ft/2),0,e2.len-op.width_ft);
                              if (openings.some((o,k) => k !== i && o.edge === op.edge && offset < o.offset_ft+o.width_ft && offset+op.width_ft > o.offset_ft)) {
                                ev.target.position({x:mxp,y:myp});
                                setHint("Leave space between doors and windows.");
                                return;
                              }
                              commit({ openings: openings.map((o, k) => (k === i ? { ...o, offset_ft: offset } : o)) });
                            }}
                          />
                          {/* Window resize handle (window only, when selected): drag
                              the far end along the wall to change its width. */}
                          {op.kind === "window" && isSel && (
                            <Circle
                              x={ex}
                              y={ey}
                              radius={7}
                              hitStrokeWidth={14}
                              fill={WHITE}
                              stroke={BLUE}
                              strokeWidth={2.5}
                              draggable={tool !== "pan"}
                              onClick={(ev) => { ev.cancelBubble = true; }}
                              onTap={(ev) => { ev.cancelBubble = true; }}
                              dragBoundFunc={(absolutePos) => {
                                const pos = toWorld(absolutePos);
                                const [ax, ay] = px(e2.a.x, e2.a.y);
                                const [bx, by] = px(e2.b.x, e2.b.y);
                                const vx = bx - ax, vy = by - ay;
                                const len2 = vx * vx + vy * vy || 1;
                                let t = ((pos.x - ax) * vx + (pos.y - ay) * vy) / len2;
                                const tMin = (op.offset_ft + 1) / (e2.len || 1); // keep at least 1 ft wide
                                t = Math.max(tMin, Math.min(1, t));
                                return toScreen({ x: ax + vx * t, y: ay + vy * t });
                              }}
                              onDragEnd={(ev) => {
                                lastDrag.current = Date.now();
                                const [ax, ay] = px(e2.a.x, e2.a.y);
                                const dxft = (ev.target.x() - ax) / pxFt, dyft = (ev.target.y() - ay) / pxFt;
                                const alongEnd = dxft * ux + dyft * uy; // ft from edge start to the end handle
                                const width = clamp(snap(alongEnd-op.offset_ft),1,e2.len-op.offset_ft);
                                if (openings.some((o,k) => k !== i && o.edge === op.edge && op.offset_ft < o.offset_ft+o.width_ft && op.offset_ft+width > o.offset_ft)) {
                                  ev.target.position({x:ex,y:ey});
                                  setHint("Leave space between doors and windows.");
                                  return;
                                }
                                commit({ openings: openings.map((o, k) => (k === i ? { ...o, width_ft: width } : o)) });
                              }}
                            />
                          )}
                        </Group>
                      );
                    })}

                  {/* Placement preview following the cursor (desktop only). */}
                  {ghostOpening && (
                    <Group listening={false} opacity={0.6}>
                      <Line points={ghostOpening.gap} stroke={WHITE} strokeWidth={wallW + 1.5} />
                      <Line points={ghostOpening.gap} stroke={ghostOpening.kind === "door" ? INK : BLUE} strokeWidth={3} dash={[6, 4]} />
                      {ghostOpening.door && (
                        <>
                          <Arc x={ghostOpening.door.x} y={ghostOpening.door.y} innerRadius={0} outerRadius={ghostOpening.door.radius} angle={90} rotation={ghostOpening.door.rotation} fill={BLUE} opacity={0.1} />
                          <Line points={ghostOpening.door.leaf} stroke={INK} strokeWidth={2} dash={[4, 3]} />
                        </>
                      )}
                    </Group>
                  )}
                  {ghostCloset && (
                    <Rect listening={false} x={ghostCloset.x} y={ghostCloset.y} width={ghostCloset.w} height={ghostCloset.h} fill={BLUE} opacity={0.12} stroke={BLUE} strokeWidth={1.5} dash={[5, 4]} />
                  )}

                  {/* Dimension labels, in feet and inches */}
                  {dimLabels.map((d) => {
                    const sel = closed && selected?.kind === "wall" && selected.index === d.edge;
                    const size = d.live ? 15 : 13, h = d.live ? 30 : 26, pad = d.live ? 11 : 9;
                    const w = Math.ceil(textWidth(d.text, `800 ${size}px ${fonts.sans}`)) + pad * 2;
                    const off = wallW / 2 + 7 + Math.abs(d.nx) * w / 2 + Math.abs(d.ny) * h / 2;
                    let x = d.x + d.nx * off - w / 2, y = d.y + d.ny * off - h / 2;
                    // No room outside the canvas edge: tuck the label inside the wall instead.
                    if (x < 4 || y < 4 || x + w > stageW - 4 || y + h > stageH - 4) { x = d.x - d.nx * off - w / 2; y = d.y - d.ny * off - h / 2; }
                    return (
                      <Group key={d.key} listening={false}>
                        <Rect x={x} y={y} width={w} height={h} cornerRadius={d.live ? 8 : 6} fill={d.live || sel ? BLUE : INK} shadowColor={BLUE} shadowBlur={d.live ? 16 : 0} shadowOffsetY={d.live ? 6 : 0} shadowOpacity={d.live ? .3 : 0} />
                        <Text x={x} y={y} width={w} height={h} text={d.text} align="center" verticalAlign="middle" fontSize={size} fontFamily={fonts.sans} fontStyle="800" fill={WHITE} />
                      </Group>
                    );
                  })}
                </Layer>
              </Stage>
            )}

            {points.length === 0 && <div className={styles.empty}>
              <svg className={styles.emptyArt} viewBox="0 0 160 112" fill="none" aria-hidden="true">
                <path d="M26 86V26H124V86Z" stroke={GHOST} strokeWidth="3" strokeDasharray="7 6" />
                <path d="M26 86V26H92" stroke={INK} strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter" />
                <path d="M96 26H120" stroke={BLUE} strokeWidth="4" strokeDasharray="7 5" />
                <circle cx="26" cy="86" r="15" fill={HALO} />
                <circle cx="26" cy="86" r="7.5" fill="white" stroke={INK} strokeWidth="3" />
                <circle cx="26" cy="26" r="5.5" fill="white" stroke={INK} strokeWidth="2.5" />
                <circle cx="124" cy="26" r="8" fill={BLUE} stroke="white" strokeWidth="3" />
              </svg>
              <strong>Start at any corner.</strong>
              <p>Tap around your room, then return to the first dot.</p>
            </div>}
            <div className={styles.zoom} role="group" aria-label="Drawing view controls">
              <button type="button" disabled={zoom <= .75} onClick={() => applyZoom(zoom-.25)} aria-label="Zoom drawing out"><MinusIcon size={16} /></button>
              <output aria-label="Drawing zoom level" className="ds-num">{Math.round(zoom*100)}%</output>
              <button type="button" disabled={zoom >= 3} onClick={() => applyZoom(zoom+.25)} aria-label="Zoom drawing in"><PlusIcon size={16} /></button>
              <button type="button" className={styles.reset} onClick={() => { setZoom(1); setStagePos({x:0,y:0}); }}>Reset view</button>
            </div>
            <div className={styles.foot}>
              <p className={styles.hint} role="status" aria-live="polite"><InfoIcon size={18} className={styles.hintIcon} />{hintText}</p>
              <span className={styles.meta}>
                {closed && <span className={styles.area}><b className="ds-num">{Math.round(floorArea)}</b> sq ft</span>}
                <span className={styles.scale} aria-hidden="true"><i style={{ width: scalePx }} />{scaleFt} FT</span>
              </span>
            </div>
          </div>

          <aside className={styles.panel} aria-label="Room elements">
            <div className={styles.panelHead}>
              <h2>Room elements</h2>
              {closed && <span className="ds-num">{Math.round(floorArea)} sq ft</span>}
            </div>
            {walls.length === 0 && !liveLen ? (
              <p className={styles.emptyList}>No walls yet. Your first corner starts the outline.</p>
            ) : (
              <ol className={styles.list}>
                {walls.map((w) => {
                  const sel = selected?.kind === "wall" && selected.index === w.i;
                  const row = <><span className={styles.code}>W{w.i + 1}</span><span className={styles.name}>Wall</span><span className={styles.len}>{ftIn(w.len)}</span></>;
                  return <li key={"w" + w.i}>{closed
                    ? <button type="button" className={styles.row} aria-pressed={sel} onClick={() => selectWall(w.i)}>{row}</button>
                    : <span className={styles.row}>{row}</span>}</li>;
                })}
                {liveLen > 0 && <li><span className={`${styles.row} ${styles.live}`}><span className={styles.code}>W{walls.length + 1}</span><span className={styles.name}>Drawing…</span><span className={styles.len}>{ftIn(liveLen)}</span></span></li>}
                {openings.map((o, i) => {
                  const sel = selected?.kind === "opening" && selected.index === i;
                  return <li key={"o" + i}><button type="button" className={styles.row} aria-pressed={sel} onClick={() => { setHint(null); setSelected({ kind: "opening", index: i }); }}>
                    <span className={styles.code}>{o.kind === "door" ? <DoorIcon size={16} /> : <WindowIcon size={16} />}</span>
                    <span className={styles.name}>{o.kind === "door" ? "Door" : "Window"}<small>on W{o.edge + 1}</small></span>
                    <span className={styles.len}>{ftIn(o.width_ft)}</span>
                  </button></li>;
                })}
                {closets.map((c, i) => {
                  const sel = selected?.kind === "closet" && selected.index === i;
                  return <li key={"c" + i}><button type="button" className={styles.row} aria-pressed={sel} onClick={() => { setHint(null); setSelected({ kind: "closet", index: i }); }}>
                    <span className={styles.code}><ClosetIcon size={16} /></span>
                    <span className={styles.name}>Closet</span>
                    <span className={styles.len}>{ftIn(c.width_ft)} × {ftIn(c.depth_ft)}</span>
                  </button></li>;
                })}
              </ol>
            )}
            {!closed && !initialRoom && <p className={styles.note}>Doors, windows and closets come next, in step 2.</p>}

            {selected && (selected.kind==="opening"||selected.kind==="closet") && <div className={styles.inspect}>
              <p className={styles.inspectHead}><strong>{selectedLabel}</strong><small>{selected.kind === "closet" ? "Drag to move. Drag the corner to resize." : selectedDoor ? "Slide along the wall. Change the swing below." : "Slide along the wall. Drag the end to resize."}</small></p>
              <div className={styles.inspectActions}>
                {selectedDoor && <button type="button" className={styles.soft} onClick={rotateDoor}><SwingIcon size={16} />Change swing</button>}
                <button type="button" className={styles.danger} onClick={removeSelected}><TrashIcon size={16} />Remove</button>
              </div>
            </div>}

            {closed && tool==="wall" && <div className={styles.inspect}>
              <h3 className={styles.sub}>Exact measurements</h3>
              <label className={styles.field} htmlFor={inputId+"-wall-selection"}><span>Edit a wall or corner</span>
                <select id={inputId+"-wall-selection"} value={selected&&(selected.kind==="wall"||selected.kind==="corner")?selected.kind+":"+selected.index:""} onChange={e=>{const [kind,index]=e.target.value.split(":");setSelected(kind?{kind:kind as "wall"|"corner",index:Number(index)}:null);}}><option value="">Choose on the drawing or here</option>{points.map((_,i)=><option key={"w"+i} value={"wall:"+i}>Wall {i+1}</option>)}{points.map((_,i)=><option key={"c"+i} value={"corner:"+i}>Corner {i+1}</option>)}</select>
              </label>
              <p className={styles.small}>Drag a wall or a corner. Furniture stays in place.</p>
              {selected?.kind==="corner"&&<div className={styles.pair}>{(["x","y"] as const).map(axis=><label className={styles.field} key={axis}><span>Corner {axis.toUpperCase()} (ft)</span><input key={selected.index+":"+points[selected.index][axis]} aria-label={"Corner "+axis.toUpperCase()+" (ft)"} type="number" min="0" max={axis==="x"?SPAN_X:SPAN_Y} step=".5" defaultValue={points[selected.index][axis]} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.currentTarget.blur();}}} onBlur={e=>{const n=e.currentTarget.valueAsNumber;if(!Number.isFinite(n)||!editWallPoints(points.map((p,i)=>i===selected.index?{...p,[axis]:n}:p)))e.currentTarget.value=String(points[selected.index][axis]);}}/></label>)}</div>}
              {selected?.kind==="wall"&&<label className={styles.field}><span>Wall length (ft)</span><input key={selected.index+":"+edges[selected.index].len} aria-label="Wall length (ft)" type="number" min=".5" max="60" step=".5" defaultValue={round2(edges[selected.index].len)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.currentTarget.blur();}}} onBlur={e=>{const n=e.currentTarget.valueAsNumber,a=points[selected.index],j=(selected.index+1)%points.length,b=points[j],len=edges[selected.index].len;if(!Number.isFinite(n)||n<.5||!editWallPoints(points.map((p,i)=>i===j?{x:round2(a.x+(b.x-a.x)*n/len),y:round2(a.y+(b.y-a.y)*n/len)}:p)))e.currentTarget.value=String(round2(len));}}/></label>}
            </div>}

            <h2 className={styles.sectionHead}>Grid</h2>
            <label className={styles.toggle}>Show grid<input type="checkbox" checked={showGrid} onChange={() => setShowGrid(!showGrid)} /></label>
            <p className={styles.small}>Each small square is 6 inches. Walls snap to 6-inch increments and 15° angles.</p>

            <details className={styles.tips}>
              <summary>More tips</summary>
              <p>{initialRoom ? "Your furniture, products and budget are kept. If you move a wall through furniture, placement checks will help you rearrange it after applying." : "Furniture is added after you choose your style. You can rearrange it in the room studio."}</p>
              <p><kbd>Enter</kbd> Finish walls · <kbd>Ctrl/⌘ Z</kbd> Undo · <kbd>Ctrl/⌘ Shift Z</kbd> Redo · <kbd>R</kbd> Door swing · <kbd>Delete</kbd> Remove selection</p>
            </details>
            {!initialRoom&&<button type="button" className={styles.startOver} disabled={!points.length} onClick={clearAll}>Start over</button>}

            <div className={styles.panelFoot}>
              <p className={styles.status}>{closed ? initialRoom ? "Ready? Apply your changes to the room." : "Details are optional. Furniture comes next." : "Made a wrong turn? You can always undo."}</p>
              {chrome?.panel}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
