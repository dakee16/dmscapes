// SERVER-ONLY. Reads classes from a schedule screenshot or PDF with one Claude call
// (Hall Finder phase 1b). The file lives in memory for the request and is never stored or
// logged. No path aliases, so scripts/check-hall-finder-schedules.mjs imports it too.
import Anthropic from "@anthropic-ai/sdk";
import { inflateSync } from "node:zlib";
import { MEDIA_TYPE, READ_DAYS, weekdayMask, type ReadClass, type ScheduleKind } from "./schedule-file.ts";

export const DEFAULT_MODEL = "claude-haiku-5-5";

/**
 * Pages in a PDF: page objects counted in the plain text and inside compressed object
 * streams (where most newer writers put them). Null when none are found, so the caller
 * can refuse a file it can't size up.
 */
export function pdfPages(bytes: Uint8Array): number | null {
  const buf = Buffer.from(bytes);
  const text = buf.toString("latin1");
  const PAGE = /\/Type\s*\/Page(?![a-zA-Z])/g;
  const count = (s: string) => (s.match(PAGE) ?? []).length;
  let pages = count(text);
  const OBJSTM = /\/Type\s*\/ObjStm[\s\S]*?stream\r?\n/g;
  for (let m; (m = OBJSTM.exec(text)); ) {
    const start = m.index + m[0].length;
    const end = text.indexOf("endstream", start);
    if (end < 0) break;
    try {
      pages += count(inflateSync(buf.subarray(start, end)).toString("latin1"));
    } catch {
      // Not Flate, or damaged: nothing to count in it.
    }
  }
  return pages || null;
}

const SYSTEM = `You read class schedules for students choosing where to live on campus.
Report every class meeting shown in the image or document with the report_schedule tool.

Rules:
- Read only what is on the schedule. Never guess or fill in anything that isn't written.
- location_text is the building and room exactly as written ("WILLARD 062", "Thomas Bldg 102"). If a class shows no location, or says online, TBA or remote, use an empty string. Never guess a building.
- days uses M, T, W, Th, F, Sa, Su. Combine sections of one course that meet in the same place.
- start and end are times as written ("9:05 AM"), or an empty string when not shown.
- confidence is 0 to 1: how clearly you could read this row. Use a low value for blurry, cut-off or ambiguous text.
- If the file is not a class schedule, report an empty classes list.`;

const TOOL: Anthropic.Tool = {
  name: "report_schedule",
  description: "Report the classes read from a student's class schedule.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["classes"],
    properties: {
      classes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["course", "days", "start", "end", "location_text", "confidence"],
          properties: {
            course: { type: "string", description: "Course code or title, e.g. ECON 102" },
            days: { type: "array", items: { type: "string", enum: [...READ_DAYS] } },
            start: { type: "string" },
            end: { type: "string" },
            location_text: { type: "string", description: "Building and room exactly as written; empty if none" },
            confidence: { type: "number", description: "0 to 1" },
          },
        },
      },
    },
  },
};

/** The tool's answer, trimmed and bounded; rows with no weekday or no location dropped. */
export function cleanClasses(input: unknown): ReadClass[] {
  const raw = (input as { classes?: unknown })?.classes;
  if (!Array.isArray(raw)) return [];
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const out: ReadClass[] = [];
  for (const r of raw.slice(0, 30) as Record<string, unknown>[]) {
    const days = weekdayMask(Array.isArray(r?.days) ? r.days.filter((d): d is string => typeof d === "string") : []);
    const location = text(r?.location_text, 80);
    const course = text(r?.course, 60);
    if (!course || !location || !days) continue;
    const c = Number(r?.confidence);
    out.push({ course, days, location, start: text(r?.start, 12) || null, end: text(r?.end, 12) || null, confidence: Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0 });
  }
  return out;
}

export type ReadResult =
  | { ok: true; classes: ReadClass[]; usage: { input: number; output: number } }
  | { ok: false; reason: "not_schedule" | "unreadable" | "busy" };

/**
 * One Messages call: the file as an image or document block, a forced report_schedule
 * call (Claude Haiku 5.5 accepts forced tool use; Claude Opus 5.5 and Sonnet 5.5 don't,
 * so HALL_FINDER_MODEL must name a model that does). No temperature: current models
 * reject non-default sampling, and the forced strict tool keeps the output to the schema.
 */
export async function readSchedule(client: Anthropic, model: string, kind: ScheduleKind, bytes: Uint8Array): Promise<ReadResult> {
  const data = Buffer.from(bytes).toString("base64");
  const file: Anthropic.ContentBlockParam =
    kind === "pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: MEDIA_TYPE[kind] as "image/png" | "image/jpeg", data } };
  try {
    const res = await client.messages.create(
      {
        model,
        max_tokens: 2048,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        messages: [{ role: "user", content: [file, { type: "text", text: "Read this schedule." }] }],
      },
      { timeout: 30_000, maxRetries: 0 },
    );
    if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return { ok: false, reason: "unreadable" };
    const call = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === TOOL.name);
    const classes = cleanClasses(call?.input);
    if (!classes.length) return { ok: false, reason: "not_schedule" };
    return { ok: true, classes, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens } };
  } catch (err) {
    // Most specific first. 400s are files the API can't open; 429/5xx/timeouts mean try later.
    if (err instanceof Anthropic.BadRequestError) return { ok: false, reason: "unreadable" };
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.APIConnectionError || err instanceof Anthropic.InternalServerError) return { ok: false, reason: "busy" };
    throw err;
  }
}
