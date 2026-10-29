#!/usr/bin/env node
// Plays N AI-vs-AI games with the real rules engine (src/js) in Node and checks the PRD §13
// targets: game length, stalls, first bankruptcy, seat and persona win rates, trades, auctions.
// Exit 1 if a metric is outside its band.
//   node games/property-game/tools/balance.mjs [games=600] [players=4]
import { playGame, data } from './sim.mjs';

const N = +(process.argv[2] || 600), NP = +(process.argv[3] || 4), CAP = 120;
const K = data.PERSONA_KEYS;
// Every 4-of-6 persona combination, rotated through the seats, so each persona sits in each seat equally.
const combos = [];
(function pick(start, cur) { if (cur.length === NP) { combos.push(cur.slice()); return; } for (let i = start; i < K.length; i++) { cur.push(K[i]); pick(i + 1, cur); cur.pop(); } })(0, []);

const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
const pct = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(b.length * p))] : NaN; };
const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

function run(n, opts = {}) {
  const R = { games: 0, stalls: 0, rounds: [], firstBR: [], trades: [], auctions: [], builds: [], seatWins: Array(NP).fill(0), personaWins: {}, personaGames: {}, cards: [], bad: 0, ms: 0 };
  const t0 = Date.now();
  for (let k = 0; k < n; k++) {
    const combo = combos[k % combos.length], rot = Math.floor(k / combos.length) % NP;
    const ps = combo.map((_, j) => combo[(j + rot) % NP]);
    let s;
    try { s = playGame({ seed: 9000 + k, seats: ps.map((p) => ({ kind: 'ai', persona: p })), ...opts }, 200000, opts.mode === 'short' ? 999 : CAP); }
    catch (e) { R.bad++; console.error(e.message); continue; }
    R.games++;
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
check('Months to a winner (median)', med(A.rounds), 30, 80);
check('Stalled games (cap reached)', A.stalls / A.games, 0, 0.10, P);
check('First bankruptcy (median month)', med(A.firstBR), 12, 40);
A.seatWins.forEach((w, i) => check(`Seat ${i + 1} win rate`, w / decided, 1 / NP - 0.08, 1 / NP + 0.08, P));
for (const p of K) check(`${data.PERSONAS[p].name} win rate`, (A.personaWins[p] || 0) / (A.personaGames[p] * decided / A.games), 0.08, 0.35, P);
check('Trades per game (mean)', mean(A.trades), 0.5, 6, (v) => v.toFixed(2));
check('Auctions per game (mean)', mean(A.auctions), 1, 99, (v) => v.toFixed(2));

const S = run(Math.max(60, N / 5), { mode: 'short' });
check('Short game: stalls', S.stalls, 0, 0);
check('Short game: months played (median)', med(S.rounds), 12, 12);

const C = run(Math.max(60, N / 5), { variant: 'common', years: 3 });
check('Common Ground (3-yr limit): games ending', (C.games - C.stalls) / C.games, 0.95, 1, P);

const w = [Math.max(...rows.map((r) => r[0].length)), 10, 14];
console.log(`${'Metric'.padEnd(w[0])}  ${'Result'.padStart(w[1])}  ${'Target'.padStart(w[2])}`);
for (const r of rows) console.log(`${r[0].padEnd(w[0])}  ${String(r[1]).padStart(w[1])}  ${r[2].padStart(w[2])}  ${r[3]}`);
console.log(`\nLength spread: p10 ${pct(A.rounds, 0.1)} / p50 ${med(A.rounds)} / p90 ${pct(A.rounds, 0.9)} months; builds/game ${mean(A.builds).toFixed(1)}; cards/game ${mean(A.cards).toFixed(1)}`);
console.log(`Common Ground: trades ${mean(C.trades).toFixed(2)}, bankruptcies by month 36 in ${(C.firstBR.length / C.games * 100).toFixed(0)}% of games`);
console.log(`Errors: ${A.bad + S.bad + C.bad} · time ${((A.ms + S.ms + C.ms) / 1000).toFixed(1)} s`);
if (A.bad + S.bad + C.bad) fails++;
process.exit(fails ? 1 : 0);
