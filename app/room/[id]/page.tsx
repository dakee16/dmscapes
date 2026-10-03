import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SharedRoomView from "@/components/room/SharedRoomView";
import type { SaveRoomRequest } from "@/lib/api-types";
import { getServiceClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  description: "A dorm room designed with Dormscape, the free AI dorm room planner.",
  robots: { index: false }, // share pages shouldn't compete with the planner in search
};

interface SavedRow extends SaveRoomRequest {
  id: string;
  created_at: string;
}

async function loadRoom(id: string): Promise<SavedRow | null> {
  if (!/^[A-Za-z0-9_-]{1,21}$/.test(id)) return null;
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("saved_rooms")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as SavedRow | null) ?? null;
}

export default async function SharedRoomPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const room = await loadRoom(id);
  if (!room) notFound();
  return <SharedRoomView id={id} room={room} />;
}
