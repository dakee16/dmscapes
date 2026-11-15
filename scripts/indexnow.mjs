// Tell IndexNow (Bing, Yandex, Seznam, Naver…) which dormscape.us pages changed between two
// commits. .github/workflows/indexnow.yml runs it once Vercel reports a production deployment
// live, with the previous production commit and this one. It works from the git history alone:
// the live site can answer automated clients with a bot challenge, so nothing is fetched from it.
//
//   node scripts/indexnow.mjs --dry-run <fromSha> <toSha>   prints the URLs, sends nothing
//   node scripts/indexnow.mjs <fromSha> <toSha>             POSTs them (at most 10,000)
//
// Changed files map to the pages they feed, and only to pages the sitemaps list (lib/sitemaps.ts):
//   data/schools/<id>.json, or that school's entry in lib/schools-index.json
//                                 → /colleges/<id> and its indexable hall pages
//   data/campus/…<id>…            → /colleges/<id>/hall-finder
//   content/blog/<slug>.tsx       → /blog/<slug> and /blog
//   data/compare.json             → /compare and /compare/<slug>
//   app/<route>/page.tsx          → that route (a dynamic route → every page it builds)
// Anything else (components, styles, lib code) is skipped: it can't be pinned to pages.
import { execFileSync } from "node:child_process";

const SITE = "https://dormscape.us"; // lib/seo SITE_URL
const ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX = 10_000;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const [from, to] = args.filter((a) => a !== "--dry-run");
if (!from || !to) {
  console.error("usage: node scripts/indexnow.mjs [--dry-run] <fromSha> <toSha>");
  process.exit(2);
}

const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 });
/** A file as of a commit, or null where it doesn't exist. */
const show = (rev, file) => {
  try {
    return execFileSync("git", ["show", `${rev}:${file}`], { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
};
const json = (rev, file) => JSON.parse(show(rev, file) ?? "[]");

// The site as of <toSha>.
const schools = json(to, "lib/schools-index.json");
const byId = new Map(schools.map((s) => [s.id, s]));
// Same rule as hallIsIndexable (lib/schools.ts): a hall page is indexed once a room has a published size.
const hallPaths = (s) =>
  s.dorms.filter((d) => d.rooms.some((r) => r.length_ft && r.width_ft && !r.dims_estimated)).map((d) => `/colleges/${s.id}/${d.id}`);
const schoolPaths = (id) => (byId.has(id) ? [`/colleges/${id}`, ...hallPaths(byId.get(id))] : []);
const pilots = new Set(json(to, "data/campus/index.json"));
const posts = git("ls-tree", "--name-only", `${to}:content/blog`)
  .split("\n")
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => `/blog/${f.slice(0, -4)}`);
const comparePaths = () => ["/compare", ...json(to, "data/compare.json").map((c) => `/compare/${c.slug}`)];
// The static pages: every plain `${BASE}/path` the sitemap lists.
const statics = new Set([...(show(to, "lib/sitemaps.ts") ?? "").matchAll(/`\$\{BASE\}(\/[\w/-]*)`/g)].map((m) => m[1]));
const dynamic = {
  "colleges/[collegeId]": () => schools.map((s) => `/colleges/${s.id}`),
  "colleges/[collegeId]/[dormId]": () => schools.flatMap(hallPaths),
  "colleges/[collegeId]/hall-finder": () => [...pilots].map((id) => `/colleges/${id}/hall-finder`),
  "blog/[slug]": () => posts,
  "compare/[slug]": comparePaths,
};

const paths = new Set();
const add = (list) => list.forEach((p) => paths.add(p));
let m;
for (const f of git("diff", "--name-only", "--no-renames", from, to).split("\n").filter(Boolean)) {
  if ((m = f.match(/^data\/schools\/([a-z0-9-]+)\.json$/))) add(schoolPaths(m[1]));
  else if ((m = f.match(/^data\/campus\/(?:overrides\/|paths\/)?([a-z0-9-]+?)(?:\.minutes)?(?:\.json$|\/)/)) && pilots.has(m[1]))
    add([`/colleges/${m[1]}/hall-finder`]);
  else if ((m = f.match(/^content\/blog\/([a-z0-9-]+)\.tsx$/))) add([`/blog/${m[1]}`, "/blog"]);
  else if (f === "data/compare.json") add(comparePaths());
  else if (f === "lib/schools-index.json") {
    const before = new Map(json(from, f).map((s) => [s.id, JSON.stringify(s)]));
    for (const s of schools) if (before.get(s.id) !== JSON.stringify(s)) add(schoolPaths(s.id));
  } else if ((m = f.match(/^app\/(?:(.*)\/)?page\.tsx$/))) {
    const route = (m[1] ?? "").replace(/\([^)]*\)\/?/g, "").replace(/\/$/, "");
    if (dynamic[route]) add(dynamic[route]());
    else if (statics.has(`/${route}`)) add([`/${route}`]);
  }
}

const urls = [...paths].sort().map((p) => SITE + p);
if (urls.length > MAX) console.error(`${urls.length} URLs changed; sending the first ${MAX}.`);
const urlList = urls.slice(0, MAX);

if (dryRun) {
  if (urlList.length) console.log(urlList.join("\n"));
  console.error(`${urlList.length} URL${urlList.length === 1 ? "" : "s"} for ${from}..${to} (dry run, nothing sent)`);
  process.exit(0);
}
if (!urlList.length) {
  console.log(`No indexable pages changed in ${from}..${to}; nothing sent.`);
  process.exit(0);
}

// The key is the one already verified for the site: public/<key>.txt, whose content is the key.
const key = git("ls-tree", "--name-only", `${to}:public`)
  .split("\n")
  .map((f) => f.match(/^([0-9a-f]{32})\.txt$/)?.[1])
  .find((k) => k && show(to, `public/${k}.txt`)?.trim() === k);
if (!key) {
  console.error("No IndexNow key file (public/<32 hex>.txt containing its own name) at this commit.");
  process.exit(1);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${key}.txt`, urlList }),
});
console.log(`IndexNow answered ${res.status} for ${urlList.length} URL${urlList.length === 1 ? "" : "s"} (${from}..${to}).`);
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}
