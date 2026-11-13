import { start, g, mod } from './helpers.mjs';
import * as E from '../src/js/engine.js';

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
  {
    name: 'S4-31 the rent event carries the breakdown, and the log and toast show it',
    async run(t) {
      await ownedLot(t, 13, 3);
      await t.game('act', 'dice', 1, 2);
      await t.game('act', 'do', { type: 'roll' });
      await t.waitForStable();
      const text = await t.page.locator('#event').textContent();
      t.expect(text.includes('3 bathhouses'), `toast shows the building level: "${text}"`);
      const s = await g(t);
      t.expect(s.log.some((l) => /owes \$\d+ rent on .*\(3 bathhouses/.test(l)), 'the ledger line carries the same breakdown');
    },
  },
  {
    name: 'S4-31 rentParts reports whole district, Grand Resort, lines and season notes',
    node: true,
    async run(t) {
      const s = E.createGame({ seed: 5, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'human', name: 'Ben' }] });
      s.lots[1].owner = 1;
      t.expect(E.rentParts(s, 1, 7).notes.length === 0 || E.rentParts(s, 1, 7).notes.every((n) => n.startsWith('season')), 'a lone lot has no building note');
      s.lots[1].level = 4;
      t.expect(E.rentParts(s, 1, 7).notes.includes('Grand Resort'), 'Grand Resort named');
      const line = 4;
      s.lots[line].owner = 1;
      t.expect(E.rentParts(s, line, 7).notes[0].includes('lines'), 'a transit line names how many lines the owner holds');
    },
  },
  {
    name: 'S1-17 a tumbling die casts no shadow on the Gazette',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      await t.game('force2D');
      await t.waitForStable();
      const sample = async () => t.page.evaluate(() => {
        const c = document.querySelector('#board'), k = c.width / c.clientWidth, ctx = c.getContext('2d');
        return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => {
          const h = window.__game.act('dicePos', window.__shadowPos || null);
          requestAnimationFrame(() => requestAnimationFrame(() => {
            const r = c.getBoundingClientRect(), x = Math.round((h.x - h.size * 1.6) * k), y = Math.round((h.y + h.gap * 3.4 - h.size * 1.2) * k), w = Math.round(h.size * 3.2 * k), hh = Math.round(h.size * 2.4 * k);
            res(Array.from(ctx.getImageData(x, y, w, hh).data));
          }));
        })));
      });
      const clean = await sample();
      await t.page.evaluate(() => { window.__shadowPos = [{ x: 0, y: 3.4, lift: 12 }, { x: 0.2, y: 3.4, lift: 12 }]; });
      const shaded = await sample();
      let diff = 0; for (let i = 0; i < clean.length; i += 4) diff += Math.abs(clean[i] - shaded[i]) + Math.abs(clean[i + 1] - shaded[i + 1]) + Math.abs(clean[i + 2] - shaded[i + 2]);
      t.expect(diff === 0, "the Gazette area is unchanged by a high die's shadow (pixel difference " + diff + ")");
    },
  },
];
