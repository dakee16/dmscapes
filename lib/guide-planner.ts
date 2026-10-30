import { SCHOOLS } from "@/lib/schools";
import { HALL_COUNT, LAYOUT_COUNT, SCHOOL_COUNT } from "@/lib/home-data";
import { dormSizeStats, type TypeStats } from "@/lib/dorm-sizes";
import { fitRoom, furnitureSqFt, ft, type FittedRoom } from "@/lib/room-preview";
import { BED_MODES } from "@/lib/bed-config";
import { FURNITURE_LIBRARY } from "@/lib/furniture-library";
import { bedRuleSummary } from "@/lib/bed-rules";
import { FREE_PLAN_CAP, PLUS_INITIAL_CREDITS, PLUS_PRICE_USD, PRO_INITIAL_CREDITS, PRO_PRICE_USD } from "@/lib/plan";

// The numbers and short answers on /dorm-room-planner, shared with /llms-full.txt.
// Every number comes from the school data, lib/plan or the planner's own furniture
// and bed settings.
export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const usd = (n: number) => `$${n.toFixed(2)}`;

export const S = dormSizeStats(SCHOOLS);
const [single, double, triple] = S.byType;
export { double };
export const dims = (t: TypeStats) => `${ft(t.lengthFt)} × ${ft(t.widthFt)} ft`;
export const doubleFit = fitRoom({
  type: "double",
  label: "Double",
  occupants: 2,
  length_ft: double.lengthFt,
  width_ft: double.widthFt,
  sqft: null,
  bed_size: "twin_xl",
  closet: null,
}) as FittedRoom;
export const doubleOpen = Math.round(doubleFit.lengthFt * doubleFit.widthFt) - furnitureSqFt(doubleFit);

// Room types whose school publishes a bed other than Twin XL (Twin XL is the default otherwise).
const otherBeds = SCHOOLS.flatMap((s) => s.dorms.flatMap((d) => d.rooms)).filter((r) => r.bed_size !== "twin_xl").length;

// The planner's bed setups (lib/bed-config) and its Twin XL footprint (lib/furniture-library).
export const inches = (feet: number) => Math.round(feet * 12);
const twinXl = FURNITURE_LIBRARY.find((p) => p.key === "twin-xl")!;
export const desk = FURNITURE_LIBRARY.find((p) => p.key === "desk")!;
export const bedSqFt = Math.round(twinXl.w * twinXl.d);
export const rules = bedRuleSummary();

export const PLANNER_FAQS = [
  {
    q: "How does the dorm room planner work?",
    a: "Search your school, pick your residence hall and room type, and the planner loads the room's published dimensions. Choose a style and a budget, and it lays out your beds, desks and dressers to scale with a shopping list that fits your budget. Then drag pieces around in 2D, swap products and share the room with a link.",
  },
  {
    q: "Is the dorm room planner free?",
    a: `Yes, to start. Free includes ${FREE_PLAN_CAP} generated room plan, real room dimensions, the 2D editor and three vibes, and saving is always free. Plus is ${usd(PLUS_PRICE_USD)} one time for ${PLUS_INITIAL_CREDITS} plan credits and all nine vibes. Pro is ${usd(PRO_PRICE_USD)} one time for ${PRO_INITIAL_CREDITS} plan credits, 3D, and a shared room for roommates. There's no subscription.`,
  },
  {
    q: "Do I need an account?",
    a: "No account is needed to start. Sign in free when you want to generate and save your plan.",
  },
  {
    q: "Is my school on dormscape?",
    a: `${SCHOOL_COUNT} schools and ${fmt(HALL_COUNT)} residence halls are loaded with ${fmt(LAYOUT_COUNT)} room types. If yours isn't one of them, you can draw your room with Plus, or ask us to add your school.`,
  },
  {
    q: "What if my room is an odd shape?",
    a: "Draw it. With Plus you can sketch your exact floor plan, even an L-shape, with doors, windows and closets, and the planner fits a full layout to it. Pro adds the 3D Room Builder for walls, doors and windows in 3D.",
  },
  {
    q: "Can I plan my dorm room with my roommate?",
    a: "Yes. Any room can be shared with a link for free. With Pro, you can host a shared room for up to four people, with a shared shopping list, who brings what, and comments.",
  },
  {
    q: "Should I loft or bunk my dorm bed?",
    a: `It depends on your room and your hall's rules. In the planner, a lofted bed leaves about ${inches(BED_MODES.lofted.underside)} inches underneath, room for a ${inches(desk.h)}-inch desk, while bunking frees a whole bed's footprint, about ${bedSqFt} square feet for a Twin XL.${rules.schools ? ` Check your school first: of the ${rules.schools} schools whose rules we've collected, ${rules.loft.yes} allow lofting and ${rules.bunk.yes} allow bunking, and more allow it only in some halls.` : " Check your housing office's rules first."}`,
  },
  {
    q: "How big is a dorm room?",
    a: `A typical double is ${dims(double)}, about ${fmt(double.median)} square feet. A typical single is about ${fmt(single.median)} sq ft and a triple about ${fmt(triple.median)} sq ft. Once two beds, desks and dressers are in a typical double, about ${fmt(doubleOpen)} sq ft of floor is left.`,
  },
  {
    q: "What size bed is in a dorm room?",
    a: `Twin XL in almost every hall. Of the ${fmt(LAYOUT_COUNT)} room types here, schools publish a different bed size for ${otherBeds}, so buy Twin XL sheets unless your housing office says otherwise.`,
  },
  {
    q: "Can I see my dorm room in 3D?",
    a: "Yes, with Pro. The live 3D Room Studio shows the same layout in 3D, with room, top and inside views, and the 3D Room Builder lets you build an irregular room from floors, walls, doors and windows.",
  },
];
