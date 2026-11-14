/*
 * DRAFT copy: owner supplies final copy.
 *
 * Every word on /compare/dorm-room-planners lives here, so the final copy can be
 * pasted over this file without touching the page (app/compare/dorm-room-planners).
 * Rules for the final copy:
 * - dormscape's numbers come from code: prices and credits from lib/plan, school,
 *   hall and room counts from the school data. Keep the ${...} parts.
 * - Planner 5D and EZDorms facts come only from their own pages, quoted in SOURCES
 *   with the date we read them (CHECKED). Anything their pages don't say is "Not stated".
 * - Brand is lowercase "dormscape"; competitor names as they write them.
 */
import type { HeadlineLine } from "@/components/ds/Headline";
import { HALL_COUNT, SCHOOL_COUNT } from "@/lib/home-data";
import { FREE_PLAN_CAP, PLUS_INITIAL_CREDITS, PLUS_PRICE_USD, PRO_INITIAL_CREDITS, PRO_PRICE_USD } from "@/lib/plan";
import { SCHOOLS, publishedDimsCount } from "@/lib/schools";

const fmt = (n: number) => n.toLocaleString("en-US");
const usd = (n: number) => `$${n.toFixed(2)}`;
const PUBLISHED = SCHOOLS.reduce((n, s) => n + publishedDimsCount(s), 0);

/** When we last read Planner 5D's and EZDorms' pages (YYYY-MM-DD). */
export const CHECKED = "2026-11-14";
/** When this page first went up (structured data). */
export const PUBLISHED_ON = "2026-11-14";

export const META = {
  /** First option that fits a search result is used. */
  titles: ["dormscape vs Planner 5D vs EZDorms"],
  descriptions: [
    "dormscape, Planner 5D and EZDorms side by side for a dorm room: real room dimensions, price, 3D and planning with roommates, from each product's own pages.",
    "dormscape, Planner 5D and EZDorms compared for a dorm room: room dimensions, price, 3D and roommates.",
  ],
  /** Breadcrumb and structured-data name. */
  name: "dormscape vs Planner 5D vs EZDorms",
  /** One line for the /compare card and llms.txt. */
  summary: "Three dorm room planners on real room dimensions, price, 3D and planning with roommates.",
};

export const HERO = {
  /** Shown as: eyebrow · checked <date> · by <founder> */
  eyebrow: "Dorm room planners compared",
  checked: "checked",
  by: "by",
  lines: [
    { text: "Three planners,", riso: true },
    { text: "one dorm room.", serif: true },
  ] satisfies HeadlineLine[],
  lede: "dormscape, Planner 5D and EZDorms all help you plan a dorm room, in very different ways. Here they are on the four things students ask about most: real room sizes, price, 3D and planning with roommates, using only what each product says about itself.",
};

export const COLUMNS = ["dormscape", "Planner 5D", "EZDorms"] as const;

export const TABLE = {
  title: [{ text: "Side by side," }, { text: "feature by feature.", serif: true }] satisfies HeadlineLine[],
  corner: "For a dorm room",
  /** [criterion, dormscape, Planner 5D, EZDorms] */
  rows: [
    [
      "Real room dimensions",
      `Preloaded for ${fmt(HALL_COUNT)} residence halls at ${SCHOOL_COUNT} schools. ${fmt(PUBLISHED)} room types use the size the school publishes; the rest are estimates, labelled as such. Not listed? Draw your room with Plus.`,
      "You enter the size yourself, or upload a floor plan for AI recognition. Its dorm page doesn't mention preloaded sizes for any school or hall.",
      "Not stated. Its site describes an AI design assistant and real dorm photos, not room measurements.",
    ],
    [
      "Price: free",
      `${FREE_PLAN_CAP} generated room plan, real room sizes, the 2D editor and three vibes. Saving is free. No account needed to start.`,
      "Free plan at $0 with no time limit: 2D and 3D design, unlimited projects and half the furniture catalog. You register an account first.",
      "Free. Its site calls it a free dorm design tool powered by AI.",
    ],
    [
      "Price: paid",
      `Plus ${usd(PLUS_PRICE_USD)} (${PLUS_INITIAL_CREDITS} plan credits) or Pro ${usd(PRO_PRICE_USD)} (${PRO_INITIAL_CREDITS} plan credits), one time. No subscription.`,
      "Premium $19.99 a month or $59.99 a year; Professional $49.99 a month or $399.99 a year (published US prices).",
      "No paid plans listed.",
    ],
    [
      "3D",
      "Yes, with Pro: the 3D Room Studio shows your layout in 3D, and the 3D Room Builder makes odd-shaped rooms. Free and Plus are 2D.",
      "Yes, on the free plan. Photorealistic renders need a paid plan.",
      "Not stated.",
    ],
    [
      "Planning with roommates",
      "Share any room with a link for free. Pro adds a shared room for up to four people, with a shared shopping list, who brings what, and comments.",
      "Plan a shared room with two or more beds and desks. Live Collaboration is included on every plan, Free too.",
      "Not stated.",
    ],
  ] as [string, string, string, string][],
  /** Followed by the CHECKED date. */
  caption: "From each product's own pages, last read",
};

export const PICKS = {
  title: [{ text: "Which one" }, { text: "fits you?", serif: true }] satisfies HeadlineLine[],
  cards: [
    {
      heading: "Planner 5D may suit you better if",
      items: [
        "You want 3D without paying for it.",
        "Your school isn't on dormscape and you want to enter your own measurements for free.",
        "You want apps for iOS, Android, Windows or macOS, or to design more than a dorm room.",
      ],
    },
    {
      heading: "EZDorms may suit you better if",
      items: [
        "You want shopping ideas more than a measured plan: its free AI assistant suggests items from IKEA, Target, Amazon, Walmart and other stores.",
        "You want to browse photos of real dorm rooms.",
      ],
    },
    {
      heading: "dormscape fits better if",
      us: true,
      items: [
        `Your school is one of the ${SCHOOL_COUNT} on dormscape: your actual room is drawn to scale from the size your housing office publishes.`,
        "You want a layout that fits and a shopping list matched to your budget, in one go.",
        "You want to settle who brings what with your roommates before move-in.",
        "You'd rather pay once than subscribe.",
      ],
    },
  ],
};

export const SOURCES = {
  title: [{ text: "Where these" }, { text: "facts come from.", serif: true }] satisfies HeadlineLine[],
  note: "Everything about Planner 5D and EZDorms is quoted from their own pages. Products change, so check their sites for the latest. dormscape's column comes straight from our pricing and school data.",
  /** Followed by the CHECKED date. */
  read: "Last read",
  report: "Spot something out of date?",
  reportLink: "Tell us",
  linkLabel: "Source",
  list: [
    { product: "Planner 5D", url: "https://planner5d.com/use/dorm-room-planner", quote: "Start from scratch, add exact dimensions, or upload an existing floor plan for recognition." },
    {
      product: "Planner 5D",
      url: "https://planner5d.com/use/dorm-room-planner",
      quote: "Yes. Create the room at its real size, add two or more beds, desks, wardrobes, and storage pieces, then compare arrangements in 2D and 3D. This can help roommates discuss zones, shared items, and clear walking paths.",
    },
    { product: "Planner 5D", url: "https://planner5d.com/use/dorm-room-planner", quote: "Web, iOS, Android, Windows and macOS" },
    {
      product: "Planner 5D",
      url: "https://planner5d.com/pricing",
      quote: "Yes. Planner 5D's Free plan costs $0 and covers the core online home-design workflow with no time limit. Create and share projects, draw floor plans, design rooms and homes in 2D and 3D, work across web and mobile, and use 50% of the furniture catalog.",
    },
    { product: "Planner 5D", url: "https://planner5d.com/pricing", quote: "Plan your room in 3D for free" },
    {
      product: "Planner 5D",
      url: "https://planner5d.com/pricing",
      quote: "Upgrade when you want the complete catalog of 10,000+ furniture items, AI floor plan recognition, photorealistic renders, AI Studio credits, immersive walkthroughs, or professional presentation and export tools.",
    },
    { product: "Planner 5D", url: "https://planner5d.com/pricing", quote: "It costs $19.99 with monthly billing or $59.99 billed annually", context: "(Premium)" },
    {
      product: "Planner 5D",
      url: "https://planner5d.com/pricing",
      quote: "It costs $49.99 with monthly billing or $399.99 billed annually",
      context: "(Professional). “These are published US prices; local currency and taxes may vary.”",
    },
    { product: "Planner 5D", url: "https://planner5d.com/pricing", quote: "Live Collaboration", context: "is marked included for Free, Premium and Professional in the plan table." },
    {
      product: "Planner 5D",
      url: "https://support.planner5d.com/en/articles/5876686-registering-an-account-web",
      quote: "Before you can start designing your dream home, you will need to register an account.",
    },
    { product: "EZDorms", url: "https://ezdorms.com/", quote: "FREE College Dorm Design Tool Powered By AI." },
    { product: "EZDorms", url: "https://ezdorms.com/", quote: "Upload A Photo Of Your Favorite Room Design To Get Started!" },
    {
      product: "EZDorms",
      url: "https://ezdorms.com/",
      quote: "Millions Of Student Approved Items From Top Retailers Including Amazon, Target, Walmart, Ikea, Dormify And Many More!",
    },
    { product: "EZDorms", url: "https://ezdorms.com/", quote: "We Cataloged Thousands Of Real Dorm Photos For Easy Viewing." },
    {
      product: "EZDorms",
      url: "https://app.fastbots.ai/embed/cm0zd30mh05pen6bi10y8t6uo",
      quote: "EZDorms Free Designer",
      context: "is the chat assistant its homepage links to, with prompts such as “Ask me about my budget?” and “Show me Ikea items?”.",
    },
  ] as { product: (typeof COLUMNS)[number]; url: string; quote: string; context?: string }[],
  more: "Compare other dorm room planners",
};

export const CTA = {
  lead: "Try it on",
  tail: "your real room.",
  note: "Find your hall, see your room drawn to scale, then lay it out for free.",
  /** Button: signed-out or free visitors see the first, paid ones the second. */
  freeLabel: "Plan my room free",
  paidLabel: "Plan my room",
};
