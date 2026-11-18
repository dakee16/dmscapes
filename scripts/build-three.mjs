// Builds public/experience/vendor/three.module.min.js: three.js trimmed to what the 3D studio uses.
// The studio's modules use three as `T.Name` (and RoundedBoxGeometry imports a few names); this collects
// every name they touch, keeps the ones three exports, and bundles only those from three's source.
// Run after changing public/experience/*.js:  node scripts/build-three.mjs
import { build } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
// The idle ambient-occlusion passes (vendor/post.min.js, loaded on desktop once the room is still) do too; their relative
// imports (shaders, Pass) are followed so nothing they reach is missed.
const jsm = join(root, "node_modules/three/examples/jsm");
const seen = new Set();
function keepImports(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const text = readFileSync(join(jsm, file), "utf8");
  for (const [, list] of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]three['"]/g))
    for (const name of list.split(",")) if (name.trim()) names.add(name.trim().split(/\s+as\s+/)[0]);
  for (const [, rel] of text.matchAll(/from\s*['"](\.{1,2}\/[^'"]+)['"]/g)) keepImports(join(dirname(file), rel));
}
for (const file of ["loaders/GLTFLoader.js", "loaders/KTX2Loader.js", "utils/BufferGeometryUtils.js", "utils/SkeletonUtils.js",
  "postprocessing/EffectComposer.js", "postprocessing/RenderPass.js", "postprocessing/GTAOPass.js", "postprocessing/OutputPass.js"]) keepImports(file);
// The HD photo's path tracer (vendor/pathtracer.min.js, loaded on desktop only when someone asks for an HD photo) is built
// first with three left external, and every name its output imports from three is kept.
const ptOut = join(root, "public/experience/vendor/pathtracer.min.js");
await build({
  stdin: {
    contents: `export { WebGLPathTracer, GradientEquirectTexture, DenoiseMaterial } from "three-gpu-pathtracer";\nexport { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";`,
    resolveDir: root,
    loader: "js",
  },
  bundle: true,
  format: "esm",
  minify: true,
  target: "es2020",
  legalComments: "none",
  plugins: [{ name: "three-external", setup(b) { b.onResolve({ filter: /^three$/ }, () => ({ path: "./three.module.min.js", external: true })); } }],
  banner: { js: `/** three-gpu-pathtracer + three-mesh-bvh (MIT, Garrett Johnson), FullScreenQuad from three.js r${THREE.REVISION} (MIT), built by scripts/build-three.mjs. */` },
  outfile: ptOut,
});
for (const [, list] of readFileSync(ptOut, "utf8").matchAll(/import\s*\{([^}]*)\}\s*from\s*["']\.\/three\.module\.min\.js["']/g))
  for (const name of list.split(",")) if (name.trim()) names.add(name.trim().split(/\s+as\s+/)[0]);
console.log(`pathtracer ${(statSync(ptOut).size / 1024).toFixed(0)} KB`);
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


// The idle ambient-occlusion passes, importing three from the trimmed build.
const postOut = join(root, "public/experience/vendor/post.min.js");
await build({
  stdin: {
    contents: ["EffectComposer", "RenderPass", "GTAOPass", "OutputPass"].map((n) => `export { ${n} } from "three/examples/jsm/postprocessing/${n}.js";`).join("\n"),
    resolveDir: root,
    loader: "js",
  },
  bundle: true,
  format: "esm",
  minify: true,
  target: "es2020",
  legalComments: "none",
  plugins: [{ name: "three-external", setup(b) { b.onResolve({ filter: /^three$/ }, () => ({ path: "./three.module.min.js", external: true })); } }],
  banner: { js: `/** three.js r${THREE.REVISION} EffectComposer, RenderPass, GTAOPass, OutputPass (MIT, see LICENSE-three.txt), built by scripts/build-three.mjs. */` },
  outfile: postOut,
});
console.log(`post ${(statSync(postOut).size / 1024).toFixed(0)} KB`);

// KTX2Loader on its own (desktop only: phones keep WebP textures and never load it or the transcoder).
const ktxOut = join(root, "public/experience/vendor/ktx2-loader.min.js");
await build({
  stdin: { contents: `export { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";`, resolveDir: root, loader: "js" },
  bundle: true,
  format: "esm",
  minify: true,
  target: "es2020",
  legalComments: "none",
  plugins: [{ name: "three-external", setup(b) { b.onResolve({ filter: /^three$/ }, () => ({ path: "./three.module.min.js", external: true })); } }],
  banner: { js: `/** three.js r${THREE.REVISION} KTX2Loader (MIT, see LICENSE-three.txt), built by scripts/build-three.mjs. */` },
  outfile: ktxOut,
});
console.log(`ktx2 loader ${(statSync(ktxOut).size / 1024).toFixed(0)} KB`);
// The Basis transcoder KTX2Loader runs in its workers (desktop only; phones keep WebP textures and never fetch it).
const basis = join(root, "public/experience/vendor/basis");
mkdirSync(basis, { recursive: true });
for (const f of ["basis_transcoder.js", "basis_transcoder.wasm"]) copyFileSync(join(root, "node_modules/three/examples/jsm/libs/basis", f), join(basis, f));
console.log("basis transcoder copied");
// The transcoder's worker as a real file. KTX2Loader would make it from a blob: URL, which inherits the page's CSP, and the
// transcoder's Emscripten bindings build functions from strings ('unsafe-eval'). Served from its own URL, the worker gets
// its own policy (next.config.ts), so the page keeps its strict one. Assembled exactly as KTX2Loader.init() does.
{
  const { KTX2Loader } = await import("three/examples/jsm/loaders/KTX2Loader.js");
  const fn = KTX2Loader.BasisWorker.toString();
  const body = [
    "/* constants */",
    "let _EngineFormat = " + JSON.stringify(KTX2Loader.EngineFormat),
    "let _EngineType = " + JSON.stringify(KTX2Loader.EngineType),
    "let _TranscoderFormat = " + JSON.stringify(KTX2Loader.TranscoderFormat),
    "let _BasisFormat = " + JSON.stringify(KTX2Loader.BasisFormat),
    "/* basis_transcoder.js */",
    readFileSync(join(basis, "basis_transcoder.js"), "utf8"),
    "/* worker */",
    fn.substring(fn.indexOf("{") + 1, fn.lastIndexOf("}")),
  ].join("\n");
  writeFileSync(join(basis, "ktx2-worker.js"), `/** three.js r${THREE.REVISION} KTX2Loader worker + Basis transcoder (MIT / Apache-2.0), built by scripts/build-three.mjs. */\n${body}`);
  console.log(`ktx2 worker ${(statSync(join(basis, "ktx2-worker.js")).size / 1024).toFixed(0)} KB`);
}
