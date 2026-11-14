// Lossless size cut for the Hall Finder map SVGs (scripts/campus/sketch.mjs writes them).
// Same pixels, fewer bytes:
//   1. Geometry that never comes within reach of the 1000 x 1000 frame is dropped. Stroked lines
//      are cut only at points outside the frame plus the widest stroke, so the caps and joins a
//      cut changes are never drawn on screen. Filled shapes are never cut: each one is kept
//      whole, or dropped when its whole box is out of reach.
//   2. M/L/Z path data is written relative with implicit repeats ("l-3 3-41 40"); integer
//      coordinates stay exact, decimals are worked in scaled integers.
// Only paths made of M, L and Z commands are touched; everything else is copied as it is.
//   node scripts/campus/svg-slim.mjs              slim every map in public/hall-finder
//   node scripts/campus/svg-slim.mjs --check      exit 1 if any map would still change
//   node scripts/campus/svg-slim.mjs <file.svg>…  slim just these
import fs from "node:fs";
import path from "node:path";

const FRAME = 1000;

/** Does segment a-b touch the square [lo, hi]²? (Liang–Barsky) */
function touches([x0, y0], [x1, y1], lo, hi) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [[-dx, x0 - lo], [dx, hi - x0], [-dy, y0 - lo], [dy, hi - y0]]) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
}

/** Subpaths of an M/L/Z path (absolute or relative) as { pts, closed }; null for any other command. */
function parse(d) {
  if (!/^[MLZmlz0-9.\-\s,eE]+$/.test(d)) return null;
  const subs = [];
  let cur = null;
  let x = 0;
  let y = 0;
  for (const [, cmd, args] of d.matchAll(/([MLZmlz])([^MLZmlz]*)/g)) {
    if (cmd === "Z" || cmd === "z") {
      if (!cur || args.trim()) return null;
      cur.closed = true;
      [x, y] = cur.pts[0]; // a closepath returns to the subpath's start
      continue;
    }
    const nums = (args.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number);
    if (nums.length % 2) return null;
    for (let i = 0; i < nums.length; i += 2) {
      const rel = cmd === "m" || cmd === "l";
      x = rel ? x + nums[i] : nums[i];
      y = rel ? y + nums[i + 1] : nums[i + 1];
      if (i === 0 && (cmd === "M" || cmd === "m")) subs.push((cur = { pts: [], closed: false }));
      if (!cur || cur.closed) return null;
      cur.pts.push([x, y]);
    }
  }
  return subs;
}

const decimals = (n) => {
  const s = String(n);
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
};

/** Relative, implicit-repeat path data for these subpaths, at `places` decimal places. */
function write(subs, places) {
  const k = 10 ** places;
  const fmt = (v) => {
    const s = places ? (v / k).toFixed(places).replace(/0+$/, "").replace(/\.$/, "") : String(v);
    return s === "-0" ? "0" : s;
  };
  // Numbers join with a space, or nothing before a minus sign.
  const join = (parts) => parts.reduce((out, p, i) => (i && !p.startsWith("-") ? `${out} ${p}` : out + p), "");
  let out = "";
  let px = 0;
  let py = 0;
  subs.forEach(({ pts, closed }, si) => {
    const scaled = pts.map(([a, b]) => [Math.round(a * k), Math.round(b * k)]);
    const [mx, my] = scaled[0];
    out += si === 0 ? `M${join([fmt(mx), fmt(my)])}` : `m${join([fmt(mx - px), fmt(my - py)])}`;
    let [cx, cy] = [mx, my];
    if (scaled.length > 1) {
      const rel = [];
      for (const [qx, qy] of scaled.slice(1)) {
        rel.push(fmt(qx - cx), fmt(qy - cy));
        [cx, cy] = [qx, qy];
      }
      out += `l${join(rel)}`;
    }
    if (closed) {
      out += "z";
      [cx, cy] = [mx, my];
    }
    [px, py] = [cx, cy];
  });
  return out;
}

/** The same picture in fewer bytes. */
export function slimSvg(svg) {
  // The widest stroke on the page bounds how far a visible line can reach outside the frame.
  const widths = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]));
  const margin = Math.max(0, ...widths) / 2 + 2;
  const lo = -margin;
  const hi = FRAME + margin;
  return svg.replace(/(<path\b([^>]*?)\sd=")([^"]+)("[^>]*>)/g, (whole, head, attrs, d, tail) => {
    const subs = parse(d);
    if (!subs) return whole;
    // Only an unfilled, stroked path is cut into runs; a filled one keeps every shape it shows.
    const tags = attrs + tail;
    const lineOnly = /\sstroke-width="/.test(tags) && !/\sfill="(?!none")/.test(tags) && subs.every((s) => !s.closed);
    const kept = [];
    for (const sub of subs) {
      const { pts } = sub;
      if (!lineOnly || pts.length === 1) {
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        if (Math.max(...xs) >= lo && Math.min(...xs) <= hi && Math.max(...ys) >= lo && Math.min(...ys) <= hi) kept.push(sub);
        continue;
      }
      let run = null;
      for (let i = 1; i < pts.length; i++) {
        if (touches(pts[i - 1], pts[i], lo, hi)) {
          if (!run) kept.push((run = { pts: [pts[i - 1]], closed: false }));
          run.pts.push(pts[i]);
        } else run = null;
      }
    }
    // Nothing in reach: leave the element as it is (dropping it would mean editing the whole tag).
    if (!kept.length) return whole;
    const places = Math.max(0, ...subs.flatMap((s) => s.pts.flat()).map(decimals));
    return `${head}${write(kept, places)}${tail}`;
  });
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes("--check");
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".svg") ? [path.join(dir, e.name)] : []));
  const files = args.length ? args : walk("public/hall-finder");
  let before = 0;
  let after = 0;
  const stale = [];
  for (const f of files) {
    const svg = fs.readFileSync(f, "utf8");
    const slim = slimSvg(svg);
    before += svg.length;
    after += slim.length;
    if (slim !== svg) {
      stale.push(f);
      if (!check) fs.writeFileSync(f, slim);
    }
  }
  const mb = (n) => `${(n / 1e6).toFixed(1)} MB`;
  if (check) {
    console.log(stale.length ? `✗ ${stale.length} of ${files.length} maps aren't slimmed (run node scripts/campus/svg-slim.mjs)` : `✓ all ${files.length} maps slimmed`);
    process.exit(stale.length ? 1 : 0);
  }
  console.log(`${files.length} maps: ${mb(before)} → ${mb(after)} (${stale.length} rewritten)`);
}
