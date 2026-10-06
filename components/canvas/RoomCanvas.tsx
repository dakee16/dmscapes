"use client";

import {
  type KeyboardEvent,
  useId,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Stage, Layer, Group, Rect, Line, Arc, Text, Circle, Ellipse } from "react-konva";
import Konva from "konva";

// Cap the canvas backing-store resolution. High-DPR phones (devicePixelRatio 2-3)
// otherwise rasterize 2-3x the pixels on every drag/zoom/pinch redraw, which is a
// real mobile lag source; 2x keeps retina crispness while halving work on 3x screens.
if (typeof window !== "undefined") {
  Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
}
import type { KonvaEventObject } from "konva/lib/Node";
import type { FurnitureItem, ProductCategory, RoomOutline, WallOpening, Point } from "@/lib/types";
import { OPENING_DRAG_TYPE, openingCenter } from "@/lib/room-editing";
import { mixHex, roomThemeFor, styleFor, type RoomTheme } from "@/lib/styles";
import { usePlannerStore } from "@/lib/store";
import { furnitureCategory } from "@/lib/highlight";
import { bedLabel, isBunkBed } from "@/lib/bedding";
import { useWorkspace, useWorkspacePeople } from "@/components/workspace/WorkspaceContext";
import CollaborationOverlay from "@/components/workspace/CollaborationOverlay";
import { ownerName } from "@/lib/planning";
import { clamp, footprint, invalidItems, layerOf, pointInPolygon, rotateFurniture } from "./geometry";

import { createPortal } from "react-dom";
import { useCanvasDock } from "./CanvasControlsContext";
import CanvasToolRail from "./CanvasToolRail";
import { brandImage } from "@/lib/brand-image";
import FurnitureGlyph, { RoomGlyph, type BackSide } from "./FurnitureGlyph";
import RotationHandle from "./RotationHandle";
import { feetLabel, fitViewport, placedCoordinate, zoomAt } from "./viewport";
import { nearestClearance } from "./clearance";
import { useStudioUI } from "@/components/studio-ui/StudioUI";
import { feetInches } from "@/components/studio-ui/list";
import { AlertIcon, CheckIcon, LockIcon, MoreIcon, RotateIcon, SwapIcon, TrashIcon, UnlockIcon, UpRightIcon, EyeIcon, EyeOffIcon } from "@/components/studio-ui/icons";
import ProductLink from "@/components/products/ProductLink";
import { alternativesOf } from "@/lib/catalog";
import styles from "./PlanCanvas.module.css";

function Icon({ path }: { path: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>;
}

export interface RoomCanvasHandle {
  focusItem: (id:string)=>void;
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
const INK = "#16161D";
const PAPER = "#FBFAF6";
const GRID = "rgba(36, 73, 255, 0.07)";
const COBALT = "#2449FF";
const RED = "#D7262E";
const TAPE = "#F3C21A";
const MAGENTA = "#C0186F";
const PINK = "#FF4FA8";
/** Room view walls: a warm near-black. */
const WALL = "#2B2622";
const VIEW_KEY = "dormscape-canvas-view";
const NUMBERS_KEY = "dormscape-canvas-numbers";
type CanvasView = "room" | "plan";
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const luma = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (.299 * (n >> 16) + .587 * ((n >> 8) & 255) + .114 * (n & 255)) / 255; };
/** Pieces whose art has a back: a bed's head, chairs face away from it, dressers and appliances open away from it. */
const BACKED = new Set(["bed", "desk_chair", "chair", "lounge", "sofa", "dresser", "wardrobe", "fridge", "microwave"]);

/** Unit inward normal of edge e of a room outline: the perpendicular that points into the room. */
function inwardNormal(pts: Point[], e: number) {
  const n = pts.length, a = pts[e], b = pts[(e + 1) % n];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const cands = [{ nx: -dy, ny: dx }, { nx: dy, ny: -dx }];
  return cands.find((c) => pointInPolygon(mx + c.nx * 0.05, my + c.ny * 0.05, pts)) ?? cands[0];
}

const floorTiles = new Map<string, HTMLCanvasElement>();
/**
 * One repeat of the Room view floor, drawn once per vibe and resolution: 0.5 ft
 * planks along x, each board a touch lighter or darker than its neighbours,
 * board ends staggered every 3 or 4 ft, and faint grain. 12 ft × 4 ft, so the
 * pattern repeats without visible seams.
 */
function floorTile(theme: RoomTheme, res: number): HTMLCanvasElement {
  const key = `${theme.floor}|${theme.floorAlt}|${theme.woodDark}|${res}`;
  const hit = floorTiles.get(key);
  if (hit) return hit;
  if (floorTiles.size > 16) floorTiles.clear();
  const ROWS = 8, LEN = 12, plank = res / 2;
  const c = document.createElement("canvas");
  c.width = LEN * res; c.height = ROWS * plank;
  const ctx = c.getContext("2d")!;
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const seam = rgba(mixHex(theme.floor, theme.woodDark, .6), .55), grain = rgba(theme.woodDark, .08);
  for (let r = 0; r < ROWS; r++) {
    const y = r * plank, board = (rand() < .5 ? 3 : 4) * res, count = c.width / board, phase = rand() * board;
    const boards = Array.from({ length: count }, () => ({ tone: (rand() - .5) * .08, alt: rand() < .5, grain: [rand(), rand(), rand(), rand(), rand(), rand()] }));
    for (let k = 0; k <= count; k++) {
      const b = boards[k % count], x = k * board - phase;
      ctx.fillStyle = mixHex(b.alt ? theme.floorAlt : theme.floor, b.tone < 0 ? "#000000" : "#FFFFFF", Math.abs(b.tone));
      ctx.fillRect(x, y, board, plank);
      ctx.strokeStyle = grain; ctx.lineWidth = Math.max(.6, res / 80);
      for (let g = 0; g < 3; g++) {
        const gy = y + plank * (.22 + g * .28 + b.grain[g] * .08), wob = plank * .22;
        ctx.beginPath(); ctx.moveTo(x, gy);
        ctx.bezierCurveTo(x + board * .33, gy + (b.grain[g + 3] - .5) * wob, x + board * .66, gy - (b.grain[g + 3] - .5) * wob, x + board, gy);
        ctx.stroke();
      }
      ctx.fillStyle = seam; ctx.fillRect(x, y, Math.max(1, res / 55), plank);
    }
    ctx.fillStyle = seam; ctx.fillRect(0, y, c.width, Math.max(1, res / 60));
  }
  floorTiles.set(key, c);
  return c;
}

/**
 * Bottom-right brand lockup baked into exported PNGs: the folded-room mark plus the
 * "dormscape" wordmark on a soft, mostly-transparent backing. Subtle
 * over the room, but crisp enough to read as intentional branding when shared.
 */
function buildBrandWatermark(stageW: number, stageH: number): Konva.Group {
  const WM_FONT = `${getComputedStyle(document.documentElement).getPropertyValue("--font-archivo").trim() || "system-ui"}, Arial, sans-serif`;
  const fontSize = 14;
  const iconSize = 26;
  const gap = 6; // icon-to-wordmark
  const padX = 9;
  const padY = 6;
  const edge = 12; // inset from the canvas edges

  const dorm = new Konva.Text({
    text: "dorm",
    fontFamily: WM_FONT,
    fontStyle: "800",
    fontSize,
    fill: INK,
  });
  const scape = new Konva.Text({
    text: "scape",
    fontFamily: WM_FONT,
    fontStyle: "800",
    fontSize,
    fill: INK,
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
  const logo = brandImage();
  if (logo) group.add(new Konva.Image({image:logo,x:ix,y:iy,width:iconSize,height:iconSize}));

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
  const workspace = useWorkspace();
  useEffect(() => { brandImage(); }, []);
  const [openingPreview,setOpeningPreview]=useState<{index:number|null;opening:WallOpening}|null>(null);
  const openingCancelled=useRef(false);
  const openingGrab=useRef<Point>({x:0,y:0});
  const drawOutline=useMemo(()=>!outline||!openingPreview?outline:{...outline,openings:openingPreview.index===null?[...outline.openings,openingPreview.opening]:outline.openings.map((o,i)=>i===openingPreview.index?openingPreview.opening:o)},[outline,openingPreview]);
  useEffect(()=>{setOpeningPreview(null);},[outline,dock?.active]);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const labelRefs = useRef(new Map<string, Konva.Group>());
  const [viewport, setViewport] = useState({ width: 0, height: 420 });
  const [panMode, setPanMode] = useState(false);
  // Room view (illustrated) is the default; Plan view is the flat drawing. Each keeps its own grid setting.
  const [view, setViewState] = useState<CanvasView>("room");
  // List numbers on every piece crowd the plan, so by default only the piece in
  // focus (selected, or its row hovered or tapped in the list) shows its number.
  const [showNumbers, setShowNumbers] = useState(false);
  useEffect(() => { try {
    if (localStorage.getItem(VIEW_KEY) === "plan") setViewState("plan");
    if (localStorage.getItem(NUMBERS_KEY) === "on") setShowNumbers(true);
  } catch {} }, []);
  const toggleNumbers = () => { const next = !showNumbers; setShowNumbers(next); try { localStorage.setItem(NUMBERS_KEY, next ? "on" : "off"); } catch {} };
  const setView = (next: CanvasView) => { setViewState(next); try { localStorage.setItem(VIEW_KEY, next); } catch {} };
  const roomView = view === "room";
  const [grids, setGrids] = useState({ room: false, plan: true });
  const showGrid = grids[view];
  const toggleGrid = () => setGrids(g => ({ ...g, [view]: !g[view] }));
  // Off by default: each piece is drawn as what it is (FurnitureGlyph). The
  // Labels toggle still adds names; owners in a shared room always show.
  const [showLabels, setShowLabels] = useState(false);
  const [snapping, setSnapping] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; x: number; y: number } | null>(null);
  const [rotationPreview, setRotationPreview] = useState<{ id: string; degrees: number } | null>(null);
  // Phones get a lighter selection: no rotate handle (the toolbar has Rotate) and wall gaps only while dragging,
  // so a small piece isn't buried under its own controls.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => { const media = window.matchMedia("(max-width:780px)"); const update = () => setNarrow(media.matches); update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update); }, []);
  const helpId = useId();
  const selectId = useId();
  const lastPinchCenter = useRef<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  // Konva draws to <canvas>, so it needs the *real* font family next/font
  // generated (a hashed name), not the human name, otherwise it silently
  // falls back to a system font and the labels look off. We read it from the
  // CSS variables the layout sets (--font-martian / --font-archivo) and force a redraw once webfonts finish.
  const [labelFont, setLabelFont] = useState("ui-monospace, monospace");
  const [sansFont, setSansFont] = useState("Arial, sans-serif");
  const [itemMenu, setItemMenu] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarW, setToolbarW] = useState(300);
  const ui = useStudioUI();
  const lastPinch = useRef<number | null>(null);
  // Suppresses the click that Konva fires right after a drag/pan release.
  const dragGuard = useRef(0);

  // Shared cross-highlight state (result page). Hover wins over the pinned
  // click-selection visually, without clearing it.
  const hoveredCategory = usePlannerStore((s) => s.hoveredCategory);
  const selectedCategory = usePlannerStore((s) => s.selectedCategory);
  const selectedItemId = usePlannerStore((s) => s.selectedItemId);
  const planning = usePlannerStore(s=>s.planning);
  const people = useWorkspacePeople(planning.roommates);
  const checkHighlight = usePlannerStore(s=>s.checkHighlight);
  const setHoveredCategory = usePlannerStore((s) => s.setHoveredCategory);
  const toggleSelectedItem = usePlannerStore((s) => s.toggleSelectedItem);
  const clearSelectedCategory = usePlannerStore((s) => s.clearSelectedCategory);
  const hiddenItemIds = usePlannerStore((s) => s.hiddenItemIds);
  const selectedStyle = usePlannerStore(s => s.style);
  const collegeId = usePlannerStore(s => s.college?.id);
  const theme = roomThemeFor(selectedStyle, collegeId);
  const palette = styleFor(selectedStyle ?? "minimalist", collegeId).palette;
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
    // Martian Mono for plan labels and pins, Archivo for sizes and measurements.
    const root = getComputedStyle(document.documentElement);
    const mono = root.getPropertyValue("--font-martian").trim();
    const sans = root.getPropertyValue("--font-archivo").trim();
    if (mono) setLabelFont(`${mono}, ui-monospace, monospace`);
    if (sans) setSansFont(`${sans}, "Arial Narrow", Arial, sans-serif`);
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
  // Room view walls sit outside the floor, so leave room for them and the dimension lines.
  const wallMax = stageW < 450 ? 10 : 16;
  const fitted = fitViewport(stageW, stageH, roomL, roomW, (stageW < 450 ? 36 : 48) + (roomView ? wallMax : 0));
  const pxFt = fitted.scale;
  const roomWpx = roomL * pxFt;
  const roomHpx = roomW * pxFt;
  const wallT = roomView ? clamp(pxFt * .5, 6, wallMax) : 0;

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
        if (f.inventory || !f.product_category) return true;
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
    openingCancelled.current=true;setOpeningPreview(null);
    const stage = stageRef.current;
    stage?.find(".opening").forEach(node=>{if(node.isDragging())node.stopDrag();});
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
    if (readOnly && workspace?.commentOn && !panMode && !justDragged()) { workspace.commentOn(`furniture:${f.id}`); return; }
    if (readOnly || panMode || justDragged()) return;
    // Pin the item itself (rotate target) plus its product category so the
    // product-list cross-highlight keeps working exactly as before.
    toggleSelectedItem(f.id, furnitureCategory(f));
  }

  useImperativeHandle(ref, () => ({
    focusItem: id=>{const f=furniture.find(f=>f.id===id);if(!f)return;const b=footprint(f),z=1.35;setZoom(z);setStagePos({x:stageW/2-(fitted.x+(b.x+b.w/2)*pxFt)*z,y:stageH/2-(fitted.y+(b.y+b.h/2)*pxFt)*z});},
    exportPNG: () => {
      const stage = stageRef.current;
      if (!stage) return null;
      const layer = stage.getLayers()[0];
      const transform = { x: stage.x(), y: stage.y(), scaleX: stage.scaleX(), scaleY: stage.scaleY() };
      const editorNodes = stage.find(".editor-only");
      const exportNodes = stage.find(".export-only");
      const visibleBefore = editorNodes.map(node => node.visible());
      const mark = buildBrandWatermark(stage.width(), stage.height());
      try {
        // Export the complete fitted plan, even when the editor is zoomed/panned.
        stage.setAttrs({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
        editorNodes.forEach(node => node.hide());
        exportNodes.forEach(node => node.show());
        layer.add(mark);
        layer.draw();
        return stage.toDataURL({ pixelRatio: 2 });
      } finally {
        mark.destroy();
        editorNodes.forEach((node, i) => node.visible(visibleBefore[i]));
        exportNodes.forEach(node => node.hide());
        stage.setAttrs(transform);
        layer.draw();
      }
    },
  }));

  // The floating piece toolbar is centred over the piece; measure it to keep it on screen.
  useEffect(() => {
    const width = toolbarRef.current?.offsetWidth;
    if (width && Math.abs(width - toolbarW) > 1) setToolbarW(width);
  });
  const toolbarTarget = rotateTarget?.id;
  useEffect(() => { setItemMenu(false); }, [toolbarTarget]);

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
    if (!drawOutline || pxFt <= 0) return null;
    const pts = drawOutline.points;
    const n = pts.length;
    const px = (xFt: number, yFt: number): [number, number] => [PAD + xFt * pxFt, PAD + yFt * pxFt];
    const flat = pts.flatMap((p) => px(p.x, p.y));

    const openings = drawOutline.openings.map((op) => {
      const a = pts[op.edge], b = pts[(op.edge + 1) % n];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
      const s = { x: a.x + dx * op.offset_ft, y: a.y + dy * op.offset_ft };
      const e = { x: a.x + dx * (op.offset_ft + op.width_ft), y: a.y + dy * (op.offset_ft + op.width_ft) };
      const gap = [...px(s.x, s.y), ...px(e.x, e.y)];
      if (op.kind === "window") { const n = inwardNormal(pts, op.edge); return { kind: "window" as const, gap, normal: { x: n.nx, y: n.ny } }; }
      const nrm = inwardNormal(pts, op.edge);
      // swing (0-3): bit0 = hinge at gap end, bit1 = open outward.
      const swing = op.swing ?? 0;
      const hinge = swing & 1 ? e : s;
      const dirx = swing & 1 ? -dx : dx, diry = swing & 1 ? -dy : dy;
      const nx = swing & 2 ? -nrm.nx : nrm.nx, ny = swing & 2 ? -nrm.ny : nrm.ny;
      const angleD = (Math.atan2(diry, dirx) * 180) / Math.PI;
      const angleN = (Math.atan2(ny, nx) * 180) / Math.PI;
      const delta = (((angleN - angleD) % 360) + 360) % 360;
      const [hx, hy] = px(hinge.x, hinge.y);
      // The swing's footprint in feet (inward doors only), for clearance callouts.
      const corners = [hinge, { x: hinge.x + dirx * op.width_ft, y: hinge.y + diry * op.width_ft }, { x: hinge.x + nx * op.width_ft, y: hinge.y + ny * op.width_ft }];
      const swingBox = swing & 2 ? null : { x: Math.min(...corners.map(c => c.x)), y: Math.min(...corners.map(c => c.y)),
        w: Math.max(...corners.map(c => c.x)) - Math.min(...corners.map(c => c.x)), h: Math.max(...corners.map(c => c.y)) - Math.min(...corners.map(c => c.y)) };
      return {
        kind: "door" as const,
        swingBox,
        gap,
        normal: { x: nrm.nx, y: nrm.ny },
        door: {
          x: hx,
          y: hy,
          radius: op.width_ft * pxFt,
          rotation: delta < 180 ? angleD : angleN,
          leaf: [hx, hy, ...px(hinge.x + nx * op.width_ft, hinge.y + ny * op.width_ft)],
        },
      };
    });

    const closets = drawOutline.closets.map((c) => {
      const [x, y] = px(c.x_ft, c.y_ft);
      return { x, y, w: c.width_ft * pxFt, h: c.depth_ft * pxFt };
    });

    return { flat, openings, closets };
  }, [drawOutline, pxFt]);

  // Room view shell: the outline in px, each wall's inward normal (for the soft
  // shadow along it), and where daylight falls in from each window.
  const shell = useMemo(() => {
    if (!roomView || pxFt <= 0) return null;
    const pts: Point[] = drawOutline?.points ?? [{ x: 0, y: 0 }, { x: roomL, y: 0 }, { x: roomL, y: roomW }, { x: 0, y: roomW }];
    const px = (p: Point) => ({ x: PAD + p.x * pxFt, y: PAD + p.y * pxFt });
    const edges = pts.map((p, i) => { const n = inwardNormal(pts, i); return { a: px(p), b: px(pts[(i + 1) % pts.length]), nx: n.nx, ny: n.ny }; });
    const windows = drawOutline
      ? drawOutline.openings.flatMap((op) => {
          if (op.kind !== "window") return [];
          const a = pts[op.edge], b = pts[(op.edge + 1) % pts.length], len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          const t = (op.offset_ft + op.width_ft / 2) / len, n = inwardNormal(pts, op.edge);
          return [{ ...px({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }), angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, len: op.width_ft * pxFt, nx: n.nx, ny: n.ny }];
        })
      : [isCorridor ? { ...px({ x: roomL / 2, y: 0 }), angle: 0, len: 4 * pxFt, nx: 0, ny: 1 } : { ...px({ x: roomL, y: roomW / 2 }), angle: 90, len: 4 * pxFt, nx: -1, ny: 0 }];
    return { flat: pts.flatMap((p) => { const q = px(p); return [q.x, q.y]; }), edges, windows };
  }, [roomView, pxFt, drawOutline, roomL, roomW, isCorridor]);

  // Which side each bed, chair, sofa, dresser or appliance has its back on:
  // a bed's head is where its throw pillows sit (else the end nearest a wall),
  // chairs face their desk, everything else backs onto the nearest wall.
  const backs = useMemo(() => {
    const out = new Map<string, BackSide>();
    if (!roomView) return out;
    const centre = (f: FurnitureItem) => { const b = footprint(f); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
    const desks = displayFurniture.filter(f => f.type === "desk" || f.type === "table").map(centre);
    const pillows = displayFurniture.filter(f => f.type === "throw_pillows").map(centre);
    for (const f of displayFurniture) {
      if (!BACKED.has(f.type)) continue;
      const b = footprint(f), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      const desk = f.type === "desk_chair" ? desks.sort((p, q) => Math.hypot(p.x - cx, p.y - cy) - Math.hypot(q.x - cx, q.y - cy))[0] : undefined;
      let dir: [number, number];
      const pillow = f.type === "bed" ? pillows.find(c => c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h) : undefined;
      if (pillow) dir = [pillow.x - cx, pillow.y - cy];
      else if (f.type === "bed") dir = b.w >= b.h ? [b.x <= roomL - b.x - b.w ? -1 : 1, 0] : [0, b.y <= roomW - b.y - b.h ? -1 : 1];
      else if (desk && Math.hypot(desk.x - cx, desk.y - cy) < 5) dir = [cx - desk.x, cy - desk.y];
      else {
        const gaps = [b.y, roomL - b.x - b.w, roomW - b.y - b.h, b.x];
        dir = ([[0, -1], [1, 0], [0, 1], [-1, 0]] as [number, number][])[gaps.indexOf(Math.min(...gaps))];
      }
      const local = Math.atan2(dir[1], dir[0]) * 180 / Math.PI - f.rotation_deg;
      // A bed's head is one of its short ends: the top or bottom of its own frame.
      out.set(f.id, f.type === "bed" ? (Math.sin(local * Math.PI / 180) < 0 ? 0 : 2) : ((((Math.round(local / 90) + 1) % 4) + 4) % 4) as BackSide);
    }
    return out;
  }, [roomView, displayFurniture, roomL, roomW]);

  // The floor: one cached tile per vibe and zoom bucket, planks along the room's long side.
  const bucket = zoom <= 1 ? 1 : zoom <= 1.5 ? 1.5 : zoom <= 2 ? 2 : 3;
  const tileRes = Math.max(8, Math.min(280, Math.round(pxFt * bucket * (Konva.pixelRatio || 1) / 4) * 4));
  const tile = useMemo(() => roomView && pxFt > 0 && typeof document !== "undefined" ? floorTile(theme, tileRes) : null, [roomView, pxFt, theme, tileRes]);

  // The floor (boards, daylight, grid, wall shadows) is static while you drag:
  // cache it as one bitmap, capped near 8 megapixels, and redraw it only when it changes.
  const floorRef = useRef<Konva.Group>(null);
  useLayoutEffect(() => {
    const node = floorRef.current;
    if (!node) return;
    node.clearCache();
    const area = Math.max(1, (roomWpx + 2) * (roomHpx + 2));
    node.cache({ pixelRatio: Math.min((Konva.pixelRatio || 1) * bucket, Math.sqrt(8e6 / area)) });
  }, [shell, tile, showGrid, bucket, roomWpx, roomHpx, theme]);


  const toolbarItem = rotateTarget && visible.some(f => f.id === rotateTarget.id) ? rotateTarget : null;
  const toolbarHidden = toolbarItem ? hiddenItemIds.includes(toolbarItem.id) : false;
  const toolbarLocked = toolbarItem ? lockedItemIds.includes(toolbarItem.id) : false;
  const canEditItem = !!toolbarItem && !toolbarLocked && !toolbarHidden;
  const toolbarDeletable = !!toolbarItem && !toolbarLocked && (!!toolbarItem.inventory || (!toolbarItem.built_in && !!furnitureCategory(toolbarItem))) && !!onDeleteItem;
  const selectedFootprint = toolbarItem ? footprint(toolbarItem) : null;
  const rotationCenter = selectedFootprint ? {
    x: stagePos.x + (fitted.x + (selectedFootprint.x + selectedFootprint.w / 2) * pxFt) * zoom,
    y: stagePos.y + (fitted.y + (selectedFootprint.y + selectedFootprint.h / 2) * pxFt) * zoom,
  } : null;
  const rotationPosition = toolbarItem && rotationCenter ? (() => {
    const angle = toolbarItem.rotation_deg * Math.PI / 180;
    // Above the piece's top edge, at the end of its stem (top-centre, turning with it).
    const x = 0, y = -(toolbarItem.length_ft * pxFt * zoom / 2 + 34);
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
      openingCancelled.current=true;
      setOpeningPreview(null);dock?.openings.select(null);
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
    if (key === "g") toggleGrid();
    if (key === "n") toggleNumbers();
    if (key === "r" && canEditItem && toolbarItem) { event.preventDefault(); onRotate?.(toolbarItem.id, event.shiftKey ? -1 : 1); }
    const arrows: Record<string, [number, number]> = { arrowleft: [-1,0], arrowright: [1,0], arrowup: [0,-1], arrowdown: [0,1] };
    if (arrows[key] && canEditItem) { event.preventDefault(); nudge(...arrows[key], event.shiftKey); }
    if ((key === "delete" || key === "backspace") && toolbarDeletable && toolbarItem) { event.preventDefault(); onDeleteItem?.(toolbarItem); clearSelectedCategory(); }
  }

  function openingPoint(event:{clientX:number;clientY:number}):Point|null {
    const bounds=containerRef.current?.getBoundingClientRect();
    if(!bounds||pxFt<=0)return null;
    return {x:((event.clientX-bounds.left-stagePos.x)/zoom-fitted.x)/pxFt,y:((event.clientY-bounds.top-stagePos.y)/zoom-fitted.y)/pxFt};
  }
  function grabOpening(index:number){
    openingCancelled.current=false;
    const pointer=stageRef.current?.getPointerPosition(),center=openingCenter(outline!.points,outline!.openings[index]);
    openingGrab.current=pointer?{x:((pointer.x-stagePos.x)/zoom-fitted.x)/pxFt-center.x,y:((pointer.y-stagePos.y)/zoom-fitted.y)/pxFt-center.y}:{x:0,y:0};
  }
  function dragOpening(index:number){
    if(openingCancelled.current)return null;
    const pointer=stageRef.current?.getPointerPosition();
    if(!pointer)return null;
    return dock?.openings.preview(index,{x:((pointer.x-stagePos.x)/zoom-fitted.x)/pxFt-openingGrab.current.x,y:((pointer.y-stagePos.y)/zoom-fitted.y)/pxFt-openingGrab.current.y})??null;
  }
  function dropKind(types:readonly string[]){return (["door","window"] as const).find(kind=>types.includes(OPENING_DRAG_TYPE+"-"+kind));}
  // ---------- derived view state for the overlays ----------
  const entryFor = ui?.entryFor;
  const ghost = !readOnly ? ui?.ghost ?? null : null;
  const ghostIds = new Set(ghost?.replaces ?? []);
  const toolbarEntry = toolbarItem ? entryFor?.(toolbarItem) : undefined;
  const canSwap = !!ui && !!toolbarEntry && !toolbarEntry.custom && alternativesOf(toolbarEntry.product).length > 0;
  const doorBoxes = drawn ? drawn.openings.flatMap(o => o.kind === "door" && o.swingBox ? [o.swingBox] : []) : [];
  const live = (f: FurnitureItem) => dragging?.id === f.id ? { ...f, x_ft: dragging.x, y_ft: dragging.y } : f;
  const previewing = !!ghost && !!toolbarItem && ghostIds.has(toolbarItem.id);
  const clearance = toolbarItem && dock && !readOnly && !rotationPreview && !previewing && (!narrow || !!dragging)
    ? nearestClearance(live(toolbarItem), activeFurniture.map(live), roomL, roomW, doorBoxes, f => bedLabel(f).slice(0, 18))
    : null;
  const wallW = Math.max(4, Math.min(9, pxFt * .17));
  const z = zoom || 1;
  const ftLabel = (n: number) => `${Number.isInteger(Math.round(n * 10) / 10) ? Math.round(n) : n.toFixed(1)} ft`;
  const textW = (text: string, size: number) => text.length * size * .56;
  const toolbarPos = toolbarItem && selectedFootprint ? (() => {
    const left = stagePos.x + (fitted.x + selectedFootprint.x * pxFt) * zoom, top = stagePos.y + (fitted.y + selectedFootprint.y * pxFt) * zoom;
    const width = selectedFootprint.w * pxFt * zoom, height = selectedFootprint.h * pxFt * zoom;
    const above = top - 98;
    const y = above >= 8 ? above : Math.min(top + height + 18, stageH - 58);
    const half = toolbarW / 2 + 8;
    return { x: clamp(left + width / 2, half, Math.max(half, stageW - half)), y };
  })() : null;
  const status = ghost
    ? { ok: ghost.fits, text: ghost.fits ? "Preview fits · nothing moves" : "Preview needs a fit check" }
    : dragging
      ? { ok: !invalid.has(dragging.id), text: `Position: ${feetLabel(dragging.x)} / ${feetLabel(dragging.y)}` }
      : invalid.size
        ? { ok: false, text: `${invalid.size} ${invalid.size === 1 ? "piece needs" : "pieces need"} a fit check` }
        : { ok: true, text: readOnly ? `${activeFurniture.length} pieces in this room` : "Everything fits · no overlaps" };
  const scaleFt = pxFt * zoom * 2 > 130 ? 1 : 2;

  // ---------- Room view: floor, walls, light, door, window, closets ----------
  const darkFloor = luma(theme.floor) < .4;
  const hatch = darkFloor ? "#FFFFFF" : WALL;
  const swingStroke = roomView && darkFloor ? "rgba(255, 255, 255, 0.55)" : "rgba(22, 22, 29, 0.45)";
  const leafStroke = darkFloor ? "#E9E4DC" : WALL;
  const shadowDepth = clamp(pxFt * .2, 6, 10);
  /** A wall gap from a to b, filled across the wall's thickness (outward = away from the floor). */
  const wallGap = (key: string, a: Point, b: Point, out: Point, fill: string) =>
    <Line key={key} points={[a.x, a.y, b.x, b.y, b.x + out.x * (wallT + 1), b.y + out.y * (wallT + 1), a.x + out.x * (wallT + 1), a.y + out.y * (wallT + 1)].map((v, i) => v - (i % 2 ? out.y : out.x) * .5)} closed fill={fill} listening={false} />;
  /** A window in that gap: pale glass down the middle of the wall, a thin frame at both faces. */
  const windowGlass = (key: string, a: Point, b: Point, out: Point) => <Group key={key} listening={false}>
    {wallGap("sill", a, b, out, "#EEF4F8")}
    {[0, 1].map(f => <Line key={f} points={[a.x + out.x * wallT * f, a.y + out.y * wallT * f, b.x + out.x * wallT * f, b.y + out.y * wallT * f]} stroke="#9A938A" strokeWidth={1} />)}
    <Line points={[a.x + out.x * wallT / 2, a.y + out.y * wallT / 2, b.x + out.x * wallT / 2, b.y + out.y * wallT / 2]} stroke="#CFE3F2" strokeWidth={Math.max(2, wallT * .35)} />
  </Group>;
  const roomCloset = (key: string, x: number, y: number, cw: number, ch: number, rod: boolean) => <Group key={key} x={x} y={y} listening={false} clipFunc={(ctx) => { ctx.rect(0, 0, cw, ch); }}>
    <Rect width={cw} height={ch} fill={rgba(WALL, darkFloor ? .25 : .09)} />
    {Array.from({ length: Math.ceil((cw + ch) / 7) }, (_, k) => <Line key={k} points={[k * 7 - ch, 0, k * 7, ch]} stroke={hatch} opacity={.16} strokeWidth={1} />)}
    {rod && (() => {
      const across = cw >= ch, long = across ? cw : ch, short = across ? ch : cw, n = Math.max(2, Math.floor((long - 12) / 8));
      const pt = (t: number, u: number) => across ? [t, u] : [u, t];
      return <>
        <Line points={[...pt(6, short / 2), ...pt(long - 6, short / 2)]} stroke={hatch} opacity={.6} strokeWidth={1.5} />
        {Array.from({ length: n }, (_, k) => { const t = 10 + k * (long - 20) / (n - 1); return <Line key={k} points={[...pt(t, short * .2), ...pt(t, short * .8)]} stroke={hatch} opacity={.4} strokeWidth={1.2} />; })}
      </>;
    })()}
    <Rect width={cw} height={ch} stroke={hatch} opacity={.55} strokeWidth={1.5} />
    {showLabels && cw > 46 && ch > 16 && <Text width={cw} height={ch} align="center" verticalAlign="middle" text="CLOSET" fontFamily={labelFont} fontStyle="700" fontSize={9} letterSpacing={.7} fill={hatch} />}
  </Group>;
  const roomShell = roomView && shell ? <>
    {/* Walls: twice as thick, centred on the outline; the floor covers the inner half, leaving square outer walls. */}
    <Line points={shell.flat} closed stroke={WALL} strokeWidth={wallT * 2} lineJoin="miter" listening={false} />
    <Group ref={floorRef} listening={false} clipFunc={(ctx) => { ctx.beginPath(); for (let i = 0; i < shell.flat.length; i += 2) { if (i === 0) ctx.moveTo(shell.flat[0], shell.flat[1]); else ctx.lineTo(shell.flat[i], shell.flat[i + 1]); } ctx.closePath(); }}>
      <Rect x={PAD} y={PAD} width={roomWpx} height={roomHpx} fill={theme.floor} fillPriority={tile ? "pattern" : "color"}
        fillPatternImage={(tile ?? undefined) as unknown as HTMLImageElement | undefined} fillPatternRepeat="repeat"
        fillPatternScale={{ x: pxFt / tileRes, y: pxFt / tileRes }} fillPatternRotation={roomL >= roomW ? 0 : 90} />
      {shell.windows.map((win, i) => {
        const ry = Math.min(2.6 * pxFt, win.len * 1.1);
        return <Ellipse key={`light-${i}`} x={win.x} y={win.y} radiusX={win.len * .8} radiusY={ry} rotation={win.angle}
          fillRadialGradientStartPoint={{ x: 0, y: 0 }} fillRadialGradientEndPoint={{ x: 0, y: 0 }} fillRadialGradientStartRadius={0} fillRadialGradientEndRadius={win.len * .8}
          fillRadialGradientColorStops={[0, "rgba(255, 255, 255, 0.17)", .6, "rgba(255, 255, 255, 0.07)", 1, "rgba(255, 255, 255, 0)"]} />;
      })}
      {showGrid && gridLines.map((l) => <Line key={l.key} points={l.points} stroke={darkFloor ? "rgba(255, 255, 255, 0.1)" : "rgba(43, 38, 34, 0.12)"} strokeWidth={1} />)}
      {shell.edges.map((e, i) => <Line key={`shade-${i}`} closed
        points={[e.a.x, e.a.y, e.b.x, e.b.y, e.b.x + e.nx * shadowDepth, e.b.y + e.ny * shadowDepth, e.a.x + e.nx * shadowDepth, e.a.y + e.ny * shadowDepth]}
        fillLinearGradientStartPoint={e.a} fillLinearGradientEndPoint={{ x: e.a.x + e.nx * shadowDepth, y: e.a.y + e.ny * shadowDepth }}
        fillLinearGradientColorStops={[0, "rgba(40, 26, 14, 0.11)", 1, "rgba(40, 26, 14, 0)"]} />)}
    </Group>
    {darkFloor && <Line points={shell.flat} closed stroke="rgba(255, 255, 255, 0.2)" strokeWidth={1} listening={false} />}
    {drawn ? drawn.closets.map((c, i) => roomCloset(`closet-${i}`, c.x, c.y, c.w, c.h, true))
      : closet && roomCloset("closet", PAD, PAD, closet.width_ft * pxFt, closet.depth_ft * pxFt, false)}
    {!drawn && <>
      {wallGap("door-gap", { x: PAD, y: doorHinge.y }, { x: PAD, y: doorHinge.y + doorR }, { x: -1, y: 0 }, theme.floor)}
      <Arc x={doorHinge.x} y={doorHinge.y} innerRadius={doorR} outerRadius={doorR} angle={90} rotation={0} stroke={swingStroke} strokeWidth={1.5} dash={[5, 4]} listening={false} />
      <Line points={[doorHinge.x, doorHinge.y, doorHinge.x + doorR, doorHinge.y]} stroke={leafStroke} strokeWidth={2} lineCap="round" listening={false} />
      {isCorridor
        ? windowGlass("window", { x: PAD + roomWpx / 2 - winHalf, y: PAD }, { x: PAD + roomWpx / 2 + winHalf, y: PAD }, { x: 0, y: -1 })
        : windowGlass("window", { x: PAD + roomWpx, y: PAD + roomHpx / 2 - winHalf }, { x: PAD + roomWpx, y: PAD + roomHpx / 2 + winHalf }, { x: 1, y: 0 })}
    </>}
  </> : null;
  const gridPx = pxFt * zoom;

  return (
    <div className={`${styles.canvas} ${dock ? styles.docked : ""}`} onKeyDown={keyboard}>
      {dock?.host && dock.active && createPortal(<CanvasToolRail dock={dock} pan={panMode} setPan={setPanMode} grid={showGrid} labels={showLabels} snap={snapping} zoom={zoom}
        roomLabel={feetLabel(roomL)+" × "+feetLabel(roomW)} toggleGrid={toggleGrid} numbers={showNumbers} toggleNumbers={toggleNumbers} roomView={roomView} setRoomView={on=>setView(on?"room":"plan")} toggleLabels={()=>setShowLabels(v=>!v)} toggleSnap={()=>setSnapping(v=>!v)} zoomTo={applyZoom} fit={fitRoom}
        undo={()=>history?.undo()} redo={()=>history?.redo()} canUndo={!!history?.canUndo} canRedo={!!history?.canRedo}
        hiddenItems={visible.filter(f=>hiddenItemIds.includes(f.id))} showItem={toggleHiddenItem}/>,dock.host)}
      {!dock && <>
      <div className={styles.topbar}>
        <div className={styles.title}><strong>Your room studio</strong></div>
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
          <button type="button" onClick={() => setView(roomView ? "plan" : "room")} aria-pressed={!roomView} title="Flat plan drawing">Plan view</button>
          <button type="button" onClick={toggleGrid} aria-pressed={showGrid} title="Show grid (G)"><Icon path="M4 4h16v16H4zM4 12h16M12 4v16" />Grid</button>
          <button type="button" onClick={() => setShowLabels(!showLabels)} aria-pressed={showLabels}>Labels</button>
          {!readOnly && <button type="button" onClick={() => setSnapping(!snapping)} aria-pressed={snapping} title="Snap to a 6-inch grid. Turn off for 1-inch positioning.">Snap</button>}
        </div>
        <button type="button" aria-expanded={showHelp} aria-controls={helpId} onClick={() => setShowHelp(!showHelp)} aria-label="Canvas help and shortcuts" title="Help & shortcuts"><Icon path="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 4h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0" /></button>
      </div>
      {showHelp && <div id={helpId} className={styles.help}>
        <p><strong>Make yourself at home.</strong> Drag a piece to move it, or choose it from the furniture menu. Drag its round handle to rotate, or click the handle, move your cursor, then click to place. Escape cancels rotation. A red outline marks a possible overlap or wall crossing.</p>
        <p><kbd>R</kbd> Rotate · Arrow keys: nudge · <kbd>Shift</kbd> + arrows: 1 ft · <kbd>0</kbd> Fit room · <kbd>H</kbd> Pan · <kbd>V</kbd> Select · <kbd>Esc</kbd> Deselect</p>
        <p>Pinch with two fingers to zoom and pan. With a mouse, use Ctrl/⌘ + scroll to zoom at the pointer. Hiding a piece only changes the view; removing it moves its category to the catalog.</p>
      </div>}
      </>}
      <div ref={containerRef} className={styles.surface} data-rotating={rotationPreview ? true : undefined}
        style={{ ...(!dock && fullscreen ? { height: "clamp(320px, calc(100svh - 300px), 850px)" } : {}),
          ...(roomView && !showGrid ? { backgroundImage: "none" } : {}),
          backgroundSize: `${gridPx}px ${gridPx}px`, backgroundPosition: `${stagePos.x + fitted.x * zoom}px ${stagePos.y + fitted.y * zoom}px` }}
        onDragOver={e=>{const kind=dropKind(e.dataTransfer.types);if(readOnly||!dock||!kind)return;e.preventDefault();const point=openingPoint(e),opening=point&&dock.openings.preview(kind,point);e.dataTransfer.dropEffect=opening?"copy":"none";setOpeningPreview(opening?{index:null,opening}:null);}}
        onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpeningPreview(null);}}
        onDrop={e=>{const kind=dropKind(e.dataTransfer.types);if(readOnly||!dock||!kind)return;e.preventDefault();const point=openingPoint(e),opening=point&&dock.openings.preview(kind,point);setOpeningPreview(null);if(opening)dock.openings.commit(null,opening);}} tabIndex={0} role="region" aria-label="Interactive room floor plan" onPointerDown={() => containerRef.current?.focus({ preventScroll: true })}>
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
              clearSelectedCategory();dock?.openings.select(null);
            }
          }}
          onTap={(e) => {
            if (!readOnly && e.target === e.target.getStage() && !justDragged()) {
              clearSelectedCategory();dock?.openings.select(null);
            }
          }}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => { lastPinch.current = null; lastPinchCenter.current = null; }}
          onTouchCancel={() => { openingCancelled.current=true;setOpeningPreview(null);lastPinch.current = null; lastPinchCenter.current = null; setDragging(null); }}
          style={{ cursor: panMode ? "grab" : "default" }}
        >
          <Layer>
            {/* Plan paper for exported PNGs (on screen the paper grid is CSS behind the stage). */}
            <Rect name="export-only" visible={false} width={stageW} height={stageH} fill={PAPER} listening={false} />
            <Group x={fitted.x - PAD} y={fitted.y - PAD}>
            {roomShell ?? (drawn ? (
              <>
                {/* The room: white floor + a faint grid clipped to the walls. */}
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
                  <Rect x={PAD} y={PAD} width={roomWpx} height={roomHpx} fill="#FFFFFF" listening={false} />
                  {showGrid && gridLines.map((l) => (
                    <Line key={l.key} points={l.points} stroke={GRID} strokeWidth={1} listening={false} />
                  ))}
                </Group>
                <Line points={drawn.flat} closed stroke={INK} strokeWidth={wallW} lineJoin="miter" listening={false} />
                {drawn.closets.map((c, i) => (
                  <Group key={`closet-${i}`} x={c.x} y={c.y} listening={false}
                    clipFunc={(ctx) => { ctx.rect(0, 0, c.w, c.h); }}>
                    <Rect width={c.w} height={c.h} fill="#FFFFFF" />
                    {(() => {
                      // A hanging rod with hangers along the closet's long side.
                      const across = c.w >= c.h, long = across ? c.w : c.h, short = across ? c.h : c.w;
                      const n = Math.max(2, Math.floor((long - 12) / 8));
                      const pt = (t: number, u: number) => across ? [t, u] : [u, t];
                      return <>
                        <Line points={[...pt(6, short / 2), ...pt(long - 6, short / 2)]} stroke={COBALT} strokeWidth={1.5} />
                        {Array.from({ length: n }, (_, k) => { const t = 10 + k * (long - 20) / (n - 1); return <Line key={k} points={[...pt(t, short * .2), ...pt(t, short * .8)]} stroke="rgba(36, 73, 255, 0.45)" strokeWidth={1.2} />; })}
                      </>;
                    })()}
                    <Rect width={c.w} height={c.h} stroke={COBALT} strokeWidth={1.5} />
                    {showLabels && c.w > 46 && c.h > 16 && <Text width={c.w} height={c.h} align="center" verticalAlign="middle" text="CLOSET" fontFamily={labelFont} fontStyle="700" fontSize={9} letterSpacing={.7} fill={COBALT} />}
                  </Group>
                ))}
              </>
            ) : (
              <>
            {/* Room shell */}
            <Rect x={PAD} y={PAD} width={roomWpx} height={roomHpx} fill="#FFFFFF" listening={false} />
            {showGrid && gridLines.map((l) => (
              <Line key={l.key} points={l.points} stroke={GRID} strokeWidth={1} listening={false} />
            ))}
            <Rect x={PAD} y={PAD} width={roomWpx} height={roomHpx} stroke={INK} strokeWidth={wallW} listening={false} />

            {/* Closet (only when the school publishes one) */}
            {closet && (
              <Rect x={PAD + 2} y={PAD + 2} width={closet.width_ft * pxFt} height={closet.depth_ft * pxFt}
                fill="rgba(36, 73, 255, 0.08)" stroke={COBALT} strokeWidth={1.5} listening={false} />
            )}

            {/* Door: gap in the wall + swing arc */}
            <Line points={[doorHinge.x, doorHinge.y, doorHinge.x, doorHinge.y + doorR]} stroke="#FFFFFF" strokeWidth={wallW + 1} listening={false} />
            <Arc x={doorHinge.x} y={doorHinge.y} innerRadius={doorR} outerRadius={doorR} angle={90} rotation={0}
              stroke="rgba(22, 22, 29, 0.45)" strokeWidth={1.5} dash={[5, 4]} listening={false} />
            <Line points={[doorHinge.x, doorHinge.y, doorHinge.x + doorR, doorHinge.y]} stroke={INK} strokeWidth={2.5} listening={false} />

            {/* Window */}
            {isCorridor ? (
              <Line points={[PAD + roomWpx / 2 - winHalf, PAD, PAD + roomWpx / 2 + winHalf, PAD]} stroke={COBALT} strokeWidth={4} listening={false} />
            ) : (
              <Line points={[PAD + roomWpx, PAD + roomHpx / 2 - winHalf, PAD + roomWpx, PAD + roomHpx / 2 + winHalf]} stroke={COBALT} strokeWidth={4} listening={false} />
            )}
              </>
            ))}

            {/* Dimension lines: the room's real length and width. */}
            <Group listening={false}>
              <Line points={[PAD, PAD-24-wallT, PAD+roomWpx, PAD-24-wallT]} stroke={INK} strokeWidth={1.5} />
              <Line points={[PAD-24-wallT, PAD, PAD-24-wallT, PAD+roomHpx]} stroke={INK} strokeWidth={1.5} />
              {[0, roomWpx].map(x => <Line key={`tick-x${x}`} points={[PAD+x, PAD-30.5-wallT, PAD+x, PAD-17.5-wallT]} stroke={INK} strokeWidth={1.5} />)}
              {[0, roomHpx].map(y => <Line key={`tick-y${y}`} points={[PAD-30.5-wallT, PAD+y, PAD-17.5-wallT, PAD+y]} stroke={INK} strokeWidth={1.5} />)}
              <Rect x={PAD+roomWpx/2-textW(ftLabel(roomL),15)/2-10} y={PAD-36-wallT} width={textW(ftLabel(roomL),15)+20} height={24} fill={PAPER} />
              <Text x={PAD+roomWpx/2-60} y={PAD-36-wallT} width={120} height={24} text={ftLabel(roomL)} fontFamily={sansFont} fontStyle="800" fontSize={15} align="center" verticalAlign="middle" fill={INK} />
              <Rect x={PAD-24-wallT-textW(ftLabel(roomW),14)/2-6} y={PAD+roomHpx/2-12} width={textW(ftLabel(roomW),14)+12} height={24} fill={PAPER} />
              <Text x={PAD-24-wallT-40} y={PAD+roomHpx/2-12} width={80} height={24} text={ftLabel(roomW)} fontFamily={sansFont} fontStyle="800" fontSize={14} align="center" verticalAlign="middle" fill={INK} />
            </Group>
            {dragging && <Group name="editor-only" listening={false}>
              <Line points={[PAD + dragging.x*pxFt, PAD, PAD + dragging.x*pxFt, PAD+roomHpx]} stroke={COBALT} strokeWidth={1/z} dash={[4/z,4/z]} opacity={.6} />
              <Line points={[PAD, PAD + dragging.y*pxFt, PAD+roomWpx, PAD + dragging.y*pxFt]} stroke={COBALT} strokeWidth={1/z} dash={[4/z,4/z]} opacity={.6} />
            </Group>}
            {/* Furniture */}
            {visible.map((f) => {
              const fp = footprint(f);
              const w = f.width_ft * pxFt;
              const h = f.length_ft * pxFt;
              const bad = invalid.has(f.id);
              const isHidden = hiddenItemIds.includes(f.id);
              const isLocked = lockedItemIds.includes(f.id);
              const draggable = !readOnly && !panMode && f.movable && !isLocked && !isHidden;
              // The rotate/toolbar target gets handles; its category-mates (and
              // hovered list rows) get a lighter ring.
              const selected = !readOnly && toolbarItem?.id === f.id && !ghostIds.has(f.id);
              const highlighted = !selected && !readOnly && (selectedItemId === f.id ||
                (activeCategory !== null && furnitureCategory(f) === activeCategory));
              const entry = entryFor?.(f);
              const handle = selected && canEditItem && !!onSetRotation && !narrow && !panMode && !dragging;
              return (
                <Group
                  key={f.id}
                  name="furniture"
                  x={PAD + fp.x * pxFt}
                  y={PAD + fp.y * pxFt}
                  opacity={ghostIds.has(f.id) ? .38 : 1}
                  draggable={draggable}
                  onDragStart={(e) => { e.cancelBubble = true; dock?.openings.select(null);if (selectedItemId !== f.id) toggleSelectedItem(f.id, furnitureCategory(f)); setDragging({ id: f.id, x: f.x_ft, y: f.y_ft }); }}
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
                  onClick={() => {dock?.openings.select(null);handleItemClick(f);}}
                  onTap={() => {dock?.openings.select(null);handleItemClick(f);}}
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
                  <Group opacity={isHidden ? .16 : 1} listening={false}>{roomView
                    ? <RoomGlyph item={f} scale={pxFt} theme={theme} dressed={f.type === "bed" && !!entry} books={f.type === "shelf" && !!entry && /book/i.test(entry.product.name)}
                        back={backs.get(f.id)} detail={Math.min(w, h) * zoom >= 28} bucket={bucket} />
                    : <FurnitureGlyph item={f} scale={pxFt} palette={palette} dressed={f.type === "bed" && !!entry} />}</Group>
                  {/* Hit area (and the dashed outline of a hidden piece). */}
                  <Rect
                    width={w}
                    height={h}
                    fill="rgba(255, 255, 255, 0.001)"
                    stroke={isHidden ? INK : undefined}
                    strokeWidth={isHidden ? 1 : 0}
                    dash={isHidden ? [4, 3] : undefined}
                    opacity={isHidden ? .5 : 1}
                    hitStrokeWidth={10}
                  />
                  {planning.showOwners&&!isHidden&&<Rect name="editor-only" width={w} height={h} stroke={people.find(r=>r.id===f.assigned_to)?.color??"#68748b"} strokeWidth={2.5} fillEnabled={false} listening={false}/>}
                  {isLocked && !bad && <Rect name="editor-only" x={-2} y={-2} width={w+4} height={h+4} stroke={TAPE} strokeWidth={2} dash={[6, 3]} fillEnabled={false} listening={false} />}
                  {bad && !isHidden && roomView && <Rect name="editor-only" width={w} height={h} stroke="#FFFFFF" strokeWidth={5.5} opacity={.9} fillEnabled={false} listening={false} />}
                  {bad && !isHidden && <Rect name="editor-only" width={w} height={h} stroke={RED} strokeWidth={2.5} fillEnabled={false} listening={false} />}
                  {highlighted && roomView && <Rect name="editor-only" x={-4/z} y={-4/z} width={w + 8/z} height={h + 8/z} cornerRadius={4/z}
                      stroke="#FFFFFF" strokeWidth={4.5/z} opacity={.8} fillEnabled={false} listening={false} />}
                  {highlighted && (
                    <Rect name="editor-only" x={-4/z} y={-4/z} width={w + 8/z} height={h + 8/z} cornerRadius={4/z}
                      stroke={COBALT} strokeWidth={2/z} opacity={.6} fillEnabled={false} listening={false} />
                  )}
                  {selected && (
                    <Group name="editor-only" listening={false}>
                      {roomView && <Rect x={-6/z} y={-6/z} width={w + 12/z} height={h + 12/z} stroke="#FFFFFF" strokeWidth={5/z} opacity={.85} fillEnabled={false} />}
                      <Rect x={-6/z} y={-6/z} width={w + 12/z} height={h + 12/z} stroke={COBALT} strokeWidth={2/z} fillEnabled={false} />
                      {[[-6, -6], [w * z + 6, -6], [-6, h * z + 6], [w * z + 6, h * z + 6]].map(([cx, cy], i) =>
                        <Rect key={i} x={cx/z - 5/z} y={cy/z - 5/z} width={10/z} height={10/z} fill="#FFFFFF" stroke={COBALT} strokeWidth={2/z} />)}
                      {handle && <Line points={[w/2, -6/z, w/2, -24/z]} stroke={COBALT} strokeWidth={2/z} />}
                    </Group>
                  )}
                  </Group>
                </Group>
              );
            })}
            {/* Swap preview: the alternative's footprint, before anything changes. */}
            {ghost && <Group name="editor-only" listening={false}>
              {ghost.items.map(g => {
                const fp = footprint(g), w = g.width_ft * pxFt, h = g.length_ft * pxFt;
                const text = `Preview · ${feetInches(g.width_ft)} × ${feetInches(g.length_ft)}`, tw = textW(text, 13) / z + 20 / z;
                return <Group key={`ghost-${g.id}`} x={PAD + fp.x * pxFt} y={PAD + fp.y * pxFt}>
                  <Group x={fp.w*pxFt/2} y={fp.h*pxFt/2} offsetX={w/2} offsetY={h/2} rotation={g.rotation_deg}>
                    <Rect width={w} height={h} fill="#F7F2EA" opacity={.92} stroke={PINK} strokeWidth={2.5/z} cornerRadius={Math.min(14, w/4, h/4)}
                      shadowColor={PINK} shadowBlur={22} shadowOpacity={.25} shadowOffsetY={8} />
                  </Group>
                  {fp.w * pxFt * z > 90 && <Group x={fp.w*pxFt/2 - tw/2} y={fp.h*pxFt/2 - 13/z}>
                    <Rect width={tw} height={26/z} cornerRadius={13/z} fill={PINK} />
                    <Text width={tw} height={26/z} align="center" verticalAlign="middle" text={text} fontFamily={sansFont} fontStyle="800" fontSize={13/z} fill={INK} />
                  </Group>}
                </Group>;
              })}
            </Group>}
            {/* Labels, list pins and the selected piece's size sit above the
                furniture, so small pieces never hide a name. */}
            <Group>
              {visible.map(f => {
                if (hiddenItemIds.includes(f.id)) return null;
                const fp = footprint(f);
                const w = fp.w * pxFt, h = fp.h * pxFt;
                const entry = entryFor?.(f);
                const builtIn = f.built_in || !!f.inventory;
                const owners = planning.showOwners;
                const dressedBed = f.type === "bed" && !!entry;
                let label: { text: string; mono: boolean; height: number } | null = null;
                const chair = /chair|lounge/.test(f.type);
                if ((showLabels || owners) && w >= 34 && h >= 18 && !chair) {
                  if (owners) label = showLabels ? { text: `${bedLabel(f)}\n${ownerName(f.assigned_to,people)}`, mono: false, height: 30 } : { text: ownerName(f.assigned_to,people), mono: false, height: 16 };
                  else if (builtIn && !dressedBed) label = { text: (isBunkBed(f) && w < 125 ? bedLabel(f).replace(" · ", "\n") : bedLabel(f)).toUpperCase(), mono: true, height: isBunkBed(f) && w < 125 ? 26 : 14 };
                  else if (!entry && !builtIn) label = { text: bedLabel(f), mono: false, height: 16 };
                }
                const size = label?.mono ? 9 : Math.max(9, Math.min(11, w * .14));
                // Mono labels show whole or not at all (no "DESK C…" stubs).
                if (label?.mono && Math.max(...label.text.split("\n").map(line => line.length)) * size * .72 + 6 > w) label = null;
                const labelW = label ? Math.min(w - 6, (Math.max(...label.text.split("\n").map(line=>line.length))+2)*size*(label.mono ? .72 : .6)) : 0;
                const labelY = label ? (f.type === "desk" && f.rotation_deg % 180 === 0 ? h*.82 : h/2) - label.height/2 : 0;
                const isSel = !readOnly && toolbarItem?.id === f.id && !ghostIds.has(f.id);
                const pinActive = isSel || (!!entry && (entry.custom ? selectedItemId === f.id : activeCategory === entry.product.category));
                const r = 11 / z;
                const inside = w >= 48 && h >= 40;
                const pinX = inside ? w - 16 / z : w + 2 / z, pinY = inside ? 16 / z : -2 / z;
                // Room view names dorm-provided pieces too (the studio's wording), when the pill fits the piece.
                const dims = `${feetInches(f.width_ft)} × ${feetInches(f.length_ft)}`, dormDims = `Dorm-provided · ${dims}`;
                const sizeText = isSel ? (roomView && f.built_in && textW(dormDims, 13) + 20 <= w * z + 16 ? dormDims : dims) : "";
                const sizeW = textW(sizeText, 13) / z + 20 / z;
                return <Group
                  key={`label-${f.id}`}
                  ref={node => { if (node) labelRefs.current.set(f.id, node); else labelRefs.current.delete(f.id); }}
                  x={PAD + fp.x*pxFt}
                  y={PAD + fp.y*pxFt}
                >
                  {label && <Group listening={false}>
                    {(!label.mono || roomView) && <Rect x={(w-labelW)/2} y={labelY-1} width={labelW} height={label.height+2} fill="#fffffff0" cornerRadius={3} />}
                    <Text x={(w-labelW)/2+2} y={labelY} width={labelW-4} height={label.height} text={label.text} align="center" verticalAlign="middle"
                      fontSize={size} fontFamily={label.mono ? labelFont : sansFont} fontStyle={label.mono ? "700" : "600"} letterSpacing={label.mono ? .7 : 0}
                      fill={label.mono ? COBALT : INK} wrap="none" ellipsis />
                  </Group>}
                  {isSel && sizeText && w * z > 70 && h * z > 34 && <Group name="editor-only" listening={false} x={w/2 - sizeW/2} y={h/2 - 12/z}>
                    <Rect width={sizeW} height={24/z} cornerRadius={12/z} fill={COBALT} />
                    <Text width={sizeW} height={24/z} align="center" verticalAlign="middle" text={sizeText} fontFamily={sansFont} fontStyle="800" fontSize={13/z} fill="#FFFFFF" />
                  </Group>}
                  {entry && !readOnly && (showNumbers || pinActive) && <Group name="editor-only" x={pinX} y={pinY}
                    onClick={(e) => { e.cancelBubble = true; dock?.openings.select(null); handleItemClick(f); }}
                    onTap={(e) => { e.cancelBubble = true; dock?.openings.select(null); handleItemClick(f); }}
                    onMouseEnter={(e) => { if (crossHighlight) setHoveredCategory(furnitureCategory(f)); const st = e.target.getStage(); if (st) st.container().style.cursor = "pointer"; }}
                    onMouseLeave={(e) => { if (crossHighlight) setHoveredCategory(null); const st = e.target.getStage(); if (st) st.container().style.cursor = "default"; }}>
                    <Circle radius={entry.number > 9 ? r + 1/z : r} fill={pinActive ? COBALT : INK} stroke="#FFFFFF" strokeWidth={2/z} />
                    <Text x={-14/z} y={-r} width={28/z} height={2*r} align="center" verticalAlign="middle" text={String(entry.number)}
                      fontFamily={labelFont} fontStyle="700" fontSize={10/z} fill="#FFFFFF" listening={false} />
                  </Group>}
                </Group>;
              })}
            </Group>
            {/* Clearance from the selected piece to its nearest neighbour, wall or door swing. */}
            {clearance && <Group name="editor-only" listening={false}>
              {(() => {
                const x1 = PAD + clearance.x1 * pxFt, y1 = PAD + clearance.y1 * pxFt, x2 = PAD + clearance.x2 * pxFt, y2 = PAD + clearance.y2 * pxFt;
                const vertical = Math.abs(x1 - x2) < .5, t = 6.5 / z;
                const text = `${clearance.name} · ${feetInches(clearance.ft)}`, tw = textW(text, 12) / z + 18 / z, th = 22 / z;
                const lx = vertical ? x1 - tw - 8 / z : (x1 + x2) / 2 - tw / 2, ly = vertical ? (y1 + y2) / 2 - th / 2 : y1 - th - 8 / z;
                return <>
                  <Line points={[x1, y1, x2, y2]} stroke={MAGENTA} strokeWidth={1.5/z} />
                  <Line points={vertical ? [x1 - t, y1, x1 + t, y1] : [x1, y1 - t, x1, y1 + t]} stroke={MAGENTA} strokeWidth={1.5/z} />
                  <Line points={vertical ? [x2 - t, y2, x2 + t, y2] : [x2, y2 - t, x2, y2 + t]} stroke={MAGENTA} strokeWidth={1.5/z} />
                  <Rect x={lx} y={ly} width={tw} height={th} cornerRadius={4/z} fill="#FFFFFF" stroke={MAGENTA} strokeWidth={1.5/z} />
                  <Text x={lx} y={ly} width={tw} height={th} align="center" verticalAlign="middle" text={text} fontFamily={sansFont} fontStyle="800" fontSize={12/z} fill={MAGENTA} />
                </>;
              })()}
            </Group>}
            {checkHighlight&&!readOnly&&<Group name="editor-only" listening={false}><Line points={checkHighlight.points.flatMap(p=>[PAD+p.x*pxFt,PAD+p.y*pxFt])} closed fill="#F3C21A30" stroke="#C99A06" strokeWidth={2/zoom} dash={[6/zoom,4/zoom]}/></Group>}
            {drawn&&drawn.openings.map((op, i) => (
                  <Group key={`opening-${i}`} name="opening" draggable={!readOnly&&!panMode&&!!dock&&i<(outline?.openings.length??0)}
                    onClick={e=>{e.cancelBubble=true;if(!readOnly&&!panMode)dock?.openings.select(i);}}
                    onTap={e=>{e.cancelBubble=true;if(!readOnly&&!panMode)dock?.openings.select(i);}}
                    onMouseDown={()=>grabOpening(i)} onTouchStart={()=>grabOpening(i)}
                    onDragStart={e=>{e.cancelBubble=true;dock?.openings.select(i);}}
                    onDragMove={e=>{e.cancelBubble=true;const opening=dragOpening(i);e.target.position({x:0,y:0});setOpeningPreview(opening?{index:i,opening}:null);}}
                    onDragEnd={e=>{e.cancelBubble=true;const opening=dragOpening(i);e.target.position({x:0,y:0});setOpeningPreview(null);setHoveredCategory(null);dragGuard.current=Date.now();if(opening)dock?.openings.commit(i,opening);}}
                    onMouseEnter={e=>{if(!readOnly&&!panMode)e.target.getStage()!.container().style.cursor="grab";}}
                    onMouseLeave={e=>{e.target.getStage()!.container().style.cursor="default";}}
                    listening={!readOnly&&!panMode&&!!dock}>
                    <Line points={op.gap} stroke="transparent" strokeWidth={24/zoom} />
                    {roomView ? (() => {
                      const a = { x: op.gap[0], y: op.gap[1] }, b = { x: op.gap[2], y: op.gap[3] }, out = { x: -op.normal.x, y: -op.normal.y };
                      return op.kind === "window" ? windowGlass("glass", a, b, out) : <>
                        {wallGap("gap", a, b, out, theme.floor)}
                        <Arc x={op.door.x} y={op.door.y} innerRadius={op.door.radius} outerRadius={op.door.radius} angle={90} rotation={op.door.rotation} stroke={swingStroke} strokeWidth={1.5} dash={[5, 4]} />
                        <Line points={op.door.leaf} stroke={leafStroke} strokeWidth={2} lineCap="round" />
                      </>;
                    })() : <>
                    <Line points={op.gap} stroke="#FFFFFF" strokeWidth={wallW + 1} />
                    {op.kind === "window" ? (
                      <>
                        {[-1, 1].map(side => { const o = (wallW / 2 - 1) * side; return <Line key={side} points={[op.gap[0] + op.normal.x * o, op.gap[1] + op.normal.y * o, op.gap[2] + op.normal.x * o, op.gap[3] + op.normal.y * o]} stroke={COBALT} strokeWidth={2} />; })}
                      </>
                    ) : (
                      <>
                        <Arc x={op.door.x} y={op.door.y} innerRadius={op.door.radius} outerRadius={op.door.radius} angle={90} rotation={op.door.rotation} stroke="rgba(22, 22, 29, 0.45)" strokeWidth={1.5} dash={[5, 4]} />
                        <Line points={op.door.leaf} stroke={INK} strokeWidth={2.5} />
                      </>
                    )}
                    </>}
                    {!readOnly&&dock&&<Circle name="editor-only" x={(op.gap[0]+op.gap[2])/2} y={(op.gap[1]+op.gap[3])/2} radius={(dock.openings.selected===i?6:4)/zoom} fill="white" stroke={COBALT} strokeWidth={2/zoom} hitStrokeWidth={18/zoom}/>}
                  </Group>
                ))}
            </Group>
          </Layer>
        </Stage>
      )}

      {pxFt > 0 && workspace && <CollaborationOverlay surface="plan" projection={{
        read:(x,y)=>({x:((x-stagePos.x)/zoom-fitted.x)/(pxFt*roomL),y:((y-stagePos.y)/zoom-fitted.y)/(pxFt*roomW)}),
        draw:(x,y)=>({x:stagePos.x+(fitted.x+x*pxFt*roomL)*zoom,y:stagePos.y+(fitted.y+y*pxFt*roomW)*zoom}),
      }} pins={activeFurniture.map(f=>{const b=footprint(f);return {id:f.id,label:f.label,x:(b.x+b.w/2)/roomL,y:(b.y+b.h/2)/roomW};})}/>}
      {pxFt > 0 && toolbarItem && canEditItem && onSetRotation && !narrow && !panMode && !dragging && !previewing && rotationCenter && rotationPosition &&
        <RotationHandle key={toolbarItem.id} label={toolbarItem.label} center={rotationCenter} position={rotationPosition} degrees={toolbarItem.rotation_deg}
          onPreview={degrees=>setRotationPreview({id:toolbarItem.id,degrees})} onCommit={finishRotation} onCancel={()=>finishRotation()}/>}
      {pxFt > 0 && dock && !readOnly && toolbarItem && toolbarPos && !dragging && !rotationPreview && !panMode && !previewing && (
        <div ref={toolbarRef} className={styles.itemBar} role="toolbar" aria-label={`${bedLabel(toolbarItem)} actions`} style={{ left: toolbarPos.x, top: toolbarPos.y }}>
          {onRotate && <button type="button" disabled={!canEditItem} onClick={() => onRotate(toolbarItem.id, 1)} title="Rotate 90° (R)"><RotateIcon size={15} />Rotate</button>}
          {canSwap && <button type="button" className={styles.swap} onClick={() => ui?.openSwap(toolbarEntry!.product)}><SwapIcon size={15} />Swap</button>}
          {toolbarDeletable && <button type="button" onClick={() => { onDeleteItem?.(toolbarItem); clearSelectedCategory(); }}><TrashIcon size={15} />Remove</button>}
          <div className={styles.itemMore}>
            <button type="button" aria-label="More for this piece" title="Lock or hide" aria-expanded={itemMenu} onClick={() => setItemMenu(v => !v)}><MoreIcon size={16} /></button>
            {itemMenu && <div className={styles.itemMenu} role="group" aria-label="Piece options">
              <button type="button" aria-pressed={toolbarLocked} onClick={() => toggleLockedItem(toolbarItem.id)}>{toolbarLocked ? <UnlockIcon size={16} /> : <LockIcon size={16} />}{toolbarLocked ? "Unlock" : "Lock in place"}</button>
              <button type="button" aria-pressed={toolbarHidden} onClick={() => toggleHiddenItem(toolbarItem.id)}>{toolbarHidden ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}{toolbarHidden ? "Show" : "Hide from view"}</button>
            </div>}
          </div>
          {toolbarEntry && <>
            <span className={styles.sep} aria-hidden="true" />
            <ProductLink product={toolbarEntry.product} className={styles.priceLink} label={`View ${toolbarEntry.product.name} on Amazon, $${toolbarEntry.product.price.toFixed(2)}`}>
              ${toolbarEntry.product.price.toFixed(2)}<UpRightIcon size={13} />
            </ProductLink>
          </>}
        </div>
      )}
      {pxFt > 0 && dock && <p className={styles.statusPill} data-ok={status.ok || undefined} data-quiet={status.ok && !dragging && !ghost || undefined} role="status">
        <span aria-hidden="true">{status.ok ? <CheckIcon size={12} /> : <AlertIcon size={13} />}</span>{status.text}
      </p>}
      {pxFt > 0 && <div className={styles.scale} aria-hidden="true"><i style={{ width: pxFt * zoom * scaleFt }} /><span>{scaleFt} ft</span></div>}
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
          <label htmlFor={selectId}>Select a piece to edit</label>
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
