import { start, g, act, mod } from './helpers.mjs';
import * as E from '../src/js/engine.js';
import { OWNABLE, SPACES, LOTS_BY_D, DISTRICTS } from '../src/js/data.js';

// Wave 3, batch D: greyed-out actions say why, a rival's refusal of a trade says why, the last build, sale or mortgage
// can be taken back, and the results screen says why the winner won.

export const tests = [];

// ---------- S2-04: unavailable actions say why ----------
const FV = LOTS_BY_D.ra, BP = LOTS_BY_D.bp;
function table() {
  const s = E.createGame({ seed: 4, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'banker' }] });
  for (const i of OWNABLE) s.lots[i].owner = -1;
  s.phase = 'roll'; s.turn = 0; s.pending = null; s.built = [];
  return s;
}
tests.push({
  name: 'S2-04 the engine says why a build, mortgage or lift is refused, and says nothing when it is allowed',
  node: true,
  async run(t) {
    const s = table(), name = DISTRICTS.ra.name;
    s.lots[FV[0]].owner = 0;
    t.equal(E.whyNot(s, 0, 'build', FV[0]), `Need all ${FV.length} ${name} lots`, 'a lone lot: the district is not complete');
    for (const i of FV) s.lots[i].owner = 0;
    t.equal(E.whyNot(s, 0, 'build', FV[0]), '', 'a whole district with cash: nothing to say');
    s.players[0].cash = E.buildCost(FV[0]) - 15;
    t.equal(E.whyNot(s, 0, 'build', FV[0]), 'Short $15', 'cash short by $15 says so');
    s.players[0].cash = 1000; s.built = [FV[0]];
    t.equal(E.whyNot(s, 0, 'build', FV[0]), 'Built this turn', 'one level per lot per turn');
    s.built = []; s.lots[FV[1]].mortgaged = true;
    t.expect(/mortgage/i.test(E.whyNot(s, 0, 'build', FV[0])), 'a mortgaged lot in the district blocks building');
    s.lots[FV[1]].mortgaged = false; s.lots[FV[0]].level = 4;
    t.equal(E.whyNot(s, 0, 'build', FV[0]), 'Already a Grand Resort', 'the top level');
    s.lots[FV[0]].level = 1;
    t.expect(/buildings/i.test(E.whyNot(s, 0, 'mortgage', FV[1])), 'a lot in a built district cannot be mortgaged');
    s.lots[FV[0]].level = 0; s.lots[FV[2]].mortgaged = true; s.players[0].cash = 10;
    t.equal(E.whyNot(s, 0, 'unmortgage', FV[2]), `Short $${E.unmortgageCost(FV[2]) - 10}`, 'lifting a mortgage you cannot afford');
    t.equal(E.whyNot(s, 0, 'build', BP[0]), '', 'a lot you do not own: nothing');
    // Wherever the engine's own legal list allows an action there is no reason.
    s.players[0].cash = 1000;
    for (const k of ['build', 'mortgage', 'unmortgage']) for (const i of OWNABLE) {
      if (E.legal(s).some((a) => a.type === k && a.space === i)) t.equal(E.whyNot(s, 0, k, i), '', `${k} ${i} is legal, so no reason`);
    }
  },
});
tests.push({
  name: 'S2-04 Manage and Buy say what is missing under the greyed-out button',
  async run(t) {
    await start(t, { seed: 3 });
    await mod(t, (s) => {
      for (const i of OWNABLE) s.lots[i].owner = -1;
      s.lots[FV[0]].owner = 0; s.lots[BP[0]].owner = 0; s.lots[BP[1]].owner = 0; s.lots[BP[2]].owner = 0;
      s.players[0].cash = 1000; s.phase = 'roll';
    });
    await t.game('act', 'open', 'manage');
    await t.waitForStable();
    const rows = await t.page.evaluate(() => [...document.querySelectorAll('#modal .mlist li')].map((li) => {
      const b = li.querySelector('[data-act="build"]'), w = li.querySelector('.why'), vis = !!w && w.getBoundingClientRect().height > 0;
      return { name: li.querySelector('.lname').textContent, buildOff: !!b && b.disabled, why: w ? w.textContent : '', vis, by: b ? b.getAttribute('aria-describedby') : null, id: w ? w.id : null };
    }));
    const fv = rows.find((r) => r.buildOff && /Need all/.test(r.why));
    t.expect(!!fv, 'the lone Roadside lot says what is missing');
    t.equal(fv && fv.why, `Build: Need all ${FV.length} ${DISTRICTS.ra.name} lots`, 'in words');
    t.expect(fv && fv.vis && fv.by === fv.id, 'the line is on screen and the disabled button points at it');
    const ok = rows.filter((r) => !r.buildOff);
    t.expect(ok.length >= 3 && ok.every((r) => r.why === ''), 'lots that can build say nothing');
    await mod(t, (s) => { s.players[0].cash = 20; });
    await t.game('act', 'open', 'manage');
    await t.waitForStable();
    const txt = await t.page.locator('#modal').innerText();
    t.expect(/Build: Short \$\d+/.test(txt), 'with $20 the complete district says how much is short');
    await t.shot('S2-04-manage-why');
    await t.checkLayout();
    await t.page.keyboard.press('Escape');
    // Buy: the button says how much more the lot needs.
    await mod(t, (s) => { s.phase = 'buy'; s.pending = { kind: 'buy', space: BP[1] }; s.players[0].cash = SPACES[BP[1]].price - 40; });
    await t.waitForStable();
    const buy = t.page.locator('#actions .btn[data-key="B"]');
    t.expect(await buy.isDisabled(), 'Buy is greyed out when the cash is short');
    t.expect(/need \$40 more/.test(await buy.innerText()), 'and says "need $40 more"');
    t.expect(/you need \$40 more/.test(await buy.getAttribute('aria-label')), 'and a screen reader hears it');
    await t.shot('S2-04-buy-short');
    await t.checkLayout();
    await mod(t, (s) => { s.players[0].cash = SPACES[BP[1]].price; });
    t.expect(!(await buy.isDisabled()) && !/need/.test(await buy.innerText()), 'with the cash the button is plain and live');
  },
});

// ---------- S1-07: a mouse over a space, or a finger held on it, shows a small card ----------
tests.push({
  name: 'S1-07 hover (mouse) or press and hold (touch) peeks at a space; a plain tap or click still opens the deed',
  async run(t) {
    await start(t, { seed: 3 });
    await mod(t, (s) => { s.lots[BP[0]].owner = 1; });
    const [x, y] = await t.game('spaceScreen', BP[0]);
    const name = SPACES[BP[0]].name;
    const peek = () => t.page.evaluate(() => { const p = document.getElementById('peek'), r = p.getBoundingClientRect(); return { shown: !p.hidden, text: p.innerText, r: { l: r.left, t: r.top, w: r.width, h: r.height }, hi: window.__G ? window.__G.dialog : null }; });
    if (t.viewport === 'mobile') {
      const held = t.touchDrag([x, y], [x, y], { steps: 1, holdEndMs: 2500 });
      await t.page.waitForFunction(() => !document.getElementById('peek').hidden, null, { timeout: 5000 });
      const p = await peek();
      t.expect(p.text.includes(name) && /Rent now/.test(p.text) && /Tap for the deed/.test(p.text), 'a held finger shows the space: its name and rent, and says Tap');
      t.expect(p.r.l >= 0 && p.r.t >= 0 && p.r.l + p.r.w <= 390 && p.r.t + p.r.h <= 844, 'the card is wholly on screen');
      t.expect(p.r.t + p.r.h <= y, 'and sits above the finger, so the hand does not hide it');
      t.equal((await t.state()).dialog, null, 'holding does not open the deed');
      await t.shot('S1-07-peek');
      await held;
      await t.page.waitForFunction(() => document.getElementById('peek').hidden, null, { timeout: 5000 });
      t.equal((await t.state()).dialog, null, 'lifting the finger closes the card and does not open the deed either');
      await t.tap([x, y]);
      await t.waitForStable();
      t.equal((await t.state()).dialog, 'deed', 'a quick tap still opens the deed');
    } else {
      await t.page.mouse.move(x - 40, y - 40); await t.page.mouse.move(x, y, { steps: 4 });
      await t.page.waitForFunction(() => !document.getElementById('peek').hidden, null, { timeout: 5000 });
      const p = await peek();
      t.expect(p.text.includes(name) && /Rent now/.test(p.text) && /Click for the deed/.test(p.text), 'the mouse over a space shows its name and rent, and says Click');
      t.expect(p.r.l >= 0 && p.r.t >= 0 && p.r.l + p.r.w <= 1280 && p.r.t + p.r.h <= 800, 'the card is wholly on screen');
      t.equal(await t.page.evaluate(() => window.__G.dialog), null, 'hovering does not open anything');
      await t.shot('S1-07-peek');
      await t.page.mouse.move(640, 5);
      await t.page.waitForFunction(() => document.getElementById('peek').hidden, null, { timeout: 5000 });
      await t.page.mouse.click(x, y);
      await t.waitForStable();
      t.equal((await t.state()).dialog, 'deed', 'a click still opens the deed');
    }
  },
});

// ---------- S2-10: a rival's refusal of a trade says why ----------
import * as AI from '../src/js/ai.js';
const GH = LOTS_BY_D.gh;
function tradeTable() {
  const s = E.createGame({ seed: 4, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }, { kind: 'human', name: 'Ben' }] });
  for (const i of OWNABLE) s.lots[i].owner = -1;
  s.lots[BP[0]].owner = 1; s.lots[BP[1]].owner = 1; s.lots[BP[2]].owner = 0; // the rival holds two Ballparks, Ada the third
  s.lots[FV[0]].owner = 1; s.lots[FV[1]].owner = 0;
  return s;
}
const offer = (from, giveLots, giveCash, getLots, getCash) => ({ from, to: 1, give: { lots: giveLots, cash: giveCash }, get: { lots: getLots, cash: getCash } });
const counterOf = (why) => { const m = /about \$([\d,]+) more/.exec(why); return m ? +m[1].replace(/,/g, '') : 0; };
tests.push({
  name: 'S2-10 the AI gives the reason it refuses an offer, and a counter that it would take',
  node: true,
  async run(t) {
    const s = tradeTable();
    let o = offer(0, [], 5, [FV[0]], 0), why = AI.declineWhy(s, 1, o);
    t.expect(/^the price is too low/.test(why), `a $5 offer for a lot: "${why}"`);
    const c = counterOf(why);
    t.expect(c >= 10 && c % 10 === 0, `it names a counter in tens (${c})`);
    t.expect(AI.evalTrade(s, 1, offer(0, [], 5 + c, [FV[0]], 0)) > 0, 'the counter is taken');
    t.expect(AI.evalTrade(s, 1, offer(0, [], 5 + c - 10, [FV[0]], 0)) <= 0, 'and $10 less is not: it is the nearest');
    t.equal(AI.declineWhy(s, 1, offer(0, [], 5 + c, [FV[0]], 0)), '', 'an offer it accepts has no reason');
    why = AI.declineWhy(s, 1, offer(0, [], 300, [BP[0]], 0));
    t.expect(/finish your district/.test(why), `asking for the lot that completes the proposer's district: "${why}"`);
    why = AI.declineWhy(s, 1, offer(2, [], 100, [BP[0]], 0));
    t.expect(/part of a district already held/.test(why), `a third baron asking for a lot of a district the rival is building: "${why}"`);
    // A rich table makes the rival's reserve large; a thin purse then sinks an offer that the lot itself would have won.
    for (const i of GH) { s.lots[i].owner = 2; s.lots[i].level = 4; }
    s.players[1].cash = 400;
    why = AI.declineWhy(s, 1, offer(0, [FV[1]], 0, [], 100));
    t.expect(/too little cash/.test(why), `an offer that leaves the rival short: "${why}"`);
    // The counter never asks for more than the proposer has.
    s.players[0].cash = 30;
    t.equal(counterOf(AI.declineWhy(s, 1, offer(0, [], 5, [FV[0]], 0))), 0, 'no counter is named that the proposer cannot pay');
    // An AI decision carries the reason; the engine puts it in the event and the ledger.
    const g = E.createGame({ seed: 9, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }] });
    for (const i of OWNABLE) g.lots[i].owner = -1;
    g.lots[FV[0]].owner = 1;
    t.expect(E.apply(g, { type: 'propose', to: 1, give: { lots: [], cash: 5 }, get: { lots: [FV[0]], cash: 0 } }).ok, 'the offer is made');
    const act = AI.aiAction(g);
    t.equal(act.accept, false, 'the rival refuses');
    t.expect(typeof act.why === 'string' && act.why.length > 5, 'and says why');
    const r = E.apply(g, act), ev = r.events.find((e) => e.t === 'declined');
    t.equal(ev && ev.why, act.why, 'the event carries it');
    t.expect(g.log[g.log.length - 1].includes(act.why), 'and so does the ledger');
    const h = E.createGame({ seed: 9, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'human', name: 'Ben' }] });
    for (const i of OWNABLE) h.lots[i].owner = -1;
    h.lots[FV[0]].owner = 1;
    t.expect(E.apply(h, { type: 'propose', to: 1, give: { lots: [], cash: 5 }, get: { lots: [FV[0]], cash: 0 } }).ok, 'a human offer to a human');
    E.apply(h, { type: 'respond', accept: false });
    t.equal(h.log[h.log.length - 1], 'Ben declines.', 'a human declining is as before');
  },
});
tests.push({
  name: 'S2-10 the refusal is shown in the toast and the ledger',
  async run(t) {
    await start(t, { seed: 3 });
    await mod(t, (s) => { for (const i of OWNABLE) s.lots[i].owner = -1; s.lots[FV[0]].owner = 1; });
    await act(t, { type: 'propose', to: 1, give: { lots: [], cash: 5 }, get: { lots: [FV[0]], cash: 0 } });
    await t.game('act', 'ai');
    await t.waitForStable();
    const s = await g(t);
    t.equal(s.lots[FV[0]].owner, 1, 'the lowball was refused');
    const want = /declines the offer: the price is too low; about \$[\d,]+ more might do/;
    await t.page.waitForFunction((src) => new RegExp(src).test(document.getElementById('event').textContent), want.source, { timeout: 5000 });
    t.expect(want.test(await t.page.locator('#event').innerText()), 'the toast under the turn bar says why');
    t.expect(s.log.some((l) => /declines: the price is too low/.test(l)), 'the ledger says why');
    await t.shot('S2-10-declined');
    await t.checkLayout();
  },
});

// ---------- S2-20: take back the last build, sale, mortgage or lift ----------
tests.push({
  name: 'S2-20 Manage can take back the last builds, sales, mortgages and lifts, exactly, until another move is made',
  async run(t) {
    await start(t, { seed: 3 });
    await mod(t, (s) => {
      for (const i of OWNABLE) s.lots[i].owner = -1;
      for (const i of BP) s.lots[i].owner = 0;
      s.lots[FV[0]].owner = 0; s.lots[BP[2]].level = 1;
      s.players[0].cash = 1000; s.phase = 'roll'; s.built = [];
    });
    const snap = async () => { const s = await g(t); return JSON.stringify({ lots: s.lots, cash: s.players[0].cash, built: s.built, stat: s.players[0].stat, log: s.log.length }); };
    const undoBtn = t.page.locator('#modal [data-undo]');
    await t.game('act', 'open', 'manage');
    await t.waitForStable();
    t.equal(await undoBtn.count(), 0, 'nothing to take back at first');
    const s0 = await snap();
    await t.page.locator(`#modal [data-act="build"][data-i="${BP[0]}"]`).click();
    await t.page.waitForFunction(() => !window.__G.busy, null, { timeout: 8000 });
    t.equal((await g(t)).lots[BP[0]].level, 1, 'a build is made');
    t.expect(/Undo build/.test(await undoBtn.innerText()), 'the button reads "Undo build"');
    t.expect(/Undo the last build, on /.test(await undoBtn.getAttribute('aria-label')), 'and says where, to a screen reader');
    await t.page.locator(`#modal [data-act="sell"][data-i="${BP[2]}"]`).click();
    await t.page.waitForFunction(() => !window.__G.busy, null, { timeout: 8000 });
    t.equal((await g(t)).lots[BP[2]].level, 0, 'a building is sold');
    t.expect(/Undo sale/.test(await undoBtn.innerText()), 'now "Undo sale"');
    await t.shot('S2-20-undo');
    await t.checkLayout();
    await undoBtn.click();
    await t.page.waitForFunction(() => !window.__G.busy, null, { timeout: 8000 });
    let s = await g(t);
    t.equal(s.lots[BP[2]].level, 1, 'undo puts the building back');
    t.equal(s.lots[BP[0]].level, 1, 'and leaves the earlier build');
    t.expect(/Undo build/.test(await undoBtn.innerText()), 'the next step back is the build');
    await undoBtn.click();
    await t.page.waitForFunction(() => !window.__G.busy, null, { timeout: 8000 });
    t.equal(await snap(), s0, 'two steps back is the game exactly as it was: lots, cash, the built list, the stats and the ledger');
    t.equal(await undoBtn.count(), 0, 'and the button is gone');
    t.equal((await t.page.locator(`#modal [data-act="build"][data-i="${BP[0]}"]`).isDisabled()), false, 'the lot can be built on again this turn');
    // A mortgage and its lift
    await t.page.locator(`#modal [data-act="mortgage"][data-i="${FV[0]}"]`).click();
    await t.page.waitForFunction(() => !window.__G.busy, null, { timeout: 8000 });
    t.equal((await g(t)).lots[FV[0]].mortgaged, true, 'a mortgage is taken');
    t.expect(/Undo mortgage/.test(await undoBtn.innerText()), 'and can be undone');
    await t.page.locator(`#modal [data-act="unmortgage"][data-i="${FV[0]}"]`).click();
    await t.page.waitForFunction(() => !window.__G.busy, null, { timeout: 8000 });
    t.expect(/Undo lift/.test(await undoBtn.innerText()), 'a lift likewise');
    // Another move closes the way back.
    await t.page.keyboard.press('Escape');
    await act(t, { type: 'roll' });
    await t.waitForStable();
    t.equal(await t.page.evaluate(() => window.__G.undo.length), 0, 'after a roll the way back is closed');
  },
});

// ---------- S3-13: the results screen says why ----------
tests.push({
  name: 'S3-13 the engine records each baron\'s net worth every month and the biggest rent, and reads the lead from it',
  node: true,
  async run(t) {
    const s = E.createGame({ seed: 5, mode: 'short', seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }, { kind: 'ai', persona: 'banker' }] });
    t.equal(s.history.length, 1, 'the game starts with one point');
    t.equal(s.history[0].m, 0, 'at month 0');
    t.equal(s.history[0].w.length, 3, 'with a figure for each baron');
    for (let k = 0; k < 3000 && !s.ended && s.monthsPlayed < 3; k++) { const L = E.legal(s); const pick = L.find((x) => x.type === 'roll') || L.find((x) => x.type === 'buy') || L.find((x) => x.type === 'end') || L.find((x) => x.type === 'decline') || L.find((x) => x.type === 'pass') || L.find((x) => x.type === 'respond') || L[0]; E.apply(s, pick.type === 'respond' ? { type: 'respond', accept: false } : pick); }
    t.expect(s.monthsPlayed >= 3, `three months were played (${s.monthsPlayed})`);
    t.expect(s.history.length === s.monthsPlayed + 1 && s.history.every((x, i) => x.m === i), 'one point for each month, in order');
    // A crafted record: Ben leads, then Ada takes it at month 3 and keeps it.
    const g = E.createGame({ seed: 6, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'human', name: 'Ben' }] });
    g.history = [{ m: 0, w: [1200, 1200] }, { m: 1, w: [1100, 1300] }, { m: 2, w: [1200, 1400] }, { m: 3, w: [1500, 1400] }, { m: 4, w: [1700, 1300] }];
    const st = E.leadStory(g);
    t.equal(st.leader, 0, 'Ada leads at the end');
    t.equal(st.changes, 1, 'the lead changed hands once');
    t.equal(st.since, 3, 'at month 3');
    g.history = [{ m: 0, w: [1200, 1200] }, { m: 1, w: [1300, 1200] }, { m: 2, w: [1400, 1100] }];
    t.equal(E.leadStory(g).changes, 0, 'a baron who led from the first month never lost it');
    g.history = [];
    t.equal(E.leadStory(g), null, 'no record, no story');
    delete g.history;
    t.equal(E.leadStory(g), null, 'a save from before the record has none either');
    // The biggest rent is kept with who, whom and where.
    const r = E.createGame({ seed: 8, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'human', name: 'Ben' }] });
    for (const i of OWNABLE) r.lots[i].owner = -1;
    r.lots[FV[0]].owner = 1; r.players[0].pos = FV[0] - 1; r.phase = 'roll'; r.turn = 0;
    E.forceDice(r, 1, 0); E.forceDice(r, 0, 1);
    E.apply(r, { type: 'roll' });
    const big = r.stats.bigRent;
    t.expect(big && big.from === 0 && big.to === 1 && big.space === FV[0] && big.amount > 0, 'a rent paid is the biggest so far');
  },
});
tests.push({
  name: 'S3-13 the results screen draws the net worth lines and says who led, when it turned and the biggest rent',
  async run(t) {
    await start(t, { mode: 'short', seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }, { kind: 'ai', persona: 'banker' }], seed: 7 });
    await t.game('act', 'autoplay', 2000);
    await t.waitForStable();
    const s = await g(t);
    t.expect(s.ended && s.history.length >= 12, `a finished game has a point for each month (${s.history.length})`);
    t.equal((await t.state()).scene, 'over', 'the results screen is up');
    const card = t.page.locator('.over .why');
    t.equal(await card.count(), 1, 'there is a "How it was won" card');
    t.expect(await card.locator('svg polyline').count() === 3, 'a line for each baron');
    t.expect((await card.locator('.lgn').count()) === 3, 'and a legend naming them');
    const txt = await card.innerText();
    t.expect(/led from the first month to the last|The lead changed hands \d+ times?; .* took it for good after month \d+\./.test(txt), `the lead: "${txt.split('\n').find((l) => /lead/.test(l))}"`);
    t.expect(/Biggest rent: \$[\d,]+, paid by .* to .* on .* in month \d+\./.test(txt), 'the biggest rent');
    t.expect(/Rent paid: .*\$[\d,]+/.test(txt), 'and the rent each baron paid');
    t.equal(await t.page.locator('.over table.results thead th').count(), 6, 'the results table keeps its six columns, so it still fits a phone');
    const pad = await t.page.evaluate(() => { const r = document.querySelector('.over .why svg').getBoundingClientRect(); return { w: r.width, h: r.height, vw: innerWidth }; });
    t.expect(pad.w > 200 && pad.w <= pad.vw && pad.h > 80, `the chart is a usable size (${Math.round(pad.w)} x ${Math.round(pad.h)})`);
    await t.page.locator('.over .why').scrollIntoViewIfNeeded();
    await t.shot('S3-13-how-it-was-won');
    await t.checkLayout();
    // A game with no record (a save from before this) shows the rest of the screen and what it can still say.
    await mod(t, (x) => { delete x.history; delete x.stats.bigRent; });
    await t.game('scene', 'over');
    await t.waitForStable();
    t.equal(await t.page.locator('.over .why svg').count(), 0, 'an old game has no chart');
    const old = await t.page.locator('.over .why').innerText();
    t.expect(!/lead|Biggest rent/.test(old) && /Rent paid/.test(old), 'and no story of the lead or the biggest rent, only the rent each baron paid');
    t.expect((await t.page.locator('.over table.results').count()) === 1, 'and the table is still there');
  },
});
