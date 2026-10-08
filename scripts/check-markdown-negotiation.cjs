// Run with: node scripts/check-markdown-negotiation.cjs
// Agents asking for text/markdown get Markdown; browsers always get HTML.
// End-to-end (against a running server):
//   curl -sS -i -H 'Accept: text/markdown' http://127.0.0.1:3000/            -> 200 text/markdown, Vary: Accept
//   curl -sS -i -H 'Accept: text/html' http://127.0.0.1:3000/                -> 200 text/html
//   curl -sS -i -H 'Accept: text/markdown' http://127.0.0.1:3000/no-such-page -> 404 text/markdown
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const file = path.join(__dirname, "../lib/markdown-negotiation.ts");
const mod = { exports: {} };
new Function("module", "exports", ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(mod, mod.exports);
const { prefersMarkdown, notFoundMarkdown, MARKDOWN_HEADERS } = mod.exports;

for (const accept of ["text/markdown", "text/markdown, text/html", "text/markdown;q=1, text/html;q=0.9", "text/markdown, */*;q=0.8", "TEXT/MARKDOWN"]) {
  assert.equal(prefersMarkdown(accept), true, accept);
}
for (const accept of [
  null, "", "*/*",
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8", // Chrome
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", // Safari, Firefox
  "text/html, text/markdown;q=0.5", "text/markdown;q=0", "text/markdown;q=0.4, */*",
]) {
  assert.equal(prefersMarkdown(accept), false, String(accept));
}
assert.equal(MARKDOWN_HEADERS["Content-Type"], "text/markdown; charset=utf-8");
assert.equal(MARKDOWN_HEADERS.Vary, "Accept");
const body = notFoundMarkdown("/a`b\u0001c", "https://dormscape.us");
assert.match(body, /^# Page not found/);
assert.match(body, /`\/abc`/, "The path is shown without backticks or control characters");
assert.match(body, /\(https:\/\/dormscape\.us\/llms\.txt\)/);
assert.match(body, /\(https:\/\/dormscape\.us\/sitemap\.xml\)/);
assert(body.length > 20);
console.log("PASS: agents asking for Markdown get it; every browser Accept header keeps HTML; the Markdown 404 links back in.");
