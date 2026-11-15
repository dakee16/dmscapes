# Studio model library

Realistic models for the 3D studio live in `public/experience/models/`. Each kind has two files:

| File | Triangles | Textures | Used on |
|---|---|---|---|
| `<kind>.glb` | about 20k | 1024 px, with normal map | desktop |
| `<kind>-lite.glb` | about 8–13k | 512 px, no normal map | phones and low-power devices (the scene's `LOW` check) |

`LIBRARY` in `public/experience/studio-models.js` lists the kinds. A kind there uses its model for pieces the student brings or buys. A dorm's own furniture keeps the clay look. Until a model loads, or if it fails, the clay model stands in. Models are fitted inside the piece's box: scaled evenly, then stretched at most 25% toward each side.

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

## Current models (Nov 15, 2026)

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
