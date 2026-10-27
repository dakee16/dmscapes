import * as T from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";

// Clay: matte surfaces with a soft grain, added to the standard material in the shader: one lookup into a
// small mipmapped noise tile, projected along each face, so it costs next to nothing, moves with its piece,
// and fades smoothly with distance instead of shimmering.
const GRAIN = (() => {
  const n = 128, data = new Uint8Array(n * n); let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // Two octaves of smooth value noise that tile seamlessly (they sum to 0–255).
  for (const [cells, amp] of [[32, 150], [64, 105]]) {
    const g = Array.from({ length: cells * cells }, rnd), at = (i, j) => g[(j % cells) * cells + (i % cells)];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const fx = x / n * cells, fy = y / n * cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx, b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
      data[y * n + x] += Math.round((a + (b - a) * sy) * amp);
    }
  }
  const t = new T.DataTexture(data, n, n, T.RedFormat, T.UnsignedByteType);
  t.wrapS = t.wrapT = T.RepeatWrapping; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
})();
const CLAY_PARS = `varying vec3 vClay;
uniform float uGrain;
uniform sampler2D uClayGrain;`;
// The grain tile spans 3 ft: soft mottling about an inch across, with finer speckle inside it.
const CLAY_GRAIN = `{
  vec3 clayN = abs( cross( dFdx( vClay ), dFdy( vClay ) ) );
  vec2 clayUv = clayN.x > clayN.y && clayN.x > clayN.z ? vClay.zy : clayN.y > clayN.z ? vClay.xz : vClay.xy;
  diffuseColor.rgb *= 1.0 + ( texture2D( uClayGrain, clayUv / 3.0 ).r - 0.5 ) * uGrain * 2.0;
}`;
// A baked piece's corner shading (bake): aAo.x is the shade baked where its parts meet; aAo.y turns on the shading toward
// the floor, worked out per pixel from the height above the piece's base (vClay.y), strongest on faces turned down and
// none on faces turned up.
const CLAY_AO = "diffuseColor.rgb *= vAo.x * ( 1.0 - 0.45 * vAo.y * ( 1.0 - smoothstep( 0.0, 0.5, vClay.y ) ) * clamp( 0.6 - 0.6 * vUp, 0.0, 1.0 ) );";
function clayCompile(shader) {
  const ao = this.defines?.DM_AO !== undefined;
  shader.uniforms.uGrain = { value: this.userData.grain ?? .1 };
  shader.uniforms.uClayGrain = { value: GRAIN };
  shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vClay;" + (ao ? "\nattribute vec2 aAo;\nvarying vec2 vAo;\nvarying float vUp;" : ""))
    .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvec4 clayP = vec4( transformed, 1.0 );\n#ifdef USE_INSTANCING\nclayP = instanceMatrix * clayP;\n#endif\nvClay = ( modelMatrix * clayP ).xyz - modelMatrix[ 3 ].xyz;" + (ao ? "\nvAo = aAo;\nvUp = normalize( mat3( modelMatrix ) * objectNormal ).y;" : ""));
  shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\n" + CLAY_PARS + (ao ? "\nvarying vec2 vAo;\nvarying float vUp;" : ""))
    .replace("#include <color_fragment>", "#include <color_fragment>\n" + CLAY_GRAIN + (ao ? "\n" + CLAY_AO : ""));
}
const clayKey = () => "dm-clay";
/** Give a standard material the clay grain (amount ≈ how strong the mottling is). Every clay material shares one program per variant. */
export function clay(material, grain = .1) {
  material.userData.grain = grain;
  material.onBeforeCompile = clayCompile;
  material.customProgramCacheKey = clayKey;
  return material;
}

// Corner shading where a piece's parts meet, baked once: how far out a vertex looks (ft), what each step counts, how dark a
// closed corner gets, and how finely edges split where the shading changes along them (ft, and by how much).
const AO_STEPS = [.06, .14, .26, .42], AO_WEIGHTS = [1, .8, .55, .35], AO_SUM = 2.7, AO_REACH = .84, AO_STRENGTH = .6, AO_FINE = .2, AO_STEP = .1;
/** The solid a part roughly fills, placed by m in the piece's frame: its geometry's box, ball or upright cylinder (unit axes, half sizes). */
function solidOf(geometry, m) {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox, e = m.elements, axes = [], h = [];
  for (let i = 0; i < 3; i++) {
    const s = Math.hypot(e[i * 4], e[i * 4 + 1], e[i * 4 + 2]) || 1;
    axes.push(e[i * 4] / s, e[i * 4 + 1] / s, e[i * 4 + 2] / s); h.push(Math.max(1e-3, (max.getComponent(i) - min.getComponent(i)) / 2 * s));
  }
  return { kind: geometry.type === "SphereGeometry" ? 1 : geometry.type === "CylinderGeometry" ? 2 : 0, c: min.clone().add(max).multiplyScalar(.5).applyMatrix4(m), axes, h, r: Math.hypot(...h) };
}
/** Signed distance (ft) from a point to a solid, negative inside (an estimate for balls). */
function solidDistance(s, x, y, z) {
  const a = s.axes, h = s.h, dx = x - s.c.x, dy = y - s.c.y, dz = z - s.c.z;
  const px = Math.abs(dx * a[0] + dy * a[1] + dz * a[2]), py = Math.abs(dx * a[3] + dy * a[4] + dz * a[5]), pz = Math.abs(dx * a[6] + dy * a[7] + dz * a[8]);
  if (s.kind === 1) {
    const ux = px / h[0], uy = py / h[1], uz = pz / h[2], vx = ux / h[0], vy = uy / h[1], vz = uz / h[2], k0 = Math.sqrt(ux * ux + uy * uy + uz * uz), k1 = Math.sqrt(vx * vx + vy * vy + vz * vz);
    return k1 > 0 ? k0 * (k0 - 1) / k1 : -Math.min(h[0], h[1], h[2]);
  }
  const qx = s.kind === 2 ? (Math.sqrt((px / h[0]) ** 2 + (pz / h[2]) ** 2) - 1) * Math.min(h[0], h[2]) : px - h[0], qy = py - h[1], qz = s.kind === 2 ? -1 : pz - h[2];
  const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0, oz = qz > 0 ? qz : 0, inside = Math.max(qx, qy, qz);
  return Math.sqrt(ox * ox + oy * oy + oz * oz) + (inside < 0 ? inside : 0);
}
const near = [];
/** How lit a vertex at p (normal n) stays: it steps out along n and darkens by how close the other parts (`around` its own) are. */
function occlusion(p, n, around) {
  near.length = 0;
  for (const s of around) if ((p.x - s.c.x) ** 2 + (p.y - s.c.y) ** 2 + (p.z - s.c.z) ** 2 < (s.r + AO_REACH) ** 2) near.push(s);
  if (!near.length) return 1;
  let occ = 0;
  for (let i = 0; i < AO_STEPS.length; i++) {
    const t = AO_STEPS[i], x = p.x + n.x * t, y = p.y + n.y * t, z = p.z + n.z * t; let d = Infinity;
    // A part whose bounding sphere stays more than t away can't shade this step.
    for (const s of near) if ((x - s.c.x) ** 2 + (y - s.c.y) ** 2 + (z - s.c.z) ** 2 < (s.r + t) ** 2) d = Math.min(d, solidDistance(s, x, y, z));
    occ += AO_WEIGHTS[i] * Math.min(1, Math.max(0, 1 - d / t));
  }
  return 1 - AO_STRENGTH * occ / AO_SUM;
}
/**
 * Split each edge that `split(a, b, lengthSquared)` asks for at its midpoint, until none are (flat arrays, extended in
 * place; returns the new index). The choice is per edge, so both triangles on an edge split it alike and no cracks open.
 */
function refine(pos, nor, uv, owner, index, split) {
  const mids = new Map(), far = (a, b) => split(a, b, (pos[a * 3] - pos[b * 3]) ** 2 + (pos[a * 3 + 1] - pos[b * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[b * 3 + 2]) ** 2);
  const mid = (a, b) => {
    const key = a < b ? a * 4194304 + b : b * 4194304 + a;
    if (!mids.has(key)) {
      const nx = nor[a * 3] + nor[b * 3], ny = nor[a * 3 + 1] + nor[b * 3 + 1], nz = nor[a * 3 + 2] + nor[b * 3 + 2], l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      mids.set(key, owner.length);
      pos.push((pos[a * 3] + pos[b * 3]) / 2, (pos[a * 3 + 1] + pos[b * 3 + 1]) / 2, (pos[a * 3 + 2] + pos[b * 3 + 2]) / 2);
      nor.push(nx / l, ny / l, nz / l); uv.push((uv[a * 2] + uv[b * 2]) / 2, (uv[a * 2 + 1] + uv[b * 2 + 1]) / 2); owner.push(owner[a]);
    }
    return mids.get(key);
  };
  for (let pass = 0; pass < 8; pass++) {
    const out = []; let split = false;
    for (let t = 0; t < index.length; t += 3) {
      let a = index[t], b = index[t + 1], c = index[t + 2], ab = far(a, b), bc = far(b, c), ca = far(c, a);
      const n = ab + bc + ca;
      if (!n) { out.push(a, b, c); continue; }
      split = true;
      if (n === 3) { const x = mid(a, b), y = mid(b, c), z = mid(c, a); out.push(a, x, z, x, b, y, z, y, c, x, y, z); continue; }
      // Turn the triangle so its split edge is a→b (one) or its kept edge is c→a (two).
      while (n === 1 ? !ab : ca) [a, b, c, ab, bc, ca] = [b, c, a, bc, ca, ab];
      if (n === 1) { const x = mid(a, b); out.push(a, x, c, x, b, c); }
      else { const x = mid(a, b), y = mid(b, c); out.push(a, x, y, x, b, y, a, y, c); }
    }
    index = out; if (!split) break;
  }
  return index;
}
/** A soft blur: a box blur of radius r, twice each way; outside the grid counts as clear. */
function blur(src, w, h, r) {
  let a = src;
  for (let pass = 0; pass < 4; pass++) {
    const b = new Float32Array(a.length), dx = pass % 2 ? 0 : 1, dz = pass % 2;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let s = 0; for (let k = -r; k <= r; k++) { const x = i + k * dx, z = j + k * dz; if (x >= 0 && x < w && z >= 0 && z < h) s += a[z * w + x]; }
      b[j * w + i] = s / (2 * r + 1);
    }
    a = b;
  }
  return a;
}
/**
 * A piece seen from straight above, for its contact shadow: an alpha grid over its footprint plus a margin (row 0 at z0,
 * `cell` ft a texel). Parts within a few inches of the floor (legs, bases) leave a dark, tight mark; higher parts (a bed's
 * frame, a desk top) a fainter, wider one.
 */
export function footprint(root) {
  root.updateMatrixWorld(true);
  const toRoot = new T.Matrix4().copy(root.matrixWorld).invert(), im = new T.Matrix4(), v = new T.Vector3(), parts = [];
  root.traverse(o => {
    if (o.isMesh && ![o.material].flat().some(x => x.transparent)) for (let k = 0; k < (o.isInstancedMesh ? o.count : 1); k++) {
      const m = new T.Matrix4().multiplyMatrices(toRoot, o.matrixWorld); if (o.isInstancedMesh) { o.getMatrixAt(k, im); m.multiply(im); }
      parts.push([o.geometry, m]);
    }
  });
  // Each triangle as its corners' x, z and its lowest point's height.
  const tris = new Float32Array(parts.reduce((n, [g]) => n + Math.floor((g.index ?? g.attributes.position).count / 3) * 7, 0));
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity, at = 0;
  for (const [g, m] of parts) {
    const P = g.attributes.position, I = g.index, xyz = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m); xyz[i * 3] = v.x; xyz[i * 3 + 1] = v.y; xyz[i * 3 + 2] = v.z; x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z); }
    for (let i = 0; i + 2 < (I ? I.count : P.count); i += 3) {
      const a = (I ? I.getX(i) : i) * 3, b = (I ? I.getX(i + 1) : i + 1) * 3, c = (I ? I.getX(i + 2) : i + 2) * 3;
      tris[at++] = xyz[a]; tris[at++] = xyz[a + 2]; tris[at++] = xyz[b]; tris[at++] = xyz[b + 2]; tris[at++] = xyz[c]; tris[at++] = xyz[c + 2]; tris[at++] = Math.max(0, Math.min(xyz[a + 1], xyz[b + 1], xyz[c + 1]));
    }
  }
  if (!tris.length) return null;
  const margin = .6, cell = Math.max(.05, (Math.max(x1 - x0, z1 - z0) + margin * 2) / 64), nx = Math.ceil((x1 - x0 + margin * 2) / cell), nz = Math.ceil((z1 - z0 + margin * 2) / cell);
  x0 -= margin; z0 -= margin;
  // The lowest part over each texel: every corner marks its own texel (so a thin leg still shows), then the texel centres each triangle covers.
  const low = new Float32Array(nx * nz).fill(Infinity), put = (i, j, y) => { if (i >= 0 && i < nx && j >= 0 && j < nz && y < low[j * nx + i]) low[j * nx + i] = y; };
  for (let t = 0; t < tris.length; t += 7) {
    const ax = (tris[t] - x0) / cell, az = (tris[t + 1] - z0) / cell, bx = (tris[t + 2] - x0) / cell, bz = (tris[t + 3] - z0) / cell, cx = (tris[t + 4] - x0) / cell, cz = (tris[t + 5] - z0) / cell, y = tris[t + 6];
    put(ax | 0, az | 0, y); put(bx | 0, bz | 0, y); put(cx | 0, cz | 0, y);
    const area = (bx - ax) * (cz - az) - (bz - az) * (cx - ax); if (Math.abs(area) < 1e-9) continue;
    for (let j = Math.max(0, Math.floor(Math.min(az, bz, cz))); j <= Math.min(nz - 1, Math.floor(Math.max(az, bz, cz))); j++)
      for (let i = Math.max(0, Math.floor(Math.min(ax, bx, cx))); i <= Math.min(nx - 1, Math.floor(Math.max(ax, bx, cx))); i++) {
        const px = i + .5, pz = j + .5, w0 = ((bx - px) * (cz - pz) - (bz - pz) * (cx - px)) / area, w1 = ((cx - px) * (az - pz) - (cz - pz) * (ax - px)) / area;
        if (w0 >= 0 && w1 >= 0 && w0 + w1 <= 1) put(i, j, y);
      }
  }
  // Contact marks grow by a texel first, so a leg thinner than a texel keeps its weight through the blur.
  const contact = new Float32Array(nx * nz), cover = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    let y = Infinity; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (i + di >= 0 && i + di < nx && j + dj >= 0 && j + dj < nz) y = Math.min(y, low[(j + dj) * nx + i + di]);
    if (y < Infinity) contact[j * nx + i] = Math.max(0, 1 - y / .45);
    if (low[j * nx + i] < Infinity) cover[j * nx + i] = Math.min(1, Math.max(.35, 1.25 - low[j * nx + i] / 4));
  }
  const a = blur(contact, nx, nz, Math.max(1, Math.round(.08 / cell))), b = blur(cover, nx, nz, Math.max(1, Math.round(.28 / cell))), data = new Uint8Array(nx * nz);
  for (let i = 0; i < data.length; i++) data[i] = Math.round(255 * (1 - (1 - a[i]) * (1 - b[i] * .8)));
  return { data, nx, nz, x0, z0, x1: x0 + nx * cell, z1: z0 + nz * cell };
}

// Original, dimension-driven models (design-handoff/3d-studio/scene.js is the
// look reference). Every piece is built inside its real footprint: width_ft
// along x, length_ft along z, centred on the group, standing on y = 0. Only
// what is in the plan is drawn; the vibe changes colours and materials only.
export function createModelKit({onTexture=()=>{}}={}) {
  const geometries=new Map(),materials=new Map(),textures=new Map(),glows=new Set(),shiny=new Set();let disposed=false,night=false,env=null,envI=1;
  const c=document.createElement("canvas");c.width=c.height=128;const cx=c.getContext("2d");
  cx.fillStyle="#dddddd";cx.fillRect(0,0,128,128);
  for(let i=0;i<128;i+=3){cx.fillStyle=i%2?"#c9c9c9":"#efefef";cx.fillRect(i,0,1,128);cx.fillRect(0,i,128,1);}
  const fabric=new T.CanvasTexture(c);fabric.wrapS=fabric.wrapT=T.RepeatWrapping;fabric.repeat.set(3,3);
  /** Glass, mirrors and metal reflect the room's small reflection map (setEnv); nothing else does. */
  const shine=m=>{m.envMap=env;m.envMapIntensity=envI;shiny.add(m);return m;};
  // Clay-matte by default: glossy surfaces (glass, mirrors) stay smooth, metal goes satin, everything else is soft and grainy.
  const mat=(color,roughness=.65,cloth=false,metal=null)=>{
    const key=[color,roughness,cloth,metal].join("|");
    if(!materials.has(key)){
      const glossy=roughness<.3&&metal===null;
      const m=new T.MeshStandardMaterial({color,roughness:glossy?roughness:metal!==null?Math.max(roughness,.5):Math.max(roughness,.82),
        metalness:glossy?.3:metal!==null?Math.min(metal,.35):0,...(cloth?{bumpMap:fabric,bumpScale:.015}:{})});
      if(glossy||metal!==null)shine(m);
      materials.set(key,glossy?m:clay(m,cloth?.08:metal!==null?.05:.1));
    }
    return materials.get(key);
  };
  /** A clay material's twin that also takes a baked piece's corner shading (see CLAY_AO); null for any other material. */
  function shaded(m){
    if(m.customProgramCacheKey!==clayKey)return null;
    const key="shaded|"+m.uuid;
    if(!materials.has(key)){const s=clay(m.clone(),m.userData.grain);s.defines={...s.defines,DM_AO:""};if(shiny.has(m))shine(s);materials.set(key,s);}
    return materials.get(key);
  }
  /** A lit surface (lamp shade, bulb, LED): brighter at night. */
  function glowMat(color){
    const key="glow|"+color;if(materials.has(key))return materials.get(key);
    const m=new T.MeshStandardMaterial({color:"#fff6e4",emissive:color,emissiveIntensity:night?2.6:.55,roughness:.4});
    materials.set(key,m);glows.add(m);return m;
  }
  const mix=(a,b,t)=>"#"+new T.Color(a).lerp(new T.Color(b),t).getHexString();
  const white=mat("#fbf8f1",.9),wood=mat("#ddbf8f",.62),woodDark=mat("#c9a573",.6),ink=mat("#2b2c3a",.5),metal=mat("#c9c4bd",.35,false,.6),
    leafA=mat("#5f8a4c",.75),leafB=mat("#7aa560",.75),soil=mat("#5b4636",.95),terracotta=mat("#c4826a",.9);
  function textile(product,color){
    if(!product || product.pattern==="solid")return mat(color,.95,true);
    const key="textile:"+product.id+":"+color;if(materials.has(key))return materials.get(key);
    const canvas=document.createElement("canvas");canvas.width=canvas.height=256;const ctx=canvas.getContext("2d");
    ctx.fillStyle=color;ctx.fillRect(0,0,256,256);ctx.fillStyle="#f8f0df";ctx.strokeStyle="#f8f0df";ctx.lineWidth=5;
    for(let x=0;x<256;x+=32)for(let y=0;y<256;y+=32){
      if(product.pattern==="check"&&(x+y)%64===0)ctx.fillRect(x,y,32,32);
      if(product.pattern==="stripe"&&x%64===0)ctx.fillRect(x,y,12,32);
      if(product.pattern==="diamond"){ctx.beginPath();ctx.moveTo(x+16,y+2);ctx.lineTo(x+30,y+16);ctx.lineTo(x+16,y+30);ctx.lineTo(x+2,y+16);ctx.closePath();ctx.stroke();}
      if(product.pattern==="floral"){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.ellipse(x+16+Math.cos(a)*7,y+16+Math.sin(a)*7,5,8,a,0,Math.PI*2);ctx.fill();}}
    }
    if(product.pattern==="wave")for(let x=-128;x<384;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+130,80,x-100,180,x+32,256);ctx.lineWidth=20;ctx.stroke();}
    if(product.pattern==="halloween")for(let x=0;x<256;x+=64)for(let y=0;y<256;y+=64){
      // A Halloween print: pumpkins, ghosts and bats in turn, a half-step apart each row.
      const k=((x+y)/64)%3,cx0=x+(y%128?32:0)+16,cy0=y+20;
      if(k===0){ctx.fillStyle="#ff7a1a";ctx.beginPath();ctx.ellipse(cx0,cy0,13,11,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#5d7a3a";ctx.fillRect(cx0-2,cy0-15,4,6);}
      else if(k===1){ctx.fillStyle="#f8f0df";ctx.beginPath();ctx.arc(cx0,cy0-2,10,Math.PI,0);ctx.lineTo(cx0+10,cy0+12);for(let i=0;i<4;i++)ctx.lineTo(cx0+10-5*(i+1),cy0+(i%2?12:8));ctx.closePath();ctx.fill();ctx.fillStyle="#1c1622";ctx.fillRect(cx0-5,cy0-4,3,4);ctx.fillRect(cx0+2,cy0-4,3,4);}
      else{ctx.fillStyle="#1c1622";ctx.beginPath();ctx.moveTo(cx0,cy0+6);ctx.lineTo(cx0-16,cy0-4);ctx.lineTo(cx0-6,cy0-2);ctx.lineTo(cx0-3,cy0-8);ctx.lineTo(cx0,cy0-4);ctx.lineTo(cx0+3,cy0-8);ctx.lineTo(cx0+6,cy0-2);ctx.lineTo(cx0+16,cy0-4);ctx.closePath();ctx.fill();}
    }
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;textures.set(key,tex);
    const material=clay(new T.MeshStandardMaterial({map:tex,roughness:.98,bumpMap:fabric,bumpScale:.012}),.08);materials.set(key,material);return material;
  }
  function productPrint(product,fallback){
    if(!product?.image || !/^https:\/\/m\.media-amazon\.com\//.test(product.image))return fallback;
    const key="photo:"+product.image;if(materials.has(key))return materials.get(key);
    const material=new T.MeshStandardMaterial({color:"#fffaf2",roughness:.9});materials.set(key,material);
    new T.TextureLoader().load(product.image,texture=>{if(disposed){texture.dispose();return;}
      const source=texture.image,canvas=document.createElement("canvas"),scale=Math.min(1,768/Math.max(source.width,source.height));
      canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));canvas.getContext("2d").drawImage(source,0,0,canvas.width,canvas.height);texture.image=canvas;texture.needsUpdate=true;
      texture.colorSpace=T.SRGBColorSpace;textures.set(key,texture);material.map=texture;material.needsUpdate=true;onTexture();
    },undefined,()=>{});
    return material;
  }
  /** A seasonal rug's weave: stripes or plaid in its two colours, about 3 in per band. */
  function rugPrint(product,base,line,w,d){
    const key=["rug",product.id,base,line,w,d].join(":");if(materials.has(key))return materials.get(key);
    const canvas=document.createElement("canvas");canvas.width=canvas.height=256;const ctx=canvas.getContext("2d");
    ctx.fillStyle=base;ctx.fillRect(0,0,256,256);ctx.fillStyle=line;
    if(product.pattern==="check"){ctx.globalAlpha=.55;for(let i=0;i<256;i+=64){ctx.fillRect(i,0,32,256);ctx.fillRect(0,i,256,32);}ctx.globalAlpha=1;for(let i=0;i<256;i+=64)for(let j=0;j<256;j+=64)ctx.fillRect(i,j,32,32);}
    else for(let i=0;i<256;i+=64)ctx.fillRect(0,i,256,32);
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(w/2,d/2);textures.set(key,tex);
    const material=clay(new T.MeshStandardMaterial({map:tex,roughness:1,bumpMap:fabric,bumpScale:.012}),.08);materials.set(key,material);return material;
  }
  /** A bat seen flat on the wall (the brand mark's outline), one unit wide. */
  function batGeometry(){
    if(geometries.has("bat"))return geometries.get("bat");
    const pts=[[20,15],[13.6,12.2],[7.8,9.8],[2,5.8],[8.5,5.2],[14.4,5.6],[17.6,4.8],[18.4,2.6],[19.4,4.4],[20.6,4.4],[21.6,2.6],[22.4,4.8],[25.6,5.6],[31.5,5.2],[38,5.8],[32.2,9.8],[26.4,12.2]];
    const shape=new T.Shape(pts.map(([x,y])=>new T.Vector2((x-20)/40,(9-y)/40)));
    const g=new T.ShapeGeometry(shape);geometries.set("bat",g);return g;
  }
  const add=(g,mesh,x,y,z)=>{mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;};
  /** A rounded box (the studio's soft, real-world edges). */
  function box(g,w,h,d,m,x=0,y=0,z=0,r=.035,seg=2){
    w=Math.max(.008,w);h=Math.max(.008,h);d=Math.max(.008,d);
    const key=[w,h,d,r,seg].join("|");if(!geometries.has(key))geometries.set(key,new RoundedBoxGeometry(w,h,d,seg,Math.min(r,w/2-1e-3,h/2-1e-3,d/2-1e-3)));
    return add(g,new T.Mesh(geometries.get(key),m),x,y,z);
  }
  function cyl(g,rt,rb,h,m,x=0,y=0,z=0,seg=20){
    const key=["c",rt,rb,h,seg].join("|");if(!geometries.has(key))geometries.set(key,new T.CylinderGeometry(rt,rb,h,seg));
    return add(g,new T.Mesh(geometries.get(key),m),x,y,z);
  }
  function oval(g,x,y,z,sx,sy,sz,m){
    if(!geometries.has("sphere"))geometries.set("sphere",new T.SphereGeometry(1,24,16));
    const mesh=add(g,new T.Mesh(geometries.get("sphere"),m),x,y,z);mesh.scale.set(sx,sy,sz);return mesh;
  }
  /** A bean bag: a slumped, slightly lumpy sphere, fitted to the footprint. */
  function beanGeometry(){
    if(geometries.has("bean"))return geometries.get("bean");
    const g=new T.SphereGeometry(1,40,28),p=g.attributes.position,v=new T.Vector3();
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=Math.sin(v.x*3.1)*.05+Math.cos(v.z*2.7+v.y*2)*.05;v.multiplyScalar(1+n);
      if(v.y>.33)v.y=.33+(v.y-.33)*.35-Math.max(0,.37-Math.hypot(v.x,v.z))*.3;p.setXYZ(i,v.x,v.y,v.z);}
    g.computeVertexNormals();g.computeBoundingBox();geometries.set("bean",g);return g;
  }
  /** One curtain panel with real folds: a plane rippled across its width. */
  function foldGeometry(w,h){
    const key=["fold",w,h].join("|");if(geometries.has(key))return geometries.get(key);
    const g=new T.PlaneGeometry(w,h,Math.max(12,Math.round(w*14)),1),p=g.attributes.position;
    for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)/w*Math.PI*2*Math.max(2,w*3))*Math.min(.09,w*.08));
    g.computeVertexNormals();geometries.set(key,g);return g;
  }
  /** A plump pillow or cushion, w × h × d: a rounded box that swells toward the middle and thins at its edges. */
  function pillowGeometry(w,h,d){
    const key=["pillow",w,h,d].join("|");if(geometries.has(key))return geometries.get(key);
    const g=new RoundedBoxGeometry(w,h,d,5,Math.min(h*.45,w/2-1e-3,d/2-1e-3)),p=g.attributes.position,n=g.attributes.normal,ax=4/(w*w),az=4/(d*d);
    for(let i=0;i<p.count;i++){
      // Height scales by s(x, z); the normals follow the same squash (inverse transpose of its Jacobian), so the edges stay seamless.
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1-.85*(x*x*ax+z*z*az),s=.6+.4*Math.max(0,k),sx=k>0?-.68*x*ax:0,sz=k>0?-.68*z*az:0;
      const nx=n.getX(i)-y*sx/s*n.getY(i),ny=n.getY(i)/s,nz=n.getZ(i)-y*sz/s*n.getY(i),l=Math.hypot(nx,ny,nz);
      p.setY(i,y*s);n.setXYZ(i,nx/l,ny/l,nz/l);
    }
    g.userData.soft=true;geometries.set(key,g);return g;
  }
  /**
   * A soft sheet (duvet, folded throw), t thick, whose top tw × tl lies flat (centred on the origin, gently
   * creased by `wrinkle`) and whose extra cloth rolls over a rounded edge and hangs: `side` on both long
   * sides, `foot` at the +z end.
   */
  function drapeGeometry(tw,tl,t,side,foot,wrinkle){
    const key=["drape",tw,tl,t,side,foot,wrinkle].join("|");if(geometries.has(key))return geometries.get(key);
    const W=tw+side*2,L=tl+foot,a=tw/2,zf=tl/2,r=.07,arc=r*Math.PI/2;
    const g=new T.BoxGeometry(W,t,L,Math.max(8,Math.round(W*10)),1,Math.max(8,Math.round(L*7))),p=g.attributes.position;
    // Overhang o past an edge: [outward, down, bend angle] for the cloth's mid-surface.
    const bend=o=>o<=0?[0,0,0]:o<arc?[r*Math.sin(o/r),r*(1-Math.cos(o/r)),o/r]:[r,r+o-arc,Math.PI/2];
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i)+L/2-tl/2,ox=Math.abs(x)-a,oz=z-zf,[bx,dx,fx]=bend(ox),[bz,dz,fz]=bend(oz),sx=Math.sign(x);
      const crease=wrinkle*(Math.sin(z*2.1+x*.8)*.65+Math.sin(z*5.3-x*1.7)*.35)*Math.max(0,1-(Math.max(0,ox)+Math.max(0,oz))/.12);
      // The layer's offset from the mid-surface turns with the bend, so the cloth keeps its thickness as it hangs.
      p.setXYZ(i,ox>0?sx*(a+bx+Math.sin(fx)*y):x,-dx-dz+crease+Math.cos(fx)*Math.cos(fz)*y,oz>0?zf+bz+Math.sin(fz)*y:z);
    }
    g.computeVertexNormals();g.userData.soft=true;geometries.set(key,g);return g;
  }
  /** Leaves as one instanced mesh per green: a leafy cluster inside radius r between heights y0 and y1. */
  function leaves(g,r,y0,y1,count){
    if(!geometries.has("leaf"))geometries.set("leaf",new T.SphereGeometry(1,10,8));
    const dummy=new T.Object3D();let seed=Math.round(r*1000+count);const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    for(const [m,n] of [[leafA,Math.ceil(count/2)],[leafB,Math.floor(count/2)]]){
      const inst=new T.InstancedMesh(geometries.get("leaf"),m,n);inst.castShadow=true;inst.receiveShadow=true;
      for(let i=0;i<n;i++){const a=rnd()*Math.PI*2,t=Math.sqrt(rnd()),y=y0+(y1-y0)*(.15+.85*rnd()),reach=r*(.25+.65*t)*(1-.35*(y-y0)/(y1-y0+1e-3));
        const s=Math.min(r*.42,.55)*(.7+rnd()*.5);
        dummy.position.set(Math.cos(a)*reach,y,Math.sin(a)*reach);dummy.rotation.set((rnd()-.5)*.6,-a,.5+rnd()*.7);dummy.scale.set(s,s*.12,s*.36);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);}
      g.add(inst);}
  }
  /** Up to six small pieces from a multi-pack, three across in the footprint; draw(x, z, cellW, cellD) places each. */
  function cluster(f,w,d,draw){
    const n=Math.min(Math.max(1,f.product?.count||1),6),cols=Math.min(3,n),rows=Math.ceil(n/cols),cw=w/cols,cd=d/rows,k=n>1?1/1.15:1;
    for(let i=0;i<n;i++)draw(-w/2+cw*(i%cols+.5),-d/2+cd*(Math.floor(i/cols)+.5),cw*k,cd*k);
  }
  function build(f,palette,{theme,dress=true}={}){
    const g=new T.Group(),w=Math.max(.1,f.width_ft),d=Math.max(.1,f.length_ft),h=f.height,variant=f.product?.variant;
    // Soft goods take the vibe's colours when the room is dressed; a piece's own colour always wins.
    const vibe=dress&&theme;
    const color=f.material_color||(vibe?theme.textileAlt:palette[1])||"#b4c2dd";
    const cloth=textile(f.product,color),accent=mat(vibe?theme.accent:palette[2]||"#d8b080",.9,true),finish=mat(color,variant==="clear"?.2:.65);
    const glow=glowMat(f.product?.color||(theme?.glow)||"#ffcf82");
    const legs=(height,thick=.12,m=wood)=>{for(const x of [-1,1])for(const z of [-1,1])box(g,thick,height,thick,m,x*(w/2-thick/2-.03),height/2,z*(d/2-thick/2-.03),.02);};
    switch(f.kind){
      case "bed":case "bunk":{
        const loft=f.bed_mode==="lofted";
        const levels=f.kind==="bunk"?[h*.3,h*.78]:loft?[h*.78]:[h-.28];
        const duvetColor=f.material_color||(vibe?theme.textile:color),duvet=textile(f.product,duvetColor);
        const fold=mat(mix(duvetColor,"#ffffff",.3),.95,true),pillow=mat(vibe?mix(theme.textileAlt,"#ffffff",.25):"#fbfaf7",1,true),mattress=mat("#fbfaf6",1,true);
        for(const [index,level] of levels.entries()){
          box(g,w,.18,d,wood,0,level-.36,0,.04);
          box(g,w*.96,.38,d*.96,mattress,0,level-.08,0,.14,3).name=`mattress-${index}`;
          if(!f.bare){
            // The duvet covers the lower part, softly creased, and drapes over both long sides and the foot.
            const len=d*.72,zc=d*.12;
            add(g,new T.Mesh(drapeGeometry(w*.98,len,.12,.5,.45,.022),duvet),0,level+.165,zc);
            box(g,w*.98,.06,d*.07,fold,0,level+.22,zc-len/2+d*.035,.03);
            const n=w>=3.8?2:1,pw=n>1?w*.42:w*.62,pd=Math.min(d*.16,1.5);
            for(let i=0;i<n;i++){const p=add(g,new T.Mesh(pillowGeometry(pw,.3,pd),pillow),(i-(n-1)/2)*w*.47,level+.3,-d/2+pd/2+.22);p.rotation.x=.24;p.rotation.z=(i-(n-1)/2)*.08;}
          }
        }
        for(const x of [-1,1])for(const z of [-1,1])box(g,.16,h,.16,wood,x*(w/2-.08),h/2,z*(d/2-.08),.03);
        box(g,w,.65,.12,wood,0,h-.32,-d/2+.07,.04);
        if(f.kind==="bunk"||loft){
          for(const side of [-1,1]){
            box(g,.1,.12,d-.2,wood,side*(w/2-.08),h-.18,0,.03).name="bunk-guardrail";
            box(g,.1,.09,d-.2,wood,side*(w/2-.08),h-.53,0,.03);
          }
          const ladder=new T.Group();ladder.name=loft?"loft-ladder":"bunk-ladder";g.add(ladder);
          for(const x of [w*.04,w*.39])box(ladder,.1,h*.86,.1,woodDark,x,h*.43,d/2-.06,.02);
          for(let y=.6;y<h*.85;y+=.9)box(ladder,w*.38,.09,.13,wood,w*.215,y,d/2-.06,.02);
        }
        break;
      }
      case "sofa":{
        legs(h*.18,.1);box(g,w,h*.28,d,cloth,0,h*.32,0,.14,3);
        box(g,w,h*.55,.24,cloth,0,h*.7,-d/2+.12,.12,3);
        for(const side of [-1,1])box(g,.24,h*.5,d,cloth,side*(w/2-.12),h*.56,0,.1,3);
        for(let i=0;i<2;i++)box(g,(w-.56)/2-.02,.18,d*.74,accent,(i-.5)*(w-.56)/2,h*.53,d*.07,.08,3);break;
      }
      case "lounge":{
        // A bean bag, slumped into its footprint.
        const geo=beanGeometry(),bb=geo.boundingBox,mesh=add(g,new T.Mesh(geo,cloth),0,0,0);
        const s=Math.min(w/2/bb.max.x,d/2/bb.max.z)*.98;mesh.scale.set(s,h/(bb.max.y-bb.min.y),s);mesh.position.y=-bb.min.y*mesh.scale.y;mesh.rotation.y=.4;break;
      }
      case "ottoman":{
        // A soft pouf with a seam round its middle.
        const r=Math.min(w,d)/2;oval(g,0,h/2,0,w/2*.98,h/2,d/2*.98,cloth);
        const ring=cyl(g,r*.99,r*.99,.035,accent,0,h/2,0,32);ring.scale.set(w/2/r,1,d/2/r);break;
      }
      case "radiator":
        for(let i=0;i<8;i++)box(g,w/10,h,d,mat("#e7e5e0",.4),(i-3.5)*w/8,h/2,0,.04);break;
      case "column":box(g,w,h,d,white,0,h/2,0,.02);break;
      case "microwave":
        box(g,w,h,d,white,0,h/2,0,.06);box(g,w*.72,h*.7,.02,ink,-w*.08,h*.53,d/2-.005);box(g,.04,h*.48,.05,metal,w*.33,h*.53,d/2-.02);break;
      case "desk":{
        // A top on legs, with a drawer cabinet on the right when there's room. Legs and cabinet stop just under the top so their faces never meet it.
        box(g,w,.14,d,wood,0,h-.07,0,.03).name="desk-top";
        const cab=w>2.2,cw=cab?Math.min(1.6,w*.38):0;
        for(const z of [-1,1])box(g,.12,h-.16,.12,wood,-w/2+.09,(h-.16)/2,z*(d/2-.09),.02).name="desk-leg";
        if(cab){box(g,cw,h-.16,d*.92,wood,w/2-cw/2-.02,(h-.16)/2,0,.03).name="desk-leg";
          for(const y of [.34,.66])box(g,cw*.9,.025,.02,woodDark,w/2-cw/2-.02,(h-.16)*y,d*.46+.005);
          for(const y of [.17,.5,.83])cyl(g,.045,.045,.08,metal,w/2-cw/2-.02,(h-.16)*y,d*.46+.03,12).rotation.x=Math.PI/2;}
        else for(const z of [-1,1])box(g,.12,h-.16,.12,wood,w/2-.09,(h-.16)/2,z*(d/2-.09),.02).name="desk-leg";
        box(g,w-(cab?cw:0)-.2,.6,.06,wood,-(cab?cw/2:0),h-.45,-d/2+.06,.02);
        break;
      }
      case "chair":{
        // A wooden chair with a slatted back (the back is on the -z side).
        const m=f.built_in?wood:finish,seat=Math.min(h*.5,1.6);
        box(g,w*.92,.12,d*.86,m,0,seat,d*.03,.05);
        legs(seat-.06,.1,m);
        for(const x of [-1,1])box(g,.1,h-seat+.1,.1,m,x*(w/2-.08),seat+(h-seat)/2,-d/2+.08,.02);
        const slats=3;for(let i=0;i<slats;i++)box(g,w*.78,.12,.07,m,0,seat+(h-seat)*(.35+i*.22),-d/2+.08,.02);
        break;
      }
      case "wardrobe":case "dresser":case "fridge":{
        const body=f.kind==="fridge"?white:wood;box(g,w,h,d,body,0,h/2,0,.05);
        if(f.kind==="wardrobe"){box(g,.02,h*.94,.02,woodDark,0,h/2,d/2+.003);for(const x of [-.07,.07])box(g,.04,.5,.06,metal,x,h*.55,d/2+.02,.015);}
        else{const n=f.kind==="dresser"?Math.max(2,Math.min(4,Math.round(h/.85))):2;
          for(let i=1;i<n;i++)box(g,w*.94,.025,.02,f.kind==="fridge"?mat("#d8dadd"):woodDark,0,h*i/n,d/2+.003);
          for(let i=0;i<n;i++){const y=h*(i+.5)/n;
            if(f.kind==="fridge")box(g,.05,h/n*.55,.06,metal,w*.38,y,d/2+.02,.02);
            else for(const x of w>2.2?[-w*.25,w*.25]:[0])cyl(g,.05,.05,.1,metal,x,y,d/2+.04,12).rotation.x=Math.PI/2;}}
        break;
      }
      case "shelf":{
        // A bookcase of real boards: sides, a back and evenly spaced shelves. No books unless they're in the list.
        const m=f.built_in?wood:finish,t=.08;
        for(const x of [-1,1])box(g,t,h,d,m,x*(w/2-t/2),h/2,0,.02);
        box(g,w-.02,h,.04,m,0,h/2,-d/2+.02,.01);
        const n=Math.max(2,Math.round(h/1.15));for(let i=0;i<=n;i++)box(g,w-t*2,t,d*.96,m,0,i===0?t/2+.06:Math.min(h-t/2,i*h/n),0,.015);
        break;
      }
      case "rug":{
        // A soft rug with a woven border.
        const base=vibe&&!f.material_color?theme.rug.base:color,edge=vibe&&!f.material_color?theme.rug.line:mix(color,"#ffffff",.35);
        box(g,w,h,d,mat(base,1,true),0,h/2+.012,0,.012).castShadow=false;
        const band=box(g,w*.9,h+.006,d*.9,mat(edge,1,true),0,h/2+.015,0,.01);band.castShadow=false;
        const woven=f.product?.seasonal&&["stripe","check"].includes(f.product.pattern);
        const inner=box(g,w*.86,h+.012,d*.86,woven?rugPrint(f.product,base,vibe&&!f.material_color?theme.rug.line:"#1c1622",w*.86,d*.86):mat(base,1,true),0,h/2+.018,0,.01);inner.castShadow=false;
        break;
      }
      case "lamp":{
        cyl(g,Math.min(w,d)*.32,Math.min(w,d)*.36,.07,metal,0,.04,0);
        if(variant==="lava"||variant==="salt"){
          cyl(g,w*.24,w*.35,h*.2,metal,0,h*.1,0);oval(g,0,h*.53,0,w*.3,h*.35,d*.3,glow);cyl(g,w*.08,w*.25,h*.15,metal,0,h*.92,0);
        }else if(variant==="mushroom"){
          cyl(g,w*.15,w*.22,h*.6,finish,0,h*.3,0);oval(g,0,h*.77,0,w*.48,h*.23,d*.48,finish);cyl(g,w*.42,w*.42,.02,glow,0,h*.68,0);
        }else if(variant==="task"||variant==="bar"){
          const arm=box(g,.06,h*.68,.07,finish,0,h*.36,-d*.2);arm.rotation.z=-.13;
          box(g,w*.9,.07,d*.65,finish,0,h*.8,0);box(g,w*.82,.025,d*.56,glow,0,h*.755,0);
        }else if(variant==="banker"){
          cyl(g,.04,.04,h*.72,mat("#b29654",.25),0,h*.36,0);box(g,w*.94,h*.25,d*.75,mat("#396c50",.3),0,h*.85,0,.15);box(g,w*.8,.025,d*.6,glow,0,h*.71,0);
        }else if(variant==="projector"){
          cyl(g,.035,.035,h*.6,finish,0,h*.3,0);oval(g,0,h*.78,0,w*.4,h*.22,d*.4,finish);oval(g,0,h*.8,d*.34,w*.27,h*.15,.025,glow);
        }else{
          // A stem and a fabric shade, lit from inside.
          const r=Math.min(w,d);cyl(g,.035,.035,h*.62,finish,0,h*.33,0);
          if(!geometries.has("shade"))geometries.set("shade",new T.CylinderGeometry(.5,1,1,28,1,true));
          const shadeMat=mat(vibe?mix(theme.textile,"#ffffff",.3):"#f6efe2",.9,true);shadeMat.side=T.DoubleSide;
          const shade=add(g,new T.Mesh(geometries.get("shade"),shadeMat),0,h*.8,0);shade.scale.set(r*.42,h*.36,r*.42);
          cyl(g,r*.2,r*.2,.03,glow,0,h*.66,0);oval(g,0,h*.7,0,r*.12,r*.12,r*.12,glow);
        }break;
      }
      case "plant":{
        // A pot, its soil and a leafy cluster, all inside the footprint.
        const r=Math.min(w,d)/2,potH=Math.min(h*.36,1.05);
        if(variant==="disco")oval(g,0,h*.2,0,w*.35,h*.2,d*.35,metal);
        else{cyl(g,r*.55,r*.42,potH,terracotta,0,potH/2,0);cyl(g,r*.5,r*.5,.04,soil,0,potH-.01,0);}
        leaves(g,r*.92,potH,h,Math.max(18,Math.min(60,Math.round(r*r*60))));break;
      }
      case "mirror":
        if(variant==="round"){oval(g,0,h/2,0,w/2,h/2,d/2,finish);oval(g,0,h/2,d/2,w*.46,h*.46,.02,mat("#bdcdd2",.1));}
        else if(variant==="arch"){
          box(g,w,h-w/2,d,finish,0,(h-w/2)/2,0);oval(g,0,h-w/2,0,w/2,w/2,d/2,finish);
          box(g,w*.91,h-w/2-.08,.025,mat("#bdcdd2",.1),0,(h-w/2)/2,d/2+.016);oval(g,0,h-w/2,d/2+.018,w*.455,w*.455,.018,mat("#bdcdd2",.1));
        }else{box(g,w,h,Math.max(.06,d),finish,0,h/2,0);box(g,w*.9,h*.92,.025,mat("#bdcdd2",.1),0,h/2,d/2+.015);}break;
      case "art":
        if(variant==="bats"){
          // A cluster of flat bats stuck straight onto the wall, across the layout area; lit sets get small spotlights.
          let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647,bat=mat("#1c1622",.7);
          const n=Math.max(5,Math.min(14,Math.round(w*h*1.6)));
          for(let i=0;i<n;i++){const size=.22+rnd()*.42,x=(rnd()-.5)*(w-size),y=size*.25+rnd()*(h-size*.5);
            const m=add(g,new T.Mesh(batGeometry(),bat),x,y,-d/2+.012);m.scale.set(size,size,1);m.rotation.z=(rnd()-.5)*.5;m.castShadow=false;}
          if(f.product?.lit)for(let i=0;i<3;i++)oval(g,(i-1)*w*.32,.04,-d/2+.05,.06,.04,.04,glowMat("#fff1d6"));
          break;
        }
        box(g,w,h,Math.max(d,.04),wood,0,h/2,0);box(g,w*.9,h*.9,.025,white,0,h/2,d/2+.02);
        box(g,w*.88,h*.88,.012,productPrint(f.product,cloth),0,h/2,d/2+.04);break;
      case "wall-shelf":
        for(let i=0;i<3;i++){box(g,w*(.72+i*.1),.09,Math.max(.55,d),finish,0,h*(i+.3)/3,0);box(g,w*.75,.15,.06,finish,0,h*(i+.3)/3-.12,-.2);}break;
      case "macrame":
        box(g,w,.055,.06,wood,0,h,0);for(let i=0;i<20;i++){const x=(i/19-.5)*w,length=h*(.6+.35*(1-Math.abs(x)/(w/2)));cyl(g,.018,.018,length,cloth,x,h-length/2,0,8);}break;
      case "curtains":{
        // Two gathered panels with real folds, on a rod.
        cyl(g,.03,.03,w,metal,0,h-.03,0,10).rotation.z=Math.PI/2;
        const pw=w*.34,curtain=mat(f.material_color||(vibe?theme.textile:color),.95,true);curtain.side=T.DoubleSide;
        for(const side of [-1,1])add(g,new T.Mesh(foldGeometry(pw,h-.08),curtain),side*(w/2-pw/2),(h-.08)/2,0);
        break;
      }
      case "lights":{
        if(variant==="neon"){box(g,w,.025,.03,ink,0,h/2,0);box(g,w,h,.025,productPrint(f.product,glow),0,h/2,.025);}
        else if(variant==="strip")box(g,w,.04,.035,glow,0,h/2,0,.015);
        else{
          // Warm bulbs hanging on a sagging wire.
          const n=Math.max(4,Math.round(w/.55)),sag=Math.min(.2,w*.02);
          if(!geometries.has("bulb"))geometries.set("bulb",new T.SphereGeometry(.06,10,8));
          // A coloured string (orange and purple, say) cycles its bulbs through the product's colours.
          const colors=f.product?.bulbs?.length?f.product.bulbs:[null],dummy=new T.Object3D(),pts=[];
          const bulbs=colors.map((c,k)=>new T.InstancedMesh(geometries.get("bulb"),c?glowMat(c):glow,Math.ceil((n+1-k)/colors.length)));
          for(let i=0;i<=n;i++){const x=-w/2+w*i/n,y=h/2-Math.sin(i/n*Math.PI*3)**2*sag;pts.push(new T.Vector3(x,y+.05,0));dummy.position.set(x,y-.04,0);dummy.updateMatrix();bulbs[i%colors.length].setMatrixAt(Math.floor(i/colors.length),dummy.matrix);}
          const wireKey=["wire",w,h].join("|");if(!geometries.has(wireKey))geometries.set(wireKey,new T.TubeGeometry(new T.CatmullRomCurve3(pts),n*4,.012,4));
          g.add(new T.Mesh(geometries.get(wireKey),mat(colors[0]?"#1c1622":"#5c5246",.6)),...bulbs);
          if(variant==="curtain")for(let i=0;i<=n;i++){const x=-w/2+w*i/n;box(g,.012,3.6,.012,ink,x,h/2-1.8,0,.004);for(let y=.25;y<3.6;y+=.5)oval(g,x,h/2-y,0,.032,.045,.032,glow);}
        }break;
      }
      case "blanket":
        if(f.onBed){
          // Folded across the foot of the bed it rests on, over the duvet and down both sides, its fold toward the head.
          const bw=f.onBed.w*.98+.1,fd=Math.max(.8,Math.min(1.3,Math.min(w,d)*.5)),t=.09;
          add(g,new T.Mesh(drapeGeometry(bw,fd,t,.36,0,.01),cloth),0,t/2+.03,0);
          box(g,bw,t*1.8,.17,cloth,0,t*.9+.03,-fd/2+.07,.08,3);
          g.userData.restZ=f.onBed.d/2-fd/2-.3;break;
        }
        box(g,w,h*.65,d,cloth,0,h*.4,0,.05);box(g,w*.98,h*.25,d*.3,cloth,0,h*.85,-d*.3,.025);
        for(let i=0;i<12;i++)box(g,.02,.025,d*.13,cloth,(i/11-.5)*w,.04,d*.43,.008);break;
      case "desk-mat":box(g,w,.02,d,cloth,0,.015,0,.01);break;
      case "riser":
        for(const x of [-1,1])box(g,.06,h-.06,d*.9,finish,x*(w/2-.07),(h-.06)/2,0);box(g,w,.06,d,finish,0,h-.03,0);break;
      case "organizer":case "caddy":
        box(g,w,.04,d,finish,0,.02,0);for(const x of [-1,1])box(g,.04,h,d,finish,x*w*.48,h/2,0);
        for(const z of [-1,1])box(g,w,h,.04,finish,0,h/2,z*d*.48);box(g,.035,h,d,finish,0,h/2,0);break;
      case "basket":case "hamper":case "trash":{
        const shell=variant==="woven"?cloth:finish;
        box(g,w,.06,d,shell,0,.03,0);for(const x of [-1,1])box(g,.055,h,d,shell,x*(w/2-.03),h/2,0,.025);
        for(const z of [-1,1])box(g,w,h,.055,shell,0,h/2,z*(d/2-.03),.025);
        box(g,w*.88,.03,d*.88,mat("#4e4b47"),0,h*.3,0);
        if(f.kind==="hamper"||f.kind==="basket")for(const x of [-1,1])box(g,.065,.09,d*.35,ink,x*(w/2-.04),h*.88,0);
        if(f.kind==="trash"){box(g,w*.98,.06,d*.97,shell,0,h,0);box(g,w*.28,.055,.13,metal,0,.05,d/2-.07);}break;
      }
      case "power-strip":
        box(g,w,h,d,finish,0,h/2,0);for(let i=0;i<4;i++)for(const z of [-1,1])box(g,.035,.012,.05,ink,(i/3-.5)*w*.72,h+.01,z*d*.15);break;
      case "towels":case "books":
        for(let i=0;i<3;i++)box(g,w*(1-i*.04),h*.29,d, f.kind==="books"?mat([color,"#e6d5b7","#626c79"][i]):cloth,0,h*(i+.5)/3,0,.025);break;
      case "candle":
        // A multi-pack sits as a small cluster (count 1 is the single candle it always was).
        cluster(f,w,d,(x,z,cw)=>{cyl(g,cw*.45,cw*.45,h,finish,x,h/2,z);oval(g,x,h+.05,z,.025,.07,.025,glow);});break;
      case "pumpkin":{
        // A ribbed pumpkin: eight lobes round a core and a stem. Lit ones glow through a carved face; glass ones are glossy.
        const glass=variant==="glass",skin=glass?mat(f.material_color||"#d39a45",.25,false,.6):mat(f.material_color||"#e8782a",.7),stem=mat("#5d7a3a",.8),face=glowMat("#ffb066");
        cluster(f,w,d,(x,z,cw,cd)=>{const r=Math.min(cw,cd)/2,ph=f.product?.count>1?Math.min(h,r*1.8):h;
          for(let k=0;k<8;k++){const a=k*Math.PI/4;oval(g,x+Math.cos(a)*r*.5,ph*.47,z+Math.sin(a)*r*.5,r*.48,ph*.47,r*.42,skin).rotation.y=-a;}
          oval(g,x,ph*.48,z,r*.62,ph*.47,r*.62,skin);cyl(g,r*.08,r*.12,ph*.22,stem,x,ph*.98,z,8);
          if(f.product?.lit&&!glass){for(const sx of [-1,1])box(g,r*.22,ph*.13,.02,face,x+sx*r*.3,ph*.58,z+r*.97,.008);box(g,r*.64,ph*.11,.02,face,x,ph*.32,z+r*.98,.008);}});
        break;
      }
      case "lantern":{
        const r=Math.min(w,d)/2;
        if(variant==="lantern"){
          // A ghost lantern: a dark base and cap, a clear glass body with a glowing ghost inside, and a ring handle.
          if(!materials.has("lantern-glass"))materials.set("lantern-glass",shine(new T.MeshStandardMaterial({color:"#e9eef2",roughness:.1,metalness:.1,transparent:true,opacity:.3})));
          if(!geometries.has("ring"))geometries.set("ring",new T.TorusGeometry(1,.12,6,18));
          cyl(g,r*.95,r,h*.1,ink,0,h*.05,0,16);cyl(g,r*.78,r*.78,h*.6,materials.get("lantern-glass"),0,h*.4,0,16);
          oval(g,0,h*.36,0,r*.3,h*.16,r*.3,glowMat("#fff1d6"));cyl(g,r*.86,r*.62,h*.12,ink,0,h*.76,0,16);
          add(g,new T.Mesh(geometries.get("ring"),ink),0,h*.9,0).scale.setScalar(r*.32);
        }else{
          // A ghost night light: a soft sheet with a flared hem and two dark eyes, lit from inside.
          const body=glowMat("#fff6ea");oval(g,0,h*.58,0,w*.42,h*.42,d*.42,body);cyl(g,w*.42,w*.48,h*.36,body,0,h*.18,0,16);
          for(const sx of [-1,1])oval(g,sx*w*.13,h*.66,d*.4,w*.05,h*.07,.02,ink);
        }
        break;
      }
      case "disco":oval(g,0,h/2,0,w/2,h/2,d/2,metal);break;
      case "fan":
        box(g,w*.65,.12,d*.7,finish,0,.06,0);box(g,.06,h*.55,.06,finish,0,h*.3,0);oval(g,0,h*.7,0,w*.48,h*.3,.05,ink);
        for(let i=0;i<3;i++){const a=i*Math.PI*2/3;oval(g,Math.cos(a)*w*.18,h*.7+Math.sin(a)*h*.13,.05,w*.19,h*.07,.025,finish);}break;
      case "decor":oval(g,0,h/2,0,w*.4,h/2,d*.4,f.material_color?finish:accent);break;
      case "pillow":{
        // A pair of plump cushions in two colours, like the plan draws them.
        const s=Math.max(.85,Math.min(1.35,Math.max(w,d)*.62)),t=Math.max(.28,Math.min(.45,h||.4)),geo=pillowGeometry(s,t,s),one=f.material_color?cloth:accent,two=one===cloth?accent:cloth;
        if(f.onBed){
          // On a bed: standing at its head, leaning back on its pillow and facing the foot.
          for(const i of [0,1]){const c=add(g,new T.Mesh(geo,i?two:one),(i-.5)*s*.92,s*.44+t*.3,0);c.rotation.set(1.12,0,(i-.5)*-.05);}
          g.userData.restZ=-f.onBed.d/2+.22+Math.min(f.onBed.d*.16,1.5)*.75+s*.2;
        }else for(const i of [0,1]){
          // Elsewhere: lying flat, one overlapping the other along the longer side.
          const off=(i-.5)*s*.62,c=add(g,new T.Mesh(geo,i?two:one),w>=d?off:0,t/2+i*t*.35,w>=d?0:off);c.rotation.y=(i-.5)*.3;
        }
        break;
      }
      default:{
        // Storage: a body under its lid, both soft-edged.
        const lid=Math.min(.08,h*.2),body=Math.max(.008,h-lid-.015);
        const base=box(g,w,body,d,cloth,0,body/2,0,.09,3);base.name="storage-body";
        const cap=box(g,w*.99,lid,d*.99,accent,0,h-lid/2,0,.025);cap.name="storage-lid";
        box(g,w*.25,.08,.015,ink,0,h*.6,d/2-.005);
      }
    }
    g.traverse(o=>{o.userData.itemId=f.id;});g.userData.itemId=f.id;return g;
  }
  /**
   * Bake a built piece in place, once. Its plain meshes that share a material become one mesh (fewer draw calls), and
   * its clay surfaces get soft corner shading (CLAY_AO): toward the floor when `floor`, and where its parts meet (under a
   * frame, where a mattress meets the headboard). That last part is the slow one, so it's returned as a function to run
   * later (null if there is nothing to shade); it updates the baked geometry in place, once. Instanced, multi-material
   * and mirrored meshes stay as they are but still shade their neighbours. The baked geometry is the piece's own to dispose.
   */
  function bake(root,{floor=true}={}){
    root.updateMatrixWorld(true);
    const toRoot=new T.Matrix4().copy(root.matrixWorld).invert(),groups=new Map(),solids=[],own=new Map(),later=[],m=new T.Matrix4(),im=new T.Matrix4(),nm=new T.Matrix3(),v=new T.Vector3(),n=new T.Vector3();
    root.traverse(o=>{
      if(!o.isMesh)return;m.multiplyMatrices(toRoot,o.matrixWorld);
      // Glass, lit surfaces, open shells (a lamp shade) and soft goods (pillows, a duvet: far from their boxes) shade nothing.
      if(![o.material].flat().some(x=>x.transparent||x.emissive?.getHex())&&!o.geometry.parameters?.openEnded&&!o.geometry.userData.soft){
        if(o.isInstancedMesh)for(let i=0;i<o.count;i++){o.getMatrixAt(i,im);solids.push(solidOf(o.geometry,im.premultiply(m)));}
        else{const s=solidOf(o.geometry,m);solids.push(s);own.set(o,s);}
      }
      if(o.isInstancedMesh||Array.isArray(o.material)||!o.geometry.attributes.normal||m.determinant()<=0)return;
      if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(o);
    });
    for(const [material,parts] of groups){
      const twin=shaded(material);if(parts.length<2&&!twin)continue;
      const pos=[],nor=[],uv=[],owner=[],shades=[];let index=[],base=0;
      for(const o of parts){
        m.multiplyMatrices(toRoot,o.matrixWorld);nm.getNormalMatrix(m);
        const g=o.geometry,P=g.attributes.position,N=g.attributes.normal,U=g.attributes.uv,self=own.get(o)||solidOf(g,m);
        for(let i=0;i<P.count;i++){
          v.fromBufferAttribute(P,i).applyMatrix4(m);n.fromBufferAttribute(N,i).applyMatrix3(nm).normalize();
          pos.push(v.x,v.y,v.z);nor.push(n.x,n.y,n.z);uv.push(U?U.getX(i):0,U?U.getY(i):0);owner.push(self);
        }
        if(g.index)for(let i=0;i<g.index.count;i++)index.push(g.index.getX(i)+base);else for(let i=0;i<P.count;i++)index.push(base+i);
        base+=P.count;o.removeFromParent();
      }
      const g=new T.BufferGeometry(),write=()=>{
        g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setAttribute("normal",new T.Float32BufferAttribute(nor,3));g.setAttribute("uv",new T.Float32BufferAttribute(uv,2));
        if(twin)g.setAttribute("aAo",new T.Float32BufferAttribute(shades,2));
        g.setIndex(index);g.computeBoundingSphere();
      };
      if(twin){
        for(let i=0;i<owner.length;i++)shades.push(1,floor?1:0);
        later.push(()=>{
          // Only parts within reach of a vertex's own part can shade it.
          const reach=new Map(),ao=[],shade=i=>{
            if(ao[i]!==undefined)return ao[i];const self=owner[i];
            if(!reach.has(self))reach.set(self,solids.filter(s=>s!==self&&s.c.distanceToSquared(self.c)<(s.r+self.r+AO_REACH)**2));
            return ao[i]=occlusion(v.fromArray(pos,i*3),n.fromArray(nor,i*3),reach.get(self));
          };
          // A big flat face has vertices only at its edges, so a crease at one end would smear across it: edges split where the shading changes along them.
          index=refine(pos,nor,uv,owner,index,(a,b,d2)=>d2>AO_FINE**2&&Math.abs(shade(a)-shade(b))>AO_STEP);
          shades.length=0;for(let i=0;i<owner.length;i++)shades.push(shade(i),floor?1:0);
          g.dispose();write();
        });
      }
      write();
      const mesh=new T.Mesh(g,twin||material);mesh.userData={...parts[0].userData,ownGeometry:true};root.add(mesh);
    }
    let done=!later.length;
    return done?null:()=>{if(!done){done=true;for(const job of later)job();}};
  }
  /** Night makes every lit surface glow; day keeps them a soft warm white. */
  function setNight(on){if(night===on)return;night=on;for(const m of glows)m.emissiveIntensity=on?2.6:.55;}
  /** The room's reflection map and how strongly glass, mirrors and metal show it. */
  function setEnv(texture,intensity){env=texture;envI=intensity;for(const m of shiny){m.envMap=texture;m.envMapIntensity=intensity;}}
  function dispose(){disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());fabric.dispose();}
  return {build,box,mat,bake,setNight,setEnv,dispose};
}
