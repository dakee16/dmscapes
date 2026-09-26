"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { FurnitureItem, Product, SelectedRoom } from "@/lib/types";
import { usePlannerStore } from "@/lib/store";
import { FURNITURE_LIBRARY, type LibraryPiece } from "@/lib/furniture-library";
import { analyzeRoom, assignOwnership, assignedCosts, mergeArrangement, moveFamily, LAYOUT_INTENTS, OWNER_COLORS, ownerName, proposeLayout, suggestedMove, supplyFor, type LayoutIntent, type PlanIssue, type RoomAnalysis } from "@/lib/planning";
import { furnitureCorners } from "@/components/canvas/geometry";
import { roomOutline, visibleFurniture } from "@/lib/studio";
import { NumberField } from "./StudioPanels";
import s from "./Studio.module.css";
import v from "./Planning.module.css";

function PieceIcon({piece}:{piece:LibraryPiece}){
  return <svg viewBox="0 0 96 68" fill="none" stroke="#343952" strokeWidth="1.6" aria-hidden="true">
    <path d="m8 54 38-17 42 16-38 14Z" fill="#e9ebf2" stroke="none"/>
    {piece.type==="bed"?<><path d="m18 28 39-17 22 10v27L40 64 18 53Z" fill="#c4a886"/><path d="m20 29 37-15 20 9-37 16Z" fill="#fffdf6"/><path d="m20 39 20 9 37-16v15L40 61 20 51Z" fill="#879fea"/><path d="m44 29 12-5 12 5-12 5Z" fill="white"/></>:piece.type==="desk"||piece.type==="table"?<><path d="M21 36v23m51-27v24M45 47v17"/><path d="m17 30 33-15 29 14-34 16Z" fill="#d5bb99"/><path d="m34 24 15-7 12 6-15 7Z" fill="#bac9f9"/></>:piece.group==="Rugs"?<><path d="m12 43 44-21 30 16-46 22Z" fill="#b7c6ed"/><path d="m20 43 36-16 21 11-37 17Z"/></>:piece.group==="Seating"||piece.type==="chair"?<><path d="m22 22 26-10 24 10v27L46 61 22 49Z" fill="#a9bdb6"/><path d="m23 37 23 11 25-11M46 48v13M25 23l21 10 22-10"/></>:<><path d="m28 13 23-8 20 10v37L48 63 28 51Z" fill={piece.group==="Appliances"?"#dde3eb":"#d5bb99"}/><path d="m28 13 20 11 23-9M48 24v39M32 31l11 5m10 9 13-5M32 41l11 5"/></>}
  </svg>;
}
export function MiniPlan({room,items,highlight}:{room:SelectedRoom;items:FurnitureItem[];highlight?:string}){
  const outline=roomOutline(room);
  return <svg className={v.miniPlan} viewBox={`-1 -1 ${room.lengthFt+2} ${room.widthFt+2}`} role="img" aria-label="Layout preview">
    <polygon points={outline.points.map(p=>`${p.x},${p.y}`).join(" ")} fill="#fffdfa" stroke="#35384c" strokeWidth=".14"/>
    {outline.closets.map((c,i)=><rect key={i} x={c.x_ft} y={c.y_ft} width={c.width_ft} height={c.depth_ft} fill="#d5d9df"/>)}
    {items.map(f=><polygon key={f.id} points={furnitureCorners(f).map(p=>`${p.x},${p.y}`).join(" ")} fill={highlight===f.id?"#ffdc60":f.type==="bed"?"#b3c3fa":f.type==="rug"?"#f2e4c8":"#cfd7d5"} stroke={highlight===f.id?"#aa6500":"#5b667b"} strokeWidth=".055"/>)}
  </svg>;
}
export function FurnitureLibrary({onSelect}:{onSelect:(id:string)=>void}){
  const [query,setQuery]=useState(""),[group,setGroup]=useState("All"),[tab,setTab]=useState<"library"|"room">("library"),[message,setMessage]=useState("");
  const items=usePlannerStore(s=>s.furniture)??[],planning=usePlannerStore(s=>s.planning),hidden=usePlannerStore(s=>s.hiddenItemIds),add=usePlannerStore(s=>s.addLibraryPiece);
  const pieces=FURNITURE_LIBRARY.filter(p=>(group==="All"||p.group===group)&&p.name.toLowerCase().includes(query.toLowerCase()));
  return <><div className={v.segment} role="group" aria-label="Furniture source"><button aria-pressed={tab==="library"} onClick={()=>setTab("library")}>Add furniture</button><button aria-pressed={tab==="room"} onClick={()=>setTab("room")}>In your room ({items.length})</button></div>
    <label className={s.field}>Find a piece<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Bed, desk, radiator…"/></label>
    {tab==="library"?<><div className={v.chips} aria-label="Furniture categories">{["All",...new Set(FURNITURE_LIBRARY.map(p=>p.group))].map(g=><button key={g} aria-pressed={group===g} onClick={()=>setGroup(g)}>{g}</button>)}</div>
      <p className={v.caption}>Room pieces, ready to arrange. Edit every measurement.</p>
      <div className={v.library}>{pieces.map(p=><button key={p.key} onClick={()=>{const id=add(p.key);if(id){onSelect(id);setMessage(`${p.name} added. You can undo this.`);}else setMessage("This room has reached its 60-piece limit. Remove a piece to add another.");}}><PieceIcon piece={p}/><strong>{p.name}</strong><span>{p.w} × {p.d} ft</span><b aria-hidden="true">+</b></button>)}</div>
      {!pieces.length&&<p className={s.note}>No matching pieces. Try another category or use Custom footprint.</p>}
    </>:<ul className={v.roomInventory}>{items.filter(f=>f.label.toLowerCase().includes(query.toLowerCase())).map(f=><li key={f.id}><button onClick={()=>onSelect(f.id)}><i style={{background:planning.roommates.find(r=>r.id===f.assigned_to)?.color??"#acb7c9"}}/><span><strong>{f.label}</strong><small>{hidden.includes(f.id)?"Hidden · ":""}{ownerName(f.assigned_to,planning.roommates)} · {supplyFor(f)==="school"?"School provided":supplyFor(f)==="owned"?"Already owned":"To buy"}</small></span><b>↗</b></button></li>)}{!items.length&&<li className={s.note}>Your room is a blank canvas. Add your first piece.</li>}</ul>}
    {message&&<p className={v.caption} role="status">{message}</p>}
  </>;
}
export function PlacementPanel({analysis,onHighlight}:{analysis:RoomAnalysis;onHighlight:(issue:PlanIssue)=>void}){
  const state=usePlannerStore(),[preview,setPreview]=useState<FurnitureItem|null>(null),[message,setMessage]=useState("");
  const room=state.room!,items=visibleFurniture(state.furniture??[],state.hiddenItemIds,state.excluded??[]);
  return <><div className={v.stats}><div><strong>{Math.round(analysis.openFloorFt2)}</strong><span>ft² open floor</span></div><div><strong>{analysis.beds}/{room.occupants}</strong><span>sleeping places</span></div><div><strong>{analysis.issues.filter(i=>i.level==="warning").length}</strong><span>to check</span></div></div>
    <NumberField label="Route width (ft)" min={1} max={4} step={.25} value={state.planning.walkwayFt} onCommit={n=>state.updatePlanning({walkwayFt:n})}/>
    <p className={v.caption}>Floor estimates use a 3-inch grid, count overlaps once and include space under lofts. Routes allow room for your selected width. Check actual measurements and school rules.</p>
    {analysis.connectedFloorFt2!==null&&<p className={v.metric}>Reachable route area <strong>≈ {Math.round(analysis.connectedFloorFt2)} ft²</strong></p>}
    {analysis.issues.length?<ol className={v.checks}>{analysis.issues.map(issue=><li key={issue.key} data-level={issue.level}><button onClick={()=>onHighlight(issue)}><small>{issue.level==="warning"?"Check":"Good to know"}</small><strong>{issue.title}</strong><span>{issue.detail}</span></button>{issue.itemId&&issue.key.startsWith("placement-")&&issue.title!=="Above the ceiling"&&<button className={v.textButton} onClick={()=>{const f=items.find(f=>f.id===issue.itemId);const next=f?suggestedMove(f,items,room,state.lockedItemIds):null;setPreview(next);setMessage(next?"":"No simple move resolves this. Adjust the highlighted item, its dimensions or the room openings.");onHighlight(issue);}}>Preview a clearer position</button>}</li>)}</ol>:<div className={v.success}><strong>Looking good.</strong><p>No issues detected with the recorded dimensions. Check details in person before move-in.</p></div>}
    {message&&<p className={s.note} role="status">{message}</p>}
    {preview&&<div className={v.preview}><strong>Suggested move · {preview.label}</strong><MiniPlan room={room} items={moveFamily(items,preview)} highlight={preview.id}/><p>{preview.x_ft.toFixed(1)} ft from left · {preview.y_ft.toFixed(1)} ft from top</p><div className={s.buttonRow}><button onClick={()=>{state.moveItem(preview.id,preview.x_ft,preview.y_ft);setPreview(null);}}>Apply move</button><button onClick={()=>setPreview(null)}>Cancel</button></div></div>}
  </>;
}
export function LayoutPanel(){
  const state=usePlannerStore(),room=state.room!,items=state.furniture??[],[preview,setPreview]=useState<{name:string;items:FurnitureItem[]}|null>(null),[working,setWorking]=useState(false),[message,setMessage]=useState("");
  const previewItems=useMemo(()=>preview?mergeArrangement(items,preview.items,state.lockedItemIds):null,[items,preview,state.lockedItemIds]);
  const analysis=useMemo(()=>previewItems?analyzeRoom(visibleFurniture(previewItems,state.hiddenItemIds,state.excluded??[]),room,state.planning.walkwayFt):null,[previewItems,room,state.hiddenItemIds,state.excluded,state.planning.walkwayFt]);
  const current=useMemo(()=>analyzeRoom(visibleFurniture(items,state.hiddenItemIds,state.excluded??[]),room,state.planning.walkwayFt),[items,room,state.hiddenItemIds,state.excluded,state.planning.walkwayFt]);
  async function generate(intent:LayoutIntent,name:string){setWorking(true);setMessage("");await new Promise(r=>setTimeout(r,30));try{setPreview({name,items:proposeLayout(items,room,state.lockedItemIds,intent)});}finally{setWorking(false);}}
  function keep(){if(!preview)return;if(state.planning.alternatives.length>=3){setMessage("Keep up to three alternatives. Remove one to save another.");return;}state.updatePlanning({alternatives:[...state.planning.alternatives,{id:crypto.randomUUID(),name:preview.name,furniture:previewItems??preview.items,createdAt:new Date().toISOString()}]});setMessage("Alternative kept. Save the design to include it in your shared review.");}
  return <><p className={v.caption}>Try a new arrangement with your existing pieces. Locked items and fixed fixtures stay put. These previews use no design credits.</p>
    <button className={s.primary} onClick={()=>{setPreview({name:"Current arrangement",items:items.map(f=>({...f}))});}}>Compare or keep current layout</button>
    <div className={v.intents}>{LAYOUT_INTENTS.map(intent=><button key={intent.id} disabled={working} onClick={()=>void generate(intent.id,intent.name)}><strong>{intent.name}</strong><span>{intent.detail}</span><b>↗</b></button>)}</div>
    {working&&<p role="status">Finding positions for your furniture…</p>}
    {preview&&analysis&&<div className={v.preview}><div className={v.previewTitle}><strong>{preview.name}</strong><button aria-label="Close layout preview" onClick={()=>setPreview(null)}>×</button></div><MiniPlan room={room} items={previewItems??preview.items}/><table className={v.compare}><caption>Compare before applying</caption><thead><tr><th>Measure</th><th>Current</th><th>Preview</th></tr></thead><tbody><tr><th>Open floor</th><td>≈ {Math.round(current.openFloorFt2)} ft²</td><td>≈ {Math.round(analysis.openFloorFt2)} ft²</td></tr><tr><th>Checks</th><td>{current.issues.filter(i=>i.level==="warning").length}</td><td>{analysis.issues.filter(i=>i.level==="warning").length}</td></tr><tr><th>Sleeping places</th><td>{current.beds}</td><td>{analysis.beds}</td></tr><tr><th>Added cost</th><td>$0</td><td>$0*</td></tr></tbody></table><p className={v.caption}>*Same inventory. Loft kits or other school-required equipment are not priced. Unresolved checks still need your attention.</p><div className={s.buttonRow}><button onClick={()=>{usePlannerStore.setState({furniture:previewItems??items,selectedItemId:null});setPreview(null);}}>Apply layout</button><button onClick={keep}>Keep alternative</button><button onClick={()=>setPreview(null)}>Cancel</button></div></div>}
    {!!state.planning.alternatives.length&&<><h3>Saved alternatives</h3>{state.planning.alternatives.map(a=><div key={a.id} className={v.alternative}><button onClick={()=>setPreview({name:a.name,items:a.furniture})}>{a.name} · Compare</button><button aria-label={`Remove ${a.name}`} onClick={()=>state.updatePlanning({alternatives:state.planning.alternatives.filter(x=>x.id!==a.id)})}>×</button></div>)}</>}
    {message&&<p className={s.note} role="status">{message}</p>}
  </>;
}
export function RoommatesPanel({products}:{products:Product[]}){
  const state=usePlannerStore(),items=state.furniture??[],details=state.planning,costs=assignedCosts(items,products,details);
  return <><p className={v.caption}>Name your roommates, assign each piece, and agree on what to bring. Shared costs stay separate until you agree on the split.</p>
    <label className={v.toggle}><input type="checkbox" checked={details.showOwners} onChange={e=>state.updatePlanning({showOwners:e.target.checked})}/>Show names and colors on the 2D plan</label>
    {details.roommates.map(r=><div className={v.person} key={r.id}><i style={{background:r.color}}/><label>Name<input key={r.name} defaultValue={r.name} maxLength={40} onBlur={e=>{const name=e.target.value.trim();if(name)state.updatePlanning({roommates:details.roommates.map(x=>x.id===r.id?{...x,name}:x)});else e.target.value=r.name;}}/></label><strong>${(costs[r.id]??0).toFixed(2)}</strong><button aria-label={`Remove ${r.name}`} onClick={()=>{state.updatePlanning({roommates:details.roommates.filter(x=>x.id!==r.id),productSupply:Object.fromEntries(Object.entries(details.productSupply).map(([id,v])=>[id,v.assignedTo===r.id?{...v,assignedTo:"shared"}:v]))});usePlannerStore.setState(s=>({furniture:s.furniture?.map(f=>f.assigned_to===r.id?{...f,assigned_to:"shared"}:f)??null}));}}>×</button></div>)}
    {details.roommates.length<8&&<button className={v.textButton} onClick={()=>state.updatePlanning({roommates:[...details.roommates,{id:crypto.randomUUID(),name:`Roommate ${details.roommates.length+1}`,color:OWNER_COLORS[details.roommates.length]}]})}>+ Add roommate</button>}
    <p className={v.metric}>Shared purchases <strong>${costs.shared.toFixed(2)}</strong></p>
    <div className={v.assignments}>{items.map(f=><div key={f.id}><strong>{f.label}</strong><select aria-label={`Owner of ${f.label}`} value={f.assigned_to??"shared"} onChange={e=>usePlannerStore.setState(current=>assignOwnership(current.furniture??[],current.planning,products,{itemId:f.id},{assignedTo:e.target.value}))}><option value="shared">Shared</option>{details.roommates.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><small>{supplyFor(f)==="school"?"School provided":supplyFor(f)==="owned"?"Bring from home":"To buy"}</small></div>)}</div>
    <p className={s.note}>Share room creates a review link with assignments and kept layout alternatives. Reviewers can leave comments after signing in. Editing a copy never overwrites the original.</p>
  </>;
}
export function ShoppingOwnership({products}:{products:Product[]}){
  const details=usePlannerStore(s=>s.planning);
  function assign(productId:string,patch:Partial<{supply:"school"|"owned"|"buy";assignedTo:string}>){usePlannerStore.setState(state=>assignOwnership(state.furniture??[],state.planning,products,{productId},patch));}
  if(!products.length)return <div className={v.success}><strong>Build your layout first.</strong><p>Add furniture from the library, then find a vibe when you want product recommendations.</p><Link href="/plan/style">Find products for my room ↗</Link></div>;
  return <details className={v.shoppingOwnership}><summary>Already have it? Set who brings what</summary>{products.map(p=>{const value=details.productSupply[p.id]??{supply:"buy",assignedTo:"shared"};return <div key={p.id}><strong>{p.name}</strong><select aria-label={`Supply for ${p.name}`} value={value.supply} onChange={e=>assign(p.id,{supply:e.target.value as typeof value.supply})}><option value="buy">To buy</option><option value="owned">Already owned</option><option value="school">School provided</option></select><select aria-label={`Buyer for ${p.name}`} value={value.assignedTo} onChange={e=>assign(p.id,{assignedTo:e.target.value})}><option value="shared">Shared</option>{details.roommates.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><small>{p.width_ft&&p.length_ft?`Product dimensions: ${p.width_ft} × ${p.length_ft} ft. Confirm the seller's selected variant.`:"Approximate footprint. Product dimensions are not available."}</small></div>;})}</details>;
}
