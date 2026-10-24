"use client";

// The finder's place editor (design Main / FinderPhone): upload a schedule (.ics read in the
// browser; a screenshot or PDF read on the server), search buildings, quick adds, a dropped
// pin, and the days for each place. The Hall Finder and a room's Halls section both use it;
// the caller owns the places and the map (a pin is dropped on the caller's map).
import { useMemo, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "@/components/ds/Icons";
import { track } from "@/lib/analytics";
import { parseIcs } from "@/lib/ics";
import { IMAGE_EDGE, MAX_BYTES, PDF_MAX_BYTES, SURE, sniff, type ReadClass, type ReadFailure } from "@/lib/schedule-file";
import { ALL_WEEK, DAYS, type Campus, type CampusPlace, type Draft, type DraftPlace, type PlaceKind } from "@/lib/hall-finder";
import ConfirmIcs, { type ConfirmClass } from "./ConfirmIcs";
import { searchPlaces } from "./search";
import styles from "./HallFinder.module.css";

export const KIND_LABEL: Record<PlaceKind, string> = { academic: "Building", dining: "Dining", gym: "Gym", library: "Library" };
const QUICK: PlaceKind[] = ["library", "gym", "dining"];
const MAX_ICS_BYTES = 1_000_000;

/** The friendly states for an upload that couldn't be read (plan.md, Schedule upload). */
const READ_FAILED: Record<ReadFailure, string> = {
  not_schedule: "That doesn't look like a class schedule. Try a screenshot of your weekly schedule, or add your classes below.",
  unreadable: "We couldn't read that one. Try a clearer screenshot or a PDF of your schedule, or add your classes below.",
  too_large: "That file is too large. Use a screenshot under 8 MB or a PDF under 4 MB.",
  wrong_type: "Upload an .ics calendar file, a PNG or JPEG screenshot, or a PDF.",
  too_many_pages: "That PDF is longer than 3 pages. Save just the page with your weekly schedule.",
  rate_limited: "You've read a few schedules already. Try again in an hour, or add your classes below.",
  unavailable: "We can't read schedules right now. Try again in a minute, or add your classes below.",
};

/** A screenshot scaled down in the browser to the size Claude reads at (and under Vercel's
 *  4.5 MB request cap). Throws when the browser can't decode it. */
async function shrinkImage(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, IMAGE_EDGE / Math.max(bmp.width, bmp.height));
  if (k === 1 && file.size <= 3_000_000) {
    bmp.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.9));
}

export interface Resolved { name: string; kind: PlaceKind | null; place: CampusPlace | null; lng: number; lat: number }

/** A place as shown and mapped; null when its building isn't on the campus map. */
export function placeAt(byId: Map<string, CampusPlace>, p: DraftPlace): Resolved | null {
  if (p.placeId) {
    const place = byId.get(p.placeId);
    return place ? { name: place.name, kind: place.kind, place, lng: place.lng, lat: place.lat } : null;
  }
  return p.pin ? { name: "Dropped pin", kind: null, place: null, lng: p.pin[0], lat: p.pin[1] } : null;
}

/** Focus a place's first day chip once it has rendered. */
export function focusDays(index: number) {
  requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(`hf-day-${index}-0`)?.focus()));
}

interface Props {
  campus: Campus;
  places: DraftPlace[];
  ics?: Draft["ics"];
  /** Screenshots and PDFs can be read (the server has an Anthropic key). */
  imagesOn: boolean;
  signedIn: boolean;
  headers: () => Promise<Record<string, string>>;
  onAdd: (places: DraftPlace[]) => void;
  onIcs: (ics: NonNullable<Draft["ics"]>) => void;
  onToggleDay: (index: number, bit: number) => void;
  onRemove: (index: number) => void;
  picking: boolean;
  onPicking: (on: boolean) => void;
  /** A screenshot or PDF needs an account: the finder opens its sign-in gate. */
  onNeedSignIn?: () => void;
  /** Added to this editor's analytics events (a room sends where: "room"). */
  event?: Record<string, string>;
}

export default function PlacesEditor({ campus, places, ics, imagesOn, signedIn, headers, onAdd, onIcs, onToggleDay, onRemove, picking, onPicking, onNeedSignIn, event }: Props) {
  const collegeId = campus.collegeId;
  const placeById = useMemo(() => new Map(campus.places.map((p) => [p.id, p])), [campus.places]);
  const kindsPresent = useMemo(() => new Set(campus.places.map((p) => p.kind)), [campus.places]);
  const rows = places.map((p, i) => ({ p, i, r: placeAt(placeById, p) })).filter((x) => x.r);

  // ---- Search combobox
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<PlaceKind | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const options = useMemo(() => (open ? searchPlaces(campus.places, query, kind ?? undefined).slice(0, 8) : []), [open, campus.places, query, kind]);

  function addPlace(place: CampusPlace) {
    const quick = kind !== null;
    const already = places.findIndex((p) => p.placeId === place.id);
    onAdd([{ placeId: place.id, days: quick ? ALL_WEEK : 0, source: quick ? "quick" : "manual" }]);
    track("finder_place_added", { source: quick ? "quick" : "manual", kind: place.kind, ...event });
    setQuery("");
    setKind(null);
    setOpen(false);
    setActive(0);
    if (!quick) focusDays(already >= 0 ? already : places.length);
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(options.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && options[active]) {
      e.preventDefault();
      addPlace(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setKind(null);
    }
  }

  // ---- Schedule upload: .ics is read in the browser; a screenshot or PDF goes to
  // /api/hall-finder/parse-schedule (signed in), and both land on the same confirm screen.
  const fileRef = useRef<HTMLInputElement>(null);
  const [icsError, setIcsError] = useState("");
  const [reading, setReading] = useState(false);
  const [confirm, setConfirm] = useState<{ name: string; classes: ConfirmClass[]; read: "browser" | "server" } | null>(null);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIcsError("");
    const kind = sniff(new Uint8Array(await file.slice(0, 8).arrayBuffer()));
    if (!kind) {
      const failIcs = (why: string) => {
        track("schedule_parse_failed", { reason: why, kind: "ics", ...event });
        setIcsError(why === "size" ? "That file is too large for a class schedule." : imagesOn && !/\.ics$/i.test(file.name) ? READ_FAILED.wrong_type : "We couldn't find any classes in that file. Use the .ics calendar export from your school's schedule.");
      };
      if (file.size > MAX_ICS_BYTES) return failIcs("size");
      const classes = parseIcs(await file.text().catch(() => ""));
      if (!classes.length) return failIcs("empty");
      track("schedule_uploaded", { college: collegeId, classes: classes.length, kind: "ics", ...event });
      setConfirm({ name: file.name, classes, read: "browser" });
      return;
    }
    const failRead = (why: ReadFailure) => {
      track("schedule_parse_failed", { reason: why, kind, ...event });
      setIcsError(READ_FAILED[why]);
    };
    if (!imagesOn) return failRead("wrong_type");
    if (file.size > (kind === "pdf" ? PDF_MAX_BYTES : MAX_BYTES)) return failRead("too_large");
    if (!signedIn) {
      // Each read is a paid call, so it needs an account.
      onNeedSignIn?.();
      return;
    }
    setReading(true);
    try {
      const body = new FormData();
      body.append("file", kind === "pdf" ? file : await shrinkImage(file), file.name);
      const h = await headers();
      delete h["Content-Type"]; // the browser sets the multipart boundary
      const res = await fetch("/api/hall-finder/parse-schedule", { method: "POST", headers: h, body });
      const json = (await res.json().catch(() => null)) as { classes?: ReadClass[]; error?: string } | null;
      if (!res.ok || !json?.classes) return failRead(res.status === 401 ? "unavailable" : ((json?.error as ReadFailure) in READ_FAILED ? (json!.error as ReadFailure) : "unavailable"));
      track("schedule_uploaded", { college: collegeId, classes: json.classes.length, kind, ...event });
      setConfirm({
        name: file.name,
        read: "server",
        classes: json.classes.map((c) => ({ course: c.course, location: c.location, days: c.days, time: c.start, unsure: c.confidence < SURE })),
      });
    } catch {
      failRead("unreadable");
    } finally {
      setReading(false);
    }
  }

  return (
    <>
      <div className={styles.upload}>
        <span className={styles.uploadIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
        </span>
        <span className={styles.uploadText} aria-live="polite">
          <strong>{reading ? "Reading your schedule…" : "Upload your schedule"}</strong>
          {reading ? (
            "This takes a few seconds. The file isn't stored."
          ) : imagesOn ? (
            <>
              <span className={styles.wideOnly}>.ics, screenshot or PDF. We find your buildings and days.</span>
              <span className={styles.phoneOnly}>.ics, screenshot or PDF</span>
            </>
          ) : (
            <>
              <span className={styles.wideOnly}>An .ics calendar file. We find your buildings and days.</span>
              <span className={styles.phoneOnly}>An .ics calendar file</span>
            </>
          )}
        </span>
        <button type="button" className="ds-btn ds-btn--ink-yellow ds-btn--sm" disabled={reading} aria-busy={reading} onClick={() => fileRef.current?.click()}>
          {reading ? "Reading…" : <>Choose<span className={styles.wideOnly}> file</span></>}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={imagesOn ? ".ics,text/calendar,.png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf" : ".ics,text/calendar"}
          hidden
          onChange={onFile}
          aria-label={imagesOn ? "Choose a schedule: .ics, screenshot or PDF" : "Choose an .ics schedule file"}
        />
      </div>
      {ics && (
        <p className={styles.fileLine}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--ds-blue)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
          <span><strong>{ics.name}</strong> · {ics.count} {ics.count === 1 ? "class" : "classes"} added</span>
          <button type="button" className={styles.linkBtn} onClick={() => fileRef.current?.click()}>Replace</button>
        </p>
      )}
      {icsError && <p className={styles.error} role="alert">{icsError}</p>}

      <div className={styles.or}>Or add buildings</div>
      <div className={styles.search}>
        <label htmlFor="hf-search" className="ds-sr">Search buildings by name or code</label>
        <div className={`${styles.searchBox} ds-searchbox`}>
          <SearchIcon />
          <input
            ref={inputRef}
            id="hf-search"
            role="combobox"
            aria-expanded={open && options.length > 0}
            aria-controls="hf-options"
            aria-autocomplete="list"
            aria-activedescendant={open && options[active] ? `hf-opt-${options[active].id}` : undefined}
            autoComplete="off"
            value={query}
            placeholder={kind ? `Pick a ${KIND_LABEL[kind].toLowerCase()}` : "Search buildings: name or code"}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onSearchKey}
          />
        </div>
        {open && (query.trim() || kind) && (
          <ul id="hf-options" role="listbox" className={styles.options} aria-label="Buildings">
            {options.length ? (
              options.map((p, i) => (
                <li
                  key={p.id}
                  id={`hf-opt-${p.id}`}
                  role="option"
                  aria-selected={i === active}
                  className={styles.option}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addPlace(p);
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  {p.name}
                  <small>{[p.codes[0], p.kind !== "academic" ? KIND_LABEL[p.kind] : null].filter(Boolean).join(" · ")}</small>
                </li>
              ))
            ) : (
              <li className={styles.noOption} role="presentation">No building by that name. Try its code, or drop a pin.</li>
            )}
          </ul>
        )}
      </div>

      {rows.length > 0 && (
        <ol className={styles.places} aria-label="Your places">
          {rows.map(({ p, i, r }, k) => (
            <li key={`${p.placeId ?? p.pin?.join(",")}-${i}`} className={styles.place}>
              <span className={styles.pin} aria-hidden="true">{k + 1}</span>
              <span className={styles.placeName}>
                <strong>{r!.name}</strong>
                {p.source === "ics" || p.source === "image" ? `${p.label ?? "Class"} · from schedule` : p.source === "pin" ? "Pin you dropped" : r!.kind && r!.kind !== "academic" ? `${KIND_LABEL[r!.kind]} · added by you` : "Added by you"}
                {p.days === 0 && <span className={styles.needDays}>Pick the days you go</span>}
              </span>
              <span className={styles.days} role="group" aria-label={`Days at ${r!.name}`}>
                {DAYS.map((d, di) => (
                  <button
                    key={d}
                    id={`hf-day-${i}-${di}`}
                    type="button"
                    className={styles.day}
                    aria-pressed={Boolean(p.days & (1 << di))}
                    onClick={() => onToggleDay(i, di)}
                  >
                    {d}
                  </button>
                ))}
              </span>
              <button type="button" className={styles.x} aria-label={`Remove ${r!.name}`} onClick={() => onRemove(i)}>
                <CloseIcon />
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className={styles.chips}>
        {QUICK.filter((k) => kindsPresent.has(k)).map((k) => (
          <button
            key={k}
            type="button"
            className={styles.chip}
            onClick={() => {
              setKind(k);
              setQuery("");
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            + {KIND_LABEL[k]}
          </button>
        ))}
        <button type="button" className={styles.chip} aria-pressed={picking} onClick={() => onPicking(!picking)}>
          {picking ? "Click the map…" : "Drop a pin"}
        </button>
      </div>

      {confirm && (
        <ConfirmIcs
          fileName={confirm.name}
          readOnServer={confirm.read === "server"}
          classes={confirm.classes}
          places={campus.places}
          onClose={() => setConfirm(null)}
          onReplace={() => {
            setConfirm(null);
            fileRef.current?.click();
          }}
          onAdd={(added) => {
            const source = confirm.read === "server" ? ("image" as const) : ("ics" as const);
            onAdd(added.map((a) => ({ placeId: a.placeId, days: a.days, label: a.label, source })));
            onIcs({ name: confirm.name, count: added.length });
            track("finder_place_added", { source, count: added.length, ...event });
            setConfirm(null);
          }}
        />
      )}
    </>
  );
}
