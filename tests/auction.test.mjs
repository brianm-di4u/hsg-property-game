import { start, g, act, mod, rollTo, runAI, TWO_HUMANS } from './helpers.mjs';

export const tests = [
  {
    name: 'open auction',
    async run(t) {
      await start(t);
      await rollTo(t, 2, 3);
      await act(t, { type: 'decline' });
      let s = await g(t);
      t.equal(s.phase, 'auction', 'auction started');
      t.equal(s.pending.space, 5, 'for the Ostrich Farm');
      const st = await runAI(t);
      t.equal(st.dialog, 'auction', 'auction dialog is open');
      s = st.game;
      if (s.phase === 'auction') {
        t.equal(s.players[st.actor].name, 'Ada', 'Ada bids after the AI barons');
        await t.shot('09-auction');
        await t.checkLayout();
        const before = s.pending.bid;
        await act(t, { type: 'bid', amount: before + 10 });
        s = await g(t);
        t.equal(s.pending ? s.pending.bid : before + 10, before + 10, 'bid raised by $10');
        // Drop out at the next chance and let the AI finish.
        for (let k = 0; k < 40; k++) {
          const x = await runAI(t);
          if (x.game.phase !== 'auction') break;
          await act(t, { type: 'pass' });
        }
      }
      s = await g(t);
      t.equal(s.phase, 'post', 'auction closed');
      const owner = s.lots[5].owner;
      t.expect(owner >= 0, 'someone won the lot');
      const st2 = await t.state();
      t.expect(st2.dialog !== 'auction', 'auction dialog closed');
    },
  },
  {
    name: 'auction with no bids leaves the lot unowned',
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await rollTo(t, 2, 3);
      await act(t, { type: 'decline' });
      await act(t, { type: 'pass' }); // Ben
      await act(t, { type: 'pass' }); // Ada
      const s = await g(t);
      t.equal(s.lots[5].owner, -1, 'unsold'); t.equal(s.phase, 'post', 'turn continues');
    },
  },
  {
    name: 'highest bid wins and pays',
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await rollTo(t, 2, 3);
      await act(t, { type: 'decline' });
      await act(t, { type: 'bid', amount: 40 }); // Ben
      await act(t, { type: 'bid', amount: 90 }); // Ada
      await act(t, { type: 'pass' }); // Ben drops
      const s = await g(t);
      t.equal(s.lots[5].owner, 0, 'Ada wins'); t.equal(s.players[0].cash, 1110, 'pays $90'); t.equal(s.players[1].cash, 1200, 'Ben pays nothing');
    },
  },
  {
    name: 'Row lease auction',
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await mod(t, (s) => { s.players[0].pos = 24; s.players[0].held = 0; });
      await rollTo(t, 2, 3);
      let s = await g(t);
      t.equal(s.phase, 'auction', 'Row lot goes straight to auction');
      t.equal(s.pending.min, 175, 'opening bid is half of $350');
      const legal = await t.game('act', 'legal');
      t.expect(!legal.some((a) => a.type === 'buy'), 'no buy at list price');
      await t.shot('10-row-auction');
      await t.checkLayout();
      const r = await act(t, { type: 'bid', amount: 100 });
      t.expect(!r.ok, 'bids below the opening are refused');
      await act(t, { type: 'bid', amount: 175 });
      await act(t, { type: 'pass' });
      s = await g(t);
      t.equal(s.lots[29].owner, 1, 'Ben leases the Hale');
    },
  },
];
