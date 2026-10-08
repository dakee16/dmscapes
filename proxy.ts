import { NextResponse, type NextRequest } from "next/server";
import { MARKDOWN_HEADERS, notFoundMarkdown, prefersMarkdown } from "@/lib/markdown-negotiation";

// Markdown for AI agents (acceptmarkdown.com). Runs only for requests whose
// Accept header mentions text/markdown (see the matcher), so browsers, client
// navigation and prefetches never reach it.
//   /                      -> the homepage as Markdown (app/index.md)
//   a path that can't exist -> 404 with a Markdown body
//   anything else          -> unchanged (HTML)

/** First path segments that can resolve (next.config.ts routeRoots); null = don't guess. */
const ROUTE_ROOTS: string[] | null = (() => {
  try {
    return JSON.parse(process.env.DORMSCAPE_ROUTE_ROOTS ?? "null");
  } catch {
    return null;
  }
})();

export function proxy(request: NextRequest) {
  if (!prefersMarkdown(request.headers.get("accept"))) return NextResponse.next();
  const { pathname, origin } = request.nextUrl;
  if (pathname === "/") return NextResponse.rewrite(new URL("/index.md", request.url));
  const first = pathname.split("/")[1] ?? "";
  // Files (anything with an extension) and known sections go to Next as usual.
  if (!ROUTE_ROOTS || pathname.slice(pathname.lastIndexOf("/")).includes(".") || ROUTE_ROOTS.includes(first)) {
    return NextResponse.next();
  }
  return new NextResponse(notFoundMarkdown(pathname, origin), {
    status: 404,
    headers: { ...MARKDOWN_HEADERS, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/|api/).*)",
      has: [{ type: "header", key: "accept", value: ".*text/markdown.*" }],
    },
  ],
};
