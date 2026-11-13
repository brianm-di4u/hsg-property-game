import { start, g, mod } from './helpers.mjs';

// Ben (seat 1) owns lot; Ada (seat 0) is sent to roll onto it.
async function ownedLot(t, lot, level = 0) {
  await start(t);
  await mod(t, (s) => { s.lots[lot].owner = 1; s.lots[lot].level = level; s.players[0].pos = lot - 3; });
}

export const tests = [
  {
    name: 'S2-03 phones get a Ledger button that opens the Town ledger as a sheet',
    viewports: ['mobile'],
    async run(t) {
      await start(t);
      await mod(t, (s) => { for (let k = 0; k < 6; k++) s.log.push(`Ledger line ${k}`); });
      const btn = t.page.locator('#b-ledger');
      t.expect(await btn.isVisible(), 'Ledger button is visible in the top bar on a phone');
      t.expect(!(await t.page.locator('#logbox').isVisible()), 'the panel ledger stays hidden on a phone');
      await btn.click();
      await t.waitForStable();
      const lines = await t.page.locator('#modal .ledger li').allTextContents();
      t.expect(lines.includes('Ledger line 0') && lines.includes('Ledger line 5'), `the sheet lists the log (${lines.length} lines)`);
      await t.shot('ledger-sheet');
      await t.checkLayout();
      await t.page.locator('#modal [data-ok]').click();
      t.expect(await t.page.locator('#modal').isHidden(), 'Close dismisses the sheet');
    },
  },
  {
    name: 'S2-03 the Ledger button is only for phones; the event slip wraps there',
    async run(t) {
      await start(t);
      const shown = await t.page.locator('#b-ledger').isVisible();
      const ws = await t.page.locator('#event').evaluate((el) => getComputedStyle(el).whiteSpace);
      if (t.viewport === 'mobile') t.expect(shown && ws === 'normal', `phone: button ${shown}, event white-space ${ws}`);
      else t.expect(!shown && ws === 'nowrap', `desktop: button ${shown}, event white-space ${ws}`);
    },
  },
  {
    name: 'S2-03 the rent toast names the payer, owner, lot and why',
    async run(t) {
      await ownedLot(t, 13, 0);
      await t.game('act', 'dice', 1, 2);
      await t.game('act', 'do', { type: 'roll' });
      await t.waitForStable();
      const text = await t.page.locator('#event').textContent();
      t.expect(/Ada pays \$\d+ to .+ for /.test(text), `toast names payer, owner and lot: "${text}"`);
      const s = await g(t);
      t.expect(text.includes(s.players[1].name), 'the toast names the owner');
    },
  },
];
