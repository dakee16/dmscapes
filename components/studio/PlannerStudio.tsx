"use client";
import { useEffect, useRef, useState, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CanvasControlsContext } from "@/components/canvas/CanvasControlsContext";
import { useAuth } from "@/lib/auth-context";
import { canUse3D, isPaid } from "@/lib/plan";
import { useUpgrade } from "@/lib/upgrade-context";
import { usePlannerStore } from "@/lib/store";
import { furnitureCategory } from "@/lib/highlight";
import { designDisplayName, styleFor } from "@/lib/styles";
import { track } from "@/lib/analytics";
import { roomTypeLabel } from "@/lib/format";
import { getSchool } from "@/lib/schools";
import { alternativesOf } from "@/lib/catalog";
import type { Product, WallOpening } from "@/lib/types";
import { placementIssues, roomOutline, studioSettings, visibleFurniture } from "@/lib/studio";
import { openingAtPoint, openingCenter, type OpeningControls } from "@/lib/room-editing";
import ActionBar from "@/components/products/ActionBar";
import BudgetTracker from "@/components/products/BudgetTracker";
import Wordmark from "@/components/site/Wordmark";
import Modal from "@/components/site/Modal";
import BrandLoader from "@/components/site/BrandLoader";
import { useStudioUI } from "@/components/studio-ui/StudioUI";
import { CameraIcon, ChevronLeft, CloseIcon, ExpandIcon, MinusIcon, MoveIcon, PencilIcon, PlanIcon, PlusIcon, RedoIcon, RotateIcon, SwapIcon, TrashIcon, UndoIcon } from "@/components/studio-ui/icons";
import RoomScene, {type RoomSceneHandle,type CameraView} from "./RoomScene";
import WalkIn from "./WalkIn";
import { FloorSwatches, ItemInspector, LightSwitch, RoomDetails, StyleDetails } from "./StudioPanels";
import s from "./Studio.module.css";

const RoomDrawCanvas=dynamic(()=>import("@/components/planner/RoomDrawCanvas"),{ssr:false,loading:()=> <BrandLoader label="Opening room measurements…"/>});
type Panel="furnish"|"style"|"room"|"shop"|"item"|"checks"|"help";
const CAMERAS:[CameraView,string][]=[["room","Dollhouse"],["top","Top"],["inside","Walk in"]];

/**
 * The planner studio on /plan/result: the plan (2D, Konva) or the room (3D,
 * Pro) beside the shopping list, as one object. With `shell` it renders the
 * planner's app bar and the page's <main>.
 */
export default function PlannerStudio({canvas,get2DPng,shopping,products,total,budget,subtitle,history,onReset,unplaced,headerAction,shell=false}:{focus2D?:(id:string)=>void;canvas:ReactNode;get2DPng:()=>string|null;shopping:ReactNode;products:Product[];total:number;budget:number;subtitle:string;history:{canUndo:boolean;canRedo:boolean;undo:()=>void;redo:()=>void};onReset:()=>void;extras?:ReactNode;unplaced?:ReactNode;
  /** Shown right after the 2D/3D tabs (the planner's Open workspace). */
  headerAction?:ReactNode;shell?:boolean}){
  const room=usePlannerStore(st=>st.room)!,items=usePlannerStore(st=>st.furniture)??[];
  const style=usePlannerStore(st=>st.style)??"minimalist",hidden=usePlannerStore(st=>st.hiddenItemIds),excluded=usePlannerStore(st=>st.excluded)??[],locked=usePlannerStore(st=>st.lockedItemIds);
  const college=usePlannerStore(st=>st.college),dorm=usePlannerStore(st=>st.dorm),customVibe=usePlannerStore(st=>st.customVibe),planning=usePlannerStore(st=>st.planning);
  const [editingRoom,setEditingRoom]=useState(false);
  const selectedId=usePlannerStore(st=>st.selectedItemId);
  const [selectedOpening,setSelectedOpening]=useState<number|null>(null),[openingError,setOpeningError]=useState("");
  const outline=roomOutline(room);
  const [toolsHost,setToolsHost]=useState<HTMLDivElement|null>(null),[compact,setCompact]=useState(false);
  const shopPanel=useRef<HTMLElement>(null);
  const view=usePlannerStore(st=>st.plannerView),setView=usePlannerStore(st=>st.setPlannerView);
  const [panel,setPanel]=useState<Panel>(()=>usePlannerStore.getState().plannerView==="3d"?"style":"shop"),[snap,setSnap]=useState(true),[walls,setWalls]=useState("auto"),[moveMode,setMoveMode]=useState(false);
  const [camera,setCamera]=useState<CameraView>("room"),[expanded,setExpanded]=useState(false),[mobileOpen,setMobileOpen]=useState(false),[query,setQuery]=useState(""),[resetConfirm,setResetConfirm]=useState(false);
  const [renaming,setRenaming]=useState(false),[card,setCard]=useState<HTMLDivElement|null>(null),[walker,setWalker]=useState<SVGGElement|null>(null);
  const scene=useRef<RoomSceneHandle>(null),root=useRef<HTMLDivElement>(null),closeRef=useRef<HTMLButtonElement>(null);
  const sheetDrag=useRef<{y:number;h:number;moved:boolean;v:number;lastY:number;lastT:number}|null>(null),sheetCustom=useRef<{sheet:string;px:number}|null>(null);
  const {profile,loading}=useAuth(),{openUpgrade}=useUpgrade();
  const ui=useStudioUI();
  const allowed3D=!loading&&canUse3D(profile),preview=view==="3d"&&!allowed3D;
  // 2D keeps the shopping list beside the plan; room details and checks borrow its column.
  const activePanel:Panel=view==="2d"?(panel==="room"||panel==="checks"?panel:"shop"):panel==="furnish"&&!compact?"style":panel;
  useEffect(()=>{const media=window.matchMedia("(max-width:780px)");const update=()=>{setCompact(media.matches);setMobileOpen(false);};update();media.addEventListener("change",update);return()=>media.removeEventListener("change",update);},[]);
  // Phone 3D: the panel opens as a sheet that holds focus until it's closed.
  useEffect(()=>{if(!compact||!mobileOpen||view!=="3d")return;const focused=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow="hidden";const frame=requestAnimationFrame(()=>closeRef.current?.focus({preventScroll:true}));return()=>{cancelAnimationFrame(frame);document.body.style.overflow=overflow;focused?.focus({preventScroll:true});};},[compact,mobileOpen,view]);
  function editOpenings(){open("room");}
  function enter3D(){setView("3d");setMoveMode(false);if(panel==="shop")setPanel("style");}
  const selected=items.find(f=>f.id===selectedId),walking=view==="3d"&&camera==="inside";
  const issues=placementIssues(visibleFurniture(items,hidden,excluded),room,studioSettings(room.studio));
  const selectedProduct=selected?(products.find(p=>p.id===selected.id)||products.find(p=>p.category===furnitureCategory(selected))):undefined;
  const selectedMovable=!!selected&&selected.movable&&!locked.includes(selected.id);
  useEffect(()=>{
    if(!expanded)return;const prev=document.body.style.overflow,focused=document.activeElement as HTMLElement|null;document.body.style.overflow="hidden";
    root.current?.querySelector<HTMLButtonElement>('[aria-label="Exit expanded studio"],[aria-label="Exit fullscreen"],[aria-label="Exit full screen"]')?.focus();
    function key(e:KeyboardEvent){if(e.key==="Escape"){setExpanded(false);}}
    document.addEventListener("keydown",key);return()=>{document.body.style.overflow=prev;document.removeEventListener("keydown",key);focused?.focus();};
  },[expanded]);
  function select(id:string|null){
    setSelectedOpening(null);
    const item=items.find(f=>f.id===id);
    usePlannerStore.setState({selectedItemId:id,selectedCategory:item?furnitureCategory(item):null});
  }
  function open(next:Panel){
    if(next==="style"&&!allowed3D){openUpgrade("room-3d");return;}
    setPanel(next);
    if(view==="2d"&&compact)ui?.setSheet("full");
    if(view==="3d")setMobileOpen(true);
    if(next!=="item")setMoveMode(false);
  }
  function selectOpening(index:number|null){
    setSelectedOpening(index);setOpeningError("");
    if(index!==null){usePlannerStore.setState({selectedItemId:null,selectedCategory:null,hoveredCategory:null});setPanel("room");setMoveMode(false);}
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
  function preset(next:CameraView){setCamera(next);scene.current?.preset(next);}
  // Phone 2D sheet: a dragged height sticks until something else moves the sheet (Swap, Add a piece, a tap).
  const clampSheet=(px:number)=>Math.round(Math.max(110,Math.min(window.innerHeight-56,px)));
  function clearSheetHeight(){sheetCustom.current=null;shopPanel.current?.style.removeProperty("height");root.current?.style.removeProperty("--peek");}
  useEffect(()=>{if(sheetCustom.current&&(sheetCustom.current.sheet!==ui?.sheet||view!=="2d"||!compact))clearSheetHeight();},[ui?.sheet,view,compact]);
  // Full screen: the browser's own where it's offered (not on iPhone), always the expanded studio underneath.
  useEffect(()=>{const sync=()=>{if(!document.fullscreenElement)setExpanded(false);};document.addEventListener("fullscreenchange",sync);return()=>document.removeEventListener("fullscreenchange",sync);},[]);
  function fullScreen(){
    if(document.fullscreenElement){void document.exitFullscreen();return;}
    if(expanded){setExpanded(false);return;}
    setExpanded(true);root.current?.requestFullscreen?.().catch(()=>{});
  }
  /** Downloads a 2x PNG of the room, without the selection or any controls. */
  function snapshot(){
    const url=scene.current?.exportPNG(2);if(!url)return;
    const a=document.createElement("a");a.href=url;a.download=`${(named??dorm?.name??"dormscape-room").replace(/[^\w]+/g,"-").replace(/^-|-$/g,"").toLowerCase()||"dormscape-room"}-3d.png`;a.click();
    track("studio_snapshot",{lighting:studioSettings(room.studio).lighting,camera});
  }
  function toggleMove(){if(!allowed3D){openUpgrade("room-3d");return;}setView("3d");if(camera==="inside")preset("room");setMoveMode(v=>!v);setMobileOpen(false);}

  // Title: the plan's own name once renamed, else the hall and room type.
  const typeLabel=roomTypeLabel(room),roomName=/\broom\b/i.test(typeLabel)?typeLabel:`${typeLabel} Room`;
  const named=planning.name&&planning.name!=="My room"?planning.name:null;
  const title=named??[dorm?.name??"Your room",roomName].join(" · ");
  // The school's short name (its first alias, e.g. "penn state"); the line is set in caps.
  const school=college?.id?getSchool(college.id):undefined;
  const subline=[school?.aliases?.[0]??college?.name.replace(/^The\s+/,"").replace(/\s*\(.*\)$/,""),room.dimsEstimated?"Estimated size":null,designDisplayName(style,customVibe),`$${budget} budget`].filter(Boolean).join(" · ");
  function rename(value:string){const name=value.trim().slice(0,60);usePlannerStore.getState().updatePlanning({name:name||"My room"});setRenaming(false);}

  const viewSwitch=(className:string)=><div className={className} role="group" aria-label="Planner view">
    <button type="button" aria-pressed={view==="2d"} onClick={()=>{setView("2d");setMoveMode(false);}}>2D</button>
    <button type="button" aria-pressed={view==="3d"} onClick={enter3D} aria-label={allowed3D?"3D":"3D, a Pro feature"}>3D<span className={s.proTag} aria-hidden="true">Pro</span></button>
  </div>;

  const roomPanel=<>
    {view==="2d"&&<button type="button" className={s.backButton} onClick={()=>setPanel("shop")}><ChevronLeft size={16}/>Shopping list</button>}
    <h2 className={s.panelTitle}>Room details</h2>
    <button className={s.primary} disabled={loading} onClick={()=>{if(!isPaid(profile)){openUpgrade("draw-room");return;}setEditingRoom(true);setMobileOpen(false);}}>Edit walls &amp; room shape{!isPaid(profile)&&<span className={s.plusTag}>Plus</span>}</button>
    <RoomDetails room={room} controls={openingControls} onAdd={addOpening} onRemove={removeOpening} onFlip={flipOpening}/>
    <details className={s.disclosure}><summary>View &amp; layout options</summary>{allowed3D&&<label className={s.field}>Wall visibility<select aria-label="Wall visibility" value={walls} onChange={e=>setWalls(e.target.value)}><option value="auto">Automatic cutaway</option><option value="all">All walls</option><option value="hidden">Hide walls</option></select></label>}<div className={s.buttonRow}><button onClick={()=>open("checks")}>Placement checks ({new Set(issues.map(i=>i.id)).size})</button><button onClick={()=>setResetConfirm(true)}>Reset layout</button></div></details>
  </>;
  const checksPanel=<>
    <button type="button" className={s.backButton} onClick={()=>open("room")}><ChevronLeft size={16}/>Room details</button>
    <p className={s.eyebrow}>A second look</p><h2 className={s.panelTitle}>Placement checks</h2><p className={s.muted}>Checks flag overlap, wall boundaries, ceiling height, and proximity to inward door swings. They are a guide, not a guarantee of fit.</p>
    {issues.length? <ul className={s.issueList}>{issues.map((issue,i)=><li key={i}><button onClick={()=>{select(issue.id);scene.current?.focus(issue.id);}}><strong>{items.find(f=>f.id===issue.id)?.label}</strong><span>{issue.message}</span></button></li>)}</ul>:<p className={s.note}>No placement conflicts detected for the visible furniture.</p>}
    {roomOutlineMissing(room)&&<p className={s.warning}>No doors or windows are recorded. Choose Doors &amp; windows to add their real positions and check clearance.</p>}
  </>;
  const helpPanel=<><p className={s.eyebrow}>Make yourself at home</p><h2 className={s.panelTitle}>Your studio guide.</h2><dl className={s.helpList}><dt>Look around</dt><dd>Drag empty space. Use the camera presets to return to a familiar view.</dd><dt>Arrange</dt><dd>Drag a piece on desktop. On a phone, tap it, then drag it.</dd><dt>Zoom</dt><dd>Scroll, pinch, or use the zoom buttons.</dd><dt>Be precise</dt><dd>Use the selected item&apos;s position fields. Snap rounds to half-foot increments.</dd><dt>Undo</dt><dd>Use Undo or Ctrl / Command + Z. A finished drag counts as one edit.</dd><dt>Doors &amp; windows</dt><dd>Choose Doors &amp; windows in either view. Drag a door or window onto a wall, or tap to add one and drag it into place. Select a door to flip it. Changes appear immediately in both views. Use Undo to reverse an edit.</dd><dt>Save &amp; share</dt><dd>Use Save design to keep a named copy in your account. Share creates a link or exports the current view.</dd></dl><p className={s.note}>3D objects are approximate models. Product photos show the actual selected items. Switching views does not generate a new plan or use a credit.</p></>;
  const itemPanel=<>
    <button type="button" className={s.backButton} onClick={()=>setPanel("style")}><ChevronLeft size={16}/>Room</button>
    {selected?<ItemInspector key={selected.id} item={selected} items={items} room={room} product={selectedProduct} issues={issues.filter(i=>i.id===selected.id).map(i=>i.message)} moveMode={moveMode}
      onFocus={()=>{if(!allowed3D){openUpgrade("room-3d");return;}setCamera("room");scene.current?.focus(selected.id);}} onMoveMode={toggleMove} onShop={()=>open("shop")}/>
      :<div className={s.emptySelection}><p className={s.eyebrow}>Your next move</p><h2 className={s.panelTitle}>Make it yours.</h2><p>Select a placed piece to move it, rotate it, or dial in its dimensions.</p></div>}
  </>;
  const swapSelected=()=>{if(selectedProduct){ui?.openSwap(selectedProduct);setPanel("shop");setMobileOpen(true);}};
  const shown=items.filter(f=>f.label.toLowerCase().includes(query.toLowerCase()));
  const canSwap=!!selectedProduct&&alternativesOf(selectedProduct).length>0;
  const entry=selected?ui?.entryFor(selected):undefined,pieceStatus=selected?.built_in?"Dorm-provided":entry?"In your list":"Not in your list";
  const rotateSelected=()=>{if(selected)usePlannerStore.getState().rotateItem(selected.id,1);};
  const arrangeContent=<div className={s.arrangeInner}>
    <h2 className={s.eyebrowInk}>Arrange</h2>
    <label className={s.srOnly} htmlFor="arrange-search">Find a piece</label>
    <input id="arrange-search" className={s.search} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a piece"/>
    {unplaced&&<div className={s.unplaced}>{unplaced}</div>}
    <ul className={s.pieces}>{shown.map(item=><li key={item.id}><button type="button" aria-pressed={selectedId===item.id} onClick={()=>{select(item.id);scene.current?.focus(item.id);}}>
      <span className={s.itemSwatch} style={{background:item.material_color||"#d9c8af"}} aria-hidden="true"/>
      <span><strong>{item.label}</strong><small>{hidden.includes(item.id)?"Hidden":excluded.includes(furnitureCategory(item)!)&&!item.built_in?"Not in shopping list":item.movable?(item.built_in?"Dorm-provided":"Placed item"):"Fixed fixture"}</small></span>
    </button></li>)}</ul>
    {shown.length===0&&<p className={s.note}>No matching furniture. Try another name.</p>}
    <div className={s.arrangeActions}>
      <button type="button" className={s.moveBtn} aria-pressed={moveMode} disabled={!selectedMovable} onClick={toggleMove}><MoveIcon size={18}/>{moveMode?"Stop moving":"Move selected"}</button>
      <div className={s.pair}>
        <button type="button" disabled={!selectedMovable} onClick={()=>selected&&usePlannerStore.getState().rotateItem(selected.id,1)}><RotateIcon size={15}/>Rotate 90°</button>
        <button type="button" disabled={!canSwap} onClick={swapSelected}><SwapIcon size={15}/>Swap</button>
      </div>
      <div className={s.arrangeMeta}>
        <button type="button" className={s.linkBtn} disabled={!selected} onClick={()=>open("item")}>Measurements &amp; details</button>
        <label className={s.check}><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/>Snap</label>
      </div>
      <p className={s.hint}>Moves here show up in 2D too. Both views share one layout.</p>
    </div>
  </div>;

  const Body=shell?"main":"div";
  return <div ref={root} className={s.app} data-view={view} data-sheet={view==="2d"&&compact?ui?.sheet:undefined} data-expanded={expanded||undefined} data-studio-app="" data-testid="planner-studio" onKeyDownCapture={openingKey}
    onKeyDown={e=>{const target=e.target as HTMLElement;
      if(expanded&&e.key==="Tab"){
        const nodes=Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')??[]).filter(n=>n.getClientRects().length>0&&!n.closest('[aria-hidden="true"],[inert]'));
        const first=nodes[0],last=nodes[nodes.length-1];
        if(e.shiftKey&&target===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&target===last){e.preventDefault();first?.focus();}
      }
      if(target.closest("input,textarea,select,[contenteditable=true]"))return;
      if(view==="3d"&&allowed3D&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();e.stopPropagation();e.shiftKey?history.redo():history.undo();}
      if(e.key==="Escape"){setMobileOpen(false);setMoveMode(false);}}}>
    <header className={s.appBar}>
      {shell&&<Link href="/plan/budget" className={s.backLink} aria-label="Back to your budget"><ChevronLeft size={20}/></Link>}
      {shell&&<><Wordmark className={s.wordmark}/><span className={s.vr} aria-hidden="true"/></>}
      <div className={s.titleBlock}>
        <div className={s.titleLine}>
          {renaming?<input className={s.renameInput} aria-label="Plan name" defaultValue={named??""} placeholder={title} maxLength={60} autoFocus
            onBlur={e=>rename(e.currentTarget.value)} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();if(e.key==="Escape"){e.stopPropagation();setRenaming(false);}}}/>
            :<h1 title={subtitle}>{title}</h1>}
          {!renaming&&<button type="button" className={s.rename} aria-label="Rename plan" onClick={()=>setRenaming(true)}><PencilIcon size={15}/></button>}
        </div>
        <p className={s.subline}>{subline}</p>
      </div>
      {viewSwitch(s.viewSwitch)}
      {headerAction&&<div className={s.headerAction}>{headerAction}</div>}
      {view==="3d"&&<span className={s.noCredit}>Switching views uses no credits</span>}
      <div className={s.barEnd}>
        <div className={s.history}>
          <button type="button" aria-label="Undo" title="Undo (Ctrl/⌘ Z)" disabled={!history.canUndo||preview} onClick={history.undo}><UndoIcon size={18}/></button>
          <button type="button" aria-label="Redo" title="Redo (Ctrl/⌘ Shift Z)" disabled={!history.canRedo||preview} onClick={history.redo}><RedoIcon size={18}/></button>
        </div>
        <span className={s.vr} aria-hidden="true"/>
        <div className={s.actions} inert={preview}><ActionBar hideCompare={view==="3d"} products={products} getPng={()=>view==="3d"?scene.current?.exportPNG()??null:get2DPng()} onShop={()=>open("shop")} shopOpen={activePanel==="shop"}/></div>
      </div>
    </header>
    <Body id={shell?"page-content":undefined} tabIndex={shell?-1:undefined} className={s.body}>
      <div className={s.toolCol}>
        {viewSwitch(`${s.viewSwitch} ${s.phoneSwitch}`)}
        {headerAction&&<div className={`${s.headerAction} ${s.phoneAction}`}>{headerAction}</div>}
        {view==="2d"?<div ref={setToolsHost} className={s.railHost} aria-label="Floor plan tools"/>:
          <nav className={s.phone3dTools} aria-label="3D panels" inert={preview}>
            {([["furnish","Arrange"],["style","Room"],["shop","List"]] as const).map(([key,label])=><button key={key} type="button" aria-pressed={mobileOpen&&activePanel===key} onClick={()=>open(key)}>{label}</button>)}
          </nav>}
      </div>
      {view==="3d"&&!compact&&<aside className={s.arrange} aria-label="Arrange" inert={preview}>{arrangeContent}</aside>}
      <section className={s.viewport} aria-label={view==="3d"?"3D room":"Room plan"} data-walk={walking||undefined}>
        <div className={s.renderArea}>
          <div className={s.sceneLayer} style={{visibility:view==="3d"?"visible":"hidden",pointerEvents:view==="3d"?"auto":"none"}} aria-hidden={view!=="3d"}>
            {(allowed3D||view==="3d")&&<RoomScene ref={scene} anchor={card} walker={walker} onCamera={setCamera} room={room} items={items} hidden={hidden} excluded={excluded} locked={locked} selectedId={selectedId} style={style} products={products} snap={snap} walls={walls} moveMode={moveMode} preview={preview} openingControls={openingControls}
              onSelect={select} onMove={(id,x,y)=>usePlannerStore.getState().moveItem(id,x,y)} onFallback={()=>setView("2d")}/>}
          </div>
          <div className={s.canvasLayer} style={{display:view==="2d"?"block":"none"}}><CanvasControlsContext.Provider value={{host:toolsHost,active:view==="2d",expanded,editOpenings,openings:openingControls,expand:()=>setExpanded(v=>!v),reset:()=>setResetConfirm(true),shop:()=>open("shop"),addPiece:()=>ui?.showAddMore(),variant:"planner"}}>{canvas}</CanvasControlsContext.Provider></div>
        </div>
        {view==="3d"&&<>
          <div className={s.sceneTop}>
            {!walking&&<><div className={s.vibeChip} title="Your vibe"><span aria-hidden="true">{styleFor(style,college?.id).palette.slice(0,4).map((c,i)=><i key={i} style={{background:c}}/>)}</span>{designDisplayName(style,customVibe)}</div>
            <button type="button" className={`${s.pill} ${s.open2d}`} onClick={()=>{setView("2d");setMoveMode(false);}}><PlanIcon size={15}/>Open 2D plan</button>
            <p className={s.sceneHint}>{preview?"Your room, previewed. Unlock Pro to explore and arrange it.":moveMode?"Move mode: drag the selected furniture. Choose Stop moving when done.":"Drag a piece to move it. Drag empty space to look around."}</p></>}
            <button type="button" className={`${s.roundBtn} ${s.snapBtn}`} aria-label="Snapshot" title="Download a snapshot (PNG)" disabled={preview} onClick={snapshot}><CameraIcon size={17}/></button>
            <button type="button" className={s.roundBtn} aria-label={expanded?"Exit full screen":"Full screen"} title={expanded?"Exit full screen":"Full screen"} onClick={fullScreen}>{expanded?<CloseIcon size={16}/>:<ExpandIcon size={16}/>}</button>
          </div>
          {walking&&<WalkIn room={room} items={visibleFurniture(items,hidden,excluded)} mapTop={compact?60:72} onBack={()=>preset("room")} onWalker={setWalker} onWalk={input=>scene.current?.walk(input)}/>}
          {roomOutlineMissing(room)&&!walking&&<button className={s.openingsHint} onClick={editOpenings}>Doors and windows not set. Add openings</button>}
          {!compact&&!walking&&<div className={s.lightDock} inert={preview}><LightSwitch room={room} className={s.lightSwitch}/></div>}
          <div className={s.cameraBar} role="group" aria-label="Camera controls" inert={preview}>
            {CAMERAS.map(([key,label])=><button key={key} type="button" aria-pressed={camera===key} onClick={()=>preset(key)}>{label}</button>)}
            <span className={s.separator} aria-hidden="true"/>
            <button type="button" aria-label="Zoom out" disabled={camera==="inside"} onClick={()=>scene.current?.zoom(1.15)}><MinusIcon size={16}/></button>
            <button type="button" aria-label="Zoom in" disabled={camera==="inside"} onClick={()=>scene.current?.zoom(.87)}><PlusIcon size={16}/></button>
          </div>
          {selected&&!compact&&!preview&&<div ref={setCard} className={s.pieceCard} role="group" aria-label={`Selected: ${selected.label}`}>
            <strong>{selected.label}</strong><span data-tone={selected.built_in?"dorm":entry?"list":undefined}>{pieceStatus}</span>{selectedMovable&&<small>Drag it to move it around the room.</small>}
            <div className={s.pieceCardActions}>
              <button type="button" disabled={!selectedMovable} onClick={rotateSelected}><RotateIcon size={14}/>Rotate</button>
              <button type="button" disabled={!canSwap} onClick={swapSelected}><SwapIcon size={14}/>Swap</button>
              <button type="button" disabled={!entry||!!selected.built_in} onClick={()=>entry&&ui?.remove(entry)}><TrashIcon size={14}/>Remove</button>
            </div>
          </div>}
        </>}
        {selectedOpening!==null&&outline.openings[selectedOpening]&&!preview&&<div className={s.openingActions} style={view==="2d"&&!compact&&openingCenter(outline.points,outline.openings[selectedOpening]).y<room.widthFt/2?{top:"auto",bottom:64}:undefined} role="group" aria-label="Selected opening">
          <strong>{outline.openings[selectedOpening].kind==="door"?"Door":"Window"}</strong><span>Drag to move</span>
          {outline.openings[selectedOpening].kind==="door"&&<button onClick={()=>flipOpening(selectedOpening)}>Flip door</button>}
          <button onClick={()=>removeOpening(selectedOpening)}>Remove</button><button aria-label="Deselect opening" onClick={()=>selectOpening(null)}><CloseIcon size={16}/></button>
        </div>}
        {openingError&&<p className={s.openingError} role="status">{openingError}</p>}
        {resetConfirm&&<div className={s.resetConfirm} role="group" aria-label="Confirm layout reset"><p>Restore the original furniture arrangement? You can undo this.</p><div className={s.buttonRow}><button className={s.inkBtn} onClick={()=>{onReset();setResetConfirm(false);}}>Restore layout</button><button onClick={()=>setResetConfirm(false)}>Keep my changes</button></div></div>}
      </section>
      {view==="3d"&&compact&&<section className={s.phoneSheet} aria-label="Room controls" inert={preview}>
        {selected?<div className={s.sheetPiece}><span><strong>{selected.label}</strong><small>{selectedMovable?`${pieceStatus} · drag it to move`:pieceStatus}</small></span>
          <button type="button" disabled={!selectedMovable} onClick={rotateSelected}><RotateIcon size={15}/>Rotate</button>
          <button type="button" disabled={!canSwap} onClick={swapSelected}><SwapIcon size={15}/>Swap</button></div>
          :<p className={s.sheetHint}>Tap a piece, then drag it to move it.</p>}
        <LightSwitch room={room}/>
        <FloorSwatches room={room}/>
        <div className={s.sheetBudget}><BudgetTracker total={total} budget={budget} size="sm"/><button type="button" onClick={()=>open("shop")}>List</button></div>
      </section>}
      {compact&&mobileOpen&&view==="3d"&&<button className={s.shopBackdrop} aria-label="Close studio panel" onClick={()=>setMobileOpen(false)}/>}
      <aside ref={shopPanel} id="studio-panel" className={s.panel} data-sheet={view==="2d"?(ui?.sheet??"full"):undefined} data-open={view==="3d"&&mobileOpen||undefined}
        aria-label={activePanel==="shop"?"Shopping list":activePanel==="style"?"Room settings":activePanel==="room"?"Room details":activePanel==="checks"?"Placement checks":activePanel==="help"?"Studio guide":"Selected item"}
        inert={preview||(compact&&view==="3d"&&!mobileOpen)} role={compact&&view==="3d"&&mobileOpen?"dialog":undefined} aria-modal={compact&&view==="3d"&&mobileOpen?true:undefined}
        onKeyDown={e=>{
          if(compact&&view==="2d"&&e.key==="Escape"&&ui?.sheet==="full"&&!ui.swapTarget){e.stopPropagation();ui.setSheet("peek");return;}
          if(!compact||!mobileOpen||view!=="3d")return;
          if(e.key==="Escape"){e.stopPropagation();setMobileOpen(false);}
          if(e.key==="Tab"){const nodes=Array.from(shopPanel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')??[]).filter(n=>n.getClientRects().length>0);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
        }}>
        {view==="2d"&&compact&&ui?.variant==="planner"&&!ui.swapTarget&&<button type="button" className={s.sheetHandle} aria-label={ui.sheet==="full"?"Collapse the shopping list":ui.sheet==="min"?"Show the shopping list":"Open the full shopping list"} aria-expanded={ui.sheet==="full"}
          onPointerDown={e=>{const panel=shopPanel.current;if(!panel)return;e.currentTarget.setPointerCapture(e.pointerId);panel.dataset.dragging="";
            sheetDrag.current={y:e.clientY,h:panel.getBoundingClientRect().height,moved:false,v:0,lastY:e.clientY,lastT:e.timeStamp};}}
          onPointerMove={e=>{const d=sheetDrag.current,panel=shopPanel.current;if(!d||!panel)return;
            if(Math.abs(e.clientY-d.y)>4)d.moved=true;if(!d.moved)return;
            const dt=e.timeStamp-d.lastT;if(dt>0)d.v=(e.clientY-d.lastY)/dt;d.lastY=e.clientY;d.lastT=e.timeStamp;
            panel.style.height=clampSheet(d.h-(e.clientY-d.y))+"px";}}
          onPointerUp={e=>{const d=sheetDrag.current,panel=shopPanel.current;sheetDrag.current=null;if(!d||!panel)return;delete panel.dataset.dragging;
            // A tap toggles, a flick goes all the way, and a drag stays wherever it's let go.
            if(!d.moved||Math.abs(d.v)>.9){clearSheetHeight();ui.setSheet(!d.moved?(ui.sheet==="peek"?"full":"peek"):d.v<0?"full":"min");return;}
            const px=clampSheet(d.h-(e.clientY-d.y)),sheet=px<170?"min":px<380?"peek":"full";
            sheetCustom.current={sheet,px};panel.style.height=px+"px";
            if(sheet==="full")root.current?.style.removeProperty("--peek");else root.current?.style.setProperty("--peek",px+"px");
            ui.setSheet(sheet);}}
          onPointerCancel={()=>{const d=sheetDrag.current;sheetDrag.current=null;if(d&&shopPanel.current){delete shopPanel.current.dataset.dragging;shopPanel.current.style.height=sheetCustom.current?sheetCustom.current.px+"px":"";}}}
          onKeyDown={e=>{
            if(e.key==="Enter"||e.key===" "){e.preventDefault();ui.setSheet(ui.sheet==="peek"?"full":"peek");}
            if(e.key==="ArrowUp"||e.key==="ArrowDown"){e.preventDefault();ui.setSheet(stepSheet(ui.sheet,e.key==="ArrowUp"?1:-1));}}}><span aria-hidden="true"/></button>}
        {view==="3d"&&<div className={s.panelTabs}>
          <nav aria-label="Room panels">{([...(compact?[["furnish","Arrange"]] as const:[]),["style","Room"],["room","Openings"],["shop","List"]] as const).map(([key,label])=><button key={key} type="button" aria-pressed={activePanel===key||(key==="style"&&(activePanel==="item"||activePanel==="help"))||(key==="room"&&activePanel==="checks")} onClick={()=>open(key)}>{label}</button>)}</nav>
          <button ref={closeRef} type="button" className={s.mobileClose} aria-label="Close panel" onClick={()=>setMobileOpen(false)}><CloseIcon size={18}/></button>
        </div>}
        {activePanel==="shop"?<div className={s.panelList}>{shopping}</div>:<div className={s.panelContent}>
          {activePanel==="room"&&roomPanel}
          {activePanel==="checks"&&checksPanel}
          {activePanel==="help"&&helpPanel}
          {activePanel==="item"&&itemPanel}
          {activePanel==="furnish"&&arrangeContent}
          {activePanel==="style"&&<>
            <StyleDetails room={room}/>
            <div className={s.buttonRow}><button onClick={()=>open("checks")}>Placement checks ({new Set(issues.map(i=>i.id)).size})</button><button onClick={()=>open("help")}>Studio guide</button></div>
            <div className={s.budgetCard}>
              <BudgetTracker total={total} budget={budget} tone="ink" size="sm"/>
              <button type="button" onClick={()=>open("shop")}>Open the shopping list</button>
            </div>
          </>}
        </div>}
      </aside>
    </Body>
    {editingRoom&&isPaid(profile)&&<Modal role="dialog" aria-modal="true" aria-label="Edit room shape" className={s.geometryModal} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();setEditingRoom(false);}}}><div><RoomDrawCanvas initialRoom={room} furniture={items} onCancel={()=>setEditingRoom(false)} onComplete={result=>{usePlannerStore.getState().updateRoomGeometry(result.outline,result.origin);setEditingRoom(false);}}/></div></Modal>}
  </div>;

}
function roomOutlineMissing(room:{outline?:{openings:unknown[]}|null}){return !room.outline?.openings.length;}
/** One step up (1) or down (-1) between the phone sheet's heights. */
const SHEETS=["min","peek","full"] as const;
function stepSheet(sheet:(typeof SHEETS)[number],dir:1|-1){return SHEETS[Math.max(0,Math.min(2,SHEETS.indexOf(sheet)+dir))];}
