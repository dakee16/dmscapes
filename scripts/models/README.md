# Studio model library

Realistic models for the 3D studio live in `public/experience/models/`. Each kind has two files:

| File | Triangles | Textures | Used on |
|---|---|---|---|
| `<kind>.glb` | about 20k | 1024 px, with normal map | desktop |
| `<kind>-lite.glb` | about 8–13k | 512 px, no normal map | phones and low-power devices (the scene's `LOW` check) |

`LIBRARY` in `public/experience/studio-models.js` lists the models by file name, and `libraryKey()` picks one for a piece.
- **Who uses them:** pieces the student brings or buys always do. A dorm's own furniture uses them where the entry says `dorm` (desk, dresser, wardrobe, fridge, microwave, sofa, and the wooden `chair-dorm`).
- **Fallback:** until a model loads, or if it fails, the clay model stands in.
- **Lamps** go by style (`lamp-shade`, `-task`, `-mushroom`, `-lava`, `-salt`, `-banker`). Projector and light-bar lamps stay clay.
- **Fit:** models are fitted inside the piece's box: scaled evenly, then stretched at most 25% toward each side. `host` models (things stand on them) fill the box exactly.
- **Glow:** `glow` models light up at night.
- **Built in code on purpose:** beds and bunks (their frame heights change with loft and bunk settings) and the candle (generation kept failing, and a cylinder is what the clay draws anyway). Also everything that takes vibe colours, patterns or a product photo: bedding, rugs, curtains, throws, pillows, wall art and string lights. Those get the fabric and wood detail textures instead.

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
