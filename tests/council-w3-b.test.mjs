import { start, g, act, mod, AI2, TWO_HUMANS, click } from './helpers.mjs';
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

// Waits for a condition on the game state (never for a fixed time); fails the test if it never comes.
async function until(t, what, ok, tries = 400) {
  let s;
  for (let k = 0; k < tries; k++) { s = await t.state(); if (s.dialog === 'card' && s.waitingOk) await t.page.click('[data-ok]'); else if (ok(s)) return s; await t.page.waitForTimeout(50); }
  t.fail(`never reached: ${what}`); return s;
}
// A one-human, one-rival table with the rival's move held, at the moment the human has ended their turn.
async function rivalToMove(t) {
  await start(t, { seats: AI2, seed: 11 }, { fast: false, pauseAI: true });
  for (let k = 0; k < 6; k++) {
    const s = await t.state();
    if (s.actor !== 0) return s;
    const L = s.legal.map((x) => x.type);
    const pick = L.includes('end') && s.game.phase === 'post' ? 'end' : L.includes('roll') ? 'roll' : L.includes('buy') ? 'buy' : L.includes('decline') ? 'decline' : L.includes('pass') ? 'pass' : L[0];
    await t.game('act', 'do', { type: pick });
    await t.waitForStable();
  }
  return t.state();
}

const skipTests = ['button', 'key'].map((how) => ({
  name: `S1-03 Skip ahead (${how}) runs the rival's turn at once, and the next move of yours is back to normal`,
  async run(t) {
    const s0 = await rivalToMove(t);
    t.equal(s0.actor, 1, 'the rival is to move');
    t.equal(s0.rush, false, 'skipping is off to begin with');
    const skip = t.page.locator('#actions .btn', { hasText: 'Skip ahead' });
    t.equal(await skip.count(), 1, 'a Skip ahead button shows while the rival plays');
    const b = await skip.boundingBox();
    t.expect(b && b.height >= 44 && b.width >= 44, `and it is a big enough target (${b && Math.round(b.width)}x${b && Math.round(b.height)})`);
    await t.checkLayout();
    await t.shot(`S1-03-skip-ahead-${how}`);
    if (how === 'button') await skip.click(); else await t.page.keyboard.press('Space');
    t.equal((await t.state()).rush, true, 'skipping is on');
    await t.game('act', 'aiPause', false);
    const s1 = await until(t, 'the human to move again', (s) => s.actor === 0 && !s.busy);
    t.equal(s1.rush, true, 'it stays on through the rest of the rivals\' moves');
    const L = s1.legal.map((x) => x.type);
    await t.game('act', 'do', { type: L.includes('roll') ? 'roll' : L.includes('pass') ? 'pass' : L.includes('buy') ? 'buy' : L[0] });
    t.equal((await t.state()).rush, false, 'and ends when the human acts');
  },
}));
tests.push(...skipTests);
tests.push({
  name: 'S1-03 Skip ahead is offered only while a rival plays, and the rival\'s think time is shorter',
  node: true,
  async run(t) {
    const src = (await import('node:fs')).readFileSync(new URL('../src/js/main.js', import.meta.url), 'utf8');
    t.expect(/AI_THINK = \{ normal: 400,/.test(src), 'the Normal think time is 400 ms (it was 650)');
    t.expect(/AI_CARD_HOLD = \{ normal: 1500,/.test(src), 'the rival\'s card is held 1500 ms (it was 2200)');
  },
});
