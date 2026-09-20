"use client";
import type { FurnitureItem, Product, SelectedRoom, WallOpening } from "@/lib/types";
import { usePlannerStore } from "@/lib/store";
import { footprint } from "@/components/canvas/geometry";
import { constrainedPosition, FLOOR_FINISHES, itemElevation, itemHeight, modelKind, roomOutline, studioSettings } from "@/lib/studio";
import { OPENING_DRAG_TYPE, type OpeningControls } from "@/lib/room-editing";
import s from "./Studio.module.css";

export function NumberField({label,value,min=0,max=60,step=.1,disabled=false,onCommit}:{label:string;value:number;min?:number;max?:number;step?:number;disabled?:boolean;onCommit:(n:number)=>void|boolean}){
  return <label className={s.field}>{label}<input key={value} aria-label={label} type="number" inputMode="decimal" step={step} min={min} max={max} defaultValue={Math.round(value*100)/100} disabled={disabled}
    onBlur={e=>{const n=e.currentTarget.valueAsNumber;if(!Number.isFinite(n)||n<min||n>max||onCommit(n)===false)e.currentTarget.value=String(value);}}
    onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.currentTarget.blur();}}}/></label>;
}

export function ItemInspector({item,items,room,product,onFocus,onShop,onMoveMode,moveMode,issues}:{item:FurnitureItem;items:FurnitureItem[];room:SelectedRoom;product?:Product;onFocus:()=>void;onShop:()=>void;onMoveMode:()=>void;moveMode:boolean;issues:string[]}){
  const locked=usePlannerStore(st=>st.lockedItemIds.includes(item.id));
  const hidden=usePlannerStore(st=>st.hiddenItemIds.includes(item.id));
  const st=usePlannerStore.getState(),movable=item.movable&&!locked;
  const hosts=items.filter(f=>f.id!==item.id&&!f.parent_id&&["desk","dresser","shelf","bed"].includes(modelKind(f))&&footprint(f).w*footprint(f).h>footprint(item).w*footprint(item).h);
  function position(axis:"x"|"y",n:number){const p=constrainedPosition(item,axis==="x"?n:item.x_ft,axis==="y"?n:item.y_ft,room,false);st.moveItem(item.id,p.x,p.y);}
  function attach(id:string){
    const host=items.find(f=>f.id===id);
    if(!host){st.updateItem3D(item.id,{parent_id:undefined,elevation_ft:0});return;}
    const a=footprint(host),b=footprint(item);
    st.moveItem(item.id,a.x+(a.w-b.w)/2,a.y+(a.h-b.h)/2);
    st.updateItem3D(item.id,{parent_id:id,elevation_ft:itemHeight(host)+itemElevation(host,items)});
  }
  return <>
    <p className={s.eyebrow}>{item.built_in?"Dorm-provided furniture":"Your room / Selected item"}</p><h2>{item.label}</h2>
    <p className={s.muted}>Approximate 3D model. Check the actual item and measured dimensions before buying or moving furniture.</p>
    <div className={s.buttonRow}>
      <button onClick={onFocus}>Focus item</button><button aria-pressed={moveMode} disabled={!movable} onClick={onMoveMode}>{moveMode?"Stop moving":"Move selected"}</button>
      <button disabled={!movable} onClick={()=>st.rotateItem(item.id,1)}>Rotate 90°</button>
      <button disabled={!item.movable} aria-pressed={locked} onClick={()=>st.toggleLockedItem(item.id)}>{locked?"Unlock":"Lock"}</button>
      <button aria-pressed={hidden} onClick={()=>st.toggleHiddenItem(item.id)}>{hidden?"Show item":"Hide item"}</button>
    </div>
    {!item.movable&&<p className={s.note}>This is a fixed fixture. Its position stays anchored.</p>}
    <details className={s.disclosure}><summary>Position &amp; measurements</summary><div className={s.section}><h3>Position in feet</h3><div className={s.fieldGrid}>
      <NumberField label="X position" value={item.x_ft} max={room.lengthFt} disabled={!movable} onCommit={n=>position("x",n)}/>
      <NumberField label="Y position" value={item.y_ft} max={room.widthFt} disabled={!movable} onCommit={n=>position("y",n)}/>
    </div></div>
    <div className={s.section}><h3>Measured dimensions</h3><p className={s.muted}>Adjust these to your actual furniture. Defaults are approximate.</p><div className={s.fieldGrid}>
      <NumberField label="Width (ft)" value={item.width_ft} min={.1} max={30} onCommit={n=>st.resizeItem(item.id,n,item.length_ft)}/>
      <NumberField label="Depth (ft)" value={item.length_ft} min={.1} max={30} onCommit={n=>st.resizeItem(item.id,item.width_ft,n)}/>
      <NumberField label="Height (ft)" value={itemHeight(item)} min={.02} max={16} step={.05} onCommit={n=>st.updateItem3D(item.id,{height_ft:n})}/>
      <NumberField label="Above floor (ft)" value={itemElevation(item,items)} max={16} disabled={!movable} onCommit={n=>st.updateItem3D(item.id,{elevation_ft:n,parent_id:undefined})}/>
    </div></div>
    </details>
    {movable&&hosts.length>0&&!["bed","bunk","desk","wardrobe","dresser","shelf"].includes(modelKind(item))&&<label className={s.field}>Place on a surface<select value={item.parent_id??""} onChange={e=>attach(e.target.value)}>
      <option value="">Floor / free placement</option>{hosts.map(h=><option key={h.id} value={h.id}>{h.label}</option>)}</select><span className={s.muted}>Placed accessories follow their surface when it moves.</span></label>}
    <details className={s.disclosure}><summary>Preview color</summary><div className={s.section}><label className={s.field}>Preview color<input aria-label="Item preview color" type="color" value={item.material_color??"#b9c2d5"} onChange={e=>st.updateItem3D(item.id,{material_color:e.target.value})}/></label><p className={s.muted}>For visualization only. Product options and price stay the same.</p></div></details>
    {issues.length>0&&<div className={s.warning} role="status"><strong>Check placement</strong><ul>{issues.map((v,i)=><li key={i}>{v}</li>)}</ul></div>}
    {product&&<div className={s.productPeek}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={product.image_url} alt="" loading="lazy"/><div><strong>{product.name}</strong><span>${product.price.toFixed(2)}</span></div><button onClick={onShop}>Product details &amp; swaps ↗︎</button></div>}
  </>;
}

export function RoomDetails({room,controls,onAdd,onRemove,onFlip}:{room:SelectedRoom;controls:OpeningControls;onAdd:(kind:WallOpening["kind"])=>void;onRemove:(index:number)=>void;onFlip:(index:number)=>void}){
  const openings=roomOutline(room).openings;
  return <><p className={s.eyebrow}>Make room for real life</p><h2>Doors &amp; windows</h2>
    <p className={s.muted}>Drag one onto a wall. Or tap to add, then drag it into place.</p>
    <div className={s.openingTools}>
      {(["door","window"] as const).map(kind=><button key={kind} type="button" draggable onDragStart={e=>{e.dataTransfer.setData(OPENING_DRAG_TYPE+"-"+kind,kind);e.dataTransfer.effectAllowed="copy";}} onClick={()=>onAdd(kind)}>
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{kind==="door"?<><path d="M10 42V6h26v36M7 42h34M14 42V10l18 5v27Z"/><circle cx="27" cy="28" r="1"/></>:<><rect x="7" y="7" width="34" height="34" rx="1"/><path d="M24 7v34M7 24h34M5 43h38"/></>}</svg>
        <strong>+ {kind==="door"?"Door":"Window"}</strong><small>Drag or tap to add</small>
      </button>)}
    </div>
    <p className={s.note}>They snap to walls automatically. Drag an existing door or window to move it.</p>
    {openings.length>0&&<details className={s.disclosure}><summary>Placed openings ({openings.length})</summary>
      <div className={s.buttonRow}>{openings.map((o,i)=><button key={i} aria-pressed={controls.selected===i} onClick={()=>controls.select(i)}>{o.kind==="door"?"Door":"Window"} {i+1}</button>)}</div>
      {controls.selected!==null&&openings[controls.selected]&&<div className={s.buttonRow}>
        {openings[controls.selected].kind==="door"&&<button onClick={()=>onFlip(controls.selected!)}>Flip door</button>}
        <button onClick={()=>onRemove(controls.selected!)}>Remove</button>
      </div>}
      <p className={s.muted}>Keyboard: select an opening, then use ← / → to slide it or ↑ / ↓ to move to the next wall.</p>
    </details>}
  </>;
}

export function StyleDetails({room}:{room:SelectedRoom}){
 const settings=studioSettings(room.studio),update=usePlannerStore(st=>st.updateStudio);
 return <><p className={s.eyebrow}>Set the atmosphere</p><h2>A space that feels like you.</h2><p className={s.muted}>Try room finishes and lighting without changing your product selections or budget.</p>
 <div className={s.section}><h3>Floor finish</h3><div className={s.finishGrid}>{Object.entries(FLOOR_FINISHES).map(([key,color])=><button key={key} aria-pressed={settings.floor===key} onClick={()=>update({floor:key as typeof settings.floor})}><span style={{background:color}}/>{key}</button>)}</div></div>
 <div className={s.section}><label className={s.field}>Wall color<input aria-label="Wall preview color" type="color" value={settings.wallColor} onChange={e=>update({wallColor:e.target.value})}/></label><p className={s.note}>Preview only. Check your residence hall rules before changing finishes.</p></div>
 <div className={s.section}><h3>Lighting</h3><div className={s.buttonRow}><button aria-pressed={settings.lighting==="day"} onClick={()=>update({lighting:"day"})}>Daylight</button><button aria-pressed={settings.lighting==="evening"} onClick={()=>update({lighting:"evening"})}>Evening glow</button></div></div></>;
}
