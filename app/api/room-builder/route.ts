import { NextResponse } from "next/server";
import { getUserId } from "@/lib/supabase-auth";
import { getServiceClient } from "@/lib/supabase-server";
import { canBuild3D } from "@/lib/plan";
import { builderError, builderRoom, parseBuilderDraft } from "@/lib/room-builder";
import { rateLimit } from "@/lib/rate-limit";

export const runtime="nodejs";
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
async function access(request:Request) {
  const limited=rateLimit(request,"room-builder",90,10*60*1000);
  if(!limited.allowed)return reply({error:"Too many requests. Try again shortly."},429);
  const db=getServiceClient();
  if(!db)return reply({error:"Account verification is temporarily unavailable. Your draft is safe; try again shortly."},503);
  const id=await getUserId(request);
  if(!id)return reply({error:"Sign in to use the 3D Room Builder."},401);
  try {
    const {data,error}=await db.from("profiles").select("plan").eq("id",id).single();
    if(error||!data)return reply({error:"Could not verify your plan. Please try again."},503);
    if(!canBuild3D(data))return reply({error:"The 3D Room Builder is included with Pro."},403);
  }catch{return reply({error:"Could not verify your plan. Please try again."},503);}
  return null;
}
export async function GET(request:Request) { return await access(request)??reply({allowed:true}); }
export async function POST(request:Request) {
  const denied=await access(request);if(denied)return denied;
  let draft;
  try {const text=await request.text();if(text.length>24000)return reply({error:"This draft is too large."},413);draft=parseBuilderDraft(JSON.parse(text));}catch{return reply({error:"This room draft could not be read."},400);}
  if(!draft)return reply({error:"The room contains invalid walls, openings, or dimensions."},400);
  const error=builderError(draft);if(error)return reply({error},400);
  // No generation credit or database write: validate the handoff, not a saved design.
  return reply({room:builderRoom(draft)});
}
