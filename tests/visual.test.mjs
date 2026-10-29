// Visual layer: painted art, sprites and fonts load; the vector fallback still works; the board shows owners,
// mortgages and buildings without hiding names; the centre map has a pin for each place with a known location.
import { start, mod, g } from './helpers.mjs';

export const tests = [
  {
    name: 'art, sprites and fonts load from the manifest',
    async run(t) {
      await t.waitForStable(); // isIdle() stays false until the art has decoded
      const r = await t.page.evaluate(async () => {
        const list = Object.fromEntries(window.__game.art().list.map((n) => [n, 1])); // the inlined copy of assets/manifest.json
        const imgs = [...document.querySelectorAll('img')].length;
        return { manifest: Object.keys(list), fonts: ['700 16px "Barlow Condensed"', '16px "Alfa Slab One"', '16px "Libre Caslon Text"', '16px "Abril Fatface"'].map((f) => document.fonts.check(f)), art: document.body.classList.contains('art'), imgs };
      });
      t.expect(r.art, 'body has the painted-art class');
      t.expect(r.fonts.every(Boolean), `vendored fonts ready (${r.fonts})`);
      t.expect(r.manifest.includes('map') && r.manifest.filter((n) => n.startsWith('vig-')).length === 31, `manifest has the map and 31 vignettes (${r.manifest.length})`);
      const mode = await t.game('boardMode');
      t.log(`board: ${mode.mode} (${mode.why || 'gpu'})`);
    },
  },
  {
    name: 'built-up board: owners, mortgage ribbon, buildings, map flags',
    async run(t) {
      await start(t, { seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }, { kind: 'ai', persona: 'banker' }] });
      await mod(t, (s) => {
        const own = (i, o, level = 0, mortgaged = false) => { s.lots[i] = { owner: o, level, mortgaged }; };
        own(29, 0, 2); own(30, 0, 3); own(31, 0, 4); own(25, 1, 1); own(26, 1, 1); own(27, 1, 0, true); own(1, 2, 4); own(3, 2, 3); own(9, 2, 1); own(11, 2, 2); own(12, 2, 3);
        s.players[0].pos = 29; s.players[1].pos = 26; s.players[2].pos = 9;
      });
      const pins = await t.game('act', 'pins');
      const lots = [1, 3, 5, 6, 7, 9, 11, 12, 13, 14, 15, 17, 19, 21, 22, 23, 25, 26, 27, 29, 30, 31];
      t.expect(lots.every((i) => pins.includes(i)), `every lot has a pin on the map (${pins.length} pins)`);
      await t.shot('40-built-board');
      // a mortgaged lot keeps its name readable (the ribbon sits on the picture only)
      await t.game('act', 'cursor', 27);
      await t.shot('41-mortgaged-cursor');
      await t.game('act', 'cursor', -1);
      await t.checkLayout();
    },
  },
  {
    name: 'vector fallback with ?art=0',
    url: 'index.html?art=0',
    async run(t) {
      const r = await t.page.evaluate(() => document.body.classList.contains('art'));
      t.expect(!r, 'no painted-art class');
      await start(t);
      await t.shot('42-vector-fallback');
      const st = await t.state();
      t.equal(st.scene, 'game', 'game runs without art');
    },
  },
  {
    name: 'dice thrown across the map land on the rolled faces',
    async run(t) {
      await start(t, {}, { fast: false, pauseAI: true });
      await t.game('act', 'dice', 5, 2);
      await t.game('act', 'do', { type: 'roll' });
      await t.page.waitForFunction(() => window.__G.anim > 0, null, { timeout: 3000 }).catch(() => {});
      await t.shot('43-dice-tumble', { wait: false });
      await t.waitForStable();
      const st = await t.state();
      t.equal(st.board.dice.join('+'), '5+2', 'the dice show 5 and 2');
      const s = st.game;
      t.equal(s.dice.join('+'), '5+2', 'engine rolled 5 + 2');
      await t.shot('44-dice-landed');
      // a click on the board mid-move skips the rest of the animation
      await start(t, { seed: 9 }, { fast: false, pauseAI: true });
      await t.game('act', 'dice', 6, 5);
      await t.game('act', 'do', { type: 'roll' });
      await t.page.waitForFunction(() => window.__G.anim > 0, null, { timeout: 3000 }).catch(() => {});
      const t0 = Date.now();
      const box = await t.page.locator('#board').boundingBox();
      if (t.viewport === 'mobile') await t.tap([box.x + box.width / 2, box.y + box.height / 2]); else await t.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await t.page.waitForFunction(() => !window.__G.busy || window.__G.waitingOk, null, { timeout: 4000 }).catch(() => t.fail('skip did not finish the move'));
      t.log(`move finished ${Date.now() - t0} ms after the skip tap`);
      t.equal((await t.state()).dialog === 'deed', false, 'skip tap did not open a deed');
    },
  },
];
