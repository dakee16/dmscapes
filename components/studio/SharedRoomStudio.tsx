"use client";
import {useRef,useState} from "react";
import type {FurnitureItem,Product,SelectedRoom,StyleId} from "@/lib/types";
import type {SavedEditorState} from "@/lib/studio-save";
import {visibleFurniture} from "@/lib/studio";
import StaticRoomView from "@/components/room/StaticRoomView";
import RoomScene,{type RoomSceneHandle} from "./RoomScene";
import s from "./Studio.module.css";
export default function SharedRoomStudio({room,items,style,products,editor}:{room:SelectedRoom;items:FurnitureItem[];style:StyleId;products:Product[];editor?:SavedEditorState}){
 const [view,setView]=useState<"2d"|"3d">("3d"),ref=useRef<RoomSceneHandle>(null);
 const visible=visibleFurniture(items,editor?.hiddenItemIds??[],editor?.excluded??[]);
 return <section className={s.sharedViewer} aria-label="Shared room preview">
   <div className={s.sharedTools} role="group" aria-label="Shared room view"><button aria-pressed={view==="3d"} onClick={()=>setView("3d")}>3D room</button><button aria-pressed={view==="2d"} onClick={()=>setView("2d")}>2D plan</button>{view==="3d"&&<button onClick={()=>ref.current?.preset("room")}>Reset view</button>}</div>
   <div className={s.sharedStage}>{view==="3d"?<RoomScene ref={ref} room={room} items={items} hidden={editor?.hiddenItemIds??[]} excluded={editor?.excluded??[]} locked={[]} selectedId={null} style={style} products={products} readOnly onFallback={()=>setView("2d")}/>:<div className={s.sharedPlan}><StaticRoomView lengthFt={room.lengthFt} widthFt={room.widthFt} furniture={visible} outline={room.outline??null}/></div>}</div>
   <p className={s.sharedNote}>Drag to look around. Furniture models and unmeasured heights are approximate.</p>
 </section>;
}
