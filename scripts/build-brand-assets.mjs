// Rebuild deployment assets from the approved original, without redrawing it.
// Run from the project root: node scripts/build-brand-assets.mjs
// The original is the room mark (the "d" with a blue room; "Final icon", 2026-10-31),
// archived at 1024 px: square and opaque, so platforms round its corners themselves.
import sharp from "sharp";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const source = "public/brand/dormscape-source.png";
const artwork = await sharp(source).toBuffer();
await mkdir("public/brand", {recursive:true});
await mkdir("public/icons", {recursive:true});
for (const [file,size] of [["public/icons/icon-192.png",192],["public/icons/icon-512.png",512],["app/icon.png",256],["app/apple-icon.png",180]]) {
  await sharp(artwork).resize(size,size).png({compressionLevel:9}).toFile(file);
}
// PNG and PDF exports draw this one as is, so it gets the rounded corners of the Logo board (124 / 560).
const round=Buffer.from(`<svg width="256" height="256"><rect width="256" height="256" rx="57" fill="#fff"/></svg>`);
await sharp(artwork).resize(256,256).composite([{input:round,blend:"dest-in"}]).png({compressionLevel:9}).toFile("public/brand/dormscape-mark.png");
const sizes=[16,32,48],images=await Promise.all(sizes.map(size=>sharp(artwork).resize(size,size).ensureAlpha().png().toBuffer()));
const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
let offset=header.length;
images.forEach((buffer,i)=>{const at=6+16*i;header[at]=header[at+1]=sizes[i];header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(buffer.length,at+8);header.writeUInt32LE(offset,at+12);offset+=buffer.length;});
await writeFile("app/favicon.ico",Buffer.concat([header,...images]));
const mark=(await readFile("public/icons/icon-512.png")).toString("base64");
// A code-authored share card keeps the approved logo and copy sharp and exact.
const share=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><clipPath id="tile"><rect x="60" y="105" width="420" height="420" rx="92"/></clipPath></defs>
<rect width="1200" height="630" fill="#f4f3ee"/>
<rect x="0" y="0" width="1200" height="12" fill="#2449ff"/>
<image href="data:image/png;base64,${mark}" x="60" y="105" width="420" height="420" clip-path="url(#tile)"/>
<g font-family="DejaVu Sans,Arial,sans-serif" fill="#16161d">
<text x="538" y="255" font-size="67" font-weight="bold" letter-spacing="-3">dormscape</text>
<text x="540" y="332" font-size="32">Plan your room.</text>
<rect x="540" y="390" width="216" height="51" fill="#ffd83d"/><text x="565" y="423" font-size="21" font-weight="bold">dormscape.us</text>
</g></svg>`;
await sharp(Buffer.from(share)).png().toFile("public/og.png");
console.log("Brand mark, social preview, favicon, Apple icon, and app icons rebuilt from the approved artwork.");
