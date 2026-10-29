import { start, g, act, mod, rollTo, TWO_HUMANS } from './helpers.mjs';

export const tests = [
  {
    name: 'months advance and seasons change rents',
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await rollTo(t, 2, 3); await act(t, { type: 'decline' }); await act(t, { type: 'pass' }); await act(t, { type: 'pass' }); await act(t, { type: 'end' });
      await rollTo(t, 3, 5); await act(t, { type: 'end' });
      let s = await g(t);
      t.equal(s.month, 1, 'February after one round');
      t.equal(s.round, 2, 'round 2');
      t.expect(!!s.headline, 'a Headline was drawn');
      await t.game('act', 'close');
      await mod(t, (x) => { x.month = 0; x.mods = []; x.lots[25].owner = 1; x.lots[5].owner = 1; });
      t.equal(await t.game('act', 'rent', 25), 45, 'January racing season: Eastman x1.5');
      t.equal(await t.game('act', 'rent', 5), 5, 'January quiet winter: Ostrich x0.5');
      await t.shot('14-season-racing');
      await t.checkLayout();
      await mod(t, (x) => { x.month = 6; });
      t.equal(await t.game('act', 'rent', 25), 30, 'July: no racing');
      t.equal(await t.game('act', 'rent', 5), 15, 'July summer visitors: Ostrich x1.5');
      await t.shot('14-season-summer');
      const st = await t.state();
      t.expect(st.game.month === 6, 'state is July');
      const chip = await t.page.locator('#clock').innerText();
      t.expect(/Summer visitors/.test(chip), 'season chip shown');
    },
  },
  {
    name: 'headline drawn and applied',
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await t.game('act', 'card', 'news', 'n-opening');
      await rollTo(t, 3, 5); await act(t, { type: 'end' });
      await rollTo(t, 3, 5); await act(t, { type: 'end' });
      let s = await g(t);
      t.equal(s.headline.id, 'n-opening', 'Racetrack Opening Day');
      t.equal(s.players[0].cash, 1250, 'every baron collects $50');
      await t.game('act', 'open', 'card', 'n-fire1913');
      await t.shot('15-headline');
      await t.checkLayout();
      const txt = await t.page.locator('#modal').innerText();
      t.expect(/Source:/.test(txt), 'card shows its source');
      t.expect(/Game effect/i.test(txt), 'card labels the effect as game logic');
      await t.game('act', 'close');
      await mod(t, (x) => { x.lots[25].owner = 0; x.lots[26].owner = 0; x.lots[27].owner = 0; x.lots[25].level = 2; x.lots[26].level = 4; });
      await t.game('act', 'card', 'news', 'n-fire1905');
      await mod(t, (x) => { x.players[0].pos = 0; x.players[1].pos = 0; x.turn = 0; x.phase = 'roll'; x.again = false; });
      await rollTo(t, 3, 5); await act(t, { type: 'end' }); await rollTo(t, 3, 5); await act(t, { type: 'end' });
      s = await g(t);
      t.equal(s.lots[25].level, 1, 'fire takes a bathhouse'); t.equal(s.lots[26].level, 4, 'Grand Resorts are brick and stand');
    },
  },
  {
    name: 'town talk card',
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await t.game('act', 'card', 'talk', 't-water');
      await rollTo(t, 1, 1);
      let s = await g(t);
      t.equal(s.players[0].pos, 2, 'on Town Talk');
      t.equal(s.players[0].cash, 1275, 'collected $75');
      await t.game('act', 'fast', false);
      await t.game('act', 'open', 'card', 't-water');
      await t.shot('16-town-talk');
      await t.checkLayout();
      await t.game('act', 'close');
      await t.game('act', 'fast', true);
      await act(t, { type: 'end' });
      await t.game('act', 'card', 'talk', 't-narrow');
      await mod(t, (x) => { x.players[0].pos = 15; x.phase = 'roll'; x.turn = 0; });
      await rollTo(t, 1, 2);
      s = await g(t);
      t.equal(s.players[0].pos, 4, 'advanced to the Diamond Jo Railroad');
      t.equal(s.players[0].cash, 1275 + 150, 'passing the Depot paid');
      t.equal(s.phase, 'buy', 'may buy the line');
      await mod(t, (x) => { x.phase = 'roll'; x.pending = null; x.players[0].pos = 15; });
      await t.game('act', 'card', 'talk', 't-pardon');
      await rollTo(t, 1, 2);
      s = await g(t);
      t.equal(s.players[0].pardons, 1, 'Pardon kept');
      t.expect(!s.decks.talk.includes('t-pardon'), 'Pardon leaves the deck while held');
    },
  },
];
