// Hall Finder roommate mode: combining roommates' weeks and the two orders.
//   node scripts/check-hall-finder-roommates.mjs
import { combineWeeks, orderHalls } from "../lib/roommate-halls.ts";

let failed = 0;
const check = (ok, msg) => { if (!ok) failed++; console.log(`  ${ok ? "✓" : "✗"} ${msg}`); };
const m = (o) => new Map(Object.entries(o));

// Ana walks little from A and a lot from B; Ben the other way round; C is even for both.
const halls = combineWeeks({
  ana: m({ a: 60, b: 200, c: 120, d: 90 }),
  ben: m({ a: 150, b: 70, c: 125, d: 90 }),
  cat: m({}), // hasn't added places: left out, not a zero
});
check(halls.length === 4 && halls.every((h) => !("cat" in h.weekly)), "a roommate with no places is left out of the count");
const c = halls.find((h) => h.dormId === "c");
check(c.total === 245 && c.longest === 125, "C: total 245, longest week 125");

// Totals: a 210, b 270, c 245, d 180. Longest weeks: a 150, b 200, c 125, d 90.
const together = orderHalls(halls, "together").map((h) => h.dormId).join(" ");
check(together === "d a c b", `least walking together, by total: ${together}`);
const fair = orderHalls(halls, "fair").map((h) => h.dormId).join(" ");
check(fair === "d c a b", `fairest split, by the longest week: ${fair}`);

// Ties: same longest week, the smaller total wins; same everything, alphabetical.
const tie = orderHalls(combineWeeks({ x: m({ p: 100, q: 100 }), y: m({ p: 40, q: 90 }) }), "fair").map((h) => h.dormId).join(" ");
check(tie === "p q", `fair tie broken by the smaller total: ${tie}`);

// A hall only some roommates can reach doesn't rank.
const partial = combineWeeks({ x: m({ p: 10, q: 20 }), y: m({ p: 30 }) });
check(partial.length === 1 && partial[0].dormId === "p", "a hall not every roommate can reach is left out");
check(combineWeeks({ x: m({}) }).length === 0, "nobody with places: no ranking");

console.log(failed ? `\n${failed} failed` : "\nall roommate checks pass");
process.exit(failed ? 1 : 0);
