// Canvas board. The static layer (spaces, bands, icons, names, prices, corners, center title) is
// cached per size/DPR/theme; the dynamic layer (owners, buildings, season badges, tokens, dice,
// calendar, headline, cursor) is redrawn on demand. Render-on-demand per LESSONS (wave 1).
import { SPACES, DISTRICTS, MONTHS, TOKENS, CARD, SEASONS, isRow } from './data.js';
import { seasonsNow, multFor, rentOf } from './engine.js';

export const view = {
  cv: null, ctx: null, W: 0, H: 0, dpr: 1, ux: 0, uy: 0, theme: 'light',
  cache: null, cacheKey: '', cursor: -1, flash: -1, flashT: 0, pops: [],
  tokens: [], // display positions: { x, y } per player (animated)
  dice: { a: 1, b: 1, tumbling: 0 },
};

const TH = {
  light: { bg: '#E6D7B5', mortar: '#D3C29C', space: '#FBF8F1', line: '#9C8B6B', text: '#1F2A24', muted: '#5A4C38', center: '#EFE6CF', accent: '#355E41', red: '#A9432C', brass: '#B8862B', ring: '#355E41', cursor: '#1F2A24' },
  dark: { bg: '#14121F', mortar: '#221E33', space: '#24203A', line: '#4A4466', text: '#E3DACA', muted: '#ABA5B3', center: '#1A1729', accent: '#D4AF37', red: '#FF6B6B', brass: '#D4AF37', ring: '#4FC3FF', cursor: '#4FC3FF' },
};

export function setCanvas(cv) { view.cv = cv; view.ctx = cv.getContext('2d'); }

export function resize(w, h, dpr) {
  view.W = Math.floor(w); view.H = Math.floor(h); view.dpr = dpr;
  view.cv.width = Math.round(view.W * dpr); view.cv.height = Math.round(view.H * dpr);
  view.cv.style.width = view.W + 'px'; view.cv.style.height = view.H + 'px';
  view.ux = view.W / 10; view.uy = view.H / 10;
}

// Space rectangle and which side it sits on. Index 0 is the bottom-right corner; play runs
// clockwise: left along the bottom, up the left side, right along the top, down the right side.
export function rect(i) {
  const { W, H, ux, uy } = view, cw = 1.5 * ux, ch = 1.5 * uy;
  if (i === 0) return { x: W - cw, y: H - ch, w: cw, h: ch, side: 'c' };
  if (i < 8) return { x: W - cw - i * ux, y: H - ch, w: ux, h: ch, side: 'b' };
  if (i === 8) return { x: 0, y: H - ch, w: cw, h: ch, side: 'c' };
  if (i < 16) return { x: 0, y: H - ch - (i - 8) * uy, w: cw, h: uy, side: 'l' };
  if (i === 16) return { x: 0, y: 0, w: cw, h: ch, side: 'c' };
  if (i < 24) return { x: cw + (i - 17) * ux, y: 0, w: ux, h: ch, side: 't' };
  if (i === 24) return { x: W - cw, y: 0, w: cw, h: ch, side: 'c' };
  return { x: W - cw, y: ch + (i - 25) * uy, w: cw, h: uy, side: 'r' };
}
export function hit(x, y) { for (let i = 0; i < SPACES.length; i++) { const r = rect(i); if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i; } return -1; }
export function center(i) { const r = rect(i); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }

// Band (district color strip) on the inner side of a space.
function band(r) {
  const tb = 0.27 * view.uy, lr = 0.27 * view.ux;
  if (r.side === 'b') return { x: r.x, y: r.y, w: r.w, h: tb };
  if (r.side === 't') return { x: r.x, y: r.y + r.h - tb, w: r.w, h: tb };
  if (r.side === 'l') return { x: r.x + r.w - lr, y: r.y, w: lr, h: r.h };
  return { x: r.x, y: r.y, w: lr, h: r.h };
}
// Content box: the part of the space outside the band.
export const stripW = () => Math.max(9, Math.min(view.ux, view.uy) * 0.15);
function body(r) {
  const b = band(r), o = stripW();
  if (r.side === 'b') return { x: r.x, y: r.y + b.h, w: r.w, h: r.h - b.h - o };
  if (r.side === 't') return { x: r.x, y: r.y + o, w: r.w, h: r.h - b.h - o };
  if (r.side === 'l') return { x: r.x + o, y: r.y, w: r.w - b.w - o, h: r.h };
  if (r.side === 'r') return { x: r.x + b.w, y: r.y, w: r.w - b.w - o, h: r.h };
  return r;
}

// ---------- primitives ----------
function font(px, weight = 600, fam = 'deco') {
  const f = fam === 'serif' ? '"Palatino Linotype","Book Antiqua",Palatino,Georgia,serif' : fam === 'sans' ? 'system-ui,"Segoe UI",Roboto,Arial,sans-serif' : '"Century Gothic",Futura,"Avenir Next","Trebuchet MS",sans-serif';
  return `${weight} ${px}px ${f}`;
}
// Draws text centered at (x, y), shrinking to fit maxW (down to minPx).
function fitText(ctx, t, x, y, maxW, px, minPx = 7, weight = 600, fam = 'deco') {
  let s = px;
  ctx.font = font(s, weight, fam);
  while (s > minPx && ctx.measureText(t).width > maxW) { s -= 0.5; ctx.font = font(s, weight, fam); }
  ctx.fillText(t, x, y);
  return s;
}
function wrapLines(ctx, text, maxW, px, weight, fam, maxLines = 2) {
  ctx.font = font(px, weight, fam);
  const words = text.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { const rest = lines.splice(maxLines - 1); lines.push(rest.join(' ')); }
  return lines;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

function pattern(ctx, b, pat) {
  ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(1, Math.min(b.w, b.h) * 0.09);
  const s = Math.max(5, Math.min(b.w, b.h) * 0.45), x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h;
  ctx.beginPath();
  if (pat === 'wood') { for (let y = y0 + s / 2; y < y1; y += s) { ctx.moveTo(x0, y); for (let x = x0; x <= x1; x += s / 2) ctx.quadraticCurveTo(x + s / 4, y + s * 0.25 * ((x / s) % 2 ? 1 : -1), x + s / 2, y); } ctx.stroke(); }
  else if (pat === 'scales') { for (let y = y0; y < y1 + s; y += s * 0.6) for (let x = x0 + ((y / s) % 2 ? s / 2 : 0); x < x1 + s; x += s) { ctx.moveTo(x + s / 2, y); ctx.arc(x, y, s / 2, 0, Math.PI); } ctx.stroke(); }
  else if (pat === 'diamond') { for (let k = -b.h; k < b.w + b.h; k += s) { ctx.moveTo(x0 + k, y0); ctx.lineTo(x0 + k + b.h, y1); ctx.moveTo(x0 + k + b.h, y0); ctx.lineTo(x0 + k, y1); } ctx.stroke(); }
  else if (pat === 'stripes') { for (let k = -b.h; k < b.w + b.h; k += s * 0.8) { ctx.moveTo(x0 + k, y1); ctx.lineTo(x0 + k + b.h, y0); } ctx.lineWidth *= 1.6; ctx.stroke(); }
  else if (pat === 'brick') { let row = 0; for (let y = y0; y < y1; y += s * 0.5, row++) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); for (let x = x0 + (row % 2) * s / 2; x < x1; x += s) { ctx.moveTo(x, y); ctx.lineTo(x, y + s * 0.5); } } ctx.stroke(); }
  else if (pat === 'chevron') { for (let y = y0 - s; y < y1 + s; y += s * 0.7) { ctx.moveTo(x0, y); for (let x = x0; x < x1 + s; x += s) { ctx.lineTo(x + s / 2, y + s * 0.4); ctx.lineTo(x + s, y); } } ctx.stroke(); }
  else if (pat === 'sunburst') { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.max(b.w, b.h); for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) { ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); } ctx.stroke(); }
  else if (pat === 'tile') { for (let y = y0; y < y1 + s; y += s * 0.55) for (let x = x0 + ((Math.round((y - y0) / (s * 0.55))) % 2 ? s / 2 : 0); x < x1 + s; x += s) { ctx.moveTo(x - s / 2, y); ctx.arc(x, y, s / 2, Math.PI, 0, true); } ctx.stroke(); }
  ctx.restore();
}

// District and space icons, drawn in a size×size box centered at (x, y).
export function icon(ctx, kind, x, y, size, color) {
  const s = size / 2;
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1.2, size * 0.09); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (kind) {
    case 'cabin': ctx.moveTo(-s * .85, -s * .05); ctx.lineTo(0, -s * .8); ctx.lineTo(s * .85, -s * .05); ctx.moveTo(-s * .65, -s * .2); ctx.lineTo(-s * .65, s * .75); ctx.lineTo(s * .65, s * .75); ctx.lineTo(s * .65, -s * .2); ctx.moveTo(-s * .65, s * .2); ctx.lineTo(s * .65, s * .2); ctx.moveTo(-s * .65, s * .48); ctx.lineTo(s * .65, s * .48); ctx.stroke(); break;
    case 'gator': ctx.moveTo(-s * .95, s * .1); ctx.quadraticCurveTo(-s * .4, -s * .45, s * .3, -s * .2); ctx.lineTo(s * .95, -s * .25); ctx.lineTo(s * .35, s * .05); ctx.quadraticCurveTo(-s * .3, s * .45, -s * .95, s * .1); ctx.stroke(); ctx.beginPath(); ctx.arc(s * .2, -s * .3, s * .09, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-s * .5, s * .25); ctx.lineTo(-s * .6, s * .6); ctx.moveTo(0, s * .25); ctx.lineTo(s * .05, s * .6); ctx.stroke(); break;
    case 'ball': ctx.arc(0, 0, s * .78, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(-s * 1.15, 0, s * .75, -0.75, 0.75); ctx.stroke(); ctx.beginPath(); ctx.arc(s * 1.15, 0, s * .75, Math.PI - 0.75, Math.PI + 0.75); ctx.stroke(); break;
    case 'car': rr(ctx, -s * .9, -s * .15, s * 1.8, s * .55, s * .15); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * .5, -s * .15); ctx.lineTo(-s * .3, -s * .55); ctx.lineTo(s * .35, -s * .55); ctx.lineTo(s * .55, -s * .15); ctx.stroke(); ctx.beginPath(); ctx.arc(-s * .5, s * .45, s * .2, 0, 7); ctx.arc(s * .5, s * .45, s * .2, 0, 7); ctx.fill(); break;
    case 'note': ctx.moveTo(-s * .3, s * .5); ctx.lineTo(-s * .3, -s * .7); ctx.lineTo(s * .55, -s * .85); ctx.lineTo(s * .55, s * .35); ctx.stroke(); ctx.beginPath(); ctx.ellipse(-s * .5, s * .55, s * .25, s * .18, -0.4, 0, 7); ctx.ellipse(s * .35, s * .4, s * .25, s * .18, -0.4, 0, 7); ctx.fill(); break;
    case 'dice': rr(ctx, -s * .75, -s * .75, s * 1.5, s * 1.5, s * .25); ctx.stroke(); ctx.beginPath(); for (const [a, b] of [[-.38, -.38], [0, 0], [.38, .38]]) { ctx.moveTo(a * s + s * .12, b * s); ctx.arc(a * s, b * s, s * .12, 0, 7); } ctx.fill(); break;
    case 'key': ctx.arc(-s * .45, 0, s * .32, 0, 7); ctx.moveTo(-s * .13, 0); ctx.lineTo(s * .9, 0); ctx.moveTo(s * .6, 0); ctx.lineTo(s * .6, s * .3); ctx.moveTo(s * .85, 0); ctx.lineTo(s * .85, s * .25); ctx.stroke(); break;
    case 'steam': for (const dx of [-.45, 0, .45]) { ctx.moveTo(dx * s, s * .45); ctx.bezierCurveTo(dx * s - s * .3, s * .1, dx * s + s * .3, -s * .2, dx * s, -s * .6); } ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * .85, s * .65); ctx.lineTo(s * .85, s * .65); ctx.stroke(); break;
    case 'train': rr(ctx, -s * .8, -s * .5, s * 1.3, s * .85, s * .1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(s * .5, -s * .1); ctx.lineTo(s * .9, s * .35); ctx.moveTo(-s * .55, -s * .5); ctx.lineTo(-s * .55, -s * .85); ctx.stroke(); ctx.beginPath(); ctx.arc(-s * .45, s * .55, s * .2, 0, 7); ctx.arc(s * .2, s * .55, s * .2, 0, 7); ctx.fill(); break;
    case 'tram': rr(ctx, -s * .75, -s * .45, s * 1.5, s * .9, s * .2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -s * .45); ctx.lineTo(0, -s * .9); ctx.moveTo(-s * .4, -s * .9); ctx.lineTo(s * .4, -s * .9); ctx.moveTo(-s * .5, -s * .1); ctx.lineTo(s * .5, -s * .1); ctx.stroke(); ctx.beginPath(); ctx.arc(-s * .4, s * .6, s * .17, 0, 7); ctx.arc(s * .4, s * .6, s * .17, 0, 7); ctx.fill(); break;
    case 'drop': ctx.moveTo(0, -s * .9); ctx.bezierCurveTo(s * .8, 0, s * .6, s * .8, 0, s * .8); ctx.bezierCurveTo(-s * .6, s * .8, -s * .8, 0, 0, -s * .9); ctx.stroke(); break;
    case 'coin': ctx.arc(0, 0, s * .75, 0, 7); ctx.stroke(); ctx.font = font(s * 1.05, 800, 'serif'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, s * .05); break;
    case 'talk': ctx.moveTo(-s * .8, -s * .55); ctx.lineTo(s * .8, -s * .55); ctx.lineTo(s * .8, s * .3); ctx.lineTo(-s * .1, s * .3); ctx.lineTo(-s * .5, s * .75); ctx.lineTo(-s * .45, s * .3); ctx.lineTo(-s * .8, s * .3); ctx.closePath(); ctx.stroke(); ctx.font = font(s * .8, 800, 'serif'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, -s * .1); break;
    case 'gavel': ctx.save(); ctx.rotate(-0.6); rr(ctx, -s * .55, -s * .6, s * 1.1, s * .45, s * .1); ctx.fill(); ctx.fillRect(-s * .08, -s * .2, s * .16, s * 1.05); ctx.restore(); ctx.fillRect(-s * .8, s * .65, s * 1.0, s * .18); break;
    case 'tub': ctx.moveTo(-s * .9, -s * .05); ctx.lineTo(s * .9, -s * .05); ctx.quadraticCurveTo(s * .8, s * .65, 0, s * .65); ctx.quadraticCurveTo(-s * .8, s * .65, -s * .9, -s * .05); ctx.stroke(); ctx.beginPath(); for (const dx of [-.35, .15]) { ctx.moveTo(dx * s, -s * .25); ctx.bezierCurveTo(dx * s - s * .2, -s * .45, dx * s + s * .2, -s * .6, dx * s, -s * .9); } ctx.stroke(); break;
    case 'rail': ctx.moveTo(-s * .4, s * .9); ctx.lineTo(-s * .15, -s * .9); ctx.moveTo(s * .4, s * .9); ctx.lineTo(s * .15, -s * .9); for (let k = -0.7; k <= 0.8; k += 0.38) { ctx.moveTo(-s * (0.35 - k * 0.12) - s * 0.15, k * s); ctx.lineTo(s * (0.35 - k * 0.12) + s * 0.15, k * s); } ctx.stroke(); break;
    case 'arrow': ctx.moveTo(-s * .8, 0); ctx.lineTo(s * .7, 0); ctx.moveTo(s * .25, -s * .45); ctx.lineTo(s * .75, 0); ctx.lineTo(s * .25, s * .45); ctx.stroke(); break;
  }
  ctx.restore();
}
export const SPACE_ICON = (sp) => sp.type === 'lot' ? DISTRICTS[sp.d].icon : sp.type === 'line' ? (sp.i === 4 ? 'train' : 'tram') : sp.type === 'util' ? 'drop' : sp.type === 'tax' ? 'coin' : sp.type === 'talk' ? 'talk' : ({ depot: 'rail', jury: 'gavel', free: 'tub', gojury: 'gavel' })[sp.kind];

// Token shapes (also used for the DOM player cards).
export function drawToken(ctx, k, x, y, r, num) {
  const T = TOKENS[k];
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = T.color; ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.07); ctx.strokeStyle = '#1F2A24'; ctx.beginPath(); ctx.arc(0, 0, r + ctx.lineWidth * 1.5, 0, 7); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.2, r * 0.13); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const s = r * 0.62;
  ctx.beginPath();
  switch (T.shape) {
    case 'jug': ctx.moveTo(-s * .45, -s * .55); ctx.lineTo(s * .15, -s * .55); ctx.lineTo(s * .15, -s * .35); ctx.quadraticCurveTo(s * .75, -s * .2, s * .6, s * .4); ctx.quadraticCurveTo(s * .5, s * .8, -s * .1, s * .8); ctx.quadraticCurveTo(-s * .7, s * .8, -s * .7, s * .3); ctx.quadraticCurveTo(-s * .75, -s * .2, -s * .45, -s * .35); ctx.closePath(); ctx.fill(); break;
    case 'hat': ctx.fillRect(-s * .5, -s * .7, s, s * 1.15); ctx.fillRect(-s * .85, s * .38, s * 1.7, s * .3); break;
    case 'shoe': ctx.arc(0, -s * .05, s * .62, Math.PI * 0.82, Math.PI * 2.18); ctx.lineWidth = s * .38; ctx.stroke(); break;
    case 'parasol': ctx.moveTo(-s * .85, 0); ctx.quadraticCurveTo(0, -s * 1.1, s * .85, 0); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s * .7); ctx.quadraticCurveTo(0, s * .95, -s * .25, s * .8); ctx.stroke(); break;
    case 'fish': ctx.moveTo(-s * .8, 0); ctx.quadraticCurveTo(0, -s * .7, s * .45, 0); ctx.quadraticCurveTo(0, s * .7, -s * .8, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(s * .35, 0); ctx.lineTo(s * .85, -s * .4); ctx.lineTo(s * .85, s * .4); ctx.closePath(); ctx.fill(); break;
    case 'car': ctx.fillRect(-s * .75, -s * .45, s * 1.5, s * .85); ctx.fillRect(-s * .08, -s * .85, s * .16, s * .4); ctx.fillStyle = T.color; ctx.fillRect(-s * .55, -s * .3, s * .4, s * .3); ctx.fillRect(s * .15, -s * .3, s * .4, s * .3); break;
  }
  ctx.restore();
  if (num != null) {
    ctx.save(); const br = Math.max(5, r * 0.45);
    ctx.beginPath(); ctx.arc(x + r * 0.78, y - r * 0.78, br, 0, 7); ctx.fillStyle = '#1F2A24'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = font(Math.max(7, br * 1.35), 800, 'sans'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(num), x + r * 0.78, y - r * 0.76);
    ctx.restore();
  }
}
export function tokenCanvas(k, px, num) {
  const c = document.createElement('canvas'), d = Math.min(3, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(px * d); c.className = 'tokicon'; c.setAttribute('aria-hidden', 'true');
  const x = c.getContext('2d'); x.scale(d, d); drawToken(x, k, px * 0.44, px * 0.56, px * 0.36, num);
  return c;
}

// ---------- static layer ----------
function drawStatic() {
  const key = `${view.W}x${view.H}@${view.dpr}:${view.theme}`;
  if (view.cacheKey === key) return;
  const c = view.cache || (view.cache = document.createElement('canvas'));
  c.width = view.cv.width; c.height = view.cv.height;
  const ctx = c.getContext('2d'), t = TH[view.theme];
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  const { W, H, ux, uy } = view;
  // Board base: cream brick with mortar courses.
  ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = t.center; ctx.fillRect(1.5 * ux, 1.5 * uy, 7 * ux, 7 * uy);
  ctx.strokeStyle = t.mortar; ctx.lineWidth = 1;
  ctx.beginPath();
  const bh = Math.max(6, uy * 0.16);
  for (let y = 1.5 * uy, row = 0; y < 8.5 * uy; y += bh, row++) { ctx.moveTo(1.5 * ux, y); ctx.lineTo(8.5 * ux, y); for (let x = 1.5 * ux + (row % 2) * bh; x < 8.5 * ux; x += bh * 2) { ctx.moveTo(x, y); ctx.lineTo(x, y + bh); } }
  ctx.stroke();
  ctx.lineWidth = Math.max(2, ux * 0.05); ctx.strokeStyle = t.accent; ctx.strokeRect(1.5 * ux + ctx.lineWidth, 1.5 * uy + ctx.lineWidth, 7 * ux - ctx.lineWidth * 2, 7 * uy - ctx.lineWidth * 2);
  for (let i = 0; i < SPACES.length; i++) drawSpace(ctx, i, t);
  ctx.lineWidth = 2; ctx.strokeStyle = t.line; ctx.strokeRect(1, 1, W - 2, H - 2);
  view.cacheKey = key;
}

function drawSpace(ctx, i, t) {
  const sp = SPACES[i], r = rect(i), small = Math.min(view.ux, view.uy) < 55;
  ctx.fillStyle = t.space; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = t.line; ctx.lineWidth = 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (r.side === 'c') return drawCorner(ctx, sp, r, t, small);
  const bo = body(r);
  if (sp.type === 'lot') {
    const b = band(r), D = DISTRICTS[sp.d];
    ctx.fillStyle = D.color; ctx.fillRect(b.x, b.y, b.w, b.h); pattern(ctx, b, D.pat);
    ctx.strokeStyle = t.line; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  }
  // Layout inside the body: icon, name, price, stacked along the body's long axis.
  const vert = r.side === 'b' || r.side === 't';
  const pad = Math.max(2, Math.min(bo.w, bo.h) * 0.06);
  const iconSize = Math.min(bo.w, bo.h) * (vert ? 0.36 : 0.32);
  const namePx = Math.max(7.5, Math.min(view.ux, view.uy) * 0.155);
  const pricePx = Math.max(8, Math.min(view.ux, view.uy) * 0.16);
  const name = small ? sp.short : sp.name;
  const lines = wrapLines(ctx, name, bo.w - pad * 2, namePx, 700, 'deco', small ? 2 : 3);
  const price = sp.price ? `$${sp.price}` : sp.type === 'tax' ? 'Pay $100' : '';
  const lineH = namePx * 1.08;
  const blockH = iconSize + 3 + lines.length * lineH + (price ? pricePx * 1.3 : 0);
  let y = bo.y + Math.max(pad, (bo.h - blockH) / 2);
  const cx = bo.x + bo.w / 2;
  icon(ctx, SPACE_ICON(sp), cx, y + iconSize / 2, iconSize, sp.type === 'lot' ? DISTRICTS[sp.d].color : t.text);
  y += iconSize + 3;
  ctx.fillStyle = t.text;
  for (const ln of lines) { fitText(ctx, ln, cx, y + lineH / 2, bo.w - pad * 2, namePx, 6.5, 700); y += lineH; }
  if (price) { ctx.fillStyle = t.muted; fitText(ctx, isRow(i) ? `$${sp.price}` : price, cx, y + pricePx * 0.7, bo.w - pad * 2, pricePx, 6.5, 600, 'sans'); }
  if (isRow(i)) { ctx.fillStyle = t.muted; ctx.font = font(Math.max(6.5, pricePx * 0.7), 700, 'sans'); }
}

function drawCorner(ctx, sp, r, t, small) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, m = Math.min(r.w, r.h);
  const labels = { depot: ['THE DEPOT', 'Payday $150'], jury: ['GRAND JURY', 'ROOM'], free: ['FREE', 'BATHHOUSE'], gojury: ['SUMMONED', 'to the Grand Jury'] };
  const [a, b] = labels[sp.kind];
  const col = sp.kind === 'depot' ? t.accent : sp.kind === 'free' ? '#2B6C8F' : t.red;
  ctx.fillStyle = col; ctx.globalAlpha = 0.12; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.globalAlpha = 1;
  icon(ctx, SPACE_ICON(sp), cx, cy - m * 0.08, m * 0.36, col);
  ctx.fillStyle = t.text;
  fitText(ctx, a, cx, r.y + m * 0.16, r.w - 6, Math.max(8, m * 0.13), 7, 800);
  ctx.fillStyle = t.muted;
  fitText(ctx, b, cx, r.y + r.h - m * 0.16, r.w - 6, Math.max(7.5, m * 0.11), 6.5, 700);
  if (sp.kind === 'depot') { icon(ctx, 'arrow', cx - m * 0.05, r.y + r.h - m * 0.33, m * 0.24, col); }
}

// ---------- dynamic layer ----------
export function draw(s, opts = {}) {
  const ctx = view.ctx, t = TH[view.theme];
  if (!ctx || !view.W) return;
  drawStatic();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(view.cache, 0, 0);
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  drawCenter(ctx, s, t, opts);
  if (s) {
    for (let i = 0; i < SPACES.length; i++) if (s.lots[i]) drawOwnership(ctx, s, i, t);
    drawSeasonBadges(ctx, s, t);
    if (view.flash >= 0) { const r = rect(view.flash); ctx.lineWidth = 3; ctx.strokeStyle = t.brass; ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4); }
    drawTokens(ctx, s);
    drawPops(ctx, t);
  }
  if (view.cursor >= 0) { const r = rect(view.cursor); ctx.save(); ctx.setLineDash([6, 4]); ctx.lineWidth = 3; ctx.strokeStyle = t.cursor; ctx.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6); ctx.restore(); }
}

function drawOwnership(ctx, s, i, t) {
  const lot = s.lots[i], r = rect(i);
  if (lot.owner < 0) return;
  const T = TOKENS[s.players[lot.owner].token];
  const th = stripW();
  let o;
  if (r.side === 'b') o = { x: r.x, y: r.y + r.h - th, w: r.w, h: th };
  else if (r.side === 't') o = { x: r.x, y: r.y, w: r.w, h: th };
  else if (r.side === 'l') o = { x: r.x, y: r.y, w: th, h: r.h };
  else o = { x: r.x + r.w - th, y: r.y, w: th, h: r.h };
  ctx.fillStyle = T.color; ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.strokeStyle = '#1F2A24'; ctx.lineWidth = 1; ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
  // seat number in the strip, so ownership isn't color alone
  ctx.font = font(Math.max(7, th * 0.82), 900, 'sans'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#1F2A24'; ctx.fillStyle = '#fff';
  const tx = o.x + o.w / 2, ty = o.y + o.h / 2 + 0.5, lab = String(lot.owner + 1);
  ctx.strokeText(lab, tx, ty); ctx.fillText(lab, tx, ty);
  if (lot.mortgaged) {
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.fillStyle = view.theme === 'dark' ? 'rgba(10,10,20,.55)' : 'rgba(80,70,60,.38)'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let k = -r.h; k < r.w; k += 8) { ctx.moveTo(r.x + k, r.y + r.h); ctx.lineTo(r.x + k + r.h, r.y); } ctx.stroke();
    const m = Math.min(r.w, r.h); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1F2A24'; ctx.lineWidth = 3; ctx.font = font(Math.max(9, m * 0.3), 800, 'sans'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const c = center(i); ctx.strokeText('M', c.x, c.y); ctx.fillText('M', c.x, c.y);
    ctx.restore();
  }
  if (lot.level > 0) drawBuildings(ctx, i, lot.level, t);
}

function drawBuildings(ctx, i, level, t) {
  const r = rect(i), b = band(r), horiz = b.w > b.h;
  const sz = Math.min(horiz ? b.h : b.w, (horiz ? b.w : b.h) / 3.6) * 0.82;
  if (level === 4) {
    const w = horiz ? Math.min(b.w * 0.7, sz * 2.6) : sz * 1.1, h = horiz ? sz * 1.1 : Math.min(b.h * 0.7, sz * 2.6);
    const x = b.x + (b.w - w) / 2, y = b.y + (b.h - h) / 2;
    ctx.fillStyle = '#D9A23A'; ctx.strokeStyle = '#3A2A10'; ctx.lineWidth = 1.2; rr(ctx, x, y, w, h, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7E2F1F';
    if (horiz) { ctx.fillRect(x + w * 0.12, y + h * 0.15, w * 0.18, h * 0.7); ctx.fillRect(x + w * 0.7, y + h * 0.15, w * 0.18, h * 0.7); }
    else { ctx.fillRect(x + w * 0.15, y + h * 0.12, w * 0.7, h * 0.18); ctx.fillRect(x + w * 0.15, y + h * 0.7, w * 0.7, h * 0.18); }
    ctx.fillStyle = '#fff'; ctx.font = font(Math.max(7, sz * 0.62), 900, 'sans'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('R', x + w / 2, y + h / 2 + 0.5);
    return;
  }
  for (let k = 0; k < level; k++) {
    const x = horiz ? b.x + b.w * (k + 1) / (level + 1) - sz / 2 : b.x + (b.w - sz) / 2;
    const y = horiz ? b.y + (b.h - sz) / 2 : b.y + b.h * (k + 1) / (level + 1) - sz / 2;
    ctx.fillStyle = '#F2EFE8'; ctx.strokeStyle = '#3A2A10'; ctx.lineWidth = 1;
    ctx.fillRect(x, y + sz * 0.35, sz, sz * 0.65); ctx.strokeRect(x, y + sz * 0.35, sz, sz * 0.65);
    ctx.fillStyle = '#A9432C'; ctx.beginPath(); ctx.moveTo(x - sz * 0.1, y + sz * 0.4); ctx.lineTo(x + sz / 2, y); ctx.lineTo(x + sz * 1.1, y + sz * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

function drawSeasonBadges(ctx, s, t) {
  for (let i = 0; i < SPACES.length; i++) {
    const sp = SPACES[i];
    if (!sp.d && sp.type !== 'line') continue;
    const m = multFor(s, i);
    if (Math.abs(m - 1) < 0.01) continue;
    const r = rect(i), up = m > 1, m0 = Math.min(view.ux, view.uy);
    const label = m === 0 ? '×0' : `×${+m.toFixed(2)}`;
    const px = Math.max(7.5, m0 * 0.15);
    ctx.font = font(px, 800, 'sans');
    const w = ctx.measureText(label).width + px * 1.5, h = px * 1.45;
    const bd = band(r);
    let x = r.x + r.w - w - 2, y = r.y + 2;
    if (r.side === 'b' || r.side === 't') { x = r.x + (r.w - w) / 2; y = bd.y + (bd.h - h) / 2; }
    if (r.side === 'r') x = r.x + 1;
    if (r.side === 'l') x = r.x + r.w - w - 1;
    ctx.fillStyle = up ? '#2E6A3C' : '#9A2A1C'; rr(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    // arrow shape + text, so the cue isn't color alone
    const ax = x + px * 0.45, ay = y + h / 2, as = px * 0.32;
    ctx.beginPath(); if (up) { ctx.moveTo(ax - as, ay + as * 0.6); ctx.lineTo(ax, ay - as * 0.7); ctx.lineTo(ax + as, ay + as * 0.6); } else { ctx.moveTo(ax - as, ay - as * 0.6); ctx.lineTo(ax, ay + as * 0.7); ctx.lineTo(ax + as, ay - as * 0.6); } ctx.fill();
    ctx.fillText(label, x + px * 1.0, ay + 0.5);
  }
}

// Where token k sits inside space i (a small grid so several tokens don't overlap).
export function slot(i, k) {
  const r = rect(i);
  if (r.side === 'c') { const c = k % 3, row = Math.floor(k / 3) % 2; return { x: r.x + r.w * (0.22 + c * 0.28), y: r.y + r.h * (0.42 + row * 0.24) }; }
  const b = body(r);
  const cols = 3, rows = 2, cw = b.w / cols, ch = b.h / rows;
  const c = k % cols, rI = Math.floor(k / cols) % rows;
  return { x: b.x + cw * (c + 0.5), y: b.y + ch * (rI + 0.5) + (r.side === 'c' ? 0 : 0) };
}
export const tokenR = () => Math.max(8, Math.min(view.ux, view.uy) * 0.19);

function drawTokens(ctx, s) {
  const R = tokenR();
  const order = s.players.map((p, k) => k).sort((a, b) => (a === s.turn) - (b === s.turn));
  for (const k of order) {
    const p = s.players[k]; if (p.out) continue;
    const pos = view.tokens[k] || slot(p.pos, k);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
    drawToken(ctx, p.token, pos.x, pos.y - (pos.lift || 0), R * (k === s.turn ? 1.08 : 1), k + 1);
    ctx.restore();
    if (p.held && p.pos === 8) { ctx.strokeStyle = '#1F2A24'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let d = -1; d <= 1; d++) { ctx.moveTo(pos.x + d * R * 0.55, pos.y - R); ctx.lineTo(pos.x + d * R * 0.55, pos.y + R); } ctx.stroke(); }
  }
}

// Floating money pops (+$150, −$30) above a token.
function drawPops(ctx, t) {
  const now = performance.now(), m = Math.min(view.ux, view.uy);
  view.pops = view.pops.filter((p) => now - p.t0 < p.dur);
  for (const p of view.pops) {
    const k = (now - p.t0) / p.dur;
    ctx.save(); ctx.globalAlpha = 1 - k * k;
    ctx.font = font(Math.max(11, m * 0.24), 900, 'sans'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = view.theme === 'dark' ? '#14121F' : '#FBF8F1';
    const y = p.y - k * m * 0.7;
    ctx.strokeText(p.text, p.x, y); ctx.fillStyle = p.good ? '#2E6A3C' : '#9A2A1C'; if (view.theme === 'dark') ctx.fillStyle = p.good ? '#5FD38A' : '#FF7B7B';
    ctx.fillText(p.text, p.x, y); ctx.restore();
  }
}

function drawCenter(ctx, s, t, opts) {
  const { ux, uy } = view, x0 = 1.5 * ux, y0 = 1.5 * uy, cw = 7 * ux, ch = 7 * uy, m = Math.min(cw, ch);
  const cx = x0 + cw / 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // Title plaque
  ctx.fillStyle = t.red; fitText(ctx, 'BATHHOUSE BARONS', cx, y0 + ch * 0.085, cw * 0.86, m * 0.085, 10, 900);
  ctx.fillStyle = t.muted; fitText(ctx, 'Hot Springs, Arkansas · an original game', cx, y0 + ch * 0.085 + m * 0.07, cw * 0.86, m * 0.034, 8, 600, 'serif');
  if (!s) return;
  // Calendar ring
  const ry = y0 + ch * 0.47, R = m * 0.215;
  const sea = seasonsNow(s);
  ctx.lineWidth = Math.max(2, m * 0.012); ctx.strokeStyle = t.line; ctx.beginPath(); ctx.arc(cx, ry, R, 0, 7); ctx.stroke();
  for (let k = 0; k < 12; k++) {
    const a = -Math.PI / 2 + (k / 12) * Math.PI * 2, px = cx + Math.cos(a) * R, py = ry + Math.sin(a) * R;
    const on = k === s.month, racing = SEASONS[0].months.includes(k);
    ctx.beginPath(); ctx.arc(px, py, on ? m * 0.045 : m * 0.026, 0, 7);
    ctx.fillStyle = on ? t.red : racing ? t.brass : t.space; ctx.fill(); ctx.strokeStyle = t.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = on ? '#fff' : t.text; ctx.font = font(Math.max(7, m * (on ? 0.032 : 0.022)), 800, 'sans');
    ctx.fillText(MONTHS[k][0], px, py + 0.5);
  }
  ctx.fillStyle = t.text; fitText(ctx, `${MONTHS[s.month]} · Year ${s.year + 1}`, cx, ry - R * 0.6, R * 1.22, m * 0.046, 7, 800);
  ctx.fillStyle = t.muted; fitText(ctx, sea.length ? sea.map((x) => x.name).join(' · ') : 'No season', cx, ry - R * 0.36, R * 1.25, m * 0.03, 6.5, 700, 'sans');
  // Dice
  const ds = m * 0.12, dy = ry + R * 0.12;
  drawDie(ctx, cx - ds * 0.62, dy, ds, view.dice.a, view.dice.tumbling ? (view.dice.spin || 0) : -0.08);
  drawDie(ctx, cx + ds * 0.62, dy, ds, view.dice.b, view.dice.tumbling ? -(view.dice.spin || 0) : 0.1);
  if (s.opts.variant === 'common') { ctx.fillStyle = t.accent; fitText(ctx, `Treasury $${s.treasury}`, cx, ry + R * 0.68, R * 1.4, m * 0.034, 7, 800, 'sans'); }
  // Headline postcard
  const hy = y0 + ch * 0.835, hw = cw * 0.86, hh = ch * 0.15;
  ctx.fillStyle = t.space; ctx.strokeStyle = t.line; ctx.lineWidth = 1.5; rr(ctx, cx - hw / 2, hy - hh / 2, hw, hh, 8); ctx.fill(); ctx.stroke();
  const card = s.headline ? CARD[s.headline.id] : null;
  ctx.fillStyle = t.red; fitText(ctx, card ? 'HEADLINE' : 'THE TOWN AWAITS', cx, hy - hh * 0.3, hw * 0.9, m * 0.028, 7, 800, 'sans');
  ctx.fillStyle = t.text; fitText(ctx, card ? card.title : 'A Headline arrives each new month', cx, hy - hh * 0.02, hw * 0.92, m * 0.042, 8, 800, 'serif');
  if (card) { ctx.fillStyle = t.muted; const ls = wrapLines(ctx, card.effect, hw * 0.92, Math.max(7, m * 0.026), 600, 'sans', 2); ls.forEach((ln, k) => fitText(ctx, ln, cx, hy + hh * 0.22 + k * m * 0.03, hw * 0.92, Math.max(7, m * 0.026), 6.5, 600, 'sans')); }
}

const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
function drawDie(ctx, x, y, s, v, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
  ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#FBF6E8'; rr(ctx, -s / 2, -s / 2, s, s, s * 0.18); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#5A4C38'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#A9432C';
  for (const [a, b] of PIPS[v] || PIPS[1]) { ctx.beginPath(); ctx.arc(a * s * 0.26, b * s * 0.26, s * 0.085, 0, 7); ctx.fill(); }
  ctx.restore();
}

// Rent preview text for the deed.
export function rentLine(s, i) { return rentOf(s, i, (s.dice[0] + s.dice[1]) || 7); }
