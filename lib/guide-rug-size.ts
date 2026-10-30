import type { RoomPreset } from "@/components/tools/RugCalculator";
import { SCHOOLS } from "@/lib/schools";
import { dormSizeStats } from "@/lib/dorm-sizes";
import { fitRoom, ft, type FittedRoom } from "@/lib/room-preview";
import { bestRug } from "@/lib/rug-fit";

// The numbers and short answers on /dorm-rug-size, shared with /llms-full.txt.
// Rug sizes come from the planner's own starting layouts (lib/rug-fit) for the
// room sizes colleges publish (lib/dorm-sizes); nothing is typed in by hand.
export const S = dormSizeStats(SCHOOLS);
const NAME: Record<number, string> = { 1: "single", 2: "double", 3: "triple" };

const fitOf = (l: number, w: number, o: number) =>
  fitRoom({ type: NAME[o] ?? "double", label: "", occupants: o, length_ft: l, width_ft: w, sqft: null, bed_size: "twin_xl", closet: null }) as FittedRoom;
export const rugText = (l: number, w: number, o: number) => {
  const rug = bestRug(fitOf(l, w, o));
  return rug ? `${rug.size[0]} × ${rug.size[1]} ft` : "none";
};

export const presets: RoomPreset[] = S.byType.map((t) => ({
  label: `Typical ${NAME[t.occupants]}`,
  l: t.lengthFt,
  w: t.widthFt,
  o: t.occupants,
}));
const [single, double] = S.byType;
export { double };
export const doubleRug = rugText(double.lengthFt, double.widthFt, 2);
const singleRug = rugText(single.lengthFt, single.widthFt, 1);

export const rows = [
  ...S.byType.map((t) => ({ room: `Typical ${NAME[t.occupants]}`, l: t.lengthFt, w: t.widthFt, o: t.occupants, note: "median published size" })),
  ...S.commonSizes.map((c) => ({ room: `${ft(c.lengthFt)} × ${ft(c.widthFt)} ft ${NAME[c.occupants]}`, l: c.lengthFt, w: c.widthFt, o: c.occupants, note: `${c.rooms} published rooms` })),
];

export const RUG_FAQS = [
  {
    q: "What size rug for a dorm room?",
    a: `For a typical ${ft(double.lengthFt)} × ${ft(double.widthFt)} ft double, a ${doubleRug} rug fits the open floor once two beds, desks and dressers are in. For a typical ${ft(single.lengthFt)} × ${ft(single.widthFt)} ft single, it's ${singleRug}. Rooms vary a lot, so enter yours above.`,
  },
  {
    q: "How is the rug size worked out?",
    a: "The room is laid out the way the dormscape planner starts it: a bed, desk and dresser for each person against the walls. The calculator then finds the biggest standard rug (2 × 3 up to 9 × 12 ft) that fits the floor left over without running under furniture or into the door's swing. Desk chairs can sit on the rug.",
  },
  {
    q: "Can a dorm rug go under the bed?",
    a: "It can, and a rug that tucks under the beds can be bigger than this calculator suggests. These sizes keep the whole rug on the open floor, so it lies flat and nothing has to sit on its edge.",
  },
  {
    q: "What if I loft or bunk the beds?",
    a: "Then more floor opens up, and a bigger rug may fit. Plan your room to move the furniture and try a rug in your own layout, and check your school's loft and bunk rules first.",
  },
];
