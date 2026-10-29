// AI barons. Each decision scores property value, liquidity and threat (MECHANICS §7), weighted
// by persona. Bundle valuation for trades follows the idea of OpenSpiel's bargaining game
// (Apache-2.0, idea only, no code). Deterministic given state.rng.
import { SPACES, DISTRICTS, LOTS_BY_D, OWNABLE, LINES, PERSONAS, RULES, isRow } from './data.js';
import { rand } from './rng.js';
import { actor, legal, ownerOf, rentOf, owned, netWorth, buildCost, canBuild, canMortgage, canUnmortgage,
  unmortgageCost, tradeable, validateOffer, offerKey, ownsDistrict, active } from './engine.js';

const persona = (s, pid) => PERSONAS[s.players[pid].persona] || PERSONAS.hotelier;

// Liquidity: cash the AI wants to keep, scaled to the worst rents it could land on.
export function reserveFor(s, pid) {
  const rents = [];
  for (const i of OWNABLE) { const o = ownerOf(s, i); if (o >= 0 && o !== pid) rents.push(rentOf(s, i, 7)); }
  rents.sort((a, b) => b - a);
  const top = rents.slice(0, 3);
  const avg = top.length ? top.reduce((a, b) => a + b, 0) / top.length : 0;
  return persona(s, pid).reserve * (60 + 0.7 * avg);
}

// Value of lot i to player pid if pid held it, given everything else as it stands
// (`extra` = lots assumed also held, `minus` = lots assumed given away).
export function lotValue(s, pid, i, extra = [], minus = []) {
  const sp = SPACES[i], per = persona(s, pid);
  const holds = (j) => (extra.includes(j) || ownerOf(s, j) === pid) && !minus.includes(j);
  if (sp.type === 'line') { const n = LINES.filter((j) => j !== i && holds(j)).length; return sp.price * (1 + 0.6 * n); }
  if (sp.type === 'util') return sp.price * 0.85;
  const group = LOTS_BY_D[sp.d];
  const mine = group.filter((j) => j !== i && holds(j)).length;
  const blockers = new Set(group.filter((j) => j !== i && !holds(j) && ownerOf(s, j) >= 0).map((j) => ownerOf(s, j)));
  const completes = mine + 1 === group.length;
  const share = (mine + 1) / group.length;
  let v = sp.price * (1 + 0.5 * share * (blockers.size ? 0.4 : 1) + (completes ? 1.1 : 0));
  // Rent potential of a full district with buildings, discounted.
  if (completes) v += DISTRICTS[sp.d].build * 1.2;
  return v * (per.taste[sp.d] || 1);
}

// Threat: how much lot i is worth to opponent q (completing or nearly completing their district).
export function threat(s, q, i, extra = []) {
  const sp = SPACES[i];
  if (sp.type !== 'lot') return 0;
  const group = LOTS_BY_D[sp.d];
  const theirs = group.filter((j) => j !== i && (ownerOf(s, j) === q || extra.includes(j))).length;
  if (theirs + 1 === group.length) return sp.price * 1.6 + DISTRICTS[sp.d].build * 1.5;
  return 0;
}
const maxThreat = (s, pid, i) => Math.max(0, ...active(s).filter((q) => q.id !== pid).map((q) => threat(s, q.id, i)));

export function evalTrade(s, pid, o) {
  // o from proposer's view: give (to pid) / get (from pid). Value to pid of accepting.
  const per = persona(s, pid);
  const recv = o.give.lots, lose = o.get.lots;
  let gain = 0;
  for (const i of recv) gain += lotValue(s, pid, i, recv, lose);
  for (const i of lose) gain -= lotValue(s, pid, i);
  gain += o.give.cash - o.get.cash;
  // Threat: lots that would complete the proposer's district.
  for (const i of lose) gain -= 0.85 * threat(s, o.from, i, lose);
  // Liquidity: don't accept trades that leave us broke.
  const cashAfter = s.players[pid].cash + o.give.cash - o.get.cash;
  if (cashAfter < reserveFor(s, pid) * 0.5) gain -= (reserveFor(s, pid) * 0.5 - cashAfter);
  const moved = [...recv, ...lose].reduce((a, i) => a + SPACES[i].price, 0) + o.give.cash + o.get.cash;
  return gain - margin(s, per) * moved;
}
// Barons get more willing to deal as a game drags on (keeps long games from stalling).
const lateness = (s) => Math.max(0, s.round - 20);
const margin = (s, per) => per.margin * Math.max(0.2, 1 - lateness(s) / 40);

function maxBid(s, pid, i) {
  const per = persona(s, pid), p = s.players[pid];
  let v = Math.max(lotValue(s, pid, i) * per.bid, maxThreat(s, pid, i) * 0.7);
  if (per.wild) v *= 0.8 + rand(s) * 0.6;
  return Math.floor(Math.min(v, p.cash - reserveFor(s, pid) * 0.5));
}

// One action for whoever must act now (must be an AI seat).
export function aiAction(s) {
  const pid = actor(s);
  if (pid < 0) return null;
  const p = s.players[pid], per = persona(s, pid), L = legal(s);
  const has = (t) => L.some((a) => a.type === t);
  switch (s.phase) {
    case 'buy': {
      const i = s.pending.space, price = SPACES[i].price, v = lotValue(s, pid, i), res = reserveFor(s, pid);
      const completes = SPACES[i].type === 'lot' && LOTS_BY_D[SPACES[i].d].every((j) => j === i || ownerOf(s, j) === pid);
      const ok = p.cash >= price && (p.cash - price >= res || (completes && p.cash - price >= res * 0.3)) && v >= price * per.buyBar;
      return { type: ok ? 'buy' : 'decline' };
    }
    case 'auction': {
      const A = s.pending, min = L.find((a) => a.type === 'bid').min;
      const cap = maxBid(s, pid, A.space);
      if (cap >= min) {
        const step = min < 100 ? 10 : 25;
        return { type: 'bid', amount: Math.min(cap, A.bid > 0 ? A.bid + step : Math.max(min, Math.min(cap, Math.floor(SPACES[A.space].price * 0.4)))) };
      }
      return { type: 'pass' };
    }
    case 'trade': return { type: 'respond', accept: evalTrade(s, pid, s.pending) > 0 };
    case 'debt': return raiseCash(s, pid, L);
    case 'roll': {
      if (p.held) {
        const unowned = OWNABLE.filter((i) => ownerOf(s, i) < 0).length;
        if (p.pardons) return { type: 'pardon' };
        if (has('bail') && unowned > 6 && p.cash > reserveFor(s, pid) + 100) return { type: 'bail' };
        return { type: 'roll' };
      }
      return manage(s, pid, L, true) || { type: 'roll' };
    }
    case 'post': return manage(s, pid, L, false) || { type: 'end' };
  }
  return L[0] || null;
}

function manage(s, pid, L, preRoll) {
  const p = s.players[pid], per = persona(s, pid), res = reserveFor(s, pid);
  // Lift mortgages in districts we own outright first.
  const um = L.filter((a) => a.type === 'unmortgage').sort((a, b) => score(b.space) - score(a.space));
  function score(i) { const sp = SPACES[i]; return sp.type === 'lot' && ownsDistrict(s, sp.d, pid) ? 2 : 1; }
  if (um.length && p.cash - unmortgageCost(um[0].space) > res * 1.6) return um[0];
  // Build where marginal rent per dollar is best.
  const builds = L.filter((a) => a.type === 'build');
  if (builds.length) {
    const best = builds.map((a) => ({ a, gain: marginal(s, a.space) / buildCost(a.space) - s.lots[a.space].level * 0.01 }))
      .sort((x, y) => y.gain - x.gain)[0];
    if (p.cash - buildCost(best.a.space) >= res * per.build) return best.a;
  }
  if (preRoll && s.players.length > 1) { const t = proposeTrade(s, pid); if (t) return t; }
  return null;
}

function marginal(s, i) {
  const lot = s.lots[i], sp = SPACES[i], base = sp.price / 10;
  const now = lot.level === 0 ? base * 2 : base * RULES.M[lot.level];
  return base * RULES.M[lot.level + 1] - now;
}

function raiseCash(s, pid, L) {
  // Sell buildings in the cheapest districts first, then mortgage lots outside complete districts.
  const sells = L.filter((a) => a.type === 'sell').sort((a, b) => SPACES[a.space].price - SPACES[b.space].price);
  const morts = L.filter((a) => a.type === 'mortgage');
  const loose = morts.filter((a) => SPACES[a.space].type !== 'lot' || !ownsDistrict(s, SPACES[a.space].d, pid))
    .sort((a, b) => lotValue(s, pid, a.space) - lotValue(s, pid, b.space));
  if (loose.length) return loose[0];
  if (sells.length) return sells[0];
  if (morts.length) return morts.sort((a, b) => SPACES[a.space].price - SPACES[b.space].price)[0];
  return { type: 'bankrupt' };
}

// Look for a deal that completes one of our districts: a swap when the other side also gains a
// completion, otherwise a cash purchase. At most two offers per turn, never repeat a declined one.
export function proposeTrade(s, pid) {
  const per = persona(s, pid), p = s.players[pid];
  if (s.offers.filter((k) => k.startsWith(`${s.year * 12 + s.month}|${pid}>`)).length >= 2) return null;
  if (rand(s) > Math.min(1, per.trade + lateness(s) * 0.02)) return null;
  const res = reserveFor(s, pid);
  const options = [];
  for (const d of Object.keys(LOTS_BY_D)) {
    const g = LOTS_BY_D[d];
    const mine = g.filter((i) => ownerOf(s, i) === pid);
    const missing = g.filter((i) => ownerOf(s, i) !== pid);
    if (!mine.length || !missing.length || missing.length > 2) continue;
    const q = ownerOf(s, missing[0]);
    if (q < 0 || s.players[q].out || missing.some((i) => ownerOf(s, i) !== q || !tradeable(s, i))) continue;
    // Something of ours that completes (or helps) q, which we don't need ourselves.
    const mineSpare = owned(s, pid).filter((i) => tradeable(s, i) && !g.includes(i) && !(SPACES[i].type === 'lot' && ownsDistrict(s, SPACES[i].d, pid)));
    const giveFor = mineSpare.map((i) => ({ i, th: threat(s, q, i), own: lotValue(s, pid, i) })).sort((a, b) => (b.th - a.th) || (a.own - b.own));
    const base = { from: pid, to: q, get: { lots: missing, cash: 0 } };
    const tries = [];
    if (giveFor.length && giveFor[0].th > 0) tries.push({ lots: [giveFor[0].i] });
    if (giveFor.length) tries.push({ lots: [giveFor[giveFor.length - 1].i] });
    tries.push({ lots: [] });
    for (const g0 of tries) {
      // Find the least cash that makes q accept (by q's persona valuation).
      const avail = Math.min(2500, p.cash - res * 0.6), step = Math.max(50, Math.ceil(avail / 12 / 10) * 10);
      for (let cash = 0; cash <= avail; cash += step) {
        const o = { ...base, give: { lots: g0.lots, cash } };
        if (!g0.lots.length && !cash) continue;
        if (validateOffer(s, pid, o)) continue;
        if (s.offers.includes(offerKey(s, { from: pid, to: q, give: o.give, get: o.get }))) continue;
        const theirs = evalTrade(s, q, o);
        const ours = evalTrade(s, pid, { from: q, to: pid, give: o.get, get: o.give });
        if (theirs > 0 && ours > 0) { options.push({ o, ours }); break; }
        if (s.players[q].kind === 'human' && ours > 0 && theirs > -40) { options.push({ o, ours }); break; }
      }
      if (options.length) break;
    }
  }
  if (!options.length) return null;
  options.sort((a, b) => b.ours - a.ours);
  const o = options[0].o;
  return { type: 'propose', to: o.to, give: o.give, get: o.get };
}
