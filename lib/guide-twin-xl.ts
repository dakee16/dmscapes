import { SCHOOLS } from "@/lib/schools";
import { LAYOUT_COUNT } from "@/lib/home-data";
import { bedName } from "@/lib/room-preview";
import type { BedSize } from "@/lib/types";

// The numbers and short answers on /twin-xl-sheets, shared with /llms-full.txt.
// Mattress sizes are the standard US sizes; which schools publish another bed
// comes from the room data (Twin XL is the planner's default unless a school says otherwise).
export const SIZES: { size: BedSize; w: number; l: number }[] = [
  { size: "twin", w: 38, l: 75 },
  { size: "twin_xl", w: 38, l: 80 },
  { size: "full", w: 54, l: 75 },
  { size: "full_xl", w: 54, l: 80 },
  { size: "queen", w: 60, l: 80 },
];
const dim = (b: BedSize) => SIZES.find((s) => s.size === b)!;
export const xl = dim("twin_xl");
const twin = dim("twin");
export const shortBy = xl.l - twin.l;

const rooms = SCHOOLS.flatMap((s) => s.dorms.flatMap((d) => d.rooms.map((r) => ({ school: s, bed: r.bed_size }))));
export const other = rooms.filter((r) => r.bed !== "twin_xl");
// Schools that publish a bed other than Twin XL for some room types, with how many.
export const exceptions = [...new Set(other.map((r) => r.school.id))]
  .map((id) => {
    const mine = other.filter((r) => r.school.id === id);
    const school = mine[0].school;
    const beds = [...new Set(mine.map((r) => bedName(r.bed)))];
    return { id, name: school.name, beds, count: mine.length };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

export const TWIN_XL_FAQS = [
  {
    q: "Do dorms use Twin XL beds?",
    a: `Almost all of them. Of the ${LAYOUT_COUNT.toLocaleString("en-US")} room types we track at ${SCHOOLS.length} colleges, schools list a different bed for ${other.length}, at ${exceptions.length} schools. Everywhere else it's a Twin XL.`,
  },
  {
    q: "Will Twin sheets fit a Twin XL dorm bed?",
    a: `Not well. A Twin XL mattress is ${xl.l} inches long and a Twin is ${twin.l}, so a Twin fitted sheet is ${shortBy} inches too short and will pop off the corners. Buy Twin XL fitted sheets.`,
  },
  {
    q: "How big is a Twin XL mattress?",
    a: `A standard Twin XL is ${xl.w} × ${xl.l} inches. Some schools list their dorm mattresses at slightly different widths, so check your housing office's furniture page if you're buying a topper.`,
  },
  {
    q: "What if my dorm has a Full bed?",
    a: "A few schools put Full or Full XL beds in some rooms. The school list below shows which ones, and your hall's page on dormscape shows the bed for each room type.",
  },
];
