import { start, g, mod } from './helpers.mjs';

const seats = (a, b) => [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: a }, { kind: 'ai', persona: b }];

export const tests = [
  {
    name: 'personas decide differently',
    viewports: ['desktop'],
    async run(t) {
      // Same spot, different persona: a $200 lot with $250 cash.
      const decide = async (persona) => {
        await start(t, { seats: seats(persona, 'hotelier') });
        await mod(t, (s) => { s.turn = 1; s.players[1].cash = 250; s.players[1].pos = 15; s.phase = 'buy'; s.pending = { kind: 'buy', space: 15 }; });
        await t.game('act', 'ai');
        const s = await g(t);
        return s.lots[15].owner === 1 ? 'buy' : 'decline';
      };
      const spec = await decide('speculator'), bank = await decide('banker');
      t.equal(spec, 'buy', 'Speculator buys with a thin reserve');
      t.equal(bank, 'decline', 'Banker keeps its reserve');
      // Auction ceilings: the Gambler and Speculator bid higher than the Banker.
      const ceiling = async (persona) => {
        await start(t, { seats: seats(persona, 'hotelier'), seed: 3 });
        await mod(t, (s) => { s.turn = 0; s.phase = 'auction'; s.pending = { kind: 'auction', space: 25, min: 10, bid: 0, leader: 0, order: [1, 0], i: 0, out: [] }; });
        let last = 0;
        for (let k = 0; k < 80; k++) {
          const s = await g(t);
          if (s.phase !== 'auction') break;
          if (s.pending.order[s.pending.i] === 1) { await t.game('act', 'ai'); const x = await g(t); if (x.phase === 'auction' && x.pending.leader === 1) last = x.pending.bid; }
          else await t.game('act', 'do', { type: 'bid', amount: s.pending.bid + 10 });
        }
        return last;
      };
      const cs = await ceiling('speculator'), cb = await ceiling('banker');
      t.log(`auction ceilings for Eastman: speculator $${cs}, banker $${cb}`);
      t.expect(cs > cb, 'Speculator outbids the Banker');
    },
  },
  {
    name: 'an all-AI game plays to the end',
    async run(t) {
      await start(t, { seats: ['speculator', 'hotelier', 'showman', 'preservationist'].map((p) => ({ kind: 'ai', persona: p })), seed: 11 });
      let sum = await t.game('act', 'autoplay', 600);
      t.expect(!sum.error, 'no illegal AI action');
      await t.waitForStable();
      if (!sum.ended) { await t.shot('20-ai-midgame'); await t.checkLayout(); }
      sum = await t.game('act', 'autoplay', 60000);
      t.expect(!sum.error, 'no illegal AI action later');
      t.expect(sum.ended || sum.round > 100, `finished or long-running (round ${sum.round})`);
      t.log(`ended=${sum.ended} round=${sum.round} trades=${sum.stats.trades} auctions=${sum.stats.auctions}`);
    },
  },
];
