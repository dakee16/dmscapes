import { SCHOOLS, getSchool } from "@/lib/schools";
import { schoolMarkdown } from "@/lib/agent-markdown";
import { MARKDOWN_HEADERS } from "@/lib/markdown-negotiation";
import { absoluteUrl } from "@/lib/seo";

// A school page as Markdown. proxy.ts rewrites /colleges/[id] here for agents that send
// Accept: text/markdown; browsers keep getting the HTML page, which stays the canonical.
export const dynamicParams = false;

export function generateStaticParams() {
  return SCHOOLS.map((s) => ({ collegeId: s.id }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ collegeId: string }> }) {
  const { collegeId } = await params;
  const school = getSchool(collegeId);
  if (!school) return new Response("Not found", { status: 404 });
  return new Response(schoolMarkdown(school), {
    headers: { ...MARKDOWN_HEADERS, Link: `<${absoluteUrl(`/colleges/${school.id}`)}>; rel="canonical"`, "X-Robots-Tag": "noindex" },
  });
}
