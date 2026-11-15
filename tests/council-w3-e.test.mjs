import { start, g, mod, HUMAN_VS_AI } from './helpers.mjs';

// Wave 3, batch E: the sound at full volume, who is heard when the game ends, spend and earn cues, rival voices,
// haptics, the dice, reduced-motion landings, the title on a short phone, board labels, the idle town and the ending.

export const tests = [];

// ---------- CL-01: nothing clips with every volume control at its maximum ----------
const MAX = { sfx: 1, music: 1, amb: 1 };
tests.push({
  name: 'CL-01 the busiest moment, with all three sliders at maximum, stays under 0.95',
  viewports: ['desktop'],
  async run(t) {
    await start(t);
    const shipped = await t.game('audioRender', 'mix', 14, false, { seed: 31 });
    const full = await t.game('audioRender', 'mix', 14, false, { seed: 31, sliders: MAX });
    t.log(`mix: shipped peak ${shipped.peak}, all sliders at maximum ${full.peak}`);
    t.expect(full.rms > shipped.rms, 'the sliders argument is read: maximum is louder than the shipped level');
    t.expect(shipped.peak < 0.95, `the shipped mix peaks at ${shipped.peak}`);
    for (const seed of [31, 32, 33]) {
      const r = await t.game('audioRender', 'mix', 14, false, { seed, sliders: MAX });
      t.expect(r.peak < 0.95, `play piece + town + the loudest cues at maximum volume peak at ${r.peak} (seed ${seed})`);
    }
  },
});
tests.push({
  name: 'CL-01 every cue, repeated at maximum effects volume, stays under 0.95',
  viewports: ['desktop'],
  async run(t) {
    await start(t);
    const names = (await t.game('audioList')).cues;
    let worst = 0, who = '';
    for (const name of names) for (let seed = 1; seed <= 6; seed++) {
      const r = await t.game('audioRender', `cue:${name}`, 2, false, { seed, sliders: { sfx: 1 }, i: seed, persona: seed % 2 ? 'speculator' : undefined });
      if (r.peak > worst) { worst = r.peak; who = name; }
    }
    t.log(`loudest cue at maximum: ${who} ${worst}`);
    t.expect(worst < 0.95, `${who} peaks at ${worst} with the effects slider at maximum`);
  },
});

// ---------- S3-19 and S4-02: the ending ----------
import * as E from '../src/js/engine.js';
import { endingStory } from '../src/js/ui.js';
import { OWNABLE } from '../src/js/data.js';

function ended(seats, winner, mod) {
  const s = E.createGame({ seed: 5, seats });
  for (const i of OWNABLE.slice(0, 4)) s.lots[i].owner = winner;
  s.players[winner].cash = 1200;
  if (mod) mod(s);
  s.ended = true; s.phase = 'over'; s.winner = winner;
  s.ranking = s.players.map((p) => p.id).sort((a, b) => (a === winner ? -1 : b === winner ? 1 : a - b));
  return s;
}
const SEATS = [{ kind: 'human', name: 'Ada Lovelace' }, { kind: 'ai', persona: 'hotelier' }, { kind: 'ai', persona: 'banker' }];
tests.push({
  name: 'S4-02 the ending tells the human winner, the human who lost and the human who went bankrupt apart',
  node: true,
  async run(t) {
    const win = endingStory(ended(SEATS, 0));
    t.equal(win.humanWon, true, 'a human winner');
    t.equal(win.mono, 'AL', 'the monogram is the initials');
    t.expect(/Ada Lovelace closes the books on Bathhouse Row with \$\d[\d,]* and 4 lots/.test(win.epilogue), `the epilogue names the result: ${win.epilogue}`);
    const lose = endingStory(ended(SEATS, 1));
    t.equal(lose.humanWon, false, 'a human who lost');
    t.equal(lose.kicker, 'The Row has a new baron', 'the loss has its own kicker');
    t.expect(/Ada Lovelace finished second with \$/.test(lose.epilogue) && /Odessa Marlow took the Row/.test(lose.epilogue), `the epilogue says where you finished and who won: ${lose.epilogue}`);
    const out = endingStory(ended(SEATS, 2, (s) => { s.players[0].out = 1; s.players[0].outRound = 6; }));
    t.expect(/left the Row in month 6, bankrupt\. Thaddeus Crane holds it now/.test(out.epilogue), `a bankrupt human: ${out.epilogue}`);
    const none = endingStory(ended([{ kind: 'ai', persona: 'banker' }, { kind: 'ai', persona: 'hotelier' }], 0));
    t.equal(none.epilogue, '', 'no human at the table, no epilogue');
    t.equal(endingStory(ended([{ kind: 'human', name: 'Cher' }, { kind: 'ai', persona: 'banker' }], 0)).mono, 'C', 'one name, one letter');
  },
});
async function finishWith(t, winnerIsHuman) {
  await start(t, { seed: 5, seats: [{ kind: 'human', name: 'Ada Lovelace' }, { kind: 'ai', persona: 'hotelier' }] });
  await mod(t, (s) => { s.phase = 'post'; s.pending = null; s.turn = winnerIsHuman ? 1 : 0; });
  await t.game('audioState', true);
  await t.game('act', 'do', { type: 'resign' });
  await t.page.waitForFunction(() => window.__game.getState().scene === 'over', null, { timeout: 8000 });
  return (await t.game('audioState')).heard;
}
tests.push({
  name: 'S3-19 a win sounds the fanfare and a loss the falling motif',
  async run(t) {
    const won = await finishWith(t, true), lost = await finishWith(t, false);
    // the rival's resignation sounds one bust of its own; the ending adds the sting
    t.expect(won[won.length - 1] === 'fanfare' && won.filter((n) => n === 'bust').length === 1, `the human's win: ${won.join(',')}`);
    t.expect(!lost.includes('fanfare') && lost.filter((n) => n === 'bust').length === 2, `the human's loss: ${lost.join(',')}`);
  },
});
tests.push({
  name: 'S4-02 the results page shows the human winner a monogram and the loser an epilogue',
  async run(t) {
    await finishWith(t, true);
    await t.waitForStable();
    const w = await t.page.evaluate(() => { const m = document.querySelector('.over .monogram'), b = m && m.getBoundingClientRect(), e = document.querySelector('.over .epilogue'); return { mono: m ? m.textContent : null, w: b ? b.width : 0, inside: !!b && b.left >= 0 && b.right <= innerWidth, epi: e ? e.textContent : '', kicker: document.querySelector('.over .kicker').textContent }; });
    t.equal(w.mono, 'AL', 'the monogram is on the podium');
    t.expect(w.w >= 60 && w.inside, `and fits on screen (${w.w}px)`);
    t.expect(/closes the books/.test(w.epi), 'with the epilogue');
    await t.shot('S4-02-win');
    await finishWith(t, false);
    await t.waitForStable();
    const l = await t.page.evaluate(() => ({ mono: !!document.querySelector('.over .monogram'), face: !!document.querySelector('.over img.winface'), epi: document.querySelector('.over .epilogue').textContent, kicker: document.querySelector('.over .kicker').textContent, scrolls: document.documentElement.scrollWidth > innerWidth }));
    t.equal(l.mono, false, 'a rival who wins keeps its portrait, not a monogram');
    t.expect(/finished second|left the Row/.test(l.epi), `the loss epilogue: ${l.epi}`);
    t.equal(l.kicker, 'The Row has a new baron', 'and the loss has its own kicker');
    t.equal(l.scrolls, false, 'no sideways scroll');
    await t.shot('S4-02-loss');
  },
});

// ---------- S5-06: spending, earning and being held sound different ----------
import { rollTo, act, TWO_HUMANS } from './helpers.mjs';
const heardAfter = async (t, fn) => { await t.game('audioState', true); await fn(); await t.waitForStable(); return (await t.game('audioState')).heard; };
tests.push({
  name: 'S5-06 buying a lot has its own cue; rent collected keeps the coin; rent paid keeps the pay cue',
  viewports: ['desktop'],
  async run(t) {
    await start(t, { seats: HUMAN_VS_AI });
    await rollTo(t, 2, 3);
    let h = await heardAfter(t, () => act(t, { type: 'buy' }));
    t.expect(h.includes('buy') && !h.includes('coin'), `buying a lot: ${h.join(',')}`);
    // a rival's rent to the human: money in, the coin
    await mod(t, (s) => { s.lots[13].owner = 0; s.lots[13].level = 0; s.players[1].pos = 10; s.turn = 1; s.phase = 'roll'; s.pending = null; s.built = []; });
    h = await heardAfter(t, async () => { await t.game('act', 'dice', 1, 2); await t.game('act', 'do', { type: 'roll' }); });
    t.expect(h.includes('coin') && !h.includes('pay'), `rent collected by the human: ${h.join(',')}`);
    // the human's rent to a rival: money out
    await mod(t, (s) => { s.lots[13].owner = 1; s.lots[13].level = 0; s.players[0].pos = 10; s.turn = 0; s.phase = 'roll'; s.pending = null; s.again = false; });
    h = await heardAfter(t, () => rollTo(t, 1, 2));
    t.expect(h.includes('pay') && !h.includes('coin'), `rent paid by the human: ${h.join(',')}`);
  },
});
tests.push({
  name: 'S5-06 three doubles send you to the Grand Jury with the jail cue, not the gavel',
  viewports: ['desktop'],
  async run(t) {
    await start(t, { seats: TWO_HUMANS });
    await rollTo(t, 3, 3); await act(t, { type: 'buy' }); await act(t, { type: 'end' });
    await rollTo(t, 2, 2); await act(t, { type: 'buy' }); await act(t, { type: 'end' });
    const h = await heardAfter(t, () => rollTo(t, 4, 4));
    t.equal((await g(t)).players[0].held, 1, 'held at the Grand Jury');
    t.expect(h.includes('jail') && !h.includes('gavel'), `the Jury cue: ${h.join(',')}`);
  },
});

// ---------- S5-19: each rival has a voice ----------
tests.push({
  name: 'S5-19 each rival buys with its own motif and a human with the plain one; the new cues sit in the mix',
  viewports: ['desktop'],
  async run(t) {
    await start(t);
    const rms = {}, med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
    for (const persona of [undefined, 'speculator', 'hotelier', 'banker', 'showman', 'preservationist', 'gambler']) {
      const rs = [];
      for (const seed of [1, 2, 3, 4, 5]) rs.push(await t.game('audioRender', 'cue:buy', 2, false, { seed, persona }));
      rms[persona || 'you'] = med(rs.map((r) => r.rms));
      const peak = med(rs.map((r) => r.peak));
      t.expect(peak >= 0.2 && peak <= 0.45, `${persona || 'you'}: the typical buy cue peaks at ${peak}`);
    }
    t.log(JSON.stringify(rms));
    t.expect(new Set(Object.values(rms).map((x) => x.toFixed(4))).size >= 6, `the seven voices render differently: ${JSON.stringify(rms)}`);
    const jp = []; for (const seed of [1, 2, 3, 4, 5]) jp.push((await t.game('audioRender', 'cue:jail', 2, false, { seed })).peak);
    t.expect(med(jp) >= 0.2 && med(jp) <= 0.45, `jail: the typical peak is ${med(jp)}`);
  },
});
tests.push({
  name: 'S5-19 a rival cues carry its persona and a human cues do not',
  viewports: ['desktop'],
  async run(t) {
    await start(t, { seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'gambler' }] });
    await rollTo(t, 2, 3); await act(t, { type: 'buy' });
    t.equal((await t.game('audioState')).last.persona, null, 'the human buys in the plain voice');
    await mod(t, (s) => { s.turn = 1; s.phase = 'roll'; s.pending = null; s.players[1].pos = 3; });
    await t.game('act', 'dice', 3, 4); await t.game('act', 'do', { type: 'roll' });
    await t.waitForStable();
    const a = await t.game('audioState');
    t.equal(a.last.persona, 'gambler', `the rival's last cue (${a.last.name}) is in its voice`);
  },
});

// ---------- S5-09: haptics ----------
const buzzLog = (t) => t.page.evaluate(() => { window.__buzz = []; Object.defineProperty(navigator, 'vibrate', { value: (p) => { window.__buzz.push(p); return true; }, configurable: true }); });
const buzzes = (t) => t.page.evaluate(() => JSON.stringify(window.__buzz));
const clearBuzz = (t) => t.page.evaluate(() => { window.__buzz = []; });
async function setSetting(t, key, v) {
  await t.game('scene', 'settings'); await t.waitForStable();
  await t.page.click(`[data-set="${key}"][data-v="${v}"]`);
  await t.game('scene', 'game'); await t.waitForStable();
}
const rentSetup = (s) => { s.lots[13].owner = 1; s.lots[13].level = 0; s.players[0].pos = 10; s.turn = 0; s.phase = 'roll'; s.pending = null; s.again = false; };
tests.push({
  name: 'S5-09 a short buzz for your landing, the rent you pay and the end of a game',
  async run(t) {
    await start(t, { seats: TWO_HUMANS });
    await buzzLog(t);
    await setSetting(t, 'haptics', true);
    t.equal(await buzzes(t), '[12]', 'turning Vibration on gives one short pulse to feel it');
    await mod(t, rentSetup); await clearBuzz(t);
    await rollTo(t, 1, 2);
    t.equal(await buzzes(t), '[12,[20,40,20]]', 'landing (12 ms) then rent paid (20-40-20)');
    await mod(t, (s) => { s.phase = 'post'; s.pending = null; s.turn = 1; }); await clearBuzz(t);
    await t.game('act', 'do', { type: 'resign' });
    await t.page.waitForFunction(() => window.__game.getState().scene === 'over', null, { timeout: 8000 });
    t.equal(await buzzes(t), '[[40,60,40,60,80]]', 'the game ending (40-60-40-60-80)');
  },
});
tests.push({
  name: 'S5-09 no buzz when Vibration is off or motion is reduced',
  async run(t) {
    await start(t, { seats: TWO_HUMANS });
    await buzzLog(t);
    const play = async () => { await mod(t, rentSetup); await clearBuzz(t); await rollTo(t, 1, 2); return buzzes(t); };
    await setSetting(t, 'haptics', false);
    t.equal(await play(), '[]', 'Vibration off: nothing');
    await setSetting(t, 'haptics', true); await setSetting(t, 'motion', 'reduce');
    t.equal(await play(), '[]', 'Vibration on but motion reduced: nothing');
    await setSetting(t, 'motion', 'full');
    t.equal(await play(), '[12,[20,40,20]]', 'and back on when motion is full');
  },
});

// ---------- S5-10: a player who asked for reduced motion still hears the move ----------
tests.push({
  name: 'S5-10 with reduced motion a move is heard: the dice and one landing, no steps for a token that does not walk',
  async run(t) {
    await start(t, { seats: TWO_HUMANS }, { fast: false });
    await setSetting(t, 'motion', 'reduce');
    const h = await heardAfter(t, () => rollTo(t, 2, 3));
    t.expect(h.includes('dice') && h.filter((n) => n === 'land').length === 1, `dice, then one landing: ${h.join(',')}`);
    t.expect(!h.includes('step'), 'and no footsteps for a token that jumps');
  },
});
