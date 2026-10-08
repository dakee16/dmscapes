import { llmsTxt } from "@/lib/agent-markdown";

// /llms.txt (llmstxt.org): a plain map of the site for answer engines. Every
// count and price comes from the school data and lib/plan, built once.
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
