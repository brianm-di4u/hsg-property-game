#!/usr/bin/env node
// Opens the game straight from disk (file://, no server) and checks that the vendored fonts, the painted art and
// the piece atlas load, a game starts and plays a few AI turns, and nothing errors or leaves the machine.
// Runs twice: the harness Chromium (software GL: the flat board) and installed Chrome on the GPU (the 3D table).
//   node games/property-game/tools/check-file-url.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.resolve(GAME, '..', '..', 'shared', 'test-harness', 'package.json'));
const { chromium } = require('playwright');
let failed = 0;
for (const [label, launch] of [['harness chromium', {}], ['chrome gpu', { channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] }]]) {
  let browser;
  try { browser = await chromium.launch(launch); } catch (e) { console.log(`SKIP  [${label}] cannot launch: ${e.message.split('\n')[0]}`); continue; }
  for (const [name, viewport, scale] of [['desktop', { width: 1280, height: 800 }, 1], ['mobile', { width: 390, height: 844 }, 2]]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: scale });
    const errors = [], external = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) external.push(r.url()); });
    await page.goto(pathToFileURL(path.join(GAME, 'index.html')).href);
    await page.waitForFunction(() => window.__game && window.__game.isIdle(), null, { timeout: 30000 });
    await page.evaluate(() => { const g = window.__game; g.seed(5); g.newGame({ seats: ['hotelier', 'banker', 'gambler'].map((p) => ({ kind: 'ai', persona: p })) }); g.act('aiPause', true); g.act('autoplay', 40); g.act('close'); });
    await page.waitForFunction(() => window.__game.isIdle(), null, { timeout: 30000 }).catch(() => errors.push('never idle'));
    const r = await page.evaluate(() => ({
      fonts: ['700 16px "Barlow Condensed"', '16px "Alfa Slab One"', '16px "Libre Caslon Text"', '16px "Abril Fatface"'].every((f) => document.fonts.check(f)),
      art: document.body.classList.contains('art'), mode: window.__game.boardMode(), month: window.__game.getState().game.round,
    }));
    const ok = r.fonts && r.art && !errors.length && !external.length;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  [${label} · ${name}] board ${r.mode.mode}${r.mode.why ? ' (' + r.mode.why + ')' : ''} · fonts ${r.fonts ? 'ok' : 'MISSING'} · art ${r.art ? 'ok' : 'MISSING'} · round ${r.month}` +
      `${errors.length ? ' · errors: ' + errors.slice(0, 3).join(' | ') : ''}${external.length ? ' · external: ' + external.slice(0, 3).join(' ') : ''}`);
    await page.close();
  }
  await browser.close();
}
process.exit(failed ? 1 : 0);
