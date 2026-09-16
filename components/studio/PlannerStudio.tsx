"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import BrandLoader from "@/components/site/BrandLoader";
import { CanvasControlsContext } from "@/components/canvas/CanvasControlsContext";
import { useAuth } from "@/lib/auth-context";
import { canUse3D } from "@/lib/plan";
import { useUpgrade } from "@/lib/upgrade-context";
import { usePlannerStore } from "@/lib/store";
import { furnitureCategory } from "@/lib/highlight";
import type { Product } from "@/lib/types";
import { placementIssues, studioSettings, visibleFurniture } from "@/lib/studio";
import ActionBar from "@/components/products/ActionBar";
import RoomScene, {type RoomSceneHandle,type CameraView} from "./RoomScene";
import { ItemInspector, RoomDetails, StyleDetails } from "./StudioPanels";
import s from "./Studio.module.css";

const RoomEditor = dynamic(() => import("@/components/planner/RoomDrawCanvas"), {ssr:false,loading:()=> <BrandLoader label="Opening your room editor…"/>});

type Panel="furnish"|"style"|"room"|"shop"|"item"|"checks"|"help";
export default function PlannerStudio({canvas,get2DPng,shopping,products,total,budget,subtitle,history,onReset,extras,unplaced}:{canvas:ReactNode;get2DPng:()=>string|null;shopping:ReactNode;products:Product[];total:number;budget:number;subtitle:string;history:{canUndo:boolean;canRedo:boolean;undo:()=>void;redo:()=>void};onReset:()=>void;extras?:ReactNode;unplaced?:ReactNode}){
  const room=usePlannerStore(st=>st.room)!,items=usePlannerStore(st=>st.furniture)??[];
  const style=usePlannerStore(st=>st.style)??"minimalist",hidden=usePlannerStore(st=>st.hiddenItemIds),excluded=usePlannerStore(st=>st.excluded)??[],locked=usePlannerStore(st=>st.lockedItemIds);
  const selectedId=usePlannerStore(st=>st.selectedItemId);
  const [editingRoom,setEditingRoom]=useState(false);
  const [toolsHost,setToolsHost]=useState<HTMLDivElement|null>(null),[compact,setCompact]=useState(false);
  const shopPanel=useRef<HTMLElement>(null);
  const view=usePlannerStore(st=>st.plannerView),setView=usePlannerStore(st=>st.setPlannerView);
  const [panel,setPanel]=useState<Panel>("shop"),[snap,setSnap]=useState(true),[walls,setWalls]=useState("auto"),[moveMode,setMoveMode]=useState(false);
  const [camera,setCamera]=useState<CameraView>("room"),[expanded,setExpanded]=useState(false),[mobileOpen,setMobileOpen]=useState(false),[query,setQuery]=useState(""),[resetConfirm,setResetConfirm]=useState(false);
  const scene=useRef<RoomSceneHandle>(null),root=useRef<HTMLDivElement>(null),previous=useRef(selectedId),closeRef=useRef<HTMLButtonElement>(null);
  const {profile,loading}=useAuth(),{openUpgrade}=useUpgrade();
  const allowed3D=!loading&&canUse3D(profile),preview=view==="3d"&&!allowed3D;
  const activePanel=view==="2d"?"shop":panel;
  useEffect(()=>{const media=window.matchMedia("(max-width:780px)");const update=()=>setCompact(media.matches);update();media.addEventListener("change",update);return()=>media.removeEventListener("change",update);},[]);
  useEffect(()=>{if(!compact||!mobileOpen)return;const focused=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow="hidden";const frame=requestAnimationFrame(()=>closeRef.current?.focus({preventScroll:true}));return()=>{cancelAnimationFrame(frame);document.body.style.overflow=overflow;focused?.focus({preventScroll:true});};},[compact,mobileOpen]);
  function editRoom(){setView("2d");setMobileOpen(false);setEditingRoom(true);}
  function enter3D(){setView("3d");setPanel("shop");setMoveMode(false);}
  const selected=items.find(f=>f.id===selectedId);
  const issues=placementIssues(visibleFurniture(items,hidden,excluded),room,studioSettings(room.studio));
  const selectedProduct=selected?(products.find(p=>p.id===selected.id)||products.find(p=>p.category===furnitureCategory(selected))):undefined;
  useEffect(()=>{if(view==="3d"&&selectedId&&selectedId!==previous.current){setPanel("item");}previous.current=selectedId;},[selectedId,view]);
  useEffect(()=>{
    if(!expanded)return;const prev=document.body.style.overflow,focused=document.activeElement as HTMLElement|null;document.body.style.overflow="hidden";
    root.current?.querySelector<HTMLButtonElement>('[aria-label="Exit expanded studio"],[aria-label="Exit fullscreen"]')?.focus();
    function key(e:KeyboardEvent){if(e.key==="Escape"){setExpanded(false);}}
    document.addEventListener("keydown",key);return()=>{document.body.style.overflow=prev;document.removeEventListener("keydown",key);focused?.focus();};
  },[expanded]);
  function select(id:string|null){
    const item=items.find(f=>f.id===id);
    usePlannerStore.setState({selectedItemId:id,selectedCategory:item?furnitureCategory(item):null});
    if(id&&view==="3d")setPanel("item");
  }
  function open(next:Panel){if(next==="style"&&!allowed3D){openUpgrade("room-3d");return;}setPanel(next);setMobileOpen(true);if(next!=="item")setMoveMode(false);}
  function preset(next:CameraView){setCamera(next);scene.current?.preset(next);}
  const titles:Record<Panel,string>={furnish:"Furniture",style:"Style & light",room:"Room details",shop:"Shopping list",item:"Selected item",checks:"Placement checks",help:"Studio guide"};
  return <div ref={root} className={s.studio+" "+(expanded?s.expanded:"")} data-testid="planner-studio"
    onKeyDown={e=>{const target=e.target as HTMLElement;
      if(expanded&&e.key==="Tab"){
        const nodes=Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')??[]).filter(n=>n.getClientRects().length>0&&!n.closest('[aria-hidden="true"],[inert]'));
        const first=nodes[0],last=nodes[nodes.length-1];
        if(e.shiftKey&&target===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&target===last){e.preventDefault();first?.focus();}
      }
      if(target.closest("input,textarea,select,[contenteditable=true]"))return;
      if(!editingRoom&&view==="3d"&&allowed3D&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();e.stopPropagation();e.shiftKey?history.redo():history.undo();}
      if(e.key==="Escape"){setMobileOpen(false);setMoveMode(false);}}}>
    <header className={s.header}>
      <div className={s.titleBlock}><p className={s.eyebrow}>Dormscape / Room studio</p><h1>Your room, <em>in perspective.</em></h1><p>{subtitle}</p></div>
      <div className={s.viewSwitch} role="group" aria-label="Planner view"><button disabled={editingRoom} aria-pressed={view==="2d"} onClick={()=>{setView("2d");setMoveMode(false);}}>2D plan</button><button disabled={editingRoom} aria-pressed={view==="3d"} onClick={enter3D}>3D room{!allowed3D&&<small> Pro</small>}</button></div>
      <div className={s.actions} inert={preview}>{editingRoom?<span className={s.editingNotice}>Room edits are a draft until you apply them.</span>:<ActionBar products={products} getPng={()=>view==="3d"?scene.current?.exportPNG()??null:get2DPng()} onShop={()=>open("shop")} shopOpen={mobileOpen&&activePanel==="shop"}/>}</div>
    </header>
    {extras&&!editingRoom&&<div className={s.extras}>{extras}</div>}
    {editingRoom ? <section className={s.roomEditor} aria-label="Edit room walls and openings">
      <RoomEditor initialRoom={room} furniture={visibleFurniture(items,hidden,excluded)} onCancel={()=>setEditingRoom(false)} onComplete={result=>{usePlannerStore.getState().updateRoomGeometry(result.outline,result.origin);setEditingRoom(false);setPanel("room");}}/>
    </section> : <div className={s.workspace+" "+(view==="2d"?s.workspacePlan:"")}>
      {view==="2d"?<div ref={setToolsHost} className={s.planToolsHost} aria-label="Floor plan tools"/>:<nav className={s.rail} aria-label="Studio tools" inert={preview}>
        {([["shop","⊞","Shop"],["style","◐","Style"],["room","⌑","Room"],["furnish","▦","Arrange"]] as const).map(([key,icon,label])=><button key={key} aria-pressed={activePanel===key} onClick={()=>open(key)}><span aria-hidden="true">{icon}</span>{label}</button>)}
      </nav>}
      <section className={s.viewport} aria-label="Room workspace">
        {view==="3d"&&<div className={s.viewportTop}><span className={s.spaceBadge}>{view==="3d"?"LIVE 3D / ":"2D / "}{room.lengthFt} × {room.widthFt} ft</span><button aria-label={expanded?"Exit expanded studio":"Expand studio"} onClick={()=>setExpanded(v=>!v)}>{expanded?"Exit fullscreen":"Expand ↗"}</button></div>}
        <div className={s.renderArea}>
          <div className={s.sceneLayer} style={{visibility:view==="3d"?"visible":"hidden",pointerEvents:view==="3d"?"auto":"none"}} aria-hidden={view!=="3d"}>
            {(allowed3D||view==="3d")&&<RoomScene ref={scene} room={room} items={items} hidden={hidden} excluded={excluded} locked={locked} selectedId={selectedId} style={style} products={products} snap={snap} walls={walls} moveMode={moveMode} preview={preview}
              onSelect={select} onMove={(id,x,y)=>usePlannerStore.getState().moveItem(id,x,y)} onFallback={()=>setView("2d")}/>}
          </div>
          <div className={s.canvasLayer} style={{display:view==="2d"?"block":"none"}}><CanvasControlsContext.Provider value={{host:toolsHost,active:view==="2d",expanded,editRoom,expand:()=>setExpanded(v=>!v),reset:()=>setResetConfirm(true),shop:()=>open("shop")}}>{canvas}</CanvasControlsContext.Provider></div>
        </div>
        {view==="3d"&&<>
          <div className={s.cameraBar} role="group" aria-label="Camera controls" inert={preview}>
            <button aria-pressed={camera==="room"} onClick={()=>preset("room")}>Room</button>
            <button aria-pressed={camera==="top"} onClick={()=>preset("top")}>Top</button>
            <button aria-pressed={camera==="inside"} onClick={()=>preset("inside")}>Inside</button>
            <span className={s.separator}/><button aria-label="Zoom out" disabled={camera==="inside"} onClick={()=>scene.current?.zoom(1.15)}>−</button><button aria-label="Zoom in" disabled={camera==="inside"} onClick={()=>scene.current?.zoom(.87)}>+</button>

          </div>
          {roomOutlineMissing(room)&&<button className={s.openingsHint} onClick={editRoom}>Doors and windows not set. Add openings ↗</button>}
          <p className={s.gestureHint}>{preview?"Your room, previewed. Unlock Pro to explore and arrange it.":moveMode?"Move mode: drag the selected furniture. Choose Stop moving when done.":"Drag empty space to look around. Select a piece to arrange it."}</p>
        </>}
        {view==="3d"&&<div className={s.editBar} inert={preview}>
          <button disabled={!history.canUndo} onClick={history.undo}>Undo</button><button disabled={!history.canRedo} onClick={history.redo}>Redo</button>
          {view==="3d"&&<><label><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/>Snap</label></>}
          <button onClick={editRoom}>Edit walls &amp; doors</button>
          <button onClick={()=>open("help")}>How to use</button>
        </div>}
        {resetConfirm&&<div className={s.resetConfirm} role="group" aria-label="Confirm layout reset"><p>Restore the original furniture arrangement? You can undo this.</p><div className={s.buttonRow}><button onClick={()=>{onReset();setResetConfirm(false);}}>Restore layout</button><button onClick={()=>setResetConfirm(false)}>Keep my changes</button></div></div>}
        {view==="3d"&&unplaced&&<div className={s.unplaced} inert={preview}>{unplaced}</div>}
      </section>
      {compact&&mobileOpen&&<button className={s.shopBackdrop} aria-label="Close studio panel" onClick={()=>setMobileOpen(false)}/>}
      <aside ref={shopPanel} id="studio-panel" className={s.panel+" "+(mobileOpen?s.mobileOpen:"")} aria-label={titles[activePanel]} inert={preview||(compact&&!mobileOpen)} role={compact&&mobileOpen?"dialog":undefined} aria-modal={compact&&mobileOpen?true:undefined}
        onKeyDown={e=>{if(!compact||!mobileOpen)return;
          if(e.key==="Escape"){e.stopPropagation();setMobileOpen(false);}
          if(e.key==="Tab"){const nodes=Array.from(shopPanel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')??[]).filter(n=>n.getClientRects().length>0);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
        }}>
        <div className={s.panelHeading}><button className={s.mobileSheetTitle} aria-expanded={mobileOpen} onClick={()=>setMobileOpen(v=>!v)}>{titles[activePanel]} <span aria-hidden="true">{mobileOpen?"⌄":"⌃"}</span></button><strong className={s.desktopTitle}>{titles[activePanel]}</strong><button ref={closeRef} className={s.mobileClose} aria-label="Collapse panel" onClick={()=>setMobileOpen(false)}>Done</button></div>
        <div className={s.panelContent}>
          {activePanel==="furnish"&&<><p className={s.eyebrow}>Your room inventory</p><h2>Make space.</h2><p className={s.muted}>Start with one piece. Select it here or in the room, then move or rotate it. Your other tools stay out of the way.</p>
            <label className={s.field}>Find furniture<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Bed, desk, lamp…"/></label>
            <ul className={s.inventory}>{items.filter(f=>f.label.toLowerCase().includes(query.toLowerCase())).map(item=><li key={item.id}><button onClick={()=>{select(item.id);scene.current?.focus(item.id);setMobileOpen(true);}}><span className={s.itemSwatch} style={{background:item.material_color||"#d9c8af"}}/><span><strong>{item.label}</strong><small>{hidden.includes(item.id)?"Hidden":excluded.includes(furnitureCategory(item)! )&&!item.built_in?"Not in shopping list":item.movable?(item.built_in?"Dorm-provided":"Placed item"):"Fixed fixture"}</small></span><span aria-hidden="true">↗</span></button></li>)}</ul>
            {items.filter(f=>f.label.toLowerCase().includes(query.toLowerCase())).length===0&&<p className={s.note}>No matching furniture. Try another name.</p>}
            <button className={s.primary} onClick={()=>open("shop")}>Browse products ↗</button>
          </>}
          {activePanel==="item"&&<button className={s.backButton} onClick={()=>open("furnish")}>← All furniture</button>}
          {activePanel==="item"&&selected&&<ItemInspector key={selected.id} item={selected} items={items} room={room} product={selectedProduct} issues={issues.filter(i=>i.id===selected.id).map(i=>i.message)} moveMode={moveMode}
            onFocus={()=>{if(!allowed3D){openUpgrade("room-3d");return;}setCamera("room");scene.current?.focus(selected.id);}} onMoveMode={()=>{if(!allowed3D){openUpgrade("room-3d");return;}setView("3d");if(camera==="inside")preset("room");setMoveMode(v=>!v);setMobileOpen(false);}} onShop={()=>open("shop")}/>}
          {activePanel==="item"&&!selected&&<div className={s.emptySelection}>
            <div className={s.selectionArt} aria-hidden="true"><svg viewBox="0 0 220 150" fill="none"><path d="M26 108 110 66l84 42-84 42Z" fill="#e0e6ff"/><path d="M82 91V45l46-23v47" stroke="#2b4eff" strokeWidth="3"/><path d="m82 91 46-24 28 14-46 24Z" fill="#ffdc60" stroke="#17172b" strokeWidth="2"/><path d="M82 91v28m28-14v28m46-62v28" stroke="#17172b" strokeWidth="3"/><path d="m161 109 5 27 8-9 8 12 6-4-9-12 13-4Z" fill="#2b4eff" stroke="#fafaf8" strokeWidth="2"/></svg></div>
            <p className={s.eyebrow}>Your next move</p><h2>Make it yours.</h2><p>Room finishes and shopping details stay in their own tools. Select a placed piece to move it, rotate it, or dial in its dimensions.</p>
            <button className={s.primary} onClick={()=>open("furnish")}>Choose a piece ↗</button><button className={s.emptyShop} onClick={()=>open("shop")}>Explore the shopping list</button>
          </div>}
          {activePanel==="room"&&<><RoomDetails room={room} onEdit={editRoom}/><details className={s.disclosure}><summary>View &amp; layout options</summary>{allowed3D&&<label className={s.field}>Wall visibility<select aria-label="Wall visibility" value={walls} onChange={e=>setWalls(e.target.value)}><option value="auto">Automatic cutaway</option><option value="all">All walls</option><option value="hidden">Hide walls</option></select></label>}<div className={s.buttonRow}><button onClick={()=>open("checks")}>Placement checks ({new Set(issues.map(i=>i.id)).size})</button><button onClick={()=>setResetConfirm(true)}>Reset layout</button></div></details></>}
          {activePanel==="style"&&<StyleDetails room={room}/>}
          {activePanel==="shop"&&<>{view==="2d"&&unplaced}<div>{shopping}</div></>}
          {activePanel==="checks"&&<><button className={s.backButton} onClick={()=>open("room")}>← Room details</button><p className={s.eyebrow}>A second look</p><h2>Placement checks</h2><p className={s.muted}>Checks flag overlap, wall boundaries, ceiling height, and proximity to inward door swings. They are a guide, not a guarantee of fit.</p>
            {issues.length? <ul className={s.issueList}>{issues.map((issue,i)=><li key={i}><button onClick={()=>{select(issue.id);scene.current?.focus(issue.id);}}><strong>{items.find(f=>f.id===issue.id)?.label}</strong><span>{issue.message}</span></button></li>)}</ul>:<p className={s.note}>No placement conflicts detected for the visible furniture.</p>}
            {roomOutlineMissing(room)&&<p className={s.warning}>No doors or windows are recorded. Choose Edit walls &amp; doors to add their real positions and check clearance.</p>}
          </>}
          {activePanel==="help"&&<><p className={s.eyebrow}>Make yourself at home</p><h2>Your studio guide.</h2><dl className={s.helpList}><dt>Look around</dt><dd>Drag empty space. Use the camera presets to return to a familiar view.</dd><dt>Arrange</dt><dd>Drag a piece on desktop. On a phone, select it and choose Move selected first.</dd><dt>Zoom</dt><dd>Scroll, pinch, or use the zoom buttons.</dd><dt>Be precise</dt><dd>Use the selected item&apos;s position fields. Snap rounds to half-foot increments.</dd><dt>Undo</dt><dd>Use Undo or Ctrl / Command + Z. A finished drag counts as one edit.</dd><dt>Walls &amp; openings</dt><dd>Choose Edit walls &amp; doors in either view. Drag walls and corners, then add or slide doors and windows. Apply the draft to keep it, or cancel to return.</dd><dt>Save &amp; share</dt><dd>Use Save design to keep a named copy in your account. Share creates a link or exports the current view.</dd></dl><p className={s.note}>3D objects are approximate models. Product photos show the actual selected items. Switching views does not generate a new plan or use a credit.</p></>}
        </div>
      </aside>
    </div>}
    {view==="3d"&&<footer className={s.statusBar}><span>Changes kept in this tab · Save design for your account</span><button disabled={editingRoom} onClick={()=>open("shop")}><span>Shopping total</span> <strong>${total.toFixed(2)}</strong> / ${budget}{total>budget&&<b> Over budget</b>} ↗</button></footer>}
  </div>;
}
function roomOutlineMissing(room:{outline?:{openings:unknown[]}|null}){return !room.outline?.openings.length;}
