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
