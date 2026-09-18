"use client";
import type { ReactNode } from "react";
import type { FurnitureItem } from "@/lib/types";
import type { CanvasDock } from "./CanvasControlsContext";
import s from "./CanvasToolRail.module.css";

function Icon({d}:{d:string}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d}/></svg>;}
function Tool({label,d,onClick,active,disabled,className=""}:{label:string;d:string;onClick:()=>void;active?:boolean;disabled?:boolean;className?:string}){return <button type="button" aria-label={label} title={label} aria-pressed={active} disabled={disabled} onClick={onClick} className={className}><Icon d={d}/><span>{label}</span></button>;}
function Group({label,children}:{label:string;children:ReactNode}){return <div className={s.group}><span className={s.groupLabel}>{label}</span><div className={s.pair}>{children}</div></div>;}
export interface CanvasToolRailProps {
  dock:CanvasDock;pan:boolean;grid:boolean;labels:boolean;snap:boolean;zoom:number;roomLabel:string;
  setPan:(v:boolean)=>void;toggleGrid:()=>void;toggleLabels:()=>void;toggleSnap:()=>void;zoomTo:(v:number)=>void;fit:()=>void;
  undo:()=>void;redo:()=>void;canUndo:boolean;canRedo:boolean;
  selected:FurnitureItem|null;locked:boolean;hidden:boolean;canEdit:boolean;canDelete:boolean;
  rotate:()=>void;toggleLock:()=>void;toggleHide:()=>void;remove:()=>void;hiddenItems:FurnitureItem[];showItem:(id:string)=>void;invalidCount:number;
}
export default function CanvasToolRail(p:CanvasToolRailProps){
  return <div className={s.tools} data-testid="canvas-tool-rail">
    <div className={s.heading}><strong>Plan tools</strong><small>{p.roomLabel}</small></div>
    <Group label="Arrange">
      <Tool label="Select" d="m5 3 15 9-7 2-3 7Z" active={!p.pan} onClick={()=>p.setPan(false)}/>
      <Tool label="Pan" d="M8 12V6a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9c0 4-3 6-7 6-2 0-4-1-5-3l-4-5a2 2 0 0 1 3-2l1 1" active={p.pan} onClick={()=>p.setPan(true)}/>
      <Tool label="Undo" d="M8 5 3 10l5 5M3 10h10a6 6 0 0 1 0 12" disabled={!p.canUndo} onClick={p.undo}/>
      <Tool label="Redo" d="m16 5 5 5-5 5m5-5H11a6 6 0 0 0 0 12" disabled={!p.canRedo} onClick={p.redo}/>
    </Group>
    {p.selected&&<div className={s.selected}><strong title={p.selected.label}>{p.selected.label}</strong>
      <div className={s.pair}>
      <Tool label="Rotate 90°" d="M20 4v6h-6m5-1a8 8 0 1 0 1 8" disabled={!p.canEdit} onClick={p.rotate}/>
      <Tool label={p.locked?"Unlock":"Lock"} d="M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3" active={p.locked} onClick={p.toggleLock}/>
      <Tool label={p.hidden?"Show":"Hide"} d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0" active={p.hidden} onClick={p.toggleHide}/>
      <Tool label="Remove" d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" disabled={!p.canDelete} onClick={p.remove}/>
    </div></div>}
    <Group label="View">
      <Tool label="Grid" d="M4 4h16v16H4zM4 12h16M12 4v16" active={p.grid} onClick={p.toggleGrid}/>
      <Tool label="Labels" d="M4 6h16M12 6v14M8 20h8" active={p.labels} onClick={p.toggleLabels}/>
      <Tool label="Snap" d="M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3ZM6 7h4m4 0h4" active={p.snap} onClick={p.toggleSnap}/>
      <Tool label="Fit" d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8z" onClick={p.fit}/>
    </Group>
    <div className={s.zoom} role="group" aria-label="Plan zoom">
      <button type="button" aria-label="Zoom out" disabled={p.zoom<=.5} onClick={()=>p.zoomTo(p.zoom-.25)}>−</button><output aria-label="Zoom level">{Math.round(p.zoom*100)}%</output><button type="button" aria-label="Zoom in" disabled={p.zoom>=3} onClick={()=>p.zoomTo(p.zoom+.25)}>+</button>
    </div>
    <div className={s.group}><span className={s.groupLabel}>Your space</span>
      <Tool label="Doors & windows" d="M3 21V3h18v18h-6m-6 0H3m6 0V11h6v10" className={s.wide} onClick={p.dock.editOpenings}/>
      <Tool label={p.dock.expanded?"Exit fullscreen":"Expand"} d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" className={s.wide} onClick={p.dock.expand}/>
      <Tool label="Shop" d="M4 7h16l-1 14H5ZM8 7V5a4 4 0 0 1 8 0v2" className={s.mobileShop} onClick={p.dock.shop}/>
    </div>
    {p.hiddenItems.length>0&&<details className={s.detail}><summary>Hidden ({p.hiddenItems.length})</summary>{p.hiddenItems.map(f=><button type="button" key={f.id} onClick={()=>p.showItem(f.id)}>Show {f.label}</button>)}</details>}
    {p.invalidCount>0&&<p className={s.warning} role="status">Red outlines show where a piece needs more space.</p>}
    <div className={s.utilities}><details className={s.detail}><summary>Help &amp; keys</summary><p>Click a piece, then drag to move. Drag its circular arrow to rotate, or click the arrow, move your cursor, then click to place.</p><p>Esc: cancel rotation<br/>R: rotate 90°<br/>Shift + R: rotate −90°<br/>Arrow keys: nudge<br/>Ctrl / ⌘ Z: undo<br/>0: fit · Esc: deselect</p></details><button type="button" className={s.reset} onClick={p.dock.reset}>Reset layout</button></div>
  </div>;
}
