"""Source textures -> web textures for the studio (public/experience/textures).

  python3 textures.py <srcdir> <outdir>

- seam-blends the stochastic ones (carpet, plaster, maple, linen): a cosine-weighted mix with the image offset by half,
  so the wrap edges meet exactly
- floors keep their colour; wall, wood and fabric become neutral *detail* maps (luminance only, scaled so the linear
  mean is about 0.85), multiplied by the material's own colour in the studio, so wall paint, vibe textiles and wood tones
  keep working
- a normal map from each one's high-passed luminance, with a strength per surface
- WebP, 1024 px (normal maps 512 px: they're soft anyway)
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
# name: (source, kind, seam blend, normal strength)
SPEC = {
    "floor-oak": ("oak", "color", False, 2.0),
    "floor-walnut": ("walnut", "color", False, 2.0),
    "floor-tile": ("tile", "color", False, 3.0),
    "floor-carpet": ("carpet", "color", True, 4.0),
    "wall-plaster": ("plaster", "detail", True, 2.5),
    "wood-detail": ("maple", "detail", True, 1.5),
    "fabric-detail": ("linen", "detail", True, 5.0),
}

def seamless(a):
    n = a.shape[0]
    w = np.sin(np.linspace(0, np.pi, n)) ** 2          # 1 in the middle, 0 at the edges
    W = np.minimum.outer(w, w)[..., None] if a.ndim == 3 else np.minimum.outer(w, w)
    shifted = np.roll(np.roll(a, n // 2, 0), n // 2, 1)
    return a * W + shifted * (1 - W)

for name, (srcname, kind, blend, strength) in SPEC.items():
    a = np.asarray(Image.open(os.path.join(src, f"raw_{srcname}.png")).convert("RGB").resize((1024, 1024), Image.LANCZOS)).astype(np.float64) / 255
    if blend: a = seamless(a)
    lin = a ** 2.2
    lum = lin @ [0.2126, 0.7152, 0.0722]
    if kind == "detail":
        d = (lum / lum.mean() * 0.85).clip(0, 1) ** (1 / 2.2)
        img = np.repeat(d[..., None], 3, 2)
    else:
        img = a
    Image.fromarray((img * 255).round().astype(np.uint8)).save(os.path.join(out, f"{name}.webp"), quality=(72 if name in ("floor-carpet","fabric-detail") else 86), method=6)
    # Normal map from the high-passed height (luminance minus its blur), wrap-aware via tiling before the blur.
    h = Image.fromarray((lum / lum.max() * 255).astype(np.uint8))
    tiled = Image.new("L", (3072, 3072)); [tiled.paste(h, (x, y)) for x in (0, 1024, 2048) for y in (0, 1024, 2048)]
    blur = np.asarray(tiled.filter(ImageFilter.GaussianBlur(24)), dtype=np.float64)[1024:2048, 1024:2048]
    hp = (np.asarray(h, dtype=np.float64) - blur) / 255
    dx = (np.roll(hp, -1, 1) - np.roll(hp, 1, 1)) * strength
    dy = (np.roll(hp, -1, 0) - np.roll(hp, 1, 0)) * strength
    nrm = np.dstack([-dx, dy, np.ones_like(dx)])
    nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
    nimg = Image.fromarray(((nrm * 0.5 + 0.5) * 255).round().astype(np.uint8)).resize((512, 512), Image.LANCZOS)
    nimg.save(os.path.join(out, f"{name}-n.webp"), quality=90, method=6)
    print(name, os.path.getsize(os.path.join(out, f"{name}.webp")) // 1024, "KB +", os.path.getsize(os.path.join(out, f"{name}-n.webp")) // 1024, "KB normal")
