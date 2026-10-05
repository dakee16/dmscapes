"use client";
import type { FurnitureItem, Product, SelectedRoom, WallOpening } from "@/lib/types";
import { usePlannerStore } from "@/lib/store";
import { footprint } from "@/components/canvas/geometry";
import { constrainedPosition, FLOOR_FINISHES, FLOOR_LABELS, itemElevation, itemHeight, LIGHT_LABELS, LIGHTING_PRESETS, modelKind, roomOutline, studioSettings } from "@/lib/studio";
import { OPENING_DRAG_TYPE, type OpeningControls } from "@/lib/room-editing";
import { MoonIcon, SunIcon, SunsetIcon } from "@/components/studio-ui/icons";
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
    {product&&<div className={s.productPeek}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={product.image_url} alt="" loading="lazy"/><div><strong>{product.name}</strong><span>${product.price.toFixed(2)}</span></div><button onClick={onShop}>Product details &amp; swaps</button></div>}
  </>;
}

export function RoomDetails({room,controls,onAdd,onRemove,onFlip}:{room:SelectedRoom;controls:OpeningControls;onAdd:(kind:WallOpening["kind"])=>void;onRemove:(index:number)=>void;onFlip:(index:number)=>void}){
  const openings=roomOutline(room).openings;
  return <><label className={s.field}>Bedding size for product matches<select value={room.bedSize} onChange={e=>usePlannerStore.setState({room:{...room,bedSize:e.target.value as SelectedRoom["bedSize"]}})}><option value="twin_xl">Twin XL</option><option value="twin">Twin</option><option value="full">Full</option><option value="full_xl">Full XL</option><option value="queen">Queen</option></select></label><p className={s.note}>Check the actual mattress size. This setting does not resize your furniture.</p><p className={s.eyebrow}>Make room for real life</p><h2>Doors &amp; windows</h2>
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
      <p className={s.muted}>Keyboard: select an opening, then use the Left and Right arrow keys to slide it, or Up and Down to move it to the next wall.</p>
    </details>}
  </>;
}

const WALLS: [string, string][] = [["Warm cream", "#f3eee4"], ["White", "#f7f6f2"], ["Sage", "#c9d3be"], ["Powder blue", "#cfd9ec"], ["Blush", "#ebcfcb"]];
function finishSwatch(key: string, color: string) {
  if (key === "oak" || key === "walnut") return `repeating-linear-gradient(90deg, ${color} 0 10px, rgba(0,0,0,.12) 10px 11px)`;
  if (key === "carpet") return `radial-gradient(rgba(0,0,0,.08) 1px, transparent 1.5px) 0 0 / 5px 5px, ${color}`;
  return `linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px) 0 0 / 13px 13px, linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px) 0 0 / 13px 13px, ${color}`;
}

const LIGHT_ICONS={day:SunIcon,evening:SunsetIcon,night:MoonIcon};
/** Day / Golden hour / Night, with icons. Used in the Room tab, over the 3D room and in the phone sheet. */
export function LightSwitch({room,className=s.seg}:{room:SelectedRoom;className?:string}){
  const lighting=studioSettings(room.studio).lighting,update=usePlannerStore(st=>st.updateStudio);
  return <div className={className} role="group" aria-label="Light">{LIGHTING_PRESETS.map(l=>{const Icon=LIGHT_ICONS[l];
    return <button key={l} type="button" title={LIGHT_LABELS[l]} aria-pressed={lighting===l} onClick={()=>update({lighting:l})}><Icon size={16}/><span>{LIGHT_LABELS[l]}</span></button>;})}</div>;
}
export function FloorSwatches({room}:{room:SelectedRoom}){
  const floor=studioSettings(room.studio).floor,update=usePlannerStore(st=>st.updateStudio);
  return <div className={s.floorSwatches} role="group" aria-label="Floor">{Object.entries(FLOOR_FINISHES).map(([key,color])=><button key={key} type="button" aria-label={FLOOR_LABELS[key as keyof typeof FLOOR_LABELS]} title={FLOOR_LABELS[key as keyof typeof FLOOR_LABELS]} aria-pressed={floor===key} onClick={()=>update({floor:key as typeof floor})} style={{background:finishSwatch(key,color)}}/>)}</div>;
}

/** Room finishes for the 3D view (Studio3D.dc.html). Preview only: the list never changes. */
export function StyleDetails({room}:{room:SelectedRoom}){
 const settings=studioSettings(room.studio),update=usePlannerStore(st=>st.updateStudio);
 const custom=!WALLS.some(([,c])=>c===settings.wallColor.toLowerCase());
 return <><h2 className={s.eyebrowInk}>Room</h2>
 <fieldset className={s.swatchSet}><legend>Light</legend><LightSwitch room={room}/></fieldset>
 <fieldset className={s.swatchSet}><legend>Floor</legend><FloorSwatches room={room}/></fieldset>
 <fieldset className={s.swatchSet}><legend>Walls</legend><div className={s.wallSwatches}>
   {WALLS.map(([name,color])=><button key={name} type="button" aria-label={name} title={name} aria-pressed={settings.wallColor.toLowerCase()===color} onClick={()=>update({wallColor:color})} style={{background:color}}/>)}
   <label className={s.customWall} data-active={custom||undefined} title="Custom wall color"><span className={s.srOnly}>Custom wall color</span><input aria-label="Wall preview color" type="color" value={settings.wallColor} onChange={e=>update({wallColor:e.target.value})}/></label>
 </div></fieldset>
 <label className={s.dressVibe}><input type="checkbox" checked={settings.dressVibe} onChange={e=>update({dressVibe:e.target.checked})}/><span><strong>Dress the room in my vibe</strong><small>Bedding, rug and decor take your vibe&apos;s colors.</small></span></label>
 <p className={s.finishNote}>Finishes, preview colors and lighting are only for seeing the room. They never change your shopping list. Check your residence hall rules before changing finishes.</p></>;
}
