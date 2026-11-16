"""Clean one generated GLB for the web studio.

  python -I prep.py in.glb out.glb --tris 20000 --tex 1024 --rotate 0 [--preview out.png]

- joins the meshes, turns it so its front faces glTF +Z (--rotate degrees about up), sets the origin at
  the bottom centre and keeps real-world metres (the studio scales it to the item's size)
- decimates to about --tris triangles
- bakes ambient occlusion with Cycles onto the model's own UVs and multiplies it into the base colour,
  so it looks grounded under the studio's cheap lights with no runtime AO
- resizes every texture to --tex, drops metalness (no chrome eggs) and keeps roughness at least 0.45
"""
import argparse, math, sys
import bpy, numpy as np
from mathutils import Vector

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("dst")
ap.add_argument("--tris", type=int, default=20000)
ap.add_argument("--tex", type=int, default=1024)
ap.add_argument("--rotate", type=float, default=0)
ap.add_argument("--ao", type=float, default=0.75, help="how strongly AO darkens the base colour (0..1)")
ap.add_argument("--preview")
ap.add_argument("--keep-normal", action="store_true", help="keep the generator's normal map (it was made for the full mesh)")
ap.add_argument("--no-decimate", action="store_true", help="the mesh is already simplified (gltf-transform)")
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a.src)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
for o in bpy.context.scene.objects: o.select_set(o in meshes)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
for o in list(bpy.context.scene.objects):
    if o is not obj: bpy.data.objects.remove(o, do_unlink=True)
obj.rotation_mode = "XYZ"
obj.rotation_euler.z += math.radians(a.rotate)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Origin at the bottom centre.
vs = np.array([v.co[:] for v in obj.data.vertices])
lo, hi = vs.min(0), vs.max(0)
shift = Vector((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]))
obj.data.transform(__import__("mathutils").Matrix.Translation(shift))
obj.location = (0, 0, 0)

# Decimate.
before = sum(len(p.vertices) - 2 for p in obj.data.polygons)
if before > a.tris and not a.no_decimate:
    mod = obj.modifiers.new("dec", "DECIMATE"); mod.ratio = a.tris / before; mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier="dec")
after = sum(len(p.vertices) - 2 for p in obj.data.polygons)

# Materials: find the base colour image; drop metalness; floor roughness; resize textures.
mat = obj.data.materials[0]
nt = mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
def linked_image(sock):
    if not sock.is_linked: return None
    n = sock.links[0].from_node
    while n.type != "TEX_IMAGE" and n.inputs and any(i.is_linked for i in n.inputs):
        n = next(i for i in n.inputs if i.is_linked).links[0].from_node
    return n if n.type == "TEX_IMAGE" else None
base_node = linked_image(bsdf.inputs["Base Color"])
if bsdf.inputs["Metallic"].is_linked:
    nt.links.remove(bsdf.inputs["Metallic"].links[0])
bsdf.inputs["Metallic"].default_value = 0.0
if not bsdf.inputs["Roughness"].is_linked:
    bsdf.inputs["Roughness"].default_value = max(0.45, bsdf.inputs["Roughness"].default_value)
# A tangent-space normal map baked for the full mesh shades a simplified one in dark blotches: drop it.
if not a.keep_normal and bsdf.inputs["Normal"].is_linked:
    nt.links.remove(bsdf.inputs["Normal"].links[0])
for img in bpy.data.images:
    if img.size[0] > a.tex: img.scale(a.tex, a.tex)

# Bake AO onto the model's UVs and multiply it into the base colour.
scene = bpy.context.scene
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 256
ao_img = bpy.data.images.new("ao", a.tex, a.tex, alpha=False)
bake_node = nt.nodes.new("ShaderNodeTexImage"); bake_node.image = ao_img
nt.nodes.active = bake_node
# A floor under the piece, so its underside reads as shaded the way it would on the ground.
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0)); floor = bpy.context.object
for o in scene.objects: o.select_set(o is obj)
bpy.context.view_layer.objects.active = obj
scene.render.bake.margin = 8
scene.world = bpy.data.worlds.new("w")
bpy.ops.object.bake(type="AO")
bpy.data.objects.remove(floor, do_unlink=True)
nt.nodes.remove(bake_node)
if base_node is not None:
    base = base_node.image
    if base.size[0] != a.tex: base.scale(a.tex, a.tex)
    px = np.array(base.pixels[:]).reshape(-1, 4)
    ao = np.array(ao_img.pixels[:]).reshape(-1, 4)[:, :1]
    px[:, :3] *= (1 - a.ao) + a.ao * ao
    base.pixels[:] = px.ravel()
    base.update()
    base.pack()
else:
    bsdf.inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1)

dims = obj.dimensions
print(f"PREP {a.src} tris {before}->{after} size_m {dims.x:.3f}x{dims.y:.3f}x{dims.z:.3f}")
bpy.ops.export_scene.gltf(filepath=a.dst, export_format="GLB", use_selection=True, export_image_format="AUTO",
                          export_yup=True, export_apply=True)

if a.preview:
    # Front view (glTF +Z = Blender -Y) to check which way it faces.
    r = max(dims) * 2.2
    bpy.ops.object.camera_add(location=(r * .35, -r, dims.z * .6 + r * .25))
    cam = bpy.context.object
    cam.rotation_euler = (Vector((0, 0, dims.z / 2)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 5)); bpy.context.object.data.energy = 3
    bpy.context.object.rotation_euler = (math.radians(40), 0, math.radians(30))
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.9, 0.88, 1)
    scene.cycles.samples = 32; scene.render.resolution_x = scene.render.resolution_y = 480
    scene.view_settings.view_transform = "AgX"
    scene.render.filepath = a.preview
    bpy.ops.render.render(write_still=True)
