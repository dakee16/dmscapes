import type { PlannerState } from "./store";
/** Change indicator only, never an authentication or integrity token. */
export function plannerFingerprint(s:Pick<PlannerState,"room"|"furniture"|"style"|"budget"|"planning"|"hiddenItemIds"|"lockedItemIds"|"excluded"|"customItems"|"swaps">){
  const json=JSON.stringify({...s,planning:{...s.planning,lastPanel:"furnish"}});let hash=2166136261;
  for(let i=0;i<json.length;i++)hash=Math.imul(hash^json.charCodeAt(i),16777619);
  return (hash>>>0).toString(16);
}
export function fingerprintState(s:PlannerState){return plannerFingerprint({room:s.room,furniture:s.furniture,style:s.style,budget:s.budget,planning:s.planning,hiddenItemIds:s.hiddenItemIds,lockedItemIds:s.lockedItemIds,excluded:s.excluded,customItems:s.customItems,swaps:s.swaps});}
