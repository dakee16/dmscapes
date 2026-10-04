import { memo, useLayoutEffect, useRef, type ReactNode } from "react";
import Konva from "konva";
import { Group, Rect, Line, Circle, Ellipse, Arc } from "react-konva";
import type { FurnitureItem } from "@/lib/types";
import { isBunkBed } from "@/lib/bedding";
import { mixHex, type RoomTheme } from "@/lib/styles";

const INK = "#16161D";
const BLUE = "#2449FF";
const BUILT = "#EEF1FD";
const BROWN = "#7B4A2C";
const WOOD = "#E8D2B0";
const STEEL = "#8A96A3";
const METAL = "#E9EEF4";
/** n evenly spaced fractions inside (0, 1): stripes between the edges, bulbs centred in cells. */
const stripes = (n: number) => Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
const bulbs = (n: number) => Array.from({ length: n }, (_, i) => (i + .5) / n);

/**
 * Plan view: top-down symbols inside the real footprint, in the plan's flat style
 * (Planner.dc.html): dorm-provided pieces in pale blue with a blue outline,
 * your picks in warm fills tinted by the vibe's palette. Each piece is drawn
 * as what it is (a laptop on the desk, drawers on the dresser, casters under
 * the chair) so the plan reads without labels. The symbols read the same from
 * any side, because templates put the wall behind different edges. Never
 * changes hit areas.
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
  const s = Math.min(w, h), long = Math.max(w, h), across = w >= h;
  const pad = s * .06;
  const sw = 1.5;
  const [p0, p1, p2, p3] = palette;
  const fill = item.built_in ? BUILT : p0, line = item.built_in ? BLUE : BROWN;
  /** A point at fraction `t` along the long side and `u` across it. */
  const at = (t: number, u: number): [number, number] => across ? [w * t, h * u] : [w * u, h * t];
  /** A line across the short side at fraction `t` of the long side. */
  const rung = (t: number, from = 0, to = 1) => [...at(t, from), ...at(t, to)];
  let art;
  switch (item.type) {
    case "bed": {
      const bedFill = dressed ? "#F4E4CC" : "#FFFFFF", bedLine = dressed ? BROWN : BLUE;
      art = <>
        <Rect width={w} height={h} fill={bedFill} stroke={bedLine} strokeWidth={sw} cornerRadius={4} />
        <Rect x={w * .07} y={Math.min(h * .04, 10)} width={w * .86} height={Math.min(h * .13, 34)} fill="#FFFFFF" stroke={bedLine} strokeWidth={sw} cornerRadius={Math.min(8, w * .08)} />
        {dressed && <Line points={[pad, h * .32, w - pad, h * .32]} stroke={bedLine} opacity={.35} strokeWidth={1} />}
      </>;
      break;
    }
    case "desk": {
      // An open laptop seen from above: the screen edge, the keyboard and a trackpad.
      const lw = Math.min(w * .5, scale * 1.05), lh = Math.min(h * .6, scale * .72);
      const lx = (w - lw) / 2, ly = (h - lh) / 2;
      art = <>
        <Rect width={w} height={h} fill={fill} stroke={line} strokeWidth={sw} />
        <Rect x={lx} y={ly} width={lw} height={lh * .16} fill={INK} cornerRadius={1.5} />
        <Rect x={lx} y={ly + lh * .2} width={lw} height={lh * .8} fill="#FFFFFF" stroke={line} strokeWidth={1} cornerRadius={2} />
        {[.34, .48, .62].map(t => <Line key={t} points={[lx + lw * .12, ly + lh * t, lx + lw * .88, ly + lh * t]} stroke={line} opacity={.45} strokeWidth={1} dash={[2, 1.5]} />)}
        <Rect x={lx + lw * .36} y={ly + lh * .72} width={lw * .28} height={lh * .18} stroke={line} opacity={.55} strokeWidth={1} cornerRadius={1.5} />
        {w - (lx + lw) > lw * .35 && <Ellipse x={lx + lw * 1.22} y={ly + lh * .62} radiusX={lw * .07} radiusY={lh * .13} fill="#FFFFFF" stroke={line} strokeWidth={1} />}
      </>;
      break;
    }
    case "dresser": {
      // Three drawers, each with its knob, along the long side.
      art = <>
        <Rect width={w} height={h} fill={fill} stroke={line} strokeWidth={sw} />
        {[1 / 3, 2 / 3].map(u => <Line key={u} points={[...at(.04, u), ...at(.96, u)]} stroke={line} strokeWidth={1.2} />)}
        {[1 / 6, .5, 5 / 6].flatMap(u => [.3, .7].map(t => { const [x, y] = at(t, u); return <Circle key={`${u}-${t}`} x={x} y={y} radius={Math.max(1.6, s * .045)} fill={line} />; }))}
      </>;
      break;
    }
    case "wardrobe": {
      // Two doors meeting in the middle, a handle either side of the split.
      art = <>
        <Rect width={w} height={h} fill={fill} stroke={line} strokeWidth={sw} />
        <Line points={rung(.5, .06, .94)} stroke={line} strokeWidth={1.2} />
        {[.44, .56].map(t => <Line key={t} points={rung(t, .38, .62)} stroke={line} strokeWidth={2} lineCap="round" />)}
      </>;
      break;
    }
    case "shelf": {
      // A row of book spines seen from above.
      const colors = [p3, p1, p2, BROWN, p1, p3, p2];
      const n = Math.max(4, Math.floor(long / Math.max(5, scale * .22)));
      art = <>
        <Rect width={w} height={h} fill={item.built_in ? BUILT : WOOD} stroke={line} strokeWidth={sw} />
        {Array.from({ length: n }, (_, i) => {
          const t0 = .05 + .9 * i / n, t1 = t0 + .9 / n * .8, depth = [.7, .82, .6, .76][i % 4];
          const [x0, y0] = at(t0, (1 - depth) / 2), [x1, y1] = at(t1, (1 + depth) / 2);
          return <Rect key={i} x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={colors[i % colors.length]} cornerRadius={1} />;
        })}
      </>;
      break;
    }
    case "radiator":
      art = <>
        <Rect width={w} height={h} fill={item.built_in ? BUILT : METAL} stroke={item.built_in ? BLUE : STEEL} strokeWidth={sw} cornerRadius={2} />
        {stripes(Math.max(4, Math.floor(long / Math.max(4, scale * .2)))).map(t => <Line key={t} points={rung(t, .18, .82)} stroke={item.built_in ? BLUE : STEEL} opacity={.6} strokeWidth={1} />)}
      </>;
      break;
    case "column":
      art = <><Rect width={w} height={h} fill="#D9D9DE" stroke={INK} strokeWidth={sw} /><Line points={[0, 0, w, h]} stroke={INK} opacity={.35} strokeWidth={1} /><Line points={[w, 0, 0, h]} stroke={INK} opacity={.35} strokeWidth={1} /></>;
      break;
    case "desk_chair": case "chair": {
      // An office chair from above: a round seat over a five-caster base.
      const cx = w / 2, cy = h / 2, r = s / 2;
      const legs = [0, 1, 2, 3, 4].map(i => (-90 + i * 72) * Math.PI / 180);
      art = <>
        {legs.map(a => <Line key={a} points={[cx, cy, cx + Math.cos(a) * r * .88, cy + Math.sin(a) * r * .88]} stroke={line} strokeWidth={Math.max(1.5, r * .1)} lineCap="round" />)}
        {legs.map(a => <Circle key={`c${a}`} x={cx + Math.cos(a) * r * .88} y={cy + Math.sin(a) * r * .88} radius={Math.max(1.5, r * .09)} fill={INK} />)}
        <Circle x={cx} y={cy} radius={r * .6} fill={item.built_in ? "#FFFFFF" : p1} stroke={line} strokeWidth={sw} />
        <Circle x={cx} y={cy} radius={r * .36} stroke={line} opacity={.35} strokeWidth={1} />
      </>;
      break;
    }
    case "lounge": case "sofa": {
      // A back along one long side, arms at both ends, cushions on the seat.
      const back = h * .26, arm = Math.min(w * .14, scale * .45), seats = item.type === "sofa" ? 2 : 1;
      art = <>
        <Rect width={w} height={h} fill={p2} stroke={BROWN} strokeWidth={sw} cornerRadius={s * .14} />
        <Rect x={arm} y={back} width={w - arm * 2} height={h - back - pad} fill={p0} stroke={BROWN} strokeWidth={1} cornerRadius={s * .08} />
        {seats > 1 && <Line points={[w / 2, back + 2, w / 2, h - pad - 2]} stroke={BROWN} opacity={.5} strokeWidth={1} />}
      </>;
      break;
    }
    case "ottoman":
      art = <>
        <Rect width={w} height={h} fill={p1} stroke={BROWN} strokeWidth={sw} cornerRadius={s * .3} />
        {[[.3, .3], [.7, .3], [.5, .5], [.3, .7], [.7, .7]].map(([x, y]) => <Circle key={`${x}${y}`} x={w * x} y={h * y} radius={Math.max(1.4, s * .035)} fill={BROWN} opacity={.6} />)}
      </>;
      break;
    case "table":
      art = <><Rect width={w} height={h} fill={WOOD} stroke={BROWN} strokeWidth={sw} cornerRadius={s / 2} /><Rect x={s * .16} y={s * .16} width={w - s * .32} height={h - s * .32} stroke={BROWN} opacity={.3} strokeWidth={1} cornerRadius={s / 2} /></>;
      break;
    case "storage_bins": case "storage": {
      // Lidded bins with a handle slot, two side by side when there's room.
      const n = long >= scale * 1.8 ? 2 : 1, gap = n > 1 ? s * .08 : 0;
      art = <>{Array.from({ length: n }, (_, i) => {
        const [x0, y0] = at(i / n, 0), [x1, y1] = at((i + 1) / n, 1);
        const bx = x0 + (across ? (i ? gap / 2 : 0) : 0), by = y0 + (across ? 0 : (i ? gap / 2 : 0));
        const bw = x1 - x0 - (across ? gap / 2 : 0), bh = y1 - y0 - (across ? 0 : gap / 2);
        return <Group key={i}>
          <Rect x={bx} y={by} width={bw} height={bh} fill="#E4EEF6" stroke="#5B7A93" strokeWidth={sw} cornerRadius={3} />
          <Rect x={bx + bw * .12} y={by + bh * .12} width={bw * .76} height={bh * .76} stroke="#5B7A93" opacity={.4} strokeWidth={1} cornerRadius={2} />
          <Rect x={bx + bw * .34} y={by + bh * .42} width={bw * .32} height={bh * .16} fill="#5B7A93" opacity={.55} cornerRadius={Math.min(bw, bh) * .08} />
        </Group>;
      })}</>;
      break;
    }
    case "rug":
      art = <>
        <Rect width={w} height={h} fill={p0} stroke={p2} strokeWidth={2} cornerRadius={4} />
        {stripes(Math.max(3, Math.floor(h / 9))).map((t, i) => <Line key={i} points={[2, h * t, w - 2, h * t]} stroke={p1} opacity={.75} strokeWidth={2} />)}
        {/* Fringe on the short ends. */}
        {[0, 1].map(end => stripes(Math.max(4, Math.floor(s / 5))).map(u => { const [x, y] = at(end, u), [x2, y2] = at(end ? 1 - 4 / long : 4 / long, u); return <Line key={`${end}${u}`} points={[x, y, x2, y2]} stroke={p2} strokeWidth={1} />; }))}
      </>;
      break;
    case "fridge": {
      // A mini fridge: cold, so a snowflake on the top.
      const cx = w / 2, cy = h / 2, r = s * .28;
      art = <>
        <Rect width={w} height={h} fill={METAL} stroke={STEEL} strokeWidth={sw} cornerRadius={3} />
        {[0, 60, 120].map(d => { const a = d * Math.PI / 180; return <Line key={d} points={[cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r]} stroke="#4E83C4" strokeWidth={1.6} lineCap="round" />; })}
        <Circle x={cx} y={cy} radius={Math.max(1.4, r * .16)} fill="#4E83C4" />
      </>;
      break;
    }
    case "microwave":
      art = <>
        <Rect width={w} height={h} fill={METAL} stroke={STEEL} strokeWidth={sw} cornerRadius={2} />
        <Rect x={w * .1} y={h * .2} width={w * .56} height={h * .6} fill="#C9D4E0" stroke={STEEL} strokeWidth={1} cornerRadius={2} />
        {[.36, .64].map(t => <Circle key={t} x={w * .82} y={h * t} radius={Math.max(1.4, s * .06)} stroke={STEEL} strokeWidth={1} />)}
      </>;
      break;
    case "desk_lamp": case "ambient_lighting": {
      // A shade with its glow around it.
      const r = s / 2;
      art = <>
        <Circle x={w / 2} y={h / 2} radius={r * 1.45} fill="#FFE9C7" opacity={.55} />
        <Circle x={w / 2} y={h / 2} radius={r * .92} fill="#FFF4DD" stroke={BROWN} strokeWidth={1.5} />
        <Circle x={w / 2} y={h / 2} radius={r * .3} fill="#F2A93B" />
      </>;
      break;
    }
    case "string_lights":
      art = <>
        <Line points={[0, h / 2, w, h / 2]} stroke="#7A6A4F" strokeWidth={.8} />
        {bulbs(Math.max(3, Math.round(w / 12))).map((t, i) => <Circle key={i} x={t * w} y={h / 2} radius={Math.max(1.6, Math.min(2.6, h / 2))} fill="#F2A93B" />)}
      </>;
      break;
    case "throw_pillows": {
      // Two or three cushions, each with its centre button.
      const n = long >= scale * 1.3 ? 3 : 2, cw = long / (n * .82 + .18);
      art = <>{Array.from({ length: n }, (_, i) => {
        const t = i * cw * .82, [x, y] = across ? [t, 0] : [0, t], pw = across ? cw : w, ph = across ? h : cw;
        return <Group key={i}>
          <Rect x={x} y={y} width={pw} height={ph} fill={[p1, p2, p1][i % 3]} stroke={BROWN} strokeWidth={1} cornerRadius={Math.min(pw, ph) * .3} />
          <Circle x={x + pw / 2} y={y + ph / 2} radius={Math.max(1.2, Math.min(pw, ph) * .07)} fill={BROWN} opacity={.55} />
        </Group>;
      })}</>;
      break;
    }
    case "throw":
      // A folded blanket: stripes, and the folded corner.
      art = <>
        <Rect width={w} height={h} fill={p2} stroke={BROWN} strokeWidth={1} cornerRadius={2} />
        {stripes(3).map(t => <Line key={t} points={rung(t)} stroke={p0} opacity={.6} strokeWidth={1.5} />)}
        <Line points={[w * .62, h, w, h * .55, w, h]} closed fill={p1} stroke={BROWN} strokeWidth={1} />
      </>;
      break;
    case "laundry_hamper": {
      // A woven basket: a rim, and the weave inside it.
      const r = s * .45;
      art = <>
        <Rect width={w} height={h} fill="#EFE7DC" stroke={BROWN} strokeWidth={sw} cornerRadius={r} />
        <Group clipFunc={ctx => { ctx.beginPath(); ctx.roundRect(s * .14, s * .14, w - s * .28, h - s * .28, r * .7); }}>
          {stripes(Math.max(4, Math.floor(long / 5))).map(t => <Line key={`a${t}`} points={[long * t * 1.6 - long * .3, 0, long * t * 1.6 - long * .3 - long, long]} stroke={BROWN} opacity={.28} strokeWidth={1} />)}
          {stripes(Math.max(4, Math.floor(long / 5))).map(t => <Line key={`b${t}`} points={[long * t * 1.6 - long * .3, 0, long * t * 1.6 - long * .3 + long, long]} stroke={BROWN} opacity={.28} strokeWidth={1} />)}
        </Group>
        <Rect x={s * .14} y={s * .14} width={w - s * .28} height={h - s * .28} stroke={BROWN} strokeWidth={1} cornerRadius={r * .7} />
      </>;
      break;
    }
    case "trash_can":
      art = <>
        <Circle x={w / 2} y={h / 2} radius={s / 2} fill="#E6E4DE" stroke={STEEL} strokeWidth={sw} />
        <Circle x={w / 2} y={h / 2} radius={s * .34} stroke={STEEL} strokeWidth={1} />
        <Rect x={w / 2 - s * .12} y={h / 2 - s * .03} width={s * .24} height={s * .06} fill={STEEL} cornerRadius={1} />
      </>;
      break;
    case "power_strip": {
      const n = Math.max(2, Math.floor(long / Math.max(6, scale * .18)) - 1);
      art = <>
        <Rect width={w} height={h} fill="#F6F6F4" stroke={STEEL} strokeWidth={1.2} cornerRadius={Math.min(3, s * .3)} />
        {stripes(n).map(t => <Line key={t} points={rung(t * .82, .3, .7)} stroke={INK} opacity={.55} strokeWidth={1} />)}
        {(() => { const [x, y] = at(.93, .5); return <Circle x={x} y={y} radius={Math.max(1.2, s * .16)} fill="#D7262E" />; })()}
      </>;
      break;
    }
    case "mirror":
      // Glass: a cool tint with a highlight along it.
      art = <>
        <Rect width={w} height={h} fill="#DCE7F2" stroke={STEEL} strokeWidth={1.2} cornerRadius={1} />
        <Line points={[...at(.08, .5), ...at(.92, .5)]} stroke="#FFFFFF" strokeWidth={Math.max(1, s * .22)} lineCap="round" />
        {s > 10 && <Line points={[...at(.2, .2), ...at(.32, .8)]} stroke="#FFFFFF" strokeWidth={1.4} />}
      </>;
      break;
    case "wall_decor": {
      const kind = item.product_category;
      if (kind === "curtains") {
        // Pleats along the rail.
        const n = Math.max(6, Math.floor(long / 6));
        art = <><Rect width={w} height={h} fill={p1} cornerRadius={1} /><Line points={Array.from({ length: n + 1 }, (_, i) => at(i / n, i % 2 ? .1 : .9)).flat()} stroke={p3} strokeWidth={1} /></>;
      } else if (kind === "ambient_lighting") {
        art = <>
          <Line points={[...at(0, .5), ...at(1, .5)]} stroke="#7A6A4F" strokeWidth={.8} />
          {bulbs(Math.max(3, Math.round(long / 12))).map(t => { const [x, y] = at(t, .5); return <Circle key={t} x={x} y={y} radius={Math.max(1.6, Math.min(2.6, s / 2))} fill="#F2A93B" />; })}
        </>;
      } else if (kind === "tapestry") {
        art = <><Rect width={w} height={h} fill={p2} cornerRadius={1} />{stripes(Math.max(5, Math.floor(long / 4))).map(t => <Line key={t} points={rung(t, .55, 1)} stroke={p3} strokeWidth={1} />)}</>;
      } else {
        // A framed piece: frame, then the picture inside it.
        art = <><Rect width={w} height={h} fill={p3} cornerRadius={1} /><Rect x={Math.min(2, s * .25)} y={Math.min(2, s * .25)} width={w - Math.min(4, s * .5)} height={h - Math.min(4, s * .5)} fill={p1} /></>;
      }
      break;
    }
    case "desk_accessories": case "desk_organizer":
      // A tray with compartments and a few pens.
      art = <>
        <Rect width={w} height={h} fill="#E8D9C2" stroke={BROWN} strokeWidth={1.2} cornerRadius={2} />
        {[1 / 3, 2 / 3].map(t => <Line key={t} points={rung(t, .1, .9)} stroke={BROWN} opacity={.6} strokeWidth={1} />)}
        {[.3, .5, .7].map(u => { const [x, y] = at(1 / 6, u); return <Circle key={u} x={x} y={y} radius={Math.max(1, s * .08)} fill={[BLUE, "#D7262E", INK][Math.round(u * 10) % 3]} />; })}
      </>;
      break;
    case "towel_caddy":
      art = <>
        <Rect width={w} height={h} fill="#E4EEF6" stroke="#5B7A93" strokeWidth={1.2} cornerRadius={3} />
        <Line points={[...at(.06, .5), ...at(.94, .5)]} stroke="#5B7A93" strokeWidth={2} lineCap="round" />
        {[.28, .72].map(t => { const [x, y] = at(t, .26); return <Circle key={t} x={x} y={y} radius={Math.max(1.4, s * .13)} fill={p2} />; })}
      </>;
      break;
    case "plant": {
      // Leaves fanning out from the pot.
      const cx = w / 2, cy = h / 2, r = s / 2;
      art = <>
        <Circle x={cx} y={cy} radius={r * .62} fill="#C7704A" />
        {[0, 60, 120, 180, 240, 300].map(d => <Ellipse key={d} x={cx + Math.cos(d * Math.PI / 180) * r * .5} y={cy + Math.sin(d * Math.PI / 180) * r * .5} radiusX={r * .5} radiusY={r * .22} rotation={d} fill={d % 120 ? "#4E7A43" : "#7FA36B"} />)}
        <Circle x={cx} y={cy} radius={r * .18} fill="#3E6236" />
      </>;
      break;
    }
    case "clip_fan": {
      const cx = w / 2, cy = h / 2, r = s / 2;
      art = <>
        <Circle x={cx} y={cy} radius={r * .95} fill="#F6F6F4" stroke={STEEL} strokeWidth={1.2} />
        {[0, 120, 240].map(d => <Ellipse key={d} x={cx + Math.cos(d * Math.PI / 180) * r * .42} y={cy + Math.sin(d * Math.PI / 180) * r * .42} radiusX={r * .42} radiusY={r * .2} rotation={d} fill="#BFC8D2" />)}
        <Circle x={cx} y={cy} radius={r * .16} fill={STEEL} />
      </>;
      break;
    }
    case "accent":
      // A vase or candle: a round piece with its opening.
      art = <><Circle x={w / 2} y={h / 2} radius={s / 2} fill={p1} stroke={p3} strokeWidth={1.2} /><Circle x={w / 2} y={h / 2} radius={s * .2} fill={p3} opacity={.7} /></>;
      break;
    default:
      // Anything else (your own items): a parcel, taped across.
      art = <>
        <Rect width={w} height={h} fill={p1} opacity={.85} stroke={p3} strokeWidth={1.2} cornerRadius={3} />
        <Line points={rung(.5, .08, .92)} stroke={p3} opacity={.5} strokeWidth={Math.max(1.5, s * .1)} />
      </>;
  }
  return <Group listening={false}>{art}{(isBunkBed(item) || item.bed_mode === "lofted") && <>
    <Rect x={w * .04} y={h * .03} width={w * .92} height={h * .94} stroke={INK} strokeWidth={1.4} dash={[5, 3]} cornerRadius={2} />
    <Rect x={w * .72} y={h * .68} width={w * .22} height={h * .29} fill="#C79A6B" stroke={INK} strokeWidth={.7} />
    {[1, 2, 3].map(i => <Line key={i} points={[w * .74, h * (.68 + i * .07), w * .92, h * (.68 + i * .07)]} stroke="#FFFFFF" strokeWidth={2} />)}
  </>}</Group>;
}

// ---------- Room view: the illustrated, top-down room ----------

/** School-issue finishes: plainer and less saturated than the student's picks. */
const MAPLE = "#E2CFAE", MAPLE_EDGE = "#B39C76", LAMINATE = "#D9D7D2", LAMINATE_EDGE = "#A8A6A0";
const SHADOW = "rgb(60,40,20)";
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
/** The sides a piece's back can face, in its own (unrotated) frame. */
export type BackSide = 0 | 1 | 2 | 3; // top, right, bottom, left

/**
 * One piece in Room view, drawn inside its real footprint as what it is, in the
 * vibe's colours (dorm-provided pieces in plain maple or laminate with a
 * corner tag). The art is cached as one bitmap with its drop shadow baked in,
 * so dragging redraws an image, not dozens of shapes. Re-caches only when its
 * props change (size, vibe, dressed state, detail level, zoom bucket).
 */
export const RoomGlyph = memo(function RoomGlyph({ item, scale, theme, dressed = false, books = false, back = 0, detail = true, bucket = 1 }: {
  item: FurnitureItem;
  scale: number;
  theme: RoomTheme;
  /** A dorm bed the list dresses (bedding in the cart). */
  dressed?: boolean;
  /** The shelf is a bookshelf from the cart: show spines. */
  books?: boolean;
  /** Which side the piece's back is on (chairs face away from it, fronts face out). */
  back?: BackSide;
  /** False when the piece is under ~28px on screen: base shape and shadow only. */
  detail?: boolean;
  /** Zoom bucket (1, 1.5, 2, 3): the cache's resolution. */
  bucket?: number;
}) {
  const ref = useRef<Konva.Group>(null);
  const w = item.width_ft * scale, h = item.length_ft * scale;

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    // The shadow lives in room units (it grows with zoom), and always falls down
    // and to the right on screen: undo the stage zoom and the piece's rotation,
    // which Konva applies to shadows drawn into the cache.
    const k = Math.min(1, Math.max(.55, scale / 44));
    const z = Math.abs(node.getAbsoluteScale().x) || 1;
    const caster = node.findOne<Konva.Shape>(".caster");
    let pad = 4;
    if (caster) {
      const flat = item.type === "rug";
      const blur = (flat ? 3 : 8) * k, off = (flat ? 1 : 3) * k, a = -item.rotation_deg * Math.PI / 180;
      caster.shadowBlur(blur / z);
      caster.shadowOffset({ x: off * (Math.cos(a) - Math.sin(a)) / z, y: off * (Math.sin(a) + Math.cos(a)) / z });
      pad = Math.ceil(blur * 2 + off * 1.5) + 2;
    }
    node.clearCache();
    node.cache({ pixelRatio: Math.min((Konva.pixelRatio || 1) * bucket, 2048 / Math.max(w, h, 1)), offset: pad });
  });

  const s = Math.min(w, h), long = Math.max(w, h), across = w >= h;
  const at = (t: number, u: number): [number, number] => across ? [w * t, h * u] : [w * u, h * t];
  const rung = (t: number, from = 0, to = 1) => [...at(t, from), ...at(t, to)];
  const built = item.built_in;
  const wood = built ? MAPLE : theme.wood, woodEdge = built ? MAPLE_EDGE : theme.woodDark;
  const shade = (c: string, t: number) => mixHex(c, t < 0 ? "#000000" : "#FFFFFF", Math.abs(t));
  const casterRect = (fill: string, r = 3) => <Rect name="caster" width={w} height={h} cornerRadius={r} fill={fill} shadowColor={SHADOW} shadowOpacity={.25} />;
  const casterRound = (fill: string, r: number) => <Circle name="caster" x={w / 2} y={h / 2} radius={r} fill={fill} shadowColor={SHADOW} shadowOpacity={.25} />;
  /** Draw with the back along the top (cw × ch), turned so the back lands on `back`. */
  const canon = (draw: (cw: number, ch: number) => ReactNode) => {
    const cw = back % 2 ? h : w, ch = back % 2 ? w : h;
    return <Group x={w / 2} y={h / 2} offsetX={cw / 2} offsetY={ch / 2} rotation={back * 90}>{draw(cw, ch)}</Group>;
  };
  /** A wood top: a darker edge, and faint grain along its length. */
  const woodTop = (fill: string, edge: string, r = 1.5) => <>
    <Rect width={w} height={h} fill={fill} stroke={edge} strokeWidth={.8} cornerRadius={r} />
    <Rect x={1.5} y={1.5} width={w - 3} height={h - 3} stroke={edge} opacity={.38} strokeWidth={Math.max(1.2, s * .05)} cornerRadius={r} />
    {detail && [.24, .43, .62, .8].map((u, i) => <Line key={u} points={[...at(.06, u), ...at(.36, u + (i % 2 ? .02 : -.02)), ...at(.68, u), ...at(.94, u + (i % 2 ? -.015 : .015))]}
      tension={.5} stroke={edge} opacity={.16} strokeWidth={.8} />)}
  </>;
  const soft = (fill: string) => <>
    {casterRect(fill, Math.min(s * .3, 6))}
    <Rect width={w} height={h} fill={fill} stroke={shade(fill, -.18)} strokeWidth={.8} cornerRadius={Math.min(s * .3, 6)} />
    {detail && <Rect x={s * .12} y={s * .12} width={w - s * .24} height={h - s * .24} stroke="#FFFFFF" opacity={.3} strokeWidth={1} cornerRadius={Math.min(s * .2, 4)} />}
  </>;
  let art: ReactNode;
  switch (item.type) {
    case "bed": {
      const f = Math.max(1.5, Math.min(s * .05, 4)), mw = w - 2 * f;
      const head = back === 2 ? 2 : 0;
      if (dressed) {
        const y0 = h * .27, fold = h * .07, pillows = w >= scale * 3.8 ? 2 : 1;
        const ph = Math.min(h * .12, scale * .9), py = f + h * .045, gap = mw * .06;
        const pw = pillows === 1 ? mw * .72 : (mw - gap * 3) / 2, pillow = mixHex(theme.textileAlt, "#FFFFFF", .2);
        art = <>
          {casterRect(wood)}
          <Group x={w / 2} y={h / 2} offsetX={w / 2} offsetY={h / 2} rotation={head * 90}>
          <Rect width={w} height={h} fill={wood} stroke={woodEdge} strokeWidth={.8} cornerRadius={3} />
          <Rect x={f} y={f} width={mw} height={h - 2 * f} fill={shade(theme.textile, .55)} cornerRadius={3} />
          {detail && Array.from({ length: pillows }, (_, i) => {
            const x = pillows === 1 ? f + (mw - pw) / 2 : f + gap + i * (pw + gap);
            return <Group key={i}>
              <Rect x={x} y={py} width={pw} height={ph} fill={pillow} stroke={shade(pillow, -.22)} strokeWidth={.8} cornerRadius={ph * .42} />
              <Line points={[x + pw * .2, py + ph / 2, x + pw * .8, py + ph / 2]} stroke={shade(pillow, -.2)} opacity={.5} strokeWidth={.8} lineCap="round" />
            </Group>;
          })}
          <Rect x={f} y={y0} width={mw} height={h - f - y0} fill={theme.textile} stroke={shade(theme.textile, -.16)} strokeWidth={.8} cornerRadius={[2, 2, 3, 3]} />
          <Rect x={f} y={y0} width={mw} height={fold} fill={shade(theme.textile, .3)} cornerRadius={[2, 2, 0, 0]} />
          {detail && <Line points={[f, y0 + fold, w - f, y0 + fold]} stroke={shade(theme.textile, -.25)} opacity={.6} strokeWidth={.8} />}
          </Group>
        </>;
      } else {
        // Undressed dorm bed: a bare mattress with faint ticking.
        const n = Math.max(4, Math.floor(mw / Math.max(3, scale * .28)));
        art = <>
          {casterRect(wood)}
          <Rect width={w} height={h} fill={wood} stroke={woodEdge} strokeWidth={.8} cornerRadius={3} />
          <Rect x={f} y={f} width={mw} height={h - 2 * f} fill="#F2EFE8" stroke="#D2CCC0" strokeWidth={.8} cornerRadius={4} />
          {detail && stripes(n).map(t => <Line key={t} points={[f + mw * t, f + 3, f + mw * t, h - f - 3]} stroke="#8DA0B6" opacity={.22} strokeWidth={.8} />)}
        </>;
      }
      break;
    }
    case "desk": case "table":
      art = <>{casterRect(wood, 1.5)}{woodTop(wood, woodEdge)}</>;
      break;
    case "dresser": case "wardrobe": {
      const band = shade(wood, -.06);
      art = <>
        {casterRect(wood, 1.5)}
        {woodTop(wood, woodEdge)}
        {canon((cw, ch) => {
          const bh = ch * .17, by = ch - bh - 1.5, knob = Math.max(1.3, Math.min(cw, ch) * .04);
          const doors = item.type === "dresser" ? 3 : 2;
          return <>
            <Rect x={1.5} y={by} width={cw - 3} height={bh} fill={band} />
            {detail && Array.from({ length: doors - 1 }, (_, i) => <Line key={i} points={[cw * (i + 1) / doors, by, cw * (i + 1) / doors, by + bh]} stroke={woodEdge} opacity={.7} strokeWidth={.9} />)}
            {detail && (item.type === "dresser" ? [1 / 6, .5, 5 / 6] : [.44, .56]).map(t => <Circle key={t} x={cw * t} y={by + bh / 2} radius={knob} fill={woodEdge} />)}
          </>;
        })}
      </>;
      break;
    }
    case "shelf": {
      const colors = [theme.textileAlt, theme.accent, theme.textile, theme.woodDark, theme.accent, theme.textileAlt];
      const n = Math.max(4, Math.floor(long / Math.max(4, scale * .2)));
      art = <>
        {casterRect(wood, 1)}
        {woodTop(wood, woodEdge, 1)}
        {books && detail && Array.from({ length: n }, (_, i) => {
          const t0 = .05 + .9 * i / n, t1 = t0 + .9 / n * .82, depth = [.7, .8, .62, .76][i % 4];
          const [x0, y0] = at(t0, (1 - depth) / 2), [x1, y1] = at(t1, (1 + depth) / 2);
          return <Rect key={i} x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={colors[i % colors.length]} stroke={shade(colors[i % colors.length], -.25)} strokeWidth={.5} cornerRadius={.8} />;
        })}
      </>;
      break;
    }
    case "desk_chair": {
      const r = s / 2, phi = back * 90 - 90, seat = built ? LAMINATE : theme.accent, rim = built ? LAMINATE_EDGE : shade(theme.accent, -.28);
      art = <>
        {casterRound(seat, r * .7)}
        <Arc x={w / 2} y={h / 2} innerRadius={r * .7} outerRadius={r * .97} angle={150} rotation={phi - 75} fill={rim} />
        <Circle x={w / 2} y={h / 2} radius={r * .68} fill={seat} stroke={rim} strokeWidth={1} />
        {detail && <Circle x={w / 2} y={h / 2} radius={r * .42} stroke={shade(seat, .35)} opacity={.6} strokeWidth={1} />}
      </>;
      break;
    }
    case "chair": case "lounge": case "sofa": {
      const fill = built ? LAMINATE : theme.accent, dark = shade(fill, -.2), seat = shade(fill, .16);
      art = <>
        {casterRect(dark, s * .22)}
        {canon((cw, ch) => {
          const r = Math.min(cw, ch) * .2, arm = Math.min(cw * .17, ch * .3), bk = ch * .26;
          const seats = item.type === "sofa" && cw > ch * 1.4 ? 2 : 1, sw = (cw - arm * 2 - 2) / seats;
          return <>
            <Rect width={cw} height={ch} fill={dark} cornerRadius={r} />
            <Rect x={cw * .04} y={ch * .04} width={cw * .92} height={bk} fill={fill} cornerRadius={r * .8} />
            {[0, 1].map(i => <Rect key={i} x={i ? cw - arm - cw * .03 : cw * .03} y={ch * .16} width={arm} height={ch * .78} fill={fill} cornerRadius={arm * .45} />)}
            {Array.from({ length: seats }, (_, i) => <Rect key={i} x={arm + 1 + i * sw + (i ? 1 : 0)} y={bk + ch * .02} width={sw - (seats > 1 ? 1 : 0)} height={ch - bk - ch * .1} fill={seat} cornerRadius={r * .6} />)}
            {detail && seats === 1 && <Line points={[cw * .38, ch * .62, cw * .62, ch * .62]} stroke={dark} opacity={.35} strokeWidth={1} lineCap="round" />}
          </>;
        })}
      </>;
      break;
    }
    case "ottoman": {
      const fill = theme.accent, round = Math.abs(w - h) < s * .2;
      art = <>
        {round ? casterRound(fill, s / 2) : casterRect(fill, s * .3)}
        {round ? <Circle x={w / 2} y={h / 2} radius={s / 2} fill={fill} stroke={shade(fill, -.2)} strokeWidth={.8} />
          : <Rect width={w} height={h} fill={fill} stroke={shade(fill, -.2)} strokeWidth={.8} cornerRadius={s * .3} />}
        {detail && (round ? <Circle x={w / 2} y={h / 2} radius={s * .34} stroke={shade(fill, -.22)} opacity={.55} strokeWidth={1} dash={[2, 1.6]} />
          : <Line points={rung(.5, .15, .85)} stroke={shade(fill, -.22)} opacity={.55} strokeWidth={1} />)}
      </>;
      break;
    }
    case "rug": {
      const { pattern, base, line } = theme.rug, inset = Math.max(3, s * .08), r = pattern === "fuzzy" ? s * .22 : Math.min(4, s * .05);
      const iw = w - inset * 2, ih = h - inset * 2;
      let fill: ReactNode = null;
      if (detail) {
        if (pattern === "stripes") {
          const n = Math.max(3, Math.round(s / Math.max(8, scale * .45)));
          fill = stripes(n).map(u => <Line key={u} points={[...at(0, u), ...at(1, u)]} stroke={line} opacity={.75} strokeWidth={Math.max(1.5, s / (n * 3.2))} />);
        } else if (pattern === "plaid") {
          const n = Math.max(3, Math.round(s / Math.max(10, scale * .6))), m = Math.max(3, Math.round(long / Math.max(10, scale * .6)));
          fill = <>
            {stripes(n).map(u => <Line key={`a${u}`} points={[...at(0, u), ...at(1, u)]} stroke={line} opacity={.45} strokeWidth={s / (n * 2.4)} />)}
            {stripes(m).map(t => <Line key={`b${t}`} points={rung(t)} stroke={line} opacity={.45} strokeWidth={long / (m * 2.4)} />)}
            {stripes(n).map(u => <Line key={`c${u}`} points={[...at(0, u + .5 / (n + 1)), ...at(1, u + .5 / (n + 1))]} stroke={theme.textile} opacity={.45} strokeWidth={.8} />)}
          </>;
        } else if (pattern === "arcs") {
          const [cx, cy] = at(.5, 1), colors = [line, theme.textile, theme.textileAlt, line];
          fill = [.92, .72, .52, .32].map((f, i) => <Circle key={f} x={cx} y={cy} radius={s * f} stroke={colors[i]} opacity={.85} strokeWidth={s * .085} />);
        } else if (pattern === "neon") {
          fill = <>
            <Rect x={inset} y={inset} width={iw} height={ih} stroke={line} opacity={.25} strokeWidth={5} cornerRadius={r} />
            <Rect x={inset + 4} y={inset + 4} width={iw - 8} height={ih - 8} stroke={theme.accent} opacity={.55} strokeWidth={.8} cornerRadius={r} />
          </>;
        } else if (pattern === "fuzzy") {
          fill = <Rect width={w} height={h} stroke={line} opacity={.8} strokeWidth={2.2} dash={[1, 2.2]} cornerRadius={r} />;
        } else {
          fill = <Rect x={inset + 3} y={inset + 3} width={iw - 6} height={ih - 6} stroke={line} opacity={.35} strokeWidth={.8} cornerRadius={r} />;
        }
      }
      art = <>
        {casterRect(base, r)}
        <Rect width={w} height={h} fill={base} cornerRadius={r} />
        <Group clipFunc={ctx => { ctx.beginPath(); ctx.roundRect(inset, inset, iw, ih, r); }}>{fill}</Group>
        <Rect x={inset} y={inset} width={iw} height={ih} stroke={line} opacity={pattern === "plain" ? .55 : .95} strokeWidth={Math.max(1.2, s * .025)} cornerRadius={r} />
      </>;
      break;
    }
    case "plant": {
      const cx = w / 2, cy = h / 2, r = s / 2, greens = ["#6F9B57", "#4A7A42"];
      art = <>
        {casterRound("#B76A44", r * .86)}
        <Circle x={cx} y={cy} radius={r * .86} fill="#B76A44" stroke="#8E4E2F" strokeWidth={.8} />
        <Circle x={cx} y={cy} radius={r * .72} fill="#5B4030" />
        {(detail ? [0, 52, 104, 156, 208, 260, 312] : [0, 90, 180, 270]).map((d, i) => <Ellipse key={d} x={cx + Math.cos(d * Math.PI / 180) * r * .42} y={cy + Math.sin(d * Math.PI / 180) * r * .42}
          radiusX={r * .46} radiusY={r * .22} rotation={d} fill={greens[i % 2]} stroke={detail ? "#2F4F2A" : undefined} strokeWidth={.5} opacity={.96} />)}
        {detail && [30, 150, 270].map(d => <Ellipse key={d} x={cx + Math.cos(d * Math.PI / 180) * r * .18} y={cy + Math.sin(d * Math.PI / 180) * r * .18} radiusX={r * .26} radiusY={r * .13} rotation={d} fill="#86B06A" />)}
      </>;
      break;
    }
    case "desk_lamp": case "ambient_lighting": {
      const cx = w / 2, cy = h / 2, r = s / 2;
      art = <>
        <Circle x={cx} y={cy} radius={Math.max(s * 1.7, scale * .9)} fillRadialGradientStartPoint={{ x: 0, y: 0 }} fillRadialGradientEndPoint={{ x: 0, y: 0 }}
          fillRadialGradientStartRadius={0} fillRadialGradientEndRadius={Math.max(s * 1.7, scale * .9)} fillRadialGradientColorStops={[0, rgba(theme.glow, .42), 1, rgba(theme.glow, 0)]} />
        {casterRound(theme.accent, r * .8)}
        <Circle x={cx} y={cy} radius={r * .8} fill={shade(theme.glow, .55)} stroke={built ? LAMINATE_EDGE : theme.accent} strokeWidth={Math.max(1, s * .08)} />
        {detail && <Circle x={cx} y={cy} radius={r * .3} fill={theme.glow} />}
      </>;
      break;
    }
    case "string_lights": {
      const n = Math.max(3, Math.round(long / Math.max(8, scale * .5))), br = Math.max(1.4, Math.min(2.6, s * .35));
      art = <>
        <Line points={[...at(0, .5), ...at(1, .5)]} stroke="#5C5246" opacity={.8} strokeWidth={.8} />
        {bulbs(n).map(t => { const [x, y] = at(t, .5); return <Group key={t}><Circle x={x} y={y} radius={br * 2.4} fill={theme.glow} opacity={.28} /><Circle x={x} y={y} radius={br} fill={shade(theme.glow, .25)} /></Group>; })}
      </>;
      break;
    }
    case "storage_bins": case "storage": {
      const fill = built ? LAMINATE : mixHex(theme.textileAlt, "#FFFFFF", .35), dark = shade(fill, -.25);
      const n = long >= scale * 1.8 ? 2 : 1;
      art = <>{casterRect(fill, 3)}{Array.from({ length: n }, (_, i) => {
        const [x0, y0] = at(i / n, 0), [x1, y1] = at((i + 1) / n, 1), g = n > 1 ? 1 : 0;
        const bx = x0 + (across && i ? g : 0), by = y0 + (!across && i ? g : 0), bw = x1 - x0 - (across ? g : 0), bh = y1 - y0 - (across ? 0 : g);
        const ribs = Math.max(3, Math.floor(Math.max(bw, bh) / Math.max(4, scale * .16)));
        return <Group key={i}>
          <Rect x={bx} y={by} width={bw} height={bh} fill={fill} stroke={dark} strokeWidth={.8} cornerRadius={3} />
          {detail && stripes(ribs).map(t => <Line key={t} points={bw >= bh ? [bx + bw * t, by + bh * .14, bx + bw * t, by + bh * .86] : [bx + bw * .14, by + bh * t, bx + bw * .86, by + bh * t]} stroke={dark} opacity={.3} strokeWidth={.8} />)}
        </Group>;
      })}</>;
      break;
    }
    case "laundry_hamper": {
      const fill = mixHex(theme.textileAlt, "#D8C29D", .6), dark = shade(fill, -.32), r = s * .45;
      art = <>
        {casterRect(fill, r)}
        <Rect width={w} height={h} fill={fill} stroke={dark} strokeWidth={.9} cornerRadius={r} />
        {detail && <Group clipFunc={ctx => { ctx.beginPath(); ctx.roundRect(s * .12, s * .12, w - s * .24, h - s * .24, r * .7); }}>
          {stripes(Math.max(4, Math.floor(long / 5))).flatMap(t => [1, -1].map(d => <Line key={`${t}${d}`} points={[long * t * 1.6 - long * .3, 0, long * t * 1.6 - long * .3 - d * long, long]} stroke={dark} opacity={.26} strokeWidth={.8} />))}
        </Group>}
        <Rect x={s * .12} y={s * .12} width={w - s * .24} height={h - s * .24} stroke={dark} opacity={.6} strokeWidth={.8} cornerRadius={r * .7} />
      </>;
      break;
    }
    case "trash_can": {
      const fill = built ? LAMINATE : mixHex(theme.accent, "#FFFFFF", .55);
      art = <>
        {casterRound(fill, s / 2)}
        <Circle x={w / 2} y={h / 2} radius={s / 2} fill={fill} stroke={shade(fill, -.3)} strokeWidth={.9} />
        {detail && <Circle x={w / 2} y={h / 2} radius={s * .36} fill={shade(fill, -.1)} stroke={shade(fill, -.3)} strokeWidth={.6} />}
      </>;
      break;
    }
    case "power_strip": {
      const n = Math.max(2, Math.floor(long / Math.max(6, scale * .2)) - 1);
      art = <>
        {casterRect("#F3F2EE", 1.5)}
        <Rect width={w} height={h} fill="#F3F2EE" stroke="#B7B4AC" strokeWidth={.8} cornerRadius={Math.min(2, s * .3)} />
        {detail && stripes(n).map(t => <Line key={t} points={rung(t * .9, .35, .65)} stroke="#6E6B64" opacity={.45} strokeWidth={.8} />)}
      </>;
      break;
    }
    case "mirror":
      art = <>
        {casterRect(wood, 1)}
        <Rect width={w} height={h} fill="#E4EEF6" stroke={wood} strokeWidth={Math.max(1.2, s * .14)} cornerRadius={1} />
        {detail && <Line points={[...at(.12, .85), ...at(.4, .15)]} stroke="#FFFFFF" opacity={.85} strokeWidth={Math.max(1, s * .16)} lineCap="round" />}
        {detail && <Line points={[...at(.48, .85), ...at(.6, .15)]} stroke="#FFFFFF" opacity={.6} strokeWidth={.8} lineCap="round" />}
      </>;
      break;
    case "fridge": case "microwave":
      art = <>
        {casterRect("#F6F6F3", 3)}
        <Rect width={w} height={h} fill="#F6F6F3" stroke="#C3C6CB" strokeWidth={.9} cornerRadius={3} />
        {detail && canon((cw, ch) => <>
          <Line points={[2, ch * .82, cw - 2, ch * .82]} stroke="#B7BBC1" strokeWidth={.9} />
          <Line points={[cw * .3, ch * .91, cw * .7, ch * .91]} stroke="#8E949C" strokeWidth={Math.max(1.5, ch * .05)} lineCap="round" />
        </>)}
      </>;
      break;
    case "wall_decor": {
      const kind = item.product_category;
      if (kind === "curtains") {
        // Gathered folds hanging at the window.
        const n = Math.max(6, Math.floor(long / 5));
        art = <>
          <Rect width={w} height={h} fill={theme.textile} opacity={.95} cornerRadius={1} />
          <Line points={Array.from({ length: n + 1 }, (_, i) => at(i / n, i % 2 ? .12 : .88)).flat()} stroke={shade(theme.textile, -.25)} opacity={.7} strokeWidth={.9} tension={.35} />
          <Line points={[...at(0, .06), ...at(1, .06)]} stroke={theme.woodDark} strokeWidth={1} />
        </>;
      } else if (kind === "ambient_lighting") {
        const n = Math.max(3, Math.round(long / Math.max(8, scale * .5))), br = Math.max(1.4, Math.min(2.6, s / 2));
        art = <>
          <Line points={[...at(0, .5), ...at(1, .5)]} stroke="#5C5246" opacity={.8} strokeWidth={.8} />
          {bulbs(n).map(t => { const [x, y] = at(t, .5); return <Group key={t}><Circle x={x} y={y} radius={br * 2.4} fill={theme.glow} opacity={.28} /><Circle x={x} y={y} radius={br} fill={shade(theme.glow, .25)} /></Group>; })}
        </>;
      } else if (kind === "tapestry") {
        art = <>
          <Rect width={w} height={h} fill={theme.textileAlt} cornerRadius={1} />
          {detail && stripes(Math.max(5, Math.floor(long / 4))).map(t => <Line key={t} points={rung(t, .6, 1)} stroke={theme.textile} opacity={.7} strokeWidth={.8} />)}
        </>;
      } else {
        art = <><Rect width={w} height={h} fill={theme.woodDark} cornerRadius={1} /><Rect x={Math.min(1.5, s * .2)} y={Math.min(1.5, s * .2)} width={w - Math.min(3, s * .4)} height={h - Math.min(3, s * .4)} fill={theme.textileAlt} /></>;
      }
      break;
    }
    case "throw_pillows": {
      const n = long >= scale * 1.3 ? 3 : 2, cw = long / (n * .82 + .18);
      art = <>{casterRect(theme.textileAlt, s * .3)}{Array.from({ length: n }, (_, i) => {
        const t = i * cw * .82, [x, y] = across ? [t, 0] : [0, t], pw = across ? cw : w, ph = across ? h : cw, c = [theme.textileAlt, theme.accent, theme.textileAlt][i % 3];
        return <Rect key={i} x={x} y={y} width={pw} height={ph} fill={c} stroke={shade(c, -.2)} strokeWidth={.8} cornerRadius={Math.min(pw, ph) * .32} />;
      })}</>;
      break;
    }
    case "radiator": case "column":
      art = <>{casterRect(LAMINATE, 2)}<Rect width={w} height={h} fill={LAMINATE} stroke={LAMINATE_EDGE} strokeWidth={.8} cornerRadius={2} />
        {detail && item.type === "radiator" && stripes(Math.max(4, Math.floor(long / Math.max(4, scale * .2)))).map(t => <Line key={t} points={rung(t, .2, .8)} stroke={LAMINATE_EDGE} opacity={.6} strokeWidth={.8} />)}</>;
      break;
    default:
      // Anything else: a soft rounded block in the vibe's colours.
      art = soft(built ? LAMINATE : mixHex(theme.textileAlt, theme.textile, .3));
  }
  const tag = Math.max(5, Math.min(11, s * .2));
  const round = ["desk_chair", "trash_can", "plant", "desk_lamp", "ambient_lighting"].includes(item.type);
  const [tx, ty] = round ? [w / 2 - s * .36, h / 2 - s * .36] : [0, 0];
  return <Group ref={ref} listening={false}>
    {art}
    {(isBunkBed(item) || item.bed_mode === "lofted") && <>
      <Rect x={w * .04} y={h * .03} width={w * .92} height={h * .94} stroke={INK} strokeWidth={1.4} dash={[5, 3]} cornerRadius={2} />
      <Rect x={w * .72} y={h * .68} width={w * .22} height={h * .29} fill="#C79A6B" stroke={INK} strokeWidth={.7} />
      {[1, 2, 3].map(i => <Line key={i} points={[w * .74, h * (.68 + i * .07), w * .92, h * (.68 + i * .07)]} stroke="#FFFFFF" strokeWidth={2} />)}
    </>}
    {/* School-issue tag: a folded corner, so dorm-provided reads without colour. */}
    {built && <Line points={[tx, ty, tx + tag, ty, tx, ty + tag]} closed fill="#5E6470" opacity={.85} />}
  </Group>;
});
