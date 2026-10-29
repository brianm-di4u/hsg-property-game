// Painted art, piece sprites and fonts. Images load with new Image() + decode() (works from file:// and http);
// the vector board in render.js is the fallback (?art=0, or while loading). Only names in assets/manifest.json
// (inlined as ART_LIST) are requested, so a missing file can never 404.
import { ART_LIST } from './art-list.js';

export const art = { on: true, imgs: {}, loading: 0, ready: false, fonts: false, failed: [], want: [] };
const FONTS = ['600 16px "Barlow Condensed"', '700 16px "Barlow Condensed"', '16px "Alfa Slab One"', '16px "Libre Caslon Text"', 'italic 16px "Libre Caslon Text"', '16px "Abril Fatface"'];

export const img = (name) => (art.on ? art.imgs[name] || null : null);
export const has = (name) => ART_LIST.includes(name);

function load(name) {
  return new Promise((res) => {
    const im = new Image();
    im.src = (window.__ART_DATA && window.__ART_DATA[name]) || `assets/${name}.webp`;
    im.decode().then(() => { art.imgs[name] = im; res(true); }, () => { art.failed.push(name); res(false); });
  });
}

// Loads every listed image plus the fonts; onReady runs once everything has settled.
export function loadArt(onReady) {
  const q = new URLSearchParams(location.search);
  if (q.get('art') === '0') art.on = false;
  // Only what the board canvas draws is preloaded; card engravings and the title lid are plain <img> tags in the DOM.
  art.want = art.on ? ART_LIST.filter((n) => !/^(news-|title-|face-)/.test(n)) : [];
  art.loading = 1;
  // The vendored fonts travel as data URIs inside assets/fonts.css (Chrome blocks @font-face files on file://).
  const css = new Promise((res) => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'assets/fonts.css';
    l.onload = () => res(); l.onerror = () => res(); document.head.append(l);
  });
  const fonts = css.then(() => (document.fonts && document.fonts.load ? Promise.all(FONTS.map((f) => document.fonts.load(f))) : null))
    .then(() => { art.fonts = true; }, () => { art.fonts = true; });
  // From file://, WebGL can't take local image files (tainted canvas), so the art comes as data URLs instead.
  const data = location.protocol === 'file:' && art.want.length ? new Promise((res) => {
    const sc = document.createElement('script'); sc.src = 'assets/art-data.js'; sc.onload = () => res(); sc.onerror = () => res(); document.head.append(sc);
  }) : Promise.resolve();
  Promise.all([fonts, data.then(() => Promise.all(art.want.map(load)))]).then(() => { art.loading = 0; art.ready = true; art.readyMs = Math.round(performance.now()); onReady && onReady(); });
}
