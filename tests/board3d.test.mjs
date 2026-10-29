// The 3D table, forced on with ?gl=3d (the harness only has software GL, which normally falls back to the flat board).
// It is slow in software, so the checks are few: the scene builds, clicks pick the right space through the camera,
// dice land on the rolled faces, the camera settles, and the flat board takes over cleanly.
import { start, g, spaceAt } from './helpers.mjs';

export const tests = [
  {
    name: '3D table: builds, picks spaces, rolls, falls back',
    url: 'index.html?gl=3d',
    async run(t) {
      await t.waitForStable();
      const m = await t.game('boardMode');
      t.equal(m.mode, '3d', `3D table on (${m.gpu.slice(0, 40)})`);
      await start(t);
      await t.shot('50-table-3d');
      // a real click on the Fordyce through the perspective camera opens its deed
      if (t.viewport === 'mobile') await t.page.click('#b-view'); // whole-board view first on phones
      await t.waitForStable();
      const p = await spaceAt(t, 31);
      await t.page.mouse.click(p[0], p[1]);
      await t.waitForStable();
      const st = await t.state();
      t.equal(st.dialog, 'deed', 'click opens a deed');
      t.expect(/Fordyce/.test(await t.page.locator('#modal').innerText()), 'the Fordyce deed');
      await t.game('act', 'close');
      // roll with animation; the camera leans in and comes back
      await t.game('act', 'fast', false);
      await t.game('act', 'dice', 6, 3);
      await t.game('act', 'do', { type: 'roll' });
      await t.page.waitForFunction(() => window.__game.isIdle(), null, { timeout: 30000 }).catch(() => t.fail('3D roll did not settle'));
      const s2 = await t.state();
      t.equal(s2.board.dice.join('+'), '6+3', 'dice show 6 and 3');
      t.equal((await g(t)).players[0].pos, 9, 'token moved nine spaces');
      await t.shot('51-table-3d-after-roll');
      t.equal(await t.game('force2D'), true, 'switches to the flat board');
      t.equal((await t.game('boardMode')).mode, '2d', 'flat board now');
      await t.waitForStable();
      await t.shot('52-fallback-2d');
      await t.checkLayout();
    },
  },
];
