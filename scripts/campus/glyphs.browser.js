// Builds public/map/glyphs/Martian-Mono-Bold/*.pbf, the finder map's street-label font
// (components/hall-finder/map-style.ts). tiny-sdf needs a canvas, so this runs in a browser
// on any dormscape page (the site already loads Martian Mono): evaluate this function there,
// save what it returns as out.json, then write the files with
//   node -e 'const fs=require("fs"),{result}=JSON.parse(fs.readFileSync("out.json"));for(const[r,b]of Object.entries(result))fs.writeFileSync(`public/map/glyphs/Martian-Mono-Bold/${r}.pbf`,Buffer.from(b,"base64"))'
// Glyphs are 24 px with a 3 px buffer and radius 8 (MapLibre's PBF format); top uses
// MapLibre's own tiny-sdf offset (27.5). The class below is @mapbox/tiny-sdf 2.3.0, inlined.
async () => {
const INF = 1e20;

// lookup table for gamma-corrected, signed squared alpha distance values
const alphaTable = new Float64Array(256);
for (let i = 0; i < 256; i++) {
    const d = 0.5 - Math.pow(i / 255, 1 / 2.2);
    alphaTable[i] = d * Math.abs(d);
}
alphaTable[255] = -INF;

class TinySDF {
    constructor({
        fontSize = 24,
        buffer = 3,
        radius = 8,
        cutoff = 0.25,
        fontFamily = 'sans-serif',
        fontWeight = 'normal',
        fontStyle = 'normal',
        lang = null
    } = {}) {
        buffer = this.buffer = Math.round(buffer); // padding around a glyph's bounding box; integer to keep the grid pixel-aligned
        this.radius = radius; // how many pixels around the glyph edge are encoded as signed distances
        this.cutoff = cutoff; // how much of the SDF byte range represents inside vs outside the edge
        this.lang = lang; // language of the Canvas drawing context

        // make the canvas size big enough to both have the specified buffer around the glyph
        // for "halo", and account for some glyphs possibly being larger than their font size
        const size = this.size = Math.ceil(fontSize) + buffer * 4;

        const canvas = this._createCanvas(size);
        const ctx = this.ctx = canvas.getContext('2d', {willReadFrequently: true});
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left'; // Necessary so that RTL text doesn't have different alignment
        ctx.fillStyle = 'black';
        if (lang) ctx.lang = lang;

        // the glyph is rasterized at (buffer, buffer), so the canvas clips it to this
        const maxGlyphDim = this.maxGlyphDim = size - buffer;
        const gridDim = maxGlyphDim + 2 * buffer;

        // two grids of squared distances: one for the outside of the glyph shape, one for the inside;
        // the signed distance is derived as sqrt(outer) - sqrt(inner)
        this.gridOuter = new Float64Array(gridDim * gridDim);
        this.gridInner = new Float64Array(gridDim * gridDim);
        this.f = new Float64Array(gridDim);
        this.z = new Float64Array(gridDim + 1);
        this.v = new Uint16Array(gridDim);
    }

    _createCanvas(size) {
        if (typeof OffscreenCanvas !== 'undefined') {
            return new OffscreenCanvas(size, size);
        }
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        return canvas;
    }

    draw(char) {
        const {
            width: glyphAdvance,
            actualBoundingBoxAscent,
            actualBoundingBoxDescent,
            actualBoundingBoxLeft,
            actualBoundingBoxRight
        } = this.ctx.measureText(char);

        // The integer/pixel part of the alignment is encoded in metrics.glyphTop/glyphLeft
        // The remainder is implicitly encoded in the rasterization
        const glyphTop = Math.ceil(actualBoundingBoxAscent);
        // actualBoundingBoxLeft is positive when ink extends LEFT of the origin (per spec),
        // so negate to get the ink's left edge in canvas x-coords (positive = right of origin)
        const glyphLeft = Math.floor(-actualBoundingBoxLeft);

        // If the glyph overflows the canvas size, it will be clipped at the bottom/right
        const glyphWidth = Math.max(0, Math.min(this.maxGlyphDim, Math.ceil(actualBoundingBoxRight) - glyphLeft));
        const glyphHeight = Math.max(0, Math.min(this.maxGlyphDim, glyphTop + Math.ceil(actualBoundingBoxDescent)));

        const width = glyphWidth + 2 * this.buffer;
        const height = glyphHeight + 2 * this.buffer;

        const len = width * height;
        const data = new Uint8ClampedArray(len);
        const glyph = {data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance};
        if (glyphWidth === 0 || glyphHeight === 0) return glyph;

        const {ctx, buffer, gridInner, gridOuter} = this;
        ctx.clearRect(buffer, buffer, glyphWidth, glyphHeight);
        ctx.fillText(char, buffer - glyphLeft, buffer + glyphTop);
        const imgData = ctx.getImageData(buffer, buffer, glyphWidth, glyphHeight);

        // default: outside the glyph (INF distance) for outer, inside (0 distance) for inner
        gridOuter.fill(INF, 0, len);
        gridInner.fill(0, 0, len);

        // for anti-aliased pixels, treat partial coverage as a distance approximation:
        // a fully covered pixel gets 0 outer / INF inner; a partial pixel gets a small
        // non-zero outer or inner distance based on how far its coverage deviates from 0.5
        let imgIdx = 3; // start at the alpha channel of the first pixel
        for (let y = 0; y < glyphHeight; y++) {
            let j = (y + buffer) * width + buffer;
            for (let x = 0; x < glyphWidth; x++, imgIdx += 4, j++) {
                const a = imgData.data[imgIdx]; // alpha value
                if (a === 0) continue; // empty pixels
                const t = alphaTable[a];
                gridOuter[j] = Math.max(0, t);
                gridInner[j] = Math.max(0, -t);
            }
        }

        // columns left and right of the glyph have no seeds and stay INF in the column pass, so skip them
        edt(gridOuter, 0, 0, width, height, width, this.f, this.v, this.z, buffer);
        // Pad the inner EDT region by 1 px so ink pixels touching the bbox edge can see the
        // outside-ink seeds in the buffer region; clamp to buffer so we don't underflow when buffer=0
        const pad = Math.min(buffer, 1);
        edt(gridInner, buffer - pad, buffer - pad, glyphWidth + 2 * pad, glyphHeight + 2 * pad, width, this.f, this.v, this.z);

        // encode signed distance as a byte: inside the glyph maps to high values, outside to low,
        // with the edge gradient spanning [-radius * cutoff, radius * (1 - cutoff)] pixels around the edge;
        // Uint8ClampedArray rounds and clamps beyond that
        const scale = 255 / this.radius;
        const base = 255 * (1 - this.cutoff);
        for (let i = 0; i < len; i++) {
            const d = Math.sqrt(gridOuter[i]) - Math.sqrt(gridInner[i]);
            data[i] = base - scale * d;
        }

        return glyph;
    }
}

// 2D Euclidean squared distance transform by Felzenszwalb & Huttenlocher https://cs.brown.edu/~pff/papers/dt-final.pdf
function edt(data, x0, y0, width, height, gridSize, f, v, z, skipCols = 0) {
    for (let x = x0 + skipCols; x < x0 + width - skipCols; x++) edt1d(data, y0 * gridSize + x, gridSize, height, f, v, z);
    for (let y = y0; y < y0 + height; y++) edt1d(data, y * gridSize + x0, 1, width, f, v, z);
}

// 1D squared distance transform
function edt1d(grid, offset, stride, length, f, v, z) {
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    f[0] = grid[offset];

    for (let q = 1, k = 0; q < length; q++) {
        const fq = f[q] = grid[offset + q * stride];
        const q2 = q * q;
        let s;
        do {
            const r = v[k];
            s = (fq - f[r] + q2 - r * r) / (q - r) / 2;
        } while (s <= z[k] && --k > -1);

        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = INF;
    }

    for (let q = 0, k = 0; q < length; q++) {
        while (z[k + 1] < q) k++;
        const r = v[k];
        const qr = q - r;
        grid[offset + q * stride] = f[r] + qr * qr;
    }
}
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-martian').trim();
  await document.fonts.load(`700 24px ${family}`);
  const sdf = new TinySDF({ fontSize: 24, buffer: 3, radius: 8, cutoff: 0.25, fontFamily: family, fontWeight: '700' });
  const NAME = 'Martian-Mono-Bold';
  const RANGES = [0, 256, 8192]; // Latin-1, Latin Extended-A, punctuation
  // Minimal protobuf writer (glyphs.proto: glyphs{1:fontstack}, fontstack{1:name,2:range,3:glyph}, glyph{1:id,2:bitmap,3..7}).
  const varint = (out, v) => { while (v > 127) { out.push((v & 127) | 128); v = Math.floor(v / 128); } out.push(v); };
  const tag = (out, f, w) => varint(out, (f << 3) | w);
  const zz = (v) => (v << 1) ^ (v >> 31);
  const bytes = (out, f, arr) => { tag(out, f, 2); varint(out, arr.length); for (const b of arr) out.push(b); };
  const str = (s) => Array.from(new TextEncoder().encode(s));
  const result = {};
  for (const start of RANGES) {
    const stack = [];
    bytes(stack, 1, str(NAME));
    bytes(stack, 2, str(`${start}-${start + 255}`));
    for (let id = start; id < start + 256; id++) {
      if (id < 32 || (id >= 127 && id < 160)) continue;
      const ch = String.fromCodePoint(id);
      const g = sdf.draw(ch);
      const glyph = [];
      tag(glyph, 1, 0); varint(glyph, id);
      if (g.glyphWidth > 0 && g.glyphHeight > 0) bytes(glyph, 2, Array.from(g.data));
      tag(glyph, 3, 0); varint(glyph, g.glyphWidth);
      tag(glyph, 4, 0); varint(glyph, g.glyphHeight);
      tag(glyph, 5, 0); varint(glyph, zz(g.glyphLeft) >>> 0);
      tag(glyph, 6, 0); varint(glyph, zz(Math.round(g.glyphTop - 27.5)) >>> 0);
      tag(glyph, 7, 0); varint(glyph, Math.round(g.glyphAdvance));
      bytes(stack, 3, glyph);
    }
    const top = [];
    bytes(top, 1, stack);
    let bin = ''; for (const b of top) bin += String.fromCharCode(b);
    result[`${start}-${start + 255}`] = btoa(bin);
  }
  return { family, result };
}
