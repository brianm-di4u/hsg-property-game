import { start, spaceAt, centerOf } from './helpers.mjs';

export const tests = [
  {
    name: 'tap a space for its deed; touch targets',
    viewports: ['mobile'],
    async run(t) {
      await start(t);
      const p = await spaceAt(t, 31);
      await t.tap(p);
      await t.waitForStable();
      const st = await t.state();
      t.equal(st.dialog, 'deed', 'tap opens the deed');
      const txt = await t.page.locator('#modal').innerText();
      t.expect(/Fordyce Bathhouse/.test(txt), 'Fordyce deed');
      t.expect(/212,749\.55/.test(txt), 'shows its sourced fact');
      await t.shot('27-touch-deed');
      await t.checkLayout();
      const c = await centerOf(t, '#modal [data-ok]');
      await t.tap(c);
      await t.waitForStable();
      t.equal((await t.state()).dialog, null, 'tap Close');
      const small = await t.page.evaluate(() => [...document.querySelectorAll('#actions .btn, #topbar .iconbtn')].map((b) => b.getBoundingClientRect()).filter((r) => r.width < 44 || r.height < 44).length);
      t.equal(small, 0, 'action buttons are at least 44 px');
      const roll = await centerOf(t, '#actions [data-key="R"]');
      await t.tap(roll);
      await t.waitForStable();
      const s = (await t.state()).game;
      t.expect(s.log.some((l) => /^Ada rolls/.test(l)), 'tap Roll rolls the dice');
    },
  },
];
