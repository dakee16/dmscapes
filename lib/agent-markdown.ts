import { SCHOOLS, getSchool } from "@/lib/schools";
import { PILOT_SCHOOLS, hallFinderLive } from "@/lib/hall-finder";
import { POSTS } from "@/content/blog";
import { HALL_COUNT, LAYOUT_COUNT, SCHOOL_COUNT } from "@/lib/home-data";
import { FLEX_CREDIT_PRICE_USD, FREE_PLAN_CAP, PLUS_INITIAL_CREDITS, PLUS_PRICE_USD, PRO_INITIAL_CREDITS, PRO_PRICE_USD } from "@/lib/plan";
import { CONTACT_EMAIL, SITE_TAGLINE, absoluteUrl } from "@/lib/seo";

// Markdown views of the site for answer engines and AI agents: /llms.txt and the
// homepage's text/markdown version. Every count and price comes from the school
// data and lib/plan; the wording is the site's own.

const usd = (n: number) => `$${n.toFixed(2)}`;
const link = (name: string, path: string, note?: string) => `- [${name}](${absoluteUrl(path)})${note ? `: ${note}` : ""}`;

const coverage = () =>
  `dormscape covers ${SCHOOL_COUNT} schools, ${HALL_COUNT.toLocaleString("en-US")} residence halls and ${LAYOUT_COUNT.toLocaleString("en-US")} room types. Room dimensions come from what each school publishes, and anything estimated is labelled as an estimate.`;

const plans = () => [
  "## Plans",
  `- Free: ${FREE_PLAN_CAP} generated room plan. Saving is always free.`,
  `- Plus: ${usd(PLUS_PRICE_USD)} one time, ${PLUS_INITIAL_CREDITS} plan credits.`,
  `- Pro: ${usd(PRO_PRICE_USD)} one time, ${PRO_INITIAL_CREDITS} plan credits, custom vibes and 3D tools.`,
  `- Extra plan credits: ${usd(FLEX_CREDIT_PRICE_USD)} each.`,
];

const mainPages = () => [
  "## Main pages",
  link("Plan your dorm room", "/plan"),
  link("Dorm room planner", "/dorm-room-planner", "how the planner works, what's free, and dorm room sizes"),
  link("Dorm room dimensions by college", "/colleges"),
  link("Average dorm room size", "/dorm-room-size", "typical single, double and triple sizes from the dimensions colleges publish"),
  link("Dorm loft and bunk rules by college", "/dorm-bed-rules", "whether each school allows lofted or bunked beds, risers and loft kits, with sources"),
  link("Dorm rug size calculator", "/dorm-rug-size", "the biggest standard rug that fits a dorm room's open floor"),
  link("Loft bed clearance calculator", "/loft-bed-clearance", "what fits under a lofted or raised dorm bed"),
  link("Twin XL sheets for dorms", "/twin-xl-sheets", "dorm bed sizes and which schools use beds other than Twin XL"),
  link("Dorm room planners compared", "/compare", "dormscape next to other dorm room planners"),
  link("Draw your dorm room floor plan", "/plan/draw"),
  link("3D Room Builder", "/plan/draw/3d"),
  link("My Room", "/my-room", "a shared dorm room for roommates (Pro): split the room, settle who brings what"),
  link("Pricing", "/pricing"),
  link("FAQ", "/faq"),
  link("How we measure dorm rooms", "/methodology"),
  link("About", "/about"),
  link("Contact", "/contact", CONTACT_EMAIL),
];

/** Hall Finder and the schools it works at, once it is live (until then its pages are noindex and unlinked). */
const hallFinder = () =>
  hallFinderLive()
    ? [
        "## Hall Finder",
        link("Hall Finder", "/hall-finder", "rank a school's residence halls by the weekly walk to your classes, with walking routes on a map"),
        ...PILOT_SCHOOLS.flatMap((id) => {
          const school = getSchool(id);
          return school ? [link(`${school.name} Hall Finder`, `/colleges/${school.id}/hall-finder`, `ranks ${school.name} halls by walking time`)] : [];
        }),
        "",
      ]
    : [];

const guidesAndColleges = () => [
  "## Guides",
  ...POSTS.map((post) => link(post.title, `/blog/${post.slug}`, post.description)),
  "",
  "## Colleges",
  ...SCHOOLS.map((school) => link(`${school.name} dorm room dimensions`, `/colleges/${school.id}`)),
];

/** /llms.txt (llmstxt.org): a plain map of the site. */
export function llmsTxt(): string {
  return [
    "# dormscape",
    "",
    `> ${SITE_TAGLINE} Pick your school, hall and room type, choose a style and a budget, and get a to-scale layout with a shoppable list.`,
    "",
    coverage(),
    "",
    ...plans(),
    "",
    ...mainPages(),
    "",
    ...hallFinder(),
    ...guidesAndColleges(),
    "",
  ].join("\n");
}

/** /llms-full.txt: the same map, then every FAQ answer in full, grouped by its guide. */
export function llmsFullTxt(): string {
  return [
    llmsTxt(),
    "## Dorm room questions, answered",
    "",
    ...POSTS.flatMap((post) => post.faqs?.length ? [
      `### ${post.faqTopic ?? post.title}`,
      "",
      `From the guide: ${absoluteUrl(`/blog/${post.slug}`)}`,
      "",
      ...post.faqs.flatMap(({ q, a }) => [`**${q}**`, "", a, ""]),
    ] : []),
  ].join("\n");
}

/** The homepage as Markdown: the hero's own words, then the same map as /llms.txt. */
export function homeMarkdown(): string {
  return [
    "# dormscape: your dorm, planned to the inch.",
    "",
    `> ${SITE_TAGLINE}`,
    "",
    "Find your exact room, choose a style and set a budget. Get a layout that fits and a shoppable list, before move-in day.",
    "",
    "No account needed to explore. Saving is always free.",
    "",
    coverage(),
    "",
    `Start planning: ${absoluteUrl("/plan")}`,
    "",
    ...plans(),
    "",
    ...mainPages(),
    "",
    ...hallFinder(),
    ...guidesAndColleges(),
    "",
  ].join("\n");
}
