"use client";

// The Hall Finder (design Main / FinderPhone / Gate / Results*): add the buildings you have
// classes in (search, quick adds, a dropped pin, or an .ics schedule), pick days, then rank
// the school's halls by weekly walk. The draft lives in lib/hall-finder-store and is mirrored
// to ?s= so it survives sign-in; ranking and routes come from the tiered API routes.
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "@/components/ds/Icons";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { track } from "@/lib/analytics";
import {
  decodeDraft,
  decodePolyline,
  encodeDraft,
  setResume,
  type Campus,
  type Filters,
  type HallFacts,
  type RankResult,
} from "@/lib/hall-finder";
import { EMPTY_DRAFT, useHallFinder } from "@/lib/hall-finder-store";
import type { MapHall, MapPlace, MapRoute } from "./FinderMap";
import Gate from "./Gate";
import { ChevronLeft } from "@/components/plan-steps/icons";
import { LAST_SCHOOL_KEY } from "./LastSchool";
import Results, { type ShownPlace } from "./Results";
import PlacesEditor, { focusDays, placeAt } from "./PlacesEditor";
import { hallFinderHeaders, type SavedSetup } from "./api";
import styles from "./HallFinder.module.css";

const FinderMap = dynamic(() => import("./FinderMap"), { ssr: false, loading: () => <div className={styles.mapCanvas} aria-hidden="true" /> });

interface Props {
  campus: Campus;
  facts: Record<string, HallFacts>;
  schoolName: string;
  /** Screenshots and PDFs can be read (the server has an Anthropic key). */
  imagesOn?: boolean;
}

export default function HallFinder({ campus, facts, schoolName, imagesOn = false }: Props) {
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

  // Switching views swaps the panel, so move focus to its heading (once it renders: results
  // wait on the ranking) for keyboard and screen-reader users.
  const layoutRef = useRef<HTMLDivElement>(null);
  const shownView = useRef(view);
  const focusHeading = useRef(false);
  useEffect(() => {
    if (shownView.current !== view) [shownView.current, focusHeading.current] = [view, true];
    const h1 = focusHeading.current ? layoutRef.current?.querySelector<HTMLElement>("h1") : null;
    if (!h1) return;
    focusHeading.current = false;
    h1.tabIndex = -1;
    h1.focus({ preventScroll: true });
  });

  // Phone results trade the site nav for the finder's own bar (designs 08 and 09).
  useEffect(() => {
    document.documentElement.dataset.hfView = view;
    return () => {
      delete document.documentElement.dataset.hfView;
    };
  }, [view]);

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
  // From a hall page's "Got your class schedule?" card: that hall, preselected for comparison.
  const compareHall = hallById.get(params.get("compare") ?? "") ?? null;
  const hasYears = campus.halls.some((h) => h.year !== null);

  // ---- Places in the draft, as shown and as sent
  const rows = draft.places.map((p, i) => ({ p, i, r: placeAt(placeById, p) })).filter((x) => x.r);
  const counted = rows.filter((x) => x.p.days > 0);
  const shownPlaces: ShownPlace[] = counted.map((x, n) => ({ n: n + 1, name: x.r!.name, kind: x.r!.kind }));
  const apiPlaces = counted.map((x) => (x.p.placeId ? { placeId: x.p.placeId, days: x.p.days } : { pin: x.p.pin, days: x.p.days }));
  const apiKey = JSON.stringify([apiPlaces, draft.filters]);

  // ---- Full map (phones, design 06): the map takes the screen until Done or Escape.
  const [fullMap, setFullMap] = useState(false);
  useEffect(() => {
    if (!fullMap) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullMap(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [fullMap]);
  useEffect(() => setFullMap(false), [view]);

  // ---- Drop a pin
  const [picking, setPicking] = useState(false);
  function onPick(pin: [number, number]) {
    act().addPlaces(collegeId, [{ pin, days: 0, source: "pin" }]);
    track("finder_place_added", { source: "pin" });
    setPicking(false);
    focusDays(draft.places.length);
  }

  // ---- A screenshot or PDF needs an account; the draft rides through sign-in.
  const [uploadGate, setUploadGate] = useState(false);
  function uploadNeedsSignIn() {
    setResume(window.location.pathname + window.location.search);
    track("finder_signin_gate", { college: collegeId, places: apiPlaces.length, from: "upload" });
    setUploadGate(true);
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
      // Keep everything through sign-in: the results URL carries the draft (Google returns to
      // it, email's login page sends you back to it), and the resume marker brings an
      // email-verification tab back here too. The gate opens over the blurred results.
      const url = urlFor("results");
      setResume(url);
      track("finder_signin_gate", { college: collegeId, places: apiPlaces.length });
      router.push(url, { scroll: false });
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
    if (view !== "results") return pinned.map((h) => ({ ...base(h), tone: "plain" as const }));
    if (!result || result.tier === "anon") return pinned.map((h) => ({ ...base(h), tone: signedIn ? ("plain" as const) : ("locked" as const) }));
    if (result.tier === "free") return pinned.map((h) => ({ ...base(h), tone: h.dormId === result.top?.dormId ? ("top" as const) : ("locked" as const) }));
    const order = new Map(result.ranked.map((r, i) => [r.dormId, i]));
    const n = Math.max(result.ranked.length - 1, 1);
    return pinned.map((h) => {
      const i = order.get(h.dormId);
      if (h.dormId === focusId) return { ...base(h), tone: "top" as const };
      return i === undefined ? { ...base(h), tone: "locked" as const } : { ...base(h), tone: "rank" as const, t: i / n };
    });
  }, [view, result, focusId, campus.halls, signedIn]);
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
      {compareHall && <p className={styles.compareNote}>Add your classes and we&apos;ll show how {compareHall.name} compares.</p>}
    </>
  );

  const inputBody = (
    <>
      <PlacesEditor
        campus={campus}
        places={draft.places}
        ics={draft.ics}
        imagesOn={imagesOn}
        signedIn={signedIn}
        headers={headers}
        onAdd={(places) => act().addPlaces(collegeId, places)}
        onIcs={(ics) => act().setIcs(collegeId, ics)}
        onToggleDay={(i, bit) => act().toggleDay(collegeId, i, bit)}
        onRemove={(i) => act().removePlace(collegeId, i)}
        picking={picking}
        onPicking={setPicking}
        onNeedSignIn={uploadNeedsSignIn}
      />

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
      <div aria-hidden="true">
        <div className={styles.eyebrowRow}><p className={styles.eyebrow}>{schoolName} · {campus.halls.length} halls · {apiPlaces.length} places</p></div>
        <p className={styles.title}>
          <span className={styles.titleBig}>Your halls,</span>
          <span className={`${styles.titleSerif} ds-serif ds-serif--blue`}>ranked by walking.</span>
        </p>
        <div className={styles.skeleton}>
          {[60, 52, 58, 46, 56, 50].map((w, i) => (
            <div key={i}>
              <i />
              <span><b style={{ width: `${w}%` }} /><b style={{ width: `${48 + i * 2}%`, opacity: 1 - i * 0.12 }} /></span>
              <em />
            </div>
          ))}
        </div>
      </div>
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
          preselect={compareHall?.dormId ?? null}
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
    <div ref={layoutRef} className={styles.layout} data-view={view} data-tier={view === "results" && result ? result.tier : undefined}>
      {view === "results" && signedIn && (
        <div className={styles.phoneBar}>
          <button type="button" className={styles.barBack} aria-label="Back to my places" onClick={() => router.push(urlFor("input"))}>
            <ChevronLeft size={22} />
          </button>
          <span className={styles.barTitle}>
            <strong>Hall Finder</strong>
            <span>{schoolName} · {counted.length} {counted.length === 1 ? "place" : "places"}</span>
          </span>
          {paid ? (
            saving === "on" && setupId && <button type="button" className={styles.barShare} onClick={share} aria-live="polite">{shareLabel}</button>
          ) : (
            <button type="button" className={styles.barEdit} onClick={() => router.push(urlFor("input"))}>Edit</button>
          )}
        </div>
      )}
      <div className={styles.head}>{view === "input" ? inputHead : null}</div>
      <section className={styles.body} aria-label={view === "input" ? "Your places" : "Your results"}>
        {view === "input" ? inputBody : resultsBody}
      </section>
      <div className={styles.mapWrap} data-full={fullMap || undefined}>
        <FinderMap bounds={campus.bounds} places={mapPlaces} halls={mapHalls} routes={routes} focus={focus} picking={picking} onPick={onPick} onHallClick={result?.tier === "paid" ? selectHall : undefined} />
        {view === "input" && (
          <div className={styles.mapChip} aria-hidden="true">
            <span className={styles.wideOnly}>{schoolName}</span>
            {counted.length > 0 && <span>{counted.length} {counted.length === 1 ? "place" : "places"}</span>}
          </div>
        )}
        {view === "input" && (
          <button type="button" className={styles.fullBtn} aria-pressed={fullMap} onClick={() => setFullMap((v) => !v)}>
            {fullMap ? "Done" : "Full map"}
          </button>
        )}
        <div className={styles.legend} aria-hidden="true">{legend}</div>
      </div>
      {view === "results" && ready && !authLoading && !signedIn && (
        <Gate places={counted.length} halls={campus.halls.length} onEmail={() => openAuthModal("hall-finder")} onBack={() => router.push(urlFor("input"))} />
      )}
      {uploadGate && !signedIn && (
        <Gate upload places={counted.length} halls={campus.halls.length} onEmail={() => openAuthModal("hall-finder")} onBack={() => setUploadGate(false)} />
      )}
    </div>
  );
}
