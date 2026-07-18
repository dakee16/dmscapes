// Request/response contracts between the planner UI and the API routes.
// The API implements these; the UI imports them. Keep in sync with the
// Supabase schema in supabase/migrations/.
import type { FurnitureItem, ProductCategory, StyleId } from "./types";

// POST /api/room-submissions  (request-school modal + /add-school form)
export interface RoomSubmissionRequest {
  college_name: string;
  dorm_name?: string;
  room_type?: string;
  length_ft?: number;
  width_ft?: number;
  email?: string;
  notes?: string;
}
export interface RoomSubmissionResponse {
  ok: true;
}

// POST /api/rooms  (save a design / generate share link)
export interface SaveRoomRequest {
  college_id: string | null;
  dorm_id: string | null;
  room_dimensions: {
    length_ft: number;
    width_ft: number;
    room_type: string;
    occupants: number;
  };
  style: StyleId;
  budget: number;
  template_id: string;
  furniture_positions: FurnitureItem[];
  /** category -> product id (defaults + swaps resolved). */
  selected_products: Partial<Record<ProductCategory, string>>;
}
export interface SaveRoomResponse {
  /** Short id used in the share URL: /room/[id] */
  id: string;
}

// GET /api/rooms/[id]
export interface SavedRoomResponse extends SaveRoomRequest {
  id: string;
  created_at: string;
}

// POST /api/product-clicks
export interface ProductClickRequest {
  session_id: string;
  product_id: string;
  product_price?: number;
  affiliate_url?: string;
}

// GET /api/username?u={candidate}  (pre-flight availability check; the
// unique index in 0002_profiles.sql is the real gate against races)
export interface UsernameCheckResponse {
  /** null when the server can't check (Supabase not configured). */
  available: boolean | null;
  error?: string;
}
