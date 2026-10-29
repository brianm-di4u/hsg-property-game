import { start, g, act, mod, rollTo, TWO_HUMANS } from './helpers.mjs';

export const tests = [
  {
    name: 'roll, move and buy',
    async run(t) {
      await start(t);
      await rollTo(t, 2, 3);
      let s = await g(t);
      t.equal(s.players[0].pos, 5, 'moved 5 spaces to the Ostrich Farm');
      t.equal(s.phase, 'buy', 'offered to buy');
      await t.shot('08-buy-dialog');
      await t.checkLayout();
      await act(t, { type: 'buy' });
      s = await g(t);
      t.equal(s.lots[5].owner, 0, 'Ada owns the Ostrich Farm');
      t.equal(s.players[0].cash, 1100, 'paid $100');
      t.equal(s.phase, 'post', 'post-move phase');
    },
  },
  {
    name: 'doubles roll again; three doubles go to the Grand Jury',
    async run(t) {
      await start(t);
      await rollTo(t, 3, 3); await act(t, { type: 'buy' });
      await act(t, { type: 'end' });
      let s = await g(t);
      t.equal(s.turn, 0, 'still Ada after doubles'); t.equal(s.phase, 'roll', 'may roll again');
      await rollTo(t, 2, 2); await act(t, { type: 'buy' }); await act(t, { type: 'end' });
      const r3 = await rollTo(t, 4, 4);
      s = await g(t);
      t.equal(s.players[0].pos, 8, 'sent to the Grand Jury Room'); t.equal(s.players[0].held, 1, 'held');
      await t.shot('06-moved');
    },
  },
  {
    name: 'payday and Row ground rent',
    async run(t) {
      await start(t);
      await mod(t, (s) => { s.players[0].pos = 30; s.lots[29].owner = 0; s.lots[31].owner = 0; });
      await rollTo(t, 1, 2);
      const s = await g(t);
      t.equal(s.players[0].pos, 1, 'wrapped past the Depot');
      t.equal(s.players[0].cash, 1200 + 150 - 20, 'Payday $150 less $10 per Row lease');
      await mod(t, (x) => { x.phase = 'roll'; x.pending = null; x.players[0].pos = 28; x.lots[29].owner = -1; x.lots[31].owner = -1; });
      await rollTo(t, 1, 3);
      const s2 = await g(t);
      t.equal(s2.players[0].pos, 0, 'landed on the Depot');
      t.equal(s2.players[0].cash, 1330 + 150, 'landing on the Depot pays too');
    },
  },
  {
    name: 'rent table',
    async run(t) {
      await start(t);
      await mod(t, (s) => { s.month = 3; s.lots[1].owner = 1; s.lots[25].owner = 1; s.lots[4].owner = 2; s.lots[10].owner = 3; });
      t.equal(await t.game('act', 'rent', 1), 6, 'Cabins alone: base $6');
      t.equal(await t.game('act', 'rent', 25), 45, 'Eastman in racing season: $30 x 1.5');
      t.equal(await t.game('act', 'rent', 4), 25, 'one line: $25');
      t.equal(await t.game('act', 'rent', 10, 8), 50, 'utility: 6 x 8 = 48, rounded to $50');
      await mod(t, (s) => { s.lots[3].owner = 1; s.lots[20].owner = 2; });
      t.equal(await t.game('act', 'rent', 1), 12, 'whole district doubles the base');
      t.equal(await t.game('act', 'rent', 4), 60, 'both lines: $60');
      const exp = [12, 30, 85, 190, 270];
      for (let lv = 1; lv <= 4; lv++) { await mod(t, (s) => { s.lots[1].level = lv; }); t.equal(await t.game('act', 'rent', 1), exp[lv], `level ${lv} rent`); }
      await mod(t, (s) => { s.lots[1].level = 0; s.lots[1].mortgaged = true; });
      t.equal(await t.game('act', 'rent', 1), 0, 'mortgaged lot charges nothing');
      await mod(t, (s) => { s.lots[1].mortgaged = false; s.players[0].pos = 30; });
      await rollTo(t, 1, 2);
      const s = await g(t);
      t.equal(s.players[0].cash, 1200 + 150 - 12, 'paid $12 rent after Payday');
      t.equal(s.players[1].cash, 1212, 'owner collected');
      await t.game('act', 'open', 'deed', 25);
      await t.shot('11-deed');
      await t.checkLayout();
    },
  },
  {
    name: 'build and sell',
    async run(t) {
      await start(t);
      await mod(t, (s) => { s.lots[1].owner = 0; s.lots[3].owner = 0; });
      let r = await act(t, { type: 'build', space: 1 });
      t.expect(r.ok, 'built on Cabins');
      r = await act(t, { type: 'build', space: 1 });
      t.expect(!r.ok, 'only one level per lot per turn');
      await act(t, { type: 'build', space: 3 });
      let s = await g(t);
      t.equal(s.lots[1].level, 1, 'Cabins has a bathhouse'); t.equal(s.players[0].cash, 1100, '$50 each');
      await t.game('act', 'open', 'manage');
      await t.shot('12-manage');
      await t.checkLayout();
      await t.game('act', 'close');
      await act(t, { type: 'sell', space: 3 });
      s = await g(t);
      t.equal(s.lots[3].level, 0, 'sold'); t.equal(s.players[0].cash, 1125, 'half back');
      await mod(t, (x) => { x.built = []; x.lots[1].level = 3; x.lots[3].level = 3; for (const i of [29, 30, 31]) x.lots[i].owner = 0; x.lots[31].level = 4; x.lots[30].level = 2; x.lots[29].level = 1; x.lots[5].owner = 1; x.lots[6].owner = 2; x.lots[26].owner = 3; x.lots[26].mortgaged = true; });
      await act(t, { type: 'build', space: 1 });
      s = await g(t);
      t.equal(s.lots[1].level, 4, 'fourth level is a Grand Resort');
      await t.shot('12-resort');
      r = await act(t, { type: 'build', space: 7 });
      t.expect(!r.ok, 'cannot build without the whole district');
    },
  },
  {
    name: 'mortgage',
    async run(t) {
      await start(t);
      await mod(t, (s) => { s.lots[9].owner = 0; s.lots[29].owner = 0; });
      await act(t, { type: 'mortgage', space: 9 });
      let s = await g(t);
      t.expect(s.lots[9].mortgaged, 'mortgaged'); t.equal(s.players[0].cash, 1270, 'plus half of $140');
      t.equal(await t.game('act', 'rent', 9), 0, 'no rent');
      const r = await act(t, { type: 'mortgage', space: 29 });
      t.expect(!r.ok, 'Row leases cannot be mortgaged');
      await act(t, { type: 'unmortgage', space: 9 });
      s = await g(t);
      t.equal(s.players[0].cash, 1270 - 77, 'lift costs half plus 10%');
    },
  },
  {
    name: 'grand jury hearing',
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await mod(t, (s) => { s.players[0].pos = 8; s.players[0].held = 1; });
      await t.shot('17-hearing');
      await t.checkLayout();
      await act(t, { type: 'bail' });
      let s = await g(t);
      t.equal(s.players[0].held, 0, 'bail releases'); t.equal(s.players[0].cash, 1150, 'paid $50');
      await mod(t, (x) => { x.players[0].held = 1; x.players[0].pardons = 1; });
      await act(t, { type: 'pardon' }); s = await g(t);
      t.equal(s.players[0].held, 0, 'pardon releases'); t.equal(s.players[0].pardons, 0, 'pardon used');
      await mod(t, (x) => { x.players[0].held = 1; });
      await rollTo(t, 1, 2); s = await g(t);
      t.equal(s.players[0].pos, 8, 'no doubles: stays'); t.equal(s.players[0].held, 2, 'second hearing');
      await mod(t, (x) => { x.players[0].held = 3; x.turn = 0; x.phase = 'roll'; });
      await rollTo(t, 1, 2); s = await g(t);
      t.equal(s.players[0].held, 0, 'third failure releases'); t.equal(s.players[0].pos, 11, 'and moves'); t.equal(s.players[0].cash, 1150 - 50, 'pays $50');
      await mod(t, (x) => { x.phase = 'roll'; x.pending = null; x.players[0].pos = 8; x.players[0].held = 1; });
      await rollTo(t, 3, 3); s = await g(t);
      t.equal(s.players[0].held, 0, 'doubles release'); t.equal(s.players[0].pos, 14, 'move by the roll');
      t.expect(!s.again, 'no extra roll after release');
    },
  },
];
