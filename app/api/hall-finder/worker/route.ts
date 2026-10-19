import fs from "node:fs/promises";
import path from "node:path";

// MapLibre 6 looks for its web worker next to its own file, which isn't where the bundler
// puts it, so the finder map points setWorkerUrl here. Same-origin, so worker-src 'self'
// covers it; versioned by ?v=, so it caches for a year.
export async function GET() {
  const file = path.join(process.cwd(), "node_modules", "maplibre-gl", "dist", "maplibre-gl-worker.mjs");
  return new Response(await fs.readFile(file), {
    headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
