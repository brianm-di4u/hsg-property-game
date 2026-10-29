#!/usr/bin/env node
// Close-up of the 3D table on the real GPU at 2x, for checking piece detail:  node tools/zoom3d.mjs x y w h [query]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.resolve(GAME, 'shared', 'test-harness', 'package.json'));
const { chromium } = require('playwright');
const [x, y, w, h] = process.argv.slice(2, 6).map(Number), q = process.argv[6] || '?gl=3d';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(GAME, 'index.html')).href + q);
await page.waitForFunction(() => window.__game && window.__game.isIdle(), null, { timeout: 20000 });
await page.evaluate(() => { const g = window.__game; g.seed(11); g.newGame({ seats: ['hotelier', 'speculator', 'banker', 'showman'].map((p) => ({ kind: 'ai', persona: p })) }); g.act('aiPause', true); g.act('autoplay', 120); g.act('close');
  const st = g.getState().game, own = (i, o, l = 0, m = false) => { st.lots[i] = { owner: o, level: l, mortgaged: m }; };
  own(29, 0, 2); own(30, 0, 3); own(31, 0, 4); own(25, 1, 1); own(26, 1, 1); own(27, 1, 0, true); own(1, 2, 4); own(3, 2, 3); own(9, 3, 1); own(11, 3, 2); own(12, 3, 3);
  st.players.forEach((p, k) => { p.pos = [29, 26, 9, 0][k]; }); g.setState({ game: st }); });
await page.waitForFunction(() => window.__game.isIdle(), null, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(GAME, 'screenshots', 'peek3d', 'zoom.png'), clip: { x, y, width: w, height: h } });
await browser.close();
