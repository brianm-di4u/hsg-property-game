// The 3D table: the painted board (render.js draws its face into a 2048-px canvas texture) as a printed slab on an oak
// card table under a warm lamp, with the Blender die-cast tokens and bathhouse/resort pieces as meshes, rounded dice,
// real shadows and a camera that zooms in on and tracks the moving token. All positions come from render.js in "board px"
// (render.js's view while 3D is on: a 2048 x 2048 board on wide screens; on phones the same tall, phone-sized layout
// as the 2D board, drawn at 2048 device px across), so game logic, animations and hit-testing are shared with the
// 2D board. Money pops and flying coins are drawn on a 2D overlay at projected positions.
// Falls back to the 2D board when there is no WebGL, on software GL, with ?gl=0, or when frames run slow.
import { THREE } from './three-lib.js';
import { MESHES } from './pieces-mesh.js';
import * as R from './render.js';
import { img } from './art.js';
import { TOKENS, SPACES } from './data.js';

export const S = 2048;           // board texture width in device px
const BW = 10;                   // board width in world units
let BD = BW;                     // board depth in world units (taller than wide on phones)
const TOP = 0.14;                // board slab thickness; the face is at y = TOP
const VW = () => R.view.W, VH = () => R.view.H; // the board in board px
const wx = (px) => (px / VW() - 0.5) * BW;
const wz = (py) => (py / VH() - 0.5) * BD;
const len = (px) => px / VW() * BW; // board px -> world length

export const B3 = { on: false, reason: '', renderer: null, scene: null, camera: null, gl: null, overlay: null, octx: null,
  W: 0, H: 0, dpr: 1, texKey: '', cam: { cur: null, vel: { tx: 0, tz: 0, dist: 0 }, settled: true, last: 0 }, follow: null, slow: 0, frames: [] };

// ---------- capability ----------
export function probe(force) {
  if (force === '0') return { ok: false, why: 'off' };
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { ok: false, why: 'no-webgl' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    if (/swiftshader|llvmpipe|software|basic render/i.test(name) && force !== '3d') return { ok: false, why: 'software-gl', name };
    return { ok: true, name };
  } catch (e) { return { ok: false, why: 'error' }; }
}

// ---------- textures ----------
function canvasTex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, B3.renderer.capabilities.getMaxAnisotropy()); return t;
}
function tableTexture(dark) {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1365;
  const g = c.getContext('2d'), wood = img('table-oak');
  if (wood) g.drawImage(wood, 0, 0, c.width, c.height); else { g.fillStyle = '#7A4A22'; g.fillRect(0, 0, c.width, c.height); }
  if (dark) { g.fillStyle = 'rgba(8,4,14,.62)'; g.fillRect(0, 0, c.width, c.height); }
  return canvasTex(c);
}
function edgeTexture(dark) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = dark ? '#1B1830' : '#2F4A36'; g.fillRect(0, 0, 512, 32);
  g.fillStyle = dark ? '#C9A24A' : '#D9C38A'; g.fillRect(0, 7, 512, 2); g.fillRect(0, 23, 512, 2);
  return canvasTex(c);
}
function dieFace(v) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(54, 50, 10, 64, 64, 90); grd.addColorStop(0, '#FBF4E2'); grd.addColorStop(1, '#E6D8B8');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[v];
  for (const [a, b] of P) {
    const x = 64 + a * 30, y = 64 + b * 30;
    const pg = g.createRadialGradient(x - 3, y - 3, 1, x, y, 12); pg.addColorStop(0, '#5E120B'); pg.addColorStop(0.7, '#8E1F14'); pg.addColorStop(1, '#C9A88A');
    g.fillStyle = pg; g.beginPath(); g.arc(x, y, 11.5, 0, 7); g.fill();
  }
  return canvasTex(c);
}

// ---------- meshes ----------
function b64(s, T) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); }
const matCache = {};
function material(m) {
  const key = JSON.stringify(m); if (matCache[key]) return matCache[key];
  const pewter = m.c === '#CFCBC1'; // the die-cast token bodies: keep them bright under a warm room
  const P = { color: new THREE.Color(m.c), metalness: pewter ? 0.8 : m.m, roughness: pewter ? 0.34 : Math.max(0.12, m.r) };
  if (m.e) { P.emissive = new THREE.Color(m.e); P.emissiveIntensity = Math.min(1.2, m.ei); }
  const mm = m.k ? new THREE.MeshPhysicalMaterial({ ...P, clearcoat: m.k, clearcoatRoughness: 0.08 }) : new THREE.MeshStandardMaterial(P);
  return (matCache[key] = mm);
}
const geoCache = {};
function piece(name) {
  const d = MESHES[name]; if (!d) return null;
  if (!geoCache[name]) {
    geoCache[name] = d.g.map((g) => {
      const q = b64(g.p, Int16Array), n = b64(g.n, Int8Array), idx = b64(g.i, Uint16Array);
      const pos = new Float32Array(q.length), nor = new Float32Array(q.length);
      for (let i = 0; i < q.length; i += 3) {
        const bx = d.lo[0] + (q[i] + 32768) / 65535 * (d.hi[0] - d.lo[0]);
        const by = d.lo[1] + (q[i + 1] + 32768) / 65535 * (d.hi[1] - d.lo[1]);
        const bz = d.lo[2] + (q[i + 2] + 32768) / 65535 * (d.hi[2] - d.lo[2]);
        pos[i] = bx; pos[i + 1] = bz; pos[i + 2] = -by;           // Blender z-up -> three y-up, front (-y) -> +z
        nor[i] = n[i] / 127; nor[i + 1] = n[i + 2] / 127; nor[i + 2] = -n[i + 1] / 127;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeBoundingSphere();
      return { geo, mat: material(g.mat) };
    });
  }
  const grp = new THREE.Group();
  for (const g of geoCache[name]) { const m = new THREE.Mesh(g.geo, g.mat); m.castShadow = true; m.receiveShadow = true; grp.add(m); }
  return grp;
}
function roundedDie() {
  const geo = new THREE.BoxGeometry(1, 1, 1, 7, 7, 7), p = geo.attributes.position, r = 0.16, v = new THREE.Vector3(), q = new THREE.Vector3();
  const nrm = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    q.set(Math.max(-0.5 + r, Math.min(0.5 - r, v.x)), Math.max(-0.5 + r, Math.min(0.5 - r, v.y)), Math.max(-0.5 + r, Math.min(0.5 - r, v.z)));
    const n = v.clone().sub(q); if (n.lengthSq() < 1e-9) n.set(0, 1, 0); n.normalize();
    v.copy(q).addScaledVector(n, r); p.setXYZ(i, v.x, v.y, v.z); nrm[i * 3] = n.x; nrm[i * 3 + 1] = n.y; nrm[i * 3 + 2] = n.z;
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  // BoxGeometry groups: +x, -x, +y, -y, +z, -z = 3, 4, 1, 6, 2, 5 (opposite faces sum to 7)
  const mats = [3, 4, 1, 6, 2, 5].map((n) => new THREE.MeshStandardMaterial({ map: dieFace(n), roughness: 0.32, metalness: 0 }));
  const m = new THREE.Mesh(geo, mats); m.castShadow = true; m.receiveShadow = true;
  return m;
}
const FACE_N = { 1: [0, 1, 0], 6: [0, -1, 0], 3: [1, 0, 0], 4: [-1, 0, 0], 2: [0, 0, 1], 5: [0, 0, -1] };
function topQuat(v, yaw) {
  const n = new THREE.Vector3(...FACE_N[v]);
  const q = new THREE.Quaternion().setFromUnitVectors(n, new THREE.Vector3(0, 1, 0));
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiply(q);
}

// ---------- environment (soft studio light for the metal tokens) ----------
function envMap() {
  const pm = new THREE.PMREMGenerator(B3.renderer), sc = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: 0x9a8670 }));
  sc.add(sky);
  const panel = (c, x, y, z, s) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m); };
  panel(0xfff0d0, -4, 7, -3, 6); panel(0xc8d8ff, 6, 3, 6, 5); panel(0xffd9a0, 0, 2, 9, 7); panel(0x553a24, 0, -8, 0, 16);
  const t = pm.fromScene(sc, 0.02).texture; pm.dispose();
  return t;
}

// ---------- build ----------
export function init(host, theme) {
  const cv = document.createElement('canvas'); cv.className = 'board3d';
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }); }
  catch (e) { B3.reason = 'context'; return false; }
  B3.renderer = renderer; B3.canvas = cv;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; // r186: PCF filters over shadow.radius (soft edges); PCFSoftShadowMap is gone
  const scene = new THREE.Scene(); B3.scene = scene;
  scene.environment = envMap(); scene.environmentIntensity = 0.55;
  B3.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  // lights: warm lamp from the upper left (screen), cool fill, warm bounce
  B3.hemi = new THREE.HemisphereLight(0xfff1dc, 0x3a2410, 0.55); scene.add(B3.hemi);
  // the table lamp: a warm spot from the upper left whose soft-edged pool lights the board and fades on the table
  const key = new THREE.SpotLight(0xfff0d8, 3.2, 0, 0.62, 0.85, 0); key.position.set(-5.5, 16, -3.5); key.target.position.set(0.3, 0, 0.8);
  key.castShadow = true; const sm = Math.min(window.innerWidth, window.innerHeight) < 600 ? 1024 : 2048; key.shadow.mapSize.set(sm, sm); key.shadow.camera.near = 6; key.shadow.camera.far = 32;
  key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  scene.add(key); scene.add(key.target); B3.key = key;
  B3.fill = new THREE.DirectionalLight(0xcfe0ff, 0.45); B3.fill.position.set(7, 6, 9); scene.add(B3.fill);
  // table and board
  B3.table = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0 }));
  B3.table.rotation.x = -Math.PI / 2; B3.table.receiveShadow = true; scene.add(B3.table);
  B3.texCanvas = R.view.cv;
  B3.boardTex = canvasTex(B3.texCanvas);
  B3.boardTex.minFilter = THREE.LinearMipmapLinearFilter; B3.boardTex.generateMipmaps = true;
  B3.top = new THREE.MeshPhysicalMaterial({ map: B3.boardTex, roughness: 0.72, metalness: 0, clearcoat: 0.32, clearcoatRoughness: 0.3 });
  B3.edge = new THREE.MeshStandardMaterial({ roughness: 0.7 });
  const under = new THREE.MeshStandardMaterial({ color: 0x2a2018 });
  BD = BW * VH() / VW();
  B3.board = new THREE.Mesh(new THREE.BoxGeometry(BW, TOP, BD), [B3.edge, B3.edge, B3.top, under, B3.edge, B3.edge]);
  B3.board.position.y = TOP / 2; B3.board.castShadow = true; B3.board.receiveShadow = true; scene.add(B3.board);
  // pieces
  B3.tokens = TOKENS.map((T) => { const g = piece('tok-' + T.shape) || new THREE.Group(); g.visible = false; scene.add(g); return g; });
  B3.dice = [roundedDie(), roundedDie()]; B3.dice.forEach((d) => scene.add(d));
  B3.bld = []; // pooled building meshes
  B3.ring = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.01, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  scene.add(B3.ring);
  // overlay for money pops and coins
  const ov = document.createElement('canvas'); ov.className = 'board3d-ov'; B3.overlay = ov; B3.octx = ov.getContext('2d');
  host.append(cv, ov);
  setTheme(theme);
  B3.on = true;
  return true;
}

export function destroy() {
  if (!B3.renderer) return;
  B3.renderer.dispose(); B3.renderer.forceContextLoss?.();
  B3.canvas?.remove(); B3.overlay?.remove();
  Object.assign(B3, { on: false, renderer: null, scene: null, texKey: '' });
}

export function setTheme(theme) {
  if (!B3.renderer) return;
  const dark = theme === 'dark';
  B3.dark = dark;
  B3.table.material.map?.dispose(); B3.table.material.map = tableTexture(dark);
  B3.table.material.map.wrapS = B3.table.material.map.wrapT = THREE.RepeatWrapping; B3.table.material.map.repeat.set(1.6, 1.6);
  B3.table.material.needsUpdate = true;
  B3.edge.map?.dispose(); B3.edge.map = edgeTexture(dark); B3.edge.needsUpdate = true;
  B3.key.intensity = dark ? 1.7 : 3.2; B3.key.color.set(dark ? 0xd8e4ff : 0xfff0d8); B3.key.angle = dark ? 0.5 : 0.62;
  B3.hemi.intensity = dark ? 0.22 : 0.42; B3.fill.intensity = dark ? 0.7 : 0.45; B3.fill.color.set(dark ? 0x7fb4ff : 0xcfe0ff);
  B3.renderer.toneMappingExposure = dark ? 1.05 : 1.0;
  B3.scene.environmentIntensity = dark ? 0.35 : 0.55;
  B3.texKey = '';
}

// ---------- layout and camera ----------
export function resize(w, h, dpr) {
  B3.W = w; B3.H = h; B3.dpr = dpr;
  B3.renderer.setPixelRatio(dpr); B3.renderer.setSize(w, h, false);
  B3.canvas.style.width = w + 'px'; B3.canvas.style.height = h + 'px';
  B3.overlay.width = Math.round(w * dpr); B3.overlay.height = Math.round(h * dpr);
  B3.overlay.style.width = w + 'px'; B3.overlay.style.height = h + 'px';
  B3.camera.aspect = w / h; B3.camera.fov = h > w * 1.02 ? 24 : 26; B3.camera.updateProjectionMatrix();
  const tall = h > w * 1.02;
  TILT = tall ? 0.12 : 0.38; MARGIN = tall ? 0.012 : 0.03;
  // seen from almost overhead, the varnish would mirror the lamp across the map: keep the sheen low on phones
  B3.top.clearcoat = tall ? 0.1 : 0.32; B3.top.roughness = tall ? 0.8 : 0.72;
  B3.overview = overviewPose();
  settleFrom();
}
let TILT = 0.38, MARGIN = 0.03; // camera pitch from straight down (radians); flatter on phones, where the board must fill the width
// The board face changed size (render.js view resized): reshape the slab to the face's aspect and re-upload the face.
export function setFace() {
  if (!B3.board) return;
  const d = BW * VH() / VW();
  if (Math.abs(d - BD) > 1e-4) { BD = d; B3.board.geometry.dispose(); B3.board.geometry = new THREE.BoxGeometry(BW, TOP, BD); }
  const old = B3.boardTex; B3.boardTex = canvasTex(B3.texCanvas);
  B3.boardTex.minFilter = THREE.LinearMipmapLinearFilter; B3.boardTex.generateMipmaps = true;
  B3.top.map = B3.boardTex; B3.top.needsUpdate = true; old.dispose();
  B3.texKey = '';
  if (B3.W) { B3.overview = overviewPose(); settleFrom(); }
}
// After a layout change the camera glides from where it is to the new goal; only the very first layout places it.
function settleFrom() { if (!B3.cam.cur) B3.cam.cur = { ...restPose(B3.lastS) }; B3.cam.settled = false; }
function poseAt(tx, tz, dist) { return { tx, tz, dist }; }
function applyPose(p) {
  const c = B3.camera;
  c.position.set(p.tx, Math.cos(TILT) * p.dist, p.tz + Math.sin(TILT) * p.dist);
  c.lookAt(p.tx, 0, p.tz); c.updateMatrixWorld();
}
function fits(p) {
  applyPose(p);
  const v = new THREE.Vector3(), m = MARGIN;
  for (const [x, y, z] of [[-BW / 2, TOP, -BD / 2], [BW / 2, TOP, -BD / 2], [-BW / 2, 0, BD / 2], [BW / 2, 0, BD / 2], [0, 1.0, -BD / 2]]) {
    v.set(x, y, z).project(B3.camera);
    if (Math.abs(v.x) > 1 - m || Math.abs(v.y) > 1 - m) return false;
  }
  return true;
}
function overviewPose() {
  let lo = 5, hi = 80;
  for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (fits(poseAt(0, 0.35, mid))) hi = mid; else lo = mid; }
  return poseAt(0, 0.35, hi);
}
// Zoom in on baron k's token and keep it centred while it moves; unfocus() glides back to the rest pose.
export function track(k, zoom = 0.62) {
  if (!B3.overview) return;
  if (!B3.follow || B3.follow.k !== k) B3.follow = { k, zoom, t0: performance.now(), vx: 0, vz: 0, prev: null }; else B3.follow.zoom = zoom;
  B3.cam.settled = false;
}
export function unfocus() { if (!B3.overview) return; B3.follow = null; B3.cam.settled = false; }
// Close-up mode (default on phones): at rest the camera frames the current baron's corner of the board, so names
// read at full size; the board-view button switches to the whole-board overview.
export function setCloseUp(on) { B3.closeUp = !!on; B3.cam.settled = false; }
function restPose(s) {
  const o = B3.overview; if (!B3.closeUp || !s || !o) return o;
  const p = s.players[s.turn]; if (!p) return o;
  const q = R.slot(p.pos, s.turn);
  return clampPose(poseAt(wx(q.x), wz(q.y), o.dist * 0.66));
}
// Slides a pose so the board fills the whole view (no table showing past its edges), keeping the zoom.
const corner = new THREE.Vector3(), cray = new THREE.Raycaster();
function clampPose(p) {
  const out = { ...p }, lim = BW / 2 - 0.02, limz = BD / 2 - 0.02;
  for (let it = 0; it < 4; it++) {
    applyPose(out);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      cray.setFromCamera(new THREE.Vector2(sx, sy), B3.camera);
      if (!cray.ray.intersectPlane(plane, corner)) continue;
      x0 = Math.min(x0, corner.x); x1 = Math.max(x1, corner.x); z0 = Math.min(z0, corner.z); z1 = Math.max(z1, corner.z);
    }
    let dx = 0, dz = 0;
    if (x1 - x0 > 2 * lim) dx = -(x0 + x1) / 2; else if (x0 < -lim) dx = -lim - x0; else if (x1 > lim) dx = lim - x1;
    if (z1 - z0 > 2 * limz) dz = -(z0 + z1) / 2; else if (z0 < -limz) dz = -limz - z0; else if (z1 > limz) dz = limz - z1;
    if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) break;
    out.tx += dx; out.tz += dz;
  }
  return out;
}
// Where the camera wants to be this frame: centred on the followed token (wherever it is mid-hop), else at rest.
function camGoal(s) {
  const f = B3.follow, o = B3.overview;
  if (f && s && s.players[f.k]) { const q = R.view.tokens[f.k] || R.slot(s.players[f.k].pos, f.k); return poseAt(wx(q.x), wz(q.y), o.dist * f.zoom); }
  return restPose(s);
}
// The camera chases its goal on a critically damped spring (no fixed-length tween), so it can zoom in, track a moving
// token and zoom back out, re-targeting at any moment without a jump in position or speed.
function damp(c, g, v, key, T, dt) {
  const w = 2 / T, x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const d = c[key] - g[key], t = (v[key] + w * d) * dt;
  v[key] = (v[key] - w * t) * e; c[key] = g[key] + (d + t) * e;
}
function stepCam(s, now) {
  // after a pause with no frames drawn, the first step is one frame long, not the whole gap
  const c = B3.cam, g = camGoal(s), gap = now - (c.last || 0), dt = gap < 100 ? Math.min(0.05, Math.max(0, gap / 1000)) : 1 / 60; c.last = now;
  if (!g) return;
  if (!c.cur || B3.instant) { c.cur = { ...g }; c.vel = { tx: 0, tz: 0, dist: 0 }; c.settled = true; return; }
  const f = B3.follow;
  // tracking: start with a gentle pan, then hold the token close to centre; returning: a slower glide out
  const tp = f ? 0.24 - 0.16 * Math.min(1, (now - f.t0) / 600) : 0.4, tz = f ? 0.3 : 0.42;
  // aim a little ahead of a moving token (by its smoothed speed) so the spring's lag does not leave it off-centre
  if (f && dt > 0) {
    if (f.prev && gap < 100) { const a = Math.min(1, dt / 0.06); f.vx += ((g.tx - f.prev.tx) / dt - f.vx) * a; f.vz += ((g.tz - f.prev.tz) / dt - f.vz) * a; }
    f.prev = { tx: g.tx, tz: g.tz }; g.tx += f.vx * tp; g.tz += f.vz * tp;
  }
  if (dt > 0) { damp(c.cur, g, c.vel, 'tx', tp, dt); damp(c.cur, g, c.vel, 'tz', tp, dt); damp(c.cur, g, c.vel, 'dist', tz, dt); }
  const near = Math.abs(c.cur.tx - g.tx) < 1e-3 && Math.abs(c.cur.tz - g.tz) < 1e-3 && Math.abs(c.cur.dist - g.dist) < 2e-3;
  const still = Math.abs(c.vel.tx) < 1e-2 && Math.abs(c.vel.tz) < 1e-2 && Math.abs(c.vel.dist) < 2e-2;
  if (near && still) { c.cur = { ...g }; c.vel = { tx: 0, tz: 0, dist: 0 }; c.settled = true; } else c.settled = false;
}
export function camBusy() { return B3.on && !B3.cam.settled; }

// ---------- per-frame sync ----------
function texKey(s) {
  const v = R.view;
  return [v.theme, v.cacheKey, v.flash, v.cursor, v.hiOwner, s ? JSON.stringify(s.lots) : '', s && s.month, s && s.year, s && s.headline && s.headline.id, s && s.treasury, s && s.round, s && s.mods && JSON.stringify(s.mods)].join('|');
}
function place(obj, px, py, lift = 0) { obj.position.set(wx(px), TOP + lift, wz(py)); }

export function render(s) {
  if (!B3.on) return;
  const now = performance.now(), t0 = now;
  const v = R.view;
  // board face
  const key = texKey(s);
  if (key !== B3.texKey) { R.draw(s); B3.boardTex.needsUpdate = true; B3.texKey = key; }
  // tokens
  const tokR = R.tokenR(), tokScale = len(tokR) / 0.54 * 1.3;
  B3.tokens.forEach((g) => { g.visible = false; });
  B3.ring.visible = false;
  if (s) {
    s.players.forEach((p, k) => {
      if (p.out) return;
      const g = B3.tokens[p.token]; if (!g) return;
      const pos = v.tokens[k] || R.slot(p.pos, k), lift = len(pos.lift || 0);
      g.visible = true; place(g, pos.x, pos.y, lift);
      const sq = pos.squash || 0, sc = tokScale * (k === s.turn ? 1.08 : 1);
      g.scale.set(sc * (1 + sq * 0.5), sc * (1 - sq), sc * (1 + sq * 0.5));
      if (k === s.turn && !v.tokens[k]) { B3.ring.visible = true; place(B3.ring, pos.x, pos.y, 0.004); const rr = tokScale * 0.68; B3.ring.scale.set(rr, 1, rr); B3.ring.material.color.set(TOKENS[p.token].color); }
    });
    syncBuildings(s, now);
  }
  syncDice();
  B3.lastS = s;
  if (s && !B3.dark && B3.season !== s.month) { B3.season = s.month; const k = (1 - Math.cos((s.month - 0.5) / 12 * Math.PI * 2)) / 2; B3.key.color.setRGB(1, 0.9 + 0.06 * (1 - k), 0.76 + 0.14 * (1 - k)); }
  stepCam(s, now); applyPose(B3.cam.cur || B3.overview);
  B3.renderer.render(B3.scene, B3.camera);
  drawOverlay();
  // watchdog: sustained slow frames switch to the 2D board (main.js decides)
  const dt = performance.now() - t0; B3.frames.push(dt); if (B3.frames.length > 90) B3.frames.shift();
}
export function slowFrames() { if (B3.frames.length < 60) return false; const a = B3.frames.slice().sort((x, y) => x - y); return a[a.length >> 1] > 34; }

function syncBuildings(s, now) {
  let n = 0;
  const want = [];
  for (let i = 0; i < SPACES.length; i++) {
    const lot = s.lots[i]; if (!lot || lot.level <= 0) continue;
    const spots = R.buildingSpots(i, lot.level), dr = R.view.drop[i];
    spots.forEach((p, k) => {
      const name = lot.level === 4 ? 'bld-resort' : ['bld-hale', 'bld-ozark', 'bld-quapaw'][k];
      let lift = 0;
      if (dr && (lot.level === 4 || k === lot.level - 1)) { const q = Math.min(1, (now - dr.t0) / dr.dur); lift = (1 - bounce(q)) * 0.9; }
      want.push({ name, x: p.x, y: p.y, lift, side: R.rect(i).side });
    });
  }
  // pool by name
  const pool = B3.bld;
  pool.forEach((o) => { o.used = false; });
  for (const w of want) {
    let o = pool.find((q) => !q.used && q.name === w.name);
    if (!o) { const g = piece(w.name); if (!g) continue; o = { name: w.name, g }; B3.scene.add(g); pool.push(o); }
    o.used = true; o.g.visible = true;
    const side = w.side === 'l' || w.side === 'r';
    const sc = w.name === 'bld-resort' ? (side ? 0.3 : 0.36) : side ? 0.27 : 0.29;
    place(o.g, w.x, w.y, w.lift); o.g.scale.setScalar(sc);
    o.g.rotation.y = w.side === 'l' ? Math.PI / 2 : w.side === 'r' ? -Math.PI / 2 : 0;
    n++;
  }
  pool.forEach((o) => { if (!o.used) o.g.visible = false; });
  return n;
}
function bounce(x) { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; }

const tumbleQ = [...Array(12)].map((_, k) => new THREE.Quaternion().setFromEuler(new THREE.Euler(k * 1.7, k * 2.3, k * 0.9)));
function syncDice() {
  const D = R.view.dice, h = R.diceHome(), size = len(h.size);
  const pos = D.pos || [{ x: h.x - h.gap, y: h.y, lift: 0, rot: -0.12 }, { x: h.x + h.gap, y: h.y + h.gap * 0.15, lift: 0, rot: 0.18 }];
  B3.dice.forEach((m, k) => {
    const p = pos[k], v = k ? D.b : D.a, lift = len(p.lift || 0);
    m.scale.setScalar(size);
    place(m, p.x, p.y, size * 0.5 + lift);
    if (D.tumbling && lift > 0.002) m.quaternion.copy(tumbleQ[(D.frame + k * 5) % 12]).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), D.frame * 0.7));
    else m.quaternion.copy(topQuat(v, (p.rot || 0) * 0.6 + k * 0.3));
  });
}

// money: project board points to the overlay
function drawOverlay() {
  const g = B3.octx, dpr = B3.dpr; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, B3.overlay.width, B3.overlay.height);
  const v = R.view; if (!v.pops.length && !v.coins.length && !v.puffs.length) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  R.paintMoney(g, (x, y, lift) => screenOf(x, y, lift || 0), B3.W / VW() * 0.95);
}
const tmp = new THREE.Vector3();
export function screenOf(px, py, liftPx = 0) {
  tmp.set(wx(px), TOP + len(liftPx), wz(py)).project(B3.camera);
  return { x: (tmp.x + 1) / 2 * B3.W, y: (1 - tmp.y) / 2 * B3.H };
}
// Board point under a client position (for clicks), in board px; null off the board.
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOP), hitV = new THREE.Vector3();
export function boardPoint(cx, cy) {
  const r = B3.canvas.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), B3.camera);
  if (!ray.ray.intersectPlane(plane, hitV)) return null;
  const x = (hitV.x / BW + 0.5) * VW(), y = (hitV.z / BD + 0.5) * VH();
  return x >= 0 && y >= 0 && x < VW() && y < VH() ? { x, y } : null;
}
