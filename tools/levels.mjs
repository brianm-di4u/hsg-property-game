#!/usr/bin/env node
// Head-to-head check of the AI levels (S3-01). For every seed the same four personas sit in the same four
// seats twice: once with level A in seats 0 and 2 and level B in seats 1 and 3, then with the levels swapped.
// Persona and seat luck cancels out, so a team win share above 50% is the level's strength.
//   node tools/levels.mjs [seeds=300] [mode=full|short] [hard:normal]      (games per pairing = 2 x seeds)
import { data, engine as E, ai as A } from './sim.mjs';

const K = data.PERSONA_KEYS;
const combos = []; (function pick(st, cur) { if (cur.length === 4) { combos.push(cur.slice()); return; } for (let i = st; i < K.length; i++) { cur.push(K[i]); pick(i + 1, cur); cur.pop(); } })(0, []);

export function game(seed, lv, mode = 'full', opts = {}) {
  const c = combos[seed % combos.length], rot = Math.floor(seed / combos.length) % 4;
  const ps = c.map((_, j) => c[(j + rot) % 4]);
  const s = E.createGame({ seed: 7000 + seed, mode, seats: ps.map((p, i) => ({ kind: 'ai', persona: p, level: lv[i] })), ...opts });
  let n = 0;
  while (!s.ended && n++ < 200000 && s.round <= (mode === 'short' ? 999 : 120)) {
    const r = E.apply(s, A.aiAction(s));
    if (!r.ok) throw new Error(r.error);
  }
  s.stalled = !s.ended;
  return s;
}

// Team A wins when the winner sits in a seat that played level A in that game.
export function pairing(a, b, seeds, mode = 'full') {
  let wa = 0, wb = 0, stalls = 0, nwA = 0, nwB = 0, nw = 0;
  for (let k = 0; k < seeds; k++) for (const flip of [0, 1]) {
    const lv = [0, 1, 2, 3].map((i) => ((i + flip) % 2 === 0 ? a : b));
    const s = game(k, lv, mode);
    if (s.stalled) { stalls++; continue; }
    if (lv[s.winner] === a && a !== b) wa++; else if (lv[s.winner] === b && a !== b) wb++;
    else if (a === b) { if ((s.winner + flip) % 2 === 0) wa++; else wb++; }
    for (const p of s.players) { const w = p.out ? 0 : E.netWorth(s, p.id); if (lv[p.id] === a && (a !== b || (p.id + flip) % 2 === 0)) nwA += w; else nwB += w; nw++; }
  }
  const d = wa + wb;
  return { a, b, mode, games: d, stalls, share: d ? wa / d : NaN, se: d ? Math.sqrt(0.25 / d) : NaN, nwA: nwA / Math.max(1, nw / 2), nwB: nwB / Math.max(1, nw / 2) };
}
const P = (v) => `${(v * 100).toFixed(1)}%`;
export const row = (r) => `${r.mode.padEnd(5)} ${r.a.padEnd(6)} vs ${r.b.padEnd(6)}  ${r.a} wins ${P(r.share)} of ${r.games} decided games (stalls ${r.stalls}, +/-${P(r.se * 1.96)} at 95%)  mean final net worth ${Math.round(r.nwA)} vs ${Math.round(r.nwB)}`;

if (process.argv[1] && process.argv[1].endsWith('levels.mjs')) {
  const seeds = +(process.argv[2] || 300), mode = process.argv[3] || 'full';
  console.log(`AI levels head to head: ${seeds} seeds x 2 swaps = ${seeds * 2} games per pairing`);
  const only = process.argv[4];   // optional "hard:normal" to run one pairing
  const list = only ? [only.split(':')] : [['normal', 'normal'], ['hard', 'normal'], ['normal', 'easy'], ['hard', 'easy']];
  for (const [a, b] of list) console.log(row(pairing(a, b, seeds, mode)));
}
