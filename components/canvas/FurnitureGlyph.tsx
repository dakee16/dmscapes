import { Group, Rect, Line, Circle, Ellipse } from "react-konva";
import type { FurnitureItem } from "@/lib/types";
import { isBunkBed } from "@/lib/bedding";

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
 * Top-down symbols inside the real footprint, in the plan's flat style
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
