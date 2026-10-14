import type { SchoolSummary } from "./types";

/** Names people actually say, for tight spots (cards, tape, headlines). */
const SHORT: Record<string, string> = {
  "penn-state": "Penn State",
  rutgers: "Rutgers",
  "georgia-tech": "Georgia Tech",
  umd: "Maryland",
  unc: "UNC Chapel Hill",
  "ohio-state": "Ohio State",
  "notre-dame": "Notre Dame",
  uga: "Georgia",
  "boston-college": "Boston College",
  uconn: "UConn",
  duke: "Duke",
  dartmouth: "Dartmouth",
  "university-of-michigan": "Michigan",
  ucla: "UCLA",
  "university-of-alabama": "Alabama",
  "virginia-tech": "Virginia Tech",
  cornell: "Cornell",
  northwestern: "Northwestern",
  // Long official names, shortened to what students search ("ucsb dorms").
  "arizona-state": "Arizona State",
  caltech: "Caltech",
  "carnegie-mellon": "Carnegie Mellon",
  "csu-la": "Cal State LA",
  "cu-boulder": "CU Boulder",
  fsu: "Florida State",
  indiana: "Indiana University",
  "michigan-tech": "Michigan Tech",
  mit: "MIT",
  msu: "Michigan State",
  "nc-state": "NC State",
  snhu: "SNHU",
  tamucc: "Texas A&M-Corpus Christi",
  tennessee: "UT Knoxville",
  "uc-berkeley": "UC Berkeley",
  "uc-davis": "UC Davis",
  "uc-irvine": "UC Irvine",
  "uc-merced": "UC Merced",
  "uc-riverside": "UC Riverside",
  ucf: "UCF",
  ucsb: "UCSB",
  ucsd: "UCSD",
  uiuc: "UIUC",
  umass: "UMass Amherst",
  umbc: "UMBC",
  umn: "UMN",
  "unc-pembroke": "UNC Pembroke",
  upenn: "UPenn",
  usao: "USAO",
  usc: "USC",
  "ut-austin": "UT Austin",
  "ut-chattanooga": "UT Chattanooga",
  "uw-madison": "UW-Madison",
  vcu: "VCU",
  wustl: "WashU",
};

export function shortName(s: Pick<SchoolSummary, "id" | "name">): string {
  return SHORT[s.id] ?? s.name.replace(/^The /, "").replace(/\s*\(.*\)$/, "");
}

/** Sort key for A to Z: ignores a leading "The". */
export function sortKey(name: string): string {
  return name.replace(/^The\s+/i, "").toLowerCase();
}
