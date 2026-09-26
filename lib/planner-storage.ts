import type { StateStorage } from "zustand/middleware";
import { sanitizeFurnitureList, sanitizePlanning } from "./studio-save";
import { roomEditError } from "./room-editing";

export const RECOVERY_KEY="dormscape-planner-recovery-v2";
export let draftStorageStatus: "saved"|"session"|"unavailable" = "unavailable";
export let recoveredDraft = false;
const fields=["plannerView","college","dorm","room","style","budget","customVibe","customProducts","customMock","customRegenUsed","templateId","furniture","swaps","excluded","hiddenItemIds","lockedItemIds","customItems","unplacedItemIds","planning","savedFingerprint","savedByUserId"];
/** Ignore corrupt JSON or incompatible shapes instead of breaking the planner. */
export function validDraft(value:string|null):string|null{
  if(!value)return null;
  try{
    const parsed=JSON.parse(value),s=parsed?.state;
    if(!s||typeof s!=="object"||Array.isArray(s))return null;
    if(s.room){const r=s.room;if(!Number.isFinite(r.lengthFt)||r.lengthFt<4||r.lengthFt>60||!Number.isFinite(r.widthFt)||r.widthFt<4||r.widthFt>60||!Number.isInteger(r.occupants)||r.occupants<1||r.occupants>8)return null;
      if(r.bedSize!=null&&!["twin","twin_xl","full","full_xl","queen"].includes(r.bedSize))return null;
      if(r.outline && (!Array.isArray(r.outline.points)||!Array.isArray(r.outline.openings)||!Array.isArray(r.outline.closets)||roomEditError(r.outline)))return null;}
    if(s.furniture!=null){const furniture=sanitizeFurnitureList(s.furniture);if(!furniture)return null;s.furniture=furniture;}
    if(s.planning){const planning=sanitizePlanning(s.planning);if(!planning)return null;s.planning=planning;}
    for(const key of ["hiddenItemIds","lockedItemIds","unplacedItemIds","customItems","excluded"]){if(s[key]!=null&&!Array.isArray(s[key]))return null;}
    return JSON.stringify({...parsed,state:Object.fromEntries(fields.filter(k=>Object.hasOwn(s,k)).map(k=>[k,s[k]]))});
  }catch{return null;}
}
/** A tab keeps its edits; the last completed draft survives closing or signing in. */
export const plannerStorage:StateStorage={
  getItem(name){
    let tab:string|null=null;try{tab=validDraft(sessionStorage.getItem(name));}catch{}
    if(tab)return tab;
    try{const copy=validDraft(localStorage.getItem(RECOVERY_KEY));if(copy){const parsed=JSON.parse(copy);if(parsed.state.room&&Array.isArray(parsed.state.furniture)){recoveredDraft=true;draftStorageStatus="saved";return copy;}}}catch{}
    return null;
  },
  setItem(name,value){
    let session=false;try{sessionStorage.setItem(name,value);session=true;}catch{}
    try{const s=JSON.parse(value).state;
      // Choosing a different school must not destroy the last usable room.
      if(s?.room&&Array.isArray(s.furniture)){localStorage.setItem(RECOVERY_KEY,value);draftStorageStatus="saved";}
      else draftStorageStatus=session?"session":"unavailable";
    }catch{draftStorageStatus=session?"session":"unavailable";}
    if(typeof window!=="undefined")window.dispatchEvent(new Event("dormscape:draft-saved"));
  },
  removeItem(name){try{sessionStorage.removeItem(name);}catch{}try{localStorage.removeItem(RECOVERY_KEY);}catch{}},
};
