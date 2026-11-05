import { start, g } from './helpers.mjs';
export const tests = [
  ...[{mode:'short',label:'short season'},{mode:'full',years:1,label:'full one-year limit'}].map(({label,...opts})=>({
    name: 'results elapsed months: '+label,
    viewports: ['desktop'],
    async run(t) {
      // Explicit seeded fixture setup; no earned natural progression claim.
      await start(t,{...opts,seats:[{kind:'human',name:'Ada'},{kind:'ai',persona:'hotelier'}],seed:7});
      await t.game('act','autoplay',2000);
      await t.waitForStable();
      const s=await g(t);
      t.expect(s.ended,'fixture reaches the normal game-end condition');
      t.equal(s.monthsPlayed,12,'exactly twelve elapsed months');
      t.equal(s.round,13,'current month ordinal remains unchanged');
      t.equal((await t.state()).scene,'over','results screen reached');
      const text=await t.page.locator('.over .lede').innerText();
      t.expect(text.includes('after 12 months.'),'results report twelve elapsed months: '+text);
      await t.shot('results-months-'+opts.mode);
    }
  }))
];
