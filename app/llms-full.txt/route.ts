import { llmsFullTxt } from "@/lib/agent-markdown";

// /llms-full.txt: /llms.txt plus every FAQ answer in full, so an answer engine
// can read the site's own answers in one request.
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsFullTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
