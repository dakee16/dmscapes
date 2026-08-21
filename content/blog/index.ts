import type { BlogPost } from "./types";
import measure from "./how-to-measure-your-dorm-room";
import packing from "./dorm-packing-list-nobody-gives-you";
import cost from "./how-much-does-a-dorm-room-cost";
import small from "./small-dorm-room-ideas-that-work";
import style from "./how-to-pick-a-dorm-room-style";
import plusWorth from "./is-dormscape-plus-worth-it";
import compare from "./compare-two-dorm-room-designs";
import describeVibe from "./describe-your-dorm-room-in-words";

// The blog registry. To publish a post: add its file above and to this array.
// Everything else (index page, post pages, sitemap) reads from POSTS, so the
// page structure never has to change.
export const POSTS: BlogPost[] = [
  measure,
  packing,
  cost,
  small,
  style,
  plusWorth,
  compare,
  describeVibe,
].sort(
  // Newest first. ISO date strings sort correctly as plain strings.
  (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
);

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function allPostSlugs(): string[] {
  return POSTS.map((p) => p.slug);
}
