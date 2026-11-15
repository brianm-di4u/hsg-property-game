import { start, g, act, mod, TWO_HUMANS, click } from './helpers.mjs';
import * as E from '../src/js/engine.js';
import { OWNABLE } from '../src/js/data.js';

// Wave 3, batch B: selling a Grand Resort one step at a time, a faster way through the rivals' turns, bidding any
// amount, authored scenarios and the daily game, the Hot Springs stories on the deeds, and a way to look round the 3D board.

export const tests = [
  {
    name: 'P-N01 a Grand Resort sells back one step at a time, and Help says how building works',
    node: true,
    async run(t) {
      const s = E.createGame({ seed: 3, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai' }] });
      for (const i of OWNABLE) s.lots[i].owner = -1;
      const lot = 1, cost = E.buildCost(lot), half = Math.floor(cost * 0.5);
      s.lots[lot].owner = 0; s.lots[lot].level = 4; s.phase = 'post'; s.turn = 0; s.players[0].cash = 100;
      let r = E.apply(s, { type: 'sell', space: lot });
      t.expect(r.ok, 'a Grand Resort can be sold');
      t.equal(s.lots[lot].level, 3, 'it goes back to three bathhouses, not to nothing');
      t.equal(s.players[0].cash, 100 + half, 'and pays back one step, not four');
      r = E.apply(s, { type: 'sell', space: lot });
      t.equal(s.lots[lot].level, 2, 'the next sale takes one more level');
      t.equal(s.players[0].cash, 100 + 2 * half, 'for one more step');
      const { helpHtml } = await import('../src/js/ui.js');
      const html = helpHtml('rules');
      t.expect(/one level off at a time/i.test(html) && /three bathhouses/.test(html), 'Help says a resort sells back a step at a time');
      t.expect(/ahead of its neighbours/.test(html), 'and that building has no even-build rule');
    },
  },
];
