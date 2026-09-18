"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {useAuth} from "@/lib/auth-context";
import {canUse3D} from "@/lib/plan";
import {useUpgrade} from "@/lib/upgrade-context";
import type { FurnitureItem, Product, ProductCategory, SelectedRoom, StyleId, WallOpening } from "@/lib/types";
import { useExperienceMotion } from "@/components/experience/MotionProvider";
import { styleById } from "@/lib/styles";
import { footprint, pointInPolygon } from "@/components/canvas/geometry";
import { constrainedPosition, itemElevation, itemHeight, modelKind, roomOutline, studioSettings, visibleFurniture } from "@/lib/studio";
import { productForFurniture, productVisual } from "@/lib/product-model";
import { OPENING_DRAG_TYPE, type OpeningControls } from "@/lib/room-editing";
import s from "./Studio.module.css";
import BrandLoader from "@/components/site/BrandLoader";

export type CameraView="room"|"top"|"inside";
export interface RoomSceneHandle {exportPNG:()=>string|null;preset:(mode:CameraView)=>void;zoom:(factor:number)=>void;focus:(id:string)=>void;}
type SceneItem=FurnitureItem&{kind:string;height:number;elevation:number;footW:number;footD:number;locked:boolean;bare:boolean;product?:ReturnType<typeof productVisual>};
type SceneData={room:SelectedRoom;settings:ReturnType<typeof studioSettings>;outline:ReturnType<typeof roomOutline>;items:SceneItem[];palette:string[];selectedId:string|null;selectedOpening:number|null;editOpenings:boolean;interior:{x:number;y:number}};
type View={update:(data:SceneData)=>void;preset:(mode:CameraView)=>void;zoom:(factor:number)=>void;focus:(id:string)=>void;setWalls:(value:string)=>void;setMoveMode:(value:boolean)=>void;setReduced:(value:boolean)=>void;exportPNG:()=>string;destroy:()=>void};
type SceneModule={createStudioScene:(node:HTMLElement,options:{reduced:boolean;openingDragType:string;previewOpening:(target:number|WallOpening["kind"],x:number,y:number)=>WallOpening|null;onSelectOpening:(index:number|null)=>void;onOpeningChange:(index:number|null,opening:WallOpening)=>void;onReady:()=>void;onError:(message:string)=>void;onSelect:(id:string|null)=>void;onMove:(id:string,x:number,y:number)=>void;constrain:(id:string,x:number,y:number)=>{x:number;y:number}})=>View};
export interface RoomSceneProps {room:SelectedRoom;items:FurnitureItem[];hidden:string[];excluded:ProductCategory[];locked:string[];selectedId:string|null;style:StyleId;products?:Product[];snap?:boolean;walls?:string;moveMode?:boolean;readOnly?:boolean;preview?:boolean;openingControls?:OpeningControls;onSelect?:(id:string|null)=>void;onMove?:(id:string,x:number,y:number)=>void;onFallback?:()=>void;}
const RoomScene=forwardRef<RoomSceneHandle,RoomSceneProps>(function RoomScene(props,ref){
  const {profile,loading}=useAuth(),allowed=!loading&&canUse3D(profile);
  const {openUpgrade}=useUpgrade(),enabled=!loading&&(allowed||props.preview===true);
  const access=useRef(allowed);access.current=allowed;
  const node=useRef<HTMLDivElement>(null),view=useRef<View|null>(null),current=useRef(props);current.current=props;
  const {paused}=useExperienceMotion();const pausedRef=useRef(paused);pausedRef.current=paused;
  const [error,setError]=useState(""),[ready,setReady]=useState(false),[retry,setRetry]=useState(0);
  const outline=roomOutline(props.room),settings=studioSettings(props.room.studio);
  let interior={x:props.room.lengthFt/2,y:props.room.widthFt*.72};
  if(!pointInPolygon(interior.x,interior.y,outline.points)){
    outer:for(let y=.5;y<props.room.widthFt;y+=.5)for(let x=.5;x<props.room.lengthFt;x+=.5)if(pointInPolygon(x,y,outline.points)){interior={x,y};break outer;}
  }
  const data:SceneData={room:props.room,outline,settings,interior,palette:styleById(props.style).palette,
    selectedId:props.selectedId,selectedOpening:props.openingControls?.selected??null,editOpenings:allowed&&!props.readOnly&&!!props.openingControls,items:visibleFurniture(props.items,props.hidden,props.excluded).map(f=>{
      const b=footprint(f),choice=productForFurniture(f,props.products??[]);
      const product=choice && (!f.built_in || f.type==="bed") ? productVisual(choice) : undefined;
      const kind=f.built_in?modelKind(f):product?.kind??modelKind(f);
      return {...f,product,bare:f.type==="bed"&&!choice,material_color:f.material_color||product?.color,kind,height:itemHeight(f),elevation:itemElevation(f,props.items),footW:b.w,footD:b.h,locked:!allowed||Boolean(props.readOnly)||props.locked.includes(f.id)};
    })};
  const latest=useRef(data);latest.current=data;
  useImperativeHandle(ref,()=>({exportPNG:()=>access.current?view.current?.exportPNG()??null:null,preset:m=>view.current?.preset(m),zoom:f=>view.current?.zoom(f),focus:id=>view.current?.focus(id)}),[]);
  useEffect(()=>{
    if(!enabled)return;
    let disposed=false;setError("");setReady(false);
    (async()=>{try{
      const path="/experience/studio-scene.js";
      const module=await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ path) as SceneModule;
      if(disposed||!node.current)return;
      const v=module.createStudioScene(node.current,{reduced:pausedRef.current||!access.current,openingDragType:OPENING_DRAG_TYPE,
        previewOpening:(target,x,y)=>access.current&&!current.current.readOnly?current.current.openingControls?.preview(target,{x,y})??null:null,
        onSelectOpening:index=>{if(access.current&&!current.current.readOnly)current.current.openingControls?.select(index);},
        onOpeningChange:(index,opening)=>{if(access.current&&!current.current.readOnly)current.current.openingControls?.commit(index,opening);},onReady:()=>{if(!disposed)setReady(true);},onError:message=>{if(!disposed)setError(message);},
        onSelect:id=>{if(access.current&&!current.current.readOnly)current.current.onSelect?.(id);},
        onMove:(id,x,y)=>{if(access.current&&!current.current.readOnly)current.current.onMove?.(id,x,y);},
        constrain:(id,x,y)=>{const p=current.current,f=p.items.find(f=>f.id===id);return f?constrainedPosition(f,x,y,p.room,p.snap!==false):{x,y};}});
      view.current=v;v.update(latest.current);v.setWalls(current.current.walls??"auto");v.setMoveMode(current.current.moveMode??false);
    }catch{if(!disposed)setError("3D is unavailable on this browser. Your room can still be edited in 2D.");}})();
    return()=>{disposed=true;view.current?.destroy();view.current=null;};
  },[retry,enabled]);
  useEffect(()=>{
    if(!enabled||allowed||!props.preview)return;
    openUpgrade("room-3d",()=>current.current.onFallback?.());
  },[enabled,allowed,props.preview,openUpgrade]);
  useEffect(()=>{view.current?.update(data);});
  useEffect(()=>{view.current?.setReduced(paused||!allowed);},[paused,allowed]);
  useEffect(()=>{view.current?.setWalls(props.walls??"auto");},[props.walls]);
  useEffect(()=>{view.current?.setMoveMode(props.moveMode??false);},[props.moveMode]);
  if(!enabled)return null;
  return <div className={s.scene} data-testid="room-3d"><div ref={node} className={s.sceneMount} inert={!allowed}/>
    {!ready&&!error&&<div className={s.sceneMessage}><BrandLoader label="Opening your 3D studio…"/></div>}
    {error&&<div className={s.sceneMessage} role="status"><strong>Keep creating.</strong><p>{error}</p><div className={s.buttonRow}><button onClick={()=>setRetry(n=>n+1)}>Retry 3D</button>{props.onFallback&&<button onClick={props.onFallback}>Open 2D plan</button>}</div></div>}
  </div>;
});
export default RoomScene;
