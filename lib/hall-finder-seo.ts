// What the Hall Finder pages say about themselves to search and answer engines: the questions
// they answer (shown on the page and in the FAQPage schema, from one list so they always match)
// and the WebApplication schema. Counts and dates come from the campus data, prices from lib/plan.
import { PLUS_PRICE_USD, PRO_PRICE_USD } from "@/lib/plan";
import { SITE_URL, absoluteUrl, postalAddressJsonLd, webPageJsonLd } from "@/lib/seo";

const usd = (n: number) => `$${n.toFixed(2)}`;
const list = (items: string[]) => (items.length <= 2 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

/** "October 24, 2026" from an ISO timestamp, the same calendar day for every reader. */
export const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export interface SchoolFaq {
  q: string;
  a: string;
}

/** The questions one school's finder page answers. `areas` are its housing areas (may be empty). */
export function schoolFaqs({ short, ranked, areas, imagesOn }: { short: string; ranked: number; areas: string[]; imagesOn: boolean }): SchoolFaq[] {
  return [
    {
      q: `How do I find the ${short} dorm closest to my classes?`,
      a: `Open Hall Finder, add the buildings where your classes meet and the days you go to each, then rank. Hall Finder adds up each hall's walk to those buildings, there and back, for every class day, and lists the ${short} halls from the shortest week of walking to the longest.`,
    },
    {
      q: `Which ${short} residence halls does Hall Finder rank?`,
      a: `${ranked} ${short} residence halls${areas.length ? `, across ${list(areas)}` : ""}. Each one links to its own page with room sizes and a floor plan.`,
    },
    {
      q: `Can I upload my ${short} class schedule?`,
      a: imagesOn
        ? "Yes. Upload an .ics calendar file, or a screenshot or PDF of your weekly schedule. An .ics file is read in your browser and never sent to us. A screenshot or PDF needs a free account; it is read to find class buildings and days, and the file is not stored. You check what was read before anything is added."
        : "Yes. Upload an .ics calendar file exported from your school's schedule. It is read in your browser and never sent to us. You check what was found before anything is added.",
    },
    {
      q: `How does Hall Finder count walking time at ${short}?`,
      a: "Walks follow real paths and sidewalks from OpenStreetMap, door to door, at an average walking pace of about 3 mph. A week's walk is, for each place, the days you go times the one-way walk times two. It does not count buses, waiting at crossings or the order of your classes, so use it to compare halls rather than as a stopwatch.",
    },
    {
      q: `Is Hall Finder free at ${short}?`,
      a: `Adding places is free for everyone. A free account shows your #1 hall, its weekly walk, the minutes to each place and one walking route. Plus (${usd(PLUS_PRICE_USD)} once) and Pro (${usd(PRO_PRICE_USD)} once) rank every hall, show every route, compare two halls side by side, and let you save and share setups.`,
    },
    {
      q: "Does Hall Finder guarantee I get the hall it ranks first?",
      a: "No. Most schools assign rooms, so Hall Finder helps you rank your housing preferences with real walking times. It does not affect your school's housing assignment.",
    },
  ];
}

/** The questions the all-schools page answers. */
export function indexFaqs({ schools, ranked }: { schools: string[]; ranked: number }): SchoolFaq[] {
  return [
    {
      q: "What is Hall Finder?",
      a: `Hall Finder ranks a school's residence halls by how far you would walk to class each week. You add the buildings your classes are in and the days you go; it adds up every hall's walk there and back and lists the halls from the shortest week to the longest, with the walking routes on a map.`,
    },
    {
      q: "Which schools does Hall Finder work at?",
      a: `${list(schools)}. Together that is ${ranked} ranked residence halls. More schools are being added, and every school on dormscape still has its room sizes and a room planner.`,
    },
    {
      q: "Is Hall Finder free?",
      a: `Adding places is free for everyone. A free account shows your #1 hall, its weekly walk and one walking route. Plus (${usd(PLUS_PRICE_USD)} once) and Pro (${usd(PRO_PRICE_USD)} once) rank every hall, show every route, compare two halls side by side, and let you save and share setups.`,
    },
    {
      q: "Does Hall Finder guarantee I get the hall it ranks first?",
      a: "No. Most schools assign rooms, so Hall Finder helps you rank your housing preferences with real walking times. It does not affect your school's housing assignment.",
    },
  ];
}

/** One school's finder as a free web application, tied to the dormscape organization and the school. */
export function hallFinderAppJsonLd({ collegeId, short, schoolName, city, state, ranked, dateModified, description }: { collegeId: string; short: string; schoolName: string; city: string | null; state: string | null; ranked: number; dateModified: string; description: string }) {
  const url = absoluteUrl(`/colleges/${collegeId}/hall-finder`);
  const address = postalAddressJsonLd(city, state);
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${url}#app`,
    name: `${short} Hall Finder`,
    url,
    description,
    applicationCategory: "EducationalApplication",
    applicationSubCategory: "Residence hall finder",
    operatingSystem: "Any (web browser)",
    browserRequirements: "Requires JavaScript",
    inLanguage: "en",
    isAccessibleForFree: true,
    dateModified,
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    about: { "@type": "CollegeOrUniversity", name: schoolName, url: absoluteUrl(`/colleges/${collegeId}`), ...(address ? { address } : {}) },
    featureList: [`Ranks ${ranked} ${short} residence halls by weekly walking time`, "Reads .ics calendar schedules", "Walking routes on a map"],
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Adding places and your top-ranked hall are free." },
  };
}

/** A page of ours with its last-modified date and an author, for pages that have no byline of their own. */
export function datedPageJsonLd({ path, name, dateModified, mainEntity }: { path: string; name: string; dateModified: string; mainEntity?: string }) {
  return {
    ...webPageJsonLd({ path, name }),
    dateModified,
    author: { "@id": `${SITE_URL}/#organization` },
    ...(mainEntity ? { mainEntity: { "@id": mainEntity } } : {}),
  };
}
