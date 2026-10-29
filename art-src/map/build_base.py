# Geographic base map for the board's centre: a plan view of Hot Springs from public data, which Codex then repaints
# as a 1930s pictorial map (the geography stays where the data puts it). Runs in Blender's bundled Python (numpy):
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python build_base.py
# Inputs: the raw public data the trivia session downloaded (copy hsg-trivia's art-src/geo/raw to art-src/geo/raw here;
# sources in hsg-trivia's research/ and below), read through trivia's loaders (vendored in tools/map/):
#   USGS 3DEP 1/3" elevation (hillshade), Census TIGER/Line roads and rail, USGS NHD water, OSM Oaklawn track (ODbL).
# Outputs (art-src/map/): base-map.png (1600 px; base-map-lines.png, streets only, for checking the repaint) and
# map-frame.json: the extent in metres east/north of the Fordyce Bathhouse, used by the game to place pins.
import sys, os, math, json
HERE = os.path.dirname(os.path.abspath(__file__))
TRIVIA = os.path.normpath(os.path.join(HERE, '..', '..', 'tools', 'map'))
sys.path.insert(0, TRIVIA)
import numpy as np
from geo_common import load_json, to_m
from geo_raster import elevation, fill_polygons, stroke, write_png

X0, X1, Y0, Y1 = -3250.0, 2350.0, -3550.0, 2050.0   # metres; square 5.6 km
N = 1600
MPP = (X1 - X0) / N
def to_px(xy):
    xy = np.asarray(xy, float)
    return np.stack([(xy[:, 0] - X0) / MPP, (Y1 - xy[:, 1]) / MPP], 1)

def lines(geom):
    t, c = geom['type'], geom['coordinates']
    return [c] if t == 'LineString' else c if t == 'MultiLineString' else []
def xy(coords):
    a = np.array(coords, float)[:, :2]; x, y = to_m(a[:, 0], a[:, 1]); return np.stack([x, y], 1)

# ---- terrain ----
gx = X0 + (np.arange(N) + 0.5) * MPP
gy = Y1 - (np.arange(N) + 0.5) * MPP
XX, YY = np.meshgrid(gx, gy)
Z = elevation(XX, YY)
Z = np.where(np.isfinite(Z), Z, np.nanmean(Z))
dzdx = np.gradient(Z, axis=1) / MPP; dzdy = -np.gradient(Z, axis=0) / MPP
def shade(az, alt):
    az, alt = math.radians(az), math.radians(alt)
    nx, ny, nz = -dzdx * 2.2, -dzdy * 2.2, np.ones_like(Z)
    L = np.sqrt(nx * nx + ny * ny + nz * nz)
    lx, ly, lz = math.cos(alt) * math.sin(az), math.cos(alt) * math.cos(az), math.sin(alt)
    return np.clip((nx * lx + ny * ly + nz * lz) / L, 0, 1)
hs = 0.6 * shade(315, 40) + 0.25 * shade(270, 55) + 0.15 * shade(0, 60)
zlo, zhi = np.percentile(Z, 3), np.percentile(Z, 99)
t = np.clip((Z - zlo) / (zhi - zlo), 0, 1)[..., None]
low = np.array([236, 224, 190.0]); mid = np.array([196, 204, 160.0]); high = np.array([130, 158, 112.0])
tint = np.where(t < 0.35, low + (mid - low) * (t / 0.35), mid + (high - mid) * ((t - 0.35) / 0.65))
img = tint * (0.55 + 0.6 * hs[..., None])
print('elevation', round(float(zlo)), round(float(zhi)))

# ---- water ----
water_rings = []
for ft in load_json('water.json')['features']:
    g = ft['geometry']; polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    for poly in polys: water_rings += [xy(r) for r in poly]
wm = fill_polygons(water_rings, N, N, to_px)
img[wm] = [120, 168, 180]
creek = np.zeros((N, N), bool)
for ft in load_json('flow.json')['features']:
    for ln in lines(ft['geometry']):
        stroke(creek, to_px(xy(ln)), 2.6)
img[creek & ~wm] = [110, 160, 176]

# ---- streets ----
MAIN = {'Central Ave', 'Park Ave', 'Whittington Ave', 'Malvern Ave', 'Ouachita Ave', 'E Grand Ave', 'W Grand Ave', 'Grand Ave',
        'Albert Pike Rd', 'Prospect Ave', 'Fountain St', 'Reserve St', 'Market St', 'Broadway St', 'Valley St', 'Spring St',
        'Hawthorn St', 'Orange St', 'Olive St', 'Pleasant St', 'Gulpha St', 'W Belding St', 'E Belding St', 'Oaklawn St',
        'Hobson Ave', 'Woodlawn Ave', 'Summer St', 'Quapaw Ave', 'Garland Ave', 'Benton St', 'Exchange St', 'Bridge St',
        'Elm St', 'Cottage St', 'Lawrence St', 'Morrison St', 'Ramble St', 'Crescent Ave', 'Ward St', 'Silver St',
        'W Mountain Dr', 'N Mountain Dr', 'Hot Springs Mountain Dr', 'W Saint Louis St', 'Sleepy Valley Rd'}
MODERN = ('Expy', 'Expressway', 'Convention', 'Trivista', 'Laser', 'Bypass', 'Ramp')
OLD_R = 2300.0  # metres from the Row: the period street grid; local streets beyond it are left out
major = np.zeros((N, N), bool); minor = np.zeros((N, N), bool)
seen_main = set()
for f in ('roads-primary.json', 'roads-secondary.json', 'roads-local-0.json'):
    for ft in load_json(f)['features']:
        nm = ft['properties'].get('NAME') or ''
        if not nm or any(k in nm for k in MODERN): continue
        for ln in lines(ft['geometry']):
            p = xy(ln)
            if nm in MAIN:
                seen_main.add(nm); stroke(major, to_px(p), 4.2)
            else:
                d = np.hypot(p[:, 0] - (-300), p[:, 1] - (-600)).min()
                if d < OLD_R: stroke(minor, to_px(p), 1.8)
print('main streets found:', sorted(seen_main))
rail = np.zeros((N, N), bool)
for ft in load_json('rail.json')['features']:
    for ln in lines(ft['geometry']): stroke(rail, to_px(xy(ln)), 3.0)

# Oaklawn's track (OSM, ODbL)
track = np.zeros((N, N), bool)
for e in load_json('osm-oaklawn.json')['elements']:
    tg = e.get('tags', {})
    if tg.get('leisure') != 'track': continue
    geoms = [e['geometry']] if e.get('geometry') else [m['geometry'] for m in e.get('members', []) if m.get('geometry')]
    for g in geoms: stroke(track, to_px(xy([[q['lon'], q['lat']] for q in g])), 3.2)

lines_img = np.full((N, N, 3), 255.0)
casing = np.zeros((N, N), bool)
for mask, w in ((major, 0), (minor, 0)): pass
img[minor] = img[minor] * 0.55 + np.array([250, 244, 228.0]) * 0.45
img[major] = [252, 248, 236]; lines_img[major] = [40, 40, 40]; lines_img[minor] = [150, 150, 150]
img[rail] = [60, 52, 46]; lines_img[rail] = [200, 60, 40]
img[track] = [176, 120, 80]; lines_img[track] = [176, 120, 80]
img[wm] = [120, 168, 180]

# Bathhouse Row footprints (OSM, ODbL) in brick red, read from the trivia anchors' downtown extract
for e in load_json('osm-downtown.json')['elements']:
    tg = e.get('tags', {}); g = e.get('geometry')
    if not g or 'building' not in tg: continue
    nm = (tg.get('name') or '').lower()
    if 'bathhouse' in nm or 'arlington' in nm:
        m = fill_polygons([xy([[q['lon'], q['lat']] for q in g])], N, N, to_px)
        img[m] = [168, 70, 46]; lines_img[m] = [168, 70, 46]

write_png(os.path.join(HERE, 'base-map.png'), img)
write_png(os.path.join(HERE, 'base-map-lines.png'), lines_img)
json.dump({'x0': X0, 'x1': X1, 'y0': Y0, 'y1': Y1, 'px': N, 'origin': 'Fordyce Bathhouse 34.5136, -93.0533',
           'note': 'metres east (x) and north (y) of the origin; image x = (x - x0) / (x1 - x0), image y = (y1 - y) / (y1 - y0)'},
          open(os.path.join(HERE, 'map-frame.json'), 'w'), indent=1)
print('wrote base map', N)
