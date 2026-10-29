// Rules engine: one serializable state object, `legal(state)` and `apply(state, action)`.
// Pure game logic, no DOM; tools/balance.mjs runs it in Node. Phase machine idea from XState and
// pure moves from boardgame.io (see SAMPLES.md); all rules are our own (PRD §4).
import { RULES, SPACES, DISTRICTS, LOTS_BY_D, OWNABLE, LINES, N_SPACES, DEPOT, JURY, GOJURY,
  SEASONS, NEWS, TALK, CARD, PERSONA_KEYS, PERSONAS, TOKENS, MONTHS, isRow } from './data.js';
import { seedState, rand, die, shuffle } from './rng.js';

export const VERSION = 1;

export function createGame(opts = {}) {
  const seed = opts.seed ?? 1;
  const s = {
    v: VERSION, seed, rng: seedState(seed),
    opts: { mode: opts.mode || 'full', variant: opts.variant || 'standard', years: opts.years ?? 0, startCash: RULES.startCash },
    players: [], lots: {}, turn: 0, round: 1, month: opts.startMonth ?? 0, year: 0, monthsPlayed: 0,
    phase: 'roll', pending: null, debts: [], resume: null, dice: [0, 0], again: false, forced: null,
    decks: { news: [], talk: [] }, headline: null, lastCard: null, mods: [], treasury: 0,
    built: [], offers: [], log: [], winner: -1, ended: false,
    stats: { trades: 0, auctions: 0, auctionsSold: 0, bankruptcies: [], firstBankruptRound: 0, buys: 0, builds: 0, cards: 0 },
  };
  const seats = (opts.seats && opts.seats.length >= 2 ? opts.seats : [{ kind: 'human' }, { kind: 'ai' }]).slice(0, 6);
  const used = new Set(seats.map((st) => st.persona).filter(Boolean)), names = new Set();
  seats.forEach((st, i) => {
    let persona = null;
    if (st.kind === 'ai') {
      if (st.persona && PERSONAS[st.persona]) persona = st.persona;
      else { const free = PERSONA_KEYS.filter((k) => !used.has(k)); const pool = free.length ? free : PERSONA_KEYS; persona = pool[Math.floor(rand(s) * pool.length)]; used.add(persona); }
    }
    let name = st.name || (st.kind === 'ai' ? PERSONAS[persona].who : `Player ${i + 1}`);
    for (let k = 2; names.has(name); k++) name = `${(st.name || PERSONAS[persona]?.who || 'Player')} ${['', '', 'II', 'III', 'IV', 'V', 'VI'][k] || k}`;
    names.add(name);
    s.players.push({
      id: i, name,
      kind: st.kind === 'ai' ? 'ai' : 'human', persona, token: i, cash: RULES.startCash, pos: DEPOT,
      held: 0, pardons: 0, out: false, doubles: 0, outRound: 0,
      stat: { rentIn: 0, rentOut: 0, bought: 0, built: 0, trades: 0 },
    });
  });
  for (const i of OWNABLE) s.lots[i] = { owner: -1, level: 0, mortgaged: false };
  s.decks.news = shuffle(s, NEWS.map((c) => c.id));
  s.decks.talk = shuffle(s, TALK.map((c) => c.id));
  if (s.opts.mode === 'short') {
    const pool = shuffle(s, OWNABLE.filter((i) => SPACES[i].type === 'lot' && !isRow(i)));
    for (const p of s.players) for (let k = 0; k < 2; k++) s.lots[pool.pop()].owner = p.id;
  }
  log(s, `${MONTHS[s.month]}, Year 1. ${s.players.length} barons arrive at the Depot.`);
  return s;
}

// ---------- queries ----------
export const P = (s, id) => s.players[id];
export const active = (s) => s.players.filter((p) => !p.out);
export const ownerOf = (s, i) => (s.lots[i] ? s.lots[i].owner : -1);
export const absMonth = (s) => s.year * 12 + s.month;
export const log = (s, t) => { s.log.push(t); if (s.log.length > 200) s.log.splice(0, s.log.length - 200); };

export function actor(s) {
  if (s.ended) return -1;
  if (s.phase === 'debt') return s.debts[0].pid;
  if (s.phase === 'auction') return s.pending.order[s.pending.i];
  if (s.phase === 'trade') return s.pending.to;
  return s.turn;
}

export function ownsDistrict(s, d, pid) { return LOTS_BY_D[d].every((i) => s.lots[i].owner === pid); }
export function districtHasBuildings(s, d) { return LOTS_BY_D[d].some((i) => s.lots[i].level > 0); }

export function seasonsNow(s) { return SEASONS.filter((x) => x.months.includes(s.month)); }
export function isFestival(s) { return seasonsNow(s).some((x) => x.festival); }

export function multFor(s, i) {
  const sp = SPACES[i];
  let m = 1;
  if (sp.d) for (const se of seasonsNow(s)) if (se.d[sp.d]) m *= se.d[sp.d];
  const now = absMonth(s);
  for (const md of s.mods) if (md.until >= now && ((md.d && md.d === sp.d) || md.space === i)) m *= md.mult;
  return m;
}

const roundRent = (x) => (x <= 0 ? 0 : x < 20 ? Math.round(x) : Math.round(x / 5) * 5);

// Rent the space would charge now. Returns { total, base } where base is the unimproved share
// (used by the Common Ground variant).
export function rentParts(s, i, diceTotal) {
  const sp = SPACES[i], lot = s.lots[i];
  if (!lot || lot.owner < 0 || lot.mortgaged) return { total: 0, base: 0 };
  const m = multFor(s, i);
  if (sp.type === 'line') {
    const n = LINES.filter((j) => s.lots[j].owner === lot.owner).length;
    const t = roundRent(RULES.lineRent[n] * m);
    return { total: t, base: t };
  }
  if (sp.type === 'util') {
    const t = roundRent((diceTotal || 7) * (isFestival(s) ? RULES.utilFestival : RULES.utilMult) * m);
    return { total: t, base: t };
  }
  const base = sp.price / 10;
  const full = ownsDistrict(s, sp.d, lot.owner);
  if (lot.level === 0) {
    const t = roundRent(base * (full ? RULES.fullBonus : 1) * m);
    return { total: t, base: t };
  }
  return { total: roundRent(base * RULES.M[lot.level] * m), base: roundRent(base * m) };
}
export const rentOf = (s, i, d) => rentParts(s, i, d).total;

export function buildCost(i) { return DISTRICTS[SPACES[i].d].build; }
export function lotWorth(s, i) {
  const sp = SPACES[i], lot = s.lots[i];
  let w = lot.mortgaged ? sp.price * RULES.mortgageRate : sp.price;
  if (lot.level) w += (lot.level === 4 ? 4 : lot.level) * buildCost(i) * RULES.sellRate;
  return w;
}
export function netWorth(s, pid) {
  const p = s.players[pid];
  if (p.out) return 0;
  let w = p.cash;
  for (const i of OWNABLE) if (s.lots[i].owner === pid) w += lotWorth(s, i);
  return Math.round(w);
}
export const owned = (s, pid) => OWNABLE.filter((i) => s.lots[i].owner === pid);

// Cash a player could raise by selling every building and mortgaging every lot.
export function liquidValue(s, pid) {
  let v = s.players[pid].cash;
  for (const i of owned(s, pid)) {
    const lot = s.lots[i];
    if (lot.level) v += (lot.level === 4 ? 4 : lot.level) * buildCost(i) * RULES.sellRate;
    if (!lot.mortgaged && !isRow(i)) v += SPACES[i].price * RULES.mortgageRate;
  }
  return v;
}

export function canBuild(s, pid, i) {
  const sp = SPACES[i], lot = s.lots[i];
  if (!lot || sp.type !== 'lot' || lot.owner !== pid || lot.level >= 4) return false;
  if (!ownsDistrict(s, sp.d, pid)) return false;
  if (LOTS_BY_D[sp.d].some((j) => s.lots[j].mortgaged)) return false;
  if (s.built.includes(i)) return false;
  return s.players[pid].cash >= buildCost(i);
}
export function canSell(s, pid, i) { const lot = s.lots[i]; return !!lot && lot.owner === pid && lot.level > 0; }
export function canMortgage(s, pid, i) {
  const sp = SPACES[i], lot = s.lots[i];
  if (!lot || lot.owner !== pid || lot.mortgaged || isRow(i)) return false;
  if (sp.type === 'lot' && districtHasBuildings(s, sp.d)) return false;
  return true;
}
export const unmortgageCost = (i) => Math.ceil(SPACES[i].price * RULES.mortgageRate * (1 + RULES.unmortgageFee));
export function canUnmortgage(s, pid, i) { const lot = s.lots[i]; return !!lot && lot.owner === pid && lot.mortgaged && s.players[pid].cash >= unmortgageCost(i); }
export function tradeable(s, i) { const sp = SPACES[i]; return sp.type !== 'lot' || !districtHasBuildings(s, sp.d); }

// ---------- legality ----------
export function legal(s) {
  if (s.ended) return [];
  const a = actor(s), out = [];
  const manage = (pid, debt) => {
    for (const i of owned(s, pid)) {
      if (!debt && canBuild(s, pid, i)) out.push({ type: 'build', space: i });
      if (canSell(s, pid, i)) out.push({ type: 'sell', space: i });
      if (canMortgage(s, pid, i)) out.push({ type: 'mortgage', space: i });
      if (!debt && canUnmortgage(s, pid, i)) out.push({ type: 'unmortgage', space: i });
    }
  };
  switch (s.phase) {
    case 'roll': {
      const p = s.players[a];
      out.push({ type: 'roll' });
      if (p.held) { if (p.cash >= RULES.bail) out.push({ type: 'bail' }); if (p.pardons) out.push({ type: 'pardon' }); }
      manage(a, false); out.push({ type: 'propose' });
      break;
    }
    case 'buy': out.push({ type: 'buy' }, { type: 'decline' }); break;
    case 'auction': out.push({ type: 'bid', min: nextMin(s) }, { type: 'pass' }); break;
    case 'trade': out.push({ type: 'respond', accept: true }, { type: 'respond', accept: false }); break;
    case 'debt': manage(a, true); out.push({ type: 'bankrupt' }); break;
    case 'post': manage(a, false); out.push({ type: 'propose' }, { type: 'end' }); break;
  }
  return out;
}
const nextMin = (s) => (s.pending.bid > 0 ? s.pending.bid + RULES.minBid : s.pending.min);

// ---------- apply ----------
// Returns { ok, error, events }. Events drive the UI (animation, sound, live region).
export function apply(s, act) {
  const ev = [];
  if (s.ended) return { ok: false, error: 'game over', events: ev };
  const a = actor(s);
  const pid = act.pid ?? a;
  if (pid !== a) return { ok: false, error: `not player ${pid}'s move`, events: ev };
  const p = s.players[a];
  const t = act.type;
  const inManage = s.phase === 'roll' || s.phase === 'post';
  try {
    if (t === 'roll' && s.phase === 'roll') doRoll(s, p, ev);
    else if (t === 'bail' && s.phase === 'roll' && p.held && p.cash >= RULES.bail) {
      payBank(s, p.id, RULES.bail, 'Grand Jury fees', ev); p.held = 0; log(s, `${p.name} pays $${RULES.bail} and leaves the Grand Jury Room.`); ev.push({ t: 'released', pid: p.id });
    } else if (t === 'pardon' && s.phase === 'roll' && p.held && p.pardons) {
      p.pardons--; p.held = 0; log(s, `${p.name} uses a Reform Pardon.`); ev.push({ t: 'released', pid: p.id });
      returnPardon(s);
    } else if (t === 'buy' && s.phase === 'buy') {
      const i = s.pending.space, price = SPACES[i].price;
      if (p.cash < price) return fail('not enough cash');
      p.cash -= price; s.lots[i].owner = p.id; p.stat.bought++; s.stats.buys++;
      ev.push({ t: 'buy', pid: p.id, space: i, price }); log(s, `${p.name} buys ${SPACES[i].name} for $${price}.`);
      s.pending = null; s.phase = 'post';
    } else if (t === 'decline' && s.phase === 'buy') {
      startAuction(s, s.pending.space, RULES.minBid, ev);
    } else if (t === 'bid' && s.phase === 'auction') {
      const amt = Math.floor(act.amount ?? nextMin(s));
      if (amt < nextMin(s) || amt > p.cash) return fail('bad bid');
      s.pending.bid = amt; s.pending.leader = p.id;
      ev.push({ t: 'bid', pid: p.id, amount: amt }); log(s, `${p.name} bids $${amt}.`);
      advanceAuction(s, ev);
    } else if (t === 'pass' && s.phase === 'auction') {
      s.pending.out.push(p.id); ev.push({ t: 'passbid', pid: p.id }); log(s, `${p.name} drops out.`);
      advanceAuction(s, ev);
    } else if (t === 'build' && inManage && canBuild(s, p.id, act.space)) {
      const i = act.space, c = buildCost(i), lot = s.lots[i];
      p.cash -= c; lot.level++; s.built.push(i); p.stat.built++; s.stats.builds++;
      ev.push({ t: 'build', pid: p.id, space: i, level: lot.level, cost: c });
      log(s, `${p.name} builds ${lot.level === 4 ? 'a Grand Resort' : 'a bathhouse'} on ${SPACES[i].name} ($${c}).`);
    } else if (t === 'sell' && (inManage || s.phase === 'debt') && canSell(s, p.id, act.space)) {
      const i = act.space, lot = s.lots[i];
      const back = Math.floor(buildCost(i) * RULES.sellRate * (lot.level === 4 ? 4 : 1));
      lot.level = lot.level === 4 ? 0 : lot.level - 1; p.cash += back;
      ev.push({ t: 'sell', pid: p.id, space: i, amount: back }); log(s, `${p.name} sells a building on ${SPACES[i].name} for $${back}.`);
    } else if (t === 'mortgage' && (inManage || s.phase === 'debt') && canMortgage(s, p.id, act.space)) {
      const i = act.space, amt = Math.floor(SPACES[i].price * RULES.mortgageRate);
      s.lots[i].mortgaged = true; p.cash += amt;
      ev.push({ t: 'mortgage', pid: p.id, space: i, amount: amt }); log(s, `${p.name} mortgages ${SPACES[i].name} for $${amt}.`);
    } else if (t === 'unmortgage' && inManage && canUnmortgage(s, p.id, act.space)) {
      const i = act.space, c = unmortgageCost(i);
      s.lots[i].mortgaged = false; p.cash -= c;
      ev.push({ t: 'unmortgage', pid: p.id, space: i, amount: c }); log(s, `${p.name} lifts the mortgage on ${SPACES[i].name} ($${c}).`);
    } else if (t === 'propose' && inManage) {
      const err = validateOffer(s, p.id, act);
      if (err) return fail(err);
      s.pending = { kind: 'trade', from: p.id, to: act.to, give: norm(act.give), get: norm(act.get), back: s.phase };
      s.phase = 'trade'; s.offers.push(offerKey(s, s.pending));
      ev.push({ t: 'offer', from: p.id, to: act.to }); log(s, `${p.name} offers a trade to ${s.players[act.to].name}.`);
    } else if (t === 'respond' && s.phase === 'trade') {
      const o = s.pending;
      if (act.accept) {
        const err = validateOffer(s, o.from, o);
        if (err) { s.phase = o.back; s.pending = null; return fail(err); }
        doTrade(s, o, ev);
      } else { ev.push({ t: 'declined', from: o.from, to: o.to }); log(s, `${s.players[o.to].name} declines.`); }
      s.phase = o.back; s.pending = null;
    } else if (t === 'end' && s.phase === 'post') {
      endTurn(s, ev);
    } else if (t === 'bankrupt' && s.phase === 'debt') {
      goBankrupt(s, ev);
    } else return fail(`illegal action ${t} in ${s.phase}`);
  } catch (e) { return fail(String(e && e.message || e)); }
  settle(s, ev);
  return { ok: true, events: ev };
  function fail(error) { return { ok: false, error, events: [] }; }
}

const norm = (x = {}) => ({ lots: [...(x.lots || [])], cash: Math.max(0, Math.floor(x.cash || 0)) });
export const offerKey = (s, o) => `${absMonth(s)}|${o.from}>${o.to}|${[...o.give.lots].sort()}|${o.give.cash}|${[...o.get.lots].sort()}|${o.get.cash}`;

export function validateOffer(s, from, o) {
  const to = o.to;
  if (to === from || !s.players[to] || s.players[to].out) return 'bad partner';
  const give = norm(o.give), get = norm(o.get);
  if (!give.lots.length && !get.lots.length) return 'a trade needs at least one lot';
  for (const i of give.lots) if (ownerOf(s, i) !== from || !tradeable(s, i)) return 'cannot give that lot';
  for (const i of get.lots) if (ownerOf(s, i) !== to || !tradeable(s, i)) return 'cannot ask for that lot';
  if (give.cash > s.players[from].cash || get.cash > s.players[to].cash) return 'not enough cash';
  return null;
}

function doTrade(s, o, ev) {
  const A = s.players[o.from], B = s.players[o.to];
  for (const i of o.give.lots) s.lots[i].owner = B.id;
  for (const i of o.get.lots) s.lots[i].owner = A.id;
  A.cash += o.get.cash - o.give.cash; B.cash += o.give.cash - o.get.cash;
  A.stat.trades++; B.stat.trades++; s.stats.trades++;
  ev.push({ t: 'trade', from: A.id, to: B.id, give: o.give, get: o.get });
  log(s, `Trade: ${A.name} ⇄ ${B.name} (${[...o.give.lots.map((i) => SPACES[i].short), o.give.cash ? '$' + o.give.cash : ''].filter(Boolean).join(', ') || 'nothing'} for ${[...o.get.lots.map((i) => SPACES[i].short), o.get.cash ? '$' + o.get.cash : ''].filter(Boolean).join(', ') || 'nothing'}).`);
}

// ---------- turn flow ----------
function doRoll(s, p, ev) {
  const d = s.forced || [die(s), die(s)];
  s.forced = null; s.dice = d;
  const total = d[0] + d[1], dbl = d[0] === d[1];
  ev.push({ t: 'roll', pid: p.id, dice: d.slice() });
  log(s, `${p.name} rolls ${d[0]} + ${d[1]}${dbl ? ' (doubles)' : ''}.`);
  if (p.held) {
    if (dbl) { p.held = 0; ev.push({ t: 'released', pid: p.id }); log(s, `Doubles! ${p.name} is released.`); s.again = false; move(s, p, total, ev); return; }
    p.held++;
    if (p.held > 3) {
      p.held = 0; log(s, `${p.name} must pay $${RULES.bail} after three hearings.`);
      payBank(s, p.id, RULES.bail, 'Grand Jury fees', ev); ev.push({ t: 'released', pid: p.id });
      s.again = false; move(s, p, total, ev); return;
    }
    s.phase = 'post'; s.again = false; return;
  }
  if (dbl) {
    p.doubles++;
    if (p.doubles >= 3) { log(s, `Three doubles: ${p.name} is called before the Grand Jury.`); sendToJury(s, p, ev); return; }
    s.again = true;
  } else s.again = false;
  move(s, p, total, ev);
}

function move(s, p, steps, ev) {
  const from = p.pos, to = (from + steps) % N_SPACES;
  ev.push({ t: 'move', pid: p.id, from, to, steps });
  if (from + steps >= N_SPACES) payday(s, p, ev);
  p.pos = to;
  land(s, p, ev);
}

function moveTo(s, p, to, ev, collect = true) {
  const steps = (to - p.pos + N_SPACES) % N_SPACES;
  ev.push({ t: 'move', pid: p.id, from: p.pos, to, steps, jump: true });
  if (collect && p.pos + steps >= N_SPACES && steps > 0) payday(s, p, ev);
  p.pos = to;
  land(s, p, ev);
}

function payday(s, p, ev) {
  let n = RULES.payday;
  const rows = owned(s, p.id).filter(isRow).length;
  const ground = rows * RULES.rowGround;
  p.cash += n - ground;
  if (ground) toTreasuryOrBank(s, ground);
  ev.push({ t: 'payday', pid: p.id, amount: n, ground });
  log(s, `${p.name} collects $${n} Payday${ground ? ` (less $${ground} Row ground rent)` : ''}.`);
}

function sendToJury(s, p, ev) {
  ev.push({ t: 'move', pid: p.id, from: p.pos, to: JURY, steps: 0, jump: true });
  p.pos = JURY; p.held = 1; p.doubles = 0; s.again = false; s.phase = 'post';
  ev.push({ t: 'jury', pid: p.id });
}

function land(s, p, ev) {
  const i = p.pos, sp = SPACES[i];
  ev.push({ t: 'land', pid: p.id, space: i });
  s.phase = 'post';
  if (sp.type === 'lot' || sp.type === 'line' || sp.type === 'util') {
    const lot = s.lots[i];
    if (lot.owner < 0) {
      if (isRow(i)) { log(s, `${sp.name} is a federal lease: it goes to auction.`); startAuction(s, i, Math.floor(sp.price / 2), ev); }
      else { s.phase = 'buy'; s.pending = { kind: 'buy', space: i }; }
    } else if (lot.owner !== p.id) {
      const r = rentParts(s, i, s.dice[0] + s.dice[1]);
      if (r.total > 0) payRent(s, p, lot.owner, r, i, ev);
      else if (lot.mortgaged) log(s, `${sp.name} is mortgaged: no rent.`);
    }
  } else if (sp.type === 'tax') {
    log(s, `${p.name} pays the $${RULES.tax} Thermal Water Tax.`);
    payBank(s, p.id, RULES.tax, 'Thermal Water Tax', ev);
  } else if (sp.type === 'talk') {
    drawTalk(s, p, ev);
  } else if (sp.kind === 'gojury') {
    log(s, `${p.name} is called before the Grand Jury.`);
    sendToJury(s, p, ev);
  }
}

function payRent(s, p, owner, r, i, ev) {
  const common = s.opts.variant === 'common';
  const toOwner = common ? r.total - r.base : r.total;
  const toPublic = common ? r.base : 0;
  log(s, `${p.name} owes $${r.total} rent on ${SPACES[i].name}${common && toPublic ? ` ($${toPublic} to the treasury)` : ''}.`);
  ev.push({ t: 'rent', from: p.id, to: owner, space: i, amount: r.total, public: toPublic });
  if (toOwner > 0) charge(s, p.id, owner, toOwner, 'rent', ev);
  if (toPublic > 0) charge(s, p.id, -2, toPublic, 'rent', ev);
}

// Pay or queue a debt. to: pid, -1 bank, -2 treasury.
function charge(s, from, to, amount, why, ev) {
  if (amount <= 0) return;
  const p = s.players[from];
  if (p.cash >= amount && !s.debts.some((d) => d.pid === from)) { transfer(s, from, to, amount, why, ev); return; }
  s.debts.push({ pid: from, amount, to, why });
  ev.push({ t: 'debt', pid: from, amount, to, why });
  log(s, `${p.name} is $${amount - p.cash} short and must raise cash.`);
}
function transfer(s, from, to, amount, why, ev) {
  const p = s.players[from];
  p.cash -= amount;
  if (to >= 0) { s.players[to].cash += amount; if (why === 'rent') { s.players[to].stat.rentIn += amount; p.stat.rentOut += amount; } }
  else if (to === -2) s.treasury += amount;
  else toTreasuryOrBank(s, amount);
  ev.push({ t: 'paid', from, to, amount, why });
}
function payBank(s, pid, amount, why, ev) { charge(s, pid, s.opts.variant === 'common' ? -2 : -1, amount, why, ev); }
function toTreasuryOrBank(s, n) { if (s.opts.variant === 'common') s.treasury += n; }

// Called after every action: start/resolve debts, then check for game end.
function settle(s, ev) {
  while (s.debts.length) {
    const d = s.debts[0], p = s.players[d.pid];
    if (p.out) { s.debts.shift(); continue; }
    if (p.cash >= d.amount) {
      s.debts.shift(); transfer(s, d.pid, d.to, d.amount, d.why, ev);
      log(s, `${p.name} pays the $${d.amount} owed.`);
      continue;
    }
    if (s.phase !== 'debt') { s.resume = s.phase; s.phase = 'debt'; }
    return;
  }
  if (s.phase === 'debt') s.phase = s.resume || 'post';
  if (s.phase === 'post' && s.players[s.turn].out) endTurn(s, ev);
  checkEnd(s, ev);
}

function goBankrupt(s, ev) {
  const d = s.debts.shift(), p = s.players[d.pid];
  const creditor = d.to >= 0 && !s.players[d.to].out ? d.to : -1;
  for (const i of owned(s, p.id)) {
    const lot = s.lots[i];
    if (lot.level) { p.cash += Math.floor(buildCost(i) * RULES.sellRate * (lot.level === 4 ? 4 : lot.level)); lot.level = 0; }
    if (creditor >= 0) lot.owner = creditor;
    else { lot.owner = -1; lot.mortgaged = false; }
  }
  if (creditor >= 0) s.players[creditor].cash += Math.max(0, p.cash);
  else if (s.opts.variant === 'common') s.treasury += Math.max(0, p.cash);
  p.cash = 0; p.out = true; p.outRound = s.round; p.held = 0; p.pardons = 0;
  // Remaining debts of the same player vanish.
  s.debts = s.debts.filter((x) => x.pid !== p.id);
  s.stats.bankruptcies.push({ pid: p.id, round: s.round, to: creditor });
  if (!s.stats.firstBankruptRound) s.stats.firstBankruptRound = s.round;
  ev.push({ t: 'bankrupt', pid: p.id, to: creditor });
  log(s, `${p.name} is bankrupt${creditor >= 0 ? `; everything goes to ${s.players[creditor].name}` : '; lots return to the town'}.`);
  if (s.pending && s.pending.kind === 'auction') s.pending.out.push(p.id);
}

function checkEnd(s, ev) {
  if (s.ended) return;
  const alive = active(s);
  if (alive.length <= 1) return finish(s, ev, 'last baron standing');
}

function finish(s, ev, why) {
  s.ended = true; s.phase = 'over'; s.pending = null;
  const ranked = s.players.map((p) => ({ id: p.id, w: netWorth(s, p.id), out: p.out, outRound: p.outRound }))
    .sort((a, b) => (a.out - b.out) || (b.w - a.w) || (b.outRound - a.outRound));
  s.winner = ranked[0].id; s.ranking = ranked.map((r) => r.id); s.endWhy = why;
  ev.push({ t: 'over', winner: s.winner, why });
  log(s, `Game over (${why}). ${s.players[s.winner].name} wins.`);
}

function endTurn(s, ev) {
  const p = s.players[s.turn];
  s.built = [];
  if (s.again && !p.out && !p.held) { s.again = false; s.phase = 'roll'; ev.push({ t: 'again', pid: p.id }); return; }
  s.again = false; p.doubles = 0;
  const prev = s.turn;
  let n = prev;
  do n = (n + 1) % s.players.length; while (s.players[n].out && n !== prev);
  s.turn = n; s.phase = 'roll';
  if (n <= prev) newMonth(s, ev);
  if (!s.ended) ev.push({ t: 'turn', pid: s.turn });
}

function newMonth(s, ev) {
  s.round++; s.monthsPlayed++;
  s.month = (s.month + 1) % 12; if (s.month === 0) s.year++;
  s.mods = s.mods.filter((m) => m.until >= absMonth(s));
  ev.push({ t: 'month', month: s.month, year: s.year });
  log(s, `— ${MONTHS[s.month]}, Year ${s.year + 1} —`);
  if (s.opts.mode === 'short' && s.monthsPlayed >= 12) return finish(s, ev, 'the season is over');
  if (s.opts.years && s.monthsPlayed >= s.opts.years * 12) return finish(s, ev, 'the year limit');
  if (s.opts.variant === 'common' && s.treasury > 0) {
    const alive = active(s), share = Math.floor(s.treasury / alive.length);
    if (share > 0) { for (const p of alive) p.cash += share; s.treasury -= share * alive.length; ev.push({ t: 'dividend', amount: share }); log(s, `Common dividend: every baron receives $${share}.`); }
  }
  drawNews(s, ev);
}

// ---------- cards ----------
function draw(s, deck) {
  if (!s.decks[deck].length) {
    const all = (deck === 'news' ? NEWS : TALK).map((c) => c.id).filter((id) => !(id === 't-pardon' && s.players.some((p) => p.pardons)));
    s.decks[deck] = shuffle(s, all);
  }
  return s.forcedCard && s.forcedCard[deck] ? takeForced(s, deck) : s.decks[deck].shift();
}
function takeForced(s, deck) { const id = s.forcedCard[deck]; delete s.forcedCard[deck]; s.decks[deck] = s.decks[deck].filter((x) => x !== id); return id; }
function returnPardon(s) { if (!s.decks.talk.includes('t-pardon')) s.decks.talk.push('t-pardon'); }

function drawNews(s, ev) {
  const c = CARD[draw(s, 'news')];
  s.headline = { id: c.id, month: s.month, year: s.year }; s.stats.cards++;
  ev.push({ t: 'card', deck: 'news', id: c.id });
  log(s, `Headline: ${c.title}. ${c.effect}`);
  const fx = c.fx, alive = active(s);
  if (fx.mod) s.mods.push({ d: fx.mod.d, space: fx.mod.space, mult: fx.mod.mult, until: absMonth(s) + (fx.mod.months || 1) - 1, id: c.id });
  if (fx.all) for (const p of alive) { if (fx.all > 0) p.cash += fx.all; }
  if (fx.richPay) for (const p of alive) if (p.cash > fx.richPay.over) payBank(s, p.id, fx.richPay.n, c.title, ev);
  if (fx.repairs) for (const p of alive) repairs(s, p, fx.repairs, c.title, ev);
  if (fx.fire) for (const i of LOTS_BY_D[fx.fire.d]) burn(s, i, ev);
  if (fx.fireSpace != null) burn(s, fx.fireSpace, ev);
  if (fx.fireAll) for (const p of alive) {
    const lots = owned(s, p.id).filter((i) => s.lots[i].level > 0 && s.lots[i].level < 4).sort((a, b) => s.lots[b].level - s.lots[a].level || SPACES[b].price - SPACES[a].price);
    if (lots.length) burn(s, lots[0], ev);
  }
  if (fx.ownerGets) { const o = ownerOf(s, fx.ownerGets.space); if (o >= 0) s.players[o].cash += fx.ownerGets.n; }
  if (fx.dOwners) for (const i of LOTS_BY_D[fx.dOwners.d]) { const o = ownerOf(s, i); if (o >= 0) s.players[o].cash += fx.dOwners.per + (fx.dOwners.perLevel || 0) * Math.min(3, s.lots[i].level); }
  if (fx.poorestGets) { const q = alive.slice().sort((a, b) => netWorth(s, a.id) - netWorth(s, b.id))[0]; if (q) { q.cash += fx.poorestGets; log(s, `${q.name} collects $${fx.poorestGets}.`); } }
}

function burn(s, i, ev) {
  const lot = s.lots[i];
  if (lot.owner >= 0 && lot.level > 0 && lot.level < 4) { lot.level--; ev.push({ t: 'burn', space: i }); log(s, `${SPACES[i].name} loses a bathhouse.`); }
}

function repairs(s, p, r, why, ev) {
  let n = 0;
  for (const i of owned(s, p.id)) {
    const lot = s.lots[i];
    if (!lot.level || (r.ds && !r.ds.includes(SPACES[i].d))) continue;
    n += lot.level === 4 ? r.resort : lot.level * r.per;
  }
  if (n) { log(s, `${p.name} pays $${n} for repairs.`); payBank(s, p.id, n, why, ev); }
}

function drawTalk(s, p, ev) {
  const c = CARD[draw(s, 'talk')], fx = c.fx;
  s.lastCard = { id: c.id, pid: p.id }; s.stats.cards++;
  ev.push({ t: 'card', deck: 'talk', id: c.id, pid: p.id });
  log(s, `${p.name} draws Town Talk: ${c.title}. ${c.effect}`);
  if (fx.gain) p.cash += fx.gain;
  if (fx.pay) payBank(s, p.id, fx.pay, c.title, ev);
  if (fx.collectEach) for (const q of active(s)) if (q.id !== p.id) charge(s, q.id, p.id, fx.collectEach, c.title, ev);
  if (fx.payEach) for (const q of active(s)) if (q.id !== p.id) charge(s, p.id, q.id, fx.payEach, c.title, ev);
  if (fx.repairs) repairs(s, p, fx.repairs, c.title, ev);
  if (fx.pardon) { p.pardons++; s.decks.talk = s.decks.talk.filter((x) => x !== 't-pardon'); }
  if (fx.jury) { sendToJury(s, p, ev); return; }
  if (fx.advance != null) { moveTo(s, p, fx.advance, ev); return; }
  if (fx.back) {
    const to = (p.pos - fx.back + N_SPACES) % N_SPACES;
    ev.push({ t: 'move', pid: p.id, from: p.pos, to, steps: -fx.back, jump: true });
    p.pos = to; land(s, p, ev);
  }
}

// ---------- auctions ----------
function startAuction(s, i, min, ev) {
  const n = s.players.length, order = [];
  for (let k = 1; k <= n; k++) { const q = (s.turn + k) % n; if (!s.players[q].out) order.push(q); }
  s.pending = { kind: 'auction', space: i, min, bid: 0, leader: -1, order, i: 0, out: [] };
  s.phase = 'auction'; s.stats.auctions++;
  ev.push({ t: 'auction', space: i, min });
  log(s, `Auction for ${SPACES[i].name} (opening $${min}).`);
  // Skip bidders who can't afford the opening bid.
  for (const q of order) if (s.players[q].cash < min) s.pending.out.push(q);
  s.pending.i = -1; advanceAuction(s, ev);
}

function advanceAuction(s, ev) {
  const A = s.pending, n = A.order.length;
  const live = A.order.filter((q) => !A.out.includes(q));
  if ((A.leader >= 0 && live.length <= 1) || live.length === 0) return closeAuction(s, ev);
  for (let k = 1; k <= n; k++) {
    const j = (A.i + k + n) % n, q = A.order[j];
    if (A.out.includes(q) || q === A.leader) continue;
    if (s.players[q].cash < nextMin(s)) { A.out.push(q); continue; }
    A.i = j; return;
  }
  closeAuction(s, ev);
}

function closeAuction(s, ev) {
  const A = s.pending, i = A.space;
  if (A.leader >= 0) {
    const w = s.players[A.leader];
    w.cash -= A.bid; s.lots[i].owner = w.id; w.stat.bought++; s.stats.auctionsSold++;
    ev.push({ t: 'won', pid: w.id, space: i, amount: A.bid });
    log(s, `${w.name} wins ${SPACES[i].name} for $${A.bid}.`);
  } else { ev.push({ t: 'unsold', space: i }); log(s, `No bids: ${SPACES[i].name} stays with the town.`); }
  s.pending = null; s.phase = 'post';
}

// ---------- helpers for tests / UI ----------
export function forceDice(s, a, b) { s.forced = [a, b]; }
export function forceCard(s, deck, id) { s.forcedCard = { ...(s.forcedCard || {}), [deck]: id }; }
export function summary(s) {
  return {
    round: s.round, month: s.month, year: s.year, phase: s.phase, turn: s.turn, actor: actor(s), ended: s.ended, winner: s.winner,
    players: s.players.map((p) => ({ id: p.id, name: p.name, kind: p.kind, persona: p.persona, cash: p.cash, pos: p.pos, out: p.out, held: p.held, worth: netWorth(s, p.id), lots: owned(s, p.id).length })),
    stats: s.stats, treasury: s.treasury,
  };
}
export { TOKENS };
