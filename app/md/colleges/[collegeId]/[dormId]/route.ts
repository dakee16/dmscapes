import { allDormPaths, getDorm } from "@/lib/schools";
import { hallMarkdown } from "@/lib/agent-markdown";
import { MARKDOWN_HEADERS } from "@/lib/markdown-negotiation";
import { absoluteUrl } from "@/lib/seo";

// A hall page as Markdown. proxy.ts rewrites /colleges/[id]/[dorm] here for agents that send
// Accept: text/markdown; browsers keep getting the HTML page, which stays the canonical.
export const dynamicParams = false;

export function generateStaticParams() {
  return allDormPaths();
}

export async function GET(_request: Request, { params }: { params: Promise<{ collegeId: string; dormId: string }> }) {
  const { collegeId, dormId } = await params;
  const found = getDorm(collegeId, dormId);
  if (!found) return new Response("Not found", { status: 404 });
  return new Response(hallMarkdown(found.school, found.dorm), {
    headers: { ...MARKDOWN_HEADERS, Link: `<${absoluteUrl(`/colleges/${collegeId}/${dormId}`)}>; rel="canonical"`, "X-Robots-Tag": "noindex" },
  });
}
