"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Line, Rect, Circle, Text, Arc, Group } from "react-konva";
import Konva from "konva";
import type { ClosetRect, Point, RoomOutline, WallOpening } from "@/lib/types";

// Cap the backing-store resolution on high-DPR phones (same reasoning as RoomCanvas).
if (typeof window !== "undefined") {
  Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
}

// The blank drawing surface is a fixed grid in feet; the user clicks corners to
// trace a rectilinear outline, which is normalized to origin on completion.
const PAD = 24;
const SPAN_X = 26; // ft shown across
const SPAN_Y = 20; // ft shown down
const DOOR_FT = 3;
const WINDOW_FT = 4;
const CLOSET_W = 2.5;
const CLOSET_D = 2;
const CLOSE_SNAP_FT = 0.75; // click within this of the start point to close the loop
// Walls snap to this angle increment, so diagonals are precise (0/15/.../90...)
// without being freeform. 15deg covers 45deg cut-corners and shallower bays.
const ANGLE_STEP = 15;

const INK = "#17172b";
const GRID = "#e8ecf6";
const GRID5 = "#cdd6ec";
const COBALT = "#2b4eff";
const AMBER = "#f0b100";
const WHITE = "#ffffff";

type Tool = "wall" | "door" | "window" | "closet";
type Selected = { kind: "opening" | "closet"; index: number } | null;

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
}

/**
 * The "Design your room" editor. The user traces a rectilinear wall outline,
 * drops fixed-size doors/windows onto walls and resizable closets inside, then
 * "Plan this room" hands a normalized RoomOutline (+ bbox dims) back up.
 */
export default function RoomDrawCanvas({
  onComplete,
}: {
  onComplete: (result: RoomDrawResult) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);

  const [tool, setTool] = useState<Tool>("wall");
  const [points, setPoints] = useState<Point[]>([]);
  const [closed, setClosed] = useState(false);
  const [openings, setOpenings] = useState<WallOpening[]>([]);
  const [closets, setClosets] = useState<ClosetRect[]>([]);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [selected, setSelected] = useState<Selected>(null);
  const [hint, setHint] = useState<string | null>(null);
  const history = useRef<Snapshot[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => setContainerW(e[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pxFt = containerW > 0 ? (containerW - PAD * 2) / SPAN_X : 0;
  const stageW = containerW;
  const stageH = SPAN_Y * pxFt + PAD * 2;
  const px = (xFt: number, yFt: number): [number, number] => [PAD + xFt * pxFt, PAD + yFt * pxFt];

  // ---- history / undo -------------------------------------------------------
  function snapshot(): Snapshot {
    return { points: [...points], closed, openings: [...openings], closets: [...closets] };
  }
  function commit(next: Partial<Snapshot>) {
    history.current.push(snapshot());
    if (next.points !== undefined) setPoints(next.points);
    if (next.closed !== undefined) setClosed(next.closed);
    if (next.openings !== undefined) setOpenings(next.openings);
    if (next.closets !== undefined) setClosets(next.closets);
  }
  function undo() {
    const prev = history.current.pop();
    if (!prev) return;
    setPoints(prev.points);
    setClosed(prev.closed);
    setOpenings(prev.openings);
    setClosets(prev.closets);
    setSelected(null);
    setHint(null);
  }
  function clearAll() {
    history.current = [];
    setPoints([]);
    setClosed(false);
    setOpenings([]);
    setClosets([]);
    setSelected(null);
    setHint(null);
    setTool("wall");
  }

  // ---- cursor + rubber-band preview ----------------------------------------
  function pointerFt(stage: Konva.Stage | null): Point | null {
    const p = stage?.getPointerPosition();
    if (!p) return null;
    return { x: snap((p.x - PAD) / pxFt), y: snap((p.y - PAD) / pxFt) };
  }

  const nearStart =
    cursor && points.length >= 3 && !closed
      ? Math.hypot(cursor.x - points[0].x, cursor.y - points[0].y) <= CLOSE_SNAP_FT
      : false;

  // Wall preview: snap the angle from the previous corner to ANGLE_STEP and the
  // length to the half-foot grid, so horizontal/vertical AND clean diagonals are
  // both easy to draw without going fully freeform.
  const preview: Point | null = (() => {
    if (tool !== "wall" || closed || points.length === 0 || !cursor) return null;
    if (nearStart) return points[0];
    const last = points[points.length - 1];
    const dx = cursor.x - last.x, dy = cursor.y - last.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-6) return last;
    const ang = Math.round((Math.atan2(dy, dx) * 180) / Math.PI / ANGLE_STEP) * ANGLE_STEP;
    const rad = (ang * Math.PI) / 180;
    const len = Math.max(0.5, snap(dist));
    return { x: round2(last.x + Math.cos(rad) * len), y: round2(last.y + Math.sin(rad) * len) };
  })();

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
    const ft = pointerFt(e.target.getStage());
    if (!ft) return;
    setHint(null);

    if (tool === "wall") {
      if (closed) return;
      if (points.length === 0) {
        commit({ points: [ft] });
        return;
      }
      if (nearStart) {
        finishOutline();
        return;
      }
      if (preview) {
        // Ignore a zero-length repeat click on the same corner.
        const last = points[points.length - 1];
        if (preview.x === last.x && preview.y === last.y) return;
        commit({ points: [...points, preview] });
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
      const offset = snap(Math.max(0, Math.min(e2.len - width, t - width / 2)));
      commit({ openings: [...openings, { kind: tool, edge, offset_ft: offset, width_ft: width }] });
      setSelected({ kind: "opening", index: openings.length });
      return;
    }

    if (tool === "closet") {
      const x = snap(Math.max(0, ft.x - CLOSET_W / 2));
      const y = snap(Math.max(0, ft.y - CLOSET_D / 2));
      commit({ closets: [...closets, { x_ft: x, y_ft: y, width_ft: CLOSET_W, depth_ft: CLOSET_D }] });
      setSelected({ kind: "closet", index: closets.length });
    }
  }

  function finishOutline() {
    if (points.length < 3) return;
    const ring = [...points];
    // The loop closes on the last-corner -> start edge (any angle is fine now).
    if (!isSimpleRing(ring)) {
      setHint("That outline crosses itself. Undo the last corner and try again.");
      return;
    }
    commit({ points: ring, closed: true });
    setTool("door");
    setHint("Walls done. Add doors, windows, and closets, or plan the room.");
  }

  // ---- delete selected ------------------------------------------------------
  function removeSelected() {
    if (!selected) return;
    if (selected.kind === "opening") {
      commit({ openings: openings.filter((_, i) => i !== selected.index) });
    } else {
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

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if ((ev.key === "Delete" || ev.key === "Backspace") && selected) {
        ev.preventDefault();
        removeSelected();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
    onComplete({ outline, lengthFt, widthFt });
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
      l.push({ key: `v${i}`, pts: [PAD + i * pxFt, PAD, PAD + i * pxFt, PAD + SPAN_Y * pxFt], strong: i % 5 === 0 });
    for (let j = 0; j <= SPAN_Y; j++)
      l.push({ key: `h${j}`, pts: [PAD, PAD + j * pxFt, PAD + SPAN_X * pxFt, PAD + j * pxFt], strong: j % 5 === 0 });
    return l;
  }, [pxFt]);

  const wallFlat = useMemo(() => {
    const seq = closed ? points : preview ? [...points, preview] : points;
    return seq.flatMap((p) => px(p.x, p.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, preview, closed, pxFt]);

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
  }, [points, preview, closed, pxFt]);

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
        const offset = snap(Math.max(0, Math.min(e2.len - width, t - width / 2)));
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

  const TOOLS: { id: Tool; label: string; icon: React.ReactNode }[] = [
    { id: "wall", label: "Wall", icon: <path d="M3 6h18M3 6v12M21 6v12M3 18h18" /> },
    { id: "door", label: "Door", icon: <path d="M4 21h16M6 21V4h9v17M15 4l3 2v15M11 12h.5" /> },
    { id: "window", label: "Window", icon: <path d="M4 4h16v16H4zM12 4v16M4 12h16" /> },
    { id: "closet", label: "Closet", icon: <path d="M5 3h14v18H5zM12 3v18M9 11h.5M14.5 11h.5" /> },
  ];

  return (
    <div className="w-full select-none">
      {/* Toolbar: same island treatment as the result-page canvas toolbar. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-0.5 rounded-2xl border border-ink/10 bg-white p-1 shadow-[0_10px_28px_-16px_rgba(23,23,43,0.5)]">
          {TOOLS.map((t) => {
            const active = tool === t.id;
            const disabled = t.id !== "wall" && !closed;
            return (
              <button
                key={t.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setTool(t.id);
                  setSelected(null);
                  setHint(null);
                }}
                aria-pressed={active}
                aria-disabled={disabled}
                title={disabled ? "Complete your room outline first" : `${t.label} tool`}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-cobalt text-white"
                    : disabled
                      ? "cursor-not-allowed text-ink/30 opacity-60"
                      : "text-ink hover:bg-ink/[0.06] hover:text-cobalt"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {t.icon}
                </svg>
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {selectedDoor && (
            <button
              type="button"
              onClick={rotateDoor}
              title="Rotate the door's swing direction"
              className="flex items-center gap-1.5 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-cobalt hover:text-cobalt"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
              </svg>
              Swing
            </button>
          )}
          {selected && (
            <button
              type="button"
              onClick={removeSelected}
              className="flex items-center gap-1.5 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-red-500 hover:text-red-600"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={undo}
            disabled={history.current.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-cobalt hover:text-cobalt disabled:cursor-not-allowed disabled:text-ink/25"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Undo
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-red-500 hover:text-red-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Locked-tools notice: doors/windows/closets need an enclosed outline. */}
      {!closed && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs leading-snug text-ink-soft">
          <svg viewBox="0 0 24 24" className="mt-px h-3.5 w-3.5 shrink-0 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
          </svg>
          Connect the walls into a closed shape to unlock the door, window, and
          closet tools.
        </div>
      )}

      {/* Furniture-placement disclaimer, persistent while drawing. Same quiet
          info-note treatment as the estimated-dimensions note elsewhere. */}
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-cobalt/20 bg-cobalt/[0.04] px-3 py-2 text-xs leading-snug text-ink-soft">
        <svg viewBox="0 0 24 24" className="mt-px h-3.5 w-3.5 shrink-0 text-cobalt" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11.5v4.5" strokeLinecap="round" />
          <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
        </svg>
        <span>
          Furniture is added automatically once you plan your room. You can adjust
          everything afterward.
        </span>
      </div>

      <div ref={containerRef} className="relative w-full overflow-hidden rounded-2xl border border-ink/10 bg-white">
        {pxFt > 0 && (
          <Stage
            width={stageW}
            height={stageH}
            onClick={handleStageClick}
            onTap={handleStageClick}
            onMouseMove={(e) => setCursor(pointerFt(e.target.getStage()))}
            onMouseLeave={() => setCursor(null)}
            style={{ cursor: tool === "wall" ? "crosshair" : "copy" }}
          >
            <Layer>
              {/* Grid */}
              {gridLines.map((l) => (
                <Line key={l.key} points={l.pts} stroke={l.strong ? GRID5 : GRID} strokeWidth={1} listening={false} />
              ))}

              {/* Room fill once closed */}
              {closed && <Line points={wallFlat} closed fill="rgba(43,78,255,0.04)" listening={false} />}

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
                      fill={INK}
                      opacity={0.08}
                      stroke={isSel ? COBALT : INK}
                      strokeWidth={isSel ? 2 : 1}
                      dash={[4, 3]}
                      draggable
                      onClick={(e) => { e.cancelBubble = true; setSelected({ kind: "closet", index: i }); }}
                      onTap={(e) => { e.cancelBubble = true; setSelected({ kind: "closet", index: i }); }}
                      onDragStart={(e) => { e.cancelBubble = true; setSelected({ kind: "closet", index: i }); }}
                      onDragEnd={(e) => {
                        const nx = snap((e.target.x() - PAD) / pxFt);
                        const ny = snap((e.target.y() - PAD) / pxFt);
                        commit({ closets: closets.map((cc, k) => (k === i ? { ...cc, x_ft: Math.max(0, nx), y_ft: Math.max(0, ny) } : cc)) });
                      }}
                    />
                    <Text x={cx} y={cy} width={w} height={h} text="Closet" align="center" verticalAlign="middle" fontSize={Math.min(12, h * 0.4)} fontStyle="600" fill={INK} opacity={0.55} listening={false} />
                    {isSel && (
                      <Circle
                        x={cx + w}
                        y={cy + h}
                        radius={7}
                        fill={WHITE}
                        stroke={COBALT}
                        strokeWidth={2}
                        draggable
                        onDragEnd={(e) => {
                          const nw = snap(Math.max(1, (e.target.x() - cx) / pxFt));
                          const nh = snap(Math.max(1, (e.target.y() - cy) / pxFt));
                          commit({ closets: closets.map((cc, k) => (k === i ? { ...cc, width_ft: nw, depth_ft: nh } : cc)) });
                        }}
                      />
                    )}
                  </Group>
                );
              })}

              {/* Walls */}
              {wallFlat.length >= 4 && (
                <Line points={wallFlat} closed={closed} stroke={INK} strokeWidth={2.5} lineJoin="round" lineCap="round" listening={false} />
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
                        fill={WHITE}
                        stroke={op.kind === "door" ? COBALT : AMBER}
                        strokeWidth={2}
                        draggable
                        onClick={(ev) => { ev.cancelBubble = true; setSelected({ kind: "opening", index: i }); }}
                        onTap={(ev) => { ev.cancelBubble = true; setSelected({ kind: "opening", index: i }); }}
                        onDragStart={(ev) => { ev.cancelBubble = true; setSelected({ kind: "opening", index: i }); }}
                        dragBoundFunc={(pos) => {
                          // Project onto the edge, clamp so the opening stays on the wall.
                          const [ax, ay] = px(e2.a.x, e2.a.y);
                          const [bx, by] = px(e2.b.x, e2.b.y);
                          const vx = bx - ax, vy = by - ay;
                          const len2 = vx * vx + vy * vy || 1;
                          let t = ((pos.x - ax) * vx + (pos.y - ay) * vy) / len2;
                          const half = op.width_ft / 2 / (e2.len || 1);
                          t = Math.max(half, Math.min(1 - half, t));
                          return { x: ax + vx * t, y: ay + vy * t };
                        }}
                        onDragEnd={(ev) => {
                          const [ax, ay] = px(e2.a.x, e2.a.y);
                          const dxft = (ev.target.x() - ax) / pxFt;
                          const dyft = (ev.target.y() - ay) / pxFt;
                          const along = dxft * ux + dyft * uy; // ft from edge start to handle (mid)
                          const offset = snap(Math.max(0, Math.min(e2.len - op.width_ft, along - op.width_ft / 2)));
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
                          fill={WHITE}
                          stroke={AMBER}
                          strokeWidth={2.5}
                          draggable
                          onClick={(ev) => { ev.cancelBubble = true; }}
                          onTap={(ev) => { ev.cancelBubble = true; }}
                          dragBoundFunc={(pos) => {
                            const [ax, ay] = px(e2.a.x, e2.a.y);
                            const [bx, by] = px(e2.b.x, e2.b.y);
                            const vx = bx - ax, vy = by - ay;
                            const len2 = vx * vx + vy * vy || 1;
                            let t = ((pos.x - ax) * vx + (pos.y - ay) * vy) / len2;
                            const tMin = (op.offset_ft + 1) / (e2.len || 1); // keep at least 1 ft wide
                            t = Math.max(tMin, Math.min(1, t));
                            return { x: ax + vx * t, y: ay + vy * t };
                          }}
                          onDragEnd={(ev) => {
                            const [ax, ay] = px(e2.a.x, e2.a.y);
                            const dxft = (ev.target.x() - ax) / pxFt, dyft = (ev.target.y() - ay) / pxFt;
                            const alongEnd = dxft * ux + dyft * uy; // ft from edge start to the end handle
                            const width = snap(Math.max(1, Math.min(e2.len - op.offset_ft, alongEnd - op.offset_ft)));
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
                  <Rect x={d.x - 18} y={d.y - 9} width={36} height={18} cornerRadius={4} fill={WHITE} opacity={0.9} />
                  <Text x={d.x - 18} y={d.y - 9} width={36} height={18} text={d.text} align="center" verticalAlign="middle" fontSize={11} fontStyle="600" fill={d.live ? COBALT : INK} />
                </Group>
              ))}
            </Layer>
          </Stage>
        )}

        {/* Empty-state hint overlay before any point is placed */}
        {points.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="max-w-xs text-center text-sm leading-relaxed text-ink-soft">
              Tap to drop your first corner, then tap around the room. Walls snap
              square and to a 6-inch grid. Tap the first corner again to close.
            </p>
          </div>
        )}
      </div>

      {/* Status line + primary action */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="min-h-5 text-sm text-ink-soft" aria-live="polite">
          {hint ??
            (!closed
              ? points.length === 0
                ? "Draw wall: tap to place corners."
                : `${points.length} corner${points.length > 1 ? "s" : ""} placed${nearStart ? " · tap the glowing corner to close" : ""}.`
              : "Add doors, windows, and closets, or plan your room.")}
        </p>
        <button
          type="button"
          disabled={!canPlan}
          onClick={planRoom}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-cobalt px-8 text-base font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink-soft"
        >
          Plan this room →
        </button>
      </div>
    </div>
  );
}
