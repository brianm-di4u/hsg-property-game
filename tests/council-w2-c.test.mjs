import fs from 'node:fs';
import { start, g, act, rollTo, click, HUMAN_VS_AI } from './helpers.mjs';

// Batch C: the career (S3-02: records, achievements, felts) and the first-run coach (S2-02).
// Node tests run the real engine and career rules headless; the browser tests drive the real screens.
const COUNCIL = new URL('../../_council/hsg-property-game/wave-2/', import.meta.url);
function keep(name, file) {
  try { if (fs.existsSync(COUNCIL)) { fs.mkdirSync(new URL('shots/', COUNCIL), { recursive: true }); fs.copyFileSync(file, new URL(`shots/${name}.png`, COUNCIL)); } } catch (e) { /* shots are a courtesy */ }
}
const mods = () => Promise.all([import('../src/js/data.js'), import('../src/js/engine.js'), import('../src/js/ai.js'), import('../src/js/career.js')]);
const SAVE = 'hs-barons-save-v1', SETS = 'hs-barons-settings-v1', CAREER = 'hs-barons-career-v1';
const AI_SEATS = [{ kind: 'ai', persona: 'hotelier' }, { kind: 'ai', persona: 'speculator' }, { kind: 'ai', persona: 'banker' }, { kind: 'ai', persona: 'showman' }];

// An AI-only game played to its end in Node; seat 0 is then marked as the human (the career only reads the final table).
async function finishedGame(seed, opts = {}) {
  const [, E, A] = await mods();
  const s = E.createGame({ seed, mode: 'short', seats: AI_SEATS, ...opts });
  for (let n = 0; !s.ended && n < 60000; n++) { const r = E.apply(s, A.aiAction(s)); if (!r.ok) throw new Error(r.error); }
  s.players[0].kind = 'human'; s.players[0].persona = null;
  return s;
}
// A save as the version before wave 2 wrote it: no counters for the biggest rent or Grand Resorts, no record flag.
async function preWaveSave(seed = 7) {
  const [, E] = await mods();
  const s = E.createGame({ seed, seats: HUMAN_VS_AI });
  for (const p of s.players) { delete p.stat.maxRentIn; delete p.stat.maxRentOut; delete p.stat.resorts; }
  delete s.rec;
  return s;
}
const words = (x) => x.replace(/[▲▼:,.]/g, ' ').split(/\s+/).filter(Boolean).length;
async function newcomerGame(t) {
  await t.game('act', 'aiPause', true);
  await t.game('scene', 'title');
  await click(t, '[data-go="setup"]');
  await t.waitForStable();
  await click(t, '[data-start]');
  await t.waitForStable();
}
const overlap = (t) => t.page.evaluate(() => {
  const r = (q) => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  const hit = (a, b) => a && b && a.w > 0 && b.w > 0 && a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
  const c = r('#coach'), others = ['#board', '#turnbar', '#actions', '#players', '#clock', '#event'];
  return { coach: c, bad: others.filter((q) => hit(c, r(q))), inView: c ? c.y >= 0 && c.y + c.h <= innerHeight && c.x >= 0 && c.x + c.w <= innerWidth : false };
});

export const tests = [
  // ------------------------------------------------------------------ S3-02: rules (Node)
  {
    name: 'S3-02 a finished game is recorded once and a better one is a personal best',
    node: true,
    async run(t) {
      const [, , , C] = await mods();
      const c = C.blankCareer();
      const s1 = await finishedGame(3);
      const r1 = C.recordGame(c, s1, '2026-11-13');
      t.expect(r1.counted && c.games === 1, 'one game counted');
      t.equal(c.mode.short.games, 1, 'counted under the Short game');
      t.equal(c.level.normal.games, 1, 'counted under the AI level at the table (Normal)');
      t.expect(['speculator', 'banker', 'showman'].every((k) => c.persona[k].games === 1) && c.persona.gambler.games === 0, 'each AI baron at the table has the game on its record');
      t.expect(c.bestShort > 0 && c.longest === 12, 'the Short best net worth and the length were kept');
      t.equal(r1.records.length, 0, 'a first game has nothing to beat, so no "personal best" line');
      // A second game with a bigger table result: pretend the first best was far lower.
      c.bestShort = 1;
      const s2 = await finishedGame(4);
      const r2 = C.recordGame(c, s2, '2026-11-14');
      t.equal(c.games, 2, 'two games');
      t.expect(r2.records.some((x) => /^Short-game net worth: \$/.test(x)), `a better Short result is named a personal best (${r2.records.join(' | ')})`);
      const wins = c.wins;
      // never twice for one game: the controller marks the game, and a table with no human is not a career
      const ai = await finishedGame(5); ai.players[0].kind = 'ai';
      t.equal(C.recordGame(c, ai, '2026-11-14').counted, false, 'an AI-only game is not counted');
      t.equal(c.wins, wins, 'and changes nothing');
    },
  },
  {
    name: 'S3-02 achievements come from play, not from menus, and each is earned once',
    node: true,
    async run(t) {
      const [D, E, , C] = await mods();
      t.expect(C.ACH.length >= 15 && C.ACH.length <= 20, `${C.ACH.length} achievements`);
      t.expect(new Set(C.ACH.map((a) => a.id)).size === C.ACH.length, 'unique ids');
      t.expect(C.ACH.every((a) => a.name.length >= 4 && /\.$/.test(a.text) && !/\s{2}/.test(a.text)), 'each has a name and a sentence');
      const c = C.blankCareer();
      const s = E.createGame({ seed: 9, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'banker' }] });
      t.equal(C.playAchievements(c, s, [], 'd').length, 0, 'a new table earns nothing');
      // buy a lot
      E.forceDice(s, 2, 3); E.apply(s, { type: 'roll' });
      const ev = E.apply(s, { type: 'buy' }).events;
      t.equal(C.playAchievements(c, s, ev, 'd').join(), 'first-lot', 'buying a lot earns First Lease');
      t.equal(C.playAchievements(c, s, ev, 'd').length, 0, 'and only once');
      // a whole district: hand over the rest of Frontier Valley and say it was bought
      const fv = D.LOTS_BY_D.fv; for (const i of fv) { s.lots[i].owner = 0; }
      const got = C.playAchievements(c, s, [{ t: 'buy', pid: 0, space: fv[0], price: 60 }], 'd');
      t.expect(got.includes('whole-district'), 'owning every lot of a district earns Whole Block');
      // a Row lease only counts when a human wins it
      const row = D.LOTS_BY_D.br[0]; s.lots[row].owner = 1;
      t.equal(C.playAchievements(c, s, [{ t: 'won', pid: 1, space: row, amount: 100 }], 'd').includes('row-lease'), false, 'an AI winning a lease earns nothing');
      s.lots[row].owner = 0;
      t.expect(C.playAchievements(c, s, [{ t: 'won', pid: 0, space: row, amount: 100 }], 'd').includes('row-lease'), 'a human winning one earns On the Row');
      s.players[0].stat.maxRentIn = 500;
      t.expect(C.playAchievements(c, s, [], 'd').includes('big-rent'), 'a $500 rent earns Full House');
      s.players[0].stat.resorts = 1;
      t.expect(C.playAchievements(c, s, [], 'd').includes('grand-resort'), 'a Grand Resort earns its achievement');
      t.expect(C.playAchievements(c, s, [{ t: 'bankrupt', pid: 1, to: 0 }], 'd').includes('foreclosure'), 'a rival bankrupt to you earns Foreclosure');
      t.expect(C.playAchievements(c, s, [{ t: 'trade', from: 0, to: 1, give: { lots: [], cash: 10 }, get: { lots: [], cash: 0 } }], 'd').includes('deal-maker'), 'a closed trade earns Handshake');
      t.expect(Object.keys(c.ach).every((k) => /^\d{4}|^d$/.test(c.ach[k])), 'each is stamped with its day');
    },
  },
  {
    name: 'S3-02 wins, streaks, felts and the weeks-long achievements add up',
    node: true,
    async run(t) {
      const [, , , C] = await mods();
      const c = C.blankCareer();
      const win = async (seed, opts) => { const s = await finishedGame(seed, opts); s.winner = 0; s.ranking = [0, 1, 2, 3]; return C.recordGame(c, s, '2026-11-15'); };
      const r = await win(11);
      t.expect(r.earned.includes('win-short'), 'winning a Short game earns Short Season');
      t.expect(r.unlocked.includes('oxblood'), 'the first win opens the oxblood felt');
      t.equal(c.streak, 1, 'a win starts a streak');
      await win(12, { variant: 'common' });
      t.expect(c.ach['win-common'], 'a Common Ground win is its own achievement');
      const lost = await finishedGame(13); lost.winner = 1; lost.ranking = [1, 0, 2, 3];
      C.recordGame(c, lost, '2026-11-16');
      t.equal(c.streak, 0, 'a loss ends the streak');
      t.equal(c.bestStreak, 2, 'the best streak is kept');
      for (let k = 0; k < 4; k++) await win(20 + k);
      t.expect(c.games >= 5 && c.unlocked.midnight, 'five games open the midnight felt');
      t.expect(c.ach.regular === undefined && c.games < 10, 'Regular waits for ten games');
      for (let k = 0; k < 6; k++) await win(30 + k);
      t.expect(c.ach.regular, 'ten games earn Regular');
      t.expect(c.ach['ten-wins'], 'ten wins earn Ten Deeds');
      for (const id of ['first-lot', 'first-rent', 'first-build', 'deal-maker']) c.ach[id] = 'd';
      C.unlockFelts(c, 'd');
      t.expect(Object.keys(c.ach).length >= 8 && c.unlocked.brass, 'eight achievements open the brass felt');
      t.equal(C.feltOpen(c, 'green'), true, 'baize green is always open');
      t.equal(C.feltOpen(C.blankCareer(), 'brass'), false, 'a felt that is not earned is not open');
      t.equal(C.feltOpen(c, 'no-such-felt'), false, 'an unknown felt is not open');
      const hard = await finishedGame(41, { seats: AI_SEATS.map((x) => ({ ...x, level: 'hard' })) }); hard.winner = 0; hard.ranking = [0, 1, 2, 3];
      C.recordGame(c, hard, 'd');
      t.expect(c.ach['win-hard'] && c.level.hard.wins === 1, 'a win with a Hard baron at the table is counted and earns Sharp Company');
    },
  },
  {
    name: 'S3-02 a damaged or foreign career record is repaired and never lowers what is good',
    node: true,
    async run(t) {
      const [, , , C] = await mods();
      const bad = C.cleanCareer({ v: 1, games: 'many', wins: -3, mode: { full: { games: 5, wins: 9e99 }, short: 7 }, persona: null, ach: { 'first-lot': '2026-11-01', 'nope': '2026-11-01', 'win-short': 5 }, unlocked: { oxblood: '2026-11-02', hax: 'x' }, bestShort: 2500.7 });
      t.equal(bad.games, 0, 'a wrong type resets to 0');
      t.equal(bad.wins, 0, 'a negative resets to 0');
      t.equal(bad.mode.full.games, 5, 'a good nested value survives');
      t.equal(bad.mode.full.wins, 0, 'an impossible nested value resets');
      t.equal(bad.mode.short.games, 0, 'a wrong nested shape resets');
      t.equal(bad.bestShort, 2500, 'a fractional best is rounded down');
      t.expect(bad.ach['first-lot'] && !bad.ach.nope && !bad.ach['win-short'], 'only known, well-formed achievements are kept');
      t.expect(bad.unlocked.oxblood && !bad.unlocked.hax, 'only known felts are kept');
      for (const junk of [null, 5, 'x', [], undefined]) t.equal(C.cleanCareer(junk).games, 0, `junk ${JSON.stringify(junk)} gives a blank record`);
      t.equal(C.localDate(new Date(2026, 10, 3)), '2026-11-03', 'dates are local and padded');
    },
  },
  {
    name: 'S3-02 engine counters: biggest rent and Grand Resorts, and an old save without them loads',
    node: true,
    async run(t) {
      const [D, E] = await mods();
      const s = E.createGame({ seed: 5, seats: [{ kind: 'human' }, { kind: 'ai', persona: 'banker' }] });
      t.expect(s.players[0].stat.maxRentIn === 0 && s.players[0].stat.resorts === 0, 'new counters start at 0');
      const old = await preWaveSave();
      t.expect(E.validateSave(JSON.parse(JSON.stringify(old))), 'a save with no counters passes validation');
      const sum = E.summary(old); t.expect(!!sum, 'and can be summarised');
      for (const i of D.LOTS_BY_D.fv) s.lots[i].owner = 0;
      s.phase = 'post'; s.players[0].cash = 5000;
      for (let k = 0; k < 4; k++) { s.built = []; E.apply(s, { type: 'build', space: D.LOTS_BY_D.fv[0] }); }
      t.equal(s.players[0].stat.resorts, 1, 'the fourth building is a Grand Resort and is counted');
    },
  },

  // ------------------------------------------------------------------ S3-02: screens
  {
    name: 'S3-02 the achievement cue is listed, measured inside the cue range and never the same twice',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      t.expect((await t.game('audioList')).cues.includes('ach'), 'ach is a listed cue');
      const rs = [];
      for (const seed of [1, 2, 3, 4, 5, 6]) rs.push(await t.game('audioRender', 'cue:ach', 2, false, { seed }));
      const p = rs.map((r) => r.peak);
      t.log(`ach peaks ${Math.min(...p).toFixed(3)} to ${Math.max(...p).toFixed(3)}, first render RMS ${rs[0].rmsDb} dBFS`);
      t.expect(Math.min(...p) >= 0.2 && Math.max(...p) <= 0.45, `peaks ${p.map((x) => x.toFixed(3))} are within 0.2 to 0.45`);
      t.expect(new Set(p).size >= 3, 'six plays give at least three different peaks');
      const mix = await t.game('audioRender', 'mix', 12, false, {});
      t.expect(mix.peak < 0.95, `the worst-case mix still stays under 0.95 (${mix.peak})`);
    },
  },
  {
    name: 'S3-02 the Career screen is reachable from the title and tells a new player how it starts',
    async run(t) {
      await t.game('scene', 'title');
      t.expect((await t.page.locator('[data-go="career"]').count()) === 1, 'the title has a Career button');
      await click(t, '[data-go="career"]');
      await t.waitForStable();
      t.equal((await t.state()).scene, 'career', 'it opens the career screen');
      const txt = await t.page.locator('#screen').innerText();
      t.expect(/Finish a game and your record begins here/.test(txt), 'an empty record says how it begins');
      t.expect(/0 of 18/.test(txt) || /0 of \d+/.test(txt), 'achievements show the count');
      t.expect(/Short Season/.test(txt) && /Win a Short game/.test(txt), 'locked achievements show what to do');
      t.expect(/Oxblood/.test(txt) && /Win a game to unlock/.test(txt), 'a locked felt says how to earn it in plain words');
      keep(`S3-02-career-empty-${t.viewport}`, (await t.shot('c-career-empty', { fullPage: true })).file);
      await t.checkLayout({ allowScrollY: true });
      await click(t, '[data-back]');
      t.equal((await t.state()).scene, 'title', 'Back returns to the title');
    },
  },
  {
    name: 'S3-02 a game played to the end is recorded, shown on the results screen and saved across a reload',
    async run(t) {
      await start(t, { mode: 'short', seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }, { kind: 'ai', persona: 'banker' }] });
      await t.game('act', 'autoplay', 4000);
      await t.waitForStable();
      t.equal((await t.state()).scene, 'over', 'the game ended');
      const c = (await t.game('career')).career;
      t.equal(c.games, 1, 'one game on the record');
      t.equal(c.mode.short.games, 1, 'under Short');
      const stored = JSON.parse(await t.page.evaluate((k) => localStorage.getItem(k), CAREER));
      t.equal(stored.v, 1, 'saved under hs-barons-career-v1');
      t.equal(stored.games, 1, 'with the game in it');
      const saved = JSON.parse(await t.page.evaluate((k) => localStorage.getItem(k), SAVE));
      t.equal(saved.rec, true, 'the finished game is marked so it is never counted twice');
      const txt = await t.page.locator('#screen').innerText();
      t.expect(/Career: 1 game/.test(txt) || /Added to your career/.test(txt), 'the results screen shows the career');
      keep(`S3-02-results-${t.viewport}`, (await t.shot('c-results', { fullPage: true })).file);
      await t.checkLayout({ allowScrollY: true });
      await click(t, '[data-career]');
      await t.waitForStable();
      t.equal((await t.state()).scene, 'career', 'the results screen links to the career');
      t.expect(/1\s*\n?\s*Games/.test(await t.page.locator('.bignums').innerText()), 'it counts one game');
      await t.reload();
      await click(t, '[data-go="career"]');
      await t.waitForStable();
      t.equal((await t.game('career')).career.games, 1, 'the record survives a reload');
      t.expect((await t.page.locator('.bignums').innerText()).includes('1'), 'and is shown again');
    },
  },
  {
    name: 'S3-02 a full career page, with records, achievements and felts, fits both screens',
    async run(t) {
      const c = { v: 1, games: 14, wins: 6, streak: 2, bestStreak: 3, mode: { full: { games: 8, wins: 3 }, short: { games: 6, wins: 3 } }, variant: { standard: { games: 12, wins: 5 }, common: { games: 2, wins: 1 } },
        level: { none: { games: 1, wins: 0 }, easy: { games: 3, wins: 3 }, normal: { games: 8, wins: 3 }, hard: { games: 2, wins: 0 } }, persona: { speculator: { games: 9, wins: 4 }, hotelier: { games: 7, wins: 3 }, banker: { games: 6, wins: 2 } },
        bestShort: 2650, bestFull: 9420, longest: 61, biggestRent: 1260, bankrupted: 7, resorts: 11, trades: 19,
        ach: { 'first-lot': '2026-11-01', 'first-rent': '2026-11-01', 'win-short': '2026-11-04', 'first-build': '2026-11-02', 'whole-district': '2026-11-03', 'deal-maker': '2026-11-05', 'regular': '2026-11-12' }, unlocked: { oxblood: '2026-11-04', midnight: '2026-11-12' } };
      await t.page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [CAREER, c]);
      await t.reload();
      await click(t, '[data-go="career"]');
      await t.waitForStable();
      const txt = await t.page.locator('#screen').innerText();
      t.expect(/7 of 18/.test(txt), 'seven achievements counted');
      t.expect(/43%/.test(txt), 'the win rate is shown (6 of 14)');
      t.expect(/\$2,650/.test(txt) && /\$9,420/.test(txt) && /61 months/.test(txt) && /\$1,260/.test(txt), 'bests are shown with their numbers');
      t.expect(/Hard/.test(txt) && /Speculator/.test(txt), 'per difficulty and per baron');
      t.expect(/Earned 2026-11-04/.test(txt), 'an earned achievement says when');
      const small = await t.page.evaluate(() => [...document.querySelectorAll('#screen .btn, #screen .feltbtn')].filter((b) => b.getBoundingClientRect().height < 44).length);
      t.equal(small, 0, 'every control is at least 44 px tall');
      keep(`S3-02-career-${t.viewport}`, (await t.shot('c-career-full', { fullPage: true })).file);
      await t.page.evaluate(() => { const s = document.querySelector('#screen'); s.scrollTop = s.scrollHeight; });
      keep(`S3-02-career-bottom-${t.viewport}`, (await t.shot('c-career-bottom')).file);
      await t.checkLayout({ allowScrollY: true });
    },
  },
  {
    name: 'S3-02 achievements toast in play without blocking, with their cue',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      await t.game('audioState', true);
      await rollTo(t, 2, 3);
      await act(t, { type: 'buy' });
      await t.waitForStable();
      const ev = (await t.page.locator('#event').innerText());
      t.expect(/Achievement: First Lease/.test(ev), `the event slip names it (${ev})`);
      t.expect((await t.game('audioState')).heard.includes('ach'), 'the achievement cue played');
      t.equal((await t.state()).dialog, null, 'no dialog interrupted play');
      t.expect(!!(await t.game('career')).career.ach['first-lot'], 'and it is on the record');
      await t.page.waitForTimeout(200);
      t.expect(/First Lease/.test(await t.page.locator('#live').innerText()), 'it is announced to screen readers');
      keep('S3-02-toast-desktop', (await t.shot('c-toast')).file);
      await act(t, { type: 'end' });
      await t.waitForStable();
      const before = JSON.stringify((await t.game('career')).career.ach);
      await t.game('audioState', true);
      await t.game('act', 'aiPause', true);
      t.equal(JSON.stringify((await t.game('career')).career.ach), before, 'nothing is earned twice');
    },
  },
  {
    name: 'S3-02 felts: locked until earned, chosen in Settings, drawn on the tray, saved, and a bad choice falls back',
    async run(t) {
      await t.game('scene', 'settings');
      let txt = await t.page.locator('#screen').innerText();
      t.expect(/Dice tray felt/.test(txt) && /Win a game to unlock/.test(txt) && /Finish 5 games to unlock/.test(txt) && /Earn 8 achievements to unlock/.test(txt), 'every locked felt says how to earn it');
      t.equal(await t.page.locator('[data-felt="oxblood"]').getAttribute('aria-disabled'), 'true', 'a locked felt is marked disabled');
      await t.page.locator('[data-felt="oxblood"]').dispatchEvent('click');
      t.equal((await t.state()).settings.felt, 'green', 'clicking a locked felt does nothing');
      await t.page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [CAREER, { v: 1, games: 1, wins: 1, unlocked: { oxblood: '2026-11-04' } }]);
      await t.reload();
      await t.game('scene', 'settings');
      t.expect(!(await t.page.locator('[data-felt="oxblood"]').getAttribute('aria-disabled')), 'an earned felt can be chosen');
      await t.page.locator('[data-felt="oxblood"]').click();
      await t.waitForStable();
      t.equal((await t.state()).settings.felt, 'oxblood', 'the choice is made');
      t.equal(JSON.parse(await t.page.evaluate((k) => localStorage.getItem(k), SETS)).felt, 'oxblood', 'and saved with the settings');
      keep(`S3-02-settings-felt-${t.viewport}`, (await t.shot('c-settings-felt', { fullPage: true })).file);
      await t.checkLayout({ allowScrollY: true });
      await t.reload();
      t.equal((await t.state()).settings.felt, 'oxblood', 'it survives a reload');
      t.equal((await t.game('career')).felt, '#8A2F3A', 'the tray is drawn in it');
      await start(t);
      await t.page.waitForTimeout(250);
      keep(`S3-02-tray-oxblood-${t.viewport}`, (await t.shot('c-tray-oxblood')).file);
      // a hand-edited save that points at a felt that is not earned
      await t.page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [SETS, { felt: 'brass', sound: true }]);
      await t.page.evaluate((k) => localStorage.removeItem(k), CAREER);
      await t.reload();
      t.equal((await t.state()).settings.felt, 'green', 'an unearned felt falls back to baize green with no error');
      await t.page.evaluate(([k, v]) => localStorage.setItem(k, v), [SETS, '{"felt": 42, "tipsDone": "x"']);
      await t.reload();
      t.equal((await t.state()).settings.felt, 'green', 'a damaged settings record gives the default');
    },
  },
  {
    name: 'S3-02 a record from a newer version is left alone, and a pre-wave save keeps everything',
    viewports: ['desktop'],
    async run(t) {
      const newer = JSON.stringify({ v: 2, games: 99, future: true });
      await t.page.evaluate(([k, v]) => localStorage.setItem(k, v), [CAREER, newer]);
      await t.reload();
      t.equal((await t.game('career')).locked, true, 'a newer record is recognised');
      await start(t, { mode: 'short', seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'banker' }] });
      await t.game('act', 'autoplay', 4000);
      t.equal(await t.page.evaluate((k) => localStorage.getItem(k), CAREER), newer, 'nothing was written over it');
      await click(t, '[data-career]');
      await t.waitForStable();
      t.expect(/newer version/.test(await t.page.locator('#screen').innerText()), 'the career screen says so');
    },
  },
  {
    name: 'S3-02 a save from before wave 2 loads with nothing lost, and finishing it starts the career',
    viewports: ['desktop'],
    async run(t) {
      const old = await preWaveSave(11);
      old.players[0].cash = 777; old.lots[1].owner = 0;
      await t.page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(v)); localStorage.setItem('hs-barons-settings-v1', JSON.stringify({ sound: true, vol: 0.5, motion: 'reduce', text: 1.25, theme: 'light', ai: 'fast' })); }, [SAVE, old]);
      await t.reload();
      await t.game('act', 'aiPause', true);
      const st = (await t.state()).settings;
      t.equal(st.vol, 0.5, 'the old volume is kept');
      t.equal(st.text, 1.25, 'the old text size is kept');
      t.equal(st.motion, 'reduce', 'the old motion choice is kept');
      t.equal(st.tipsSeen, true, 'an older player is not a newcomer');
      t.equal(st.felt, 'green', 'the felt defaults to the original');
      t.expect(!(await t.page.locator('[data-go="continue"]').isDisabled()), 'Continue is enabled');
      await click(t, '[data-go="continue"]');
      await t.waitForStable();
      const s = await g(t);
      t.equal(s.players[0].cash, 777, 'cash is as it was');
      t.equal(s.lots[1].owner, 0, 'lots are as they were');
      t.equal((await t.game('tips')).on, false, 'no first-run tips for an older player');
      t.equal(await t.page.locator('#coach').isVisible(), false, 'and no strip');
      await rollTo(t, 1, 1); await t.waitForStable();
      t.expect(true, 'the old save plays on');
      await t.game('act', 'autoplay', 20000);
      await t.waitForStable();
      t.equal((await t.game('career')).career.games, 1, 'finishing it begins the career');
    },
  },

  // ------------------------------------------------------------------ S2-02: the coach
  {
    name: 'S2-02 a newcomer is taught in play: the goal, then Roll, Buy or Auction, End turn',
    async run(t) {
      await newcomerGame(t);
      let tips = await t.game('tips');
      t.equal(tips.on, true, 'tips are on in a newcomer\'s first game');
      t.expect(/^Goal:/.test(tips.text), `the goal comes first (${tips.text})`);
      t.expect(words(tips.text) <= 12, `${words(tips.text)} words`);
      let o = await overlap(t);
      t.expect(o.inView, 'the strip is on screen');
      t.equal(o.bad.join(), '', `the strip covers nothing (${o.bad.join()})`);
      const hit = await t.page.evaluate(() => [...document.querySelectorAll('#coach button')].map((b) => Math.round(b.getBoundingClientRect().height)));
      t.expect(hit.length === 2 && hit.every((h) => h >= 44), `both strip controls are at least 44 px tall (${hit})`);
      t.expect((await t.page.locator('[data-skip-tips]').innerText()) === 'Skip tips', 'Skip tips is visible');
      keep(`S2-02-tip-goal-${t.viewport}`, (await t.shot('c-tip-goal')).file);
      await rollTo(t, 2, 3);
      await t.waitForStable();
      tips = await t.game('tips');
      t.expect(/Buy/.test(tips.text) && /Auction/i.test(tips.text), `after the roll it teaches Buy or Auction (${tips.text})`);
      t.expect(words(tips.text) <= 12, `${words(tips.text)} words`);
      t.expect((await t.page.locator('#actions .coachhi').count()) === 1, 'the Buy button is marked');
      o = await overlap(t);
      t.equal(o.bad.join(), '', 'still covers nothing');
      keep(`S2-02-tip-buy-${t.viewport}`, (await t.shot('c-tip-buy')).file);
      await act(t, { type: 'buy' });
      await t.waitForStable();
      tips = await t.game('tips');
      t.expect(/End turn|E to end/.test(tips.text), `then End turn (${tips.text})`);
      t.expect(words(tips.text) <= 12, `${words(tips.text)} words`);
      keep(`S2-02-tip-end-${t.viewport}`, (await t.shot('c-tip-end')).file);
      await t.checkLayout();
      await t.page.waitForTimeout(200);
      t.expect(/End turn|to end your turn/.test(await t.page.locator('#live').innerText()), 'tips are announced through the live region');
    },
  },
  {
    name: 'S2-02 the words match the input: a finger taps, a mouse clicks, a keyboard presses',
    async run(t) {
      await newcomerGame(t);
      t.expect(/^Goal/.test((await t.game('tips')).text), 'the goal was first');
      const box = await t.page.locator('.coach-text').boundingBox();
      const at = [box.x + box.width / 2, box.y + box.height / 2];
      if (t.viewport === 'mobile') await t.tap(at); else await t.page.mouse.click(at[0], at[1]);
      await t.waitForStable();
      const txt = (await t.game('tips')).text;
      if (t.viewport === 'mobile') t.expect(/^Tap Roll/.test(txt), `a finger is told to Tap (${txt})`);
      else t.expect(/^Click Roll/.test(txt), `a mouse is told to Click (${txt})`);
      await t.page.keyboard.press('Shift');
      await t.waitForStable();
      const k = (await t.game('tips')).text;
      t.expect(/^Press R/.test(k), `a keyboard is told to Press R (${k})`);
      t.expect(words(k) <= 12 && words(txt) <= 12, 'both are twelve words or fewer');
    },
  },
  {
    name: 'S2-02 every tip ends by doing it, by a tap, or by waiting; Skip tips ends them all and is remembered',
    viewports: ['desktop'],
    async run(t) {
      await newcomerGame(t);
      t.expect(/^Goal/.test((await t.game('tips')).text), 'the goal shows');
      await t.page.waitForTimeout(7200);
      let tips = await t.game('tips');
      t.expect(/Roll/.test(tips.text), `after a few seconds it moves on by itself (${tips.text})`);
      t.expect(tips.done.includes('goal'), 'the goal is marked done');
      await t.page.locator('.coach-text').click();
      tips = await t.game('tips');
      t.expect(tips.done.includes('roll') && /^Goal/.test(tips.text), 'a tap dismisses the tip');
      await click(t, '[data-skip-tips]');
      await t.waitForStable();
      tips = await t.game('tips');
      t.expect(!tips.shown && tips.seen === true, 'Skip tips hides the strip and sets seen');
      t.equal(JSON.parse(await t.page.evaluate((k) => localStorage.getItem(k), SETS)).tipsSeen, true, 'saved with the settings');
      await t.reload();
      await newcomerGame(t);
      t.equal((await t.game('tips')).on, false, 'the next game has no tips');
      t.equal(await t.page.locator('#coach').isVisible(), false, 'and no strip');
    },
  },
  {
    name: 'S2-02 Show tips again replays them, and the build tip fires when a district becomes whole',
    viewports: ['desktop'],
    async run(t) {
      await newcomerGame(t);
      await click(t, '[data-skip-tips]');
      await t.game('scene', 'settings');
      await click(t, '[data-tips-again]');
      t.expect(/back at the table/.test(await t.page.locator('#tipsnote').innerText()), 'the Settings button says when they return');
      const st = (await t.state()).settings;
      t.expect(st.tipsSeen === false && st.tipsDone.length === 0, 'seen and done are cleared');
      await click(t, '[data-back]');
      await t.waitForStable();
      let tips = await t.game('tips');
      t.expect(tips.on && tips.shown, 'the tips are back in the running game');
      await t.page.evaluate(() => { window.__G.settings.tipsDone = ['goal', 'roll', 'buy', 'end', 'rent', 'season']; });
      const s = await g(t);
      for (const i of [1, 3]) s.lots[i].owner = 0;
      await t.game('setState', { game: s }); await t.waitForStable();
      tips = await t.game('tips');
      t.equal(tips.tip, 'build', 'the build tip shows once the human owns a whole district');
      t.expect(/You own a whole district: click Manage to build\./.test(tips.text), `it says what to do (${tips.text})`);
      t.expect(words(tips.text) <= 12, 'twelve words or fewer');
      t.expect((await t.page.locator('#actions .coachhi').count()) === 1, 'and marks the Manage button');
      await click(t, '#actions [data-key="M"]');
      await t.waitForStable();
      tips = await t.game('tips');
      t.expect(tips.done.includes('build'), 'opening Manage finishes the tip');
    },
  },
  {
    name: 'S2-02 the goal is always findable: Rules, the setup card and the menu',
    async run(t) {
      await t.game('scene', 'help');
      t.expect(/Goal: bankrupt the other barons, or hold the most net worth when time runs out\./.test(await t.page.locator('[role="tabpanel"]').innerText()), 'the Rules start with the goal');
      const first = await t.page.evaluate(() => document.querySelector('[role="tabpanel"] .goal') ? document.querySelector('[role="tabpanel"] h3 + .goal') !== null : false);
      t.expect(first, 'it is the first thing under the Rules heading');
      await t.game('scene', 'title');
      await click(t, '[data-go="setup"]');
      await t.waitForStable();
      t.expect(/Goal: bankrupt/.test(await t.page.locator('#screen').innerText()), 'the setup screen states it');
      keep(`S2-02-setup-goal-${t.viewport}`, (await t.shot('c-setup-goal', { fullPage: true })).file);
      await start(t);
      await t.game('act', 'open', 'pause');
      t.expect(/Goal: bankrupt/.test(await t.page.locator('#modal').innerText()), 'the menu card states it');
      keep(`S2-02-pause-goal-${t.viewport}`, (await t.shot('c-pause-goal')).file);
    },
  },
  {
    name: 'S2-02 tips hold still with reduced motion (a static marker, no pulsing)',
    viewports: ['desktop'],
    reducedMotion: true,
    async run(t) {
      await newcomerGame(t);
      await t.page.locator('.coach-text').dispatchEvent('click');
      await t.waitForStable();
      const anim = await t.page.evaluate(() => { const b = document.querySelector('#actions .coachhi'); return b ? getComputedStyle(b).animationName : 'none-found'; });
      t.equal(anim, 'none', `the marked button does not pulse (${anim})`);
      t.expect((await t.page.locator('#actions .coachhi').count()) === 1, 'but it is still marked, with an outline');
    },
  },
  {
    name: 'S2-02 the first rent and the first season change are explained, once',
    viewports: ['desktop'],
    async run(t) {
      await newcomerGame(t);
      await t.page.evaluate(() => { window.__G.settings.tipsDone = ['goal', 'roll', 'buy', 'end', 'build']; });
      const s = await g(t);
      s.lots[3].owner = 1; // an AI owns Belding's Inn
      await t.game('setState', { game: s }); await t.waitForStable();
      await rollTo(t, 1, 2);
      await t.waitForStable();
      let tips = await t.game('tips');
      t.equal(tips.tip, 'rent', 'paying rent shows the rent tip');
      t.expect(/owner rent/.test(tips.text) && words(tips.text) <= 12, `${tips.text}`);
      await t.page.locator('.coach-text').click();
      await act(t, { type: 'end' });
      // The rivals' turns are not seeded. About three runs in ten one of them leaves a lot unbought and it goes to auction,
      // where the player is asked to bid before the month has turned: pass, and carry on to the player's own next turn.
      for (let k = 0; k < 80; k++) {
        const st = await t.state();
        if (st.game.ended) break;
        if (st.game.phase === 'auction') { if (st.actor === 0) await act(t, { type: 'pass' }); else await t.game('act', 'ai'); await t.waitForStable(); continue; }
        if (st.actor === 0) break;
        await t.game('act', 'ai'); await t.waitForStable();
      }
      if ((await t.state()).dialog === 'card') { await click(t, '#modal [data-ok]'); await t.waitForStable(); } // the new month's Headline
      tips = await t.game('tips');
      t.equal(tips.tip, 'season', 'the new month shows the season tip');
      t.expect(/Seasons change rents/.test(tips.text), `${tips.text}`);
      await t.page.locator('.coach-text').click();
      t.expect((await t.game('tips')).seen === true, 'with every tip given, the tips are finished for good');
      t.expect(!(await t.page.locator('#coach').isVisible()), 'and the strip is gone');
    },
  },
];