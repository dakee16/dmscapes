// Markdown for AI agents (acceptmarkdown.com): helpers the proxy can use without
// pulling in site data. Browsers never ask for text/markdown, so none of this
// runs for them.

/** True when the Accept header ranks text/markdown at least as high as HTML. */
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  let markdown = 0;
  let html = 0;
  for (const part of accept.toLowerCase().split(",")) {
    const [type, ...params] = part.split(";").map((s) => s.trim());
    const q = params.find((p) => p.startsWith("q="));
    const weight = q ? Math.min(1, Math.max(0, Number(q.slice(2)) || 0)) : 1;
    if (type === "text/markdown") markdown = Math.max(markdown, weight);
    else if (type === "text/html" || type === "text/*" || type === "*/*") html = Math.max(html, weight);
  }
  return markdown > 0 && markdown >= html;
}

export const MARKDOWN_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
  // The same URL also serves HTML, so caches must key on Accept.
  Vary: "Accept",
} as const;

/** The 404 body for agents, with the same message as the HTML page and ways back in. */
export function notFoundMarkdown(pathname: string, origin: string): string {
  const shown = pathname.replace(/[`\u0000-\u001f]/g, "").slice(0, 200);
  return [
    "# Page not found",
    "",
    `There is no page at \`${shown}\` on Dormscape (HTTP 404). The link is probably old, or the page moved.`,
    "",
    "Everything you came for is a link away:",
    "",
    `- [Dormscape home](${origin}/), also available as Markdown`,
    `- [Plan your dorm room](${origin}/plan)`,
    `- [Dorm room dimensions by college](${origin}/colleges)`,
    `- [Site guide for AI agents (llms.txt)](${origin}/llms.txt)`,
    `- [Sitemap](${origin}/sitemap.xml)`,
    "",
  ].join("\n");
}
