"use client";
import { createContext, useContext } from "react";
import type { WorkspaceComment } from "@/lib/workspace";
import type { CursorPoint, RoomSection } from "@/lib/workspace-collaboration";
import { PERSON_COLORS } from "./people";
/** A comment (or, for editors, a "Look here") started on the plan or the 3D room: what's under the pointer and where the menu goes. */
export interface CanvasGesture { via: "context_menu" | "double_click" | "long_press" | "keyboard"; point: CursorPoint; clientX: number; clientY: number; surface: "plan" | "scene"; canvas: HTMLElement | null }
export interface WorkspaceAccess {
  id: string;
  members: {user_id: string; display_name: string}[];
  ownerPro: boolean;
  canEdit: boolean;
  section: RoomSection;
  comments?: WorkspaceComment[];
  commentOn?: (target:string) => void;
  /** Present when the canvases should answer right-click, double-click, long press and the Menu key. */
  canvasGesture?: (gesture: CanvasGesture) => void;
  /** Plan overlay switches from the room's left rail (comment pins, everyone's cursors). */
  overlay?: { pins: boolean; cursors: boolean };
}
export const WorkspaceContext = createContext<WorkspaceAccess | null>(null);
export const useWorkspace = () => useContext(WorkspaceContext);

/** Everyone who can own a piece: room members in join order (host first, in the
 * My Room colours), then any roommates named in the plan who haven't joined. */
export function useWorkspacePeople(fallback: {id:string;name:string;color:string}[]) {
  const room = useWorkspace();
  return room ? [...room.members.map((m,i) => ({id:m.user_id,name:m.display_name,color:PERSON_COLORS[i%PERSON_COLORS.length]})), ...fallback.filter(p => !room.members.some(m => m.user_id === p.id))] : fallback;
}
