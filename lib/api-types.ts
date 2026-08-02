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
  /** Honeypot. Hidden from humans; any non-empty value marks the request as
   * bot traffic and the server quietly discards it. */
  website?: string;
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
    /** True when the size is a same-type estimate rather than published/entered. */
    estimated?: boolean;
  };
  style: StyleId;
  budget: number;
  template_id: string;
  furniture_positions: FurnitureItem[];
  /** category -> product id (defaults + swaps resolved). */
  selected_products: Partial<Record<ProductCategory, string>>;
  /** Required for a named "Save design" (needs an authed caller); absent for
   * the anonymous "copy share link" flow. */
  name?: string | null;
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

// GET /api/account/rooms  (the signed-in user's named designs, newest first)
export interface AccountRoomSummary {
  id: string;
  name: string;
  college_id: string | null;
  dorm_id: string | null;
  style: StyleId;
  budget: number;
  room_type: string;
  created_at: string;
  /** Room + layout, for the tile's mini layout preview. */
  length_ft: number | null;
  width_ft: number | null;
  furniture: FurnitureItem[] | null;
}
export interface AccountRoomsResponse {
  rooms: AccountRoomSummary[];
}

// POST /api/product-clicks
export interface ProductClickRequest {
  session_id: string;
  product_id: string;
  product_price?: number;
  affiliate_url?: string;
}

// POST /api/purchase-surveys  (post-buy return-to-tab confirmation prompt)
export type PurchaseSurveyResponse = "yes" | "still_deciding" | "no";
export interface PurchaseSurveyRequest {
  session_id: string;
  // User attribution is derived server-side from the Authorization bearer
  // token (signed-in callers attach it); a user_id in the body is ignored.
  response: PurchaseSurveyResponse;
  /** saved_rooms.id when the design was shared/saved this session, else null. */
  saved_room_id?: string | null;
  /** The session's design at prompt time (used when there's no saved_room_id). */
  room_snapshot?: {
    college_id?: string | null;
    dorm_id?: string | null;
    style?: string | null;
    budget?: number | null;
    room_dimensions?: {
      length_ft: number;
      width_ft: number;
      room_type: string;
      occupants: number;
    } | null;
  } | null;
  /** Cart total shown to the user when the prompt appeared. */
  cart_total?: number | null;
}
export interface PurchaseSurveyResponseBody {
  ok: true;
  /** Inserted row id; absent when Supabase isn't configured. The client keeps
   * it for the session so /thank-you feedback can link back to this record. */
  id?: string;
}

// POST /api/feedback  (confirmation-page rating + optional write-up)
export interface FeedbackRequest {
  session_id: string;
  // User attribution is derived server-side from the Authorization bearer
  // token (signed-in callers attach it); a user_id in the body is ignored.
  /** 1-5, required. */
  rating: number;
  /** Optional free-text; null/absent when left empty. */
  feedback_text?: string | null;
  /** purchase_surveys.id from the "yes" that led here, when known. */
  purchase_survey_id?: string | null;
}
export interface FeedbackResponseBody {
  ok: true;
}

// POST /api/contact  (Contact Us form → notification email + contact_submissions)
export interface ContactRequest {
  /** The sender's own email; required so we can reply. */
  from_email: string;
  name?: string;
  phone?: string;
  message: string;
  /** Honeypot. Hidden from humans; any non-empty value marks the request as
   * bot traffic and the server quietly discards it. */
  website?: string;
}
export interface ContactResponse {
  ok: true;
}

// GET /api/username?u={candidate}  (pre-flight availability check; the
// unique index in 0002_profiles.sql is the real gate against races)
export interface UsernameCheckResponse {
  /** null when the server can't check (Supabase not configured). */
  available: boolean | null;
  error?: string;
}
