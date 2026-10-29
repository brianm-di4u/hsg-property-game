import { start, g, act, mod, TWO_HUMANS, click } from './helpers.mjs';

const SETUP = (s) => { s.lots[1].owner = 0; s.lots[3].owner = 1; s.lots[9].owner = 1; s.lots[12].owner = 0; s.lots[22].owner = 2; };

export const tests = [
  {
    name: 'propose to an AI: fair offer accepted, lowball declined',
    async run(t) {
      await start(t);
      await mod(t, SETUP);
      await t.game('act', 'open', 'trade', 1);
      await t.game('act', 'tradeSet', { to: 1, give: [12], get: [3], giveCash: 150 });
      await t.shot('19-trade');
      await t.checkLayout();
      await click(t, '#modal [data-propose]');
      await t.waitForStable();
      let s = await g(t);
      t.equal(s.phase, 'trade', 'offer pending');
      await t.game('act', 'ai');
      s = await g(t);
      t.equal(s.lots[3].owner, 0, 'AI accepted: Ada now owns Belding\'s Inn');
      t.equal(s.lots[12].owner, 1, 'and the AI owns Majestic Park');
      t.equal(s.players[0].cash, 1050, 'Ada paid $150');
      t.equal(s.stats.trades, 1, 'trade counted');
      await act(t, { type: 'propose', to: 2, give: { lots: [], cash: 5 }, get: { lots: [22], cash: 0 } });
      await t.game('act', 'ai');
      s = await g(t);
      t.equal(s.lots[22].owner, 2, 'lowball declined');
      t.equal(s.phase, 'roll', 'back to Ada\'s turn');
    },
  },
  {
    name: 'hot-seat offer between two humans',
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await mod(t, (s) => { s.lots[1].owner = 0; s.lots[3].owner = 1; });
      await act(t, { type: 'propose', to: 1, give: { lots: [], cash: 120 }, get: { lots: [3], cash: 0 } });
      const st = await t.state();
      t.equal(st.dialog, 'incoming', 'Ben sees the offer');
      const txt = await t.page.locator('#modal').innerText();
      t.expect(/Pass the device to Ben/.test(txt), 'hand-the-device prompt');
      await t.shot('19-trade-incoming');
      await t.checkLayout();
      await click(t, '#modal [data-resp="1"]');
      await t.waitForStable();
      const s = await g(t);
      t.equal(s.lots[3].owner, 0, 'accepted by click');
      t.equal(s.players[1].cash, 1320, 'Ben received $120');
    },
  },
  {
    name: 'lots in built districts cannot be traded',
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await mod(t, (s) => { s.lots[1].owner = 0; s.lots[3].owner = 0; s.lots[1].level = 1; });
      const r = await act(t, { type: 'propose', to: 1, give: { lots: [3], cash: 0 }, get: { lots: [], cash: 100 } });
      t.expect(!r.ok, 'refused');
    },
  },
];
