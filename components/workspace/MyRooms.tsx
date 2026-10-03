"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { workspaceRequest } from "@/lib/workspace-client";
import type { WorkspaceSummary } from "@/lib/workspace";
import type { AccountRoomSummary, AccountRoomsResponse, SaveRoomRequest } from "@/lib/api-types";
import { DEFAULT_PLANNING, shoppingProducts } from "@/lib/planning";
import { productsFor, extrasFor } from "@/lib/catalog";
import { hasFeatures, isPro } from "@/lib/plan";
import { getSchool, formatDims } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { styleById } from "@/lib/styles";
import { formatRoomType } from "@/lib/format";
import type { FurnitureItem, RoomOutline } from "@/lib/types";
import RoomThumb from "@/components/room/RoomThumb";
import ShareButton from "@/components/room/ShareButton";
import PageShell from "@/components/ds/PageShell";
import BrandLoader from "@/components/site/BrandLoader";
import Modal, { ModalClose } from "@/components/site/Modal";
import PurchaseThankYou from "@/components/site/PurchaseThankYou";
import { ArrowRight, SearchIcon } from "@/components/ds/Icons";
import { PlusIcon } from "@/components/studio-ui/icons";
import s from "./Designs.module.css";

type Tab = "designs" | "drawn" | "rooms";
const PX_MAX = 9; // px per foot: every plan shares one scale unless it has to shrink to fit
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** A saved room drawn to scale on plan paper. */
function Plan({ lengthFt, widthFt, furniture, outline }: { lengthFt: number; widthFt: number; furniture: FurnitureItem[]; outline?: RoomOutline | null }) {
  const px = Math.min(PX_MAX, 300 / lengthFt, 150 / widthFt);
  return <span className={s.plan} aria-hidden="true"><RoomThumb lengthFt={lengthFt} widthFt={widthFt} furniture={furniture} outline={outline} className={s.planSvg} style={{ width: lengthFt * px + 2, height: widthFt * px + 2 }} /></span>;
}

function placeOf(collegeId: string | null, dormId: string | null) {
  const school = collegeId ? getSchool(collegeId) : undefined;
  const dorm = school?.dorms.find(d => d.id === dormId);
  return { school: school ? shortName(school) : null, dorm: dorm?.name ?? null };
}

export default function MyRooms() {
  const { user, profile, loading } = useAuth(), router = useRouter();
  const [rooms, setRooms] = useState<WorkspaceSummary[]>([]), [saved, setSaved] = useState<AccountRoomSummary[]>([]);
  const [busy, setBusy] = useState(true), [error, setError] = useState(""), [actionError, setActionError] = useState("");
  const [tab, setTab] = useState<Tab>("designs"), [search, setSearch] = useState(""), [opening, setOpening] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [create, setCreate] = useState(false), [name, setName] = useState("My college room"), [length, setLength] = useState(15), [width, setWidth] = useState(12), [occupants, setOccupants] = useState(2);
  const requestVersion = useRef(0);
  const load = useCallback(async () => {
    if (!user) return;
    const version = ++requestVersion.current;
    setBusy(true); setError("");
    const results = await Promise.allSettled([workspaceRequest<{ rooms: WorkspaceSummary[] }>("/api/workspaces"), workspaceRequest<AccountRoomsResponse>("/api/account/rooms")]);
    if (version !== requestVersion.current) return;
    const [workspaces, legacy] = results;
    if (workspaces.status === "fulfilled") setRooms(workspaces.value.rooms); else setError(workspaces.reason.message);
    if (legacy.status === "fulfilled") setSaved(legacy.value.rooms); else setError(previous => previous || legacy.reason.message);
    setBusy(false);
  }, [user]);
  useEffect(() => { if (!loading && user) void load(); else if (!loading) { setBusy(false); setRooms([]); setSaved([]); } return () => { requestVersion.current++; }; }, [loading, user, load]);
  async function importRoom(id: string) {
    setOpening(id); setActionError("");
    try { const value = await workspaceRequest<{ id: string }>("/api/workspaces", { method: "POST", body: JSON.stringify({ source_room_id: id }) }); router.push(`/rooms/${value.id}`); }
    catch (e) { setActionError((e as Error).message); setOpening(""); }
  }
  async function createBlank(e: React.FormEvent) {
    e.preventDefault(); setOpening("new"); setActionError("");
    const snapshot: SaveRoomRequest = { name: name.trim(), college_id: null, dorm_id: null, room_dimensions: {
      length_ft: length, width_ft: width, occupants, room_type: occupants === 1 ? "single" : "double", bed_size: "twin_xl", estimated: false,
      editor: { hiddenItemIds: [], lockedItemIds: [], customItems: [], unplacedItemIds: [], customProducts: null, customVibe: null, customMock: false, customRegenUsed: false, cartProducts: [],
        excluded: [...productsFor("minimalist", "mid", "twin_xl"), ...extrasFor("minimalist")].map(p => p.category),
        planning: { ...DEFAULT_PLANNING, mode: "manual", name: name.trim(), lastPanel: "shop" } } },
      style: "minimalist", budget: 500, template_id: "manual-empty", furniture_positions: [], selected_products: {} };
    try { const result = await workspaceRequest<{ id: string }>("/api/workspaces", { method: "POST", body: JSON.stringify({ snapshot }) }); router.push(`/rooms/${result.id}`); }
    catch (e) { setActionError((e as Error).message); setOpening(""); }
  }
  const workspaceFor = useMemo(() => new Map(rooms.filter(r => r.role === "owner" && r.source_room_id).map(r => [r.source_room_id!, r])), [rooms]);
  const matches = (text: string) => text.toLowerCase().includes(search.trim().toLowerCase());
  const designs = saved.filter(r => matches(r.name));
  const drawn = designs.filter(r => r.outline);
  const workspaces = rooms.filter(r => matches(r.name));
  const shown = tab === "rooms" ? [] : tab === "drawn" ? drawn : designs;
  const pick = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id].slice(-2));
  const pickedRooms = picked.map(id => saved.find(r => r.id === id)).filter((r): r is AccountRoomSummary => !!r);
  const origin = typeof window === "undefined" ? "https://dormscape.us" : window.location.origin;
  const label = (r: AccountRoomSummary) => { const p = placeOf(r.college_id, r.dorm_id); return [p.dorm ?? p.school ?? r.name, styleById(r.style).name].join(" · "); };

  return <PageShell className={s.page}>
    <PurchaseThankYou/>
    <section className={`ds-wrap ${s.head}`}>
      <h1 className={s.title}><span>My designs,</span> <em>saved free.</em></h1>
      <div className={s.headActions}>
        <Link href="/plan" className="ds-btn ds-btn--ink-yellow">Start a new plan<PlusIcon size={18}/></Link>
        <span className={s.headNote}>Uses 1 plan credit · saving never does</span>
        {user && <button type="button" className={s.textBtn} onClick={() => setCreate(true)}>Or start a blank room</button>}
      </div>
    </section>

    <section className={`ds-wrap ${s.body}`} aria-label="Your saved rooms">
      {loading || busy ? <BrandLoader label="Opening your rooms…"/> : !user ? <div className={s.empty}>
        <h2>Your room has <em>a home here.</em></h2>
        <p>Sign in to save your layouts, keep your shopping list together, and join a roommate&apos;s room.</p>
        <Link href="/login?next=%2Frooms" className="ds-btn ds-btn--ink-yellow">Sign in to My designs</Link>
      </div> : <>
        <div className={s.bar}>
          <div className={s.tabs} role="group" aria-label="Show">
            {([["designs", "Designs", designs.length], ["drawn", "Rooms you drew", drawn.length], ["rooms", "Workspaces", workspaces.length]] as const).map(([key, text, n]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{text} · {n}</button>)}
          </div>
          <label className={s.search}><SearchIcon size={18}/><span className="ds-sr">Search your rooms</span><input type="search" placeholder="Find a room…" value={search} onChange={e => setSearch(e.target.value)}/></label>
          {tab !== "rooms" && saved.length >= 2 && <span className={s.tick}>Tick two to compare</span>}
        </div>
        {error && <div className={s.error} role="alert">{error} <button type="button" onClick={() => void load()}>Retry</button></div>}
        {actionError && !create && <p className={s.error} role="alert">{actionError}</p>}

        <div className={s.grid}>
          {shown.map(r => {
            const L = r.length_ft ?? 15, W = r.width_ft ?? 12, p = placeOf(r.college_id, r.dorm_id), on = picked.includes(r.id);
            const products = r.editor?.cartProducts ?? [], total = r.editor ? shoppingProducts(products, r.editor.planning ?? DEFAULT_PLANNING).reduce((n, x) => n + x.price, 0) : null;
            const ws = workspaceFor.get(r.id);
            return <article key={r.id} className={s.card} data-picked={on}>
              <div className={s.thumb}>
                <Plan lengthFt={L} widthFt={W} furniture={r.furniture ?? []} outline={r.outline}/>
                {r.outline && <span className={s.drawnTag}>Drawn room</span>}
                {saved.length >= 2 && <label className={s.compare}><input type="checkbox" checked={on} onChange={() => pick(r.id)}/>Compare<span className="ds-sr"> {r.name}</span></label>}
              </div>
              <div className={s.cardBody}>
                <div className={s.cardHead}><h2>{r.name}</h2><span>Saved {date(r.created_at)}</span></div>
                <p className={s.meta}>{[r.outline ? "Drawn in 2D" : p.school, p.dorm, formatDims(r.length_ft, r.width_ft), styleById(r.style).name].filter(Boolean).join(" · ") || formatRoomType(r.room_type)}</p>
                {total !== null ? <div className={s.budget}><strong>{usd(total)} of {usd(r.budget)}</strong><span aria-hidden="true"><i style={{ width: `${Math.min(100, (total / Math.max(1, r.budget)) * 100)}%` }} data-over={total > r.budget}/></span></div> : <p className={s.budgetPlain}>{usd(r.budget)} budget</p>}
                <div className={s.actions}>
                  <Link href={`/room/${r.id}`} className={s.open}>Open</Link>
                  {ws ? <Link href={`/rooms/${ws.id}`}>Open its workspace</Link> : <button type="button" disabled={!!opening} onClick={() => void importRoom(r.id)}>{opening === r.id ? "Opening…" : "Open as workspace"}</button>}
                  <ShareButton url={`${origin}/room/${r.id}`} title={r.name} from="my-designs" className={s.share}/>
                </div>
              </div>
            </article>;
          })}
          {tab === "rooms" && workspaces.map(r => {
            const d = r.snapshot.room_dimensions, p = placeOf(r.snapshot.college_id, r.snapshot.dorm_id);
            return <article key={r.id} className={s.card}>
              <Link href={`/rooms/${r.id}`} className={s.thumb} aria-label={`Open ${r.name}`}>
                <Plan lengthFt={d.length_ft} widthFt={d.width_ft} furniture={r.snapshot.furniture_positions} outline={d.outline}/>
                <span className={r.shared ? s.sharedTag : s.drawnTag}>{r.shared ? `Shared · ${r.member_count} ${r.member_count === 1 ? "person" : "people"}` : "Personal"}</span>
              </Link>
              <div className={s.cardBody}>
                <div className={s.cardHead}><h2>{r.name}</h2><span>Edited {date(r.updated_at)}</span></div>
                <p className={s.meta}>{[r.role === "owner" ? "Your room" : "Shared with you", p.school, formatDims(d.length_ft, d.width_ft), `${usd(r.snapshot.budget)} budget`].filter(Boolean).join(" · ")}</p>
                <div className={s.actions}><Link href={`/rooms/${r.id}`} className={s.open}>Open room</Link></div>
              </div>
            </article>;
          })}
          {tab !== "rooms" && <Link href="/plan" className={s.newCard}><span aria-hidden="true"><PlusIcon size={26}/></span><strong>Plan another room</strong><em>or reuse a room you drew</em></Link>}
          {tab === "rooms" && <button type="button" className={s.newCard} onClick={() => setCreate(true)}><span aria-hidden="true"><PlusIcon size={26}/></span><strong>Start a blank room</strong><em>no design credits needed</em></button>}
        </div>

        {!shown.length && tab !== "rooms" && <p className={s.none}>{search ? <>No designs match &ldquo;{search}&rdquo;. <button type="button" onClick={() => setSearch("")}>Clear search</button></> : tab === "drawn" ? "Rooms you draw in 2D show up here." : "Your first design starts with your college room, a style and a budget."}</p>}
        {tab === "rooms" && !workspaces.length && <p className={s.none}>{search ? <>No rooms match &ldquo;{search}&rdquo;. <button type="button" onClick={() => setSearch("")}>Clear search</button></> : "Open a saved design as a workspace to keep it in step with your roommates, or join one through an invitation."}</p>}

        <aside className={s.together}>
          <div><p className={s.togetherEyebrow}>My Room · Pro</p><h2>Planning with a roommate?</h2><p>Open one design as your shared room, split it down the middle, and settle who brings what. Friends join free.</p></div>
          <Link href={isPro(profile) ? "/my-room" : "/pricing#plans"} className="ds-btn ds-btn--ink-yellow ds-btn--sm">{isPro(profile) ? "Open My Room" : "See Pro"}<ArrowRight size={16}/></Link>
        </aside>
      </>}
    </section>

    {pickedRooms.length > 0 && <div className={s.tray} role="region" aria-label="Compare tray">
      <span className={s.trayCount}>{pickedRooms.length} selected</span>
      <span className={s.trayNames}>{pickedRooms.map((r, i) => <span key={r.id}>{i > 0 && <i> vs </i>}<b>{label(r)}</b></span>)}</span>
      {pickedRooms.length === 2 ? <Link href={`/account/compare?a=${encodeURIComponent(pickedRooms[0].id)}&b=${encodeURIComponent(pickedRooms[1].id)}`} className={s.trayGo}>Compare side by side{!hasFeatures(profile) && <span>Plus</span>}</Link>
        : <span className={s.trayHint}>Tick one more</span>}
      <button type="button" className={s.trayClear} onClick={() => setPicked([])}>Clear</button>
    </div>}

    {create && <Modal className={s.dialogLayer} aria-labelledby="blank-title" onKeyDown={e => { if (e.key === "Escape" && !opening) setCreate(false); }} onClick={() => { if (!opening) setCreate(false); }}>
      <form className={s.dialog} onSubmit={createBlank} onClick={e => e.stopPropagation()}>
        <ModalClose label="Close new room" disabled={!!opening} onClick={() => setCreate(false)}/>
        <p className={s.dialogEyebrow}>A blank canvas</p><h2 id="blank-title">Make <em>room.</em></h2>
        <label className={s.field}><span>Room name</span><input className="ds-input" required maxLength={80} value={name} onChange={e => setName(e.target.value)}/></label>
        <div className={s.fieldRow}>
          <label className={s.field}><span>Length (ft)</span><input className="ds-input" required type="number" min={4} max={60} step={.1} value={length} onChange={e => setLength(e.target.valueAsNumber)}/></label>
          <label className={s.field}><span>Width (ft)</span><input className="ds-input" required type="number" min={4} max={60} step={.1} value={width} onChange={e => setWidth(e.target.valueAsNumber)}/></label>
        </div>
        <label className={s.field}><span>People in this room</span><select className="ds-input" value={occupants} onChange={e => setOccupants(Number(e.target.value))}>{[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        <p className={s.dialogNote}>Add furniture and openings in your room tools. Custom wall drawing is included with Plus and Pro. Starting a blank room uses no design credits.</p>
        {actionError && <p className={s.error} role="alert">{actionError}</p>}
        <div className={s.dialogActions}><button type="submit" className={s.inkBtn} disabled={!!opening}>{opening ? "Creating…" : "Create my room"}</button><Link className={s.ghostBtn} href="/plan">Find my college room</Link></div>
      </form>
    </Modal>}
  </PageShell>;
}
