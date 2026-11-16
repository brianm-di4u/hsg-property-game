#!/usr/bin/env node
// Plays N AI-vs-AI games with the real rules engine (src/js) in Node and checks the PRD §13
// targets: game length, stalls, first bankruptcy, seat and persona win rates, trades, auctions.
// Exit 1 if a metric is outside its band.
//   node tools/balance.mjs [games=600] [players=4] [--quick]
// --quick is the check that runs in npm test (tests/council-w4-b.test.mjs): a smaller sample of every batch, so it finishes in
// under a minute, with bands widened to match (see "Bands for a small sample"). Without it the numbers and bands are as before.
import { playGame, engine as E, data } from './sim.mjs';
import { trial } from './exploit.mjs';

const QUICK = process.argv.includes('--quick');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const N = +(args[0] || 600), NP = +(args[1] || 4), CAP = 120;
// Bands for a small sample (S3-10). Every game is seeded (9000+k, 5000+k), so a rerun gives the same numbers. What a band must
// survive is a change of seeds, or a small change to the AI, moving a rate that is really at its target: a rate measured on n
// games is off its true value by more than Z standard errors (sqrt(p(1-p)/n)) with chance under 7e-6 at Z = 4.5, so with about
// 20 rows the chance that any one of them leaves its band by luck is under 1 in 7000. A band is never narrower than the one the
// full run uses, so at 600 games (where Z standard errors are no wider than that band) nothing changes. The price: 40 games
// cannot tell a seat that wins 40% from one that wins 25%. They catch a gross break; `node tools/balance.mjs 600` is the sharp check.
const Z = 4.5;
const SE = (p, n) => Math.sqrt(p * (1 - p) / Math.max(1, n));
const wide = (lo, hi, p, n) => [Math.max(0, Math.min(lo, p - Z * SE(p, n))), Math.min(1, Math.max(hi, p + Z * SE(p, n)))];
const K = data.PERSONA_KEYS;
// Bands by number of barons (S3-08). They were written for 4 and are the same at 4: a persona's win rate is judged against its fair
// share 1/NP (0.32 to 1.4 times it), and with fewer barons rent comes in more slowly, so the first bankruptcy comes later.
const FIRST_BR_HI = { 2: 60, 3: 50 }[NP] || 40;
const PERSONA_BAND = [(1 / NP) * 0.32, (1 / NP) * 1.4];
// Every 4-of-6 persona combination, rotated through the seats, so each persona sits in each seat equally.
const combos = [];
(function pick(start, cur) { if (cur.length === NP) { combos.push(cur.slice()); return; } for (let i = start; i < K.length; i++) { cur.push(K[i]); pick(i + 1, cur); cur.pop(); } })(0, []);

const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
const pct = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(b.length * p))] : NaN; };
const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

function run(n, opts = {}) {
  const R = { bestLots: 0, shortGames: 0, games: 0, stalls: 0, rounds: [], firstBR: [], trades: [], auctions: [], builds: [], seatWins: Array(NP).fill(0), personaWins: {}, personaGames: {}, cards: [], bad: 0, ms: 0 };
  const t0 = Date.now();
  for (let k = 0; k < n; k++) {
    const combo = combos[k % combos.length], rot = Math.floor(k / combos.length) % NP;
    const ps = combo.map((_, j) => combo[(j + rot) % NP]);
    let s;
    try { s = playGame({ seed: 9000 + k, seats: ps.map((p) => ({ kind: 'ai', persona: p })), ...opts }, 200000, opts.mode === 'short' ? 999 : CAP); }
    catch (e) { R.bad++; console.error(e.message); continue; }
    R.games++;
    if (opts.mode === 'short' && !s.stalled) { // did the winner have the dearest starting lots? (S3-05: the deal is paired, so it should be near chance)
      const g0 = E.createGame({ seed: 9000 + k, seats: ps.map((p) => ({ kind: 'ai', persona: p })), ...opts });
      const val = g0.players.map((q) => E.owned(g0, q.id).reduce((a, i) => a + data.SPACES[i].price, 0));
      R.shortGames++; if (s.winner === val.indexOf(Math.max(...val))) R.bestLots++;
    }
    for (const p of ps) R.personaGames[p] = (R.personaGames[p] || 0) + 1;
    R.trades.push(s.stats.trades); R.auctions.push(s.stats.auctions); R.builds.push(s.stats.builds); R.cards.push(s.stats.cards);
    if (s.stats.firstBankruptRound) R.firstBR.push(s.stats.firstBankruptRound);
    if (s.stalled) { R.stalls++; continue; }
    R.rounds.push(opts.mode === 'short' ? s.monthsPlayed : s.monthsPlayed + 1);
    R.seatWins[s.winner]++;
    const wp = s.players[s.winner].persona; R.personaWins[wp] = (R.personaWins[wp] || 0) + 1;
  }
  R.ms = Date.now() - t0;
  return R;
}

const rows = [];
let fails = 0;
const check = (name, value, lo, hi, fmt = (v) => v) => { const ok = value >= lo && value <= hi; if (!ok) fails++; rows.push([name, fmt(value), `${fmt(lo)}–${fmt(hi)}`, ok ? 'ok' : 'OUT']); };
const P = (v) => `${(v * 100).toFixed(1)}%`;

console.log(`Bathhouse Barons balance: ${N} games, ${NP} AI barons, ${CAP}-month cap\n`);
const A = run(N);
const decided = A.games - A.stalls;
const small = QUICK || N < 600; // a small sample gets the wide bands; at 600 games they come to the same as the old ones
check('Months to a winner (median)', med(A.rounds), 30, 80);
check('Stalled games (cap reached)', A.stalls / A.games, 0, small ? 0.10 + Z * SE(0.10, A.games) : 0.10, P);
check('First bankruptcy (median month)', med(A.firstBR), 12, FIRST_BR_HI + (small ? 10 : 0)); // a median of 40 games moves a few months
A.seatWins.forEach((w, i) => check(`Seat ${i + 1} win rate`, w / decided, ...(small ? wide(1 / NP - 0.08, 1 / NP + 0.08, 1 / NP, decided) : [1 / NP - 0.08, 1 / NP + 0.08]), P));
for (const p of K) { const n = A.personaGames[p] * decided / A.games; check(`${data.PERSONAS[p].name} win rate`, (A.personaWins[p] || 0) / n, ...(small ? wide(PERSONA_BAND[0], PERSONA_BAND[1], 1 / NP, n) : PERSONA_BAND), P); }
check('Trades per game (mean)', mean(A.trades), 0.5, 6, (v) => v.toFixed(2));
check('Auctions per game (mean)', mean(A.auctions), 1, 99, (v) => v.toFixed(2));

const S = run(QUICK ? 100 : Math.max(60, N / 5), { mode: 'short' });
check('Short game: stalls', S.stalls, 0, 0);
check('Short game: months played (median)', med(S.rounds), 12, 12);
// S3-05: the Short deal is paired (dearest with cheapest), so the winner should hold the dearest starting lots only about as often
// as chance, 25% with four barons (wave 3 measured 27 to 29%; the old deal gave 42%). Target under 32% on the full run.
check('Short game: winner had the dearest starting lots', S.bestLots / S.shortGames, 0, small ? Math.max(0.32, 1 / NP + Z * SE(1 / NP, S.shortGames)) : 0.32, P);

const C = run(QUICK ? 12 : Math.max(60, N / 5), { variant: 'common', years: 3 });
check('Common Ground (3-yr limit): games ending', (C.games - C.stalls) / C.games, small ? 0.95 - Z * SE(0.95, C.games) : 0.95, 1, P);

// S3-04: a scripted baron that offers the least cash the AI will take, up to three offers a turn (tools/exploit.mjs), against three
// AI barons. Wave 2 target: under 30% of the games (a fair seat wins 25%). Played as Short games here, which are quick; the
// 200-game Full run in tools/exploit.mjs is the sharp one.
const X = trial('exploit', 'short', QUICK ? 36 : Math.max(60, N / 5));
check('Trade exploit baron: win rate (Short)', X.win, 0, small ? Math.max(0.30, 0.30 + Z * SE(0.30, X.games)) : 0.30, P);

const w = [Math.max(...rows.map((r) => r[0].length)), 10, 14];
console.log(`${'Metric'.padEnd(w[0])}  ${'Result'.padStart(w[1])}  ${'Target'.padStart(w[2])}`);
for (const r of rows) console.log(`${r[0].padEnd(w[0])}  ${String(r[1]).padStart(w[1])}  ${r[2].padStart(w[2])}  ${r[3]}`);
console.log(`\nLength spread: p10 ${pct(A.rounds, 0.1)} / p50 ${med(A.rounds)} / p90 ${pct(A.rounds, 0.9)} months; builds/game ${mean(A.builds).toFixed(1)}; cards/game ${mean(A.cards).toFixed(1)}`);
console.log(`Common Ground: trades ${mean(C.trades).toFixed(2)}, bankruptcies by month 36 in ${(C.firstBR.length / C.games * 100).toFixed(0)}% of games`);
console.log(`Errors: ${A.bad + S.bad + C.bad} · time ${((A.ms + S.ms + C.ms) / 1000).toFixed(1)} s (CPU ${(process.cpuUsage().user / 1e6).toFixed(1)} s)${QUICK ? ' (quick: ' + A.games + ' full, ' + S.games + ' short, ' + C.games + ' Common Ground, ' + X.games + ' exploit games)' : ''}`);
if (A.bad + S.bad + C.bad) fails++;
process.exit(fails ? 1 : 0);
