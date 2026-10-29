// Canvas board: a printed 1930s board on linen stock. The static layer (stock, centre map, spaces with painted
// vignettes, names, prices, frames) is cached per size/DPR/theme/art state; the dynamic layer (owners, mortgages,
// buildings, season badges, map flags, calendar dial, decks, Headline, dice, tokens, money) is redrawn on demand.
// The same drawing code renders the 3D board's texture (see drawBoardTexture). The vector icons and disc tokens are
// the fallback while art loads or with ?art=0.
import { SPACES, DISTRICTS, MONTHS, TOKENS, CARD, SEASONS, isRow } from './data.js';
import { seasonsNow, multFor, rentOf } from './engine.js';
import { img, art } from './art.js';
import { SPRITES } from './sprites-data.js';
import { mapXY, labelXY, LABELS, MAP_FRAME } from './geo.js';

export const view = {
  cv: null, ctx: null, W: 0, H: 0, dpr: 1, ux: 0, uy: 0, theme: 'light',
  cache: null, cacheKey: '', cursor: -1, flash: -1, flashT: 0, pops: [], coins: [], puffs: [],
  tokens: [], // display positions: { x, y, lift, squash } per player (animated)
  dice: { a: 1, b: 1, tumbling: 0, x: null, y: null, frame: 0, yawA: 0, yawB: 1 },
  pieces3d: false, // when the 3D table draws tokens, dice and buildings itself
  drop: {}, // space -> { t0, dur } building drop-in
};

// Visual vocabulary. Light: "Gilded day" printed board; dark: "Neon night" edition (navy board, gold ink).
const TH = {
  light: { ink: '#2A2219', soft: '#5C4D38', rule: '#8A7552', space: 'rgba(255,252,242,.55)', center: '#EFE6CF', red: '#9A2F1C', brass: '#B8862B', ring: '#355E41', cursor: '#1F2A24', wash: null, glow: '#D9A23A', label: '#3B2F22', labelHalo: 'rgba(250,244,228,.85)' },
  dark: { ink: '#EDE3CC', soft: '#BDB29A', rule: '#C9A24A', space: 'rgba(22,19,40,.55)', center: '#1A1729', red: '#E2BC55', brass: '#E2BC55', ring: '#4FC3FF', cursor: '#4FC3FF', wash: 'rgba(14,12,32,.80)', glow: '#4FC3FF', label: '#F1E4C0', labelHalo: 'rgba(14,12,32,.8)' },
};
const VIG = ['depot', 'cabins', 'talk', 'belding', 'railroad', 'ostrich', 'gators', 'iqzoo', 'jury', 'whittington', 'waterco', 'fogel', 'majesticpark', 'motorcourts', 'drivein', 'tower',
  'freebath', 'pythian', 'talk', 'woodmen', 'streetcar', 'southern', 'ohio', 'vapors', 'summoned', 'eastman', 'majestic', 'arlington', 'watertax', 'hale', 'buckstaff', 'fordyce'];
const BLD = ['bld-hale', 'bld-ozark', 'bld-quapaw'];
const FONT = { label: '"Barlow Condensed","Arial Narrow","Roboto Condensed",system-ui,sans-serif', slab: '"Alfa Slab One","Rockwell","Georgia",serif', serif: '"Libre Caslon Text","Palatino Linotype","Book Antiqua",Georgia,serif', news: '"Abril Fatface","Didot","Bodoni MT",Georgia,serif', sans: 'system-ui,"Segoe UI",Roboto,Arial,sans-serif' };

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
const m0 = () => Math.min(view.ux, view.uy);

// Parts of a space: band (district colour on the inner edge; buildings stand on it), owner strip (outer edge),
// art (vignette), name and price boxes. All upright, so the board reads from one side.
export function parts(i) {
  const r = rect(i), s = r.side;
  if (s === 'c') {
    const lab = r.h * 0.27;
    return { r, art: { x: r.x + 3, y: r.y + 3, w: r.w - 6, h: r.h - lab - 3 }, label: { x: r.x, y: r.y + r.h - lab, w: r.w, h: lab } };
  }
  if (s === 'b' || s === 't') {
    const bh = r.h * 0.19, oh = Math.max(7, r.h * 0.11), body = r.h - bh - oh;
    const band = s === 'b' ? { x: r.x, y: r.y, w: r.w, h: bh } : { x: r.x, y: r.y + r.h - bh, w: r.w, h: bh };
    const own = s === 'b' ? { x: r.x, y: r.y + r.h - oh, w: r.w, h: oh } : { x: r.x, y: r.y, w: r.w, h: oh };
    const y0 = s === 'b' ? r.y + bh : r.y + oh;
    const ah = body * 0.44;
    // top row: name first, then the picture beside the band, so pieces standing on the band rise over the picture
    if (s === 't') return { r, band, own, text: { x: r.x, y: y0, w: r.w, h: body - ah }, art: { x: r.x + 2, y: y0 + body - ah, w: r.w - 4, h: ah - 2 } };
    return { r, band, own, art: { x: r.x + 2, y: y0 + 2, w: r.w - 4, h: ah - 2 }, text: { x: r.x, y: y0 + ah, w: r.w, h: body - ah } };
  }
  const bw = r.w * 0.2, ow = Math.max(7, r.w * 0.1), body = r.w - bw - ow;
  const band = s === 'l' ? { x: r.x + r.w - bw, y: r.y, w: bw, h: r.h } : { x: r.x, y: r.y, w: bw, h: r.h };
  const own = s === 'l' ? { x: r.x, y: r.y, w: ow, h: r.h } : { x: r.x + r.w - ow, y: r.y, w: ow, h: r.h };
  const x0 = s === 'l' ? r.x + ow : r.x + bw;
  const ah = r.h * 0.46;
  return { r, band, own, art: { x: x0 + 2, y: r.y + 2, w: body - 4, h: ah - 2 }, text: { x: x0, y: r.y + ah, w: body, h: r.h - ah } };
}
export const stripW = () => Math.max(9, m0() * 0.15);

// ---------- primitives ----------
function font(px, weight = 600, fam = 'label', style = '') { return `${style ? style + ' ' : ''}${weight} ${px}px ${FONT[fam] || FONT.label}`; }
function fitText(ctx, t, x, y, maxW, px, minPx = 7, weight = 600, fam = 'label', style = '') {
  let s = px;
  ctx.font = font(s, weight, fam, style);
  while (s > minPx && ctx.measureText(t).width > maxW) { s -= 0.5; ctx.font = font(s, weight, fam, style); }
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
// Draw an image to cover a box (centre crop), optionally clipped to a rounded rect.
function cover(ctx, im, b, radius = 0, focusY = 0.5) {
  const s = Math.max(b.w / im.width, b.h / im.height), w = im.width * s, h = im.height * s;
  ctx.save(); if (radius) { rr(ctx, b.x, b.y, b.w, b.h, radius); ctx.clip(); } else { ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip(); }
  ctx.drawImage(im, b.x + (b.w - w) / 2, b.y + (b.h - h) * focusY, w, h);
  ctx.restore();
  return { s, ox: b.x + (b.w - w) / 2, oy: b.y + (b.h - h) * focusY, w, h };
}
function sprite(ctx, name, x, y, scale, alpha = 1) {
  const f = SPRITES[name], im = img('pieces'); if (!f || !im) return false;
  const [sx, sy, sw, sh, fx, fy] = f;
  if (alpha !== 1) { ctx.save(); ctx.globalAlpha *= alpha; }
  ctx.drawImage(im, sx, sy, sw, sh, x - fx * scale, y - fy * scale, sw * scale, sh * scale);
  if (alpha !== 1) ctx.restore();
  return true;
}
const unitPx = (name) => (SPRITES[name] ? SPRITES[name][6] : 80);

function pattern(ctx, b, pat, a = 0.42) {
  ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
  ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.fillStyle = `rgba(255,255,255,${a * 0.8})`; ctx.lineWidth = Math.max(1, Math.min(b.w, b.h) * 0.09);
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

// District and space icons (vector fallback), drawn in a size×size box centred at (x, y).
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

// ---------- tokens ----------
// Draws token k standing with its foot at (x, y). r is the base radius in px. With art, the Blender die-cast
// token over its own shadow (the shadow stays on the board while the token lifts); otherwise a disc with a glyph.
export function drawToken(ctx, k, x, y, r, num, lift = 0, squash = 0) {
  const T = TOKENS[k], name = 'tok-' + T.shape;
  if (SPRITES[name] && img('pieces')) {
    const s = (r * 2 / 1.08) / unitPx(name);
    const sh = 1 / (1 + lift / (r * 3));
    ctx.save(); ctx.translate(x, y); ctx.scale(sh, sh); sprite(ctx, name + '-shadow', 0, 0, s, Math.max(0.25, sh)); ctx.restore();
    ctx.save(); ctx.translate(x, y - lift); if (squash) ctx.scale(1 + squash * 0.5, 1 - squash); sprite(ctx, name, 0, 0, s); ctx.restore();
    if (num != null) badge(ctx, x + r * 0.95, y - lift - r * 1.55, Math.max(5.5, r * 0.42), num);
    return;
  }
  ctx.save(); ctx.translate(x, y - lift - r * 0.9);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = T.color; ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.07); ctx.strokeStyle = '#1F2A24'; ctx.beginPath(); ctx.arc(0, 0, r + ctx.lineWidth * 1.5, 0, 7); ctx.stroke();
  glyph(ctx, T.shape, r * 0.62, '#fff');
  ctx.restore();
  if (num != null) badge(ctx, x + r * 0.78, y - lift - r * 1.7, Math.max(5, r * 0.45), num);
}
function glyph(ctx, shape, s, col) {
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.2, s * 0.2); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (shape) {
    case 'jug': ctx.moveTo(-s * .45, -s * .55); ctx.lineTo(s * .15, -s * .55); ctx.lineTo(s * .15, -s * .35); ctx.quadraticCurveTo(s * .75, -s * .2, s * .6, s * .4); ctx.quadraticCurveTo(s * .5, s * .8, -s * .1, s * .8); ctx.quadraticCurveTo(-s * .7, s * .8, -s * .7, s * .3); ctx.quadraticCurveTo(-s * .75, -s * .2, -s * .45, -s * .35); ctx.closePath(); ctx.fill(); break;
    case 'tub': ctx.moveTo(-s * .9, -s * .1); ctx.lineTo(s * .9, -s * .1); ctx.quadraticCurveTo(s * .85, s * .55, s * .2, s * .55); ctx.lineTo(-s * .2, s * .55); ctx.quadraticCurveTo(-s * .85, s * .55, -s * .9, -s * .1); ctx.fill(); ctx.fillRect(-s * .6, s * .5, s * .16, s * .3); ctx.fillRect(s * .44, s * .5, s * .16, s * .3); ctx.beginPath(); ctx.moveTo(s * .1, -s * .25); ctx.bezierCurveTo(-s * .2, -s * .5, s * .35, -s * .6, s * .05, -s * .95); ctx.stroke(); break;
    case 'shoe': ctx.arc(0, -s * .05, s * .62, Math.PI * 0.82, Math.PI * 2.18); ctx.lineWidth = s * .38; ctx.stroke(); break;
    case 'parasol': ctx.moveTo(-s * .85, 0); ctx.quadraticCurveTo(0, -s * 1.1, s * .85, 0); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s * .7); ctx.quadraticCurveTo(0, s * .95, -s * .25, s * .8); ctx.stroke(); break;
    case 'fish': ctx.moveTo(-s * .8, 0); ctx.quadraticCurveTo(0, -s * .7, s * .45, 0); ctx.quadraticCurveTo(0, s * .7, -s * .8, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(s * .35, 0); ctx.lineTo(s * .85, -s * .4); ctx.lineTo(s * .85, s * .4); ctx.closePath(); ctx.fill(); break;
    case 'car': ctx.fillRect(-s * .75, -s * .45, s * 1.5, s * .85); ctx.fillRect(-s * .08, -s * .85, s * .16, s * .4); break;
  }
}
function badge(ctx, x, y, br, num) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, br, 0, 7); ctx.fillStyle = '#1F1A14'; ctx.fill(); ctx.strokeStyle = '#F4E8C8'; ctx.lineWidth = Math.max(1, br * 0.18); ctx.stroke();
  ctx.fillStyle = '#FFF8E6'; ctx.font = font(Math.max(7, br * 1.45), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(num), x, y + br * 0.08);
  ctx.restore();
}
// Token icon for the DOM (player cards, turn bar, setup, results).
export function tokenCanvas(k, px, num) {
  const c = document.createElement('canvas'), d = Math.min(3, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(px * d); c.className = 'tokicon'; c.setAttribute('aria-hidden', 'true');
  const x = c.getContext('2d'); x.scale(d, d); x.imageSmoothingQuality = 'high';
  if (SPRITES['tok-' + TOKENS[k].shape] && img('pieces')) drawToken(x, k, px * 0.46, px * 0.9, px * 0.3, num);
  else drawToken(x, k, px * 0.44, px * 0.92, px * 0.34, num);
  return c;
}

// ---------- static layer ----------
function drawStatic() {
  const key = `${view.W}x${view.H}@${view.dpr}:${view.theme}:${art.ready ? 1 : 0}:${art.on ? 1 : 0}`;
  if (view.cacheKey === key) return;
  const c = view.cache || (view.cache = document.createElement('canvas'));
  c.width = Math.round(view.W * view.dpr); c.height = Math.round(view.H * view.dpr);
  const ctx = c.getContext('2d'), t = TH[view.theme];
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0); ctx.imageSmoothingQuality = 'high';
  paintStatic(ctx, t);
  view.cacheKey = key;
}

function paintStatic(ctx, t) {
  const { W, H, ux, uy } = view, dark = view.theme === 'dark';
  // board stock
  const stock = img('board-stock');
  if (stock) { const p = ctx.createPattern(stock, 'repeat'); const k = Math.max(0.35, Math.min(1, W / 1400)); p.setTransform && p.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0])); ctx.fillStyle = p; } else ctx.fillStyle = dark ? '#221E33' : '#EADFC4';
  ctx.fillRect(0, 0, W, H);
  if (dark) { ctx.fillStyle = t.wash; ctx.fillRect(0, 0, W, H); }
  // centre: the map
  const C = { x: 1.5 * ux, y: 1.5 * uy, w: 7 * ux, h: 7 * uy };
  drawMap(ctx, C, t);
  computeNameSizes(ctx);
  for (let i = 0; i < SPACES.length; i++) drawSpace(ctx, i, t);
  for (let i = 0; i < SPACES.length; i++) { const r = rect(i); ctx.save(); ctx.strokeStyle = 'rgba(40,25,8,.16)'; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3); ctx.strokeStyle = 'rgba(255,250,235,.35)'; ctx.lineWidth = 1; ctx.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6); ctx.restore(); }
  if (dark) clubNeon(ctx);
  // printed rules: outer double rule, centre frame
  ctx.strokeStyle = t.rule; ctx.lineWidth = Math.max(1.5, m0() * 0.03); ctx.strokeRect(1, 1, W - 2, H - 2);
  ctx.lineWidth = 1; ctx.strokeRect(4, 4, W - 8, H - 8);
  ctx.lineWidth = Math.max(1.5, m0() * 0.035); ctx.strokeStyle = dark ? t.brass : t.ink; ctx.strokeRect(C.x, C.y, C.w, C.h);
  ctx.lineWidth = 1; ctx.strokeStyle = t.rule; ctx.strokeRect(C.x + 4, C.y + 4, C.w - 8, C.h - 8);
}

// Neon night: the three clubs glow.
function clubNeon(ctx) {
  ctx.save();
  for (let i = 0; i < SPACES.length; i++) {
    if (SPACES[i].d !== 'cl') continue;
    const r = rect(i);
    for (const [w, a] of [[7, 0.18], [3.5, 0.45], [1.4, 1]]) { ctx.strokeStyle = `rgba(255,92,190,${a})`; ctx.lineWidth = w; ctx.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6); }
  }
  ctx.restore();
}

// The centre map, cover-fitted; its transform is kept so pins and labels land on the painted geography.
export const mapT = { s: 1, ox: 0, oy: 0, w: 0, h: 0, C: null };
function drawMap(ctx, C, t) {
  const dark = view.theme === 'dark', im = img('map');
  mapT.C = C;
  if (im) {
    const inset = { x: C.x + 3, y: C.y + 3, w: C.w - 6, h: C.h - 6 };
    const f = cover(ctx, im, inset, 0, 0.5);
    Object.assign(mapT, f);
    ctx.save(); ctx.beginPath(); ctx.rect(inset.x, inset.y, inset.w, inset.h); ctx.clip();
    if (dark) { ctx.fillStyle = 'rgba(16,14,40,.62)'; ctx.fillRect(inset.x, inset.y, inset.w, inset.h); }
    // paper vignette so the painting sits in the print
    const g = ctx.createRadialGradient(C.x + C.w / 2, C.y + C.h / 2, Math.min(C.w, C.h) * 0.35, C.x + C.w / 2, C.y + C.h / 2, Math.max(C.w, C.h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, dark ? 'rgba(8,6,20,.55)' : 'rgba(120,90,50,.28)');
    ctx.fillStyle = g; ctx.fillRect(inset.x, inset.y, inset.w, inset.h);
    ctx.restore();
    drawMapLabels(ctx, C, t);
  } else {
    Object.assign(mapT, { s: 0, ox: C.x, oy: C.y, w: C.w, h: C.h });
    ctx.fillStyle = dark ? '#1A1729' : '#EFE6CF'; ctx.fillRect(C.x, C.y, C.w, C.h);
  }
  // title cartouche
  const m = Math.min(C.w, C.h), cw = Math.min(C.w * 0.62, m * 0.66), chh = m * 0.12, cx = C.x + C.w / 2, cy = C.y + m * 0.085;
  ctx.save();
  ctx.shadowColor = 'rgba(40,25,10,.35)'; ctx.shadowBlur = m * 0.02; ctx.shadowOffsetY = m * 0.006;
  ribbon(ctx, cx, cy, cw, chh, dark ? '#221C38' : '#F6EDD6', dark ? t.brass : t.ink);
  ctx.restore();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = t.red; fitText(ctx, 'BATHHOUSE BARONS', cx, cy - chh * 0.2, cw * 0.84, m * 0.058, 9, 400, 'slab');
  ctx.fillStyle = t.soft; fitText(ctx, 'Hot Springs, Arkansas', cx, cy + chh * 0.17, cw * 0.7, m * 0.026, 7, 400, 'serif', 'italic');
  if (im) { compass(ctx, C.x + m * 0.08, C.y + m * 0.27, m * 0.045, t); scaleBar(ctx, C, t); }
}

function ribbon(ctx, cx, cy, w, h, fill, ink) {
  const x = cx - w / 2, y = cy - h / 2, n = h * 0.35;
  ctx.beginPath();
  ctx.moveTo(x - n, y + h * 0.15); ctx.lineTo(x + n * 0.2, y + h * 0.15); ctx.lineTo(x + n * 0.2, y + h * 0.95); ctx.lineTo(x - n, y + h * 0.95); ctx.lineTo(x - n * 0.45, y + h * 0.55); ctx.closePath();
  ctx.moveTo(x + w + n, y + h * 0.15); ctx.lineTo(x + w - n * 0.2, y + h * 0.15); ctx.lineTo(x + w - n * 0.2, y + h * 0.95); ctx.lineTo(x + w + n, y + h * 0.95); ctx.lineTo(x + w + n * 0.45, y + h * 0.55); ctx.closePath();
  ctx.fillStyle = shade(fill, -0.12); ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = ink; ctx.stroke();
  rr(ctx, x, y, w, h * 0.85, h * 0.1); ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
  ctx.save(); ctx.shadowColor = 'transparent'; rr(ctx, x + 3, y + 3, w - 6, h * 0.85 - 6, h * 0.08); ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore();
}
function shade(hex, k) {
  const h = hex.replace('#', ''); const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v * (1 + k))))).map((v) => v.toString(16).padStart(2, '0')).join('');
}
function compass(ctx, x, y, r, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = t.ink; ctx.lineWidth = Math.max(0.8, r * 0.04);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, 7); ctx.stroke();
  for (let k = 0; k < 4; k++) {
    ctx.save(); ctx.rotate(k * Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.16, 0); ctx.lineTo(0, r * 0.08); ctx.closePath(); ctx.fillStyle = k === 0 ? t.red : t.ink; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(-r * 0.16, 0); ctx.lineTo(0, r * 0.08); ctx.closePath(); ctx.fillStyle = view.theme === 'dark' ? '#3A3550' : '#F6EDD6'; ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = t.ink; ctx.font = font(Math.max(7, r * 0.42), 400, 'slab'); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('N', 0, -r * 1.02);
  ctx.restore();
}
function scaleBar(ctx, C, t) {
  // the map is 5.6 km across its 1024-px painting
  const pxPerM = mapT.w / (MAP_FRAME.x1 - MAP_FRAME.x0), mile = 1609.34 * pxPerM, m = Math.min(C.w, C.h);
  const x = C.x + C.w - mile - m * 0.06, y = C.y + C.h * 0.42 + m * 0.085 * 1.22 + m * 0.08, h = Math.max(3, m * 0.008);
  ctx.save();
  ctx.fillStyle = t.labelHalo; rr(ctx, x - 6, y - m * 0.05, mile + 12, m * 0.07, 4); ctx.fill();
  for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? (view.theme === 'dark' ? '#F1E4C0' : '#F6EDD6') : t.ink; ctx.fillRect(x + k * mile / 4, y - h, mile / 4, h); }
  ctx.strokeStyle = t.ink; ctx.lineWidth = 0.8; ctx.strokeRect(x, y - h, mile, h);
  ctx.fillStyle = t.ink; ctx.font = font(Math.max(7, m * 0.022), 600); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillText('0', x - 2, y - h - 2); ctx.textAlign = 'right'; ctx.fillText('1 mile', x + mile + 2, y - h - 2);
  ctx.restore();
}
const mapPt = (u, v) => ({ x: mapT.ox + u * mapT.w, y: mapT.oy + v * mapT.h });
const inCentre = (p, pad = 0) => mapT.C && p.x > mapT.C.x + pad && p.x < mapT.C.x + mapT.C.w - pad && p.y > mapT.C.y + pad && p.y < mapT.C.y + mapT.C.h - pad;
function drawMapLabels(ctx, C, t) {
  const m = Math.min(C.w, C.h);
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [text, lat, lon, kind] of LABELS) {
    const q = labelXY(lat, lon), p = mapPt(q.u, q.v);
    if (!inCentre(p, m * 0.06)) continue;
    const px = Math.max(7, m * (kind === 'mountain' ? 0.024 : 0.027));
    ctx.font = font(px, kind === 'street' ? 400 : 400, 'serif', 'italic');
    ctx.lineWidth = Math.max(2, px * 0.35); ctx.strokeStyle = t.labelHalo; ctx.lineJoin = 'round';
    const s = kind === 'mountain' ? text : text.toUpperCase();
    ctx.strokeText(s, p.x, p.y); ctx.fillStyle = kind === 'mountain' ? t.soft : t.label; ctx.fillText(s, p.x, p.y);
  }
  ctx.restore();
}

// One name size per side of the board, so neighbours match (the largest size at which every name on the side fits).
const sideNamePx = {};
function nameFit(ctx, i) {
  const sp = SPACES[i], T = parts(i).text, pad = Math.max(2, T.w * 0.05), m = m0(), small = T.w < 50;
  const name = (small ? sp.short : sp.name).toUpperCase();
  let px = Math.max(9, m * (small ? 0.2 : 0.175));
  for (; px > 6.5; px -= 0.5) {
    const lines = wrapLines(ctx, name, T.w - pad * 2, px, 700, 'label', 2);
    ctx.font = font(px, 700);
    if (lines.every((ln) => ctx.measureText(ln).width <= T.w - pad * 2) && lines.length * px * 1.02 + px * 1.3 <= T.h) break;
  }
  return px;
}
function computeNameSizes(ctx) {
  for (const k in sideNamePx) delete sideNamePx[k];
  for (let i = 0; i < SPACES.length; i++) { const side = rect(i).side; if (side === 'c') continue; sideNamePx[side] = Math.min(sideNamePx[side] || 99, nameFit(ctx, i)); }
}
function drawSpace(ctx, i, t) {
  const sp = SPACES[i], P = parts(i), r = P.r, dark = view.theme === 'dark';
  ctx.fillStyle = t.space; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = t.rule; ctx.lineWidth = 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (r.side === 'c') return drawCorner(ctx, sp, P, t);
  const vig = img('vig-' + VIG[i]);
  if (sp.type === 'lot') {
    const b = P.band, D = DISTRICTS[sp.d];
    ctx.fillStyle = D.color; ctx.fillRect(b.x, b.y, b.w, b.h); pattern(ctx, b, D.pat, 0.3);
    const g = b.w > b.h ? ctx.createLinearGradient(0, b.y, 0, b.y + b.h) : ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
    g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); ctx.fillStyle = g; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = t.rule; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  }
  const A = P.art, big = A.h >= 16 && A.w >= 22;
  if (vig && big) {
    cover(ctx, vig, A, Math.min(6, A.h * 0.12), 0.55);
    if (dark) { ctx.save(); rr(ctx, A.x, A.y, A.w, A.h, Math.min(6, A.h * 0.12)); ctx.clip(); ctx.fillStyle = 'rgba(20,16,44,.28)'; ctx.fillRect(A.x, A.y, A.w, A.h); ctx.restore(); }
    ctx.save(); rr(ctx, A.x, A.y, A.w, A.h, Math.min(6, A.h * 0.12)); ctx.strokeStyle = dark ? 'rgba(201,162,74,.6)' : 'rgba(90,70,40,.45)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  } else {
    const s = Math.min(A.w, A.h) * 0.62;
    icon(ctx, SPACE_ICON(sp), A.x + A.w / 2, A.y + A.h / 2, s, sp.type === 'lot' ? DISTRICTS[sp.d].color : t.ink);
  }
  // name and price
  const T = P.text, pad = Math.max(2, T.w * 0.05), m = m0();
  const small = T.w < 50;
  const namePx = sideNamePx[r.side] || Math.max(9, m * (small ? 0.2 : 0.175));
  const pricePx = Math.max(8.5, m * 0.165);
  const name = small ? sp.short : sp.name;
  const lines = wrapLines(ctx, name.toUpperCase(), T.w - pad * 2, namePx, 700, 'label', 2);
  const price = sp.price ? `$${sp.price}` : sp.type === 'tax' ? 'Pay $100' : '';
  const lineH = namePx * 1.02, blockH = lines.length * lineH + (price ? pricePx * 1.25 : 0);
  let y = T.y + Math.max(1, (T.h - blockH) / 2);
  const cx = T.x + T.w / 2;
  ctx.fillStyle = t.ink;
  for (const ln of lines) { fitText(ctx, ln.toUpperCase(), cx, y + lineH / 2, T.w - pad * 2, namePx, 6.5, 700); y += lineH; }
  if (price) { ctx.fillStyle = sp.type === 'tax' ? t.red : t.soft; fitText(ctx, price, cx, y + pricePx * 0.62, T.w - pad * 2, pricePx, 7, 400, 'slab'); }
}

function drawCorner(ctx, sp, P, t) {
  const r = P.r, A = P.art, L = P.label, dark = view.theme === 'dark';
  const labels = { depot: ['THE DEPOT', 'Payday $150 ›'], jury: ['GRAND JURY ROOM', 'Just visiting'], free: ['FREE BATHHOUSE', 'Rest a while'], gojury: ['SUMMONED', 'Go to the Grand Jury'] };
  const [a, b] = labels[sp.kind];
  const col = sp.kind === 'depot' ? '#355E41' : sp.kind === 'free' ? '#2B6C8F' : '#8E2A1B';
  const vig = img('vig-' + VIG[sp.i]);
  if (vig) {
    cover(ctx, vig, A, Math.min(8, A.h * 0.06), 0.5);
    if (dark) { ctx.fillStyle = 'rgba(20,16,44,.28)'; ctx.fillRect(A.x, A.y, A.w, A.h); }
  } else {
    ctx.fillStyle = col; ctx.globalAlpha = 0.12; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.globalAlpha = 1;
    icon(ctx, SPACE_ICON(sp), A.x + A.w / 2, A.y + A.h / 2, Math.min(A.w, A.h) * 0.5, col);
  }
  // label plate
  ctx.fillStyle = dark ? shade(col, 0.15) : col; ctx.fillRect(L.x + 2, L.y, L.w - 4, L.h - 2);
  ctx.strokeStyle = dark ? '#E2BC55' : 'rgba(255,240,210,.7)'; ctx.lineWidth = 1; ctx.strokeRect(L.x + 4, L.y + 2, L.w - 8, L.h - 6);
  ctx.fillStyle = '#FFF6E2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const m = Math.min(r.w, r.h);
  fitText(ctx, a, L.x + L.w / 2, L.y + L.h * 0.34, L.w - 10, Math.min(L.h * 0.42, Math.max(9, m * 0.12)), 6.5, 700);
  ctx.fillStyle = 'rgba(255,246,226,.85)';
  fitText(ctx, b, L.x + L.w / 2, L.y + L.h * 0.7, L.w - 10, Math.min(L.h * 0.3, Math.max(8, m * 0.085)), 6, 600);
}

// ---------- dynamic layer ----------
export function draw(s, opts = {}) {
  const ctx = view.ctx, t = TH[view.theme];
  if (!ctx || !view.W) return;
  drawStatic();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(view.cache, 0, 0);
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0); ctx.imageSmoothingQuality = 'high';
  paintDynamic(ctx, s, t, opts);
}

function paintDynamic(ctx, s, t, opts) {
  if (s) {
    drawCentre(ctx, s, t);
    for (let i = 0; i < SPACES.length; i++) if (s.lots[i]) drawOwnership(ctx, s, i, t);
    drawSeasonBadges(ctx, s, t);
    if (view.flash >= 0) highlight(ctx, view.flash, t.glow, false);
    if (!view.pieces3d) { drawBuildingsAll(ctx, s); drawDice(ctx); drawTokens(ctx, s); }
    if (!view.pieces3d) drawPops(ctx);
  }
  if (view.cursor >= 0) highlight(ctx, view.cursor, t.cursor, true);
}

function highlight(ctx, i, col, dashed) {
  const r = rect(i);
  ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = col; if (dashed) ctx.setLineDash([6, 4]);
  ctx.shadowColor = col; ctx.shadowBlur = dashed ? 0 : 8;
  ctx.strokeRect(r.x + 2.5, r.y + 2.5, r.w - 5, r.h - 5); ctx.restore();
}

function drawOwnership(ctx, s, i, t) {
  const lot = s.lots[i], P = parts(i), r = P.r;
  if (lot.owner < 0 || r.side === 'c') return;
  const k = s.players[lot.owner].token, T = TOKENS[k], o = P.own;
  { const tx = P.text; ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = T.color; ctx.fillRect(tx.x + 1, tx.y, tx.w - 2, tx.h); ctx.restore(); }
  ctx.fillStyle = T.color; ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.strokeStyle = 'rgba(20,16,10,.55)'; ctx.lineWidth = 1; ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
  // seat number and token glyph, so ownership is never colour alone
  const th = Math.min(o.w, o.h), horiz = o.w > o.h, cx = o.x + o.w / 2, cy = o.y + o.h / 2, gap = th * 0.62;
  badge(ctx, horiz ? cx - gap : cx, horiz ? cy : cy - gap, Math.max(4.5, th * 0.4), lot.owner + 1);
  ctx.save(); ctx.translate(horiz ? cx + gap : cx, horiz ? cy : cy + gap); ctx.beginPath(); ctx.arc(0, 0, th * 0.4, 0, 7); ctx.fillStyle = 'rgba(255,250,236,.92)'; ctx.fill(); glyph(ctx, T.shape, th * 0.27, '#1F1A14'); ctx.restore();
  if (view.hiOwner === lot.owner) { ctx.save(); ctx.strokeStyle = T.color; ctx.lineWidth = 4; ctx.shadowColor = T.color; ctx.shadowBlur = 10; ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4); ctx.restore(); }
  // a coloured frame round the whole space ties the strip to the lot
  ctx.save(); ctx.strokeStyle = T.color; ctx.globalAlpha = 0.55; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3); ctx.restore();
  if (lot.mortgaged) {
    const A = P.art;
    ctx.save(); rr(ctx, A.x, A.y, A.w, A.h, 4); ctx.clip();
    ctx.fillStyle = view.theme === 'dark' ? 'rgba(10,10,20,.62)' : 'rgba(70,62,52,.55)'; ctx.fillRect(A.x, A.y, A.w, A.h);
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let q = -A.h; q < A.w; q += 7) { ctx.moveTo(A.x + q, A.y + A.h); ctx.lineTo(A.x + q + A.h, A.y); } ctx.stroke();
    // ribbon across the picture, never over the name or price
    const m = Math.min(A.w, A.h), px = Math.max(7.5, Math.min(A.w * 0.16, m * 0.32));
    ctx.translate(A.x + A.w / 2, A.y + A.h / 2); ctx.rotate(-0.32);
    ctx.fillStyle = '#8E2A1B'; ctx.fillRect(-A.w, -px * 0.75, A.w * 2, px * 1.5);
    ctx.fillStyle = '#FFF4DC'; ctx.font = font(px, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MORTGAGED', 0, px * 0.06);
    ctx.restore();
  }
}

// Buildings stand on the district band: level 1–3 are the Hale, Ozark and Quapaw pieces; 4 is the Grand Resort.
export function buildingSpots(i, level) {
  const P = parts(i), b = P.band; if (!b) return [];
  const horiz = b.w > b.h, n = level === 4 ? 1 : level, out = [];
  for (let k = 0; k < n; k++) {
    const f = (k + 1) / (n + 1);
    out.push(horiz ? { x: b.x + b.w * f, y: b.y + b.h * 0.86 } : { x: b.x + b.w * 0.5, y: b.y + b.h * (n === 1 ? 0.7 : 0.08 + 0.9 * (k + 1) / n) });
  }
  return out;
}
function drawBuildingsAll(ctx, s) {
  for (let i = 0; i < SPACES.length; i++) {
    const lot = s.lots[i]; if (!lot || lot.level <= 0) continue;
    drawBuildings(ctx, i, lot.level);
  }
}
function drawBuildings(ctx, i, level) {
  const P = parts(i), b = P.band, horiz = b.w > b.h;
  const spots = buildingSpots(i, level), now = performance.now(), dr = view.drop[i];
  const thick = horiz ? b.h : b.w, along = horiz ? b.w : b.h;
  if (img('pieces') && SPRITES['bld-hale']) {
    spots.forEach((p, k) => {
      const name = level === 4 ? 'bld-resort' : BLD[k];
      const wUnits = level === 4 ? 1.4 : 1.05;
      const target = level === 4 ? (horiz ? Math.min(along * 0.6, thick * 1.9) : thick * 1.05) : horiz ? Math.min(along / (level + 0.35), thick * 1.45) : thick * 1.0;
      const sc = (target / wUnits) / unitPx(name);
      let y = p.y, a = 1;
      if (dr && (level === 4 || k === level - 1)) { const q = Math.min(1, (now - dr.t0) / dr.dur); y -= (1 - easeOutBounce(q)) * thick * 2.2; a = Math.min(1, q * 3); }
      sprite(ctx, name + '-shadow', p.x, p.y, sc, 0.9 * a);
      sprite(ctx, name, p.x, y, sc, a);
    });
    if (dr && now - dr.t0 > dr.dur) delete view.drop[i];
    return;
  }
  // vector fallback
  const sz = Math.min(thick, along / 3.6) * 0.82;
  if (level === 4) {
    const w = horiz ? Math.min(b.w * 0.7, sz * 2.6) : sz * 1.1, h = horiz ? sz * 1.1 : Math.min(b.h * 0.7, sz * 2.6);
    const x = b.x + (b.w - w) / 2, y = b.y + (b.h - h) / 2;
    ctx.fillStyle = '#D9A23A'; ctx.strokeStyle = '#3A2A10'; ctx.lineWidth = 1.2; rr(ctx, x, y, w, h, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = font(Math.max(7, sz * 0.62), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('R', x + w / 2, y + h / 2 + 0.5);
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
function easeOutBounce(x) { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; }

function drawSeasonBadges(ctx, s, t) {
  for (let i = 0; i < SPACES.length; i++) {
    const sp = SPACES[i];
    if (!sp.d && sp.type !== 'line') continue;
    const m = multFor(s, i);
    if (Math.abs(m - 1) < 0.01 || (s.lots[i] && s.lots[i].mortgaged)) continue;
    const P = parts(i), up = m > 1, mm = m0();
    const label = m === 0 ? '×0' : `×${+m.toFixed(2)}`;
    const px = Math.max(8, mm * 0.15);
    ctx.font = font(px, 700);
    const w = ctx.measureText(label).width + px * 1.5, h = px * 1.4;
    const A = P.art;
    const x = A.x + A.w - w - 1, y = A.y + 1;
    ctx.fillStyle = up ? '#2E6A3C' : '#9A2A1C'; rr(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = '#FFF6E2'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const ax = x + px * 0.45, ay = y + h / 2, as = px * 0.3;
    ctx.beginPath(); if (up) { ctx.moveTo(ax - as, ay + as * 0.6); ctx.lineTo(ax, ay - as * 0.7); ctx.lineTo(ax + as, ay + as * 0.6); } else { ctx.moveTo(ax - as, ay - as * 0.6); ctx.lineTo(ax, ay + as * 0.7); ctx.lineTo(ax + as, ay - as * 0.6); } ctx.fill();
    ctx.fillText(label, x + px * 0.95, ay + 0.5);
  }
}

// Where token k stands on space i: a lane over the picture, so names and prices stay clear.
export function slot(i, k) {
  const P = parts(i), A = P.art;
  if (P.r.side === 'c') { const c = k % 3, row = Math.floor(k / 3) % 2; return { x: A.x + A.w * (0.2 + c * 0.3), y: A.y + A.h * (view.pieces3d ? 0.38 + row * 0.34 : 0.52 + row * 0.36) }; }
  const cols = 3, c = k % cols, rI = Math.floor(k / cols) % 2;
  // 3D tokens are seen from above, so they stand in the middle of the picture; 2D sprites stand at its foot
  if (view.pieces3d) return { x: A.x + A.w * (0.22 + c * 0.28 + rI * 0.14), y: A.y + A.h * (0.36 + rI * 0.4) };
  return { x: A.x + A.w * (0.2 + c * 0.3 + rI * 0.15), y: A.y + A.h * (0.86 + rI * 0.12) };
}
export const tokenR = () => Math.max(7, m0() * 0.17);

function drawTokens(ctx, s) {
  const R = tokenR();
  // painter's order: by screen y, the moving token last
  const order = s.players.map((p, k) => k).filter((k) => !s.players[k].out)
    .map((k) => ({ k, pos: view.tokens[k] || slot(s.players[k].pos, k) }))
    .sort((a, b) => (a.k === s.turn && view.tokens[a.k]) - (b.k === s.turn && view.tokens[b.k]) || a.pos.y - b.pos.y);
  for (const { k, pos } of order) {
    const p = s.players[k];
    if (k === s.turn && !view.tokens[k]) { // a soft ring marks whose turn it is
      ctx.save(); ctx.beginPath(); ctx.ellipse(pos.x, pos.y, R * 1.25, R * 0.62, 0, 0, 7); ctx.strokeStyle = TOKENS[p.token].color; ctx.lineWidth = 2.2; ctx.shadowColor = TOKENS[p.token].color; ctx.shadowBlur = 6; ctx.stroke(); ctx.restore();
    }
    drawToken(ctx, p.token, pos.x, pos.y, R * (k === s.turn ? 1.08 : 1), k + 1, pos.lift || 0, pos.squash || 0);
    if (p.held && p.pos === 8) { ctx.strokeStyle = '#1F2A24'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let d = -1; d <= 1; d++) { ctx.moveTo(pos.x + d * R * 0.6, pos.y - R * 2.4); ctx.lineTo(pos.x + d * R * 0.6, pos.y + R * 0.2); } ctx.stroke(); }
  }
}

// Money: floating amounts and flying coins. `proj` maps a board point (px, with lift) to the canvas being drawn;
// the 2D board uses the identity, the 3D table projects through its camera onto an overlay.
function drawPops(ctx) { paintMoney(ctx, (x, y, lift) => ({ x, y: y - lift }), 1); }
export function paintMoney(ctx, proj, k = 1) {
  const now = performance.now(), m = m0() * k;
  // steam puffs where a building lands
  view.puffs = view.puffs.filter((p) => now - p.t0 < p.dur);
  for (const p of view.puffs) {
    const q = (now - p.t0) / p.dur; if (q < 0) continue;
    for (let j = 0; j < 5; j++) {
      const a = j * 1.26 + p.seed, rr = m * (0.08 + q * 0.32), at = proj(p.x + Math.cos(a) * rr * 0.9 / k, p.y + Math.sin(a) * rr * 0.35 / k, q * m0() * 0.5 + j * 2);
      ctx.beginPath(); ctx.arc(at.x, at.y, m * (0.07 + q * 0.12), 0, 7);
      ctx.fillStyle = `rgba(250,246,236,${0.55 * (1 - q)})`; ctx.fill();
    }
  }
  view.coins = view.coins.filter((c) => now - c.t0 < c.dur + c.delay);
  for (const c of view.coins) {
    const q = Math.max(0, Math.min(1, (now - c.t0 - c.delay) / c.dur)); if (q <= 0) continue;
    const e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
    const p = proj(c.x0 + (c.x1 - c.x0) * e, c.y0 + (c.y1 - c.y0) * e, Math.sin(q * Math.PI) * m0() * 0.9);
    const fr = 'coin-' + (Math.floor((now - c.t0) / 70 + c.k) % 3);
    if (!sprite(ctx, fr, p.x, p.y, (m * 0.26) / unitPx(fr) / 0.8)) { ctx.beginPath(); ctx.arc(p.x, p.y, m * 0.09, 0, 7); ctx.fillStyle = '#D9AE4E'; ctx.fill(); ctx.strokeStyle = '#7A5A1A'; ctx.stroke(); }
  }
  view.pops = view.pops.filter((p) => now - p.t0 < p.dur);
  for (const p of view.pops) {
    const q = (now - p.t0) / p.dur, at = proj(p.x, p.y, q * m0() * 0.7);
    ctx.save(); ctx.globalAlpha = 1 - q * q;
    const px = Math.max(12, m * 0.26);
    ctx.font = font(px, 400, 'slab'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, px * 0.22); ctx.strokeStyle = view.theme === 'dark' ? '#14121F' : '#FFF8E8'; ctx.lineJoin = 'round';
    const sc = 1 + 0.25 * Math.max(0, 1 - q * 5);
    ctx.translate(at.x, at.y); ctx.scale(sc, sc);
    ctx.strokeText(p.text, 0, 0); ctx.fillStyle = p.good ? '#2E6A3C' : '#9A2A1C'; if (view.theme === 'dark') ctx.fillStyle = p.good ? '#5FD38A' : '#FF7B7B';
    ctx.fillText(p.text, 0, 0); ctx.restore();
  }
}

// ---------- centre: map pins and flags, calendar dial, decks, Headline ----------
function drawCentre(ctx, s, t) {
  const C = mapT.C || { x: 1.5 * view.ux, y: 1.5 * view.uy, w: 7 * view.ux, h: 7 * view.uy }, m = Math.min(C.w, C.h);
  if (mapT.s) drawPins(ctx, s, t, m, false);
  drawTray(ctx);
  drawDecks(ctx, s, t, C, m);
  drawHeadline(ctx, s, t, C, m);
  drawSeasonMarks(ctx, s, t, m);
  drawDial(ctx, s, t, C, m);
  if (mapT.s) drawPins(ctx, s, t, m, true); // the highlighted place's label goes on top of everything
  if (s.opts.variant === 'common') {
    const x = C.x + C.w / 2, y = C.y + m * 0.185;
    ctx.save(); ctx.fillStyle = view.theme === 'dark' ? '#221C38' : '#F6EDD6'; ctx.strokeStyle = t.brass; ctx.lineWidth = 1.5; rr(ctx, x - m * 0.15, y - m * 0.035, m * 0.3, m * 0.07, m * 0.035); ctx.fill(); ctx.stroke();
    ctx.fillStyle = t.ring; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; fitText(ctx, `Treasury $${s.treasury}`, x, y + 1, m * 0.27, m * 0.036, 7, 700); ctx.restore();
  }
}
export function pinXY(i) { const q = mapXY(i); if (!q || !mapT.s) return null; const p = mapPt(q.u, q.v); return inCentre(p, 4) ? { ...p, approx: q.approx } : null; }
function drawPins(ctx, s, t, m, labelOnly) {
  const r = Math.max(2.4, m * 0.0075), hot = view.flash >= 0 ? view.flash : view.cursor;
  const list = [];
  if (!labelOnly) for (const i in s.lots) {
    const p = pinXY(+i); if (!p) continue;
    list.push({ i: +i, p, owner: s.lots[i].owner });
  }
  list.sort((a, b) => a.p.y - b.p.y);
  for (const { i, p, owner } of list) {
    const sp = SPACES[i], col = sp.d ? DISTRICTS[sp.d].color : '#5A4C38';
    if (owner >= 0) {
      const T = TOKENS[s.players[owner].token], hgt = m * 0.045, fw = m * 0.032;
      ctx.save();
      ctx.strokeStyle = '#2A2219'; ctx.lineWidth = Math.max(1, m * 0.003);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - hgt); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x, p.y - hgt); ctx.lineTo(p.x + fw, p.y - hgt + fw * 0.32); ctx.lineTo(p.x, p.y - hgt + fw * 0.64); ctx.closePath();
      ctx.fillStyle = T.color; ctx.fill(); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = font(Math.max(6, fw * 0.62), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(owner + 1), p.x + fw * 0.36, p.y - hgt + fw * 0.33);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.4); ctx.strokeStyle = p.approx ? 'rgba(255,248,232,.7)' : '#FFF8E8'; if (p.approx) ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
  }
  if (hot >= 0 && labelOnly) {
    const p = pinXY(hot); if (!p) return;
    ctx.save();
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.6, 0, 7); ctx.strokeStyle = t.glow; ctx.lineWidth = 2.5; ctx.shadowColor = t.glow; ctx.shadowBlur = 8; ctx.stroke();
    const name = (p.approx ? 'Site of ' : '') + SPACES[hot].name + (p.approx ? ' (approximate)' : ''), px = Math.max(9, m * 0.03);
    ctx.font = font(px, 700); const w = ctx.measureText(name).width + px;
    const C = mapT.C; let lx = Math.max(C.x + 4, Math.min(C.x + C.w - w - 4, p.x - w / 2)), ly = p.y - r * 3 - px * 1.6;
    if (ly < C.y + 4) ly = p.y + r * 3;
    ctx.shadowBlur = 0; ctx.fillStyle = view.theme === 'dark' ? '#221C38' : '#2A2219'; rr(ctx, lx, ly, w, px * 1.5, px * 0.4); ctx.fill();
    ctx.fillStyle = '#FFF4DC'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name, lx + w / 2, ly + px * 0.78);
    ctx.restore();
  }
}
// Each active season pins a small pennant on the map where it happens (game logic shown on real places).
const SEASON_AT = { racing: [34.4850, -93.0571], spring: [34.5151, -93.0700], parade: [34.5098, -93.0546], tubs: [34.5125, -93.0545],
  summer: [34.5150, -93.0690], film: [34.5110, -93.0553], lights: [34.5250, -93.0520], winter: [34.5150, -93.0700] };
function drawSeasonMarks(ctx, s, t, m) {
  if (!mapT.s) return;
  for (const se of seasonsNow(s)) {
    const at = SEASON_AT[se.id]; if (!at) continue;
    const q = labelXY(at[0], at[1]), p = mapPt(q.u, q.v); if (!inCentre(p, m * 0.05)) continue;
    const up = Object.values(se.d).some((v) => v > 1), px = Math.max(8, m * 0.026), label = (up ? '▲ ' : '▼ ') + se.name;
    ctx.save(); ctx.font = font(px, 700); const w = ctx.measureText(label).width + px * 1.2, h = px * 1.55;
    let x = Math.min(mapT.C.x + mapT.C.w - w - 4, Math.max(mapT.C.x + 4, p.x - w / 2)), y = p.y - h - px * 0.9;
    const gz = gazetteRect();  // keep clear of the newspaper prop
    if (x < gz.x + gz.w && y + h > gz.y) { x = gz.x + gz.w - w; y = gz.y - h - 4; }
    ctx.strokeStyle = t.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, y + h); ctx.stroke();
    ctx.shadowColor = 'rgba(30,15,4,.35)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - px * 0.4, y + h / 2); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
    ctx.fillStyle = up ? '#2E6A3C' : '#8E2A1B'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#FFF6E2'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + px * 0.45, y + h / 2 + 0.5);
    ctx.restore();
  }
}
function drawDial(ctx, s, t, C, m) {
  const R = m * 0.085, cx = C.x + C.w - R * 1.22 - m * 0.04, cy = C.y + C.h * 0.42;
  const dark = view.theme === 'dark';
  ctx.save();
  ctx.shadowColor = 'rgba(30,20,8,.35)'; ctx.shadowBlur = m * 0.015; ctx.shadowOffsetY = m * 0.004;
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, 7); ctx.fillStyle = dark ? '#221C38' : '#F6EDD6'; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(1.5, R * 0.06); ctx.strokeStyle = t.brass; ctx.stroke();
  for (let k = 0; k < 12; k++) {
    const a = -Math.PI / 2 + (k / 12) * Math.PI * 2, px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
    const on = k === s.month, racing = SEASONS[0].months.includes(k);
    ctx.beginPath(); ctx.arc(px, py, on ? R * 0.27 : R * 0.17, 0, 7);
    ctx.fillStyle = on ? t.red : racing ? t.brass : (dark ? '#3A3550' : '#FFFDF6'); ctx.fill(); ctx.strokeStyle = t.rule; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = on || racing ? '#fff' : t.ink; ctx.font = font(Math.max(6.5, R * (on ? 0.3 : 0.2)), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(MONTHS[k][0], px, py + 0.5);
  }
  ctx.fillStyle = t.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitText(ctx, MONTHS[s.month].slice(0, 3).toUpperCase(), cx, cy - R * 0.14, R * 1.2, R * 0.36, 7, 400, 'slab');
  ctx.fillStyle = t.soft; fitText(ctx, `Year ${s.year + 1}`, cx, cy + R * 0.3, R * 1.2, R * 0.22, 6.5, 600);
  ctx.restore();
}
export function deckXY(which) {
  const C = mapT.C || { x: 1.5 * view.ux, y: 1.5 * view.uy, w: 7 * view.ux, h: 7 * view.uy }, m = Math.min(C.w, C.h);
  const w = m * 0.12, h = w * 1.38, y = C.y + C.h - h / 2 - m * 0.05;
  return which === 'news' ? { x: C.x + C.w - w * 1.9 - m * 0.05, y, w, h } : { x: C.x + C.w - w * 0.62 - m * 0.04, y, w, h };
}
function drawDecks(ctx, s, t, C, m) {
  for (const which of ['news', 'talk']) {
    const d = deckXY(which), news = which === 'news';
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(news ? -0.06 : 0.07);
    for (let k = 4; k >= 0; k--) {
      ctx.shadowColor = k === 4 ? 'rgba(30,20,8,.4)' : 'transparent'; ctx.shadowBlur = m * 0.02; ctx.shadowOffsetY = m * 0.006;
      rr(ctx, -d.w / 2 + k * 0.8, -d.h / 2 + k * 1.1, d.w, d.h, d.w * 0.06);
      ctx.fillStyle = k ? '#E9DCBC' : news ? '#F1E9D6' : '#E8D2A8'; ctx.fill(); ctx.strokeStyle = 'rgba(80,60,30,.5)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    ctx.shadowColor = 'transparent';
    cardBack(ctx, d.w, d.h, news);
    ctx.restore();
  }
}
export function cardBack(ctx, w, h, news) {
  const im = img(news ? 'back-news' : 'back-talk');
  if (im) { ctx.save(); rr(ctx, -w / 2, -h / 2, w, h, w * 0.06); ctx.clip(); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); return; }
  ctx.save();
  ctx.strokeStyle = news ? '#2A2219' : '#8E3622'; ctx.lineWidth = 1; rr(ctx, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, w * 0.04); ctx.stroke();
  ctx.fillStyle = news ? '#2A2219' : '#8E3622'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (news) { fitText(ctx, 'HEADLINE', 0, -h * 0.08, w * 0.8, w * 0.17, 6, 400, 'news'); ctx.fillRect(-w * 0.35, h * 0.04, w * 0.7, 1); fitText(ctx, 'NEWS', 0, h * 0.14, w * 0.8, w * 0.12, 5, 700); }
  else { fitText(ctx, 'TOWN', 0, -h * 0.1, w * 0.8, w * 0.17, 6, 400, 'slab'); fitText(ctx, 'TALK', 0, h * 0.1, w * 0.8, w * 0.17, 6, 400, 'slab'); }
  ctx.restore();
}
function gazetteRect() {
  const C = mapT.C, m = Math.min(C.w, C.h), w = Math.min(C.w * 0.44, m * 0.44), h = m * 0.17;
  return { x: C.x + m * 0.04, y: C.y + C.h - h - m * 0.04, w, h };
}
function drawHeadline(ctx, s, t, C, m) {
  const card = s.headline ? CARD[s.headline.id] : null;
  const w = Math.min(C.w * 0.44, m * 0.44), h = m * 0.17, x = C.x + w / 2 + m * 0.04, y = C.y + C.h - h / 2 - m * 0.04;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.012);
  ctx.shadowColor = 'rgba(30,20,8,.35)'; ctx.shadowBlur = m * 0.02; ctx.shadowOffsetY = m * 0.006;
  rr(ctx, -w / 2, -h / 2, w, h, 3); ctx.fillStyle = view.theme === 'dark' ? '#CFC6B0' : '#F3ECDA'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(60,45,25,.55)'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = '#2A2219'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitText(ctx, "The Barons' Gazette", 0, -h * 0.33, w * 0.9, h * 0.16, 6, 400, 'news');
  ctx.fillRect(-w * 0.44, -h * 0.2, w * 0.88, 1); ctx.fillRect(-w * 0.44, -h * 0.17, w * 0.88, 0.5);
  if (card) {
    fitText(ctx, card.title, 0, h * 0.0, w * 0.9, h * 0.2, 7, 400, 'news');
    ctx.fillStyle = '#4A3D2C';
    const ls = wrapLines(ctx, card.effect, w * 0.9, Math.max(7, h * 0.11), 600, 'label', 2);
    ls.forEach((ln, k) => fitText(ctx, ln, 0, h * 0.2 + k * h * 0.13, w * 0.92, Math.max(7, h * 0.11), 6, 600));
  } else {
    fitText(ctx, 'A Headline each new month', 0, h * 0.06, w * 0.9, h * 0.17, 7, 400, 'news');
  }
  ctx.restore();
}

// ---------- dice ----------
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
// The dice tray: a felt-lined tray on the left of the map, where the dice land and rest.
export function trayRect() {
  const C = mapT.C || { x: 1.5 * view.ux, y: 1.5 * view.uy, w: 7 * view.ux, h: 7 * view.uy }, m = Math.min(C.w, C.h);
  const w = m * 0.34, h = m * 0.17;
  return { x: C.x + m * 0.04, y: C.y + C.h - m * 0.24 - h - m * 0.06, w, h, m };
}
export function diceHome() {
  const T = trayRect();
  return { x: T.x + T.w / 2, y: T.y + T.h * 0.6, gap: T.m * 0.072, size: T.m * 0.075 };
}
function drawTray(ctx) {
  const T = trayRect(), r = T.h * 0.22, dark = view.theme === 'dark';
  ctx.save();
  ctx.shadowColor = 'rgba(30,15,4,.45)'; ctx.shadowBlur = T.h * 0.12; ctx.shadowOffsetY = T.h * 0.04;
  rr(ctx, T.x, T.y, T.w, T.h, r); ctx.fillStyle = dark ? '#3A2A1E' : '#6B4426'; ctx.fill();
  ctx.shadowColor = 'transparent';
  const g = ctx.createLinearGradient(0, T.y, 0, T.y + T.h); g.addColorStop(0, 'rgba(255,220,170,.35)'); g.addColorStop(0.5, 'rgba(255,220,170,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
  ctx.fillStyle = g; rr(ctx, T.x, T.y, T.w, T.h, r); ctx.fill();
  const i = T.h * 0.12;
  const fg = ctx.createRadialGradient(T.x + T.w / 2, T.y + T.h * 0.4, T.h * 0.1, T.x + T.w / 2, T.y + T.h / 2, T.w * 0.6);
  fg.addColorStop(0, dark ? '#24524A' : '#2F6A55'); fg.addColorStop(1, dark ? '#122C27' : '#1C4536');
  rr(ctx, T.x + i, T.y + i, T.w - i * 2, T.h - i * 2, r * 0.6); ctx.fillStyle = fg; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}
function drawDice(ctx) {
  const D = view.dice, h = diceHome();
  const pos = D.pos || [{ x: h.x - h.gap, y: h.y, lift: 0, rot: -0.12 }, { x: h.x + h.gap, y: h.y + h.gap * 0.15, lift: 0, rot: 0.18 }];
  [D.a, D.b].forEach((v, k) => {
    const p = pos[k], tumbling = D.tumbling && p.lift > 0.5;
    const name = tumbling ? `die-tumble-${(D.frame + k * 5) % 12}` : `die-${v}-${(k + (D.yawA || 0)) % 2}`;
    if (img('pieces') && SPRITES[name]) {
      const sc = (h.size * 1.05) / unitPx(name);
      const shName = `die-${v}-${k % 2}-shadow`;
      const ss = 1 / (1 + p.lift / (h.size * 2));
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(ss, ss); sprite(ctx, shName, 0, 0, sc, Math.max(0.3, ss)); ctx.restore();
      ctx.save(); ctx.translate(p.x, p.y - p.lift); ctx.rotate(tumbling ? 0 : (p.rot || 0) * 0.4); sprite(ctx, name, 0, 0, sc); ctx.restore();
    } else drawDie(ctx, p.x, p.y - p.lift - h.size * 0.5, h.size, v, tumbling ? D.spin || 0 : p.rot);
  });
}
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
