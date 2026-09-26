"use client";
import { useEffect, useRef, useState } from "react";
import { usePlannerStore, type PlannerState } from "@/lib/store";

type Snapshot = Pick<PlannerState,"furniture"|"hiddenItemIds"|"lockedItemIds"|"room"|"customItems"|"unplacedItemIds"|"excluded"|"planning">;
const LIMIT=50;
function capture(s:PlannerState):Snapshot{return {furniture:s.furniture,hiddenItemIds:s.hiddenItemIds,lockedItemIds:s.lockedItemIds,room:s.room,customItems:s.customItems,unplacedItemIds:s.unplacedItemIds,excluded:s.excluded,planning:{...s.planning,lastPanel:"furnish"}};}
/** One completed drag or committed field is one undo. Adding/removing inventory is reversible too. */
export function useLayoutHistory(){
  const [past,setPast]=useState<Snapshot[]>([]),[future,setFuture]=useState<Snapshot[]>([]);
  const previous=useRef(capture(usePlannerStore.getState())),restoring=useRef(false);
  useEffect(()=>usePlannerStore.subscribe(s=>{
    const next=capture(s);if(JSON.stringify(next)===JSON.stringify(previous.current))return;
    if(!restoring.current){const old=previous.current;setPast(p=>[...p.slice(-(LIMIT-1)),old]);setFuture([]);}
    previous.current=next;
  }),[]);
  function restore(snapshot:Snapshot){restoring.current=true;usePlannerStore.setState({...snapshot,planning:{...snapshot.planning,lastPanel:usePlannerStore.getState().planning.lastPanel},selectedItemId:null,selectedCategory:null});previous.current=capture(usePlannerStore.getState());restoring.current=false;}
  return {canUndo:past.length>0,canRedo:future.length>0,
    undo(){const target=past.at(-1);if(!target)return;setPast(past.slice(0,-1));setFuture([previous.current,...future]);restore(target);},
    redo(){const target=future[0];if(!target)return;setFuture(future.slice(1));setPast([...past,previous.current]);restore(target);}};
}
