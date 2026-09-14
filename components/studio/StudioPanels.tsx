"use client";
import { useState } from "react";
import Link from "next/link";
import type { FurnitureItem, Product, SelectedRoom, WallOpening } from "@/lib/types";
import { usePlannerStore } from "@/lib/store";
import { footprint } from "@/components/canvas/geometry";
import { constrainedPosition, FLOOR_FINISHES, itemElevation, itemHeight, modelKind, roomOutline, studioSettings } from "@/lib/studio";
import s from "./Studio.module.css";

export function NumberField({label,value,min=0,max=60,step=.1,disabled=false,onCommit}:{label:string;value:number;min?:number;max?:number;step?:number;disabled?:boolean;onCommit:(n:number)=>void}){
  return <label className={s.field}>{label}<input key={value} aria-label={label} type="number" inputMode="decimal" step={step} min={min} max={max} defaultValue={Math.round(value*100)/100} disabled={disabled}
    onBlur={e=>{const n=e.currentTarget.valueAsNumber;if(Number.isFinite(n)&&n>=min&&n<=max)onCommit(n);else e.currentTarget.value=String(value);}}
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
    <div className={s.section}><h3>Position in feet</h3><div className={s.fieldGrid}>
      <NumberField label="X position" value={item.x_ft} max={room.lengthFt} disabled={!movable} onCommit={n=>position("x",n)}/>
      <NumberField label="Y position" value={item.y_ft} max={room.widthFt} disabled={!movable} onCommit={n=>position("y",n)}/>
    </div></div>
    <div className={s.section}><h3>Measured dimensions</h3><p className={s.muted}>Adjust these to your actual furniture. Defaults are approximate.</p><div className={s.fieldGrid}>
      <NumberField label="Width (ft)" value={item.width_ft} min={.1} max={30} onCommit={n=>st.resizeItem(item.id,n,item.length_ft)}/>
      <NumberField label="Depth (ft)" value={item.length_ft} min={.1} max={30} onCommit={n=>st.resizeItem(item.id,item.width_ft,n)}/>
      <NumberField label="Height (ft)" value={itemHeight(item)} min={.02} max={16} step={.05} onCommit={n=>st.updateItem3D(item.id,{height_ft:n})}/>
      <NumberField label="Above floor (ft)" value={itemElevation(item,items)} max={16} disabled={!movable} onCommit={n=>st.updateItem3D(item.id,{elevation_ft:n,parent_id:undefined})}/>
    </div></div>
    {movable&&hosts.length>0&&!["bed","bunk","desk","wardrobe","dresser","shelf"].includes(modelKind(item))&&<label className={s.field}>Place on a surface<select value={item.parent_id??""} onChange={e=>attach(e.target.value)}>
      <option value="">Floor / free placement</option>{hosts.map(h=><option key={h.id} value={h.id}>{h.label}</option>)}</select><span className={s.muted}>Placed accessories follow their surface when it moves.</span></label>}
    <div className={s.section}><label className={s.field}>Preview color<input aria-label="Item preview color" type="color" value={item.material_color??"#b9c2d5"} onChange={e=>st.updateItem3D(item.id,{material_color:e.target.value})}/></label><p className={s.muted}>For visualization only. Product options and price stay the same.</p></div>
    {issues.length>0&&<div className={s.warning} role="status"><strong>Check placement</strong><ul>{issues.map((v,i)=><li key={i}>{v}</li>)}</ul></div>}
    {product&&<div className={s.productPeek}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={product.image_url} alt="" loading="lazy"/><div><strong>{product.name}</strong><span>${product.price.toFixed(2)}</span></div><button onClick={onShop}>Product details &amp; swaps ↗</button></div>}
  </>;
}

export function RoomDetails({room}:{room:SelectedRoom}){
  const st=usePlannerStore.getState(),outline=roomOutline(room),settings=studioSettings(room.studio);
  const [error,setError]=useState("");
  const lengths=outline.points.map((p,i)=>Math.hypot(outline.points[(i+1)%outline.points.length].x-p.x,outline.points[(i+1)%outline.points.length].y-p.y));
  function change(index:number,patch:Partial<WallOpening>){
    const value={...outline.openings[index],...patch},len=lengths[value.edge];
    value.width_ft=Math.min(value.width_ft,len);value.offset_ft=Math.max(0,Math.min(value.offset_ft,len-value.width_ft));
    const collision=outline.openings.some((o,i)=>i!==index&&o.edge===value.edge&&o.offset_ft<value.offset_ft+value.width_ft&&value.offset_ft<o.offset_ft+o.width_ft);
    if(collision){setError("Those openings overlap. Move this opening or choose another wall.");return;}
    setError("");st.updateOpenings({...outline,openings:outline.openings.map((o,i)=>i===index?value:o)});
  }
  function add(kind:"door"|"window"){
    if(outline.openings.length>=20){setError("This room already has 20 openings.");return;}
    for(let edge=0;edge<lengths.length;edge++){const width=kind==="door"?3:4;
      for(let offset=.25;offset+width<=lengths[edge];offset+=.25){
        if(!outline.openings.some(o=>o.edge===edge&&o.offset_ft<offset+width&&offset<o.offset_ft+o.width_ft)){
          st.updateOpenings({...outline,openings:[...outline.openings,{kind,edge,offset_ft:offset,width_ft:width,swing:0}]});setError("");return;
        }
      }
    }setError("No clear wall segment fits that opening. Adjust the existing openings first.");
  }
  return <><p className={s.eyebrow}>The space you start with</p><h2>Check your room.</h2>
    <p className={s.muted}>{room.lengthFt} × {room.widthFt} ft. {room.dimsEstimated?"Room dimensions are estimated.":"Room dimensions come from your selected or drawn plan."}</p>
    <div className={s.section}><NumberField label="Ceiling height (ft)" value={settings.ceilingFt} min={6} max={16} onCommit={n=>st.updateStudio({ceilingFt:n})}/>
      <p className={s.note}>8 ft is the preview default. Enter a measured height when you have it.</p></div>
    <div className={s.section}><h3>Doors &amp; windows</h3><p className={s.muted}>Only openings you add or draw are shown. Wall numbers follow the outline clockwise from its first point.</p>
      <div className={s.buttonRow}><button onClick={()=>add("door")}>+ Door</button><button onClick={()=>add("window")}>+ Window</button></div>
      {outline.openings.map((o,i)=><div key={i} className={s.opening}>
        <div className={s.row}><strong>{o.kind==="door"?"Door":"Window"} {i+1}</strong><button aria-label={"Remove "+o.kind+" "+(i+1)} onClick={()=>{st.updateOpenings({...outline,openings:outline.openings.filter((_,n)=>n!==i)});setError("");}}>Remove</button></div>
        <label className={s.field}>Wall<select value={o.edge} onChange={e=>change(i,{edge:Number(e.target.value)})}>{lengths.map((len,n)=><option key={n} value={n}>Wall {n+1} · {len.toFixed(1)} ft</option>)}</select></label>
        <div className={s.fieldGrid}><NumberField label={"Opening "+(i+1)+" offset (ft)"} value={o.offset_ft} max={lengths[o.edge]} onCommit={n=>change(i,{offset_ft:n})}/><NumberField label={"Opening "+(i+1)+" width (ft)"} value={o.width_ft} min={.5} max={Math.min(20,lengths[o.edge])} onCommit={n=>change(i,{width_ft:n})}/></div>
        {o.kind==="door"&&<label className={s.field}>Door swing<select value={o.swing??0} onChange={e=>change(i,{swing:Number(e.target.value)})}><option value={0}>Inward, start hinge</option><option value={1}>Inward, end hinge</option><option value={2}>Outward, start hinge</option><option value={3}>Outward, end hinge</option></select></label>}
      </div>)}
      {error&&<p className={s.warning} role="status">{error}</p>}
    </div>
    <p className={s.note}>Need a different room shape? Save this design first, then <Link href="/plan/draw">draw a new room</Link>.</p>
  </>;
}

export function StyleDetails({room}:{room:SelectedRoom}){
 const settings=studioSettings(room.studio),update=usePlannerStore(st=>st.updateStudio);
 return <><p className={s.eyebrow}>Set the atmosphere</p><h2>A space that feels like you.</h2><p className={s.muted}>Try room finishes and lighting without changing your product selections or budget.</p>
 <div className={s.section}><h3>Floor finish</h3><div className={s.finishGrid}>{Object.entries(FLOOR_FINISHES).map(([key,color])=><button key={key} aria-pressed={settings.floor===key} onClick={()=>update({floor:key as typeof settings.floor})}><span style={{background:color}}/>{key}</button>)}</div></div>
 <div className={s.section}><label className={s.field}>Wall color<input aria-label="Wall preview color" type="color" value={settings.wallColor} onChange={e=>update({wallColor:e.target.value})}/></label><p className={s.note}>Preview only. Check your residence hall rules before changing finishes.</p></div>
 <div className={s.section}><h3>Lighting</h3><div className={s.buttonRow}><button aria-pressed={settings.lighting==="day"} onClick={()=>update({lighting:"day"})}>Daylight</button><button aria-pressed={settings.lighting==="evening"} onClick={()=>update({lighting:"evening"})}>Evening glow</button></div></div></>;
}
