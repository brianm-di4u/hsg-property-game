# Bathhouse Barons: playing pieces rendered as sprites.
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python pieces.py -- <outdir> [name ...]
# Every piece is rendered twice through the same orthographic camera (tilted 46 degrees from straight
# down, so pieces read as standing on a top-down board):
#   <name>.png         the piece alone (transparent film, no shadow)
#   <name>-shadow.png  only its shadow, cast by the table lamp onto a shadow-catcher plane
# The game draws the shadow on the board, then the piece above it (lifted when it hops).
# pieces.json records each sprite's size and where the piece's foot (world origin) lands.
import bpy, bmesh, math, os, sys, json, random
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), 'renders'))
ONLY = set(ARGS[1:])
os.makedirs(OUT, exist_ok=True)
TILT = math.radians(46)

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

# ---------- materials ----------
_mats = {}
def mat(name, color, metal=0.0, rough=0.5, coat=0.0, sss=0.0, emit=None):
    key = (name, color, metal, rough, coat)
    if key in _mats: return _mats[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(color), 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if coat: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.06
    if sss: b.inputs['Subsurface Weight'].default_value = sss; b.inputs['Subsurface Radius'].default_value = (0.3, 0.2, 0.12)
    if emit: b.inputs['Emission Color'].default_value = (*srgb(emit[0]), 1); b.inputs['Emission Strength'].default_value = emit[1]
    _mats[key] = m
    return m

BRASS = lambda: mat('brass', '#C9A14A', 1.0, 0.26)
PEWTER = lambda: mat('pewter', '#B9B7B0', 1.0, 0.3)
CREAM = lambda: mat('cream', '#E8D9B4', 0.0, 0.75)
STUCCO = lambda: mat('stucco', '#F2ECDD', 0.0, 0.8)
TILE = lambda: mat('tile', '#8C3522', 0.0, 0.6)
COPPER = lambda: mat('copper', '#5E9C86', 0.35, 0.45)
GLASS = lambda: mat('glass', '#1C2A36', 0.0, 0.12)
TRIM = lambda: mat('trim', '#CFC6B2', 0.0, 0.6)
BRICK = lambda: mat('brick', '#B5653F', 0.0, 0.7)
TAN = lambda: mat('tan', '#D8C49A', 0.0, 0.7)
GREENTILE = lambda: mat('greentile', '#4E7D5B', 0.0, 0.5)

def link(ob):
    bpy.context.scene.collection.objects.link(ob); return ob

def mesh_from(bm, name, m=None, smooth=False):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if smooth: me.shade_smooth()
    if m: me.materials.append(m)
    return link(bpy.data.objects.new(name, me))

def bevel(ob, w=0.02, seg=2, angle=40):
    md = ob.modifiers.new('bv', 'BEVEL'); md.width = w; md.segments = seg; md.limit_method = 'ANGLE'; md.angle_limit = math.radians(angle)
    return ob

def box(x, y, z, w, d, h, m, name='box', bv=0.0):
    """Axis box with its bottom centre at (x, y, z)."""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector((x + v.co.x * w, y + v.co.y * d, z + (v.co.z + 0.5) * h))
    ob = mesh_from(bm, name, m)
    if bv: bevel(ob, bv)
    return ob

def lathe(profile, m, segs=48, name='lathe', z0=0.0, smooth=True, caps=True):
    """profile: [(r, z)] bottom to top; closed with caps when r>0 at the ends."""
    bm = bmesh.new(); rings = []
    for r, z in profile:
        ring = [bm.verts.new((r * math.cos(a), r * math.sin(a), z0 + z)) for a in [i * 2 * math.pi / segs for i in range(segs)]]
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(segs):
            bm.faces.new((a[i], a[(i + 1) % segs], b[(i + 1) % segs], b[i]))
    if caps and profile[0][0] > 0: bm.faces.new(rings[0][::-1])
    if caps and profile[-1][0] > 0: bm.faces.new(rings[-1])
    return mesh_from(bm, name, m, smooth)

def cyl(x, y, z, r, h, m, segs=32, name='cyl'):
    return lathe([(r, 0), (r, h)], m, segs, name, z0=z) if (x, y) == (0, 0) else _moved(lathe([(r, 0), (r, h)], m, segs, name, z0=z), x, y)

def _moved(ob, x, y):
    ob.location.x += x; ob.location.y += y; return ob

def extrude_poly(pts, depth, m, name='poly', bv=0.0):
    """2D polygon in the XZ plane (x, z), extruded along Y by depth, centred on y=0."""
    bm = bmesh.new()
    f = [bm.verts.new((x, -depth / 2, z)) for x, z in pts]
    b = [bm.verts.new((x, depth / 2, z)) for x, z in pts]
    bm.faces.new(f); bm.faces.new(b[::-1])
    n = len(pts)
    for i in range(n): bm.faces.new((f[i], b[i], b[(i + 1) % n], f[(i + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_from(bm, name, m)
    if bv: bevel(ob, bv, 2, 30)
    return ob

def hip_roof(x, y, z, w, d, h, m, ridge=0.35, over=0.04, name='roof'):
    """Hipped roof: rectangle base (with overhang), ridge along the longer axis."""
    bm = bmesh.new(); W, D = w / 2 + over, d / 2 + over
    base = [bm.verts.new((x + sx * W, y + sy * D, z)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    if w >= d: r = [bm.verts.new((x - W * ridge, y, z + h)), bm.verts.new((x + W * ridge, y, z + h))]
    else: r = [bm.verts.new((x, y - D * ridge, z + h)), bm.verts.new((x, y + D * ridge, z + h))]
    bm.faces.new(base[::-1])
    if w >= d:
        bm.faces.new((base[0], base[1], r[1], r[0])); bm.faces.new((base[1], base[2], r[1]))
        bm.faces.new((base[2], base[3], r[0], r[1])); bm.faces.new((base[3], base[0], r[0]))
    else:
        bm.faces.new((base[1], base[2], r[1], r[0])); bm.faces.new((base[2], base[3], r[1]))
        bm.faces.new((base[3], base[0], r[0], r[1])); bm.faces.new((base[0], base[1], r[0]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_from(bm, name, m)

def pyramid(x, y, z, w, h, m, name='pyr'):
    return hip_roof(x, y, z, w, w, h, m, ridge=0.0, over=0.03, name=name)

def dome(x, y, z, r, m, squash=0.8, name='dome'):
    prof = [(r * math.cos(a), r * squash * math.sin(a)) for a in [i * math.pi / 2 / 12 for i in range(13)]]
    prof[-1] = (0.0, prof[-1][1])
    return _moved(lathe(prof, m, 40, name, z0=z), x, y)

def windows(x0, y_face, z0, cols, rows, ww, wh, gx, gz, m=None, sign=-1, name='win'):
    """Grid of dark window panes protruding slightly from a facade at y=y_face (front face sign=-1)."""
    obs = []
    for r in range(rows):
        for c in range(cols):
            obs.append(box(x0 + c * gx, y_face + sign * 0.006, z0 + r * gz, ww, 0.02, wh, m or GLASS(), name))
    return obs

def clear():
    for o in list(bpy.data.objects):
        if o.name not in ('cam', 'key', 'fill', 'rim', 'catcher'): bpy.data.objects.remove(o, do_unlink=True)

# ---------- scene ----------
def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    cd = bpy.data.cameras.new('cam'); cd.type = 'ORTHO'
    cam = link(bpy.data.objects.new('cam', cd)); sc.camera = cam
    # Camera to the south looking north and down: the board's up-screen direction is +Y.
    fwd = Vector((0, math.sin(TILT), -math.cos(TILT)))
    up = Vector((0, math.cos(TILT), math.sin(TILT)))
    right = fwd.cross(up)
    R = Matrix((right, up, -fwd)).transposed()
    cam.matrix_world = Matrix.Translation(-fwd * 30) @ R.to_4x4()
    # Table lamp: a sun from the upper left (screen), so shadows fall to the lower right with no falloff.
    kd = bpy.data.lights.new('key', 'SUN'); kd.energy = 3.2; kd.angle = math.radians(9); kd.color = (1.0, 0.93, 0.82)
    key = link(bpy.data.objects.new('key', kd))
    kdir = Vector((-0.55, 0.45, 0.85)).normalized()
    key.rotation_euler = kdir.to_track_quat('Z', 'Y').to_euler()
    for nm, loc, en, size, col in (('fill', (5, -6, 4), 260, 6, (0.85, 0.9, 1.0)), ('rim', (2.5, 6, 3), 380, 2, (1, 1, 1))):
        ld = bpy.data.lights.new(nm, 'AREA'); ld.energy = en; ld.size = size; ld.color = col; ld.use_shadow = False
        lo = link(bpy.data.objects.new(nm, ld)); lo.location = loc
        lo.rotation_euler = (Vector(loc) * -1).to_track_quat('-Z', 'Y').to_euler()
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.55, 0.5, 0.45, 1); bg.inputs['Strength'].default_value = 0.45
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0)); cat = bpy.context.active_object; cat.name = 'catcher'
    cat.is_shadow_catcher = True
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 80; sc.cycles.use_denoising = True
    try:
        pr = bpy.context.preferences.addons['cycles'].preferences; pr.compute_device_type = 'OPTIX'; pr.get_devices()
        for d in pr.devices: d.use = d.type == 'OPTIX'
        sc.cycles.device = 'GPU'
    except Exception as e: print('cpu render', e)
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '8'

META = {}
def render(name, scale, px_w, px_h, shadow=True, foot=(0, 0, 0)):
    if ONLY and name not in ONLY and name.split('-')[0] not in ONLY: return
    sc = bpy.context.scene; cam = sc.camera; cat = bpy.data.objects['catcher']
    cam.data.ortho_scale = scale
    sc.render.resolution_x, sc.render.resolution_y = px_w, px_h
    pieces = [o for o in bpy.data.objects if o.type == 'MESH' and o.name != 'catcher']
    # pass 1: the piece alone
    cat.hide_render = True
    for o in pieces: o.visible_camera = True
    sc.render.filepath = os.path.join(OUT, name + '.png'); bpy.ops.render.render(write_still=True)
    if shadow:
        cat.hide_render = False
        for o in pieces: o.visible_camera = False
        sc.render.filepath = os.path.join(OUT, name + '-shadow.png'); bpy.ops.render.render(write_still=True)
        for o in pieces: o.visible_camera = True
    from bpy_extras.object_utils import world_to_camera_view
    p = world_to_camera_view(sc, cam, Vector(foot))
    aspect = px_w / px_h
    META[name] = {'w': px_w, 'h': px_h, 'footX': round(p.x * px_w, 1), 'footY': round((1 - p.y) * px_h, 1),
                  'pxPerUnit': round(px_w / scale if aspect >= 1 else px_h / scale, 2)}
    print('rendered', name)

# ---------- tokens ----------
TOKENS = [('jug', '#D55E00'), ('tub', '#0072B2'), ('shoe', '#009E73'), ('parasol', '#CC79A7'), ('fish', '#E69F00'), ('car', '#56B4E9')]

def paint(color):  # classic die-cast pewter; the player's colour is the enamel base
    return mat('pewterbody', '#CFCBC1', 1.0, 0.3)

def token_base(color):
    lathe([(0.0, 0), (0.5, 0), (0.54, 0.03), (0.54, 0.1), (0.5, 0.14), (0.0, 0.14)], mat('base' + color, color, 0.0, 0.3, coat=0.8), name='base')
    lathe([(0.52, 0.125), (0.55, 0.135), (0.52, 0.15)], BRASS(), name='rim', smooth=True, caps=False)

def darker(h, k=0.62):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    return '#' + ''.join('%02X' % int(v * k) for v in c)

def tok_jug(c):
    p = paint(c); Z = 0.14
    lathe([(0.0, 0), (0.28, 0), (0.36, 0.08), (0.41, 0.3), (0.38, 0.52), (0.28, 0.66), (0.14, 0.74), (0.11, 0.86), (0.14, 0.9), (0.14, 0.96), (0.0, 0.96)], p, name='jug', z0=Z)
    # handle: half torus from shoulder to neck on the +x side
    bpy.ops.mesh.primitive_torus_add(major_radius=0.17, minor_radius=0.045, location=(0.2, 0, Z + 0.72), rotation=(math.pi / 2, 0, 0))
    h = bpy.context.active_object; h.data.materials.append(p); h.data.shade_smooth(); h.scale = (1, 1.25, 1)
    lathe([(0.0, 0), (0.12, 0), (0.12, 0.05), (0.0, 0.05)], mat('cork', '#7A5230', 0, 0.8), 24, 'cork', z0=Z + 0.96)

def tok_hat(c):
    p = paint(c); Z = 0.14
    lathe([(0.0, 0), (0.46, 0), (0.5, 0.02), (0.47, 0.05), (0.31, 0.06), (0.3, 0.2), (0.31, 0.62), (0.34, 0.86), (0.33, 0.9), (0.0, 0.91)], p, name='hat', z0=Z)
    lathe([(0.305, 0.08), (0.315, 0.08), (0.318, 0.22), (0.308, 0.22)], mat('band', '#1D1B19', 0.2, 0.4), name='band', z0=Z)

def tok_shoe(c):
    p = paint(c); Z = 0.14
    pts = []
    for i in range(0, 41):  # outer arc, opening at the top (a lucky horseshoe)
        a = math.radians(-40 + i * (260 / 40)) - math.pi / 2 + math.radians(-90)
    outer, inner = [], []
    for i in range(41):
        a = math.radians(130 + i * (280 / 40))  # 130..410 deg, gap centred at the top (90 deg)
        outer.append((0.42 * math.cos(a), 0.5 + 0.44 * math.sin(a)))
        inner.append((0.25 * math.cos(a), 0.5 + 0.27 * math.sin(a)))
    poly = outer + inner[::-1]
    o = extrude_poly(poly, 0.13, p, 'shoe', bv=0.025)
    o.location.z = Z + 0.0
    # nail holes as small dark studs
    for i in (5, 12, 28, 35):
        a = math.radians(130 + i * 7); x = 0.335 * math.cos(a); z = 0.5 + 0.355 * math.sin(a)
        box(x, -0.07, Z + z - 0.025, 0.05, 0.02, 0.05, mat('hole', '#1D1B19', 0.2, 0.5), 'nail')
    box(0, 0, Z, 0.3, 0.2, 0.06, p, 'foot', bv=0.02)

def tok_tub(c):
    """A clawfoot bathtub (the Running of the Tubs) with a curl of steam."""
    p = paint(c); Z = 0.14
    prof = [(0.0, 0.0), (0.2, 0.0), (0.34, 0.05), (0.4, 0.18), (0.42, 0.34), (0.44, 0.38), (0.4, 0.38), (0.37, 0.33), (0.33, 0.2), (0.2, 0.12), (0.0, 0.12)]
    tub = lathe(prof, p, 48, 'tub', z0=Z + 0.12); tub.scale = (1.45, 0.8, 1.0)
    for sx in (-1, 1):
        for sy in (-1, 1):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.07, location=(sx * 0.36, sy * 0.15, Z + 0.07))
            f = bpy.context.active_object; f.data.materials.append(BRASS()); f.data.shade_smooth()
    cyl(0, 0, 0, 0.025, 0.22, BRASS(), 12, 'tap').location = (-0.5, 0, Z + 0.38)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.07, minor_radius=0.022, location=(-0.46, 0, Z + 0.6), rotation=(math.pi / 2, 0, 0))
    t = bpy.context.active_object; t.data.materials.append(BRASS()); t.data.shade_smooth()
    # steam curl rising from the water
    pts = [(0.08 * math.sin(k * 0.9), 0.0, Z + 0.5 + k * 0.07) for k in range(7)]
    for k, (x, y, z) in enumerate(pts):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.075 - k * 0.007, location=(x + 0.1, y, z))
        sm = bpy.context.active_object; sm.data.materials.append(mat('steam', '#F4F1EA', 0.0, 0.9)); sm.data.shade_smooth()

def tok_parasol(c):
    p = paint(c); Z = 0.14
    cyl(0, 0, Z, 0.03, 1.1, BRASS(), 12, 'shaft')
    # canopy with scalloped rim (8 ribs)
    bm = bmesh.new(); n = 64; tip = bm.verts.new((0, 0, Z + 1.18)); ring = []
    for i in range(n):
        a = i * 2 * math.pi / n; sc = 1 - 0.1 * (0.5 + 0.5 * math.cos(a * 8))
        ring.append(bm.verts.new((0.58 * sc * math.cos(a), 0.58 * sc * math.sin(a), Z + 0.82 + 0.05 * (0.5 + 0.5 * math.cos(a * 8)))))
    for i in range(n): bm.faces.new((tip, ring[i], ring[(i + 1) % n]))
    o = mesh_from(bm, 'canopy', p, smooth=True)
    sol = o.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.03
    lathe([(0.0, 0), (0.035, 0), (0.0, 0.14)], BRASS(), 12, 'finial', z0=Z + 1.18)
    # crook handle base: small brass ball foot
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.07, location=(0, 0, Z + 0.06)); b = bpy.context.active_object; b.data.materials.append(BRASS()); b.data.shade_smooth()

def tok_fish(c):
    """A leaping sculpin: big head, fan pectoral fins, tapering tail (after the Quapaw parapet motif)."""
    p = paint(c); Z = 0.14
    cyl(0, 0, Z, 0.035, 0.42, BRASS(), 12, 'post')
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.5, location=(0, 0, Z + 0.68))
    body = bpy.context.active_object; body.data.materials.append(p); body.data.shade_smooth()
    body.scale = (0.85, 0.36, 0.34)
    bm = bmesh.new(); bm.from_mesh(body.data)
    for v in bm.verts:  # taper the tail end (+x) and bend it up
        t = max(0.0, v.co.x) / 0.5
        v.co.y *= 1 - 0.75 * t; v.co.z *= 1 - 0.6 * t; v.co.z += 0.22 * t * t
        if v.co.x < 0: v.co.z *= 1.15; v.co.y *= 1.1
    bm.to_mesh(body.data); bm.free()
    body.rotation_euler = (0, math.radians(-12), math.radians(-25))
    tail = extrude_poly([(0.38, 0.12), (0.62, 0.42), (0.55, 0.12), (0.62, -0.12)], 0.03, p, 'tail', bv=0.01)
    tail.location.z = Z + 0.82; tail.rotation_euler = (0, math.radians(-30), math.radians(-25))
    for s in (-1, 1):  # fan pectoral fins
        f = extrude_poly([(-0.12, 0.0), (0.02, 0.22), (0.12, 0.12), (0.08, -0.02)], 0.02, p, 'fin', bv=0.008)
        f.location = (-0.12, s * 0.16, Z + 0.6); f.rotation_euler = (math.radians(s * 70), 0, math.radians(-25))
    for s in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.045, location=(-0.3, s * 0.1, Z + 0.78))
        e = bpy.context.active_object; e.data.materials.append(mat('eye', '#141210', 0.3, 0.2)); e.location = (Vector(e.location) - Vector((0, 0, Z + 0.68)))
        e.location.z += Z + 0.68
        e.location = Matrix.Rotation(math.radians(-25), 4, 'Z') @ e.location

def tok_car(c):
    """A Hot Springs streetcar: single-truck car with a clerestory roof and trolley pole."""
    p = paint(c); Z = 0.14
    box(0, 0, Z + 0.1, 0.92, 0.36, 0.42, p, 'body', bv=0.03)
    box(0, 0, Z + 0.52, 0.98, 0.42, 0.05, mat('roof', '#3A3330', 0.2, 0.5), 'roof', bv=0.015)
    box(0, 0, Z + 0.57, 0.6, 0.22, 0.07, mat('roof', '#3A3330', 0.2, 0.5), 'clere', bv=0.01)
    for s in (-1, 1):
        windows(-0.36, s * 0.18, Z + 0.3, 6, 1, 0.1, 0.16, 0.144, 0, mat('carwin', '#F4E7C3', 0, 0.2, emit=('#F4E2B0', 0.6)), sign=s)
    box(0, 0, Z + 0.25, 0.94, 0.38, 0.03, BRASS(), 'stripe')
    for x in (-0.25, 0.25):
        for s in (-1, 1):
            o = cyl(0, 0, 0, 0.09, 0.05, mat('wheel', '#1D1B19', 0.6, 0.4), 24, 'wheel'); o.rotation_euler = (math.pi / 2, 0, 0); o.location = (x, s * 0.2, Z + 0.1)
    pole = cyl(0, 0, 0, 0.012, 0.62, mat('pole', '#1D1B19', 0.6, 0.4), 8, 'pole'); pole.location = (0.15, 0, Z + 0.62); pole.rotation_euler = (0, math.radians(-60), 0)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.03, location=(0.15 - 0.62 * math.sin(math.radians(60)), 0, Z + 0.62 + 0.62 * math.cos(math.radians(60)))); bpy.context.active_object.data.materials.append(BRASS())

def tokens():
    for shape, c in TOKENS:
        clear(); token_base(c); globals()['tok_' + shape](c)
        render('tok-' + shape, 2.2, 176, 200)

# ---------- dice ----------
PIPS = {1: [(0, 0)], 2: [(-1, -1), (1, 1)], 3: [(-1, -1), (0, 0), (1, 1)], 4: [(-1, -1), (1, -1), (-1, 1), (1, 1)],
        5: [(-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1)], 6: [(-1, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (1, 1)]}
# face normal per value (opposites sum to 7): 1 top(+z) 6 bottom, 2 front(-y) 5 back, 3 right(+x) 4 left
FACES = {1: Vector((0, 0, 1)), 6: Vector((0, 0, -1)), 2: Vector((0, -1, 0)), 5: Vector((0, 1, 0)), 3: Vector((1, 0, 0)), 4: Vector((-1, 0, 0))}

def make_die():
    S = 0.5
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0)); d = bpy.context.active_object; d.name = 'die'
    bv = d.modifiers.new('bv', 'BEVEL'); bv.width = 0.11; bv.segments = 6
    bpy.ops.object.modifier_apply(modifier='bv'); d.data.shade_smooth()
    d.data.materials.append(mat('ivory', '#E9DDC2', 0.0, 0.3, coat=0.3, sss=0.05))
    pipm = mat('pip', '#8E1F14', 0.0, 0.35)
    cutters = []; centres = []
    for v, n in FACES.items():
        # two in-plane axes for the face
        a = Vector((1, 0, 0)) if abs(n.x) < 0.5 else Vector((0, 1, 0))
        b = n.cross(a)
        for i, j in PIPS[v]:
            pos = n * (S + 0.035) + a * (i * 0.25) + b * (j * 0.25)
            bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=0.085, location=pos)
            cutters.append(bpy.context.active_object); centres.append(pos.copy())
    for c in cutters:
        md = d.modifiers.new('cut', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = c; md.solver = 'EXACT'
        bpy.context.view_layer.objects.active = d; bpy.ops.object.modifier_apply(modifier='cut')
        bpy.data.objects.remove(c, do_unlink=True)
    # paint the pip craters: faces whose centre lies inside the cube's skin get the pip material
    ivory = d.data.materials[0]; d.data.materials.clear(); d.data.materials.append(ivory); d.data.materials.append(pipm)
    for f in d.data.polygons:
        c = f.center; f.material_index = 0
        if max(abs(c.x), abs(c.y), abs(c.z)) < S - 0.003 and min((c - q).length for q in centres) < 0.0855: f.material_index = 1
    print('pip faces', sum(1 for f in d.data.polygons if f.material_index == 1), 'of', len(d.data.polygons))
    d.data.shade_smooth()
    return d

def orient_top(v, yaw):
    """Rotation that brings face v to +z, then spins it by yaw about z."""
    n = FACES[v]
    q = n.rotation_difference(Vector((0, 0, 1)))
    return (Matrix.Rotation(yaw, 4, 'Z') @ q.to_matrix().to_4x4())

def dice():
    clear(); d = make_die()
    random.seed(7)
    for v in range(1, 7):
        for k, yaw in enumerate((math.radians(14), math.radians(-22))):
            d.matrix_world = Matrix.Translation((0, 0, 0.5)) @ orient_top(v, yaw)
            render(f'die-{v}-{k}', 1.9, 120, 120, foot=(0, 0, 0))
    for k in range(12):  # tumbling frames: random orientations, lifted
        e = (random.uniform(0, 6.28), random.uniform(0, 6.28), random.uniform(0, 6.28))
        d.matrix_world = Matrix.Translation((0, 0, 0.62)) @ Matrix.Rotation(e[0], 4, 'X') @ Matrix.Rotation(e[1], 4, 'Y') @ Matrix.Rotation(e[2], 4, 'Z')
        render(f'die-tumble-{k}', 1.9, 120, 120, shadow=False, foot=(0, 0, 0))

# ---------- buildings ----------
def bath_hale():
    """Bathhouse piece after the Hale: stucco block, red-tile hip roof, Mission parapet with a bell gable."""
    W, D, H = 0.9, 0.62, 0.52
    box(0, 0, 0, W + 0.06, D + 0.06, 0.06, TRIM(), 'plinth')
    box(0, 0, 0.06, W, D, H, STUCCO(), 'walls')
    windows(-0.3, -D / 2, 0.16, 4, 2, 0.11, 0.13, 0.2, 0.2)
    hip_roof(0, 0, 0.06 + H, W, D, 0.26, TILE(), 0.4, 0.05)
    # Mission parapet (front gable with a curved top) and a small arched bell opening
    pts = [(-0.24, 0), (0.24, 0), (0.24, 0.16), (0.16, 0.2), (0.1, 0.3), (0, 0.33), (-0.1, 0.3), (-0.16, 0.2), (-0.24, 0.16)]
    g = extrude_poly(pts, 0.06, STUCCO(), 'gable', 0.01); g.location = (0, -D / 2 - 0.01, 0.06 + H - 0.04)
    box(0, -D / 2 - 0.045, 0.06 + H + 0.06, 0.07, 0.02, 0.1, GLASS(), 'bell')
    box(0, -D / 2 - 0.05, 0.06, 0.2, 0.06, 0.2, mat('door', '#5B3A24', 0, 0.6), 'door')

def bath_ozark():
    """After the Ozark: low block flanked by two towers that step back, each with a red pyramid cap."""
    W, D, H = 0.96, 0.58, 0.42
    box(0, 0, 0, W + 0.06, D + 0.06, 0.06, TRIM(), 'plinth')
    box(0, 0, 0.06, W - 0.3, D, H, STUCCO(), 'mid')
    hip_roof(0, 0, 0.06 + H, W - 0.3, D, 0.14, GREENTILE(), 0.3, 0.03)
    windows(-0.2, -D / 2, 0.18, 3, 1, 0.1, 0.14, 0.2, 0)
    for s in (-1, 1):
        x = s * (W / 2 - 0.13)
        box(x, 0, 0.06, 0.26, D, H + 0.16, STUCCO(), 'towerA')
        box(x, 0, 0.06 + H + 0.16, 0.2, 0.2, 0.14, STUCCO(), 'towerB')
        box(x, 0, 0.06 + H + 0.3, 0.15, 0.15, 0.08, STUCCO(), 'towerC')
        pyramid(x, 0, 0.06 + H + 0.38, 0.17, 0.14, GREENTILE())
        windows(x, -D / 2, 0.2, 1, 2, 0.08, 0.12, 0, 0.18)
    box(0, -D / 2 - 0.04, 0.06, 0.24, 0.08, 0.06, TRIM(), 'steps')

def bath_quapaw():
    """After the Quapaw: long low block with a central tiled dome and a copper cupola."""
    W, D, H = 1.0, 0.56, 0.36
    box(0, 0, 0, W + 0.06, D + 0.06, 0.06, TRIM(), 'plinth')
    box(0, 0, 0.06, W, D, H, TAN(), 'walls')
    box(0, 0, 0.06 + H, W + 0.04, D + 0.04, 0.05, TRIM(), 'cornice')
    windows(-0.4, -D / 2, 0.14, 5, 1, 0.1, 0.17, 0.2, 0)
    box(0, 0, 0.06 + H + 0.05, 0.38, 0.38, 0.08, CREAM(), 'drum')
    dome(0, 0, 0.06 + H + 0.13, 0.24, mat('dometile', '#3F8E8A', 0.2, 0.4), 1.0)
    cyl(0, 0, 0.06 + H + 0.31, 0.05, 0.09, COPPER(), 16, 'cupola')
    lathe([(0.0, 0), (0.065, 0), (0.0, 0.08)], COPPER(), 16, 'cap', z0=0.06 + H + 0.4)
    # arched entrance bays
    for x in (-0.12, 0.0, 0.12):
        box(x, -D / 2 - 0.02, 0.06, 0.08, 0.04, 0.2, mat('door', '#5B3A24', 0, 0.6), 'arch')

def resort():
    """Grand Resort after the 1924 Arlington: tan-brick block, twin towers with red-tile pyramid caps."""
    W, D, H = 1.3, 0.8, 0.95
    box(0, 0, 0, W + 0.08, D + 0.08, 0.07, TRIM(), 'plinth')
    box(0, 0.05, 0.07, W - 0.36, D - 0.1, H, TAN(), 'core')
    hip_roof(0, 0.05, 0.07 + H, W - 0.36, D - 0.1, 0.16, TILE(), 0.45, 0.03)
    for s in (-1, 1):  # wings
        x = s * (W / 2 - 0.2)
        box(x, 0, 0.07, 0.4, D, H - 0.18, TAN(), 'wing')
        hip_roof(x, 0, 0.07 + H - 0.18, 0.4, D, 0.14, TILE(), 0.3, 0.03)
        windows(x - 0.12, -D / 2, 0.2, 3, 4, 0.06, 0.09, 0.12, 0.16)
    for s in (-1, 1):  # twin towers on the core front
        x = s * 0.2
        box(x, -D / 2 + 0.14, 0.07, 0.2, 0.2, H + 0.32, TAN(), 'tower')
        box(x, -D / 2 + 0.14, 0.07 + H + 0.32, 0.23, 0.23, 0.04, TRIM(), 'tcorn')
        pyramid(x, -D / 2 + 0.14, 0.07 + H + 0.36, 0.22, 0.2, TILE())
        windows(x, -D / 2 + 0.04, 0.3, 1, 5, 0.07, 0.1, 0, 0.17)
    windows(-0.05, -D / 2 + 0.04, 0.3, 2, 4, 0.06, 0.09, 0.1, 0.16)
    box(0, -D / 2 - 0.06, 0.07, 0.5, 0.12, 0.14, mat('awning', '#8E3622', 0, 0.6), 'porte')
    box(0, -D / 2 - 0.06, 0.21, 0.54, 0.16, 0.03, TRIM(), 'porteTop')

def buildings():
    for name, fn in (('bld-hale', bath_hale), ('bld-ozark', bath_ozark), ('bld-quapaw', bath_quapaw)):
        clear(); fn(); render(name, 1.5, 144, 144)
    clear(); resort(); render('bld-resort', 2.0, 192, 192)

# ---------- coin ----------
def coin():
    clear()
    lathe([(0.0, 0), (0.36, 0), (0.4, 0.02), (0.4, 0.07), (0.36, 0.09), (0.3, 0.085), (0.29, 0.07), (0.0, 0.07)], mat('gold', '#D9AE4E', 1.0, 0.22), 48, 'coin')
    bpy.ops.mesh.primitive_torus_add(major_radius=0.22, minor_radius=0.018, location=(0, 0, 0.075))
    t = bpy.context.active_object; t.data.materials.append(mat('gold', '#D9AE4E', 1.0, 0.22)); t.data.shade_smooth()
    for k, ang in enumerate((0, 50, 80)):
        for o in bpy.data.objects:
            if o.type == 'MESH' and o.name != 'catcher': o.rotation_euler = (math.radians(ang), 0, 0); o.location.z = 0.42 if ang else 0.0
        render(f'coin-{k}', 1.0, 64, 64, shadow=(k == 0))


# ---------- mesh export for the 3D table ----------
# `-- export <file.js>` writes every piece as indexed, quantized triangle groups (one per material) into a JS module:
# positions int16 over the piece's bounding box, normals int8, indices uint16; material colour/metal/roughness.
def material_params(m):
    b = m.node_tree.nodes['Principled BSDF']
    c = b.inputs['Base Color'].default_value
    to_s = lambda x: (1.055 * x ** (1 / 2.4) - 0.055) if x > 0.0031308 else x * 12.92
    hexc = '#' + ''.join('%02X' % max(0, min(255, round(to_s(v) * 255))) for v in c[:3])
    e = b.inputs['Emission Strength'].default_value
    ec = b.inputs['Emission Color'].default_value
    out = {'c': hexc, 'm': round(b.inputs['Metallic'].default_value, 2), 'r': round(b.inputs['Roughness'].default_value, 2)}
    if b.inputs['Coat Weight'].default_value > 0: out['k'] = round(b.inputs['Coat Weight'].default_value, 2)
    if e > 0: out['e'] = '#' + ''.join('%02X' % max(0, min(255, round(to_s(v) * 255))) for v in ec[:3]); out['ei'] = round(e, 2)
    return out

def export_piece():
    import base64, struct
    dg = bpy.context.evaluated_depsgraph_get()
    groups = {}
    for o in bpy.data.objects:
        if o.type != 'MESH' or o.name == 'catcher': continue
        ev = o.evaluated_get(dg); me = ev.to_mesh(); me.calc_loop_triangles()
        mw = o.matrix_world; nm = mw.to_3x3().inverted().transposed()
        mats = [ms.material for ms in o.material_slots]
        corner_n = [None] * len(me.loops)
        try:
            for i, cn in enumerate(me.corner_normals): corner_n[i] = cn.vector.copy()
        except Exception:
            for i, l in enumerate(me.loops): corner_n[i] = l.normal.copy()
        for tri in me.loop_triangles:
            m = mats[tri.material_index] if tri.material_index < len(mats) else None
            key = m.name if m else 'none'
            g = groups.setdefault(key, {'mat': material_params(m) if m else {'c': '#888888', 'm': 0, 'r': 0.5}, 'v': {}, 'pos': [], 'nor': [], 'idx': []})
            for li in tri.loops:
                vi = me.loops[li].vertex_index
                co = mw @ me.vertices[vi].co
                n = (nm @ corner_n[li]).normalized()
                k = (round(co.x, 4), round(co.y, 4), round(co.z, 4), round(n.x, 2), round(n.y, 2), round(n.z, 2))
                if k not in g['v']:
                    g['v'][k] = len(g['pos']) // 3; g['pos'] += [co.x, co.y, co.z]; g['nor'] += [n.x, n.y, n.z]
                g['idx'].append(g['v'][k])
        ev.to_mesh_clear()
    allp = [x for g in groups.values() for x in g['pos']]
    xs, ys, zs = allp[0::3], allp[1::3], allp[2::3]
    lo = [min(xs), min(ys), min(zs)]; hi = [max(xs), max(ys), max(zs)]
    out = {'lo': [round(v, 4) for v in lo], 'hi': [round(v, 4) for v in hi], 'g': []}
    for g in groups.values():
        q = []
        for i in range(0, len(g['pos']), 3):
            for a in range(3):
                span = (hi[a] - lo[a]) or 1
                q.append(int(round((g['pos'][i + a] - lo[a]) / span * 65535)) - 32768)
        pb = struct.pack('<%dh' % len(q), *q)
        nb = struct.pack('<%db' % len(g['nor']), *[max(-127, min(127, int(round(v * 127)))) for v in g['nor']])
        ib = struct.pack('<%dH' % len(g['idx']), *g['idx'])
        out['g'].append({'mat': g['mat'], 'p': base64.b64encode(pb).decode(), 'n': base64.b64encode(nb).decode(), 'i': base64.b64encode(ib).decode()})
    return out

if ARGS and ARGS[0] == 'export':
    setup()
    target = os.path.abspath(ARGS[1])
    data = {}
    for shape, c in TOKENS:
        clear(); token_base(c); globals()['tok_' + shape](c); data['tok-' + shape] = export_piece()
    for name, fn in (('bld-hale', bath_hale), ('bld-ozark', bath_ozark), ('bld-quapaw', bath_quapaw), ('bld-resort', resort)):
        clear(); fn(); data[name] = export_piece()
    js = ('// GENERATED by art-src/blender/pieces.py (export mode) from the same models as the sprites. Do not edit.\n'
          '// Each piece: lo/hi bounds (Blender units, z up) and groups of base64 int16 positions, int8 normals, uint16 indices.\n'
          'export const MESHES = ' + json.dumps(data, separators=(',', ':')) + ';\n')
    open(target, 'w').write(js)
    print('exported', len(data), 'pieces', round(len(js) / 1024, 1), 'KB')
else:
    setup()
    tokens(); dice(); buildings(); coin()
    old = {}
    mp = os.path.join(OUT, 'pieces.json')
    if os.path.exists(mp):
        try: old = json.load(open(mp))
        except Exception: old = {}
    old.update(META)
    json.dump(old, open(mp, 'w'), indent=1)
    print('done', len(META))
