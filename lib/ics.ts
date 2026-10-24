// Reads a class schedule from an .ics calendar export, in the browser (nothing is uploaded),
// and matches each class's LOCATION to a campus building. No path aliases here, so
// scripts/check-hall-finder-ics.mjs can import it straight into Node.

export interface IcsClass {
  /** SUMMARY, e.g. "ECON 102". Sections of one course are merged. */
  course: string;
  /** LOCATION as written, e.g. "WILLARD 062". */
  location: string;
  /** Weekdays as a bitmask, M = 1 … F = 16. */
  days: number;
  /** First meeting's start, "9:05 AM", when the file gives a time. */
  time: string | null;
}

const BYDAY: Record<string, number> = { MO: 1, TU: 2, WE: 4, TH: 8, FR: 16 };

/** RFC 5545 text: unfold continuation lines, then unescape \n \, \; \\. */
function unfold(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}
const unescape = (v: string) => v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();

function startOf(value: string): { weekday: number | null; time: string | null } {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/.exec(value);
  if (!m) return { weekday: null, time: null };
  const weekday = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay(); // 0 = Sunday
  if (!m[4]) return { weekday, time: null };
  const h = +m[4];
  return { weekday, time: `${((h + 11) % 12) + 1}:${m[5]} ${h < 12 ? "AM" : "PM"}` };
}

export function parseIcs(text: string): IcsClass[] {
  const byCourse = new Map<string, IcsClass>();
  let ev: Record<string, string> | null = null;
  for (const line of unfold(text)) {
    if (/^BEGIN:VEVENT/i.test(line)) ev = {};
    else if (/^END:VEVENT/i.test(line) && ev) {
      const course = unescape(ev.SUMMARY ?? "").slice(0, 60);
      const location = unescape(ev.LOCATION ?? "");
      const start = startOf(ev.DTSTART ?? "");
      const rule = /BYDAY=([A-Z,0-9+-]+)/i.exec(ev.RRULE ?? "")?.[1];
      let days = 0;
      if (rule) for (const d of rule.split(",")) days |= BYDAY[d.replace(/[^A-Z]/gi, "").toUpperCase()] ?? 0;
      else if (start.weekday !== null && start.weekday >= 1 && start.weekday <= 5) days = 1 << (start.weekday - 1);
      if (course && location && days) {
        const key = `${course.toUpperCase()}|${location.toUpperCase()}`;
        const prev = byCourse.get(key);
        byCourse.set(key, prev ? { ...prev, days: prev.days | days } : { course, location, days, time: start.time });
      }
      ev = null;
    } else if (ev) {
      const m = /^([A-Z-]+)(?:;[^:]*)?:(.*)$/i.exec(line);
      if (m && !(m[1].toUpperCase() in ev)) ev[m[1].toUpperCase()] = m[2];
    }
  }
  return [...byCourse.values()];
}

// ---- Matching a LOCATION to a building

export interface Matchable {
  id: string;
  name: string;
  short: string;
  codes: string[];
  aliases: string[];
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** The building part of a location: room numbers and "Room"/"Rm" dropped ("WILLARD 062" -> "WILLARD"). */
export function buildingText(location: string): string {
  return location
    .split(/[\s,]+/)
    .filter((t) => t && !/\d/.test(t) && !/^(room|rm|#)$/i.test(t.replace(/\.$/, "")))
    .join(" ");
}

/**
 * The building a schedule location names. `sure` when the text is a code, name, short
 * name or alias exactly; otherwise the closest name sharing its words, for "Did you mean …?".
 * Null when nothing shares a word, so the row opens search instead.
 */
export function matchBuilding<P extends Matchable>(location: string, places: P[]): { place: P; sure: boolean } | null {
  const text = norm(buildingText(location));
  if (!text) return null;
  const names = (p: P) => [p.name, p.short, ...p.codes, ...p.aliases];
  const exact = places.find((p) => names(p).some((n) => norm(n) === text));
  if (exact) return { place: exact, sure: true };
  const words = text.split(" ").filter((w) => w.length > 2);
  if (!words.length) return null;
  // Every word of the location inside one of the place's names; the shortest such name wins.
  let best: { place: P; len: number } | null = null;
  for (const p of places) {
    for (const n of names(p)) {
      const nw = norm(n).split(" ");
      if (words.every((w) => nw.some((x) => x.startsWith(w))) && (!best || n.length < best.len)) best = { place: p, len: n.length };
    }
  }
  return best ? { place: best.place, sure: false } : null;
}
