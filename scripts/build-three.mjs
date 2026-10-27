// Builds public/experience/vendor/three.module.min.js: three.js trimmed to what the 3D studio uses.
// The studio's modules use three as `T.Name` (and RoundedBoxGeometry imports a few names); this collects
// every name they touch, keeps the ones three exports, and bundles only those from three's source.
// Run after changing public/experience/*.js:  node scripts/build-three.mjs
import { build } from "esbuild";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";

const root = join(import.meta.dirname, "..");
const users = [
  "public/experience/studio-scene.js",
  "public/experience/studio-models.js",
  "public/experience/room-builder.js",
  "scripts/check-studio-surfaces.mjs",
  "scripts/check-room-builder.cjs",
];
const names = new Set();
for (const file of users) for (const [, name] of readFileSync(join(root, file), "utf8").matchAll(/\bT\.([A-Za-z_$][\w$]*)/g)) names.add(name);
const rounded = readFileSync(join(root, "public/experience/vendor/RoundedBoxGeometry.js"), "utf8");
for (const name of /import\s*\{([^}]*)\}\s*from\s*['"]\.\/three\.module\.min\.js['"]/.exec(rounded)[1].split(",")) names.add(name.trim());
const used = [...names].filter((name) => name in THREE).sort();

const out = join(root, "public/experience/vendor/three.module.min.js");
await build({
  stdin: { contents: `export { ${used.join(", ")} } from "three/src/Three.js";`, resolveDir: root, loader: "js" },
  bundle: true,
  format: "esm",
  minify: true,
  target: "es2020",
  legalComments: "none",
  banner: { js: `/** three.js r${THREE.REVISION} (MIT, see LICENSE-three.txt), trimmed to the ${used.length} exports the studio uses by scripts/build-three.mjs. */` },
  outfile: out,
});
console.log(`${used.length} exports, ${(statSync(out).size / 1024).toFixed(0)} KB`);
