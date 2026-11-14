// Career: what a player's finished games add up to (records, achievements, felts). Pure data and rules, no DOM and no
// storage: main.js reads and writes the `hs-barons-career-v1` key and shows the results. Everything here is derived from
// what the engine counted, so an achievement is earned by play and never by opening a menu.
import { PERSONA_KEYS, LEVEL_KEYS, SPACES, isRow } from './data.js';
import { netWorth, ownsDistrict } from './engine.js';

export const CAREER_KEY = 'hs-barons-career-v1';
export const CAREER_VERSION = 1;

// Retune in one place: the numbers the achievements and felts ask for.
export const GOALS = { bigRent: 500, longGame: 40, purse: 10000, regular: 10, tenWins: 10, feltGames: 5, feltAch: 8 };

// id, name and what the player must do. `when` says where it is checked: 'play' (after an action, from the events and
// the table) or 'end' (when a game finishes). The first six can be reached in a first session; the last five take weeks.
export const ACH = [
  { id: 'first-lot', name: 'First Lease', text: 'Buy or win your first lot.', when: 'play' },
  { id: 'first-rent', name: 'Rent Day', text: 'Collect rent from another baron.', when: 'play' },
  { id: 'first-build', name: 'Bathhouse Raised', text: 'Build your first bathhouse.', when: 'play' },
  { id: 'whole-district', name: 'Whole Block', text: 'Own every lot in a district.', when: 'play' },
  { id: 'deal-maker', name: 'Handshake', text: 'Close a trade with another baron.', when: 'play' },
  { id: 'win-short', name: 'Short Season', text: 'Win a Short game.', when: 'end' },
  { id: 'row-lease', name: 'On the Row', text: 'Win a Bathhouse Row lease at auction.', when: 'play' },
  { id: 'big-rent', name: 'Full House', text: `Collect $${GOALS.bigRent} or more in a single rent.`, when: 'play' },
  { id: 'foreclosure', name: 'Foreclosure', text: 'Send a rival into bankruptcy.', when: 'play' },
  { id: 'grand-resort', name: 'Grand Resort', text: 'Raise a Grand Resort.', when: 'play' },
  { id: 'win-full', name: 'Last Baron Standing', text: 'Win a Full game.', when: 'end' },
  { id: 'win-common', name: 'Common Ground', text: 'Win a game of the Common Ground rules.', when: 'end' },
  { id: 'win-hard', name: 'Sharp Company', text: 'Win a game with a Hard baron at the table.', when: 'end' },
  { id: 'long-game', name: 'A Long Season', text: `Finish a game that runs ${GOALS.longGame} months or more.`, when: 'end' },
  { id: 'purse', name: 'Fat Purse', text: `Finish a Full game worth $${GOALS.purse.toLocaleString('en-US')} or more.`, when: 'end' },
  { id: 'regular', name: 'Regular', text: `Finish ${GOALS.regular} games.`, when: 'end' },
  { id: 'ten-wins', name: 'Ten Deeds', text: `Win ${GOALS.tenWins} games.`, when: 'end' },
  { id: 'all-barons', name: 'Whole Town', text: 'Win a game against each kind of AI baron.', when: 'end' },
];
export const ACH_BY_ID = Object.fromEntries(ACH.map((a) => [a.id, a]));

// Felt colours for the dice tray: [light centre, light edge, night centre, night edge]. Baize green is what the tray has
// always been and is always open; the others are new and are earned.
export const FELTS = [
  { id: 'green', name: 'Baize green', c: ['#2F6A55', '#1C4536', '#24524A', '#122C27'], need: 'Always open', has: () => true },
  { id: 'oxblood', name: 'Oxblood', c: ['#8A2F3A', '#531820', '#6B2630', '#38101A'], need: 'Win a game to unlock', has: (c) => c.wins >= 1 },
  { id: 'midnight', name: 'Midnight blue', c: ['#2D4C8A', '#172A52', '#25407A', '#0F1B38'], need: `Finish ${GOALS.feltGames} games to unlock`, has: (c) => c.games >= GOALS.feltGames },
  { id: 'brass', name: 'Brass', c: ['#A8842E', '#6A4F16', '#7C6322', '#43330E'], need: `Earn ${GOALS.feltAch} achievements to unlock`, has: (c) => Object.keys(c.ach).length >= GOALS.feltAch },
];
export const FELT_BY_ID = Object.fromEntries(FELTS.map((f) => [f.id, f]));
export const feltOpen = (career, id) => !!FELT_BY_ID[id] && (id === 'green' || !!career.unlocked[id]);

const rec = () => ({ games: 0, wins: 0 });
export function blankCareer() {
  return {
    v: CAREER_VERSION, games: 0, wins: 0, streak: 0, bestStreak: 0,
    mode: { full: rec(), short: rec() }, variant: { standard: rec(), common: rec() },
    level: { none: rec(), ...Object.fromEntries(LEVEL_KEYS.map((k) => [k, rec()])) },
    persona: Object.fromEntries(PERSONA_KEYS.map((k) => [k, rec()])),
    bestShort: 0, bestFull: 0, longest: 0, biggestRent: 0, bankrupted: 0, resorts: 0, trades: 0,
    ach: {}, unlocked: {},
  };
}

// A record read back from the browser: every field is checked, a missing or damaged one falls back to its default, and
// nothing the player had is lowered. `null` means "not a career record".
export function cleanCareer(raw) {
  const out = blankCareer();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const num = (x) => (Number.isFinite(x) && x >= 0 && x <= 1e9 ? Math.floor(x) : 0);
  for (const k of ['games', 'wins', 'streak', 'bestStreak', 'bestShort', 'bestFull', 'longest', 'biggestRent', 'bankrupted', 'resorts', 'trades']) out[k] = num(raw[k]);
  for (const group of ['mode', 'variant', 'level', 'persona']) {
    const src = raw[group];
    if (!src || typeof src !== 'object') continue;
    for (const k of Object.keys(out[group])) if (src[k] && typeof src[k] === 'object') out[group][k] = { games: num(src[k].games), wins: num(src[k].wins) };
  }
  for (const group of ['ach', 'unlocked']) {
    const src = raw[group];
    if (!src || typeof src !== 'object' || Array.isArray(src)) continue;
    for (const k of Object.keys(src)) if ((group === 'ach' ? ACH_BY_ID[k] : FELT_BY_ID[k]) && typeof src[k] === 'string') out[group][k] = src[k].slice(0, 10);
  }
  return out;
}

export function localDate(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

const humans = (s) => s.players.filter((p) => p.kind === 'human');
function award(career, ids, today) {
  const fresh = [];
  for (const id of ids) if (ACH_BY_ID[id] && !career.ach[id]) { career.ach[id] = today; fresh.push(id); }
  return fresh;
}

// The spaces a human gained from these events: bought, won at auction, or traded for.
function gained(s, events) {
  const out = [];
  for (const e of events) {
    if ((e.t === 'buy' || e.t === 'won') && s.players[e.pid]) out.push([e.pid, e.space]);
    else if (e.t === 'trade') { for (const i of e.give.lots) out.push([e.to, i]); for (const i of e.get.lots) out.push([e.from, i]); }
  }
  return out.filter(([pid]) => s.players[pid] && s.players[pid].kind === 'human');
}

// Achievements the table and the events of one action have just earned for any human baron.
export function playAchievements(career, s, events, today) {
  const ids = [], h = (pid) => s.players[pid] && s.players[pid].kind === 'human';
  for (const p of humans(s)) {
    if (p.stat.bought > 0) ids.push('first-lot');
    if (p.stat.rentIn > 0) ids.push('first-rent');
    if (p.stat.built > 0) ids.push('first-build');
    if ((p.stat.resorts || 0) > 0) ids.push('grand-resort');
    if ((p.stat.maxRentIn || 0) >= GOALS.bigRent) ids.push('big-rent');
  }
  for (const [pid, i] of gained(s, events)) {
    const sp = SPACES[i];
    if (sp.type === 'lot' && ownsDistrict(s, sp.d, pid)) ids.push('whole-district');
    if (isRow(i) && s.lots[i].owner === pid) ids.push('row-lease');
  }
  for (const e of events) {
    if (e.t === 'trade' && (h(e.from) || h(e.to))) ids.push('deal-maker');
    if (e.t === 'bankrupt' && e.to >= 0 && e.to !== e.pid && h(e.to)) ids.push('foreclosure');
  }
  return award(career, ids, today);
}

// What a finished game adds. Returns the new records, the achievements and the felts it earned. Called once per game
// (the game is marked) and only for a game with a human at the table: an AI-only game is not anyone's career.
export function recordGame(career, s, today) {
  const hs = humans(s);
  const res = { counted: false, records: [], earned: [], unlocked: [] };
  if (!s.ended || !hs.length) return res;
  res.counted = true;
  const winner = s.players[s.winner], won = !!winner && winner.kind === 'human';
  const mode = s.opts.mode === 'short' ? 'short' : 'full', variant = s.opts.variant === 'common' ? 'common' : 'standard';
  const ais = s.players.filter((p) => p.kind === 'ai');
  const order = ['easy', 'normal', 'hard'], top = ais.reduce((m, p) => (order.indexOf(p.level) > order.indexOf(m) ? p.level : m), 'easy');
  const level = ais.length ? (order.includes(top) ? top : 'normal') : 'none';
  const bump = (r) => { r.games++; if (won) r.wins++; };
  career.games++; if (won) career.wins++;
  bump(career.mode[mode]); bump(career.variant[variant]); bump(career.level[level]);
  for (const p of ais) if (career.persona[p.persona]) bump(career.persona[p.persona]);
  career.streak = won ? career.streak + 1 : 0;
  const better = (key, v, label) => { if (v > career[key]) { if (career[key] > 0) res.records.push(label); career[key] = v; } };
  if (career.streak > career.bestStreak) { if (career.bestStreak >= 2) res.records.push(`Longest winning run: ${career.streak} games`); career.bestStreak = career.streak; }
  const worth = Math.max(...hs.map((p) => (p.out ? 0 : netWorth(s, p.id))));
  better(mode === 'short' ? 'bestShort' : 'bestFull', worth, `${mode === 'short' ? 'Short' : 'Full'}-game net worth: $${worth.toLocaleString('en-US')}`);
  better('longest', s.monthsPlayed, `Longest game: ${s.monthsPlayed} months`);
  const rent = Math.max(...hs.map((p) => p.stat.maxRentIn || 0));
  better('biggestRent', rent, `Biggest single rent: $${rent.toLocaleString('en-US')}`);
  career.resorts += hs.reduce((n, p) => n + (p.stat.resorts || 0), 0);
  career.trades += hs.reduce((n, p) => n + p.stat.trades, 0);
  career.bankrupted += s.stats.bankruptcies.filter((b) => b.to >= 0 && s.players[b.to].kind === 'human' && b.to !== b.pid).length;

  const ids = [];
  if (won && mode === 'short') ids.push('win-short');
  if (won && mode === 'full') ids.push('win-full');
  if (won && variant === 'common') ids.push('win-common');
  if (won && ais.some((p) => p.level === 'hard')) ids.push('win-hard');
  if (s.monthsPlayed >= GOALS.longGame) ids.push('long-game');
  if (mode === 'full' && worth >= GOALS.purse) ids.push('purse');
  if (career.games >= GOALS.regular) ids.push('regular');
  if (career.wins >= GOALS.tenWins) ids.push('ten-wins');
  if (PERSONA_KEYS.every((k) => career.persona[k].wins > 0)) ids.push('all-barons');
  res.earned = award(career, ids, today);
  res.unlocked = unlockFelts(career, today);
  return res;
}

// Felts the record now qualifies for, added once and kept for good.
export function unlockFelts(career, today) {
  const out = [];
  for (const f of FELTS) if (f.id !== 'green' && !career.unlocked[f.id] && f.has(career)) { career.unlocked[f.id] = today; out.push(f.id); }
  return out;
}
