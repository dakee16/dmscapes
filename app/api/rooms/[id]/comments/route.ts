import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
const validId=(id:string)=>/^[A-Za-z0-9_-]{1,21}$/.test(id);
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){
  const {id}=await params;if(!validId(id))return NextResponse.json({error:"Room not found."},{status:404});
  const limit=rateLimit(request,"room-review-read",60,60_000);if(!limit.allowed)return NextResponse.json({error:"Please wait a moment."},{status:429});
  const db=getServiceClient();if(!db)return NextResponse.json({error:"Reviews are temporarily unavailable."},{status:503});
  const {data:room,error:roomError}=await db.from("saved_rooms").select("id").eq("id",id).maybeSingle();if(roomError)return NextResponse.json({error:"Reviews are temporarily unavailable."},{status:503});if(!room)return NextResponse.json({error:"Room not found."},{status:404});
  const {data,error}=await db.from("room_review_comments").select("id,display_name,body,alternative_id,created_at").eq("room_id",id).order("created_at",{ascending:false}).limit(100);
  if(error)return NextResponse.json({error:"Comments are not available yet. You can still review this room and its alternatives."},{status:503});
  return NextResponse.json({comments:(data??[]).reverse()},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:Request,{params}:Context){
  const {id}=await params;if(!validId(id))return NextResponse.json({error:"Room not found."},{status:404});
  const userId=await getUserId(request);if(!userId)return NextResponse.json({error:"Sign in to comment."},{status:401});
  const limit=rateLimit(request,`room-review:${userId}`,8,600_000);if(!limit.allowed)return NextResponse.json({error:"Please give others a chance to reply. Try again shortly."},{status:429,headers:{"Retry-After":String(limit.retryAfterSec)}});
  let body:unknown;try{body=await request.json();}catch{return NextResponse.json({error:"Invalid comment."},{status:400});}
  const value=body as Record<string,unknown>;
  if(!value||typeof value.body!=="string"||!value.body.trim()||value.body.length>1200||typeof value.displayName!=="string"||!value.displayName.trim()||value.displayName.length>40||value.alternativeId!=null&&(typeof value.alternativeId!=="string"||value.alternativeId.length>60))return NextResponse.json({error:"Add a name and a comment of up to 1,200 characters."},{status:400});
  const db=getServiceClient();if(!db)return NextResponse.json({error:"Reviews are temporarily unavailable."},{status:503});
  const {data:room,error:roomError}=await db.from("saved_rooms").select("room_dimensions").eq("id",id).maybeSingle();if(roomError)return NextResponse.json({error:"Reviews are temporarily unavailable."},{status:503});if(!room)return NextResponse.json({error:"Room not found."},{status:404});
  if(value.alternativeId&&!(room.room_dimensions?.editor?.planning?.alternatives??[]).some((a:{id:string})=>a.id===value.alternativeId))return NextResponse.json({error:"That alternative is not in this saved room."},{status:400});
  const {data,error}=await db.from("room_review_comments").insert({room_id:id,user_id:userId,display_name:value.displayName.trim(),body:value.body.trim(),alternative_id:value.alternativeId??null}).select("id,display_name,body,alternative_id,created_at").single();
  if(error)return NextResponse.json({error:"Could not post your comment. Your draft is still here."},{status:503});
  return NextResponse.json({comment:data},{status:201});
}
