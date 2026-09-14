"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { FurnitureItem, Product, ProductCategory, SelectedRoom, StyleId } from "@/lib/types";
import { useExperienceMotion } from "@/components/experience/MotionProvider";
import { styleById } from "@/lib/styles";
import { footprint, pointInPolygon } from "@/components/canvas/geometry";
import { constrainedPosition, itemElevation, itemHeight, modelKind, roomOutline, studioSettings, visibleFurniture } from "@/lib/studio";
import { furnitureCategory } from "@/lib/highlight";
import s from "./Studio.module.css";

export type CameraView="room"|"top"|"inside";
export interface RoomSceneHandle {exportPNG:()=>string|null;preset:(mode:CameraView)=>void;zoom:(factor:number)=>void;focus:(id:string)=>void;}
type SceneItem=FurnitureItem&{kind:string;height:number;elevation:number;footW:number;footD:number;locked:boolean};
type SceneData={room:SelectedRoom;settings:ReturnType<typeof studioSettings>;outline:ReturnType<typeof roomOutline>;items:SceneItem[];palette:string[];selectedId:string|null;interior:{x:number;y:number}};
type View={update:(data:SceneData)=>void;preset:(mode:CameraView)=>void;zoom:(factor:number)=>void;focus:(id:string)=>void;setWalls:(value:string)=>void;setMoveMode:(value:boolean)=>void;setReduced:(value:boolean)=>void;exportPNG:()=>string;destroy:()=>void};
type SceneModule={createStudioScene:(node:HTMLElement,options:{reduced:boolean;onError:(message:string)=>void;onSelect:(id:string|null)=>void;onMove:(id:string,x:number,y:number)=>void;constrain:(id:string,x:number,y:number)=>{x:number;y:number}})=>View};
export interface RoomSceneProps {room:SelectedRoom;items:FurnitureItem[];hidden:string[];excluded:ProductCategory[];locked:string[];selectedId:string|null;style:StyleId;products?:Product[];snap?:boolean;walls?:string;moveMode?:boolean;readOnly?:boolean;onSelect?:(id:string|null)=>void;onMove?:(id:string,x:number,y:number)=>void;onFallback?:()=>void;}
const RoomScene=forwardRef<RoomSceneHandle,RoomSceneProps>(function RoomScene(props,ref){
  const node=useRef<HTMLDivElement>(null),view=useRef<View|null>(null),current=useRef(props);current.current=props;
  const {paused}=useExperienceMotion();const pausedRef=useRef(paused);pausedRef.current=paused;
  const [error,setError]=useState(""),[ready,setReady]=useState(false),[retry,setRetry]=useState(0);
  const outline=roomOutline(props.room),settings=studioSettings(props.room.studio);
  let interior={x:props.room.lengthFt/2,y:props.room.widthFt*.72};
  if(!pointInPolygon(interior.x,interior.y,outline.points)){
    outer:for(let y=.5;y<props.room.widthFt;y+=.5)for(let x=.5;x<props.room.lengthFt;x+=.5)if(pointInPolygon(x,y,outline.points)){interior={x,y};break outer;}
  }
  const data:SceneData={room:props.room,outline,settings,interior,palette:styleById(props.style).palette,
    selectedId:props.selectedId,items:visibleFurniture(props.items,props.hidden,props.excluded).map(f=>{
      const b=footprint(f),product=props.products?.find(p=>p.id===f.id)||props.products?.find(p=>p.category===furnitureCategory(f));
      const color=/^#[0-9a-f]{6}$/i.test(product?.color??"")?product!.color:undefined;
      return {...f,material_color:f.material_color||color,kind:modelKind(f),height:itemHeight(f),elevation:itemElevation(f,props.items),footW:b.w,footD:b.h,locked:Boolean(props.readOnly)||props.locked.includes(f.id)};
    })};
  const latest=useRef(data);latest.current=data;
  useImperativeHandle(ref,()=>({exportPNG:()=>view.current?.exportPNG()??null,preset:m=>view.current?.preset(m),zoom:f=>view.current?.zoom(f),focus:id=>view.current?.focus(id)}),[]);
  useEffect(()=>{
    let disposed=false;setError("");setReady(false);
    (async()=>{try{
      const path="/experience/studio-scene.js";
      const module=await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ path) as SceneModule;
      if(disposed||!node.current)return;
      const v=module.createStudioScene(node.current,{reduced:pausedRef.current,onError:message=>{if(!disposed)setError(message);},
        onSelect:id=>{if(!current.current.readOnly)current.current.onSelect?.(id);},
        onMove:(id,x,y)=>{if(!current.current.readOnly)current.current.onMove?.(id,x,y);},
        constrain:(id,x,y)=>{const p=current.current,f=p.items.find(f=>f.id===id);return f?constrainedPosition(f,x,y,p.room,p.snap!==false):{x,y};}});
      view.current=v;v.update(latest.current);v.setWalls(current.current.walls??"auto");v.setMoveMode(current.current.moveMode??false);setReady(true);
    }catch{if(!disposed)setError("3D is unavailable on this browser. Your room can still be edited in 2D.");}})();
    return()=>{disposed=true;view.current?.destroy();view.current=null;};
  },[retry]);
  useEffect(()=>{view.current?.update(data);});
  useEffect(()=>{view.current?.setReduced(paused);},[paused]);
  useEffect(()=>{view.current?.setWalls(props.walls??"auto");},[props.walls]);
  useEffect(()=>{view.current?.setMoveMode(props.moveMode??false);},[props.moveMode]);
  return <div className={s.scene} data-testid="room-3d"><div ref={node} className={s.sceneMount}/>
    {!ready&&!error&&<div className={s.sceneMessage} role="status"><span className={s.loadingMark} aria-hidden="true">d.</span><strong>Making room for your ideas.</strong><span>Loading your 3D studio</span></div>}
    {error&&<div className={s.sceneMessage} role="status"><strong>Keep creating.</strong><p>{error}</p><div className={s.buttonRow}><button onClick={()=>setRetry(n=>n+1)}>Retry 3D</button>{props.onFallback&&<button onClick={props.onFallback}>Open 2D plan</button>}</div></div>}
  </div>;
});
export default RoomScene;
