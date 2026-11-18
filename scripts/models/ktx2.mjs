// Re-encodes the 3D studio's textures as KTX2 (Basis Universal), so they stay compressed on the GPU: about a quarter of the
// video memory of the WebP/PNG they replace, and no decode on the main thread.
//
//   npm i --no-save ktx2-encoder@0.6 sharp @gltf-transform/core@4 @gltf-transform/extensions@4 meshoptimizer
//   node scripts/models/ktx2.mjs            # every model in public/experience/models and every texture in .../textures
//   node scripts/models/ktx2.mjs desk.glb   # just these models
//
// Desktop models only: phones keep their 512 px WebP files (their video memory is modest already, and they skip the 527 KB
// transcoder). These textures are smooth, so WebP squeezes them hard and KTX2 can't match it on the wire; the settings trade
// the least download for the memory: ETC1S throughout (colour at quality 150, normals in Basis's normal-map mode), and the
// low-detail metal/roughness maps at 512 px. Mip levels are stored in the file; the meshopt geometry compression is kept.
// Room surfaces: each gets a .ktx2 beside its .webp, flipped like TextureLoader flips the .webp (desktop uses the .ktx2,
// phones and any browser where KTX2 fails use the .webp). Already-KTX2 models are skipped, so a second run changes nothing.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTTextureWebP } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { encodeToKTX2 } from "ktx2-encoder";
import sharp from "sharp";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.env.DMS_ROOT || join(import.meta.dirname, "../..");
const models = join(root, "public/experience/models"), textures = join(root, "public/experience/textures");
const decoder = (size) => async (buffer) => {
  let image = sharp(buffer);
  if (size) image = image.resize(size, size, { fit: "fill" });
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
};
const COLOUR = { isUASTC: false, qualityLevel: 150, compressionLevel: 3, generateMipmap: true, isPerceptual: true, isSetKTX2SRGBTransferFunc: true, imageDecoder: decoder() };
const DATA = { isUASTC: false, qualityLevel: 128, compressionLevel: 3, generateMipmap: true, isPerceptual: false, isSetKTX2SRGBTransferFunc: false, imageDecoder: decoder(512) };
const NORMAL = { isUASTC: false, isNormalMap: true, qualityLevel: 255, compressionLevel: 3, generateMipmap: true, isPerceptual: false, isSetKTX2SRGBTransferFunc: false, imageDecoder: decoder() };
const quiet = async (fn) => { const log = console.log; console.log = () => {}; try { return await fn(); } finally { console.log = log; } };

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const only = process.argv.slice(2);
let before = 0, after = 0;

for (const file of readdirSync(models).filter((f) => f.endsWith(".glb") && !f.endsWith("-lite.glb") && (!only.length || only.includes(f)))) {
  const path = join(models, file), doc = await io.read(path);
  const list = doc.getRoot().listTextures();
  if (list.every((t) => t.getMimeType() === "image/ktx2")) continue;
  before += statSync(path).size;
  for (const texture of list) {
    if (texture.getMimeType() === "image/ktx2") continue;
    const slots = texture.getGraph().listParentEdges(texture).map((e) => e.getName());
    const options = slots.includes("normalTexture") ? NORMAL : slots.includes("baseColorTexture") ? COLOUR : DATA;
    texture.setImage(await quiet(() => encodeToKTX2(texture.getImage(), options))).setMimeType("image/ktx2");
  }
  doc.createExtension((await import("@gltf-transform/extensions")).KHRTextureBasisu).setRequired(true);
  doc.getRoot().listExtensionsUsed().find((e) => e.extensionName === EXTTextureWebP.EXTENSION_NAME)?.dispose();
  await io.write(path, doc);
  after += statSync(path).size;
  console.log(file, (statSync(path).size / 1024).toFixed(0), "KB");
}
if (before) console.log(`models: ${(before / 1e6).toFixed(2)} MB -> ${(after / 1e6).toFixed(2)} MB`);

if (!only.length) {
  let tb = 0, ta = 0;
  for (const file of readdirSync(textures).filter((f) => f.endsWith(".webp"))) {
    const source = readFileSync(join(textures, file)), normal = file.endsWith("-n.webp");
    const out = join(textures, file.replace(/\.webp$/, ".ktx2"));
    const view = file.startsWith("view-");
    writeFileSync(out, await quiet(() => encodeToKTX2(new Uint8Array(source), { ...(normal ? NORMAL : COLOUR), qualityLevel: normal ? 255 : view ? 200 : 180, isYFlip: true })));
    tb += source.length;
    ta += statSync(out).size;
  }
  console.log(`textures: ${(tb / 1e6).toFixed(2)} MB of WebP -> ${(ta / 1e6).toFixed(2)} MB of KTX2 (the WebP stay as the fallback)`);
}
