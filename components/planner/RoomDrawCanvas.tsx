"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Stage, Layer, Line, Rect, Circle, Text, Arc, Group } from "react-konva";
import Konva from "konva";
import type { ClosetRect, Point, RoomOutline, WallOpening, SelectedRoom, FurnitureItem } from "@/lib/types";

import { roomOutline } from "@/lib/studio";
import { roomEditError } from "@/lib/room-editing";
import { footprint } from "@/components/canvas/geometry";
import { fitViewport, zoomAt } from "@/components/canvas/viewport";
import { clamp, rectInsidePolygon } from "@/components/canvas/geometry";
import styles from "@/components/canvas/CanvasStudio.module.css";

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

const INK = "#17172b";
const GRID = "#e0e4eb";
const GRID5 = "#c5ccda";
const COBALT = "#2b4eff";
const AMBER = "#f0b100";
const WHITE = "#ffffff";

type Tool = "wall" | "door" | "window" | "closet" | "pan";
type Selected = { kind: "opening" | "closet" | "wall" | "corner"; index: number } | null;

const snap = (v: number) => Math.round(v * 2) / 2;
const round2 = (v: number) => Math.round(v * 100) / 100;

/** Length in feet-and-inches, e.g. 10.5 -> 10'6", 12 -> 12'. */
function ftIn(ft: number): string {
  const t = Math.round(ft * 12);
  const f = Math.floor(t / 12);
  const i = t % 12;
  return i === 0 ? `${f}'` : `${f}'${i}"`;
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
  onComplete, initialRoom, furniture = [], onCancel,
}: {
  onComplete: (result: RoomDrawResult) => void;
  initialRoom?: SelectedRoom;
  furniture?: FurnitureItem[];
  onCancel?: () => void;
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
  const [startLength, setStartLength] = useState("14");
  const [startWidth, setStartWidth] = useState("12");
  const [freeDraw, setFreeDraw] = useState(false);
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
    setFreeDraw(false);
    setSelected(null); setHint("Drawing cleared. Undo to bring it back."); setTool("wall"); setCursor(null);
  }
  function startShape(shape: "rectangle" | "l") {
    const length = Number(startLength), width = Number(startWidth);
    if (!Number.isFinite(length) || !Number.isFinite(width) || length < 4 || length > 24 || width < 4 || width > 18) {
      setHint("Enter a length from 4 to 24 ft and a width from 4 to 18 ft, or draw your own shape."); return;
    }
    const x = snap((SPAN_X-length)/2), y = snap((SPAN_Y-width)/2);
    const ring = shape === "rectangle"
      ? [{x,y},{x:x+length,y},{x:x+length,y:y+width},{x,y:y+width}]
      : [{x,y},{x:x+length,y},{x:x+length,y:y+width/2},{x:x+length/2,y:y+width/2},{x:x+length/2,y:y+width},{x,y:y+width}];
    commit({ points: ring, closed: true, openings: [], closets: [] });
    setTool("door"); setCursor(null); setHint(null);
    containerRef.current?.focus({preventScroll:true});
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
  const gridLines = useMemo(() => {
    const l: { key: string; pts: number[]; strong: boolean }[] = [];
    for (let i = 0; i <= SPAN_X; i++)
      l.push({ key: `v${i}`, pts: [ox + i * pxFt, oy, ox + i * pxFt, oy + SPAN_Y * pxFt], strong: i % 5 === 0 });
    for (let j = 0; j <= SPAN_Y; j++)
      l.push({ key: `h${j}`, pts: [ox, oy + j * pxFt, ox + SPAN_X * pxFt, oy + j * pxFt], strong: j % 5 === 0 });
    return l;
  }, [pxFt, ox, oy, SPAN_X, SPAN_Y]);

  const wallFlat = useMemo(() => {
    const seq = closed ? points : preview ? [...points, preview] : points;
    return seq.flatMap((p) => px(p.x, p.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, preview, closed, pxFt, ox, oy]);

  // Live dimension labels: one per committed edge, plus the live preview edge.
  const dimLabels = useMemo(() => {
    const labels: { key: string; x: number; y: number; text: string; live: boolean }[] = [];
    const put = (a: Point, b: Point, key: string, live: boolean) => {
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.25) return;
      const [mx, my] = px((a.x + b.x) / 2, (a.y + b.y) / 2);
      labels.push({ key, x: mx, y: my, text: ftIn(len), live });
    };
    if (!closed) {
      for (let i = 0; i < points.length - 1; i++) put(points[i], points[i + 1], `d${i}`, false);
      if (preview && points.length > 0) put(points[points.length - 1], preview, "dlive", true);
    } else {
      points.forEach((p, i) => put(p, points[(i + 1) % points.length], `d${i}`, false));
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
  const choosingShape = !initialRoom && !points.length && !freeDraw;
  const floorArea = closed ? Math.abs(points.reduce((sum,p,i) => { const next=points[(i+1)%points.length]; return sum+p.x*next.y-next.x*p.y; },0))/2 : 0;

  const TOOLS: { id: Tool; label: string; icon: React.ReactNode }[] = [
    { id: "wall", label: closed ? "Shape" : "Walls", icon: <path d="M3 6h18M3 6v12M21 6v12M3 18h18" /> },
    { id: "door", label: "Door", icon: <path d="M4 21h16M6 21V4h9v17M15 4l3 2v15M11 12h.5" /> },
    { id: "window", label: "Window", icon: <path d="M4 4h16v16H4zM12 4v16M4 12h16" /> },
    { id: "closet", label: "Closet", icon: <path d="M5 3h14v18H5zM12 3v18M9 11h.5M14.5 11h.5" /> },
  ];

  return (
    <div className={`${styles.studio} ${styles.drawing} dm-draw-toolbox`} onKeyDown={keyboard}>
      <div className={styles.topbar}>
        <div className={styles.title}><i /><strong>{initialRoom ? "Edit your room" : closed ? "Add your room’s details" : "Start with your room’s shape"}</strong></div>
        {closed && <span className={styles.meta}>{Math.round(floorArea)} sq ft</span>}
      </div>
      {!choosingShape && <div className={`${styles.toolbar} ${styles.drawToolbar} dm-draw-toolbar`} role="group" aria-label="Drawing tools">
          {TOOLS.filter(t => closed || t.id === "wall").map(t => <button key={t.id} type="button" aria-pressed={tool === t.id} onClick={() => { setTool(t.id); setSelected(null); setHint(null); setCursor(null); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>{t.label}
          </button>)}
          <button type="button" className={styles.drawUndo} onClick={undo} disabled={!history.current.length} aria-label="Undo" title="Undo (Ctrl/⌘ Z)">↶</button>
      </div>}
      {(!choosingShape || hint) && <p className={styles.drawHint} role="status" aria-live="polite">{hint ?? (tool === "pan" ? "Drag to move the view. Choose a tool to keep editing." : closed ? ({wall:"Drag a wall or corner to change the shape.",door:"Tap a wall where your door goes.",window:"Tap a wall to add a window.",closet:"Tap inside your room to add a closet."})[tool] : points.length ? "Keep tapping corners. Tap the first one again to finish your walls." : "Tap the grid to place your first corner.")}</p>}
      <div ref={containerRef} className={`${styles.surface} ${choosingShape ? styles.choosingShape : ""} dm-draw-canvas`} tabIndex={choosingShape ? -1 : 0} role="region" aria-label="Room drawing canvas" onPointerDown={e => { if (!(e.target as HTMLElement).closest("button,input")) containerRef.current?.focus({ preventScroll: true }); }}>
        {choosingShape && <div className={styles.drawStarter}>
          <h2>What shape is your room?</h2>
          <p>Choose the closest match. You can adjust it next.</p>
          <div className={styles.roomDimensions} role="group" aria-label="Room size">
            <label htmlFor={`${inputId}-length`}>Length (ft)<input id={`${inputId}-length`} type="number" min="4" max="24" step=".5" value={startLength} onChange={e => setStartLength(e.target.value)} /></label>
            <span aria-hidden="true">×</span>
            <label htmlFor={`${inputId}-width`}>Width (ft)<input id={`${inputId}-width`} type="number" min="4" max="18" step=".5" value={startWidth} onChange={e => setStartWidth(e.target.value)} /></label>
          </div>
          <div className={styles.shapeChoices}>
            <button type="button" onClick={() => startShape("rectangle")}><svg viewBox="0 0 48 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 5h38v30H5z"/></svg>Rectangle</button>
            <button type="button" onClick={() => startShape("l")}><svg viewBox="0 0 48 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 5h38v15H24v15H5z"/></svg>L-shape</button>
          </div>
          <button type="button" className={styles.drawOwn} onClick={() => { setFreeDraw(true); setTool("wall"); setHint(null); containerRef.current?.focus({preventScroll:true}); }}>Draw a different shape →</button>
        </div>}
        {!choosingShape && pxFt > 0 && (
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
              <Rect x={ox} y={oy} width={SPAN_X*pxFt} height={SPAN_Y*pxFt} fill="#fafaf8" stroke="#d2d6e0" strokeWidth={1} listening={false} />
              {/* Grid */}
              {showGrid && gridLines.map((l) => (
                <Line key={l.key} points={l.pts} stroke={l.strong ? GRID5 : GRID} strokeWidth={1} listening={false} />
              ))}

              {/* Room fill once closed */}
              {closed && <Line points={wallFlat} closed fill="#ffffffc9" listening={false} />}

              {/* Keep furniture visible while editing walls, without changing placement. */}
              {closed && furniture.map(f => { const b=footprint(f),[x,y]=px(f.x_ft,f.y_ft); return <Group key={f.id} listening={false} opacity={.45}>
                <Rect x={x} y={y} width={b.w*pxFt} height={b.h*pxFt} fill="#dfe5ff" stroke="#727eac" strokeWidth={1} cornerRadius={2}/>
                {b.w*pxFt>28&&b.h*pxFt>18&&<Text x={x+3} y={y+3} width={Math.max(1,b.w*pxFt-6)} height={Math.max(1,b.h*pxFt-6)} text={f.label} fontSize={10} fill={INK} align="center" verticalAlign="middle"/>}
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
                      fill="#e4e7df"
                      stroke={isSel ? COBALT : INK}
                      strokeWidth={isSel ? 2 : 1}
                      dash={[5, 3]}
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
                    <Text x={cx} y={cy} width={w} height={h} text="Closet" align="center" verticalAlign="middle" fontSize={Math.min(12, h * 0.4)} fontStyle="600" fill={INK} listening={false} />
                    {isSel && (
                      <Circle
                        x={cx + w}
                        y={cy + h}
                        radius={7}
                        hitStrokeWidth={14}
                        fill={WHITE}
                        stroke={COBALT}
                        strokeWidth={2}
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

              {/* Walls */}
              {wallFlat.length >= 4 && (
                <Line points={wallFlat} closed={closed} stroke={INK} strokeWidth={4} lineJoin="miter" lineCap="round" listening={false} />
              )}

              {/* Corner dots; the start dot glows so the user knows where to close */}
              {!closed &&
                points.map((p, i) => {
                  const [dx, dy] = px(p.x, p.y);
                  const isStart = i === 0;
                  return (
                    <Circle
                      key={`pt-${i}`}
                      x={dx}
                      y={dy}
                      radius={isStart && nearStart ? 8 : 4.5}
                      fill={isStart ? COBALT : WHITE}
                      stroke={isStart ? COBALT : INK}
                      strokeWidth={1.5}
                      listening={false}
                    />
                  );
                })}

              {closed && tool === "wall" && points.map((p,i) => {
                const q=points[(i+1)%points.length],[ax,ay]=px(p.x,p.y),[bx,by]=px(q.x,q.y);
                return <Group key={"wall-edit-"+i}>
                  <Line points={[ax,ay,bx,by]} stroke={selected?.kind==="wall"&&selected.index===i?COBALT:"transparent"} strokeWidth={5} hitStrokeWidth={20} draggable
                    onClick={e=>{e.cancelBubble=true;setSelected({kind:"wall",index:i});}} onTap={e=>{e.cancelBubble=true;setSelected({kind:"wall",index:i});}}
                    onDragStart={()=>setSelected({kind:"wall",index:i})}
                    onDragEnd={e=>{lastDrag.current=Date.now();const dx=snap(e.target.x()/pxFt),dy=snap(e.target.y()/pxFt);e.target.position({x:0,y:0});editWallPoints(points.map((v,n)=>n===i||n===(i+1)%points.length?{x:v.x+dx,y:v.y+dy}:v));}}/>
                  <Circle x={ax} y={ay} radius={6} hitStrokeWidth={16} fill={selected?.kind==="corner"&&selected.index===i?COBALT:WHITE} stroke={COBALT} strokeWidth={2} draggable
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
                  return (
                    <Group key={`op-${i}`}>
                      {/* white gap erases the wall under the opening */}
                      <Line points={[sx, sy, ex, ey]} stroke={WHITE} strokeWidth={5} listening={false} />
                      {op.kind === "window" ? (
                        <Line points={[sx, sy, ex, ey]} stroke={COBALT} strokeWidth={4} listening={false} />
                      ) : dg ? (
                        (() => {
                          const [hx, hy] = px(dg.hinge.x, dg.hinge.y);
                          const [lx, ly] = px(dg.leaf.x, dg.leaf.y);
                          return (
                            <>
                              <Arc x={hx} y={hy} innerRadius={0} outerRadius={op.width_ft * pxFt} angle={90} rotation={dg.rotation} fill={COBALT} opacity={0.08} listening={false} />
                              <Arc x={hx} y={hy} innerRadius={op.width_ft * pxFt} outerRadius={op.width_ft * pxFt} angle={90} rotation={dg.rotation} stroke={COBALT} strokeWidth={1.5} opacity={0.5} listening={false} />
                              <Line points={[hx, hy, lx, ly]} stroke={COBALT} strokeWidth={2} opacity={0.6} listening={false} />
                            </>
                          );
                        })()
                      ) : null}
                      {/* Drag handle: constrained to slide along this wall. */}
                      <Circle
                        x={mxp}
                        y={myp}
                        radius={isSel ? 8 : 6}
                        hitStrokeWidth={16}
                        fill={WHITE}
                        stroke={op.kind === "door" ? COBALT : AMBER}
                        strokeWidth={2}
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
                          stroke={AMBER}
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
                <Group listening={false} opacity={0.55}>
                  <Line points={ghostOpening.gap} stroke={WHITE} strokeWidth={5} />
                  <Line points={ghostOpening.gap} stroke={ghostOpening.kind === "door" ? COBALT : AMBER} strokeWidth={4} dash={[6, 4]} />
                  {ghostOpening.door && (
                    <>
                      <Arc x={ghostOpening.door.x} y={ghostOpening.door.y} innerRadius={0} outerRadius={ghostOpening.door.radius} angle={90} rotation={ghostOpening.door.rotation} fill={COBALT} opacity={0.1} />
                      <Line points={ghostOpening.door.leaf} stroke={COBALT} strokeWidth={2} dash={[4, 3]} />
                    </>
                  )}
                </Group>
              )}
              {ghostCloset && (
                <Rect listening={false} x={ghostCloset.x} y={ghostCloset.y} width={ghostCloset.w} height={ghostCloset.h} fill={INK} opacity={0.1} stroke={COBALT} strokeWidth={1.5} dash={[5, 4]} />
              )}

              {/* Dimension labels */}
              {dimLabels.map((d) => (
                <Group key={d.key} listening={false}>
                  <Rect x={d.x - 27} y={d.y - 10} width={54} height={20} cornerRadius={2} fill={WHITE} stroke="#17172b20" opacity={.96} />
                  <Text x={d.x - 27} y={d.y - 10} width={54} height={20} text={d.text} align="center" verticalAlign="middle" fontSize={11} fontStyle="600" fill={d.live ? COBALT : INK} />
                </Group>
              ))}
            </Layer>
          </Stage>
        )}

        {!choosingShape && <div className={styles.drawMeta}><span>1 square = 1 ft</span></div>}
        {!choosingShape && points.length === 0 && <div className={styles.empty}>
          <strong>Start at any corner.</strong>
          <p>Tap around your room, then return to the first dot.</p>
        </div>}
        {!choosingShape && <div className={styles.viewportControls} aria-label="Drawing view controls">
          <button type="button" disabled={zoom <= .75} onClick={() => applyZoom(zoom-.25)} aria-label="Zoom drawing out">−</button>
          <output aria-label="Drawing zoom level">{Math.round(zoom*100)}%</output>
          <button type="button" disabled={zoom >= 3} onClick={() => applyZoom(zoom+.25)} aria-label="Zoom drawing in">+</button>
          <button type="button" onClick={() => { setZoom(1); setStagePos({x:0,y:0}); }}>Reset view</button>
        </div>}
      </div>
      {closed && tool==="wall" && <details className={styles.drawPrecision}><summary>Exact measurements</summary><div className={styles.inspector}>
        <div className={styles.selection}><label htmlFor={inputId+"-wall-selection"}>Edit a wall or corner</label><select id={inputId+"-wall-selection"} value={selected&&(selected.kind==="wall"||selected.kind==="corner")?selected.kind+":"+selected.index:""} onChange={e=>{const [kind,index]=e.target.value.split(":");setSelected(kind?{kind:kind as "wall"|"corner",index:Number(index)}:null);}}><option value="">Choose on the drawing or here</option>{points.map((_,i)=><option key={"w"+i} value={"wall:"+i}>Wall {i+1}</option>)}{points.map((_,i)=><option key={"c"+i} value={"corner:"+i}>Corner {i+1}</option>)}</select><small>Drag a wall or a blue corner. Furniture stays in place.</small></div>
        {selected?.kind==="corner"&&(["x","y"] as const).map(axis=><label className={styles.geometryField} key={axis}>Corner {axis.toUpperCase()} (ft)<input key={selected.index+":"+points[selected.index][axis]} aria-label={"Corner "+axis.toUpperCase()+" (ft)"} type="number" min="0" max={axis==="x"?SPAN_X:SPAN_Y} step=".5" defaultValue={points[selected.index][axis]} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.currentTarget.blur();}}} onBlur={e=>{const n=e.currentTarget.valueAsNumber;if(!Number.isFinite(n)||!editWallPoints(points.map((p,i)=>i===selected.index?{...p,[axis]:n}:p)))e.currentTarget.value=String(points[selected.index][axis]);}}/></label>)}
        {selected?.kind==="wall"&&<label className={styles.geometryField}>Wall length (ft)<input key={selected.index+":"+edges[selected.index].len} aria-label="Wall length (ft)" type="number" min=".5" max="60" step=".5" defaultValue={round2(edges[selected.index].len)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.currentTarget.blur();}}} onBlur={e=>{const n=e.currentTarget.valueAsNumber,a=points[selected.index],j=(selected.index+1)%points.length,b=points[j],len=edges[selected.index].len;if(!Number.isFinite(n)||n<.5||!editWallPoints(points.map((p,i)=>i===j?{x:round2(a.x+(b.x-a.x)*n/len),y:round2(a.y+(b.y-a.y)*n/len)}:p)))e.currentTarget.value=String(round2(len));}}/></label>}
      </div></details>}
      {selected && (selected.kind==="opening"||selected.kind==="closet") && <div className={styles.inspector}>
        <div className={styles.selection}><strong>{selected.kind === "closet" ? "Closet" : openings[selected.index]?.kind === "door" ? "Door" : "Window"}</strong><small>{selected.kind === "closet" ? "Drag to move. Drag the corner to resize." : selectedDoor ? "Slide along the wall. Change the swing below." : "Slide along the wall. Drag the end to resize."}</small></div>
        {selectedDoor && <button type="button" className={styles.outlined} onClick={rotateDoor}>↻ Change swing</button>}
        <button type="button" className={styles.danger} onClick={removeSelected}>Remove</button>
      </div>}
      {!choosingShape && <div className={styles.footer}>
        <p>{closed ? initialRoom ? "Ready? Apply your changes to the room." : "Details are optional. Furniture comes next." : points.length ? "Made a wrong turn? You can always undo." : "Prefer a head start? Use a ready-made shape."}</p>
        {!initialRoom && !points.length && <button type="button" className={styles.outlined} onClick={() => { setFreeDraw(false); setHint(null); }}>Choose a shape</button>}
        {!closed && points.length >= 3 && <button type="button" className={styles.primary} onClick={finishOutline}>Finish walls →</button>}
        {onCancel&&<button type="button" className={styles.outlined} onClick={onCancel}>Cancel edits</button>}
        {canPlan && <button type="button" className={styles.primary} onClick={planRoom}>{initialRoom?"Apply room changes":"Choose my vibe →"}</button>}
      </div>}
      {(!choosingShape || history.current.length > 0 || future.current.length > 0) && <details className={styles.drawOptions}>
        <summary>More tools & tips</summary>
        <div className={styles.group}>
          {!choosingShape && <button type="button" aria-pressed={tool === "pan"} onClick={() => { setTool(tool === "pan" ? "wall" : "pan"); setSelected(null); setHint(null); setCursor(null); }}>Move the view</button>}
          {!choosingShape && <button type="button" aria-pressed={showGrid} onClick={() => setShowGrid(!showGrid)}>Show grid</button>}
          {choosingShape && <button type="button" onClick={undo} disabled={!history.current.length}>↶ Undo</button>}
          <button type="button" onClick={redo} disabled={!future.current.length}>↷ Redo</button>
          {!initialRoom&&<button type="button" className={styles.danger} disabled={!points.length} onClick={clearAll}>Start over</button>}
        </div>
        <div className={styles.help}>
        <p>{initialRoom ? "Your furniture, products and budget are kept. If you move a wall through furniture, placement checks will help you rearrange it after applying." : "Furniture is added after you choose your style. You can rearrange it in the room studio."}</p>
        <p>Each square is 1 ft. Walls snap to 6-inch increments and 15° angles.</p>
        <p><kbd>Enter</kbd> Finish walls · <kbd>Ctrl/⌘ Z</kbd> Undo · <kbd>Ctrl/⌘ Shift Z</kbd> Redo · <kbd>R</kbd> Door swing · <kbd>Delete</kbd> Remove selection</p>
        </div>
      </details>}
    </div>
  );
}
