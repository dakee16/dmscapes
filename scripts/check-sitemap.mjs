// Run against a local production build:
//   npm run build && npx next start -p 3000 &
//   node scripts/check-sitemap.mjs            (BASE=http://localhost:3000, 50-URL sample per group)
//   node scripts/check-sitemap.mjs --all      (every URL in every sitemap)
//
// Checks robots.txt points at the sitemap index, the index lists the group
// sitemaps, and every entry is a clean URL (no query string, real lastmod). Then
// fetches every static page plus a sample from each group: each must return 200
// without a redirect, be its own canonical, and not be noindex (meta or header).
const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/$/, "");
const SAMPLE = Number(process.env.SAMPLE ?? 50);
const ALL = process.argv.includes("--all");
const failures = [];
const fail = (where, why) => failures.push(`${where}: ${why}`);

const local = (url) => BASE + new URL(url).pathname;
const tags = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"))].map((m) => m[1].trim());
const attr = (html, re) => html.match(re)?.[1];

async function get(url) {
  const res = await fetch(url, { redirect: "manual" });
  return { res, body: await res.text() };
}

// robots.txt
const robots = (await get(`${BASE}/robots.txt`)).body;
if (!/^Sitemap: \S+\/sitemap\.xml$/m.test(robots)) fail("/robots.txt", "no Sitemap line for /sitemap.xml");
if (/^Host:/im.test(robots)) fail("/robots.txt", "has a Host line");

// The index and its groups
const index = await get(`${BASE}/sitemap.xml`);
if (index.res.status !== 200 || !index.body.includes("<sitemapindex")) throw new Error("/sitemap.xml is not a sitemap index");
const groups = tags(index.body, "loc");
const seen = new Set();
const picked = [];
for (const loc of groups) {
  const name = new URL(loc).pathname.split("/").pop().replace(/\.xml$/, "");
  const { res, body } = await get(local(loc));
  if (res.status !== 200 || !body.includes("<urlset")) { fail(loc, `group sitemap returned ${res.status}`); continue; }
  const entries = [...body.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({ loc: tags(m[1], "loc")[0], lastmod: tags(m[1], "lastmod")[0] }));
  for (const e of entries) {
    if (/[?#]/.test(e.loc)) fail(e.loc, "has a query string or fragment");
    if (seen.has(e.loc)) fail(e.loc, "listed twice");
    seen.add(e.loc);
    if (e.lastmod && (Number.isNaN(Date.parse(e.lastmod)) || Date.parse(e.lastmod) > Date.now())) fail(e.loc, `bad lastmod ${e.lastmod}`);
  }
  // Every static page; an even spread of the larger groups.
  const every = ALL || name === "pages";
  const step = every ? 1 : Math.max(1, entries.length / SAMPLE);
  const chosen = every ? entries : Array.from({ length: Math.min(SAMPLE, entries.length) }, (_, i) => entries[Math.floor(i * step)]);
  picked.push(...chosen);
  console.log(`${name.padEnd(9)} ${String(entries.length).padStart(5)} URLs, checking ${chosen.length}`);
}

// The pages themselves
async function check({ loc }) {
  const { res, body } = await get(local(loc));
  if (res.status !== 200) return fail(loc, `status ${res.status}${res.headers.get("location") ? ` → ${res.headers.get("location")}` : ""}`);
  if (/noindex/i.test(res.headers.get("x-robots-tag") ?? "")) fail(loc, "X-Robots-Tag noindex");
  const robotsMeta = attr(body, /<meta[^>]+name="robots"[^>]+content="([^"]*)"/i) ?? attr(body, /<meta[^>]+content="([^"]*)"[^>]+name="robots"/i);
  if (robotsMeta && /noindex/i.test(robotsMeta)) fail(loc, `meta robots "${robotsMeta}"`);
  const canonical = attr(body, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i) ?? attr(body, /<link[^>]+href="([^"]*)"[^>]+rel="canonical"/i);
  if (!canonical) fail(loc, "no canonical");
  else if (new URL(canonical, loc).href !== new URL(loc).href) fail(loc, `canonical is ${canonical}`);
}
for (let i = 0; i < picked.length; i += 8) await Promise.all(picked.slice(i, i + 8).map(check));

console.log(`\nchecked ${picked.length} pages from ${groups.length} sitemaps (${seen.size} URLs listed)`);
if (failures.length) {
  console.error(`\n${failures.length} problem${failures.length === 1 ? "" : "s"}:\n` + failures.map((f) => `  ✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log("✓ sitemap index, groups and sampled pages all pass");
