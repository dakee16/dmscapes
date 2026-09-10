import { spawn } from "node:child_process";
import { createRequire } from "node:module";

// Accept the supervised preview's Vite-style flags without changing Next's
// development server or the normal `npm run dev` experience.
const require = createRequire(import.meta.url);
const args = process.argv.slice(2).filter(arg => arg !== "--strictPort")
  .map(arg => arg === "--host" ? "--hostname" : arg.replace(/^--host=/, "--hostname="));
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", ...args], {
  stdio: "inherit", env: process.env,
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
