"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from "react";
import dynamic from "next/dynamic";
import Modal from "@/components/site/Modal";
import BrandLoader from "@/components/site/BrandLoader";
import { CanvasControlsContext } from "@/components/canvas/CanvasControlsContext";
import { useAuth } from "@/lib/auth-context";
import { canUse3D, isPaid } from "@/lib/plan";
import { useUpgrade } from "@/lib/upgrade-context";
import { usePlannerStore } from "@/lib/store";
import { furnitureCategory } from "@/lib/highlight";
import { productForFurniture } from "@/lib/product-model";
import type { Product, WallOpening } from "@/lib/types";
import { itemElevation, itemHeight, roomOutline, studioSettings, visibleFurniture } from "@/lib/studio";
import { feetInches } from "@/components/studio-ui/list";
import { openingAtPoint, type OpeningControls } from "@/lib/room-editing";
import { analyzeRoom, type PlanIssue } from "@/lib/planning";
import { FurnitureLibrary, LayoutPanel, PlacementPanel } from "./PlanningPanels";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import ActionBar from "@/components/products/ActionBar";
import RoomScene, {type RoomSceneHandle,type CameraView} from "./RoomScene";
import WalkIn from "./WalkIn";
import { ItemInspector, RoomDetails, StyleDetails } from "./WorkspacePanels";
import { ChevronLeft, CloseIcon, LowerIcon, PlusIcon, RaiseIcon } from "@/components/studio-ui/icons";
import s from "./Studio.module.css";

const RoomDrawCanvas=dynamic(()=>import("@/components/planner/RoomDrawCanvas"),{ssr:false,loading:()=> <BrandLoader label="Opening room measurements…"/>});
type Panel="furnish"|"style"|"room"|"shop"|"item"|"checks"|"help"|"layouts"|"roommates";
export default function WorkspaceStudio({canvas,get2DPng,focus2D,shopping,products,total,budget,subtitle,history,onReset,extras,unplaced}:{canvas:ReactNode;get2DPng:()=>string|null;focus2D:(id:string)=>void;shopping:ReactNode;products:Product[];total:number;budget:number;subtitle:string;history:{canUndo:boolean;canRedo:boolean;undo:()=>void;redo:()=>void};onReset:()=>void;extras?:ReactNode;unplaced?:ReactNode;shell?:boolean}){
  const workspace=useWorkspace();
  const room=usePlannerStore(st=>st.room)!,items=usePlannerStore(st=>st.furniture)??[];
  const style=usePlannerStore(st=>st.style)??"minimalist",hidden=usePlannerStore(st=>st.hiddenItemIds),excluded=usePlannerStore(st=>st.excluded)??[],locked=usePlannerStore(st=>st.lockedItemIds);
  const selectedId=usePlannerStore(st=>st.selectedItemId);
  const [editingRoom,setEditingRoom]=useState(false);
  const [selectedOpening,setSelectedOpening]=useState<number|null>(null),[openingError,setOpeningError]=useState("");
  const outline=roomOutline(room);
  const [toolsHost,setToolsHost]=useState<HTMLDivElement|null>(null),[compact,setCompact]=useState(false);
  const shopPanel=useRef<HTMLElement>(null);
  const view=usePlannerStore(st=>st.plannerView),setView=usePlannerStore(st=>st.setPlannerView);
  const planning=usePlannerStore(st=>st.planning);
  const [panel,setPanel]=useState<Panel>("shop"),[snap,setSnap]=useState(true),[walls,setWalls]=useState("auto"),[moveMode,setMoveMode]=useState(false);
  const [walker,setWalker]=useState<SVGGElement|null>(null);
  const [camera,setCamera]=useState<CameraView>("room"),[expanded,setExpanded]=useState(false),[mobileOpen,setMobileOpen]=useState(false),[query,setQuery]=useState(""),[resetConfirm,setResetConfirm]=useState(false);
  const scene=useRef<RoomSceneHandle>(null),root=useRef<HTMLDivElement>(null),closeRef=useRef<HTMLButtonElement>(null);
  const {profile,loading}=useAuth(),{openUpgrade}=useUpgrade();
  const allowed3D=!loading&&(canUse3D(profile)||workspace?.ownerPro===true),preview=view==="3d"&&!allowed3D;
  const activePanel=panel;
  useEffect(()=>{if(workspace?.section==="shopping")setPanel("shop");},[workspace?.section]);
  useEffect(()=>{const media=window.matchMedia("(max-width:780px)");const update=()=>{setCompact(media.matches);setMobileOpen(false);};update();media.addEventListener("change",update);return()=>media.removeEventListener("change",update);},[]);
  useEffect(()=>{if(!compact||!mobileOpen)return;const focused=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow="hidden";const frame=requestAnimationFrame(()=>closeRef.current?.focus({preventScroll:true}));return()=>{cancelAnimationFrame(frame);document.body.style.overflow=overflow;focused?.focus({preventScroll:true});};},[compact,mobileOpen]);
  function editOpenings(){open("room");}
  function enter3D(){setView("3d");setMoveMode(false);}
  const selected=items.find(f=>f.id===selectedId);
  const analysis=useMemo(()=>analyzeRoom(visibleFurniture(items,hidden,excluded),room,planning.walkwayFt),[items,hidden,excluded,room,planning.walkwayFt]);
  const issues=analysis.issues;
  const selectedProduct=selected?productForFurniture(selected,products):undefined;
  // Selection never opens a tool. Keep arranging until Edit selected is requested.
  useEffect(()=>{if(!selectedId&&panel==="item"){setPanel("shop");setMobileOpen(false);}},[selectedId,panel]);
  useEffect(()=>{
    if(!expanded)return;const prev=document.body.style.overflow,focused=document.activeElement as HTMLElement|null;document.body.style.overflow="hidden";
    root.current?.querySelector<HTMLButtonElement>('[aria-label="Exit expanded studio"],[aria-label="Exit fullscreen"]')?.focus();
    function key(e:KeyboardEvent){if(e.key==="Escape"){setExpanded(false);}}
    document.addEventListener("keydown",key);return()=>{document.body.style.overflow=prev;document.removeEventListener("keydown",key);focused?.focus();};
  },[expanded]);
  function select(id:string|null){
    setSelectedOpening(null);
    const item=items.find(f=>f.id===id);
    usePlannerStore.setState({selectedItemId:id,selectedCategory:item?furnitureCategory(item):null});
  }
  function open(next:Panel){setPanel(next);if(next!=="item")usePlannerStore.getState().updatePlanning({lastPanel:next});setMobileOpen(true);if(next!=="item")setMoveMode(false);}
  function selectOpening(index:number|null){
    setSelectedOpening(index);setOpeningError("");
    if(index!==null){usePlannerStore.setState({selectedItemId:null,selectedCategory:null,hoveredCategory:null});setMoveMode(false);}
  }
  function commitOpening(index:number|null,opening:WallOpening){
    const current=roomOutline(usePlannerStore.getState().room!);
    const error=usePlannerStore.getState().updateOpenings(index===null?[...current.openings,opening]:current.openings.map((o,i)=>i===index?opening:o));
    setOpeningError(error??"");
    if(!error){selectOpening(index??current.openings.length);setMobileOpen(false);}
  }
  const openingControls:OpeningControls={selected:selectedOpening,select:selectOpening,
    preview:(target,point)=>{const current=roomOutline(usePlannerStore.getState().room!);const opening=typeof target==="number"?current.openings[target]:target;return opening?openingAtPoint(current,opening,point,typeof target==="number"?target:-1):null;},
    commit:commitOpening};
  function addOpening(kind:WallOpening["kind"]){
    const opening=openingAtPoint(outline,kind);
    if(opening)commitOpening(null,opening);else setOpeningError("No clear wall space left for another "+kind+".");
  }
  function removeOpening(index:number){usePlannerStore.getState().updateOpenings(outline.openings.filter((_,i)=>i!==index));selectOpening(null);}
  function flipOpening(index:number){const opening=outline.openings[index];if(opening)commitOpening(index,{...opening,swing:((opening.swing??0)+1)%4});}
  function openingKey(e:ReactKeyboardEvent){
    const opening=selectedOpening===null?null:outline.openings[selectedOpening];
    if(preview||!opening||e.target instanceof HTMLElement&&e.target.closest("input,textarea,select"))return;
    if(e.key==="Delete"||e.key==="Backspace"){e.preventDefault();e.stopPropagation();removeOpening(selectedOpening!);return;}
    if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;
    e.preventDefault();e.stopPropagation();
    const edge=(opening.edge+(e.key==="ArrowDown"?1:e.key==="ArrowUp"?-1:0)+outline.points.length)%outline.points.length;
    const a=outline.points[edge],b=outline.points[(edge+1)%outline.points.length],length=Math.hypot(b.x-a.x,b.y-a.y);
    const along=e.key==="ArrowLeft"||e.key==="ArrowRight"?opening.offset_ft+opening.width_ft/2+(e.key==="ArrowLeft"?-.25:.25):length/2;
    const next=openingControls.preview(selectedOpening!,{x:a.x+(b.x-a.x)*along/length,y:a.y+(b.y-a.y)*along/length});
    if(next)commitOpening(selectedOpening!,next);
  }
  function highlight(issue:PlanIssue){
    if(issue.itemId){usePlannerStore.setState({selectedItemId:issue.itemId});if(view==="3d")scene.current?.focus(issue.itemId);else focus2D(issue.itemId);}
    if(issue.region){usePlannerStore.setState({checkHighlight:{points:issue.region,label:issue.title}});setView("2d");}
    setPanel("checks");if(compact)setMobileOpen(false);
  }
  /** Choose a view: it comes back where you left it; choosing the view you're in recentres it. */
  function preset(next:CameraView){setCamera(next);scene.current?.preset(next);}
  // Up and down in 3D, 3 inches a step (Shift-drag in the room, or a wall piece along its wall, does the same).
  const movable=!!selected&&selected.movable&&!locked.includes(selected.id),elevation=selected?itemElevation(selected,items):0;
  const topOut=selected?Math.max(0,studioSettings(room.studio).ceilingFt-itemHeight(selected)):0;
  const lift=(delta:number)=>{if(!selected||!movable)return;const next=Math.round(Math.max(0,Math.min(topOut,elevation+delta))*4)/4;
    if(Math.abs(next-elevation)>.001)usePlannerStore.getState().moveItem(selected.id,selected.x_ft,selected.y_ft,next);};
  // A selected door or window, a reset prompt or an error: in the bar under the room (or the plan), never over it.
  const opening=selectedOpening!==null&&!preview?outline.openings[selectedOpening]:undefined;
  const notice=resetConfirm?<div className={s.barNotice} role="group" aria-label="Confirm layout reset"><p>Restore starter positions for existing furniture? Added pieces and locked items stay. You can undo this.</p><button type="button" className={s.inkBtn} onClick={()=>{onReset();setResetConfirm(false);}}>Restore layout</button><button type="button" onClick={()=>setResetConfirm(false)}>Keep my changes</button></div>
    :opening||openingError?<>
      {openingError&&<p className={s.openingError} role="status">{openingError}</p>}
      {opening&&<div className={s.openingActions} role="group" aria-label="Selected opening">
        <strong>{opening.kind==="door"?"Door":"Window"}</strong><span>Drag to move</span>
        {opening.kind==="door"&&<button type="button" onClick={()=>flipOpening(selectedOpening!)}>Flip door</button>}
        <button type="button" onClick={()=>removeOpening(selectedOpening!)}>Remove</button><button type="button" aria-label="Deselect opening" onClick={()=>selectOpening(null)}><CloseIcon size={16}/></button>
      </div>}
    </>:null;
  const titles:Record<Panel,string>={furnish:"Furniture",style:"Style & light",room:"Room details",shop:"Shopping list",item:"Selected item",checks:"Placement checks",help:"Studio guide",layouts:"Layout ideas",roommates:"Roommates"};
  return <div ref={root} className={s.studio+" "+s.projectStudio+" "+(expanded?s.expanded:"")} data-testid="workspace-studio" data-section={workspace?.section} onKeyDownCapture={openingKey}
    onKeyDown={e=>{const target=e.target as HTMLElement;
      if(expanded&&e.key==="Tab"){
        const nodes=Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')??[]).filter(n=>n.getClientRects().length>0&&!n.closest('[aria-hidden="true"],[inert]'));
        const first=nodes[0],last=nodes[nodes.length-1];
        if(e.shiftKey&&target===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&target===last){e.preventDefault();first?.focus();}
      }
      if(target.closest("input,textarea,select,[contenteditable=true]"))return;
      if(view==="3d"&&allowed3D&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();e.stopPropagation();e.shiftKey?history.redo():history.undo();}
      if(e.key==="Escape"){setMobileOpen(false);setMoveMode(false);setPanel("shop");}}}>
    <header className={s.header}>
      <div className={s.titleBlock}><p className={s.eyebrow}>Your room / Make it yours</p><p>{subtitle}</p></div>
      <div className={s.viewSwitch} role="group" aria-label="Planner view"><button type="button" aria-pressed={view==="2d"} onClick={()=>{setView("2d");setMoveMode(false);}}>2D</button><button type="button" aria-pressed={view==="3d"} onClick={enter3D} aria-label={allowed3D?"3D":"3D, a Pro feature"}>3D<span className={s.proTag} aria-hidden="true">Pro</span></button></div>
      <div className={s.actions}><button type="button" className={s.backButton} onClick={()=>open("shop")}>Shopping list · ${total.toFixed(2)}</button><ActionBar exportsOnly products={products} getPng={()=>view==="3d"?scene.current?.exportPNG()??null:get2DPng()} onShop={()=>open("shop")} shopOpen={mobileOpen&&activePanel==="shop"}/></div>
    </header>
    {extras&&<div className={s.extras}>{extras}</div>}
    <div className={s.workspace+" "+(view==="2d"?s.workspacePlan:"")} data-tool-open={activePanel!=="shop"}>
      <div className={s.planToolsHost} aria-label="Workspace tools">
        <nav className={s.workspaceTasks} aria-label="Planning tasks">{selectedId&&<button onClick={()=>open("item")}>Edit selected</button>}<button onClick={()=>open("furnish")}><PlusIcon size={14}/>Furniture</button><button onClick={()=>open("layouts")}>Layout ideas</button><button onClick={()=>open("checks")}>Checks <b>{issues.filter(i=>i.level==="warning").length}</b></button><button onClick={()=>open("shop")}>Shopping list</button></nav>
        {view==="2d"?<div ref={setToolsHost}/>:<nav className={s.spatialTools} aria-label="3D tools" inert={preview}>
          <strong>Room tools</strong><div className={s.toolPair}><button aria-pressed={!moveMode} onClick={()=>setMoveMode(false)}>Select</button><button aria-pressed={moveMode} onClick={()=>setMoveMode(v=>!v)}>Move</button><button disabled={!history.canUndo} onClick={history.undo}>Undo</button><button disabled={!history.canRedo} onClick={history.redo}>Redo</button></div>
          <span>Camera</span><div className={s.toolPair}>{([["room","Dollhouse"],["top","Top"],["inside","Walk in"]] as const).map(([mode,label])=><button key={mode} aria-pressed={camera===mode} onClick={()=>preset(mode)}>{label}</button>)}<button onClick={()=>{setCamera("room");scene.current?.fit();}}>Fit</button></div><div className={s.toolPair}><button aria-label="Zoom out" disabled={camera==="inside"} onClick={()=>scene.current?.zoom(1.15)}>− Zoom</button><button aria-label="Zoom in" disabled={camera==="inside"} onClick={()=>scene.current?.zoom(.87)}>+ Zoom</button></div>
          <label><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/>Snap to grid</label><button onClick={editOpenings}>Doors &amp; windows</button><button aria-label={expanded?"Exit expanded studio":"Expand studio"} onClick={()=>setExpanded(v=>!v)}>{expanded?"Exit fullscreen":"Expand"}</button><button onClick={()=>open("help")}>Help &amp; keys</button>
        </nav>}

      </div>
      <section className={s.viewport} aria-label="Room workspace">
        <div className={s.renderArea}>
          <div className={s.sceneLayer} style={{visibility:view==="3d"?"visible":"hidden",pointerEvents:view==="3d"?"auto":"none"}} aria-hidden={view!=="3d"}>
            {(allowed3D||view==="3d")&&<RoomScene ref={scene} walker={walker} onCamera={setCamera} room={room} items={items} hidden={hidden} excluded={excluded} locked={locked} selectedId={selectedId} style={style} products={products} snap={snap} walls={walls} moveMode={moveMode} preview={preview} openingControls={openingControls}
              onSelect={select} onMove={(id,x,y,up)=>usePlannerStore.getState().moveItem(id,x,y,up)} onFallback={()=>setView("2d")}/>}
          </div>
          <div className={s.canvasLayer} style={{display:view==="2d"?"block":"none"}}><CanvasControlsContext.Provider value={{host:toolsHost,active:view==="2d",expanded,editOpenings,openings:openingControls,expand:()=>setExpanded(v=>!v),reset:()=>setResetConfirm(true),shop:()=>open("shop"),addPiece:()=>open("furnish"),variant:"workspace",notice}}>{canvas}</CanvasControlsContext.Provider></div>
        </div>
        {/* 3D: hints, the selection's height and walking live in a bar under the room, never over it. */}
        {view==="3d"&&<div className={s.sceneBar} data-edge="bottom">
          {camera==="inside"?<WalkIn room={room} items={visibleFurniture(items,hidden,excluded)} onBack={()=>preset("room")} onWalker={setWalker} onWalk={input=>scene.current?.walk(input)}/>
            :notice?<div className={s.barNoticeWrap}>{notice}</div>:<>
            {unplaced&&<div className={s.unplaced} inert={preview}>{unplaced}</div>}
            {selected&&!preview?<div className={s.pieceBar} role="group" aria-label={`Selected: ${selected.label}`}>
              <span className={s.pieceName}><strong>{selected.label}</strong><small>{elevation>.01?`${feetInches(elevation)} above the floor`:"On the floor"}{movable?" · Shift-drag to lift it":""}</small></span>
              <span className={s.liftPair} role="group" aria-label="Height">
                <button type="button" aria-label="Lower" title="Lower 3 in" disabled={!movable||elevation<=.001} onClick={()=>lift(-.25)}><LowerIcon size={16}/></button>
                <button type="button" aria-label="Raise" title="Raise 3 in" disabled={!movable||elevation>=topOut-.001} onClick={()=>lift(.25)}><RaiseIcon size={16}/></button>
              </span>
            </div>
            :roomOutlineMissing(room)?<button type="button" className={s.openingsHint} onClick={editOpenings}>Doors and windows not set. Add openings</button>
            :<p className={s.sceneHint}>{preview?"Your room, previewed. Unlock Pro to explore and arrange it.":moveMode?"Move mode: drag the selected furniture. Choose Select when done.":"Drag empty space to look around · Select a piece to arrange it · Shift-drag to lift it"}</p>}
          </>}
        </div>}
      </section>
      {compact&&mobileOpen&&<button className={s.shopBackdrop} aria-label="Close studio panel" onClick={()=>setMobileOpen(false)}/>}
      {(activePanel!=="shop"||compact)&&<aside ref={shopPanel} id="studio-panel" className={s.panel+" "+(activePanel!=="shop"&&!compact?s.projectDrawer:"")+" "+(mobileOpen?s.mobileOpen:"")} aria-label={titles[activePanel]} inert={preview||(compact&&!mobileOpen)} role={compact&&mobileOpen?"dialog":undefined} aria-modal={compact&&mobileOpen?true:undefined}
        onKeyDown={e=>{if(!compact||!mobileOpen)return;
          if(e.key==="Escape"){e.stopPropagation();setMobileOpen(false);}
          if(e.key==="Tab"){const nodes=Array.from(shopPanel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')??[]).filter(n=>n.getClientRects().length>0);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
        }}>
        <div className={s.panelHeading}><button className={s.mobileSheetTitle} aria-expanded={mobileOpen} onClick={()=>setMobileOpen(v=>!v)}>{titles[activePanel]}</button><strong className={s.desktopTitle}>{titles[activePanel]}</strong>{activePanel!=="shop"&&<button className={s.drawerClose} aria-label="Close room tool" onClick={()=>setPanel("shop")}><CloseIcon size={16}/></button>}<button ref={closeRef} className={s.mobileClose} aria-label="Collapse panel" onClick={()=>setMobileOpen(false)}>Done</button></div>
        {activePanel!=="shop"&&<nav className={s.panelTabs} aria-label="Room tools">{([["furnish","Furniture"],["layouts","Layouts"],["room","Room"],["style","Style"]] as const).map(([key,label])=><button key={key} aria-pressed={activePanel===key||(activePanel==="item"&&key==="furnish")} onClick={()=>open(key)}>{label}</button>)}</nav>}
        {activePanel==="shop"?<div className={s.panelList}>{shopping}</div>:<div className={s.panelContent}>
          {activePanel==="furnish"&&<FurnitureLibrary onSelect={id=>{select(id);open("item");}}/>}
          {activePanel==="layouts"&&<LayoutPanel/>}
          {activePanel==="item"&&<button className={s.backButton} onClick={()=>open("furnish")}><ChevronLeft size={16}/>All furniture</button>}
          {activePanel==="item"&&selected&&<ItemInspector key={selected.id} item={selected} items={items} room={room} product={selectedProduct} view={view} issues={issues.filter(i=>i.itemId===selected.id).map(i=>i.title)} moveMode={moveMode}
            onFocus={()=>{if(view==="2d"){focus2D(selected.id);setMobileOpen(false);return;}setCamera("room");scene.current?.focus(selected.id);}} onMoveMode={()=>{if(!allowed3D){openUpgrade("room-3d");return;}setView("3d");if(camera==="inside")preset("room");setMoveMode(v=>!v);setMobileOpen(false);}} onShop={()=>open("shop")}/>}
          {activePanel==="item"&&!selected&&<div className={s.emptySelection}>
            <div className={s.selectionArt} aria-hidden="true"><svg viewBox="0 0 220 150" fill="none"><path d="M26 108 110 66l84 42-84 42Z" fill="#e0e6ff"/><path d="M82 91V45l46-23v47" stroke="#2b4eff" strokeWidth="3"/><path d="m82 91 46-24 28 14-46 24Z" fill="#ffdc60" stroke="#17172b" strokeWidth="2"/><path d="M82 91v28m28-14v28m46-62v28" stroke="#17172b" strokeWidth="3"/><path d="m161 109 5 27 8-9 8 12 6-4-9-12 13-4Z" fill="#2b4eff" stroke="#fafaf8" strokeWidth="2"/></svg></div>
            <p className={s.eyebrow}>Your next move</p><h2>Make it yours.</h2><p>Room finishes and shopping details stay in their own tools. Select a placed piece to move it, rotate it, or dial in its dimensions.</p>
            <button className={s.primary} onClick={()=>open("furnish")}>Choose a piece</button><button className={s.emptyShop} onClick={()=>open("shop")}>Explore the shopping list</button>
          </div>}
          {activePanel==="room"&&<>{view==="2d"&&<button className={s.backButton} onClick={()=>open("shop")}><ChevronLeft size={16}/>Shopping list</button>}<div className={s.roomTrust}><strong>{room.dimsEstimated?"Estimated room dimensions":room.source==="catalog"?"Catalog room dimensions":"Your room measurements"}</strong><p>{room.dimsEstimated?"Confirm these dimensions with your housing office before buying furniture.":room.source==="catalog"?"Check your specific room and school-provided furniture with housing. Models start with generic furniture sizes.":"Furniture defaults are approximate until you measure them."}</p><button disabled={loading} onClick={()=>{if(!isPaid(profile)&&!workspace?.ownerPro){openUpgrade("draw-room");return;}setEditingRoom(true);setMobileOpen(false);}}>Edit walls &amp; room shape{!isPaid(profile)&&!workspace?.ownerPro&&" · Plus"}</button></div><RoomDetails room={room} controls={openingControls} onAdd={addOpening} onRemove={removeOpening} onFlip={flipOpening}/><details className={s.disclosure}><summary>View &amp; layout options</summary>{allowed3D&&<label className={s.field}>Wall visibility<select aria-label="Wall visibility" value={walls} onChange={e=>setWalls(e.target.value)}><option value="auto">Automatic cutaway</option><option value="all">All walls</option><option value="hidden">Hide walls</option></select></label>}<div className={s.buttonRow}><button onClick={()=>open("checks")}>Placement checks ({issues.filter(i=>i.level==="warning").length})</button><button onClick={()=>setResetConfirm(true)}>Reset layout</button></div></details></>}
          {activePanel==="style"&&<StyleDetails room={room}/>}
          {activePanel==="checks"&&<PlacementPanel analysis={analysis} onHighlight={highlight}/>}
          {activePanel==="help"&&<><p className={s.eyebrow}>Make yourself at home</p><h2>Your studio guide.</h2><dl className={s.helpList}><dt>Look around</dt><dd>Drag empty space. Use the camera presets to return to a familiar view.</dd><dt>Arrange</dt><dd>Drag a piece on desktop. On a phone, tap it, then drag it.</dd><dt>Zoom</dt><dd>Scroll, pinch, or use the zoom buttons.</dd><dt>Be precise</dt><dd>Use the selected item&apos;s position fields. Snap rounds to half-foot increments.</dd><dt>Undo</dt><dd>Use Undo or Ctrl / Command + Z. A finished drag counts as one edit.</dd><dt>Doors &amp; windows</dt><dd>Choose Doors &amp; windows in either view. Drag a door or window onto a wall, or tap to add one and drag it into place. Select a door to flip it. Changes appear immediately in both views. Use Undo to reverse an edit.</dd><dt>Save &amp; share</dt><dd>Changes save automatically. Invite roommates from the room header, or use Export for a PNG and shopping list PDF.</dd></dl><p className={s.note}>Furniture is editable in both views. Pro unlocks the 3D room. 3D objects are approximate models. Product photos show the actual selected items. Switching views does not generate a new plan or use a credit.</p></>}
        </div>}
      </aside>}
      {!compact&&<aside id={activePanel==="shop"?"studio-panel":undefined} className={s.panel} aria-label="Shopping list"><div className={s.panelList}>{shopping}</div></aside>}
    </div>
    {editingRoom&&(isPaid(profile)||workspace?.ownerPro)&&<Modal role="dialog" aria-modal="true" aria-label="Edit room shape" className={s.geometryModal} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();setEditingRoom(false);}}}><div><RoomDrawCanvas initialRoom={room} furniture={items} onCancel={()=>setEditingRoom(false)} onComplete={result=>{usePlannerStore.getState().updateRoomGeometry(result.outline,result.origin);setEditingRoom(false);}}/></div></Modal>}
    <footer className={s.statusBar}><span>Manual edits use no design credits.</span><button onClick={()=>open("shop")}><span>Shopping total</span> <strong>${total.toFixed(2)}</strong> / ${budget}{total>budget&&<b> Over budget</b>}</button></footer>
  </div>;
}
function roomOutlineMissing(room:{outline?:{openings:unknown[]}|null}){return !room.outline?.openings.length;}
