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
// The model loader (vendor/gltf-loader.min.js, loaded only when a room shows a library model) imports three from the
// trimmed build too, so every name it and its helpers use has to be kept.
const jsm = join(root, "node_modules/three/examples/jsm");
for (const file of ["loaders/GLTFLoader.js", "utils/BufferGeometryUtils.js", "utils/SkeletonUtils.js"]) {
  const head = /^import\s*\{([^}]*)\}\s*from\s*['"]three['"]/m.exec(readFileSync(join(jsm, file), "utf8"));
  if (head) for (const name of head[1].split(",")) if (name.trim()) names.add(name.trim().split(/\s+as\s+/)[0]);
}
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

// The loader: GLTFLoader with the meshopt decoder, importing three from the trimmed build above.
const loaderOut = join(root, "public/experience/vendor/gltf-loader.min.js");
await build({
  stdin: {
    contents: `export { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";\nexport { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";`,
    resolveDir: root,
    loader: "js",
  },
  bundle: true,
  format: "esm",
  minify: true,
  target: "es2020",
  legalComments: "none",
  plugins: [{ name: "three-external", setup(b) { b.onResolve({ filter: /^three$/ }, () => ({ path: "./three.module.min.js", external: true })); } }],
  banner: { js: `/** three.js r${THREE.REVISION} GLTFLoader + meshopt decoder (MIT, see LICENSE-three.txt), built by scripts/build-three.mjs. */` },
  outfile: loaderOut,
});
console.log(`loader ${(statSync(loaderOut).size / 1024).toFixed(0)} KB`);

