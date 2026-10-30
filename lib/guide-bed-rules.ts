import { bedRuleSummary } from "@/lib/bed-rules";

// The short answers on /dorm-bed-rules, shared with /llms-full.txt. Every count
// comes from lib/bed-rules: each school's own housing pages.
export const R = bedRuleSummary();

export const BED_RULE_FAQS = [
  {
    q: "Can you loft your bed in a dorm?",
    a: `Often, but not everywhere. Of the ${R.schools} colleges here whose housing pages say, ${R.loft.yes} allow lofting, ${R.loft.some} allow it only in some halls or by request, and ${R.loft.no} don't allow it.`,
  },
  {
    q: "Can you bunk dorm beds?",
    a: `Of the same ${R.schools} colleges, ${R.bunk.yes} allow bunking, ${R.bunk.some} allow it only in some halls or by request, and ${R.bunk.no} don't. Many don't say either way, so ask housing.`,
  },
  {
    q: "Can I bring my own loft kit or bed risers?",
    a: "Usually not your own loft: most schools that allow lofting use the university's beds or an approved rental. Risers are allowed at some schools and banned at others, sometimes with a height limit. Check your school below.",
  },
  {
    q: "What if my school isn't clear?",
    a: "Ask your housing office before you buy anything that only fits under a loft. Rules can differ by building and change from year to year.",
  },
];
