# Studio model library

Realistic models for the 3D studio live in `public/experience/models/`. Each kind has two files:

| File | Triangles | Textures | Used on |
|---|---|---|---|
| `<kind>.glb` | about 20k | 1024 px, with normal map | desktop |
| `<kind>-lite.glb` | about 8–13k | 512 px, no normal map | phones and low-power devices (the scene's `LOW` check) |

`LIBRARY` in `public/experience/studio-models.js` lists the models by file name, and `libraryKey()` picks one for a piece.
- **Who uses them:** pieces the student brings or buys always do. A dorm's own furniture uses them where the entry says `dorm` (fridge, microwave, sofa, and the wooden `chair-dorm`).
- **Fallback:** until a model loads, or if it fails, the clay model stands in.
- **Lamps** go by style (`lamp-shade`, `-task`, `-mushroom`, `-lava`, `-salt`, `-banker`). Projector and light-bar lamps stay clay.
- **Fit:** models are fitted inside the piece's box: scaled evenly, then stretched at most 25% toward each side. `host` models (things stand on them) fill the box exactly.
- **Glow:** `glow` models light up at night.
- **Bed frames** are built in code (`build` in `studio-models.js`), not from models: a clean solid-wood frame whose rails sit below each mattress, so the duvet, sheets and pillows never pass through it. The generated bed frames were dropped (their headboards looked worn, and stretching them to each bed made them clip the bedding).
- **Casework is built in code too:** desks, dressers and wardrobes are solid-wood boxes with inset drawer fronts and bar pulls. The generated ones baked dark diagonal streaks into their drawer fronts (their fronts weren't flat), and boxy furniture looks crisper drawn exactly.
- **Mirrors** show the room: once the room is still, the scene renders one cube view of it from its middle (`renderMirrors` in `studio-scene.js`), and mirror glass box-projects it onto the room's bounds, so each mirror shows the room from where it hangs. It re-renders after any change.
- **Curtains** are pleated panels on rings from a slim rod on short brackets, far enough off the wall to clear a window's casing and sill, hanging from just above the window (`itemElevation` in `lib/studio.ts`).
- **Doors** are solid-core veneer leaves with three hinges, lever handles, kick plates and a peephole.
- **Built in code on purpose:** the candle (generation kept failing, and a cylinder is what the clay draws anyway), and everything that takes vibe colours, patterns or a product photo: bedding, rugs, curtains, throws, pillows, wall art and string lights. Those get the fabric and wood detail textures, and a sheen on fabric on desktop.
- **Windows:** built in code because every window is a different size. They are double-hung sashes, casing, sill and reflective glass. The view behind them is `textures/view-day|evening|night.webp`, drawn only where the panes are (the panes mark the stencil), so it never shows past the wall. A door or window hides with its wall in the cutaway, unless openings are being edited.

## Surfaces

`public/experience/textures` holds the floor photos (oak, walnut, tile, carpet), the wall plaster, and the wood-grain and fabric-weave detail maps, each with a `-n` normal map.
- The source images came from Higgsfield (`gpt_image_2_6`, "seamless tileable texture …", 0.25 credits each).
- `python3 scripts/models/textures.py <srcdir> <outdir>` blends seams, turns wall, wood and fabric into neutral detail maps (multiplied by the material's colour), and writes the normal maps.

## Baked floor shadows

`studio-scene.js`, "baked floor shadows":
- Once the room is still, the pieces' shadows are accumulated into a floor map from 64 light directions (24 on phones), 8 per frame (6 on phones).
- Half the directions are spread over the sky above 45°; half come from around the first window.
- The floor multiplies its light by the result. No shadow maps run in the normal frame.
- An edit or a drag fades it out (each piece's footprint shadow stays) until the next bake.

## Make or replace a model

1. **Generate** with text-to-3D (Higgsfield MCP, model `hunyuan3d_v3_1_text_to_3d`, `mode: "pro"`, `enable_pbr: true`, 16 credits).
   - Prompts start with "a single …" and end with "no text, no logos, no labels, isolated object". Without that, models come out with fake brand lettering.
   - Use text prompts, not Amazon product photos: the Associates license bars using its product content with ML models.
2. **Clean** with `python3 scripts/models/pipeline.py <kind> raw.glb out/ [--rotate DEG]`.
   - Needs `pip install bpy` (Blender as a Python module) and Node (for `npx @gltf-transform/cli@4`).
   - It writes both files plus `<kind>.png`, a front preview. The front must face the camera; if it doesn't, rerun with `--rotate`.
   - Steps: `gltf-transform simplify`, then `prep.py` in Blender, then `gltf-transform optimize --compress meshopt --texture-compress webp`.
   - `prep.py` sets the origin at the bottom centre, bakes AO into the base colour, and turns metalness off.
   - Simplify with gltf-transform, not Blender's Decimate: Decimate breaks UV seams and leaves dark blotches on the texture.
3. **Copy** both files into `public/experience/models/`.
4. **Add the kind** to `LIBRARY`.
   - For a light, neutral model a product's colour should tint, set `tint` to 1 ÷ the median linear luminance of its base-colour texture. The current values are 2.8–5.
5. **Route titles to it** in `lib/product-model.ts` (`TEXT_KINDS`, and `PASTED_SIZE` for its usual size when a listing has none).

## First nine models (Nov 15, 2026)

| Kind | Prompt (abridged) | Desktop / lite |
|---|---|---|
| fridge | compact dorm mini fridge, matte white, slim vertical handle | 258 / 102 KB |
| microwave | compact countertop microwave, matte white, dark glass door | 337 / 143 KB |
| chair | office desk chair, grey fabric seat, mesh back, five-star base | 337 / 200 KB |
| monitor | 24 inch monitor, black bezels, slim stand | 216 / 91 KB |
| speaker | compact bluetooth speaker, dark grey fabric | 478 / 138 KB |
| lounge | large bean bag chair, light grey fabric | 289 / 115 KB |
| ottoman | round knit pouf, light grey | 553 / 138 KB |
| shelf | tall narrow oak bookshelf with a few books and a plant | 311 / 136 KB |
| plant | potted monstera in a white ceramic pot | 367 / 198 KB |

Added Nov 15, 2026 (same pipeline):
- dorm desk, dresser, wardrobe and wooden chair
- loveseat sofa
- six lamps: drum shade, architect, mushroom, lava, salt, banker's
- clip fan, desk organizer, monitor riser, woven basket, lidded storage box
- towel stack, shower caddy, step trash can, laundry hamper, book stack

That makes 30 models in all. Each is about 90–550 KB on desktop and roughly half that in its lite version.

## KTX2 textures (desktop)

Desktop models and room textures are KTX2 (Basis Universal), so they stay compressed in video memory: about a quarter of
what decoded WebP takes, and no decode on the main thread. Phones keep the 512 px WebP `-lite` models and the `.webp`
room textures, and never fetch the transcoder (`vendor/basis/`, 527 KB of WebAssembly).

- Encode: `npm i --no-save ktx2-encoder@0.6 sharp @gltf-transform/core@4 @gltf-transform/extensions@4 meshoptimizer`,
  then `node scripts/models/ktx2.mjs` (all) or `node scripts/models/ktx2.mjs chair.glb` (some). Run it after
  `pipeline.py` makes a new desktop model; already-KTX2 files are skipped.
- Settings: ETC1S everywhere (colour at quality 150, normals in Basis's normal-map mode, metal/roughness at 512 px), mips
  in the file. These textures are smooth, so WebP compresses them very hard and KTX2 can't match it on the wire: desktop
  models went from 8.9 MB to 11.5 MB (+29%) for roughly 4x less video memory.
- Room textures: each `.webp` gets a `.ktx2` beside it, flipped to match how TextureLoader flips the `.webp`.
- Loading: `loadTexture` in `studio-models.js` fills one texture object in place, with the KTX2's mip levels or, if
  KTX2 can't load, the WebP. A desktop model whose KTX2 can't load stays clay.
