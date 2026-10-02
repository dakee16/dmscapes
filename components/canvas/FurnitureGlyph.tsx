import { Group, Rect, Line, Circle, Ellipse } from "react-konva";
import type { FurnitureItem } from "@/lib/types";
import { isBunkBed } from "@/lib/bedding";

const INK = "#16161D";
const BLUE = "#2449FF";
const BUILT = "#EEF1FD";
const BROWN = "#7B4A2C";
/** n evenly spaced fractions inside (0, 1): stripes between the edges, bulbs centred in cells. */
const stripes = (n: number) => Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
const bulbs = (n: number) => Array.from({ length: n }, (_, i) => (i + .5) / n);

/**
 * Top-down symbols inside the real footprint, in the plan's flat style
 * (Planner.dc.html): dorm-provided pieces in pale blue with a blue outline,
 * your picks in warm fills tinted by the vibe's palette. Never changes hit areas.
 */
export default function FurnitureGlyph({ item, scale, palette, dressed = false }: {
  item: FurnitureItem;
  scale: number;
  /** The vibe's palette (lib/styles): light → dark. */
  palette: readonly string[];
  /** A dorm bed the list dresses (bedding in the cart). */
  dressed?: boolean;
}) {
  const w = item.width_ft * scale, h = item.length_ft * scale;
  const pad = Math.min(w, h) * .06;
  const sw = 1.5;
  const [p0, p1, p2, p3] = palette;
  let art;
  switch (item.type) {
    case "bed": {
      const fill = dressed ? "#F4E4CC" : "#FFFFFF", line = dressed ? BROWN : BLUE;
      art = <>
        <Rect width={w} height={h} fill={fill} stroke={line} strokeWidth={sw} cornerRadius={4} />
        <Rect x={w * .07} y={Math.min(h * .04, 10)} width={w * .86} height={Math.min(h * .13, 34)} fill="#FFFFFF" stroke={line} strokeWidth={sw} cornerRadius={Math.min(8, w * .08)} />
        {dressed && <Line points={[pad, h * .32, w - pad, h * .32]} stroke={line} opacity={.35} strokeWidth={1} />}
      </>;
      break;
    }
    case "desk": case "dresser": case "wardrobe": case "shelf": case "radiator": case "column":
      art = <Rect width={w} height={h} fill={item.built_in ? BUILT : p0} stroke={item.built_in ? BLUE : BROWN} strokeWidth={sw} />;
      break;
    case "desk_chair": case "chair": case "lounge":
      art = <Rect width={w} height={h} fill="#FFFFFF" stroke={item.built_in ? BLUE : BROWN} strokeWidth={sw} cornerRadius={Math.min(w, h) * .24} />;
      break;
    case "storage_bins": case "storage":
      art = <><Rect width={w} height={h} fill="#E4EEF6" stroke="#5B7A93" strokeWidth={sw} cornerRadius={3} /><Rect x={w * .2} y={h * .35} width={w * .6} height={h * .3} stroke="#5B7A93" strokeWidth={1.2} cornerRadius={2} /></>;
      break;
    case "rug":
      art = <>
        <Rect width={w} height={h} fill={p0} stroke={p2} strokeWidth={2} cornerRadius={4} />
        {stripes(Math.max(3, Math.floor(h / 9))).map((t, i) => <Line key={i} points={[2, h * t, w - 2, h * t]} stroke={p1} opacity={.75} strokeWidth={2} />)}
      </>;
      break;
    case "sofa":
      art = <><Rect width={w} height={h} fill={p1} stroke={BROWN} strokeWidth={sw} cornerRadius={6} /><Rect x={pad} y={h * .28} width={w - pad * 2} height={h * .6} fill={p0} cornerRadius={4} /></>;
      break;
    case "fridge": case "microwave":
      art = <><Rect width={w} height={h} fill="#E9EEF4" stroke="#8A96A3" strokeWidth={sw} cornerRadius={2} /><Line points={[w * .18, h * .82, w * .6, h * .82]} stroke="#8A96A3" strokeWidth={2} /></>;
      break;
    case "desk_lamp":
      art = <><Ellipse x={w / 2} y={h / 2} radiusX={w * .46} radiusY={h * .46} fill="#FFE9C7" stroke={BROWN} strokeWidth={2} /><Circle x={w / 2} y={h / 2} radius={Math.min(w, h) * .15} fill={BROWN} /></>;
      break;
    case "string_lights":
      art = <>{bulbs(Math.max(3, Math.round(w / 12))).map((t, i) => <Circle key={i} x={t * w} y={h / 2} radius={Math.max(1.6, Math.min(2.6, h / 2))} fill="#F2A93B" />)}</>;
      break;
    case "throw_pillows":
      art = <>
        <Rect width={w} height={h} fill="#B5562F" cornerRadius={2} />
        {stripes(Math.max(2, Math.floor(w / 9))).map((t, i) => <Line key={i} points={[w * t, 1, w * t, h - 1]} stroke="#A34A27" strokeWidth={2} />)}
      </>;
      break;
    case "laundry_hamper":
      art = <Rect width={w} height={h} fill="#EFE7DC" stroke={BROWN} strokeWidth={sw} cornerRadius={Math.min(w, h) * .2} />;
      break;
    case "trash_can": case "power_strip":
      art = <Rect width={w} height={h} fill="#E6E4DE" stroke="#8A96A3" strokeWidth={sw} cornerRadius={Math.min(w, h) * .2} />;
      break;
    case "mirror":
      art = <Rect width={w} height={h} fill="#E9EEF4" stroke="#8A96A3" strokeWidth={sw} cornerRadius={1} />;
      break;
    case "wall_decor":
      art = <Rect width={w} height={h} fill={p2} stroke={p3} strokeWidth={1} />;
      break;
    case "desk_accessories": case "desk_organizer":
      art = <Rect width={w} height={h} fill="#E8D9C2" stroke={BROWN} strokeWidth={1.2} cornerRadius={2} />;
      break;
    case "plant":
      art = <><Circle x={w / 2} y={h / 2} radius={Math.min(w, h) / 2} fill="#4E7A43" /><Circle x={w * .42} y={h * .42} radius={Math.min(w, h) * .2} fill="#7FA36B" /></>;
      break;
    case "ambient_lighting":
      art = <><Circle x={w / 2} y={h / 2} radius={Math.min(w, h) / 2} fill="#FFE9C7" stroke={BROWN} strokeWidth={2} /><Circle x={w / 2} y={h / 2} radius={Math.min(w, h) * .14} fill="#F2A93B" /></>;
      break;
    default:
      art = <Rect width={w} height={h} fill={p1} opacity={.85} stroke={p3} strokeWidth={1.2} cornerRadius={3} />;
  }
  return <Group listening={false}>{art}{(isBunkBed(item) || item.bed_mode === "lofted") && <>
    <Rect x={w * .04} y={h * .03} width={w * .92} height={h * .94} stroke={INK} strokeWidth={1.4} dash={[5, 3]} cornerRadius={2} />
    <Rect x={w * .72} y={h * .68} width={w * .22} height={h * .29} fill="#C79A6B" stroke={INK} strokeWidth={.7} />
    {[1, 2, 3].map(i => <Line key={i} points={[w * .74, h * (.68 + i * .07), w * .92, h * (.68 + i * .07)]} stroke="#FFFFFF" strokeWidth={2} />)}
  </>}</Group>;
}
