"""Generated GLB -> web-ready models for the studio.

  python3 pipeline.py <kind> <raw.glb> <outdir> [--rotate DEG]

Writes <outdir>/<kind>.glb (about 20k triangles, 1024 textures with the normal map) and <kind>-lite.glb
(about 8k triangles, 512 textures, no normal map) plus <kind>.png, a front preview.
Steps: gltf-transform simplify (meshoptimizer, keeps UV seams) -> Blender prep.py (orient, origin, AO baked into
the base colour, metalness off) -> gltf-transform optimize (meshopt + WebP).
"""
import argparse, json, os, subprocess, sys, tempfile

ap = argparse.ArgumentParser()
ap.add_argument("kind"); ap.add_argument("raw"); ap.add_argument("outdir")
ap.add_argument("--rotate", type=float, default=0)
a = ap.parse_args()
TOOLS = os.path.dirname(os.path.abspath(__file__))
GT = ["npx", "-y", "@gltf-transform/cli@4"]
os.makedirs(a.outdir, exist_ok=True)

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"FAILED {' '.join(cmd)}\n{r.stdout[-2000:]}\n{r.stderr[-2000:]}")
    return r.stdout

with tempfile.TemporaryDirectory() as tmp:
    for variant, target, tex, keep_normal in [("", 20000, 1024, True), ("-lite", 8000, 512, False)]:
        simp = os.path.join(tmp, f"simp{variant}.glb")
        # Hunyuan pro outputs ~500k triangles; Tripo ~2M.
        raw_tris = int(run(["python3", "-I", os.path.join(TOOLS, "count.py"), a.raw]).strip().splitlines()[-1])
        ratio = min(1.0, target / raw_tris)
        run(GT + ["simplify", a.raw, simp, "--ratio", f"{ratio:.5f}", "--error", "0.003"])
        prepped = os.path.join(tmp, f"prep{variant}.glb")
        cmd = ["python3", "-I", os.path.join(TOOLS, "prep.py"), simp, prepped, "--no-decimate", "--tex", str(tex),
               "--rotate", str(a.rotate)]
        if keep_normal: cmd.append("--keep-normal")
        if not variant: cmd += ["--preview", os.path.join(a.outdir, f"{a.kind}.png")]
        out = run(cmd)
        line = next(l for l in out.splitlines() if l.startswith("PREP"))
        final = os.path.join(a.outdir, f"{a.kind}{variant}.glb")
        run(GT + ["optimize", prepped, final, "--compress", "meshopt", "--texture-compress", "webp",
                  "--texture-size", str(tex), "--simplify", "false", "--instance", "false"])
        print(json.dumps({"kind": a.kind + variant, "prep": line, "bytes": os.path.getsize(final)}))
