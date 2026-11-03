import { SCHOOLS, getSchool, publishedDimsCount } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { hallSource, roomRows, schoolSource, schoolSummary, type Source } from "@/lib/school-facts";
import { shortDate } from "@/components/blog/topics";
import type { DormSummary, SchoolSummary } from "@/lib/types";
import { PILOT_SCHOOLS, hallFinderLive } from "@/lib/hall-finder";
import { POSTS } from "@/content/blog";
import { HALL_COUNT, LAYOUT_COUNT, SCHOOL_COUNT } from "@/lib/home-data";
import { FLEX_CREDIT_PRICE_USD, FREE_PLAN_CAP, PLUS_INITIAL_CREDITS, PLUS_PRICE_USD, PRO_INITIAL_CREDITS, PRO_PRICE_USD } from "@/lib/plan";
import { CONTACT_EMAIL, DATA_LICENSE, FOUNDER, SITE_TAGLINE, absoluteUrl } from "@/lib/seo";
import { COMPETITORS, shortCompetitorName } from "@/lib/compare";
import { PLANNER_FAQS } from "@/lib/guide-planner";
import { BED_RULE_FAQS } from "@/lib/guide-bed-rules";
import { RUG_FAQS } from "@/lib/guide-rug-size";
import { CLEARANCE_FAQS } from "@/lib/guide-loft-clearance";
import { TWIN_XL_FAQS } from "@/lib/guide-twin-xl";

// Markdown views of the site for answer engines and AI agents: /llms.txt, and the
// text/markdown versions of the homepage and the school and hall pages. Every count and price comes from the school
// data and lib/plan; the wording is the site's own.

const usd = (n: number) => `$${n.toFixed(2)}`;
const link = (name: string, path: string, note?: string) => `- [${name}](${absoluteUrl(path)})${note ? `: ${note}` : ""}`;

const coverage = () =>
  `dormscape covers ${SCHOOL_COUNT} schools, ${HALL_COUNT.toLocaleString("en-US")} residence halls and ${LAYOUT_COUNT.toLocaleString("en-US")} room types. Room dimensions come from what each school publishes, and anything estimated is labelled as an estimate. Each college and hall page links the housing page its sizes came from, with the date they were collected.`;

/** Who makes the site and how its data may be reused. */
const provenance = () =>
  `Made by ${FOUNDER.name}, dormscape's founder (${absoluteUrl(FOUNDER.path)}). The room-size and bed-rule tables are free to reuse under CC BY 4.0 (${DATA_LICENSE}): credit dormscape and link the page.`;

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
  ...COMPETITORS.map((c) => link(`dormscape vs ${shortCompetitorName(c)}`, `/compare/${c.slug}`, c.summary)),
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
    provenance(),
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

// The guide and tool pages' short answers, word for word as each page shows them.
const TOOL_FAQS = [
  { title: "Dorm room planner", path: "/dorm-room-planner", faqs: PLANNER_FAQS },
  { title: "Dorm loft and bunk rules", path: "/dorm-bed-rules", faqs: BED_RULE_FAQS },
  { title: "Dorm rug size", path: "/dorm-rug-size", faqs: RUG_FAQS },
  { title: "Loft bed clearance", path: "/loft-bed-clearance", faqs: CLEARANCE_FAQS },
  { title: "Twin XL sheets", path: "/twin-xl-sheets", faqs: TWIN_XL_FAQS },
];

/** /llms-full.txt: the same map, then every FAQ answer in full, grouped by its guide. */
export function llmsFullTxt(): string {
  return [
    llmsTxt(),
    "## Dorm room questions, answered",
    "",
    ...TOOL_FAQS.flatMap(({ title, path, faqs }) => [
      `### ${title}`,
      "",
      `From the page: ${absoluteUrl(path)}`,
      "",
      ...faqs.flatMap(({ q, a }) => [`**${q}**`, "", a, ""]),
    ]),
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

const sourceLine = (src: Source | null, what: string) =>
  src ? `${what} from [${src.host}](${src.url})${src.collected ? `, collected ${shortDate(src.collected)}` : ""}.` : "";

/** A school page (/colleges/[id]) as Markdown: the answer, the source, then every hall with its rooms. */
export function schoolMarkdown(school: SchoolSummary): string {
  const short = shortName(school);
  const published = publishedDimsCount(school);
  const place = [school.city, school.state].filter(Boolean).join(", ");
  const summary = schoolSummary(school, short, published);
  const room = (r: ReturnType<typeof roomRows>[number]) =>
    `${r.name}${r.dims ? ` ${r.dims}` : ""}${r.sqft ? ` (${r.sqft} sq ft)` : ""}${r.status === "Estimated" ? ", estimated" : r.status === "Not published" ? ", size not published" : ""}`;
  return [
    `# ${short} dorm room sizes`,
    "",
    `> ${school.name}${place ? `, ${place}` : ""}: ${school.dorms.length} residence halls${published > 0 ? `, ${published} room types with dimensions the school publishes` : ""}.`,
    "",
    ...(summary ? [summary, ""] : []),
    sourceLine(schoolSource(school.id), published > 0 ? "Published room sizes" : "Room types"),
    "Sizes marked estimated are dormscape's estimates from similar rooms, not the school's.",
    "",
    "## Residence halls",
    ...[...school.dorms]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((d) => `- [${d.name}](${absoluteUrl(`/colleges/${school.id}/${d.id}`)}): ${roomRows(d).map(room).join("; ")}`),
    "",
    `Plan a ${short} room to scale, free: ${absoluteUrl(`/plan?school=${school.id}`)}`,
    `This page: ${absoluteUrl(`/colleges/${school.id}`)}`,
    "",
  ].join("\n");
}

/** A hall page (/colleges/[id]/[dorm]) as Markdown: every room type as one table, with its source. */
export function hallMarkdown(school: SchoolSummary, dorm: DormSummary): string {
  const short = shortName(school);
  const rows = roomRows(dorm);
  const published = rows.filter((r) => r.status === "Published").length;
  const place = [school.city, school.state].filter(Boolean).join(", ");
  const cell = (v: string | number | null) => (v === null ? "Not published" : String(v).replace(/\|/g, "/"));
  return [
    `# ${dorm.name} room dimensions (${short})`,
    "",
    `> ${rows.length} room type${rows.length === 1 ? "" : "s"} at ${school.name}${place ? ` in ${place}` : ""}${published > 0 ? `, ${published} with dimensions published by the university` : ""}.`,
    "",
    "| Room type | Size | Floor area | Beds | Size is |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map(
      (r) =>
        `| ${cell(r.name)}${r.occupants ? `, sleeps ${r.occupants}` : ""} | ${cell(r.dims)} | ${r.sqft ? `${r.sqft} sq ft` : "Not published"} | ${r.bed} | ${r.status === "Published" ? "Published by the school" : r.status === "Estimated" ? "dormscape estimate" : "Not published"} |`
    ),
    "",
    sourceLine(hallSource(school.id, dorm.id), published > 0 ? "Room sizes" : "Room types"),
    "",
    `More ${short} halls: ${absoluteUrl(`/colleges/${school.id}`)}`,
    `Plan this room to scale, free: ${absoluteUrl(`/plan?school=${school.id}&dorm=${dorm.id}`)}`,
    `This page: ${absoluteUrl(`/colleges/${school.id}/${dorm.id}`)}`,
    "",
  ].join("\n");
}
