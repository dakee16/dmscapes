"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { workspaceRequest } from "@/lib/workspace-client";
import type { WorkspaceSummary } from "@/lib/workspace";
import type { AccountRoomSummary, AccountRoomsResponse, SaveRoomRequest } from "@/lib/api-types";
import { DEFAULT_PLANNING } from "@/lib/planning";
import { productsFor, extrasFor } from "@/lib/catalog";
import RoomThumb from "@/components/room/RoomThumb";
import BrandLoader from "@/components/site/BrandLoader";
import Modal from "@/components/site/Modal";
import RoomAppHeader from "./RoomAppHeader";
import PurchaseThankYou from "@/components/site/PurchaseThankYou";
import s from "./Workspace.module.css";

export default function MyRooms() {
  const { user, profile, loading } = useAuth(), router = useRouter();
  const [rooms, setRooms] = useState<WorkspaceSummary[]>([]), [saved, setSaved] = useState<AccountRoomSummary[]>([]);
  const [busy, setBusy] = useState(true), [error, setError] = useState(""), [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState("All rooms"), [search, setSearch] = useState(""), [opening, setOpening] = useState("");
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
  const imported = new Set(rooms.map(r => r.source_room_id));
  const matches = (text: string) => text.toLowerCase().includes(search.trim().toLowerCase());
  const visible = rooms.filter(r => matches(r.name) && (filter === "All rooms" || (filter === "Shared" ? r.shared : !r.shared)));
  const originals = saved.filter(r => !imported.has(r.id) && filter !== "Shared" && matches(r.name));
  return <><RoomAppHeader/><PurchaseThankYou/><main id="page-content" className={s.dashboard}>
    <div className={s.intro}><div><p className={s.eyebrow}>Your space / All in one place</p><h1>Make yourself<br/><em>at home.</em></h1><p>Your layouts, your shopping list, your people. Pick up right where you left off.</p></div>
      <div className={s.buttons}><Link href="/plan" className={s.primary}>Plan my room <span aria-hidden="true">↗</span></Link>{user && <button className={s.secondary} onClick={() => setCreate(true)}>Start a blank room</button>}</div></div>
    {(!user || (!busy && !rooms.length && !saved.length)) && <section className={s.spotlight}><div className={s.spotlightCopy}><p className={s.eyebrow}>One room. A shared plan.</p><h2>Good taste.<br/>Even better teamwork.</h2><p>Keep the things you love, find what you need, and decide who brings what. Invite your people when you&apos;re ready.</p><Link href={user && profile?.plan === "pro" ? "#rooms-list" : user ? "/pricing#plans" : "/login?next=%2Frooms"}>{user && profile?.plan === "pro" ? "Open a room below to invite friends" : "Explore shared rooms with Pro"} ↗</Link></div>
      <div className={s.spotlightArt} aria-label="Example shared shopping list"><div className={s.listSlip}><p className={s.eyebrow}>Move-in list / Example</p><div><i>✓</i><strong>Desk lamp</strong><span>Already have</span></div><div><i>A</i><strong>Mini fridge</strong><span>Alex is bringing</span></div><div><i>+</i><strong>The perfect rug</strong><span>Choose together</span></div></div></div></section>}
    {loading || busy ? <BrandLoader label="Opening your rooms…"/> : !user ? <section className={s.empty}><h2>Your room has a home here.</h2><p>Sign in to save your layouts, keep your shopping list together, and join a roommate&apos;s room.</p><Link href="/login?next=%2Frooms" className={s.primary}>Sign in to My rooms</Link></section> : <>
      <div id="rooms-list" className={s.filterbar}><div className={s.tabs} role="group" aria-label="Filter rooms">{["All rooms", "Personal", "Shared"].map(f => <button key={f} aria-pressed={f === filter} onClick={() => setFilter(f)}>{f}</button>)}</div><input type="search" className={s.search} placeholder="Find a room…" aria-label="Search your rooms" value={search} onChange={e => setSearch(e.target.value)}/></div>
      {saved.length >= 2 && <p className={s.muted} style={{marginBottom:20}}><Link href="/account/compare">Compare your saved designs ↗</Link></p>}
      {error && <div className={s.error} role="alert">{error} <button onClick={() => void load()}>Retry</button></div>}{actionError && !create && <p className={s.error} role="alert">{actionError}</p>}
      <div className={s.grid}>{visible.map(r => <article key={r.id} className={s.roomCard}><Link href={`/rooms/${r.id}`} aria-label={`Open ${r.name}`}><div className={s.preview}><RoomThumb lengthFt={r.snapshot.room_dimensions.length_ft} widthFt={r.snapshot.room_dimensions.width_ft} furniture={r.snapshot.furniture_positions} outline={r.snapshot.room_dimensions.outline}/><span>{r.shared ? `${r.member_count} ${r.member_count === 1 ? "person" : "people"}` : "Personal"}</span></div></Link><div className={s.roomBody}><span className={s.eyebrow}>{r.role === "owner" ? "Your room" : "Shared with you"}</span><h3>{r.name}</h3><p>{r.snapshot.room_dimensions.length_ft} × {r.snapshot.room_dimensions.width_ft} ft · ${r.snapshot.budget} budget</p><footer><small>Edited {new Date(r.updated_at).toLocaleDateString()}</small><Link href={`/rooms/${r.id}`}>Open room ↗</Link></footer></div></article>)}
        {originals.map(r => <article key={r.id} className={s.roomCard}><Link href={`/room/${r.id}`} aria-label={`View ${r.name}`}><div className={s.preview}><RoomThumb lengthFt={r.length_ft ?? 15} widthFt={r.width_ft ?? 12} furniture={r.furniture ?? []} outline={r.outline}/><span>Saved design</span></div></Link><div className={s.roomBody}><span className={s.eyebrow}>Ready for its next chapter</span><h3>{r.name}</h3><p>{r.length_ft} × {r.width_ft} ft · ${r.budget} budget</p><footer><Link href={`/room/${r.id}`}>View design</Link><button disabled={!!opening} onClick={() => void importRoom(r.id)}>{opening === r.id ? "Opening…" : "Open workspace ↗"}</button></footer></div></article>)}</div>
      {!visible.length && !originals.length && <div className={s.empty}><h2>{search || filter !== "All rooms" ? "No rooms here yet." : "Your first room starts here."}</h2><p>{search ? "Try another name or clear your search." : filter === "Shared" ? "Open a personal room and invite your roommates with Pro, or join through an invitation." : "Start with your college room and get a layout with a shopping list for your style and budget."}</p>{search ? <button className={s.secondary} onClick={() => setSearch("")}>Clear search</button> : <Link className={s.primary} href="/plan">Plan my room ↗</Link>}</div>}
    </>}
    {create && <Modal className={`${s.modal} ${s.app}`} onKeyDown={e => { if(e.key==="Escape"&&!opening)setCreate(false); }} role="dialog" aria-modal="true" aria-labelledby="blank-title" onClick={() => { if (!opening) setCreate(false); }}><form className={s.dialog} onSubmit={createBlank} onClick={e => e.stopPropagation()}><header><div><p className={s.eyebrow}>A blank canvas</p><h2 id="blank-title">Make room.</h2></div><button type="button" disabled={!!opening} onClick={() => setCreate(false)} aria-label="Close new room">Close</button></header><label className={s.field}>Room name<input required maxLength={80} value={name} onChange={e => setName(e.target.value)}/></label><div className={s.fieldRow}><label className={s.field}>Length (ft)<input required type="number" min={4} max={60} step={.1} value={length} onChange={e => setLength(e.target.valueAsNumber)}/></label><label className={s.field}>Width (ft)<input required type="number" min={4} max={60} step={.1} value={width} onChange={e => setWidth(e.target.valueAsNumber)}/></label></div><label className={s.field}>People in this room<select value={occupants} onChange={e => setOccupants(Number(e.target.value))}>{[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}</select></label><p className={s.muted}>Add furniture and openings in your room tools. Custom wall drawing is included with Plus and Pro. Starting a blank room uses no design credits.</p>{actionError && <p className={s.error} role="alert">{actionError}</p>}<div className={s.buttons} style={{marginTop:24}}><button className={s.primary} disabled={!!opening}>{opening ? "Creating…" : "Create my room ↗"}</button><Link className={s.secondary} href="/plan">Find my college room</Link></div></form></Modal>}
  </main></>;
}
