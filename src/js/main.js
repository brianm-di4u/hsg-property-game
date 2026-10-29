// Controller: scenes, presentation queue, AI pacing, dialogs, input, save/load and window.__game.
import { SPACES, DISTRICTS, DISTRICT_ORDER, LOTS_BY_D, MONTHS, PERSONAS, PERSONA_KEYS, TOKENS, CARD, RULES, isRow, OWNABLE } from './data.js';
import * as E from './engine.js';
import { aiAction } from './ai.js';
import * as R from './render.js';
import { audio, unlock, sfx } from './audio.js';
import { qs, esc, money, deedHtml, cardHtml, helpHtml, aboutHtml, lotLabel } from './ui.js';

const $ = qs;
const SAVE = 'hs-barons-save-v1', SETS = 'hs-barons-settings-v1';
const store = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
};

const G = {
  s: null, scene: 'title', back: null, settings: { sound: true, vol: 0.35, motion: 'system', text: 1, theme: 'auto', ai: 'normal' },
  queue: [], busy: false, anim: 0, aiTimer: 0, aiPaused: false, fast: false, waitingOk: false,
  dialog: null, dialogRender: null, nextSeed: null, lastSetup: null, helpTab: 'rules', setup: null, liveBuf: [], logSeen: 0,
};
window.__G = G;

// ---------- settings ----------
function loadSettings() { try { Object.assign(G.settings, JSON.parse(store.get(SETS) || '{}')); } catch (e) { /* defaults */ } applySettings(); }
function saveSettings() { store.set(SETS, JSON.stringify(G.settings)); applySettings(); }
function applySettings() {
  const st = G.settings;
  audio.on = !!st.sound; audio.vol = st.vol;
  document.documentElement.style.setProperty('--ts', st.text);
  const dark = st.theme === 'dark' || (st.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('theme-dark', dark);
  document.body.classList.toggle('reduce', reduced());
  R.view.theme = dark ? 'dark' : 'light'; R.view.cacheKey = '';
  const sb = $('#b-sound'); if (sb) { sb.innerHTML = soundIcon(st.sound); sb.setAttribute('aria-label', st.sound ? 'Sound on (click to mute)' : 'Sound off (click to unmute)'); }
  requestAnimationFrame(layout);
}
const reduced = () => G.settings.motion === 'reduce' || (G.settings.motion === 'system' && matchMedia('(prefers-reduced-motion: reduce)').matches);
const soundIcon = (on) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${on ? '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>' : '<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'}</svg>`;
const aiDelay = () => (G.fast ? 0 : ({ normal: 650, fast: 220, instant: 0 })[G.settings.ai] ?? 650);
const animOn = () => !G.fast && !reduced();

// ---------- layout and drawing ----------
const narrow = () => matchMedia('(max-width: 820px), (max-aspect-ratio: 1/1)').matches;
function layout() {
  if (G.scene !== 'game') return;
  const wrap = $('#boardwrap'), dpr = Math.min(3, window.devicePixelRatio || 1);
  let W, H;
  if (narrow()) {
    W = Math.min(window.innerWidth - 12, 640);
    const hh = (q) => { const e = $(q); return e ? e.offsetHeight : 0; };
    const panelNeed = Math.max(200, hh('#turnbar') + Math.max(hh('#actions'), 96) + hh('#players') + 12);
    H = Math.max(W, Math.min(W * 1.45, window.innerHeight - hh('#topbar') - panelNeed - 26));
    wrap.style.height = H + 'px';
  } else {
    wrap.style.height = '';
    const avail = Math.min(window.innerHeight - 24, window.innerWidth - 28 - 14 - 380);
    W = H = Math.max(300, avail);
  }
  if (Math.abs(R.view.W - W) > 0.5 || Math.abs(R.view.H - H) > 0.5 || R.view.dpr !== dpr) { R.resize(W, H, dpr); R.view.cacheKey = ''; }
  draw();
}
let drawQueued = false;
function draw() { if (drawQueued) return; drawQueued = true; requestAnimationFrame(() => { drawQueued = false; if (G.scene === 'game') R.draw(G.s); }); }

function animate(dur, fn) {
  if (!animOn() || dur <= 0) { fn(1); draw(); return Promise.resolve(); }
  G.anim++;
  return new Promise((res) => {
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      fn(p); R.draw(G.s);
      if (p < 1) requestAnimationFrame(tick); else { G.anim--; res(); }
    };
    requestAnimationFrame(tick);
  });
}
const sleep = (ms) => (ms > 0 && !G.fast ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

// ---------- live region and toasts ----------
function announce(t) { G.liveBuf.push(t); clearTimeout(announce.t); announce.t = setTimeout(() => { $('#live').textContent = G.liveBuf.slice(-4).join(' '); G.liveBuf = []; }, 60); }
function toast(t, ms = 1600) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), G.fast ? 300 : ms); }
function flushLog() {
  if (!G.s) return;
  const L = G.s.log, from = Math.max(0, Math.min(G.logSeen, L.length));
  const fresh = L.slice(from); G.logSeen = L.length;
  if (fresh.length) announce(fresh.join(' '));
  const ol = $('#log');
  ol.innerHTML = L.slice(-60).map((t) => `<li>${esc(t)}</li>`).join('');
  ol.scrollTop = ol.scrollHeight;
}

// ---------- performing actions ----------
function perform(action) {
  if (!G.s || G.s.ended && action.type !== 'noop') return { ok: false, error: 'no game' };
  const r = E.apply(G.s, action);
  if (!r.ok) { sfx('error'); return r; }
  // Keep moving tokens at their old place until their move animation runs.
  for (const e of r.events) if (e.t === 'move' && !R.view.tokens[e.pid]) R.view.tokens[e.pid] = R.slot(e.from, e.pid);
  if (r.events.some((e) => e.t === 'roll')) R.view.dice.pending = true;
  G.queue.push(...r.events);
  store.set(SAVE, JSON.stringify(G.s));
  pump();
  return { ok: true, events: r.events.length };
}

async function pump() {
  if (G.busy) return;
  G.busy = true;
  if (G.scene === 'game' && G.s) renderActions();
  while (G.queue.length) {
    const e = G.queue.shift();
    try { await present(e); } catch (err) { console.warn(err); }
  }
  G.busy = false;
  R.view.dice.pending = false;
  flushLog();
  refresh();
  schedule();
}

function pop(pid, amount) {
  if (!animOn() || pid == null || pid < 0 || !amount) return;
  const p = G.s.players[pid]; if (!p || p.out) return;
  const at = R.view.tokens[pid] || R.slot(p.pos, pid);
  R.view.pops.push({ x: at.x, y: at.y - R.tokenR() * 1.4, text: (amount > 0 ? '+' : '−') + money(Math.abs(amount)).replace('−', ''), good: amount > 0, t0: performance.now(), dur: 900 });
  if (!G.popLoop) { G.popLoop = true; G.anim++; const tick = () => { R.draw(G.s); if (R.view.pops.length) requestAnimationFrame(tick); else { G.popLoop = false; G.anim--; } }; requestAnimationFrame(tick); }
}

async function present(e) {
  const s = G.s, P = (id) => s.players[id];
  switch (e.t) {
    case 'roll': {
      sfx('dice');
      const [a, b] = e.dice;
      await animate(480, (p) => { R.view.dice.tumbling = p < 1; R.view.dice.spin = (1 - p) * 6 * p; if (p < 1) { R.view.dice.a = 1 + ((Math.random() * 6) | 0); R.view.dice.b = 1 + ((Math.random() * 6) | 0); } else { R.view.dice.a = a; R.view.dice.b = b; } });
      R.view.dice.tumbling = false; R.view.dice.a = a; R.view.dice.b = b;
      break;
    }
    case 'move': {
      const k = e.pid;
      if (e.jump || e.steps <= 0) {
        const from = R.view.tokens[k] || R.slot(e.from, k), to = R.slot(e.to, k);
        await animate(e.steps === 0 && e.to === e.from ? 0 : 380, (p) => { R.view.tokens[k] = { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p, lift: Math.sin(p * Math.PI) * 20 }; });
      } else {
        const per = Math.min(150, 1500 / e.steps);
        for (let st = 0; st < e.steps; st++) {
          const a = (e.from + st) % 32, b = (e.from + st + 1) % 32, A = R.slot(a, k), B = R.slot(b, k);
          await animate(per, (p) => { R.view.tokens[k] = { x: A.x + (B.x - A.x) * p, y: A.y + (B.y - A.y) * p, lift: Math.sin(p * Math.PI) * R.tokenR() * 0.8 }; });
          if (animOn()) sfx('step');
        }
      }
      R.view.tokens[k] = undefined;
      R.view.flash = e.to; draw();
      break;
    }
    case 'land': R.view.flash = e.space; draw(); break;
    case 'paid': if (e.why === 'rent') { pop(e.from, -e.amount); pop(e.to, e.amount); } else pop(e.from, -e.amount); break;
    case 'payday': pop(e.pid, e.amount - e.ground); sfx('coin'); toast(`${P(e.pid).name}: Payday +${money(e.amount - e.ground)}`); break;
    case 'rent': sfx('pay'); toast(`${P(e.from).name} pays ${money(e.amount)} rent`); await sleep(250); break;
    case 'buy': sfx('coin'); toast(`${P(e.pid).name} buys ${SPACES[e.space].name}`); break;
    case 'won': sfx('gavel'); toast(`${P(e.pid).name} wins ${SPACES[e.space].name} for ${money(e.amount)}`); await sleep(350); break;
    case 'unsold': toast(`No bids for ${SPACES[e.space].name}`); break;
    case 'bid': sfx('bid'); refreshDialog(); await sleep(150); break;
    case 'build': sfx('build'); break;
    case 'burn': sfx('bust'); break;
    case 'jury': sfx('gavel'); toast(`${P(e.pid).name} is held for the Grand Jury`); await sleep(300); break;
    case 'card': await showCard(e); break;
    case 'month': toast(`${MONTHS[e.month]}, Year ${e.year + 1}`); break;
    case 'trade': sfx('coin'); toast('Trade accepted'); break;
    case 'declined': toast(`${P(e.to).name} declines the offer`); break;
    case 'bankrupt': sfx('bust'); toast(`${P(e.pid).name} is bankrupt`, 2400); await sleep(500); break;
    case 'dividend': sfx('coin'); toast(`Common dividend: ${money(e.amount)} each`); break;
    case 'over': sfx('fanfare'); await sleep(700); G.waitingOk = false; closeDialog(true); scene('over'); break;
  }
}

async function showCard(e) {
  sfx('card');
  const s = G.s, news = e.deck === 'news';
  const humanTable = s.players.some((p) => p.kind === 'human' && !p.out);
  const who = e.pid != null ? s.players[e.pid] : null;
  const next = s.players[E.actor(s)] || null;
  const needOk = humanTable && !G.fast && (news ? next && next.kind === 'human' : who && who.kind === 'human');
  openDialog(`${cardHtml(e.id, s, who && who.name)}<div class="btns"><button class="btn primary" data-ok>OK</button></div>`, { name: 'card', closable: true });
  if (needOk) {
    G.waitingOk = true;
    await new Promise((res) => { G.cardDone = res; });
    G.waitingOk = false;
  } else {
    await sleep(humanTable ? (G.settings.ai === 'normal' ? 2200 : 900) : 600);
    if (G.dialog === 'card') closeDialog(true);
  }
}

// AI pacing: when nothing is presenting, let an AI act after a short delay.
function schedule() {
  clearTimeout(G.aiTimer); G.aiTimer = 0;
  const s = G.s;
  if (!s || s.ended || G.scene !== 'game' || G.busy || G.aiPaused) return;
  const a = E.actor(s);
  if (a < 0 || s.players[a].kind !== 'ai') return;
  if (G.dialog && G.dialog !== 'auction' && G.dialog !== 'deed') return;
  G.aiTimer = setTimeout(() => { G.aiTimer = 0; if (G.busy || !G.s || G.s.ended || G.aiPaused) return; const act = aiAction(G.s); if (act) { const r = perform(act); if (!r.ok) { console.warn('AI action failed', act, r.error); perform({ type: legalFallback() }); } } }, aiDelay());
}
function legalFallback() { const L = E.legal(G.s); return (L.find((a) => ['end', 'roll', 'pass', 'decline', 'bankrupt'].includes(a.type)) || L[0]).type; }

// ---------- game HUD ----------
function humanActor() { const s = G.s; if (!s || s.ended) return null; const a = E.actor(s); return a >= 0 && s.players[a].kind === 'human' ? s.players[a] : null; }
const can = (type) => G.s && E.legal(G.s).some((a) => a.type === type);

function refresh() {
  const s = G.s;
  if (!s || G.scene !== 'game') return;
  // clock
  const sea = E.seasonsNow(s);
  $('#clock').innerHTML = `<div class="month">${MONTHS[s.month]} · Year ${s.year + 1}${s.opts.mode === 'short' ? ` · month ${Math.min(12, s.monthsPlayed + 1)} of 12` : s.opts.years ? ` · ${s.opts.years}-year game` : ''}</div><div class="seasons">${sea.map((x) => { const up = Object.values(x.d).some((m) => m > 1); return `<span class="chip ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${esc(x.name)}</span>`; }).join('') || '<span class="chip">Off season</span>'}</div>`;
  // turn bar
  const a = s.ended ? s.winner : E.actor(s), A = s.players[a];
  const sub = s.ended ? 'Game over' : s.phase === 'auction' ? `Auction: ${SPACES[s.pending.space].name}` : s.phase === 'trade' ? `Considering ${s.players[s.pending.from].name}'s offer` : s.phase === 'debt' ? `Owes ${money(s.debts[0].amount)}: must raise cash` : s.phase === 'buy' ? `Landed on ${SPACES[s.pending.space].name} (${money(SPACES[s.pending.space].price)})` : A.held && s.phase === 'roll' ? 'Held in the Grand Jury Room' : s.phase === 'roll' ? (s.players[s.turn].doubles ? 'Doubles! Roll again' : 'To roll') : 'Moved: manage, trade or end the turn';
  const tb = $('#turnbar'); tb.innerHTML = '';
  tb.append(R.tokenCanvas(A.token, 36, a + 1));
  const w = document.createElement('div'); w.className = 'who';
  w.innerHTML = `${esc(A.name)}${A.kind === 'ai' ? ` <span class="sub" style="display:inline">(${esc(PERSONAS[A.persona].name)} AI)</span>` : ''}<span class="sub">${esc(sub)}</span>`;
  tb.append(w);
  const cash = document.createElement('div'); cash.innerHTML = `<strong>${money(A.cash)}</strong>`; tb.append(cash);
  renderActions();
  renderPlayers();
  // dialogs driven by phase
  const h = humanActor();
  if (!G.busy) {
    if (s.phase === 'auction' && G.dialog !== 'auction' && G.dialog !== 'card') openAuction();
    else if (s.phase !== 'auction' && G.dialog === 'auction') closeDialog(true);
    if (s.phase === 'trade' && h && G.dialog !== 'incoming' && G.dialog !== 'card') openIncoming();
    if (s.phase !== 'trade' && G.dialog === 'incoming') closeDialog(true);
    if (s.phase === 'debt' && h && G.dialog !== 'debt' && G.dialog !== 'card') openDebt();
    if (s.phase !== 'debt' && G.dialog === 'debt') closeDialog(true);
  }
  refreshDialog();
  if (narrow()) layout(); else draw();
}

function btn(label, key, onClick, cls = '', disabled = false, aria) {
  const b = document.createElement('button'); b.className = 'btn ' + cls; b.type = 'button';
  b.innerHTML = `${label}${key ? ` <kbd aria-hidden="true">${key}</kbd>` : ''}`;
  if (aria || key) b.setAttribute('aria-label', aria || `${label.replace(/<[^>]+>/g, '')} (${key})`);
  if (key) b.dataset.key = key;
  b.disabled = disabled; b.addEventListener('click', () => { unlock(); onClick(); });
  return b;
}

function renderActions() {
  const s = G.s, el = $('#actions'); el.innerHTML = '';
  const h = humanActor();
  if (!h) {
    const note = document.createElement('span'); note.className = 'ai-note';
    note.textContent = s.ended ? 'Game over.' : `${s.players[E.actor(s)].name} is thinking…`;
    el.append(note);
    return;
  }
  const busy = G.busy;
  const p = s.phase;
  if (p === 'roll') {
    const P0 = s.players[s.turn];
    if (P0.held) {
      el.append(btn('Roll for doubles', 'R', () => perform({ type: 'roll' }), 'primary', busy));
      el.append(btn(`Pay ${money(RULES.bail)}`, 'B', () => perform({ type: 'bail' }), '', busy || !can('bail')));
      if (P0.pardons) el.append(btn('Use Pardon', '', () => perform({ type: 'pardon' }), '', busy));
    } else el.append(btn('Roll', 'R', () => perform({ type: 'roll' }), 'primary', busy));
    el.append(btn('Manage', 'M', () => openManage(), '', busy), btn('Trade', 'T', () => openTrade(), '', busy));
  } else if (p === 'buy') {
    const i = s.pending.space;
    el.append(btn(`Buy ${money(SPACES[i].price)}`, 'B', () => perform({ type: 'buy' }), 'primary', busy || h.cash < SPACES[i].price));
    el.append(btn('Auction', 'A', () => perform({ type: 'decline' }), '', busy));
    el.append(btn('Deed', '', () => openDeed(i), 'ghost', false, `Read the deed for ${SPACES[i].name}`));
  } else if (p === 'post') {
    el.append(btn(s.again ? 'Roll again' : 'End turn', 'E', () => perform({ type: 'end' }), 'primary', busy));
    el.append(btn('Manage', 'M', () => openManage(), '', busy), btn('Trade', 'T', () => openTrade(), '', busy));
  } else if (p === 'auction') el.append(btn('Open auction', '', () => openAuction(), 'primary'));
  else if (p === 'debt') el.append(btn('Raise cash', '', () => openDebt(), 'primary'));
  else if (p === 'trade') el.append(btn('Review offer', '', () => openIncoming(), 'primary'));
}

function renderPlayers() {
  const s = G.s, ol = $('#players'); ol.innerHTML = '';
  for (const p of s.players) {
    const li = document.createElement('li');
    li.className = (p.id === s.turn ? 'now ' : '') + (p.out ? 'out' : '');
    li.append(R.tokenCanvas(p.token, 34, p.id + 1));
    const d = document.createElement('div'); d.className = 'pinfo';
    const n = E.owned(s, p.id).length;
    d.innerHTML = `<span class="nm">${esc(p.name)}</span><span class="cash">${p.out ? 'Bankrupt' : money(p.cash)}</span><span class="meta">${p.kind === 'ai' ? esc(PERSONAS[p.persona].name) + ' AI' : 'Human'} · ${n} lot${n === 1 ? '' : 's'} · worth ${money(E.netWorth(s, p.id))}${p.held ? ' · held' : ''}${p.pardons ? ' · pardon' : ''}</span>`;
    li.append(d);
    li.setAttribute('aria-label', `${p.name}${p.id === s.turn ? ', current turn' : ''}: ${p.out ? 'bankrupt' : money(p.cash) + ' cash, ' + n + ' lots, net worth ' + money(E.netWorth(s, p.id))}`);
    ol.append(li);
  }
}

// ---------- dialogs ----------
function openDialog(html, opts = {}) {
  const m = $('#modal');
  G.dialog = opts.name || 'dialog'; G.dialogRender = opts.render || null; G.dialogClosable = opts.closable !== false; G.onClose = opts.onClose || null;
  m.innerHTML = `<div class="dlg${animOn() ? ' anim' : ''}" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${html}</div>`;
  m.hidden = false;
  if (animOn()) { G.dlgAnim = true; const d = m.querySelector('.dlg'); d.addEventListener('animationend', () => { G.dlgAnim = false; }, { once: true }); setTimeout(() => { G.dlgAnim = false; }, 400); }
  wireDialog();
  const f = m.querySelector('[data-ok], .btn.primary, button, input, select');
  if (f) f.focus({ preventScroll: true });
}
function wireDialog() {
  const m = $('#modal');
  m.querySelectorAll('[data-ok]').forEach((b) => b.addEventListener('click', () => closeDialog()));
  m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeDialog()));
}
function closeDialog(force) {
  if (!G.dialog) return;
  if (!force && !G.dialogClosable) return;
  const was = G.dialog;
  G.dialog = null; G.dialogRender = null;
  const m = $('#modal'); m.hidden = true; m.innerHTML = '';
  if (was === 'card' && G.cardDone) { const d = G.cardDone; G.cardDone = null; d(); }
  if (G.onClose) { const f = G.onClose; G.onClose = null; f(); }
  if (G.scene === 'game') { const k = document.querySelector('#actions .btn.primary'); if (k) k.focus({ preventScroll: true }); }
  schedule();
}
function refreshDialog() {
  if (!G.dialogRender) return;
  const m = $('#modal'), active = document.activeElement, key = active && active.dataset ? active.dataset.f : null;
  const box = m.querySelector('.dlg'), top = box ? box.scrollTop : 0;
  m.querySelector('.dlg').innerHTML = G.dialogRender();
  wireDialog();
  if (box) box.scrollTop = top;
  const back = key && m.querySelector(`[data-f="${key}"]`);
  if (back && !back.disabled) back.focus({ preventScroll: true }); else { const f = m.querySelector('.btn.primary:not(:disabled), button:not(:disabled)'); if (f && !m.contains(document.activeElement)) f.focus({ preventScroll: true }); }
}

function openDeed(i) {
  openDialog(`${deedHtml(G.s, i)}<div class="btns"><button class="btn primary" data-ok>Close</button></div>`, { name: 'deed' });
  R.view.cursor = i; draw();
}

function openPause() {
  if (!G.s) return;
  openDialog(`<h2 id="dlg-title">Menu</h2><div class="menu">
    <button class="btn primary" data-ok>Resume</button>
    <button class="btn" data-go="help">How to play</button>
    <button class="btn" data-go="settings">Settings</button>
    <button class="btn" data-go="title">Save and quit to title</button></div>`, { name: 'pause' });
  $('#modal').querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { const to = b.dataset.go; closeDialog(true); G.back = 'game'; scene(to); }));
}

// Manage: build, sell, mortgage, lift for the human who may act.
function manageRender(debt) {
  const s = G.s;
  if (!s || s.ended || (debt && s.phase !== 'debt')) return '<p>Settled.</p>';
  const a = E.actor(s), p = s.players[a], L = E.legal(s);
  const has = (t, i) => L.some((x) => x.type === t && x.space === i);
  const mine = E.owned(s, a);
  const groups = [...DISTRICT_ORDER.map((d) => [DISTRICTS[d].name, LOTS_BY_D[d]]), ['Lines and utility', OWNABLE.filter((i) => SPACES[i].type !== 'lot')]]
    .map(([n, ids]) => [n, ids.filter((i) => mine.includes(i))]).filter(([, ids]) => ids.length);
  const rows = groups.map(([n, ids]) => `<h3>${esc(n)}</h3><ul class="mlist">${ids.map((i) => {
    const lot = s.lots[i], sp = SPACES[i];
    const st = lot.mortgaged ? 'mortgaged' : lot.level === 4 ? 'Grand Resort' : lot.level ? `${lot.level} bathhouse${lot.level > 1 ? 's' : ''}` : 'no buildings';
    return `<li><span class="lname">${lotLabel(i)} <span class="fine">· ${st} · rent ${money(E.rentOf(s, i, 7))}</span></span>
      ${!debt ? `<button class="btn" data-f="b${i}" data-act="build" data-i="${i}" ${has('build', i) ? '' : 'disabled'}>Build ${money(E.buildCost(i))}</button>` : ''}
      <button class="btn" data-f="s${i}" data-act="sell" data-i="${i}" ${has('sell', i) ? '' : 'disabled'}>Sell +${money(Math.floor(E.buildCost(i) * RULES.sellRate * (lot.level === 4 ? 4 : 1)))}</button>
      ${lot.mortgaged ? `<button class="btn" data-f="u${i}" data-act="unmortgage" data-i="${i}" ${has('unmortgage', i) ? '' : 'disabled'}>Lift −${money(E.unmortgageCost(i))}</button>`
        : `<button class="btn" data-f="m${i}" data-act="mortgage" data-i="${i}" ${has('mortgage', i) ? '' : 'disabled'}>Mortgage +${money(sp.price / 2)}</button>`}</li>`;
  }).join('')}</ul>`).join('');
  const head = debt ? `<h2 id="dlg-title">Raise cash</h2><p><strong>${esc(p.name)}</strong> owes <strong>${money(s.debts[0].amount)}</strong>${s.debts[0].to >= 0 ? ` to ${esc(s.players[s.debts[0].to].name)}` : ''} and has <strong>${money(p.cash)}</strong>. Sell bathhouses or mortgage lots; the debt is paid as soon as you have enough.</p>`
    : `<h2 id="dlg-title">Manage lots · ${money(p.cash)}</h2><p class="fine">Build on districts you own outright (one level per lot per turn). Selling returns half the cost.</p>`;
  return `${head}${rows || '<p>No lots yet.</p>'}<div class="btns">${debt ? `<button class="btn" data-f="bk" data-act="bankrupt">Declare bankruptcy</button>` : `<button class="btn primary" data-ok>Done</button>`}</div>`;
}
function wireManage() {
  $('#modal').addEventListener('click', onManageClick);
}
function onManageClick(ev) {
  const b = ev.target.closest('[data-act]'); if (!b || !G.dialog || (G.dialog !== 'manage' && G.dialog !== 'debt')) return;
  const t = b.dataset.act;
  if (t === 'bankrupt') { if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirm bankruptcy'; b.classList.add('primary'); return; } perform({ type: 'bankrupt' }); return; }
  perform({ type: t, space: +b.dataset.i });
}
function openManage() { if (!humanActor() || !(can('build') || can('sell') || can('mortgage') || can('unmortgage') || can('end') || can('roll'))) return; openDialog(manageRender(false), { name: 'manage', render: () => manageRender(false) }); }
function openDebt() { openDialog(manageRender(true), { name: 'debt', closable: false, render: () => manageRender(true) }); }

// Auction
function auctionRender() {
  const s = G.s;
  if (!s.pending || s.pending.kind !== 'auction') return '<p>The auction is over.</p>';
  const A = s.pending, sp = SPACES[A.space], a = E.actor(s), bidder = s.players[a], human = bidder.kind === 'human';
  const min = A.bid > 0 ? A.bid + RULES.minBid : A.min;
  const rows = A.order.map((q) => { const P = s.players[q]; return `<li>${esc(P.name)} <span class="fine">${money(P.cash)}</span> — ${A.out.includes(q) ? 'out' : q === A.leader ? '<strong>high bid</strong>' : q === a ? '<strong>bidding…</strong>' : 'in'}</li>`; }).join('');
  const steps = [0, 40, 90].map((d) => min + d);
  return `<h2 id="dlg-title">${isRow(A.space) ? 'Lease auction' : 'Auction'}: ${esc(sp.name)}</h2>
    <p class="fine">Game price ${money(sp.price)}${isRow(A.space) ? ` · federal lease, opening at ${money(A.min)}` : ''}</p>
    <p>High bid: <span class="bidbig">${A.bid ? money(A.bid) : '—'}</span> ${A.leader >= 0 ? `by <strong>${esc(s.players[A.leader].name)}</strong>` : ''}</p>
    <ul class="mlist">${rows}</ul>
    ${human ? `<p><strong>${esc(bidder.name)}</strong>, your bid (cash ${money(bidder.cash)}):</p><div class="btns" style="justify-content:flex-start">
      ${steps.map((v, k) => `<button class="btn ${k === 0 ? 'primary' : ''}" data-f="bid${k}" data-bid="${v}" ${v > bidder.cash ? 'disabled' : ''}>Bid ${money(v)}</button>`).join('')}
      <button class="btn" data-f="pass" data-pass>Drop out</button></div>`
    : `<p class="ai-note">${esc(bidder.name)} is deciding…</p>`}
    <div class="btns"><button class="btn ghost" data-f="deed" data-deed="${A.space}">Deed</button></div>`;
}
function openAuction() { if (G.s.phase !== 'auction') return; openDialog(auctionRender(), { name: 'auction', closable: false, render: auctionRender }); }

// Trade: compose (human proposer)
function openTrade(to) {
  const s = G.s, me = humanActor(); if (!me || !can('propose')) return;
  const others = s.players.filter((p) => p.id !== me.id && !p.out);
  if (!others.length) return;
  const st = { to: to ?? others[0].id, give: new Set(), get: new Set(), giveCash: 0, getCash: 0, err: '' };
  G.trade = st;
  const render = () => {
    const P = s.players[st.to];
    const list = (pid, set, side) => E.owned(s, pid).filter((i) => E.tradeable(s, i)).map((i) => `<label class="chk"><input type="checkbox" data-side="${side}" data-i="${i}" data-f="${side}${i}" ${set.has(i) ? 'checked' : ''}> ${lotLabel(i)}${s.lots[i].mortgaged ? ' <span class="fine">(mortgaged)</span>' : ''}</label>`).join('') || '<p class="fine">Nothing tradeable.</p>';
    return `<h2 id="dlg-title">Propose a trade</h2>
      <div class="row"><label>Trade with <select data-f="to" data-to>${others.map((p) => `<option value="${p.id}" ${p.id === st.to ? 'selected' : ''}>${esc(p.name)}${p.kind === 'ai' ? ' (AI)' : ''}</option>`).join('')}</select></label></div>
      <div class="tradecols"><div><h3>You give</h3>${list(me.id, st.give, 'give')}<label class="chk">Cash $<input type="number" min="0" step="10" max="${me.cash}" value="${st.giveCash}" data-f="gc" data-cash="give" style="width:110px"></label></div>
      <div><h3>You get from ${esc(P.name)}</h3>${list(st.to, st.get, 'get')}<label class="chk">Cash $<input type="number" min="0" step="10" max="${P.cash}" value="${st.getCash}" data-f="tc" data-cash="get" style="width:110px"></label></div></div>
      ${st.err ? `<p role="alert" style="color:var(--danger);font-weight:700">${esc(st.err)}</p>` : ''}
      <p class="fine">Lots in districts with buildings can't be traded. Mortgaged lots keep their mortgage.</p>
      <div class="btns"><button class="btn" data-f="cancel" data-ok>Cancel</button><button class="btn primary" data-f="propose" data-propose>Propose</button></div>`;
  };
  openDialog(render(), { name: 'trade', render });
  const m = $('#modal');
  const onChange = (ev) => {
    const t = ev.target;
    if (t.dataset.to != null) { st.to = +t.value; st.get.clear(); st.getCash = 0; refreshDialog(); }
    else if (t.dataset.side) { const set = t.dataset.side === 'give' ? st.give : st.get; t.checked ? set.add(+t.dataset.i) : set.delete(+t.dataset.i); }
    else if (t.dataset.cash) { const v = Math.max(0, Math.floor(+t.value || 0)); if (t.dataset.cash === 'give') st.giveCash = v; else st.getCash = v; }
  };
  m.onchange = onChange; m.oninput = (ev) => { if (ev.target.dataset.cash) onChange(ev); };
}
function submitTrade() {
  const st = G.trade, me = humanActor(); if (!st || !me) return;
  const act = { type: 'propose', to: st.to, give: { lots: [...st.give], cash: st.giveCash }, get: { lots: [...st.get], cash: st.getCash } };
  const err = E.validateOffer(G.s, me.id, act);
  if (err) { st.err = err.charAt(0).toUpperCase() + err.slice(1) + '.'; sfx('error'); refreshDialog(); return; }
  closeDialog(true); $('#modal').onchange = null; $('#modal').oninput = null;
  perform(act);
}

// Trade: incoming (human recipient)
function incomingRender() {
  const s = G.s; if (!s.pending || s.pending.kind !== 'trade') return '<p>No offer.</p>';
  const o = s.pending, F = s.players[o.from], T = s.players[o.to];
  const side = (x) => [...x.lots.map((i) => `<li>${lotLabel(i)}</li>`), x.cash ? `<li>${money(x.cash)} cash</li>` : ''].join('') || '<li>Nothing</li>';
  const hot = F.kind === 'human';
  return `<h2 id="dlg-title">Offer for ${esc(T.name)}</h2>${hot ? `<p><strong>Pass the device to ${esc(T.name)}.</strong></p>` : ''}
    <p><strong>${esc(F.name)}</strong> offers:</p><div class="tradecols"><div><h3>You receive</h3><ul>${side(o.give)}</ul></div><div><h3>You give</h3><ul>${side(o.get)}</ul></div></div>
    <div class="btns"><button class="btn" data-f="dec" data-resp="0">Decline</button><button class="btn primary" data-f="acc" data-resp="1">Accept</button></div>`;
}
function openIncoming() { openDialog(incomingRender(), { name: 'incoming', closable: false, render: incomingRender }); }

// Global delegated clicks inside the modal.
function onModalClick(ev) {
  const t = ev.target.closest('button'); if (!t) return;
  unlock();
  if (t.dataset.bid) perform({ type: 'bid', amount: +t.dataset.bid });
  else if (t.dataset.pass != null) perform({ type: 'pass' });
  else if (t.dataset.resp != null) perform({ type: 'respond', accept: t.dataset.resp === '1' });
  else if (t.dataset.propose != null) submitTrade();
  else if (t.dataset.deed) { const i = +t.dataset.deed; const back = G.dialog; closeDialog(true); openDialog(`${deedHtml(G.s, i)}<div class="btns"><button class="btn primary" data-ok>Back</button></div>`, { name: 'deed', onClose: () => { if (back === 'auction') openAuction(); } }); }
}

// ---------- scenes ----------
function scene(name) {
  G.scene = name;
  const scr = $('#screen'), app = $('#app');
  if (name !== 'game') { clearTimeout(G.aiTimer); G.aiTimer = 0; const tt = $('#toast'); tt.style.transition = 'none'; tt.classList.remove('show'); void tt.offsetWidth; tt.style.transition = ''; }
  if (name === 'game') {
    if (!G.s) return scene('title');
    scr.innerHTML = ''; app.hidden = false;
    layout(); refresh(); flushLog(); schedule();
    const f = document.querySelector('#actions .btn.primary'); if (f) f.focus({ preventScroll: true });
    return;
  }
  app.hidden = true; closeDialog(true);
  scr.scrollTop = 0;
  if (name === 'title') screenTitle(scr);
  else if (name === 'setup') screenSetup(scr);
  else if (name === 'help') screenHelp(scr);
  else if (name === 'settings') screenSettings(scr);
  else if (name === 'about') screenAbout(scr);
  else if (name === 'over') screenOver(scr);
  const h = scr.querySelector('h1, h2'); if (h) { h.tabIndex = -1; }
  const f = scr.querySelector('.btn.primary, .btn'); if (f) f.focus({ preventScroll: true });
}

function hasSave() { try { const s = JSON.parse(store.get(SAVE) || 'null'); return s && s.v === E.VERSION && !s.ended ? s : null; } catch (e) { return null; } }

function screenTitle(scr) {
  const save = hasSave();
  scr.innerHTML = `<div class="wrap title-hero"><canvas id="titleart" width="1120" height="420" aria-hidden="true"></canvas>
    <h1>Bathhouse Barons</h1><p class="lede">Lease the bathhouses, build grand resorts and ride the seasons of Hot Springs, Arkansas.</p>
    <div class="menu"><button class="btn primary" data-go="setup">New game</button>
    <button class="btn" data-go="continue" ${save ? '' : 'disabled'}>Continue${save ? ` (${MONTHS[save.month]}, Year ${save.year + 1})` : ''}</button>
    <button class="btn" data-go="help">How to play</button><button class="btn" data-go="settings">Settings</button><button class="btn" data-go="about">About</button></div>
    <p class="fine" style="margin-top:18px">An original game for 2–6 barons, human or AI. Real places appear as setting and history only.</p></div>`;
  drawTitleArt($('#titleart'));
  scr.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
    unlock();
    const g = b.dataset.go; G.back = 'title';
    if (g === 'continue') { const sv = hasSave(); if (sv) { loadGame(sv); scene('game'); } }
    else scene(g);
  }));
}

function drawTitleArt(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height, dark = R.view.theme === 'dark';
  const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, dark ? '#1F1C2E' : '#F6E9C8'); sky.addColorStop(1, dark ? '#14121F' : '#E6D7B5');
  x.fillStyle = sky; x.fillRect(0, 0, W, H);
  x.fillStyle = dark ? '#2A3B30' : '#6E8B5A'; x.beginPath(); x.moveTo(0, H * 0.55); x.bezierCurveTo(W * 0.25, H * 0.2, W * 0.55, H * 0.25, W * 0.7, H * 0.4); x.bezierCurveTo(W * 0.85, H * 0.5, W * 0.95, H * 0.35, W, H * 0.42); x.lineTo(W, H); x.lineTo(0, H); x.fill();
  // lattice tower on the ridge
  x.strokeStyle = dark ? '#8A8590' : '#5A4C38'; x.lineWidth = 3; x.beginPath(); x.moveTo(W * 0.43, H * 0.3); x.lineTo(W * 0.45, H * 0.06); x.lineTo(W * 0.47, H * 0.3); x.moveTo(W * 0.435, H * 0.2); x.lineTo(W * 0.465, H * 0.2); x.stroke(); x.fillRect(W * 0.44, H * 0.05, W * 0.02, H * 0.03);
  // a row of original bathhouse facades
  const fac = [['#E6D7B5', 'hip'], ['#C9A97A', 'tower'], ['#F2EFE8', 'dome'], ['#E6D7B5', 'flat'], ['#D8C49A', 'tower'], ['#A9432C', 'hip'], ['#F2EFE8', 'flat']];
  const bw = W / fac.length, base = H * 0.92;
  fac.forEach(([col, roof], k) => {
    const x0 = k * bw + bw * 0.06, w = bw * 0.88, h = H * (0.36 + (k % 3) * 0.05);
    x.fillStyle = col; x.fillRect(x0, base - h, w, h); x.strokeStyle = '#5A4C38'; x.lineWidth = 2; x.strokeRect(x0, base - h, w, h);
    x.fillStyle = '#A9432C';
    if (roof === 'hip') { x.beginPath(); x.moveTo(x0 - 6, base - h); x.lineTo(x0 + w / 2, base - h - h * 0.3); x.lineTo(x0 + w + 6, base - h); x.fill(); }
    if (roof === 'dome') { x.fillStyle = '#C46A3E'; x.beginPath(); x.arc(x0 + w / 2, base - h, w * 0.32, Math.PI, 0); x.fill(); x.fillStyle = '#4E7D5B'; x.fillRect(x0 + w / 2 - 5, base - h - w * 0.32 - 14, 10, 14); }
    if (roof === 'tower') { x.fillStyle = col; x.fillRect(x0, base - h - 30, w * 0.22, 30); x.fillRect(x0 + w * 0.78, base - h - 30, w * 0.22, 30); x.strokeRect(x0, base - h - 30, w * 0.22, 30); x.strokeRect(x0 + w * 0.78, base - h - 30, w * 0.22, 30); }
    if (roof === 'flat') { x.fillStyle = '#5A4C38'; x.fillRect(x0 - 3, base - h - 8, w + 6, 8); }
    x.fillStyle = dark ? '#4FC3FF' : '#2B4C9B';
    for (let r = 0; r < 2; r++) for (let cI = 0; cI < 3; cI++) x.fillRect(x0 + w * (0.14 + cI * 0.29), base - h + h * (0.2 + r * 0.38), w * 0.14, h * 0.22);
    x.fillStyle = '#4E7D5B'; x.fillRect(x0 + w * 0.4, base - h * 0.28, w * 0.2, h * 0.28);
  });
  x.fillStyle = dark ? '#3A3550' : '#9C8B6B'; x.fillRect(0, base, W, H - base);
  // steam
  x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 5; x.lineCap = 'round';
  for (let k = 0; k < 6; k++) { const sx = W * (0.1 + k * 0.16); x.beginPath(); x.moveTo(sx, base); x.bezierCurveTo(sx - 20, base - 30, sx + 20, base - 50, sx, base - 80); x.stroke(); }
}

const DEFAULT_SEATS = () => [
  { kind: 'human', name: 'Player 1', persona: 'random' },
  { kind: 'ai', name: '', persona: 'hotelier' },
  { kind: 'ai', name: '', persona: 'speculator' },
  { kind: 'ai', name: '', persona: 'banker' },
];
function screenSetup(scr) {
  const st = G.setup || (G.setup = { seats: DEFAULT_SEATS(), mode: 'full', variant: 'standard', years: 0, seed: '' });
  const seg = (key, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-seg="${key}" data-v="${v}" aria-pressed="${st[key] === v}">${l}</button>`).join('')}</div>`;
  scr.innerHTML = `<div class="wrap"><h2>New game</h2>
    <div class="card"><h3 style="margin-top:0">Barons (${st.seats.length} of 6)</h3><div id="seats">${st.seats.map((p, k) => `<div class="seat" data-k="${k}"><span class="tk"></span>
      <div class="seg" role="group" aria-label="Seat ${k + 1} player type"><button type="button" data-kind="human" data-k="${k}" aria-pressed="${p.kind === 'human'}">Human</button><button type="button" data-kind="ai" data-k="${k}" aria-pressed="${p.kind === 'ai'}">AI</button></div>
      <input type="text" aria-label="Seat ${k + 1} name" data-name="${k}" value="${esc(p.name)}" placeholder="${p.kind === 'ai' ? esc(PERSONAS[p.persona]?.who || 'AI baron') : 'Name'}" maxlength="18">
      <select class="persona" aria-label="Seat ${k + 1} AI personality" data-persona="${k}" ${p.kind === 'ai' ? '' : 'disabled'}><option value="random">Random personality</option>${PERSONA_KEYS.map((x) => `<option value="${x}" ${p.persona === x ? 'selected' : ''}>${PERSONAS[x].name}: ${PERSONAS[x].blurb}</option>`).join('')}</select>
      <button type="button" class="iconbtn" data-rm="${k}" aria-label="Remove seat ${k + 1}" ${st.seats.length <= 2 ? 'disabled' : ''}>✕</button></div>`).join('')}</div>
      <button type="button" class="btn" data-add ${st.seats.length >= 6 ? 'disabled' : ''} style="margin-top:8px">Add a baron</button></div>
    <div class="card"><div class="row" style="gap:18px;align-items:flex-start">
      <div><strong>Game length</strong><br>${seg('mode', [['full', 'Full game'], ['short', 'Short game (12 months)']])}</div>
      <label>Year limit (full game)<select data-years ${st.mode === 'short' ? 'disabled' : ''}>${[[0, 'No limit'], [1, '1 year'], [2, '2 years'], [3, '3 years'], [5, '5 years']].map(([v, l]) => `<option value="${v}" ${+st.years === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div><strong>Rules</strong><br>${seg('variant', [['standard', 'Standard'], ['common', 'Common Ground']])}</div>
      <label>Seed (optional)<input type="number" data-seed value="${esc(st.seed)}" placeholder="random" style="width:130px"></label></div>
      <p class="fine">Common Ground: base rent, fares, the utility and taxes feed a public treasury that pays everyone a dividend each month (inspired by the public-domain Landlord's Game, 1904).</p></div>
    <div class="row"><button type="button" class="btn ghost" data-back>Back</button><button type="button" class="btn primary" data-start>Start the game</button></div></div>`;
  scr.querySelectorAll('.seat').forEach((row, k) => row.querySelector('.tk').append(R.tokenCanvas(k, 30, k + 1)));
  scr.onclick = (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.kind) { st.seats[+b.dataset.k].kind = b.dataset.kind; if (b.dataset.kind === 'human' && !st.seats[+b.dataset.k].name) st.seats[+b.dataset.k].name = `Player ${+b.dataset.k + 1}`; screenSetup(scr); }
    else if (b.dataset.rm) { st.seats.splice(+b.dataset.rm, 1); screenSetup(scr); }
    else if (b.dataset.add != null) { st.seats.push({ kind: 'ai', name: '', persona: PERSONA_KEYS[st.seats.length % PERSONA_KEYS.length] }); screenSetup(scr); }
    else if (b.dataset.seg) { st[b.dataset.seg] = b.dataset.v; screenSetup(scr); }
    else if (b.dataset.back != null) scene('title');
    else if (b.dataset.start != null) startFromSetup();
  };
  scr.onchange = (ev) => {
    const t = ev.target;
    if (t.dataset.name != null) st.seats[+t.dataset.name].name = t.value.trim();
    if (t.dataset.persona != null) st.seats[+t.dataset.persona].persona = t.value;
    if (t.dataset.years != null) st.years = +t.value;
    if (t.dataset.seed != null) st.seed = t.value;
  };
}
function startFromSetup() {
  const st = G.setup;
  const seats = st.seats.map((p) => ({ kind: p.kind, name: p.name || undefined, persona: p.persona === 'random' ? undefined : p.persona }));
  newGame({ seats, mode: st.mode, variant: st.variant, years: st.mode === 'short' ? 0 : +st.years, seed: st.seed !== '' ? +st.seed : undefined });
}

function screenHelp(scr) {
  const tabs = [['rules', 'Rules'], ['seasons', 'Seasons'], ['cards', 'Cards'], ['controls', 'Controls']];
  scr.innerHTML = `<div class="wrap"><h2>How to play</h2><div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button class="btn" role="tab" data-tab="${k}" aria-selected="${G.helpTab === k}">${l}</button>`).join('')}</div>
    <div class="card" role="tabpanel">${helpHtml(G.helpTab)}</div><button class="btn primary" data-back>Back</button></div>`;
  scr.onclick = (ev) => { const b = ev.target.closest('button'); if (!b) return; if (b.dataset.tab) { G.helpTab = b.dataset.tab; screenHelp(scr); scr.querySelector(`[data-tab="${G.helpTab}"]`).focus(); } else if (b.dataset.back != null) scene(G.back === 'game' && G.s ? 'game' : 'title'); };
}
function screenAbout(scr) {
  scr.innerHTML = `<div class="wrap"><h2>About</h2><div class="card">${aboutHtml()}</div><button class="btn primary" data-back>Back</button></div>`;
  scr.onclick = (ev) => { if (ev.target.closest('[data-back]')) scene('title'); };
}
function screenSettings(scr) {
  const st = G.settings;
  const seg = (key, opts) => `<div class="seg" role="group" aria-label="${key}">${opts.map(([v, l]) => `<button type="button" data-set="${key}" data-v="${v}" aria-pressed="${String(st[key]) === String(v)}">${l}</button>`).join('')}</div>`;
  scr.innerHTML = `<div class="wrap"><h2>Settings</h2><div class="card">
    <p><strong>Sound</strong><br>${seg('sound', [[true, 'On'], [false, 'Off']])} <label class="chk" style="display:inline-flex">Volume <input type="range" min="0" max="1" step="0.05" value="${st.vol}" data-vol aria-label="Volume" style="width:150px"></label></p>
    <p><strong>Motion</strong><br>${seg('motion', [['system', 'Follow system'], ['reduce', 'Reduced'], ['full', 'Full']])}</p>
    <p><strong>Text size</strong><br>${seg('text', [[1, '100%'], [1.25, '125%'], [1.5, '150%']])}</p>
    <p><strong>Theme</strong><br>${seg('theme', [['auto', 'Follow system'], ['light', 'Gilded day'], ['dark', 'Neon night']])}</p>
    <p><strong>AI speed</strong><br>${seg('ai', [['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']])}</p></div>
    <button class="btn primary" data-back>Back</button></div>`;
  scr.onclick = (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.set) { const k = b.dataset.set; let v = b.dataset.v; if (k === 'sound') v = v === 'true'; if (k === 'text') v = +v; st[k] = v; saveSettings(); unlock(); if (k === 'sound' && v) sfx('coin'); screenSettings(scr); scr.querySelector(`[data-set="${k}"][aria-pressed="true"]`).focus(); }
    else if (b.dataset.back != null) scene(G.back === 'game' && G.s ? 'game' : 'title');
  };
  scr.oninput = (ev) => { if (ev.target.dataset.vol != null) { st.vol = +ev.target.value; saveSettings(); } };
}
function screenOver(scr) {
  const s = G.s;
  const rank = s.ranking || s.players.map((p) => p.id);
  scr.innerHTML = `<div class="wrap"><div class="row" style="flex-wrap:nowrap"><span id="wintok"></span><h2>${esc(s.players[s.winner].name)} wins!</h2></div><p class="lede">Game over: ${esc(s.endWhy || '')}. ${MONTHS[s.month]}, Year ${s.year + 1}, after ${s.round} month${s.round === 1 ? '' : 's'}.</p>
    <div class="card"><table class="t"><thead><tr><th>#</th><th>Baron</th><th>Net worth</th><th>Lots</th><th>Rent collected</th><th>Trades</th></tr></thead><tbody>
    ${rank.map((id, k) => { const p = s.players[id]; return `<tr><td>${k + 1}</td><td data-tok="${id}">${esc(p.name)}${p.kind === 'ai' ? ` <span class="fine">(${esc(PERSONAS[p.persona].name)})</span>` : ''}</td><td>${p.out ? `Bankrupt (month ${p.outRound})` : money(E.netWorth(s, id))}</td><td>${E.owned(s, id).length}</td><td>${money(p.stat.rentIn)}</td><td>${p.stat.trades}</td></tr>`; }).join('')}</tbody></table>
    <p class="fine">Auctions ${s.stats.auctions} · trades ${s.stats.trades} · buildings raised ${s.stats.builds} · cards drawn ${s.stats.cards}</p></div>
    <div class="row"><button class="btn primary" data-again>Play again</button><button class="btn" data-title>Title</button></div></div>`;
  $('#wintok').append(R.tokenCanvas(s.players[s.winner].token, 72, s.winner + 1)); $('#wintok canvas').style.cssText = 'width:72px;height:72px';
  scr.querySelectorAll('[data-tok]').forEach((td) => td.prepend(R.tokenCanvas(s.players[+td.dataset.tok].token, 26, +td.dataset.tok + 1)));
  scr.onclick = (ev) => { if (ev.target.closest('[data-again]')) newGame(G.lastSetup); else if (ev.target.closest('[data-title]')) scene('title'); };
}

// ---------- game lifecycle ----------
function newGame(opts = {}) {
  const seed = opts.seed ?? G.nextSeed ?? ((Date.now() % 1e9) | 0);
  G.nextSeed = null;
  G.lastSetup = { ...opts, seed: undefined };
  const s = E.createGame({ ...opts, seed });
  loadGame(s);
  store.set(SAVE, JSON.stringify(s));
  scene('game');
  return s;
}
function loadGame(s) {
  G.s = s; G.queue = []; G.busy = false; G.logSeen = s.log.length > 3 ? s.log.length - 3 : 0;
  R.view.tokens = []; R.view.flash = -1; R.view.cursor = -1;
  R.view.dice.a = s.dice[0] || 1; R.view.dice.b = s.dice[1] || 1;
}

// ---------- input ----------
function onKey(ev) {
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const k = ev.key;
  if (G.dialog) {
    if (k === 'Escape') { ev.preventDefault(); closeDialog(); }
    else if (k === 'Tab') trapFocus(ev);
    return;
  }
  if (G.scene !== 'game') { if (k === 'Escape' && G.scene !== 'title') scene(G.back === 'game' && G.s ? 'game' : 'title'); return; }
  const tag = (ev.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select') return;
  const up = k.length === 1 ? k.toUpperCase() : k;
  if (up === 'P' || k === 'Escape') { ev.preventDefault(); openPause(); return; }
  if (k.startsWith('Arrow') && (ev.target === R.view.cv || R.view.cursor >= 0)) {
    ev.preventDefault();
    const d = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1;
    R.view.cursor = ((R.view.cursor < 0 ? (G.s ? G.s.players[G.s.turn].pos : 0) : R.view.cursor + d) + 32) % 32;
    const sp = SPACES[R.view.cursor], o = G.s && G.s.lots[R.view.cursor] ? G.s.lots[R.view.cursor].owner : -1;
    announce(`${sp.name}${sp.price ? ', ' + money(sp.price) : ''}${o >= 0 ? ', owned by ' + G.s.players[o].name : sp.price ? ', unowned' : ''}. Press Enter for the deed.`);
    draw(); return;
  }
  if ((k === 'Enter' || k === ' ') && ev.target === R.view.cv) { ev.preventDefault(); openDeed(R.view.cursor >= 0 ? R.view.cursor : G.s.players[G.s.turn].pos); return; }
  const b = document.querySelector(`#actions .btn[data-key="${up}"]:not(:disabled)`);
  if (b) { ev.preventDefault(); b.click(); }
}
function trapFocus(ev) {
  const f = [...$('#modal').querySelectorAll('button:not(:disabled), input, select, [tabindex="0"]')];
  if (!f.length) return;
  const i = f.indexOf(document.activeElement);
  if (ev.shiftKey && (i <= 0)) { ev.preventDefault(); f[f.length - 1].focus(); }
  else if (!ev.shiftKey && i === f.length - 1) { ev.preventDefault(); f[0].focus(); }
}
function onBoardPointer(ev) {
  unlock();
  const r = R.view.cv.getBoundingClientRect();
  const i = R.hit(ev.clientX - r.left, ev.clientY - r.top);
  if (i >= 0) openDeed(i);
}

// ---------- hooks ----------
function gameState() {
  return { scene: G.scene, dialog: G.dialog, game: G.s ? JSON.parse(JSON.stringify(G.s)) : null, settings: { ...G.settings }, busy: G.busy, waitingOk: G.waitingOk, actor: G.s ? E.actor(G.s) : -1, legal: G.s ? E.legal(G.s) : [], sounds: audio.played.slice(-10), board: { W: R.view.W, H: R.view.H } };
}
window.__game = {
  seed(n) { G.nextSeed = n | 0; if (G.s) { G.s.rng = (n >>> 0) || 1; } return true; },
  getState: gameState,
  setState(x) { const s = x && x.game ? x.game : x; if (!s || !s.players) return false; loadGame(JSON.parse(JSON.stringify(s))); store.set(SAVE, JSON.stringify(G.s)); scene(x.scene && x.scene !== 'game' ? x.scene : 'game'); return true; },
  isIdle() { return (!G.busy || G.waitingOk) && G.anim === 0 && !G.aiTimer && !drawQueued && !G.dlgAnim; },
  scene(n) { if (n === 'game' && !G.s) return false; G.back = G.s ? 'game' : 'title'; scene(n); return G.scene; },
  newGame(opts = {}) { const s = newGame(opts); return E.summary(s); },
  act(name, ...args) {
    const s = G.s;
    switch (name) {
      case 'do': { const r = perform(args[0]); return r; }
      case 'dice': if (s) E.forceDice(s, args[0], args[1]); return true;
      case 'card': if (s) E.forceCard(s, args[0], args[1]); return true;
      case 'ai': { if (!s) return false; const a = aiAction(s); return a ? perform(a) : false; }
      case 'aiPause': G.aiPaused = !!args[0]; if (!G.aiPaused) schedule(); else { clearTimeout(G.aiTimer); G.aiTimer = 0; } return G.aiPaused;
      case 'fast': G.fast = !!args[0]; return G.fast;
      case 'autoplay': {
        if (!s) return null; const n = args[0] || 1000;
        for (let k = 0; k < n && !s.ended; k++) { const a = aiAction(s); const r = E.apply(s, a); if (!r.ok) return { error: r.error, action: a }; }
        G.queue = []; R.view.tokens = []; store.set(SAVE, JSON.stringify(s)); flushLog(); if (s.ended) scene('over'); else refresh();
        return E.summary(s);
      }
      case 'rent': return s ? E.rentOf(s, args[0], args[1] ?? 7) : null;
      case 'legal': return s ? E.legal(s) : [];
      case 'summary': return s ? E.summary(s) : null;
      case 'open': {
        const [what, arg] = args;
        if (what === 'deed') openDeed(arg); else if (what === 'manage') openManage(); else if (what === 'trade') openTrade(arg); else if (what === 'pause') openPause(); else if (what === 'card') openDialog(`${cardHtml(arg, s)}<div class="btns"><button class="btn primary" data-ok>OK</button></div>`, { name: 'card' });
        return G.dialog;
      }
      case 'close': closeDialog(true); return true;
      case 'cursor': R.view.cursor = args[0]; draw(); return true;
      case 'tradeSet': { const st = G.trade; if (!st) return false; Object.assign(st, { to: args[0].to ?? st.to, give: new Set(args[0].give || []), get: new Set(args[0].get || []), giveCash: args[0].giveCash || 0, getCash: args[0].getCash || 0 }); refreshDialog(); return true; }
    }
    return null;
  },
};

// ---------- boot ----------
function boot() {
  R.setCanvas($('#board'));
  loadSettings();
  $('#modal').addEventListener('click', onModalClick);
  $('#modal').addEventListener('click', onManageClick);
  $('#b-menu').addEventListener('click', () => openPause());
  $('#b-sound').addEventListener('click', () => { unlock(); G.settings.sound = !G.settings.sound; saveSettings(); if (G.settings.sound) sfx('coin'); });
  R.view.cv.tabIndex = 0;
  R.view.cv.addEventListener('click', onBoardPointer);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', () => { layout(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applySettings);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', applySettings);
  scene('title');
}
boot();
