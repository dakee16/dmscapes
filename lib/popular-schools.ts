/**
 * The schools offered first in site search and linked from the footer, with their
 * short names (lib/school-names). Kept separate from the school index so the footer,
 * which some client pages render, doesn't pull the whole index into the bundle.
 */
export const POPULAR_SCHOOLS: { id: string; name: string }[] = [
  { id: "penn-state", name: "Penn State" },
  { id: "university-of-michigan", name: "Michigan" },
  { id: "ohio-state", name: "Ohio State" },
  { id: "nyu", name: "New York University" },
  { id: "rutgers", name: "Rutgers" },
  { id: "ut-austin", name: "UT Austin" },
  { id: "purdue", name: "Purdue University" },
];
