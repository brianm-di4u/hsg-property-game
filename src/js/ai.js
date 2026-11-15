// AI barons. Each decision scores property value, liquidity and threat (MECHANICS §7), weighted
// by persona. Bundle valuation for trades follows the idea of OpenSpiel's bargaining game
// (Apache-2.0, idea only, no code). Deterministic given state.rng.
import { SPACES, DISTRICTS, LOTS_BY_D, OWNABLE, LINES, PERSONAS, LEVELS, RULES, TRADE_AI, SEASONS, isRow } from './data.js';
import { rand } from './rng.js';
import { actor, legal, ownerOf, rentOf, owned, netWorth, buildCost, canBuild, canMortgage, canUnmortgage,
  unmortgageCost, tradeable, validateOffer, offerKey, ownsDistrict, active, absMonth, multFor } from './engine.js';

const persona = (s, pid) => PERSONAS[s.players[pid].persona] || PERSONAS.hotelier;
// The AI level of seat pid; a save from before levels (or a damaged value) plays as Normal.
export const levelOf = (s, pid) => LEVELS[s.players[pid].level] || LEVELS.normal;

// Liquidity: cash the AI wants to keep, scaled to the worst rents it could land on.
export function reserveFor(s, pid) {
  const rents = [];
  for (const i of OWNABLE) { const o = ownerOf(s, i); if (o >= 0 && o !== pid) rents.push(rentOf(s, i, 7)); }
  rents.sort((a, b) => b - a);
  const top = rents.slice(0, 3);
  const avg = top.length ? top.reduce((a, b) => a + b, 0) / top.length : 0;
  return persona(s, pid).reserve * levelOf(s, pid).reserve * (60 + 0.7 * avg);
}

// The tourism calendar and Headlines (S3-07). A lot is worth more to a baron who can see its rent about to double, and less
// when a season is about to halve it: lotValue is scaled by how far the rent multiplier, averaged over the next
// CAL_MONTHS months, sits from 1, taken at CAL_WEIGHT (0 switches this off, as the AI played before). The season is known
// for the whole window; a Headline's modifier only for the months it lasts. reserveFor already uses today's rent.
export const CAL_MONTHS = 6, CAL_WEIGHT = 0.5;
export function calendarFactor(s, i) {
  const sp = SPACES[i], now = absMonth(s);
  let sum = 0;
  for (let k = 0; k < CAL_MONTHS; k++) {
    let m = 1;
    if (sp.d) for (const se of SEASONS) if (se.months.includes((s.month + k) % 12) && se.d[sp.d]) m *= se.d[sp.d];
    for (const md of s.mods) if (md.until >= now + k && ((md.d && md.d === sp.d) || md.space === i)) m *= md.mult;
    sum += m;
  }
  return 1 + CAL_WEIGHT * (sum / CAL_MONTHS - 1);
}

// Value of lot i to player pid if pid held it, given everything else as it stands
// (`extra` = lots assumed also held, `minus` = lots assumed given away).
export function lotValue(s, pid, i, extra = [], minus = []) {
  const sp = SPACES[i], per = persona(s, pid);
  const holds = (j) => (extra.includes(j) || ownerOf(s, j) === pid) && !minus.includes(j);
  // A mortgaged lot costs its holder the price of lifting the mortgage.
  const owed = s.lots[i].mortgaged ? unmortgageCost(i) : 0, cal = calendarFactor(s, i);
  if (sp.type === 'line') { const n = LINES.filter((j) => j !== i && holds(j)).length; return sp.price * (1 + 0.6 * n) * cal - owed; }
  if (sp.type === 'util') return sp.price * 0.85 * cal - owed;
  const group = LOTS_BY_D[sp.d];
  const mine = group.filter((j) => j !== i && holds(j)).length;
  const blockers = new Set(group.filter((j) => j !== i && !holds(j) && ownerOf(s, j) >= 0).map((j) => ownerOf(s, j)));
  const completes = mine + 1 === group.length;
  const share = (mine + 1) / group.length;
  const lv = levelOf(s, pid);
  let v = sp.price * (1 + 0.5 * share * (blockers.size ? 0.4 : 1) + (completes ? lv.complete : 0));
  // Rent potential of a full district with buildings, discounted.
  if (completes) v += DISTRICTS[sp.d].build * 1.2;
  return v * (per.taste[sp.d] || 1) * cal - owed;
}

// Threat: how much lot i is worth to opponent q (completing their district, or leaving them one lot short).
export function threat(s, q, i, extra = []) {
  const sp = SPACES[i];
  if (sp.type !== 'lot') return 0;
  const group = LOTS_BY_D[sp.d];
  const theirs = group.filter((j) => j !== i && (ownerOf(s, j) === q || extra.includes(j))).length;
  const full = sp.price * 1.6 + DISTRICTS[sp.d].build * 1.5;
  if (theirs + 1 === group.length) return full;
  // The piece before the last: with it they would be one lot short of a whole district.
  if (theirs >= 1 && theirs + 2 === group.length) return full * TRADE_AI.twoAway;
  return 0;
}
const maxThreat = (s, pid, i) => Math.max(0, ...active(s).filter((q) => q.id !== pid).map((q) => threat(s, q.id, i)));

// The parts of a trade's worth to the baron pid, so a refusal can say which part sank it (S2-10).
function tradeParts(s, pid, o) {
  // o from proposer's view: give (to pid) / get (from pid). Value to pid of accepting.
  const per = persona(s, pid), lv = levelOf(s, pid);
  const recv = o.give.lots, lose = o.get.lots;
  let gain = 0;
  for (const i of recv) gain += lotValue(s, pid, i, recv, lose);
  for (const i of lose) gain -= lotValue(s, pid, i);
  gain += o.give.cash - o.get.cash;
  // Threat: lots that would complete the proposer's district.
  let threatCost = 0, net = gain; // net keeps the order of the sums the AI always used, so no old decision moves
  for (const i of lose) { const c = 0.85 * lv.threat * threat(s, o.from, i, lose); threatCost += c; net -= c; }
  // Liquidity: don't accept trades that leave us broke.
  const cashAfter = s.players[pid].cash + o.give.cash - o.get.cash;
  const cashCost = cashAfter < reserveFor(s, pid) * 0.5 ? reserveFor(s, pid) * 0.5 - cashAfter : 0;
  net -= cashCost;
  const moved = [...recv, ...lose].reduce((a, i) => a + SPACES[i].price, 0) + o.give.cash + o.get.cash;
  const marginCost = margin(s, per) * lv.margin * (1 + TRADE_AI.repeat * earlierOffers(s, o)) * moved;
  return { threatCost, cashCost, marginCost, score: net - marginCost };
}
export const evalTrade = (s, pid, o) => tradeParts(s, pid, o).score;

// Why baron pid turns an offer down, in a phrase for the toast and the ledger, with the nearest cash the proposer could add that
// would be taken (S2-10); '' when it would be accepted. The reason is the first part that, taken out, would turn the answer to yes.
export const COUNTER_STEP = 10, COUNTER_MAX = 3000;
export function declineWhy(s, pid, o) {
  const p = tradeParts(s, pid, o);
  if (p.score > 0) return '';
  let why;
  if (p.cashCost > 0 && p.score + p.cashCost > 0) why = 'it would leave too little cash';
  else if (p.threatCost > 0 && p.score + p.threatCost > 0) why = 'that lot would finish your district';
  else if (o.get.lots.some((i) => SPACES[i].type === 'lot' && LOTS_BY_D[SPACES[i].d].some((j) => j !== i && ownerOf(s, j) === pid))) why = 'that lot is part of a district already held';
  else why = 'the price is too low';
  const room = s.players[o.from].cash - o.give.cash;
  for (let extra = COUNTER_STEP; extra <= Math.min(COUNTER_MAX, room); extra += COUNTER_STEP) {
    if (evalTrade(s, pid, { ...o, give: { lots: o.give.lots, cash: o.give.cash + extra } }) > 0) return `${why}; about ${'$' + extra.toLocaleString('en-US')} more might do`;
  }
  return why;
}
// Offers this baron already made this month, not counting this one: whoever keeps probing for the lowest
// price the AI will take is met with a harder bargain each time.
const earlierOffers = (s, o) => {
  const prefix = `${absMonth(s)}|${o.from}>`, own = offerKey(s, o);
  let n = 0;
  for (const k of s.offers) if (k.startsWith(prefix) && k !== own) n++;
  return n;
};
// Barons get more willing to deal as a game drags on (keeps long games from stalling).
const lateness = (s) => Math.max(0, s.round - 20);
const margin = (s, per) => per.margin * Math.max(0.2, 1 - lateness(s) / 40);

function maxBid(s, pid, i) {
  const per = persona(s, pid), p = s.players[pid];
  let v = Math.max(lotValue(s, pid, i) * per.bid, maxThreat(s, pid, i) * 0.7 * levelOf(s, pid).threat);
  if (per.wild) v *= 0.8 + rand(s) * 0.6;
  v *= levelOf(s, pid).bid;
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
      const ok0 = p.cash >= price && (p.cash - price >= res || (completes && p.cash - price >= res * 0.3)) && v >= price * per.buyBar;
      const lv = levelOf(s, pid), slip = ok0 && lv.mistake > 0 && rand(s) < lv.mistake;
      return { type: ok0 && !slip ? 'buy' : 'decline' };
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
    case 'trade': { const accept = evalTrade(s, pid, s.pending) > 0; return accept ? { type: 'respond', accept } : { type: 'respond', accept, why: declineWhy(s, pid, s.pending) }; }
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
  const p = s.players[pid], per = persona(s, pid), res = reserveFor(s, pid), lv = levelOf(s, pid);
  // Lift mortgages in districts we own outright first.
  const um = L.filter((a) => a.type === 'unmortgage').sort((a, b) => score(b.space) - score(a.space));
  function score(i) { const sp = SPACES[i]; return sp.type === 'lot' && ownsDistrict(s, sp.d, pid) ? 2 : 1; }
  if (um.length && p.cash - unmortgageCost(um[0].space) > res * 1.6) return um[0];
  // Build where marginal rent per dollar is best.
  // A lot whose rent is switched off this month (the Army in the hotels, a fire) is not built on until it earns again.
  const builds = L.filter((a) => a.type === 'build' && s.lots[a.space].level < lv.buildTo && multFor(s, a.space) > 0);
  if (builds.length) {
    const best = builds.map((a) => ({ a, gain: marginal(s, a.space) / buildCost(a.space) - s.lots[a.space].level * 0.01 }))
      .sort((x, y) => y.gain - x.gain)[0];
    if (p.cash - buildCost(best.a.space) >= res * per.build * lv.buildGate) return best.a;
  }
  if (preRoll && s.players.length > 1 && lv.trade !== null) { const t = proposeTrade(s, pid); if (t) return t; }
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
  const per = persona(s, pid), p = s.players[pid], lv = levelOf(s, pid);
  if (s.offers.filter((k) => k.startsWith(`${s.year * 12 + s.month}|${pid}>`)).length >= 2) return null;
  if (lv.trade === null || (s.turnOffers || 0) >= RULES.offersPerTurn) return null;
  if (rand(s) > Math.min(1, per.trade + lv.trade + lateness(s) * 0.02)) return null;
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
