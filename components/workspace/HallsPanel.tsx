"use client";
// My Room's Halls view (Hall Finder roommate mode): each roommate adds the buildings they have
// classes in, and the school's halls are ranked for everyone, by the least walking together or
// by the fairest split. Your own places save as you go. Roommates see each other's buildings
// and days, never course names or where a pin was dropped (app/api/workspaces/[id]/halls).
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import { workspaceRequest, WorkspaceError } from "@/lib/workspace-client";
import type { WorkspaceDetail } from "@/lib/workspace";
import { DAYS, NO_FILTERS, decodePolyline, formatMinutes, type Draft, type DraftPlace, type Filters } from "@/lib/hall-finder";
import { mergePlaces } from "@/lib/hall-finder-store";
import { orderHalls, type RoomHalls, type RoommateMode, type RoomPlace } from "@/lib/roommate-halls";
import PlacesEditor, { focusDays } from "@/components/hall-finder/PlacesEditor";
import type { MapHall, MapPlace, MapRoute } from "@/components/hall-finder/FinderMap";
import { hallFinderHeaders } from "@/components/hall-finder/api";
import { factsLine } from "@/components/hall-finder/Results";
import hf from "@/components/hall-finder/HallFinder.module.css";
import { initial, personColor, personInk, personStyle } from "./people";
import s from "./Room.module.css";

const FinderMap = dynamic(() => import("@/components/hall-finder/FinderMap"), { ssr: false, loading: () => <div className={hf.mapCanvas} aria-hidden="true" /> });

const FILTER_KEYS = ["firstYear", "ac", "singles", "doubles"] as const;
const SHOW = 8;
const MODES: [RoommateMode, string, string][] = [
  ["together", "Least walking together", "The hall where your weeks add up to the least walking."],
  ["fair", "Fairest split", "The hall where whoever walks the most walks the least."],
];

const toDraft = (p: RoomPlace): DraftPlace => ({ ...p, source: p.pin ? "pin" : p.label ? "ics" : "manual" });
/** What's saved: places with at least one day. */
const toSaved = (places: DraftPlace[]) =>
  places.filter((p) => p.days > 0).map((p) => ({ ...(p.placeId ? { placeId: p.placeId } : { pin: p.pin }), days: p.days, ...(p.label ? { label: p.label } : {}) }));
const dayList = (mask: number) => DAYS.filter((_, d) => mask & (1 << d)).join(" ");
const names = (list: string[]) => (list.length < 3 ? list.join(" and ") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`);

export default function HallsPanel({ id, detail, userId, onUpgrade }: { id: string; detail: WorkspaceDetail; userId: string; onUpgrade: () => void }) {
  const { profile } = useAuth();
  const headers = () => hallFinderHeaders(profile);
  const members = detail.members;
  const isOwner = detail.role === "owner";
  const host = members.find((m) => m.role === "owner")?.display_name ?? "The host";

  const [start, setStart] = useState<RoomHalls["start"]>();
  const [data, setData] = useState<RoomHalls | null>(null);
  const [problem, setProblem] = useState<{ message: string; status: number } | null>(null);
  const [mine, setMine] = useState<DraftPlace[] | null>(null);
  const [ics, setIcs] = useState<Draft["ics"]>();
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [version, setVersion] = useState(0);
  const [mode, setMode] = useState<RoommateMode>("together");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [picking, setPicking] = useState(false);
  const savedKey = useRef("");

  const campus = start?.campus;
  const collegeId = campus?.collegeId ?? "";
  const placeById = useMemo(() => new Map(campus?.places.map((p) => [p.id, p]) ?? []), [campus]);
  const hallById = useMemo(() => new Map(campus?.halls.map((h) => [h.dormId, h]) ?? []), [campus]);
  const ordered = useMemo(() => (data ? orderHalls(data.halls, mode) : []), [data, mode]);
  const focusId = selected && ordered.some((h) => h.dormId === selected) ? selected : ordered[0]?.dormId ?? null;
  const filterKey = FILTER_KEYS.filter((k) => filters[k]).join(",");

  // First load: the campus, everyone's places, and your own to edit.
  useEffect(() => {
    let gone = false;
    (async () => {
      try {
        const body = await workspaceRequest<RoomHalls>(`/api/workspaces/${id}/halls?campus=1`);
        if (gone) return;
        const own = (body.people.find((p) => p.userId === body.me)?.places ?? []).map(toDraft);
        savedKey.current = JSON.stringify(toSaved(own));
        setStart(body.start);
        setData(body);
        setMine(own);
        track("room_halls_viewed", { college: body.start?.campus.collegeId, people: body.people.length, with_places: body.people.filter((p) => p.places.length).length });
      } catch (e) {
        if (!gone) setProblem({ message: (e as Error).message, status: e instanceof WorkspaceError ? e.status : 0 });
      }
    })();
    return () => {
      gone = true;
    };
  }, [id]);

  // Re-rank when the filters, the hall shown or anyone's places change.
  useEffect(() => {
    if (!start) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const q = new URLSearchParams({ filters: filterKey, ...(focusId ? { hall: focusId } : {}) });
      try {
        const body = await workspaceRequest<RoomHalls>(`/api/workspaces/${id}/halls?${q}`, { signal: ctrl.signal });
        setData(body);
      } catch (e) {
        if (!ctrl.signal.aborted) setProblem({ message: (e as Error).message, status: e instanceof WorkspaceError ? e.status : 0 });
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [id, start, filterKey, focusId, version]);

  // Your places save a moment after each change.
  useEffect(() => {
    if (!mine) return;
    const places = toSaved(mine);
    const key = JSON.stringify(places);
    if (key === savedKey.current) return;
    const t = setTimeout(async () => {
      setSaving("saving");
      try {
        await workspaceRequest(`/api/workspaces/${id}/halls`, { method: "PUT", body: JSON.stringify({ places }) });
        savedKey.current = key;
        setSaving("saved");
        setVersion((v) => v + 1);
      } catch {
        setSaving("error");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [id, mine]);

  function onPick(pin: [number, number]) {
    if (!mine) return;
    setMine(mergePlaces(mine, [{ pin, days: 0, source: "pin" }]));
    track("finder_place_added", { source: "pin", where: "room" });
    setPicking(false);
    focusDays(mine.length);
  }

  function pickHall(dormId: string) {
    setSelected(dormId);
    track("finder_hall_selected", { college: collegeId, dorm: dormId, rank: ordered.findIndex((h) => h.dormId === dormId) + 1, where: "room", mode });
  }

  if (problem && !data) {
    const upgrade = problem.status === 403;
    return (
      <div className={s.peopleWrap}><section className={s.hallsEmpty} aria-labelledby="halls-title">
        <h2 id="halls-title" className={s.pageTitleSm}>Halls <em>for everyone</em></h2>
        <p className={s.peopleLede}>{upgrade ? "Each of you adds the buildings you have classes in, and the school's halls are ranked by everyone's walk. It comes with the host's Pro plan." : problem.message}</p>
        {upgrade && (isOwner ? <button type="button" className={s.inkBtn} onClick={onUpgrade}>Unlock with Pro</button> : <p className={s.inviteNote}>Ask {host} about Pro to compare halls here.</p>)}
      </section></div>
    );
  }
  if (!data || !campus || !mine) return <div className={s.peopleWrap}><p className={s.hallsLoading} aria-busy="true">Loading the halls…</p></div>;

  const people = data.people;
  const counted = people.filter((p) => p.places.length > 0);
  const waiting = people.filter((p) => p.places.length === 0);
  const nameOf = (uid: string) => (uid === data.me ? "You" : people.find((p) => p.userId === uid)?.name ?? "Roommate");
  const colorOf = (uid: string) => personColor(uid, members);
  const shown = all ? ordered : ordered.slice(0, SHOW);
  const widest = Math.max(...ordered.map((h) => h.total), 1);
  const hasYears = campus.halls.some((h) => h.year !== null);
  const chips: [keyof Filters, string][] = [...(hasYears ? [["firstYear", "First-year halls"] as [keyof Filters, string]] : []), ["ac", "Has AC"], ["singles", "Singles"], ["doubles", "Doubles"]];

  // ---- Map: everyone's buildings in their colour (your pins too), routes from the hall shown.
  const mapPlaces: MapPlace[] = [];
  for (const person of people) {
    const color = colorOf(person.userId);
    const list = person.userId === data.me ? mine.filter((p) => p.days > 0) : person.places.map(toDraft);
    list.forEach((p, n) => {
      const at = p.placeId ? placeById.get(p.placeId) : null;
      const spot = at ? [at.lng, at.lat] : p.pin;
      if (spot) mapPlaces.push({ n: n + 1, lng: spot[0], lat: spot[1], label: at?.short ?? "Pin", color, ink: personInk(color) });
    });
  }
  const routes: MapRoute[] = Object.entries(data.routes ?? {}).flatMap(([uid, list]) =>
    list.filter((r) => r.line).map((r) => ({ line: decodePolyline(r.line!), minutes: r.minutes, color: colorOf(uid) })),
  );
  const rankOf = new Map(ordered.map((h, i) => [h.dormId, i]));
  const mapHalls: MapHall[] = campus.halls
    .filter((h) => h.lng !== null && h.lat !== null)
    .map((h) => {
      const base = { dormId: h.dormId, name: h.name, lng: h.lng!, lat: h.lat! };
      const i = rankOf.get(h.dormId);
      if (!ordered.length) return { ...base, tone: "plain" as const };
      if (h.dormId === focusId) return { ...base, tone: "top" as const };
      return i === undefined ? { ...base, tone: "locked" as const } : { ...base, tone: "rank" as const, t: i / Math.max(ordered.length - 1, 1) };
    });
  const focusHall = focusId ? hallById.get(focusId) : null;
  const focus = focusHall && focusHall.lng !== null && focusHall.lat !== null ? { name: focusHall.name, rank: (rankOf.get(focusHall.dormId) ?? 0) + 1, lng: focusHall.lng, lat: focusHall.lat } : null;

  return (
    <div className={s.peopleWrap}><section className={s.halls} aria-labelledby="halls-title">
      <div className={s.hallsMain}>
        <div className={s.peopleHead}>
          <h2 id="halls-title" className={s.pageTitleSm}>Halls <em>for everyone</em></h2>
          <span className={s.seatCount}>{campus.halls.length} halls · walking</span>
        </div>
        <p className={s.peopleLede}>Each of you adds the buildings you have classes in. Halls are ranked by everyone&apos;s walk to class, before you pick where to live.</p>

        <div className={s.hallsModes} role="group" aria-label="Rank halls by">
          {MODES.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={mode === key} onClick={() => { setMode(key); track("room_halls_mode", { mode: key, college: collegeId }); }}>{label}</button>
          ))}
        </div>
        <p className={s.hallsModeNote}>{MODES.find(([k]) => k === mode)![2]}</p>
        <div className={hf.chips} role="group" aria-label="Only show">
          {chips.map(([k, label]) => (
            <button key={k} type="button" className={hf.chip} aria-pressed={filters[k]} onClick={() => setFilters((f) => ({ ...f, [k]: !f[k] }))}>{label}</button>
          ))}
        </div>

        {!counted.length ? (
          <p className={s.hallsNote}>No places yet. Add the buildings you have classes in, and ask your roommates to add theirs.</p>
        ) : (
          <>
            <p className={s.hallsNote}>
              Ranked for {names(counted.map((p) => (p.userId === data.me ? "you" : p.name)))}.{waiting.length > 0 && ` Waiting on ${names(waiting.map((p) => (p.userId === data.me ? "you" : p.name)))} to add places.`}
            </p>
            <div className={s.hallsKey} aria-hidden="true">
              {counted.map((p) => <span key={p.userId} style={personStyle(p.userId, members)}><i />{nameOf(p.userId)}</span>)}
            </div>
            {ordered.length ? (
              <ol className={s.hallsList} aria-label={`Halls, ${mode === "fair" ? "fairest split" : "least walking together"} first`}>
                {shown.map((h, i) => {
                  const hall = hallById.get(h.dormId);
                  const facts = factsLine(start?.facts[h.dormId]);
                  const each = counted.map((p) => `${nameOf(p.userId)} ${formatMinutes(h.weekly[p.userId])}`).join(" · ");
                  return (
                    <li key={h.dormId} data-on={h.dormId === focusId || undefined}>
                      <button type="button" aria-pressed={h.dormId === focusId} onClick={() => pickHall(h.dormId)} aria-label={`${i + 1}. ${hall?.name ?? h.dormId}. ${formatMinutes(h.total)} together a week; the longest week is ${formatMinutes(h.longest)}. ${each}. Show routes on the map.`}>
                        <span className={hf.rank} aria-hidden="true">{i + 1}</span>
                        <span className={s.hallsName} aria-hidden="true">
                          <strong>{hall?.name ?? h.dormId}</strong>
                          {facts && <small>{facts}</small>}
                          <span className={s.hallsBar} style={{ width: `${(h.total / widest) * 100}%` }}>
                            {counted.map((p) => <i key={p.userId} style={{ flexGrow: h.weekly[p.userId] || 0.01, background: colorOf(p.userId) }} />)}
                          </span>
                          <small>{each}</small>
                        </span>
                        <span className={s.hallsMinutes} aria-hidden="true">
                          <strong>{formatMinutes(mode === "fair" ? h.longest : h.total)}</strong>
                          <small>{mode === "fair" ? "longest week" : "a week together"}</small>
                        </span>
                      </button>
                      {h.dormId === focusId && <Link className={s.hallsLink} href={`/colleges/${collegeId}/${h.dormId}`}>Rooms and sizes in {hall?.name ?? "this hall"}</Link>}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className={s.hallsNote}>No hall fits those filters for everyone. Try turning one off.</p>
            )}
            {ordered.length > SHOW && <button type="button" className={s.ghostBtn} onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${ordered.length} halls`}</button>}
          </>
        )}
        <p className={s.hallsFine}>Walk times are estimates along walking paths, there and back on each class day, without buses. Most schools assign rooms, so use this to rank your preferences.</p>
      </div>

      <div className={s.hallsSide}>
        <div className={s.hallsMap}>
          <FinderMap bounds={campus.bounds} places={mapPlaces} halls={mapHalls} routes={routes} focus={focus} picking={picking} onPick={onPick} onHallClick={ordered.length ? pickHall : undefined} />
        </div>

        <div className={s.hallsMine} style={personStyle(userId, members)}>
          <div className={s.hallsMineHead}>
            <h3><span className={s.faceSm} aria-hidden="true">{initial(people.find((p) => p.userId === data.me)?.name ?? "Y")}</span>Your places</h3>
            <span className={s.hallsSave} role="status">{saving === "saving" ? "Saving…" : saving === "saved" ? "Saved" : saving === "error" ? "Not saved. Check your connection." : ""}</span>
          </div>
          <PlacesEditor
            campus={campus}
            places={mine}
            ics={ics}
            imagesOn={Boolean(start?.imagesOn)}
            signedIn
            headers={headers}
            onAdd={(p) => setMine((m) => mergePlaces(m ?? [], p))}
            onIcs={setIcs}
            onToggleDay={(i, bit) => setMine((m) => m!.map((p, k) => (k === i ? { ...p, days: p.days ^ (1 << bit) } : p)))}
            onRemove={(i) => setMine((m) => m!.filter((_, k) => k !== i))}
            picking={picking}
            onPicking={setPicking}
            event={{ where: "room" }}
          />
          <p className={s.hallsFine}>Roommates in this room see the buildings you add and the days you go. Course names and where you drop a pin stay with you.</p>
        </div>

        {people.filter((p) => p.userId !== data.me).map((p) => (
          <div key={p.userId} className={s.hallsTheirs} style={personStyle(p.userId, members)}>
            <h3><span className={s.faceSm} aria-hidden="true">{initial(p.name)}</span>{p.name}</h3>
            {p.places.length ? (
              <ul>
                {p.places.map((place, i) => (
                  <li key={i}><strong>{place.placeId ? placeById.get(place.placeId)?.name ?? "A building" : "A dropped pin"}</strong><span className="ds-mono">{dayList(place.days)}</span></li>
                ))}
              </ul>
            ) : (
              <p>Hasn&apos;t added places yet.</p>
            )}
          </div>
        ))}
      </div>
    </section></div>
  );
}
