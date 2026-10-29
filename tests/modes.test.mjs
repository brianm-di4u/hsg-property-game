import { start, g, act, mod, rollTo, TWO_HUMANS } from './helpers.mjs';

const ALL_AI = ['speculator', 'hotelier', 'banker', 'showman'].map((p) => ({ kind: 'ai', persona: p }));

export const tests = [
  {
    name: 'short game deals two lots and ends after 12 months',
    async run(t) {
      await start(t, { mode: 'short', seats: [{ kind: 'human', name: 'Ada' }, ...ALL_AI.slice(0, 3)] });
      let s = await g(t);
      for (const p of s.players) {
        const lots = Object.entries(s.lots).filter(([, l]) => l.owner === p.id).map(([i]) => +i);
        t.equal(lots.length, 2, `${p.name} starts with two lots`);
        t.expect(lots.every((i) => i < 29), 'no Row leases dealt');
      }
      await t.shot('22-short');
      await t.checkLayout();
      await mod(t, (x) => { x.players[0].kind = 'ai'; x.players[0].persona = 'gambler'; });
      const sum = await t.game('act', 'autoplay', 20000);
      t.expect(sum && sum.ended, 'short game ended');
      s = await g(t);
      t.equal(s.monthsPlayed, 12, 'after exactly 12 months');
      t.equal(s.endWhy, 'the season is over', 'season end');
      t.equal((await t.state()).scene, 'over', 'game-over screen');
    },
  },
  {
    name: 'Common Ground variant: treasury and dividend',
    async run(t) {
      await start(t, { variant: 'common', seats: TWO_HUMANS });
      await mod(t, (s) => { s.lots[3].owner = 1; s.lots[1].owner = 1; s.lots[1].level = 1; s.month = 3; });
      await rollTo(t, 1, 2); // lands on Belding's Inn: base rent 14 with the full district
      let s = await g(t);
      t.equal(s.treasury, 14, 'unimproved rent goes to the treasury');
      t.equal(s.players[1].cash, 1200, 'owner gets nothing for bare land');
      await mod(t, (x) => { x.players[0].pos = 31; x.phase = 'roll'; x.pending = null; });
      await rollTo(t, 1, 1); // Ada wraps to Cabins (1 bathhouse): $30 = $6 to the treasury + $24 to Ben
      s = await g(t);
      t.equal(s.treasury, 14 + 6, 'base share to the treasury');
      t.equal(s.players[1].cash, 1200 + 24, 'improvement share to the owner');
      await t.shot('23-common');
      await t.checkLayout();
      await mod(t, (x) => { x.again = false; });
      await act(t, { type: 'end' });
      await rollTo(t, 3, 5); await act(t, { type: 'end' });
      s = await g(t);
      t.expect(s.treasury < 20, 'dividend paid out at the new month');
    },
  },
  {
    name: 'year limit ends a full game by net worth',
    async run(t) {
      await start(t, { years: 1, seats: ALL_AI.slice(0, 2) });
      const sum = await t.game('act', 'autoplay', 20000);
      t.expect(sum.ended, 'ended');
      const s = await g(t);
      t.expect(s.monthsPlayed <= 12, 'within a year');
      t.expect(s.ranking && s.ranking.length === 2, 'ranked');
    },
  },
];
