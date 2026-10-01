import type { BlogMeta } from "@/content/blog/types";

/**
 * Blog topics for the /blog filters and the post crumbs. Posts carry no
 * category field, so each topic is a grouping of the posts' existing
 * `faqTopic` labels. A post whose faqTopic isn't listed here still shows under
 * "All"; a topic with no posts is never rendered.
 */
export const TOPICS = [
  {
    id: "3d",
    label: "3D",
    faqTopics: ["3D Room Builder", "Irregular rooms", "3D Room Studio", "Arranging in 3D"],
  },
  {
    id: "planning",
    label: "Planning & layouts",
    faqTopics: ["Planning a dorm room", "Dorm room layouts", "Small and awkward rooms", "Draw your own room"],
  },
  { id: "measuring", label: "Measuring", faqTopics: ["Measuring your room"] },
  { id: "budget", label: "Budget & packing", faqTopics: ["Budget and cost", "Packing", "Shared shopping"] },
  { id: "style", label: "Style", faqTopics: ["Style", "Create your own vibe"] },
  { id: "plus", label: "Plus & Pro", faqTopics: ["Plus", "Comparing", "My rooms and roommates"] },
] as const;

export type TopicId = (typeof TOPICS)[number]["id"];

export function topicOf(post: Pick<BlogMeta, "faqTopic">) {
  const t = post.faqTopic;
  if (!t) return undefined;
  return TOPICS.find((topic) => (topic.faqTopics as readonly string[]).includes(t));
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO yyyy-mm-dd as "Sep 24, 2026" (parsed by parts so it never shifts by timezone). */
export function shortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}, ${y}`;
}

/** The serializable slice of a post that cards and filters need. */
export type PostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readingTimeMin: number;
  topic?: TopicId;
};

export function summarize(post: BlogMeta): PostSummary {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    readingTimeMin: post.readingTimeMin,
    topic: topicOf(post)?.id,
  };
}

/** Phrase that finishes "Keep reading …" when every suggestion shares the topic. */
export const TOPIC_PHRASE: Record<TopicId, string> = {
  "3d": "in 3D.",
  planning: "on planning.",
  measuring: "on measuring.",
  budget: "on budget and packing.",
  style: "on style.",
  plus: "on Plus and Pro.",
};

/**
 * The part of each post title set in the serif second voice on the post page.
 * Only used when the title really ends with it; any other post's title is
 * set entirely in the display face.
 */
const TITLE_TAILS: Record<string, string> = {
  "how-to-measure-your-dorm-room": "before you move in",
  "plan-a-dorm-room-with-roommates": "from layout to shopping list",
  "shared-dorm-shopping-list": "without buying everything twice",
  "build-a-dorm-room-in-3d": "from the ground up in 3D",
  "plan-an-irregular-dorm-room-in-3d": "in 3D",
  "arrange-a-dorm-room-in-3d": "in 3D",
  "dorm-packing-list-nobody-gives-you": "nobody gives you",
  "how-much-does-a-dorm-room-cost": "in 2026",
  "small-dorm-room-ideas-that-work": "that actually work",
  "how-to-pick-a-dorm-room-style": "before you pick a dorm room style",
  "is-dormscape-plus-worth-it": "Here's what you actually get",
  "compare-two-dorm-room-designs": "side by side",
  "describe-your-dorm-room-in-words": "in words",
  "dorm-room-layout-ideas": "that actually fit",
};

export function splitTitle(slug: string, title: string): { lead: string; tail?: string } {
  const tail = TITLE_TAILS[slug];
  if (tail && title.endsWith(tail) && title.length > tail.length) {
    return { lead: title.slice(0, title.length - tail.length).trim(), tail };
  }
  return { lead: title };
}
