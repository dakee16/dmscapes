import { SCHOOLS } from "@/lib/schools";
import { POSTS } from "@/content/blog";
import { HALL_COUNT, LAYOUT_COUNT, SCHOOL_COUNT } from "@/lib/home-data";
import { FLEX_CREDIT_PRICE_USD, FREE_PLAN_CAP, PLUS_INITIAL_CREDITS, PLUS_PRICE_USD, PRO_INITIAL_CREDITS, PRO_PRICE_USD } from "@/lib/plan";
import { SITE_TAGLINE, absoluteUrl } from "@/lib/seo";

// /llms.txt (llmstxt.org): a plain map of the site for answer engines. Every
// count and price comes from the school data and lib/plan, built once.
export const dynamic = "force-static";

const usd = (n: number) => `$${n.toFixed(2)}`;
const link = (name: string, path: string, note?: string) => `- [${name}](${absoluteUrl(path)})${note ? `: ${note}` : ""}`;

export function GET() {
  const body = [
    "# Dormscape",
    "",
    `> ${SITE_TAGLINE} Pick your school, hall and room type, choose a style and a budget, and get a to-scale layout with a shoppable list.`,
    "",
    `Dormscape covers ${SCHOOL_COUNT} schools, ${HALL_COUNT.toLocaleString("en-US")} residence halls and ${LAYOUT_COUNT.toLocaleString("en-US")} room types. Room dimensions come from what each school publishes, and anything estimated is labelled as an estimate.`,
    "",
    "## Plans",
    `- Free: ${FREE_PLAN_CAP} generated room plan. Saving is always free.`,
    `- Plus: ${usd(PLUS_PRICE_USD)} one time, ${PLUS_INITIAL_CREDITS} plan credits.`,
    `- Pro: ${usd(PRO_PRICE_USD)} one time, ${PRO_INITIAL_CREDITS} plan credits, custom vibes and 3D tools.`,
    `- Extra plan credits: ${usd(FLEX_CREDIT_PRICE_USD)} each.`,
    "",
    "## Main pages",
    link("Plan your dorm room", "/plan"),
    link("Dorm room dimensions by college", "/colleges"),
    link("Draw your dorm room floor plan", "/plan/draw"),
    link("3D Room Builder", "/plan/draw/3d"),
    link("Pricing", "/pricing"),
    link("FAQ", "/faq"),
    link("How we measure dorm rooms", "/methodology"),
    link("About", "/about"),
    "",
    "## Guides",
    ...POSTS.map((post) => link(post.title, `/blog/${post.slug}`, post.description)),
    "",
    "## Colleges",
    ...SCHOOLS.map((school) => link(`${school.name} dorm room dimensions`, `/colleges/${school.id}`)),
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
