import { start } from './helpers.mjs';

export const tests = [
  {
    name: 'every deed and card shows a sourced fact',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      const missing = [];
      for (let i = 0; i < 32; i++) {
        await t.game('act', 'open', 'deed', i);
        const txt = await t.page.locator('#modal').innerText();
        const isCard = /Town Talk/.test(txt) && !/Source:/.test(txt);
        if (!/Source:/.test(txt) && !isCard) missing.push(i);
        if (i === 31) await t.shot('24-deed-fact');
        await t.game('act', 'close');
      }
      t.equal(missing.length, 0, `spaces without a source: ${missing.join(', ') || 'none'}`);
      const ids = await t.page.evaluate(() => {
        const out = [];
        for (const sel of ['n-railroad', 'n-fire1913', 't-water', 't-pardon']) out.push(sel);
        return out;
      });
      for (const id of ids) {
        await t.game('act', 'open', 'card', id);
        const txt = await t.page.locator('#modal').innerText();
        t.expect(/Source:/.test(txt) || /Game card/i.test(txt), `${id} shows a source or says it is fictional`);
        t.expect(/Game effect/i.test(txt), `${id} labels its effect as game logic`);
        await t.game('act', 'close');
      }
    },
  },
  {
    name: 'board labels game prices as game logic',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      await t.game('act', 'open', 'deed', 27);
      const txt = await t.page.locator('#modal').innerText();
      t.expect(/Game price/i.test(txt), 'deed labels the price as a game price');
      t.expect(/first Arlington Hotel opened in 1875/.test(txt), 'Arlington fact');
    },
  },
];
