// Hall Finder roommate mode (My Room): every roommate's weekly walk per hall, combined.
// "Least walking together" ranks by the total; "Fairest split" by the longest single week
// (the best hall is where whoever walks most walks least), each breaking ties with the
// other. No path aliases, so scripts/check-hall-finder-roommates.mjs imports it in Node.

export type RoommateMode = "together" | "fair";

export interface RoommateHall {
  dormId: string;
  /** Everyone's weekly minutes added up. */
  total: number;
  /** The longest single roommate's weekly minutes. */
  longest: number;
  /** Each counted roommate's weekly minutes, by user id. */
  weekly: Record<string, number>;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Halls every counted roommate can reach, with each one's week. `weeks` maps a user id to
 *  that person's ranking (dormId -> weekly minutes); people with no places are left out. */
export function combineWeeks(weeks: Record<string, Map<string, number>>): RoommateHall[] {
  const people = Object.keys(weeks).filter((id) => weeks[id].size > 0);
  if (!people.length) return [];
  const halls = [...weeks[people[0]].keys()].filter((dormId) => people.every((id) => weeks[id].has(dormId)));
  return halls.map((dormId) => {
    const weekly = Object.fromEntries(people.map((id) => [id, weeks[id].get(dormId)!]));
    const values = Object.values(weekly);
    return { dormId, total: round1(values.reduce((a, b) => a + b, 0)), longest: round1(Math.max(...values)), weekly };
  });
}

export function orderHalls(halls: RoommateHall[], mode: RoommateMode): RoommateHall[] {
  const [a, b] = mode === "fair" ? (["longest", "total"] as const) : (["total", "longest"] as const);
  return [...halls].sort((x, y) => x[a] - y[a] || x[b] - y[b] || x.dormId.localeCompare(y.dormId));
}

/** A place as the room's Halls section gets it: your own in full; a roommate's building
 *  and days, or only the days for their dropped pin (labels and pin spots stay theirs). */
export interface RoomPlace {
  placeId?: string;
  pin?: [number, number];
  days: number;
  label?: string;
}

export interface RoomPerson {
  userId: string;
  name: string;
  places: RoomPlace[];
}

/** GET /api/workspaces/[id]/halls */
export interface RoomHalls {
  me: string;
  people: RoomPerson[];
  /** Unordered; orderHalls() sorts them for the chosen mode. */
  halls: RoommateHall[];
  /** For ?hall=: each person's encoded walking paths, one per place (null for a roommate's pin). */
  routes: Record<string, (string | null)[]> | null;
}
