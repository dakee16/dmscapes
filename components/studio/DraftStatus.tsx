"use client";
import { useEffect, useState } from "react";
import { usePlannerStore } from "@/lib/store";
import { draftStorageStatus, recoveredDraft } from "@/lib/planner-storage";
import { fingerprintState } from "@/lib/planner-fingerprint";
import { useAuth } from "@/lib/auth-context";
export default function DraftStatus(){
  const state=usePlannerStore(),[status,setStatus]=useState(draftStorageStatus),[recovered,setRecovered]=useState(false);
  const {user}=useAuth();
  useEffect(()=>{setRecovered(recoveredDraft);const update=()=>setStatus(draftStorageStatus);update();window.addEventListener("dormscape:draft-saved",update);return()=>window.removeEventListener("dormscape:draft-saved",update);},[]);
  const cloud=!!user&&state.savedByUserId===user.id&&state.savedFingerprint===fingerprintState(state);
  return <span role="status" aria-live="polite">{cloud?"Saved to your account":status==="saved"?"Draft saved on this device":status==="session"?"Kept in this tab. Save a copy before closing.":"Browser storage unavailable. Save a copy to keep your room."}{recovered&&<> · Draft restored <button type="button" onClick={()=>setRecovered(false)} aria-label="Dismiss draft restored notice">×</button></>}</span>;
}
