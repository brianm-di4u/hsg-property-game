import { start, g, act, mod, AI2, TWO_HUMANS } from './helpers.mjs';
import * as E from '../src/js/engine.js';
import * as AI from '../src/js/ai.js';
import { OWNABLE, SPACES } from '../src/js/data.js';

// Wave 3, batch C: a rival's card can be dismissed, the AI reads the tourism calendar, game length (a Standard preset,
// duration hints, Month n of N), the risk of the next roll, the Gazette dateline, phone baron cards, season chips.

export const tests = [];

// ---------- S1-06: a rival's card ----------
// A one-human, one-rival table with the rival to move, who will land on Town Talk and draw a card.
async function rivalDrawsCard(t) {
  await start(t, { seats: AI2, seed: 11 }, { fast: false, pauseAI: true });
  for (let k = 0; k < 6; k++) {
    const s = await t.state();
    if (s.actor !== 0) break;
    const L = s.legal.map((x) => x.type);
    const pick = L.includes('end') && s.game.phase === 'post' ? 'end' : L.includes('roll') ? 'roll' : L.includes('buy') ? 'buy' : L.includes('decline') ? 'decline' : L.includes('pass') ? 'pass' : L[0];
    await t.game('act', 'do', { type: pick });
    await t.waitForStable();
  }
  await mod(t, (s) => { s.turn = 1; s.phase = 'roll'; s.pending = null; s.again = false; s.players[1].pos = 0; s.players[1].held = 0; });
  await t.game('act', 'card', 'talk', 't-street');
  await t.game('act', 'dice', 1, 1);
}
// How long the rival's card dialog plus what follows it takes, from the moment the card is on screen to the moment play is free again.
async function cardTime(t, how) {
  await rivalDrawsCard(t);
  await t.game('act', 'do', { type: 'roll' });
  await t.page.waitForFunction(() => { const s = window.__game.getState(); return s.dialog === 'card' && !s.waitingOk; }, null, { timeout: 15000 });
  const t0 = await t.page.evaluate(() => performance.now());
  if (how === 'tap') await t.page.locator('#modal .dlg').click({ position: { x: 12, y: 12 } });
  else if (how === 'key') await t.page.keyboard.press('Space');
  else if (how === 'ok') await t.page.locator('#modal [data-ok]').click();
  await t.page.waitForFunction(() => window.__G.dialog !== 'card', null, { timeout: 5000 });
  await t.page.waitForFunction(() => !window.__G.busy, null, { timeout: 15000 });
  const t1 = await t.page.evaluate(() => performance.now());
  return t1 - t0;
}
tests.push({
  name: 'S1-06 a rival\'s card ends its hold when you tap it, press Space or press OK',
  async run(t) {
    const waited = await cardTime(t, 'wait');
    t.expect(waited > 1000, `left alone the card is held (${Math.round(waited)} ms)`);
    for (const how of ['tap', 'key', 'ok']) {
      const quick = await cardTime(t, how);
      // The hold is 1500 ms; what follows the card is the same either way, so the saving is nearly all of it.
      t.expect(waited - quick > 600, `${how} dismisses the hold (${Math.round(quick)} ms against ${Math.round(waited)} ms)`);
    }
    t.equal((await t.state()).dialog, null, 'and nothing is left open');
  },
});

// ---------- S3-07: the AI reads the calendar ----------
function twoAI(month) {
  const s = E.createGame({ seed: 5, seats: [{ kind: 'ai', persona: 'hotelier' }, { kind: 'ai', persona: 'banker' }] });
  for (const i of OWNABLE) s.lots[i].owner = -1;
  s.month = month; s.mods = [];
  return s;
}
const GH = OWNABLE.find((i) => SPACES[i].d === 'gh'), RA = OWNABLE.find((i) => SPACES[i].d === 'ra'), BP = OWNABLE.find((i) => SPACES[i].d === 'bp');
tests.push({
  name: 'S3-07 a lot is worth more to the AI when the season is about to lift its rent, and less when it is about to cut it',
  node: true,
  async run(t) {
    const dec = twoAI(11), jun = twoAI(5);
    t.expect(AI.calendarFactor(dec, GH) > AI.calendarFactor(jun, GH), 'a Grand Hotel is worth more going into the racing season (December) than in June');
    t.expect(AI.calendarFactor(dec, GH) > 1.2 && AI.calendarFactor(dec, GH) < 1.3, `by about a quarter (${AI.calendarFactor(dec, GH).toFixed(3)})`);
    const jan = twoAI(0);
    t.expect(AI.calendarFactor(jan, RA) < 1 && AI.calendarFactor(twoAI(6), RA) > 1, 'a Roadside lot is worth less going into the quiet winter than into the summer');
    t.equal(AI.calendarFactor(jan, 4), 1, 'a line has no season, so its value is as it was');
    t.expect(AI.lotValue(dec, 0, GH) > AI.lotValue(jun, 0, GH) * 1.1, 'and lotValue follows it, which moves what the AI will pay and ask in a bid or a trade');
    // A Headline: ballpark rents doubled this month lifts the value of a ballpark, and it fades as the months pass.
    const plain = twoAI(7), news = twoAI(7);
    news.mods.push({ d: 'bp', mult: 2, until: news.year * 12 + news.month, id: 'n-training' });
    t.expect(AI.calendarFactor(news, BP) > AI.calendarFactor(plain, BP), 'a doubled-rent Headline lifts the lot it names');
    t.equal(AI.calendarFactor(news, GH), AI.calendarFactor(plain, GH), 'and no other');
    const bid = (s) => { s.players[0].cash = 3000; return AI.lotValue(s, 0, BP); };
    t.expect(bid(news) > bid(plain), 'so the AI will bid more for it');
  },
});
tests.push({
  name: 'S3-07 the AI does not build on a lot whose rent is switched off this month',
  node: true,
  async run(t) {
    const s = twoAI(3);
    const gh = OWNABLE.filter((i) => SPACES[i].d === 'gh');
    for (const i of gh) s.lots[i].owner = 0;
    s.players[0].cash = 5000; s.turn = 0; s.phase = 'post'; s.pending = null;
    t.equal(AI.aiAction(JSON.parse(JSON.stringify(s))).type, 'build', 'with a whole district and plenty of cash the Hotelier builds');
    s.mods.push({ d: 'gh', mult: 0, until: s.year * 12 + s.month, id: 'n-army' });
    const a = AI.aiAction(s);
    t.expect(a.type !== 'build', `while the Army has the hotels it does not (${a.type})`);
  },
});
