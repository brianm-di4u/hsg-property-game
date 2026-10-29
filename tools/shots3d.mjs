#!/usr/bin/env node
// Screenshots of the 3D table on the real GPU (installed Chrome, headless, ANGLE/D3D11), served over http from the
// repo like the harness, at the harness's two viewports. The harness itself has only software GL, so its shots show
// the flat board; this tool records the 3D view for review and measures frame rate and per-frame script time.
//   node tools/shots3d.mjs [milestone=vis-3d] [--fps] [--throttle]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(GAME);
const require = createRequire(path.resolve(ROOT, 'shared', 'test-harness', 'package.json'));
const { chromium } = require('playwright');
const args = process.argv.slice(2), milestone = args.find((a) => !a.startsWith('--')) || 'vis-3d';
const FPS = args.includes('--fps'), THROTTLE = args.includes('--throttle');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/index.html`;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const SEATS = [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }, { kind: 'ai', persona: 'speculator' }, { kind: 'ai', persona: 'banker' }];
const idle = (page) => page.waitForFunction(() => window.__game.isIdle(), null, { timeout: 20000 }).catch(() => {});
for (const [vp, viewport, scale] of [['desktop', { width: 1280, height: 800 }, 1], ['mobile', { width: 390, height: 844 }, 2]]) {
  const dir = path.join(GAME, 'screenshots', milestone, vp); fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, hasTouch: vp === 'mobile' });
  const page = await ctx.newPage();
  const errs = [], ext = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1') && !r.url().startsWith('data:')) ext.push(r.url()); });
  const shot = async (n) => { await idle(page); await page.waitForTimeout(120); await page.screenshot({ path: path.join(dir, n + '.png') }); };
  await page.goto(base + '?gl=3d');
  await page.waitForFunction(() => window.__game && window.__game.isIdle(), null, { timeout: 30000 });
  await shot('01-title');
  await page.evaluate((seats) => { const g = window.__game; g.seed(7); g.newGame({ seats }); g.act('aiPause', true); }, SEATS);
  await shot('05-board');
  // a roll mid-flight: dice tumbling and the camera leaning in
  await page.evaluate(() => { const g = window.__game; g.act('dice', 4, 2); g.act('do', { type: 'roll' }); });
  await page.waitForTimeout(1150); await page.screenshot({ path: path.join(dir, '26-animating.png') });
  await idle(page); await shot('08-buy-dialog');
  await page.evaluate(() => window.__game.act('do', { type: 'buy' }));
  await idle(page);
  // a built-up board after some AI play
  await page.evaluate(() => { const g = window.__game; g.act('close');
    const s = g.getState().game, own = (i, o, l = 0, m = false) => { s.lots[i] = { owner: o, level: l, mortgaged: m }; };
    own(29, 0, 2); own(30, 0, 3); own(31, 0, 4); own(25, 1, 1); own(26, 1, 2); own(27, 1, 0, true); own(1, 2, 4); own(3, 2, 3); own(9, 3, 1); own(11, 3, 2); own(12, 3, 3);
    s.players.forEach((p, k) => { p.pos = [29, 26, 9, 0][k] ?? 0; }); s.month = 5; g.setState({ game: s }); });
  await shot('12-resort');
  if (vp === 'mobile') { await page.click('#b-view'); await shot('12b-whole-board'); await page.click('#b-view'); }
  await page.evaluate(() => window.__game.act('open', 'deed', 31)); await shot('11-deed');
  await page.evaluate(() => window.__game.act('close'));
  await page.evaluate(() => window.__game.act('open', 'card', 'n-fire1913')); await shot('15-headline');
  await page.evaluate(() => window.__game.act('close'));
  await page.evaluate(() => window.__game.act('open', 'card', 't-ostrich')); await shot('16-town-talk');
  await page.evaluate(() => window.__game.act('close'));
  if (FPS) {
    const cdp = THROTTLE ? await ctx.newCDPSession(page) : null;
    if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate(() => { const g = window.__game; g.seed(3); g.newGame({ seats: ['hotelier', 'speculator', 'banker', 'showman'].map((p) => ({ kind: 'ai', persona: p })) }); window.__G.settings.ai = 'fast'; g.act('fast', false); g.act('aiPause', false); });
    const r = await page.evaluate(() => new Promise((res) => { let n = 0, t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res({ fps: n / ((performance.now() - t0) / 1000), frame: window.__B3frames ? window.__B3frames() : null }); }; requestAnimationFrame(f); }));
    const heap = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0);
    console.log(`${vp}: heap ${heap.toFixed(1)} MB · ${r.fps.toFixed(1)} fps${THROTTLE ? ' (4x CPU throttle)' : ''}${r.frame ? `, median render ${r.frame.toFixed(1)} ms` : ''}`);
    await page.evaluate(() => window.__game.act('aiPause', true));
    if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  // the Neon night theme is a lighting change
  await page.evaluate(() => { localStorage.setItem('hs-barons-settings-v1', JSON.stringify({ theme: 'dark' })); });
  await page.reload(); await page.waitForFunction(() => window.__game && window.__game.isIdle(), null, { timeout: 30000 });
  await page.click('[data-go=continue]'); await shot('28-dark');
  await page.evaluate(() => { localStorage.removeItem('hs-barons-settings-v1'); });
  const mode = await page.evaluate(() => window.__game.boardMode());
  console.log(`${vp}: ${mode.mode} on ${mode.gpu.slice(0, 60)} · errors ${errs.length}${errs.length ? ' ' + errs.slice(0, 3).join(' | ') : ''} · external ${ext.length}`);
  await ctx.close();
}
await browser.close(); server.close();
