import { homeMarkdown } from "@/lib/agent-markdown";
import { MARKDOWN_HEADERS } from "@/lib/markdown-negotiation";
import { SITE_URL } from "@/lib/seo";

// The homepage as Markdown. proxy.ts serves it at / to agents that send
// Accept: text/markdown; browsers keep getting the HTML page.
export const dynamic = "force-static";

export function GET() {
  return new Response(homeMarkdown(), {
    headers: {
      ...MARKDOWN_HEADERS,
      Link: `<${SITE_URL}/>; rel="canonical"`,
      "X-Robots-Tag": "noindex",
    },
  });
}
