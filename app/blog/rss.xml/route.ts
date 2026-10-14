import { POSTS } from "@/content/blog";
import { BLOG_DESCRIPTION, isoDateTime } from "@/lib/blog";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

// /blog/rss.xml: the guides as an RSS 2.0 feed, newest first, for feed readers
// and answer engines. Pages link it through alternates (lib/seo).
export const dynamic = "force-static";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const rfc822 = (date: string) => new Date(isoDateTime(date)).toUTCString();
const updated = (p: (typeof POSTS)[number]) => p.updated ?? p.date;

export function GET() {
  const posts = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
  const items = posts.map((p) => {
    const url = absoluteUrl(`/blog/${p.slug}`);
    return `<item><title>${esc(p.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${rfc822(p.date)}</pubDate><description>${esc(p.description)}</description></item>`;
  });
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>`,
    `<title>The ${SITE_NAME} Blog</title>`,
    `<link>${absoluteUrl("/blog")}</link>`,
    `<atom:link href="${absoluteUrl("/blog/rss.xml")}" rel="self" type="application/rss+xml"/>`,
    `<description>${esc(BLOG_DESCRIPTION)}</description>`,
    `<language>en-us</language>`,
    `<lastBuildDate>${rfc822(POSTS.map(updated).sort().at(-1) ?? "")}</lastBuildDate>`,
    ...items,
    `</channel></rss>`,
  ].join("\n");
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
