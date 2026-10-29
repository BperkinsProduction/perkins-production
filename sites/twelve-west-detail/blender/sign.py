"""Render Chad's wall sign as raised 3D letters, one frame per scroll step.

Usage:
    /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
        --python blender/sign.py -- <out_dir> [frames]

Writes transparent PNGs sign-00.png ... so the page can swap frames as the visitor
scrolls. The camera drifts down and looks up a little more each frame, matching the
film, which tilts down past the sign toward the car.
"""
import bpy, math, sys, os

A = sys.argv[sys.argv.index("--") + 1:]
OUT = A[0]
FRAMES = int(A[1]) if len(A) > 1 else 24
FONT = "/Library/Fonts/PermanentMarker-Regular.ttf"
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x, sc.render.resolution_y = 1400, 560
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'
for attr, val in [("use_raytracing", True), ("use_shadows", True), ("taa_render_samples", 96)]:
    if hasattr(sc.eevee, attr): setattr(sc.eevee, attr, val)

def mat(name, base, rough=0.3, metal=0.0, coat=0.0, emit=None, emit_strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*base, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if "Coat Weight" in b.inputs: b.inputs["Coat Weight"].default_value = coat
    if emit is not None:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = emit_strength
    return m

blue = mat("blue", (0.005, 0.12, 0.62), rough=0.12, metal=0.55, coat=1.0, emit=(0.02, 0.32, 1.0), emit_strength=0.55)
white = mat("white", (0.92, 0.95, 1.0), rough=0.3, emit=(0.75, 0.88, 1.0), emit_strength=0.25)
silver = mat("silver", (0.80, 0.82, 0.86), rough=0.22, metal=1.0)

font = bpy.data.fonts.load(FONT)

def text(body, size, extrude, bevel, material, z=0.0, scale=1.0, y=0.0, offset=0.0):
    bpy.ops.object.text_add(location=(0, y, z))
    o = bpy.context.object
    o.data.body = body
    o.data.font = font
    o.data.size = size * scale
    o.data.align_x = 'CENTER'; o.data.align_y = 'CENTER'
    o.data.extrude = extrude
    o.data.bevel_depth = bevel
    o.data.bevel_resolution = 3
    o.data.offset = offset
    o.rotation_euler = (math.radians(90), 0, 0)   # stand the letters up, facing -Y
    o.data.materials.append(material)
    return o

# The sign: glossy blue letters with the silver subtitle below.
title = text("TWELVE WEST DETAIL", 1.0, 0.11, 0.018, blue, z=0.35, y=-0.06)
sub = text("ELEVATING THE STANDARD", 0.36, 0.05, 0.006, silver, z=-0.42, y=-0.03)
for o in (title, sub):
    o.rotation_euler[1] = math.radians(-5)        # the painted sign rises slightly to the right

# Light: a soft key above the camera, a cool rim from behind, and a low fill so the
# underside of the letters catches light when the camera looks up.
def area(name, loc, rot, energy, size, color=(1, 1, 1)):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = energy; d.size = size; d.color = color
    o = bpy.data.objects.new(name, d); sc.collection.objects.link(o)
    o.location = loc; o.rotation_euler = [math.radians(a) for a in rot]
    return o
area("key", (1.5, -6, 4), (55, 0, 12), 520, 5)
area("rim", (0, 3, 2.5), (-60, 0, 180), 900, 6, (0.45, 0.75, 1.0))
area("fill", (-3, -5, -2.5), (115, 0, -25), 260, 4, (0.9, 0.95, 1.0))
w = bpy.data.worlds.new("w"); w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.02, 0.025, 0.03, 1)
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
sc.world = w

cam_data = bpy.data.cameras.new("cam"); cam_data.lens = 122
cam = bpy.data.objects.new("cam", cam_data); sc.collection.objects.link(cam); sc.camera = cam
aim = bpy.data.objects.new("aim", None); sc.collection.objects.link(aim); aim.location = (0, 0, 0)
track = cam.constraints.new('TRACK_TO'); track.target = aim
track.track_axis = 'TRACK_NEGATIVE_Z'; track.up_axis = 'UP_Y'

# Frame 0 looks at the sign straight on. By the last frame the camera has dropped and
# looks up at it, with a small turn, so the sides and undersides of the letters show.
for i in range(FRAMES):
    t = i / max(1, FRAMES - 1)
    yaw = math.radians(-16 + 30 * t)
    dist = 30.0
    cam.location = (dist * math.sin(yaw), -dist * math.cos(yaw), -9.0 * t + 1.5)
    sc.render.filepath = os.path.join(OUT, f"sign-{i:02d}.png")
    bpy.ops.render.render(write_still=True)
print("done", FRAMES)
