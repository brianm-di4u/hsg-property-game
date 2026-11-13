import { start, g, mod } from './helpers.mjs';
import * as E from '../src/js/engine.js';
import * as AI from '../src/js/ai.js';

export const tests = [
  {
    name: 'S6-20 the Town ledger lists the recent log after Continue',
    async run(t) {
      await start(t);
      await mod(t, (s) => { for (let k = 0; k < 12; k++) s.log.push(`Ledger line ${k}`); });
      await t.page.evaluate(() => { const s = window.__game.getState().game; localStorage.setItem('__probe', JSON.stringify(s)); });
      await t.game('scene', 'title');
      await t.page.evaluate(() => window.__game.setState(JSON.parse(localStorage.getItem('__probe'))));
      await t.waitForStable();
      const lines = await t.page.locator('#log li').allTextContents();
      t.expect(lines.length >= 8, `ledger shows at least 8 lines after loading (got ${lines.length})`);
      t.expect(lines.includes('Ledger line 0') && lines.includes('Ledger line 11'), 'ledger holds the old and the newest line');
    },
  },
  {
    name: 'S4-07 title tagline sits on a near-opaque cream ribbon',
    async run(t) {
      await t.game('scene', 'title');
      await t.waitForStable();
      const sub = t.page.locator('.lidtitle .sub');
      if (!(await sub.count())) { t.log('no illustrated title in this run'); return; }
      const bg = await sub.evaluate((el) => getComputedStyle(el).backgroundColor);
      const m = bg.match(/rgba?\(([^)]+)\)/);
      const a = m ? (m[1].split(',')[3] === undefined ? 1 : parseFloat(m[1].split(',')[3])) : 0;
      t.expect(a >= 0.9, `tagline background is near opaque (${bg})`);
      await t.shot('title-tagline');
      await t.checkLayout();
    },
  },
  {
    name: 'P-N02 the AI discounts a mortgaged lot by the cost of lifting it',
    node: true,
    async run(t) {
      const s = E.createGame({ seed: 5, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }] });
      const lot = 1;
      s.lots[lot].owner = 0;
      const buy = (mortgaged) => { s.lots[lot].mortgaged = mortgaged; return AI.evalTrade(s, 1, { from: 0, give: { lots: [lot], cash: 0 }, get: { lots: [], cash: 50 } }); };
      const clean = buy(false), owed = buy(true);
      t.expect(clean - owed >= E.unmortgageCost(lot) - 1, `mortgaged lot scores ${clean - owed} lower, lifting costs ${E.unmortgageCost(lot)}`);
      // A lot the AI gives away: a mortgaged one is worth less to lose.
      s.lots[lot].owner = 1;
      const give = (mortgaged) => { s.lots[lot].mortgaged = mortgaged; return AI.evalTrade(s, 1, { from: 0, give: { lots: [], cash: 100 }, get: { lots: [lot], cash: 0 } }); };
      t.expect(give(true) - give(false) >= E.unmortgageCost(lot) - 1, 'giving away a mortgaged lot costs the AI less');
    },
  },
];
