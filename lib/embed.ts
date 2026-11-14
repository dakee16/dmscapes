import { SITE_URL } from "./seo";
import { SCHOOLS, publishedDimsCount } from "./schools";
import { shortName } from "./school-names";
import { dormSizeStats } from "./dorm-sizes";
import { ft, hasDims } from "./room-preview";
import { scaleWall, schoolSource, spread } from "./school-facts";
import type { SchoolSummary } from "./types";

// "Embed this chart": the size charts on /dorm-room-size and the college pages
// as PNGs (app/embed), and the snippet that links back. Every figure comes from
// the school data, the same helpers the pages use.

export type ChartRow = { label: string; dims: string; sqft: number; value: string };
export type Chart = {
  page: string;
  image: string;
  eyebrow: string;
  /** a display line and a serif line, like the page headlines */
  lines: [string, string];
  note: string;
  rows: ChartRow[];
  alt: string;
};

export const CHART_WIDTH = 1200;
export const chartHeight = (rows: number) => 420 + rows * 64;

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const dims = (l: number, w: number) => `${ft(l)} × ${ft(w)} ft`;
const NAME = ["", "Single", "Double", "Triple"];

/** The typical single, double and triple, as /dorm-room-size states them. */
export function dormSizeChart(): Chart {
  const S = dormSizeStats(SCHOOLS);
  const rows = S.byType.map((t) => ({
    label: NAME[t.occupants],
    dims: `${dims(t.lengthFt, t.widthFt)} · most ${fmt(t.p25)}–${fmt(t.p75)} sq ft`,
    sqft: t.median,
    value: `${fmt(t.median)} sq ft`,
  }));
  return {
    page: "/dorm-room-size",
    image: "/embed/dorm-room-size.png",
    eyebrow: `Typical size · ${fmt(S.rooms)} published rooms · ${S.schools} colleges`,
    lines: ["How big is a", "dorm room?"],
    note: "Median of the sizes colleges publish",
    rows,
    alt: `Bar chart of typical dorm room sizes: ${rows.map((r) => `${r.label.toLowerCase()} ${r.value}`).join(", ")}, from ${fmt(S.rooms)} room sizes published by ${S.schools} colleges.`,
  };
}

/**
 * A college's sizes: the ranked room type its page charts when there is one,
 * else its published sizes, else (it publishes none) its estimates, marked "about".
 */
export function collegeChart(school: SchoolSummary): Chart | null {
  const short = shortName(school);
  const bars = spread(school);
  const estimated = !bars && publishedDimsCount(school) === 0;
  const groups =
    bars?.groups ??
    scaleWall(school, estimated ? hasDims : undefined).map((p) => ({ l: p.l, w: p.w, sqft: p.sqft, halls: [p.hall], type: p.type }));
  if (!groups.length) return null;
  const rows = groups.map((g) => ({
    label: `${g.halls.length > 3 ? `${g.halls.slice(0, 3).join(", ")} +${g.halls.length - 3}` : g.halls.join(", ")} · ${g.type}`,
    dims: dims(g.l, g.w),
    sqft: g.sqft,
    value: `${estimated ? "about " : ""}${fmt(g.sqft)} sq ft`,
  }));
  const host = schoolSource(school.id)?.host;
  const [big, small] = [rows[0], rows[rows.length - 1]];
  return {
    page: `/colleges/${school.id}`,
    image: `/embed/colleges/${school.id}.png`,
    eyebrow: `${school.name} · ${estimated ? "estimated" : "published"} sizes`,
    lines: [`${short} dorms,`, bars ? `ranked by ${bars.family} size.` : estimated ? "estimated room sizes." : "ranked by room size."],
    note: estimated
      ? `${short} doesn't publish room sizes, so these are estimates from similar rooms`
      : host
        ? `Sizes as published by ${host}`
        : "Sizes as the school publishes them",
    rows,
    alt: `Bar chart of ${estimated ? "estimated " : ""}${short} dorm room sizes${bars ? ` (${bars.family}s)` : ""}, largest first: ${big.value} (${big.label})${rows.length > 1 ? ` down to ${small.value} (${small.label})` : ""}.`,
  };
}

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** The HTML people paste: the chart linking to the page, and a visible source link. */
export function embedSnippet(c: Chart): string {
  const page = `${SITE_URL}${c.page}`;
  const height = Math.round(chartHeight(c.rows.length) / 2);
  return (
    `<a href="${page}?utm_source=embed"><img src="${SITE_URL}${c.image}" alt="${attr(c.alt)}" width="${CHART_WIDTH / 2}" height="${height}" style="max-width:100%;height:auto"></a>\n` +
    `<p>Source: <a href="${page}">dormscape</a></p>`
  );
}
