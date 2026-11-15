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

// ---------- S3-08, S3-09, S2-06: how long a game is ----------
const CAREER = 'hs-barons-career-v1';
const lens = (t) => t.page.evaluate(() => ({
  pressed: [...document.querySelectorAll('[data-seg="mode"]')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.v),
  labels: [...document.querySelectorAll('[data-seg="mode"]')].map((b) => b.textContent.trim()),
  years: document.querySelector('[data-years]').value, yearsOff: document.querySelector('[data-years]').disabled,
  hint: document.querySelector('#lenhint').textContent,
}));
tests.push({
  name: 'S3-09 a newcomer\'s New game starts on Standard (24 months), the three lengths say how long they take, and Short is the quick first game',
  async run(t) {
    await t.game('scene', 'setup');
    await t.waitForStable();
    let r = await lens(t);
    t.equal(r.labels.join('|'), 'Short: 12 months|Standard: 24 months|Full game', 'three lengths');
    t.equal(r.pressed.join(), 'standard', 'a newcomer starts on Standard, not on an open-ended game');
    t.equal(r.years, '2', 'which is a two-year limit');
    t.expect(/Short takes about 20 minutes, Standard about 40, and a Full game with no year limit 60 to 90\./.test(r.hint), `the hint gives the times (${r.hint})`);
    t.expect(/New here\? Short is the quickest first game\./.test(r.hint), 'and points a newcomer at Short');
    await t.page.locator('#lenhint').scrollIntoViewIfNeeded();
    await t.shot('S3-09-setup-newcomer');
    await t.checkLayout({ allowScrollY: true });
    await t.page.click('[data-seg="mode"][data-v="short"]');
    r = await lens(t);
    t.expect(r.pressed.join() === 'short' && r.yearsOff, 'Short is pressed and the year limit is off');
    await t.page.click('[data-seg="mode"][data-v="full"]');
    r = await lens(t);
    t.expect(r.pressed.join() === 'full' && r.years === '0' && !r.yearsOff, 'Full game is no limit');
    await t.page.selectOption('[data-years]', '3');
    r = await lens(t);
    t.expect(r.pressed.join() === 'full' && r.years === '3', 'a three-year limit is still the Full game');
    await t.page.click('[data-seg="mode"][data-v="standard"]');
    t.equal((await lens(t)).years, '2', 'Standard sets two years');
    await t.page.click('[data-start]');
    await t.waitForStable();
    const s = await g(t);
    t.equal(s.opts.years, 2, 'and the game that starts has a 24-month limit');
    t.equal(s.opts.mode, 'full', 'in the Full rules');
  },
});
tests.push({
  name: 'S3-08 a player with a history still starts on the Full game with no limit, and a game saved before this has no hint about it',
  async run(t) {
    await t.page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [CAREER, { v: 1, games: 4, wins: 1 }]);
    await t.reload();
    await t.game('scene', 'setup');
    await t.waitForStable();
    const r = await lens(t);
    t.equal(r.pressed.join(), 'full', 'a player who has finished games starts on the Full game, as before');
    t.equal(r.years, '0', 'with no year limit');
    t.expect(!/New here/.test(r.hint) && /60 to 90/.test(r.hint), 'the times are there, the newcomer line is not');
    await t.shot('S3-09-setup-veteran');
  },
});
tests.push({
  name: 'S3-08 the clock says Month n of N for a year-limited game and fills as the months pass',
  async run(t) {
    await start(t, { seats: AI2, seed: 4, years: 2 });
    const chip = () => t.page.evaluate(() => { const c = document.querySelector('#clock .chip.len'); return c ? { text: c.textContent, p: c.style.getPropertyValue('--p') } : null; });
    let c = await chip();
    t.equal(c && c.text, 'Month 1 of 24', 'a 24-month game starts at Month 1 of 24');
    t.equal(c && c.p, '0%', 'with nothing filled');
    await mod(t, (s) => { s.monthsPlayed = 11; s.month = 11; });
    c = await chip();
    t.equal(c && c.text, 'Month 12 of 24', 'twelve months in it reads Month 12 of 24');
    t.equal(c && c.p, '46%', 'and the chip is about half filled');
    await t.shot('S3-09-month-chip');
    await t.checkLayout();
    await mod(t, (s) => { s.opts.years = 0; });
    t.equal(await chip(), null, 'a game with no limit shows no count');
    await mod(t, (s) => { s.opts.years = 0; s.opts.mode = 'short'; s.monthsPlayed = 3; });
    c = await chip();
    t.equal(c && c.text, 'Month 4 of 12', 'a Short game still reads Month 4 of 12');
  },
});
tests.push({
  name: 'S3-08 balance.mjs judges each table size against its own bands, and the Banker is tuned',
  node: true,
  async run(t) {
    const fs = await import('node:fs');
    const src = fs.readFileSync(new URL('../tools/balance.mjs', import.meta.url), 'utf8');
    t.expect(/FIRST_BR_HI = \{ 2: 60, 3: 50 \}\[NP\] \|\| 40/.test(src) && /PERSONA_BAND = \[\(1 \/ NP\) \* 0\.32, \(1 \/ NP\) \* 1\.4\]/.test(src), 'the first-bankruptcy and persona bands depend on the number of barons');
    const D = await import('../src/js/data.js');
    t.equal(D.PERSONAS.banker.reserve, 1.2, 'the Banker keeps a reserve of 1.2 (it was 1.5)');
    const four = [0.25 * 0.32, 0.25 * 1.4].map((x) => +x.toFixed(2));
    t.equal(four.join(), '0.08,0.35', 'and at four barons the persona band is the old 8 to 35 percent');
  },
});

// ---------- S3-14: the risk of the next roll ----------
tests.push({
  name: 'S3-14 rollRisk counts the chance of landing on rent, and the most it could be',
  node: true,
  async run(t) {
    const s = E.createGame({ seed: 3, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai' }, { kind: 'ai' }] });
    for (const i of OWNABLE) s.lots[i].owner = -1;
    s.players[0].pos = 0;
    t.equal(JSON.stringify(E.rollRisk(s, 0)), JSON.stringify({ chance: 0, max: 0 }), 'with no lot owned there is no risk');
    s.lots[5].owner = 1; s.lots[7].owner = 2;                // totals 5 (4 ways in 36) and 7 (6 ways)
    const r = E.rollRisk(s, 0);
    t.expect(Math.abs(r.chance - 10 / 36) < 1e-9, `two rival lots at five and seven away: ${r.chance}`);
    t.equal(r.max, Math.max(E.rentOf(s, 5, 5), E.rentOf(s, 7, 7)), 'the most is the larger of the two rents');
    s.lots[7].mortgaged = true; s.lots[5].owner = 0;
    t.equal(E.rollRisk(s, 0).chance, 0, 'a mortgaged lot, and a lot of your own, charge nothing');
    s.lots[5].owner = 1; s.players[1].out = true;
    t.equal(E.rollRisk(s, 0).chance, 0, 'a baron who is out collects nothing');
    s.players[1].out = false; s.lots[10].owner = 1;           // the utility, total 10: rent follows the dice
    t.equal(E.rollRisk(s, 0).max, Math.max(E.rentOf(s, 5, 5), E.rentOf(s, 10, 10)), 'the utility is judged on the roll that lands there');
    s.lots[10].owner = -1; s.lots[5].owner = -1;
    s.players[0].pos = 30; s.lots[3].owner = 2;               // wraps past the Depot: 30 + 5 = space 3
    t.expect(Math.abs(E.rollRisk(s, 0).chance - 4 / 36) < 1e-9, 'it wraps round the board');
  },
});
tests.push({
  name: 'S3-14 the turn bar tells a human what the next roll could cost',
  async run(t) {
    await start(t, { seats: AI2, seed: 6 });
    await mod(t, (s) => { for (const i of OWNABLE) { s.lots[i].owner = -1; s.lots[i].level = 0; s.lots[i].mortgaged = false; } s.players[0].pos = 0; s.phase = 'roll'; s.turn = 0; s.pending = null; s.again = false; });
    const risk = async () => ((await t.page.locator('#turnbar #risk').count()) ? t.page.locator('#turnbar #risk').innerText() : null);
    t.equal(await risk(), 'No rent to pay on your next roll', 'nothing owned nearby: no rent');
    await mod(t, (s) => { s.lots[6].owner = 1; });
    const risk1 = E.rollRisk(await g(t), 0);
    t.expect(risk1.max > 0, 'a rival lot six away');
    t.equal(await risk(), `Rent risk next roll: up to $${risk1.max} (${Math.round(risk1.chance * 100)}% of rolls)`, 'the bar gives the most and the chance');
    await t.shot('S3-14-rent-risk');
    await t.checkLayout();
    const box = await t.page.locator('#turnbar').boundingBox();
    t.expect(box.height < 120, `the bar stays compact (${Math.round(box.height)} px)`);
    await mod(t, (s) => { s.phase = 'post'; s.players[0].pos = 0; });
    t.expect(/Rent risk next roll/.test((await risk()) || ''), 'it shows after the move too, when you decide whether to build');
    await mod(t, (s) => { s.turn = 1; s.phase = 'roll'; });
    t.equal(await risk(), null, 'and not while a rival is to move');
  },
});
