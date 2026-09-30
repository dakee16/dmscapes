import type { SaveRoomRequest } from "./api-types";

export type WorkspaceRole = "owner" | "editor" | "commenter";
export interface RoomWorkspace {
  id: string;
  owner_id: string;
  name: string;
  snapshot: SaveRoomRequest;
  revision: number;
  shared: boolean;
  source_room_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface WorkspaceMember {
  user_id: string;
  display_name: string;
  role: WorkspaceRole;
}
export interface WorkspaceComment {
  id: string;
  user_id: string;
  display_name: string;
  body: string;
  target: string;
  resolved: boolean;
  created_at: string;
}
export interface WorkspaceVersion {
  id: string;
  revision: number;
  name: string;
  created_at: string;
}
export interface WorkspaceDetail {
  workspace: RoomWorkspace;
  role: WorkspaceRole;
  ownerPro: boolean;
  canEdit: boolean;
  members: WorkspaceMember[];
  comments: WorkspaceComment[];
  versions: WorkspaceVersion[];
  /** Only returned to the room owner. */
  invitations: { id: string; email: string; role: "editor" | "commenter"; expires_at: string }[];
}
export interface WorkspaceSummary extends RoomWorkspace {
  role: WorkspaceRole;
  member_count: number;
}
export const WORKSPACE_MEMBER_LIMIT = 4;
export const WORKSPACE_SHARED_LIMIT = 1;

/** One identity for autosave. Transient panels and selection never count as edits. */
export function snapshotKey(snapshot: SaveRoomRequest): string {
  const copy = structuredClone(snapshot);
  if (copy.room_dimensions.editor?.planning) copy.room_dimensions.editor.planning.lastPanel = "shop";
  return JSON.stringify(copy);
}
