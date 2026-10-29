import { getServiceClient } from "@/lib/supabase-server";

/**
 * Public reviews: feedback where the person ticked "Show this as a review" and
 * the owner has since set approved_at (docs/migrations/20261028_public_reviews.sql).
 * Server only. Returns nothing when the table or columns aren't there yet.
 */
export interface PublicReview {
  rating: number;
  text: string;
  name: string;
  school: string | null;
  /** ISO timestamp it was approved */
  date: string;
}

/** Review stars go in structured data only once there are this many real reviews to show. */
export const MIN_REVIEWS_FOR_RATING = 5;

export async function publicReviews(): Promise<{ reviews: PublicReview[]; count: number; average: number }> {
  const none = { reviews: [], count: 0, average: 0 };
  const db = getServiceClient();
  if (!db) return none;
  const { data, error } = await db
    .from("purchase_feedback")
    .select("rating, feedback_text, display_name, school_name, approved_at")
    .eq("public_ok", true)
    .not("approved_at", "is", null)
    .order("approved_at", { ascending: false })
    .limit(500);
  if (error || !data) return none;
  const reviews: PublicReview[] = data
    .filter((r) => r.feedback_text?.trim() && r.display_name?.trim())
    .map((r) => ({
      rating: r.rating,
      text: r.feedback_text.trim(),
      name: r.display_name.trim(),
      school: r.school_name?.trim() || null,
      date: r.approved_at,
    }));
  if (!reviews.length) return none;
  const average = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
  return { reviews, count: reviews.length, average };
}
