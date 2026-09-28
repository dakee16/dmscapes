"use client";
import { createContext, useContext } from "react";
export interface WorkspaceAccess {
  id: string;
  members: {user_id: string; display_name: string}[];
  ownerPro: boolean;
  canEdit: boolean;
  section: "room" | "shopping" | "roommates";
}
export const WorkspaceContext = createContext<WorkspaceAccess | null>(null);
export const useWorkspace = () => useContext(WorkspaceContext);

export function useWorkspacePeople(fallback: {id:string;name:string;color:string}[]) {
  const room = useWorkspace();
  const colors = ["#304bff", "#ca8459", "#689880", "#a27cbd", "#d2a633", "#5d9ba8", "#d0788b", "#899346"];
  return room ? [...room.members.map((m,i) => ({id:m.user_id,name:m.display_name,color:colors[i%colors.length]})), ...fallback.filter(p => !room.members.some(m => m.user_id === p.id))] : fallback;
}
