"""Measure a bed frame's platforms: their heights as fractions of the model's height (LIBRARY decks).

  python3 -I scripts/models/decks.py public/experience/models/bed-bunk.glb

Casts rays straight down over the middle of the footprint (away from the headboard, rails and ladder) and records every
upward-facing surface each ray passes through, top to bottom; the platforms are the heights where most rays stop.
"""
import sys
import bpy
import numpy as np
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sys.argv[1])
objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
dg = bpy.context.evaluated_depsgraph_get()
lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
for o in objs:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
H = hi.z - lo.z
hits = []
for fx in np.linspace(-.3, .3, 9):
    for fy in np.linspace(-.3, .3, 13):
        x = (lo.x + hi.x) / 2 + fx * (hi.x - lo.x); y = (lo.y + hi.y) / 2 + fy * (hi.y - lo.y)
        z = hi.z + 1
        while True:
            ok, loc, n, *_ = bpy.context.scene.ray_cast(dg, Vector((x, y, z)), Vector((0, 0, -1)))
            if not ok: break
            if n.z > .7: hits.append((loc.z - lo.z) / H)
            z = loc.z - 1e-3
# Platforms: clusters of hit heights (2% bins) that most rays reach.
hist, edges = np.histogram(hits, bins=50, range=(0, 1))
rays = 9 * 13
peaks = [((edges[i] + edges[i + 1]) / 2, hist[i]) for i in range(50) if hist[i] > rays * .25 and (i == 0 or hist[i] >= hist[i - 1]) and (i == 49 or hist[i] >= hist[i + 1])]
# A platform shows twice (slat tops, and the rails under them through the gaps): keep the higher of peaks within 8%.
decks = []
for p, _ in sorted(peaks):
    if p <= .05: continue
    if decks and p - decks[-1] < .08: decks[-1] = p
    else: decks.append(p)
print("height_m", round(H, 3), "decks", [round(float(p), 3) for p in decks])
