import { POSTS } from "@/content/blog";
import { COMPETITORS, shortCompetitorName } from "@/lib/compare";

/**
 * Everything the site search (components/site/SearchPalette) can take you to besides schools and
 * halls: every page and feature, with the words people use for it ("roommate planning" finds My
 * Room). Sent with the schools in /search-index.json, so it only loads when the search opens.
 * One row per destination: [title, detail, href, words, Hall Finder only (1) or not (0)].
 * Details reuse the nav's wording where the nav has it. Add a row when you add a page.
 */
export type PageRow = [title: string, detail: string, href: string, words: string, hallFinder: 0 | 1];

const CORE: PageRow[] = [
  ["Plan my room", "A layout and shopping list, together", "/plan", "plan planner start new design layout furniture arrange shopping list pick school hall dorm room planning", 0],
  ["Plan with roommates", "The room you share with your roommates", "/my-room", "my room roommates roommate roomate shared room together collaborate invite friends who brings what split share group plan roommate planning pro", 0],
  ["Join a shared room", "Open an invite from a roommate", "/rooms/join", "join invite invitation link code roommate shared room accept", 0],
  ["Hall Finder", "Rank halls by your class schedule", "/hall-finder", "hall finder rank halls class classes schedule walk walking closest nearest commute distance which dorm housing preferences", 1],
  ["Colleges A to Z", "Every supported school", "/colleges", "colleges schools universities campus list all browse", 0],
  ["Draw your own room", "Start with your own dimensions", "/plan/draw", "draw custom own room dimensions measure measurements not listed 2d sketch irregular shape", 0],
  ["Build in 3D", "Walls, doors and windows with Pro", "/plan/draw/3d", "3d builder build three dimensional walls doors windows irregular room studio pro", 0],
  ["Create your own vibe", "Put your room into words", "/plan/create-vibe", "create custom vibe style describe words theme aesthetic pro", 0],
  ["Room gallery", "Real layouts students shared", "/gallery", "gallery examples inspiration ideas real layouts shared designs other students", 0],
  ["How big is a dorm room?", "Typical sizes, drawn to scale", "/dorm-room-size", "dorm room size sizes dimensions square feet sq ft how big average typical measurements", 0],
  ["Dorm room planner", "Plan a dorm room online, free", "/dorm-room-planner", "dorm room planner online free tool layout design app", 0],
  ["Dorm bed rules", "Lofting and bunking, school by school", "/dorm-bed-rules", "bed rules loft lofting bunk bunking raise bed allowed policy", 0],
  ["Loft bed clearance", "How much room above a lofted bed", "/loft-bed-clearance", "loft bed clearance ceiling height headroom calculator lofted", 0],
  ["Dorm rug size", "The rug that fits your room", "/dorm-rug-size", "rug size calculator carpet floor", 0],
  ["Twin XL sheets", "What fits a dorm mattress", "/twin-xl-sheets", "twin xl sheets bedding mattress size bed", 0],
  ["Pricing", "Free to plan, pay once to go further", "/pricing", "pricing price cost free plus pro credits buy upgrade plans payment one time", 0],
  ["My designs", "Your saved designs", "/account", "my designs saved designs account profile history rooms", 0],
  ["Compare designs", "Two designs side by side", "/account/compare", "compare designs side by side two layouts", 0],
  ["Billing and credits", "Credits, receipts and your invite link", "/account/billing", "billing credits receipts invoices purchases invite link referral free design friends", 0],
  ["Account settings", "Email, password and preferences", "/account/settings", "account settings email password username photo marketing emails delete account", 0],
  ["Log in or sign up", "Save your designs to an account", "/login", "log in login sign in sign up signup register create account", 0],
  ["Room guides", "The dormscape blog", "/blog", "blog guides articles tips advice how to", 0],
  ["Frequently asked", "Short answers about planning a room", "/faq", "faq questions help answers support", 0],
  ["dormscape vs other planners", "Planner 5D, EZDorms and dormscape compared", "/compare/dorm-room-planners", "compare comparison alternatives planner 5d ezdorms other planners vs versus", 0],
  ["Compare dorm planners", "How dormscape stacks up", "/compare", "compare comparison alternatives competitors vs versus", 0],
  ["How we measure", "Where the room sizes come from", "/methodology", "methodology how we measure data sources accuracy estimates published sizes", 0],
  ["About dormscape", "The people behind the plan", "/about", "about us team company founder story who", 0],
  ["Contact", "Questions, feedback or help", "/contact", "contact email support help question feedback reach", 0],
  ["Report a problem", "Something wrong? Tell us", "/report", "report problem bug issue error wrong size broken", 0],
  ["Add your school", "Tell us where you're headed", "/add-school", "add school missing request not listed my school isn't here", 0],
  ["Privacy policy", "How your data is handled", "/privacy", "privacy policy data personal information gdpr", 0],
  ["Cookie policy", "Cookies and analytics choices", "/cookies", "cookie cookies policy consent analytics tracking settings preferences choices opt out", 0],
  ["Terms of service", "The rules for using dormscape", "/terms", "terms of service conditions legal agreement", 0],
];

export function searchPages(): PageRow[] {
  return [
    ...CORE,
    ...COMPETITORS.map((c): PageRow => [`dormscape vs ${shortCompetitorName(c)}`, c.summary, `/compare/${c.slug}`, `compare comparison vs versus alternative ${c.name}`, 0]),
    ...POSTS.map((p): PageRow => [p.title, p.description, `/blog/${p.slug}`, `guide blog article ${p.description}`, 0]),
  ];
}
