import { start, g, act, mod, rollTo, TWO_HUMANS, click } from './helpers.mjs';

export const tests = [
  {
    name: 'raise cash by mortgaging',
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await mod(t, (s) => { s.players[0].cash = 20; s.lots[9].owner = 0; s.lots[5].owner = 1; s.lots[6].owner = 1; s.lots[7].owner = 1; s.lots[5].level = 1; s.month = 3; });
      await rollTo(t, 2, 3);
      let s = await g(t);
      t.equal(s.phase, 'debt', 'must raise cash');
      const st = await t.state();
      t.equal(st.dialog, 'debt', 'debt dialog open');
      await t.shot('18-debt');
      await t.checkLayout();
      t.expect(!(await t.game('act', 'legal')).some((a) => a.type === 'build'), 'no building while in debt');
      await click(t, '#modal [data-act="mortgage"][data-i="9"]');
      await t.waitForStable();
      s = await g(t);
      t.expect(s.lots[9].mortgaged, 'Whittington Park mortgaged');
      t.equal(s.players[0].cash, 20 + 70 - 50, 'debt of $50 paid');
      t.equal(s.phase, 'post', 'turn resumes');
      t.expect((await t.state()).dialog !== 'debt', 'debt dialog closed');
    },
  },
  {
    name: 'bankruptcy to a baron ends a two-player game',
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await mod(t, (s) => { s.players[0].cash = 10; s.lots[3].owner = 0; s.lots[5].owner = 1; s.lots[6].owner = 1; s.lots[7].owner = 1; s.lots[5].level = 4; s.month = 3; });
      await rollTo(t, 2, 3);
      let s = await g(t);
      t.equal(s.phase, 'debt', 'in debt');
      await act(t, { type: 'mortgage', space: 3 });
      s = await g(t);
      t.equal(s.phase, 'debt', 'still short');
      await t.game('act', 'fast', false);
      const b = '#modal [data-act="bankrupt"]';
      await click(t, b); // first click asks to confirm
      await t.shot('18-bankrupt', { wait: false });
      await click(t, b);
      await t.game('act', 'fast', true);
      await t.page.waitForFunction(() => window.__game.getState().scene === 'over', null, { timeout: 5000 });
      s = await g(t);
      t.expect(s.players[0].out, 'Ada is bankrupt');
      t.equal(s.lots[3].owner, 1, 'her lot passes to Ben');
      t.expect(s.lots[3].mortgaged, 'with its mortgage');
      t.equal(s.winner, 1, 'Ben wins');
      t.equal((await t.state()).scene, 'over', 'game-over screen');
      await t.shot('21-game-over');
      await t.checkLayout();
    },
  },
  {
    name: 'bankruptcy to the town returns lots',
    async run(t) {
      await start(t);
      await mod(t, (s) => { s.players[0].cash = 10; s.players[0].pos = 24; s.lots[1].owner = 0; s.lots[3].owner = 0; s.lots[1].level = 1; s.lots[3].level = 1; });
      await rollTo(t, 1, 3);
      let s = await g(t);
      t.equal(s.phase, 'debt', 'owes the Thermal Water Tax');
      await act(t, { type: 'bankrupt' });
      s = await g(t);
      t.expect(s.players[0].out, 'out of the game');
      t.equal(s.lots[1].owner, -1, 'lot back with the town'); t.equal(s.lots[1].level, 0, 'buildings removed');
      t.expect(!s.ended, 'three barons play on');
      t.equal(s.turn, 1, 'next baron to play');
    },
  },
];
