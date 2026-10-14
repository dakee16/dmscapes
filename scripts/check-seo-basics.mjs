// Run against a running server (dev or production):
//   BASE=http://localhost:3000 node scripts/check-seo-basics.mjs
// Every page in the sitemap: the <title> fits a search result and every <img>
// has real alt text. Bing Webmaster Tools flags both ("Title too long", "Alt
// attribute for images is missing", which includes alt="").
const BASE = process.env.BASE ?? "http://localhost:3000";
const FAIL_AT = 65; // Bing's old guidance; Google cuts around 60
const WARN_AT = 60; // lib/seo fitTitle aims at or below this

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https:\/\/dormscape\.us/, BASE));
const text = async (url) => (await fetch(url)).text();
// Count characters as shown, not as HTML-escaped (&quot; is one character).
const ENTITIES = { amp: "&", quot: '"', lt: "<", gt: ">", apos: "'" };
const decode = (s) =>
  s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) =>
    e[0] === "#" ? String.fromCodePoint(parseInt(e.slice(1).replace(/^x/i, ""), /^#x/i.test(e) ? 16 : 10)) : ENTITIES[e] ?? m
  );

const urls = [];
for (const sitemap of locs(await text(`${BASE}/sitemap.xml`))) urls.push(...locs(await text(sitemap)));
if (!urls.length) {
  console.error(`FAIL: no URLs found in ${BASE}/sitemap.xml`);
  process.exit(1);
}

const problems = [];
const long = [];
for (let i = 0; i < urls.length; i += 12) {
  await Promise.all(
    urls.slice(i, i + 12).map(async (url) => {
      const html = await text(url);
      const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
      const path = url.slice(BASE.length) || "/";
      if (!title) problems.push(`${path}: no <title>`);
      else if (title.length > FAIL_AT) problems.push(`${path}: title is ${title.length} characters: ${title}`);
      else if (title.length > WARN_AT) long.push(`${path} (${title.length})`);
      for (const img of html.match(/<img\b[^>]*>/g) ?? [])
        if (!/\balt="[^"]+"/.test(img)) problems.push(`${path}: image without alt text: ${img.match(/src="([^"]{0,80})/)?.[1]}`);
    })
  );
}

if (long.length) console.log(`note: ${long.length} titles between ${WARN_AT} and ${FAIL_AT} characters: ${long.join(", ")}`);
if (problems.length) {
  console.error(`FAIL: ${problems.length} problem(s)\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`PASS: ${urls.length} pages, every title at most ${FAIL_AT} characters and every image has alt text.`);
