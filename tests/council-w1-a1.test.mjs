import { start, g, act, mod, rollTo, TWO_HUMANS, click } from './helpers.mjs';
import * as E from '../src/js/engine.js';
import { OWNABLE, SPACES } from '../src/js/data.js';

// Debt for Ada with only a transit line (4) or the Water Co. (10) to sell: the Raise cash dialog must open.
const debtOwning = (space) => async (t) => {
  await start(t, { seats: TWO_HUMANS });
  await mod(t, (s) => { s.players[0].cash = 20; s.lots[space].owner = 0; s.lots[5].owner = 1; s.lots[6].owner = 1; s.lots[7].owner = 1; s.lots[5].level = 1; s.month = 3; });
  await rollTo(t, 2, 3);
  t.equal((await g(t)).phase, 'debt', 'in debt');
  t.equal((await t.state()).dialog, 'debt', 'Raise cash dialog opened');
  t.equal(await t.page.locator(`#modal [data-act="build"], #modal [data-act="sell"]`).count(), 0, 'no Build or Sell button for a line or utility');
  await click(t, `#modal [data-act="mortgage"][data-i="${space}"]`);
  await t.waitForStable();
  const s = await g(t);
  t.expect(s.lots[space].mortgaged, 'mortgaged from the dialog');
  t.equal(s.phase, 'post', 'debt paid, turn resumes');
};

export const tests = [
  { name: 'S1-01 debt dialog opens when the debtor owns only a transit line', run: debtOwning(4) },
  { name: 'S1-01 debt dialog opens when the debtor owns only the Water Co.', run: debtOwning(10) },
  {
    name: 'S1-01 Manage opens for an owner of a line and the utility',
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await mod(t, (s) => { s.lots[4].owner = 0; s.lots[10].owner = 0; s.lots[1].owner = 0; s.phase = 'post'; });
      await t.game('act', 'open', 'manage');
      t.equal((await t.state()).dialog, 'manage', 'Manage dialog open');
      t.equal(await t.page.locator('#modal [data-act="build"][data-i="4"], #modal [data-act="build"][data-i="10"], #modal [data-act="sell"][data-i="4"], #modal [data-act="sell"][data-i="10"]').count(), 0, 'no Build or Sell on line or utility');
      t.equal(await t.page.locator('#modal [data-act="mortgage"][data-i="4"]').count(), 1, 'line can be mortgaged');
      t.equal(await t.page.locator('#modal [data-act="mortgage"][data-i="10"]').count(), 1, 'utility can be mortgaged');
      t.equal(await t.page.locator('#modal [data-act="build"][data-i="1"]').count(), 1, 'lots keep Build');
      await t.checkLayout();
    },
  },
  {
    name: 'S6-01 engine cost and worth helpers accept every ownable space',
    node: true,
    async run(t) {
      const s = E.createGame({ seed: 3, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'human', name: 'Ben' }] });
      for (const i of OWNABLE) {
        let cost;
        try { cost = E.buildCost(i); } catch (e) { t.fail(`buildCost(${i}) threw: ${e.message}`); continue; }
        if (SPACES[i].type !== 'lot') t.equal(cost, 0, `${SPACES[i].name} has no build cost`);
        s.lots[i].owner = 0;
        t.expect(Number.isFinite(E.lotWorth(s, i)) && Number.isFinite(E.netWorth(s, 0)), `worth of ${SPACES[i].name} is a number`);
      }
    },
  },
];
