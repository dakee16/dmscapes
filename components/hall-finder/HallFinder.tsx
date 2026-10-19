"use client";

// The Hall Finder (design Main / FinderPhone / Gate / Results*): add the buildings you have
// classes in (search, quick adds, a dropped pin, or an .ics schedule), pick days, then rank
// the school's halls by weekly walk. The draft lives in lib/hall-finder-store and is mirrored
// to ?s= so it survives sign-in; ranking and routes come from the tiered API routes.
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CloseIcon, SearchIcon } from "@/components/ds/Icons";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { track } from "@/lib/analytics";
import { parseIcs, type IcsClass } from "@/lib/ics";
import {
  ALL_WEEK,
  DAYS,
  decodeDraft,
  decodePolyline,
  encodeDraft,
  setResume,
  type Campus,
  type CampusPlace,
  type DraftPlace,
  type Filters,
  type HallFacts,
  type PlaceKind,
  type RankResult,
} from "@/lib/hall-finder";
import { EMPTY_DRAFT, useHallFinder } from "@/lib/hall-finder-store";
import type { MapHall, MapPlace, MapRoute } from "./FinderMap";
import ConfirmIcs from "./ConfirmIcs";
import { LAST_SCHOOL_KEY } from "./LastSchool";
import Results, { type ShownPlace } from "./Results";
import { searchPlaces } from "./search";
import { hallFinderHeaders, type SavedSetup } from "./api";
import styles from "./HallFinder.module.css";

const FinderMap = dynamic(() => import("./FinderMap"), { ssr: false, loading: () => <div className={styles.mapCanvas} aria-hidden="true" /> });

const KIND_LABEL: Record<PlaceKind, string> = { academic: "Building", dining: "Dining", gym: "Gym", library: "Library" };
const QUICK: PlaceKind[] = ["library", "gym", "dining"];
const MAX_ICS_BYTES = 1_000_000;

interface Props {
  campus: Campus;
  facts: Record<string, HallFacts>;
  schoolName: string;
}

export default function HallFinder({ campus, facts, schoolName }: Props) {
  const collegeId = campus.collegeId;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { user, profile, loading: authLoading, openAuthModal } = useAuth();
  const { openUpgrade } = useUpgrade();
  const act = useHallFinder.getState;

  // The stored draft only after mount: the page is static, and the URL wins over storage.
  const [ready, setReady] = useState(false);
  const stored = useHallFinder((s) => s.drafts[collegeId]);
  const draft = ready ? (stored ?? EMPTY_DRAFT) : EMPTY_DRAFT;
  const view = params.get("view") === "results" ? "results" : "input";
  const signedIn = Boolean(user);

  useEffect(() => {
    const fromUrl = decodeDraft(params.get("s"));
    if (fromUrl) act().setDraft(collegeId, fromUrl);
    setReady(true);
    try {
      localStorage.setItem(LAST_SCHOOL_KEY, collegeId);
      const key = `dormscape-hf-started-${collegeId}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        track("hall_finder_started", { college: collegeId });
      }
    } catch {}
    // Once, on landing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror the draft into ?s= (router.replace, no scroll) so a reload, a share or the sign-in
  // round trip carries it.
  const encoded = useMemo(() => (draft.places.length || draft.ics ? encodeDraft(draft) : ""), [draft]);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(window.location.search);
      if (encoded) next.set("s", encoded);
      else next.delete("s");
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (url !== window.location.pathname + window.location.search) router.replace(url, { scroll: false });
    }, 250);
    return () => clearTimeout(t);
  }, [ready, encoded, pathname, router]);

  const urlFor = (v: "input" | "results") => {
    const next = new URLSearchParams(window.location.search);
    if (v === "results") next.set("view", "results");
    else next.delete("view");
    if (encoded) next.set("s", encoded);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const placeById = useMemo(() => new Map(campus.places.map((p) => [p.id, p])), [campus.places]);
  const hallById = useMemo(() => new Map(campus.halls.map((h) => [h.dormId, h])), [campus.halls]);
  const hasYears = campus.halls.some((h) => h.year !== null);
  const kindsPresent = useMemo(() => new Set(campus.places.map((p) => p.kind)), [campus.places]);

  // ---- Places in the draft, as shown and as sent
  const resolve = (p: DraftPlace): { name: string; kind: PlaceKind | null; place: CampusPlace | null; lng: number; lat: number } | null => {
    if (p.placeId) {
      const place = placeById.get(p.placeId);
      return place ? { name: place.name, kind: place.kind, place, lng: place.lng, lat: place.lat } : null;
    }
    return p.pin ? { name: "Dropped pin", kind: null, place: null, lng: p.pin[0], lat: p.pin[1] } : null;
  };
  const rows = draft.places.map((p, i) => ({ p, i, r: resolve(p) })).filter((x) => x.r);
  const counted = rows.filter((x) => x.p.days > 0);
  const shownPlaces: ShownPlace[] = counted.map((x, n) => ({ n: n + 1, name: x.r!.name, kind: x.r!.kind }));
  const apiPlaces = counted.map((x) => (x.p.placeId ? { placeId: x.p.placeId, days: x.p.days } : { pin: x.p.pin, days: x.p.days }));
  const apiKey = JSON.stringify([apiPlaces, draft.filters]);

  // ---- Search combobox
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<PlaceKind | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const options = useMemo(() => (open ? searchPlaces(campus.places, query, kind ?? undefined).slice(0, 8) : []), [open, campus.places, query, kind]);
  const [focusDays, setFocusDays] = useState<number | null>(null);

  function addPlace(place: CampusPlace) {
    const quick = kind !== null;
    const already = draft.places.findIndex((p) => p.placeId === place.id);
    act().addPlaces(collegeId, [{ placeId: place.id, days: quick ? ALL_WEEK : 0, source: quick ? "quick" : "manual" }]);
    track("finder_place_added", { source: quick ? "quick" : "manual", kind: place.kind });
    setQuery("");
    setKind(null);
    setOpen(false);
    setActive(0);
    if (!quick) setFocusDays(already >= 0 ? already : draft.places.length);
  }
  useEffect(() => {
    if (focusDays === null) return;
    document.getElementById(`hf-day-${focusDays}-0`)?.focus();
    setFocusDays(null);
  }, [focusDays, draft.places.length]);

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

  // ---- Drop a pin
  const [picking, setPicking] = useState(false);
  function onPick(pin: [number, number]) {
    act().addPlaces(collegeId, [{ pin, days: 0, source: "pin" }]);
    track("finder_place_added", { source: "pin" });
    setPicking(false);
    setFocusDays(draft.places.length);
  }

  // ---- .ics upload (read in the browser; nothing is uploaded)
  const fileRef = useRef<HTMLInputElement>(null);
  const [icsError, setIcsError] = useState("");
  const [confirm, setConfirm] = useState<{ name: string; classes: IcsClass[] } | null>(null);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIcsError("");
    const fail = (why: string) => {
      track("schedule_parse_failed", { reason: why });
      setIcsError(why === "size" ? "That file is too large for a class schedule." : "We couldn't find any classes in that file. Use the .ics calendar export from your school's schedule.");
    };
    if (file.size > MAX_ICS_BYTES) return fail("size");
    const classes = parseIcs(await file.text().catch(() => ""));
    if (!classes.length) return fail("empty");
    track("schedule_uploaded", { college: collegeId, classes: classes.length, kind: "ics" });
    setConfirm({ name: file.name, classes });
  }

  // ---- Ranking (live, debounced) and routes
  const [result, setResult] = useState<RankResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [routes, setRoutes] = useState<MapRoute[]>([]);
  const paywallSeen = useRef(false);

  const headers = () => hallFinderHeaders(profile);

  useEffect(() => {
    if (view !== "results" || !signedIn || !apiPlaces.length) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/hall-finder/rank", { method: "POST", headers: await headers(), body: JSON.stringify({ collegeId, places: apiPlaces, filters: draft.filters }), signal: ctrl.signal });
        const json = (await res.json()) as RankResult & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Ranking failed.");
        setResult(json);
        if (json.tier === "free" && !paywallSeen.current && json.count > 1) {
          paywallSeen.current = true;
          track("finder_paywall_viewed", { college: collegeId, halls: json.count });
        }
      } catch (err) {
        if (!ctrl.signal.aborted) setError(err instanceof Error ? err.message : "Ranking failed.");
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // apiKey stands for the places and filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, signedIn, apiKey, collegeId]);

  const top = result?.tier === "free" ? result.top : result?.tier === "paid" ? result.ranked[0] ?? null : null;
  const focusId = result?.tier === "paid" ? (selected && result.ranked.some((r) => r.dormId === selected) ? selected : top?.dormId ?? null) : top?.dormId ?? null;
  const focusRanked = result?.tier === "paid" ? result.ranked.find((r) => r.dormId === focusId) : top;
  // A free account sees one route: to its farthest place.
  const routeShown = result?.tier === "free" && top ? top.perPlace.reduce((best, p, i, all) => (p.minutes > all[best].minutes ? i : best), 0) : null;

  useEffect(() => {
    if (view !== "results" || !focusId || !focusRanked) {
      setRoutes([]);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/hall-finder/path", { method: "POST", headers: await headers(), body: JSON.stringify({ collegeId, dormId: focusId, places: apiPlaces, filters: draft.filters }), signal: ctrl.signal });
        if (!res.ok) return setRoutes([]);
        const { paths } = (await res.json()) as { paths: (string | null)[] };
        const all = paths.map((line, i) => (line ? { line: decodePolyline(line), minutes: focusRanked.perPlace[i]?.minutes ?? 0 } : null));
        setRoutes((routeShown !== null ? [all[routeShown]] : all).filter(Boolean) as MapRoute[]);
      } catch {
        if (!ctrl.signal.aborted) setRoutes([]);
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, focusId, result]);

  // ---- Saved setups (Plus and Pro): autosave this draft into one setup, share it by link.
  const setupId = useHallFinder((s) => s.setupIds[collegeId]);
  const [saving, setSaving] = useState<"probe" | "on" | "off">("probe");
  const [saved, setSaved] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");
  const paid = result?.tier === "paid";
  const setupPlaces = counted.map((x) => ({ ...(x.p.placeId ? { placeId: x.p.placeId } : { pin: x.p.pin }), days: x.p.days, ...(x.p.label ? { label: x.p.label } : {}) }));
  useEffect(() => {
    const fromRooms = params.get("setup");
    if (fromRooms && /^[0-9a-f-]{36}$/.test(fromRooms)) act().setSetupId(collegeId, fromRooms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!paid || saving !== "probe") return;
    (async () => {
      const res = await fetch(`/api/hall-finder/setups?collegeId=${collegeId}`, { headers: await headers() }).catch(() => null);
      // Until the table exists (or for any account that can't save), Save and Share stay hidden.
      setSaving(res?.ok ? "on" : "off");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, saving]);
  useEffect(() => {
    if (!paid || saving !== "on" || !setupPlaces.length) return;
    const t = setTimeout(async () => {
      const body = { collegeId, places: setupPlaces, filters: draft.filters };
      const res = setupId
        ? await fetch("/api/hall-finder/setups", { method: "PATCH", headers: await headers(), body: JSON.stringify({ id: setupId, ...body }) })
        : await fetch("/api/hall-finder/setups", { method: "POST", headers: await headers(), body: JSON.stringify({ ...body, name: `${schoolName} classes` }) });
      if (res.status === 404 && setupId) return act().setSetupId(collegeId, null); // deleted elsewhere: the next change saves anew
      const json = (await res.json().catch(() => null)) as { setup?: SavedSetup } | null;
      if (res.ok && json?.setup) {
        act().setSetupId(collegeId, json.setup.id);
        setSaved(true);
      }
    }, 1500);
    return () => clearTimeout(t);
    // apiKey stands for the places and filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, saving, apiKey, setupId]);
  async function share() {
    if (!setupId) return;
    const res = await fetch("/api/hall-finder/setups", { method: "PATCH", headers: await headers(), body: JSON.stringify({ id: setupId, share: true }) });
    const json = (await res.json().catch(() => null)) as { setup?: SavedSetup } | null;
    if (!res.ok || !json?.setup?.shareToken) return setShareLabel("Couldn't share");
    const url = `${window.location.origin}/hall-finder/s/${json.setup.shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareLabel("Link copied");
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  function rankMyHalls() {
    if (!signedIn) {
      // Keep everything through sign-in: the return URL carries the draft and lands on results,
      // and the resume marker brings an email-verification tab back here too.
      const url = urlFor("results");
      window.history.replaceState(null, "", url);
      setResume(url);
      track("finder_signin_gate", { college: collegeId, places: apiPlaces.length });
      openAuthModal("hall-finder");
      return;
    }
    router.push(urlFor("results"), { scroll: true });
  }

  function selectHall(dormId: string) {
    if (result?.tier !== "paid") return;
    setSelected(dormId);
    track("finder_hall_selected", { college: collegeId, dorm: dormId, rank: result.ranked.findIndex((r) => r.dormId === dormId) + 1 });
  }

  // ---- Map layers
  const mapPlaces: MapPlace[] = counted.map((x, n) => ({ n: n + 1, lng: x.r!.lng, lat: x.r!.lat, label: x.r!.place?.short ?? "Pin" }));
  const mapHalls: MapHall[] = useMemo(() => {
    const pinned = campus.halls.filter((h) => h.lng !== null && h.lat !== null);
    const base = (h: (typeof pinned)[number]) => ({ dormId: h.dormId, name: h.name, lng: h.lng!, lat: h.lat! });
    if (view !== "results" || !result || result.tier === "anon") return pinned.map((h) => ({ ...base(h), tone: "plain" as const }));
    if (result.tier === "free") return pinned.map((h) => ({ ...base(h), tone: h.dormId === result.top?.dormId ? ("top" as const) : ("locked" as const) }));
    const order = new Map(result.ranked.map((r, i) => [r.dormId, i]));
    const n = Math.max(result.ranked.length - 1, 1);
    return pinned.map((h) => {
      const i = order.get(h.dormId);
      if (h.dormId === focusId) return { ...base(h), tone: "top" as const };
      return i === undefined ? { ...base(h), tone: "locked" as const } : { ...base(h), tone: "rank" as const, t: i / n };
    });
  }, [view, result, focusId, campus.halls]);
  const focusHall = focusId ? hallById.get(focusId) : null;
  const focus =
    view === "results" && focusHall && focusHall.lng !== null && focusHall.lat !== null && result && result.tier !== "anon"
      ? { name: focusHall.name, rank: result.tier === "paid" ? result.ranked.findIndex((r) => r.dormId === focusId) + 1 : 1, lng: focusHall.lng, lat: focusHall.lat }
      : null;

  const filterChips: [keyof Filters, string][] = [...(hasYears ? [["firstYear", "First-year halls"] as [keyof Filters, string]] : []), ["ac", "Has AC"], ["singles", "Singles"], ["doubles", "Doubles"]];

  // ---- Render
  const inputHead = (
    <>
      <p className={styles.crumbs}>
        <Link href="/colleges">Colleges</Link> / <Link href={`/colleges/${collegeId}`}>{schoolName}</Link> / Hall Finder
      </p>
      <div className={styles.eyebrowRow}>
        <p className={styles.eyebrow}>{schoolName} · Hall Finder</p>
      </div>
      <h1 className={styles.title}>
        <span className={`${styles.titleBig} ds-riso`}>Find your hall</span>
        <span className={`${styles.titleSerif} ds-serif ds-serif--blue`}>by your classes.</span>
      </h1>
      <p className={styles.honest}>Most schools assign rooms. Use this to rank your housing preferences.</p>
    </>
  );

  const inputBody = (
    <>
      <div className={styles.upload}>
        <span className={styles.uploadIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
        </span>
        <span className={styles.uploadText}>
          <strong>Upload your schedule</strong>
          An .ics calendar file. We find your buildings and days.
        </span>
        <button type="button" className="ds-btn ds-btn--ink-yellow ds-btn--sm" onClick={() => fileRef.current?.click()}>
          Choose file
        </button>
        <input ref={fileRef} type="file" accept=".ics,text/calendar" hidden onChange={onFile} aria-label="Choose an .ics schedule file" />
      </div>
      {draft.ics && (
        <p className={styles.fileLine}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--ds-blue)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
          <span><strong>{draft.ics.name}</strong> · {draft.ics.count} {draft.ics.count === 1 ? "class" : "classes"} added</span>
          <button type="button" className={styles.linkBtn} onClick={() => fileRef.current?.click()}>Replace</button>
        </p>
      )}
      {icsError && <p className={styles.error} role="alert">{icsError}</p>}

      <div className={styles.or}>Or add buildings</div>
      <div className={styles.search}>
        <label htmlFor="hf-search" className="ds-sr">Search buildings by name or code</label>
        <div className={styles.searchBox}>
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
                {p.source === "ics" ? `${p.label ?? "Class"} · from schedule` : p.source === "pin" ? "Pin you dropped" : r!.kind && r!.kind !== "academic" ? `${KIND_LABEL[r!.kind]} · added by you` : "Added by you"}
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
                    onClick={() => act().toggleDay(collegeId, i, di)}
                  >
                    {d}
                  </button>
                ))}
              </span>
              <button type="button" className={styles.x} aria-label={`Remove ${r!.name}`} onClick={() => act().removePlace(collegeId, i)}>
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
        <button type="button" className={styles.chip} aria-pressed={picking} onClick={() => setPicking((v) => !v)}>
          {picking ? "Click the map…" : "Drop a pin"}
        </button>
      </div>

      <p className={styles.label} id="hf-only">Only show</p>
      <div className={styles.chips} role="group" aria-labelledby="hf-only" style={{ marginTop: 0 }}>
        {filterChips.map(([k, label]) => (
          <button key={k} type="button" className={styles.chip} aria-pressed={draft.filters[k]} onClick={() => act().setFilter(collegeId, k, !draft.filters[k])}>
            {label}
          </button>
        ))}
      </div>

      <div className={styles.go}>
        <button type="button" className={`ds-btn ds-btn--ink-yellow ${styles.goBtn}`} disabled={!apiPlaces.length} onClick={rankMyHalls}>
          Rank my halls <ArrowRight />
        </button>
        <p className={styles.goNote}>
          {signedIn ? "Walk times are estimates from walking paths, without buses." : "Free account to see results. Everything you entered is kept."}
        </p>
      </div>
    </>
  );

  let resultsBody: React.ReactNode;
  if (!ready || authLoading) resultsBody = <p className={styles.status} aria-busy="true">Loading your places…</p>;
  else if (!signedIn)
    resultsBody = (
      <>
        <div className={styles.eyebrowRow}><p className={styles.eyebrow}>{schoolName} · {apiPlaces.length} places</p></div>
        <h1 className={styles.title}>
          <span className={`${styles.titleBig} ds-riso`}>Your halls are ranked.</span>
          <span className={`${styles.titleSerif} ds-serif ds-serif--blue`}>Sign in to see them.</span>
        </h1>
        <div className={styles.actions}>
          <button type="button" className="ds-btn ds-btn--ink-yellow" onClick={rankMyHalls}>Continue <ArrowRight /></button>
          <button type="button" className={styles.linkBtn} onClick={() => router.push(urlFor("input"))}>Back to my places</button>
        </div>
      </>
    );
  else if (!apiPlaces.length)
    resultsBody = (
      <p className={styles.status}>
        Add a place with its days to rank your halls. <button type="button" className={styles.linkBtn} onClick={() => router.push(urlFor("input"))}>Add places</button>
      </p>
    );
  else if (error && !result) resultsBody = <p className={styles.error} role="alert">{error}</p>;
  else if (!result) resultsBody = <p className={styles.status} aria-busy="true">Ranking {campus.halls.length} halls…</p>;
  else
    resultsBody = (
      <div aria-busy={busy}>
        <Results
          collegeId={collegeId}
          schoolName={schoolName}
          result={result}
          halls={hallById}
          facts={facts}
          places={shownPlaces}
          filters={draft.filters}
          hasYears={hasYears}
          selected={focusId}
          routeShown={routeShown}
          onSelect={selectHall}
          onFilter={(k, on) => act().setFilter(collegeId, k, on)}
          onEdit={() => router.push(urlFor("input"))}
          onUpgrade={() => openUpgrade("hall-finder")}
          saveNote={paid && saving === "on" && saved ? "Saved to your account." : undefined}
          onShare={paid && saving === "on" && setupId ? share : undefined}
          shareLabel={shareLabel}
        />
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    );

  const legend =
    view !== "results" || !result || result.tier === "anon" ? (
      <>
        <span><i className={`${styles.sw} ${styles.swDot}`} />Your places</span>
        <span><i className={styles.sw} />Residence halls, ranked when you&apos;re done</span>
      </>
    ) : result.tier === "free" ? (
      <>
        <span><i className={`${styles.sw} ${styles.swTop}`} />Your #1 hall</span>
        <span><i className={`${styles.sw} ${styles.swDot}`} />Your places</span>
        <span><i className={`${styles.sw} ${styles.swLocked}`} />Ranked with Plus</span>
      </>
    ) : (
      <>
        <span>Shorter week <i className={`${styles.sw} ${styles.swRamp}`} /> Longer</span>
        <span><i className={`${styles.sw} ${styles.swRoute}`} />Walking route</span>
      </>
    );

  return (
    <div className={styles.layout} data-view={view}>
      <div className={styles.head}>{view === "input" ? inputHead : null}</div>
      <section className={styles.body} aria-label={view === "input" ? "Your places" : "Your results"}>
        {view === "input" ? inputBody : resultsBody}
      </section>
      <div className={styles.mapWrap}>
        <FinderMap bounds={campus.bounds} places={mapPlaces} halls={mapHalls} routes={routes} focus={focus} picking={picking} onPick={onPick} onHallClick={result?.tier === "paid" ? selectHall : undefined} />
        {view === "input" && (
          <div className={styles.mapChip} aria-hidden="true">
            <span>{schoolName}</span>
            {counted.length > 0 && <span>{counted.length} {counted.length === 1 ? "place" : "places"}</span>}
          </div>
        )}
        <div className={styles.legend} aria-hidden="true">{legend}</div>
      </div>
      {confirm && (
        <ConfirmIcs
          fileName={confirm.name}
          classes={confirm.classes}
          places={campus.places}
          onClose={() => setConfirm(null)}
          onReplace={() => {
            setConfirm(null);
            fileRef.current?.click();
          }}
          onAdd={(added) => {
            act().addPlaces(collegeId, added.map((a) => ({ placeId: a.placeId, days: a.days, label: a.label, source: "ics" as const })));
            act().setIcs(collegeId, { name: confirm.name, count: added.length });
            track("finder_place_added", { source: "ics", count: added.length });
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}
