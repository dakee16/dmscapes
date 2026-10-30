import type { ClearanceItem, ClearancePreset } from "@/components/tools/LoftClearance";
import { BED_MODES } from "@/lib/bed-config";
import { FURNITURE_LIBRARY } from "@/lib/furniture-library";

// The numbers and short answers on /loft-bed-clearance, shared with /llms-full.txt.
// Bed heights are the planner's own settings (lib/bed-config) and item heights its
// furniture library's typical sizes (lib/furniture-library).
const inches = (feet: number) => Math.round(feet * 12);

export const presets: ClearancePreset[] = (["standard", "raised", "lofted"] as const).map((m) => ({
  label: BED_MODES[m].label,
  inches: inches(BED_MODES[m].underside),
}));
const ITEM_KEYS = ["bin", "desk", "fridge", "chair", "dresser", "shelf"];
export const items: ClearanceItem[] = ITEM_KEYS.flatMap((k) => {
  const p = FURNITURE_LIBRARY.find((x) => x.key === k);
  return p ? [{ name: p.name, inches: inches(p.h) }] : [];
});
export const lofted = inches(BED_MODES.lofted.underside);
const raised = inches(BED_MODES.raised.underside);
export const desk = items.find((i) => i.name === "Study desk");
const fridge = items.find((i) => i.name === "Mini fridge");
const dresser = items.find((i) => i.name === "Dresser");

export const CLEARANCE_FAQS = [
  {
    q: "What fits under a lofted dorm bed?",
    a: `In the planner, a lofted bed leaves about ${lofted} inches underneath, enough for a ${desk?.inches}-inch desk, a ${fridge?.inches}-inch mini fridge or a ${dresser?.inches}-inch dresser. Your hall's loft height decides the real number, so measure yours.`,
  },
  {
    q: "What fits under a raised dorm bed?",
    a: `Raised beds in the planner leave about ${raised} inches: enough for storage bins and drawers, but usually not a desk (${desk?.inches} in) or a mini fridge (${fridge?.inches} in).`,
  },
  {
    q: "How do I measure the space under my bed?",
    a: "Measure from the floor to the lowest part of the bed above it, usually the frame's side rail or the slats, not the mattress. On carpet, measure where the item will actually stand.",
  },
  {
    q: "Can I loft my dorm bed?",
    a: "It depends on your school and sometimes your building. Some halls let you adjust the bed yourself, some do it by request, and some don't allow it at all. Check your school's rules before you buy anything that only fits under a loft.",
  },
];
