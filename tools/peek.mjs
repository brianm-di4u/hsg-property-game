#!/usr/bin/env node
// Quick look while building: opens the game from disk at desktop and phone sizes, plays a seeded game a little way
// and saves screenshots to screenshots/peek/ (git-ignored). Not a test; the harness suite is the test.
//   node games/property-game/tools/peek.mjs [months=8] [query]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.resolve(GAME, '..', '..', 'shared', 'test-harness', 'package.json'));
const { chromium } = require('playwright');
const steps = +(process.argv[2] || 40), query = process.argv[3] || '';
const out = path.join(GAME, 'screenshots', 'peek'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const [vp, size, scale] of [['desktop', { width: 1280, height: 800 }, 1], ['mobile', { width: 390, height: 844 }, 2]]) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: scale });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(pathToFileURL(path.join(GAME, 'index.html')).href + query);
  await page.waitForFunction(() => window.__game && window.__game.isIdle(), null, { timeout: 20000 });
  await page.screenshot({ path: path.join(out, `${vp}-title.png`) });
  await page.evaluate((n) => { const g = window.__game; g.seed(11); g.newGame({ seats: ['hotelier', 'speculator', 'banker', 'showman'].map((p) => ({ kind: 'ai', persona: p })) }); g.act('aiPause', true); g.act('autoplay', n); g.act('close'); }, steps);
  await page.waitForFunction(() => window.__game.isIdle(), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, `${vp}-board.png`) });
  // a built-up board: Row with bathhouses and a resort, a mortgaged lot, hotels owned
  await page.evaluate(() => {
    const g = window.__game, st = g.getState().game;
    const own = (i, o, lvl = 0, m = false) => { st.lots[i] = { owner: o, level: lvl, mortgaged: m }; };
    own(29, 0, 2); own(30, 0, 3); own(31, 0, 4); own(25, 1, 1); own(26, 1, 1); own(27, 1, 0, true); own(1, 2, 4); own(3, 2, 3); own(9, 3, 1); own(11, 3, 2); own(12, 3, 3);
    st.players.forEach((p, k) => { p.pos = [29, 26, 9, 0][k]; });
    g.setState({ game: st });
  });
  await page.waitForFunction(() => window.__game.isIdle(), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, `${vp}-built.png`) });
  console.log(vp, errs.length ? 'ERRORS: ' + errs.join(' | ') : 'ok');
  await page.close();
}
await browser.close();
