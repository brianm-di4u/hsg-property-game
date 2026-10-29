import { start, mod, act } from './helpers.mjs';

export const tests = [
  {
    name: 'fps while animating, size and load',
    async run(t) {
      t.expect(t.loadMs < 2000, `hooks ready in ${t.loadMs} ms`);
      const size = await t.page.evaluate(async () => (await (await fetch(location.href)).text()).length);
      t.log(`index.html ${(size / 1024).toFixed(1)} KB`);
      t.expect(size < 2 * 1024 * 1024, 'index.html under 2 MB');
      await start(t, { seats: ['speculator', 'hotelier', 'banker', 'showman'].map((p) => ({ kind: 'ai', persona: p })) }, { fast: false, pauseAI: true });
      await t.page.evaluate(() => { window.__G.settings.ai = 'fast'; });
      await t.game('act', 'aiPause', false);
      const fps = await t.fps(2500);
      await t.page.waitForFunction(() => window.__G.anim > 0, null, { timeout: 5000 }).catch(() => {});
      await t.shot('26-animating', { wait: false });
      t.log(`fps during AI play with token and dice animation: ${fps.toFixed(1)}`);
      t.expect(fps >= 55, 'at least 55 fps');
      await t.game('act', 'aiPause', true);
      const mem = await t.memoryMB();
      t.log(`JS heap ${mem.toFixed(1)} MB`);
      t.expect(mem < 60, 'heap under 60 MB');
      const st = await t.state();
      t.expect(st.game.log.length > 5, 'game progressed while measuring');
    },
  },
];
