import { start, g, act, rollTo, runAI, click } from './helpers.mjs';

export const tests = [
  {
    name: 'resume after reload',
    async run(t) {
      await start(t);
      await rollTo(t, 2, 3); await act(t, { type: 'buy' }); await act(t, { type: 'end' });
      await runAI(t);
      const before = await g(t);
      await t.reload();
      t.equal((await t.state()).scene, 'title', 'reload shows the title');
      t.expect(!(await t.page.locator('[data-go="continue"]').isDisabled()), 'Continue enabled');
      await t.game('act', 'aiPause', true);
      await click(t, '[data-go="continue"]');
      await t.waitForStable();
      const after = await g(t);
      t.equal((await t.state()).scene, 'game', 'back in the game');
      t.equal(JSON.stringify(after.players.map((p) => [p.cash, p.pos])), JSON.stringify(before.players.map((p) => [p.cash, p.pos])), 'cash and positions restored');
      t.equal(JSON.stringify(after.lots), JSON.stringify(before.lots), 'lots restored');
      t.equal(after.rng, before.rng, 'RNG state restored');
      t.equal(after.month, before.month, 'month restored');
      await t.shot('31-resumed');
      await t.checkLayout();
    },
  },
];
