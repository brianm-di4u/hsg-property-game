import fs from 'node:fs';
import { start, g, act, rollTo, click } from './helpers.mjs';

// Batch B (AI): three AI levels per seat (S3-01) and the trade exploit fix (S3-04).
// The Node tests run the real engine and AI headless; the head-to-head numbers come from tools/levels.mjs and
// tools/exploit.mjs, the same tools that produced the before and after tables in the batch report.
const COUNCIL = new URL('../../_council/hsg-property-game/wave-2/', import.meta.url);
const tools = (f) => import(new URL(`../tools/${f}`, import.meta.url).href);
const rules = () => Promise.all([import('../src/js/data.js'), import('../src/js/engine.js'), import('../src/js/ai.js')]);
function keep(name, file) {
  try { if (fs.existsSync(COUNCIL)) { fs.mkdirSync(new URL('shots/', COUNCIL), { recursive: true }); fs.copyFileSync(file, new URL(`shots/${name}.png`, COUNCIL)); } } catch (e) { /* shots are a courtesy */ }
}
const HUMAN_AI = (lv) => [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier', level: lv[0] }, { kind: 'ai', persona: 'speculator', level: lv[1] }, { kind: 'ai', persona: 'banker', level: lv[2] }];

export const tests = [
  {
    name: 'S3-01 setup offers Easy, Normal or Hard for each AI seat, Normal by default',
    async run(t) {
      await t.game('scene', 'title');
      await click(t, '[data-go="setup"]');
      await t.waitForStable();
      t.equal(await t.page.locator('select.level').count(), 3, 'one level control per AI seat, none for the human');
      const vals = await t.page.locator('select.level').evaluateAll((els) => els.map((e) => e.value));
      t.equal(JSON.stringify(vals), JSON.stringify(['normal', 'normal', 'normal']), 'every AI seat starts on Normal');
      const opts = await t.page.locator('select.level').first().evaluate((e) => [...e.options].map((o) => o.textContent));
      t.equal(JSON.stringify(opts), JSON.stringify(['Easy', 'Normal', 'Hard']), 'Easy, Normal, Hard in that order');
      t.equal(await t.page.locator('select.level').first().getAttribute('aria-label'), 'Seat 2 AI level', 'labelled for screen readers');
      await t.page.selectOption('[data-level="1"]', 'hard');
      await t.page.selectOption('[data-level="2"]', 'easy');
      await t.waitForStable();
      const h = await t.page.locator('select.level').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
      t.expect(h.every((x) => x >= 44), `level controls are at least 44 px tall (${h.join(', ')})`);
      const blurb = await t.page.locator('.seat').nth(1).locator('.blurb').innerText();
      t.expect(/Hard:/.test(blurb), 'the blurb says what Hard means');
      keep(`S3-01-setup-levels-${t.viewport}`, (await t.shot('b-setup-levels')).file);
      await t.checkLayout({ allowScrollY: true });
      await t.game('act', 'aiPause', true);
      await click(t, '[data-start]');
      await t.waitForStable();
      const s = (await t.state()).game;
      t.equal(JSON.stringify(s.players.map((p) => p.level)), JSON.stringify([null, 'hard', 'easy', 'normal']), 'the levels are stored on the players (none for a human)');
      const metas = await t.page.locator('.meta').allInnerTexts();
      t.expect(metas.some((m) => /AI · Hard/.test(m)) && metas.some((m) => /AI · Easy/.test(m)) && metas.some((m) => /AI · Normal/.test(m)), `baron cards show each level (${metas.join(' | ')})`);
      keep(`S3-01-baron-cards-${t.viewport}`, (await t.shot('b-baron-cards')).file);
      await t.checkLayout();
    },
  },
  {
    name: 'S3-01 the level is saved, survives a reload, and an old save without one plays as Normal',
    viewports: ['desktop'],
    async run(t) {
      await start(t, { seats: HUMAN_AI(['hard', 'easy', 'normal']) });
      await rollTo(t, 2, 3); await act(t, { type: 'buy' }); await act(t, { type: 'end' });
      const saved = JSON.parse(await t.page.evaluate(() => localStorage.getItem('hs-barons-save-v1')));
      t.equal(JSON.stringify(saved.players.map((p) => p.level)), JSON.stringify([null, 'hard', 'easy', 'normal']), 'levels are in the saved game');
      await t.reload();
      await t.game('act', 'aiPause', true);
      await click(t, '[data-go="continue"]');
      await t.waitForStable();
      t.equal(JSON.stringify((await g(t)).players.map((p) => p.level)), JSON.stringify([null, 'hard', 'easy', 'normal']), 'levels restored by Continue');
      // A save from before levels existed has no level on any player: it must load and play.
      const old = await g(t); for (const p of old.players) delete p.level;
      await t.page.evaluate((s) => localStorage.setItem('hs-barons-save-v1', JSON.stringify(s)), old);
      await t.reload();
      t.expect(!(await t.page.locator('[data-go="continue"]').isDisabled()), 'a pre-wave save still enables Continue');
      await t.game('act', 'aiPause', true);
      await click(t, '[data-go="continue"]');
      await t.waitForStable();
      await t.game('act', 'aiPause', false); await t.game('act', 'fast', true);
      const sum = await t.game('act', 'autoplay', 40);
      t.expect(!sum.error, 'the old save keeps playing with no illegal AI action');
    },
  },
  {
    name: 'S3-01 an unknown or missing level reads as Normal',
    node: true,
    async run(t) {
      const [, E, A] = await rules();
      const s = E.createGame({ seed: 5, seats: [{ kind: 'human' }, { kind: 'ai', persona: 'hotelier', level: 'impossible' }, { kind: 'ai', persona: 'banker' }] });
      t.equal(s.players[1].level, 'normal', 'an unknown level is stored as normal');
      t.equal(s.players[2].level, 'normal', 'no level is stored as normal');
      t.equal(s.players[0].level, null, 'a human has none');
      delete s.players[1].level; s.players[2].level = 42;
      t.equal(A.levelOf(s, 1).name, 'Normal', 'a save from before levels reads as Normal');
      t.equal(A.levelOf(s, 2).name, 'Normal', 'a damaged value reads as Normal');
    },
  },
  {
    name: 'S3-01 each level changes what the AI does (bids, mistakes, builds, offers)',
    node: true,
    async run(t) {
      const [data, E, A] = await rules();
      // Auction ceiling: the highest bid at which the baron still raises, same persona and position.
      const ceiling = (level) => {
        const s = E.createGame({ seed: 3, seats: [{ kind: 'human' }, { kind: 'ai', persona: 'hotelier', level }] });
        s.turn = 1; s.phase = 'auction';
        let top = 0;
        for (let bid = 0; bid < 1200; bid += 10) {
          s.pending = { kind: 'auction', space: 25, min: 10, bid, leader: 0, order: [1, 0], i: 0, out: [] };
          if (A.aiAction(s).type === 'bid') top = bid + (bid < 100 ? 10 : 25); else break;
        }
        return top;
      };
      const cn = ceiling('normal'), ce = ceiling('easy'), ch = ceiling('hard');
      t.log(`auction ceiling for the same lot: easy ${ce}, normal ${cn}, hard ${ch}`);
      t.expect(ce < cn * 0.8 && ce > cn * 0.6, `Easy bids about 70% of Normal (${ce} vs ${cn})`);
      t.expect(ch > cn, `Hard bids above Normal (${ch} vs ${cn})`);
      // Buying: Easy sometimes sends a lot it could afford to auction; Normal and Hard never do.
      const buys = (level, n) => {
        let b = 0;
        for (let k = 0; k < n; k++) {
          const s = E.createGame({ seed: 100 + k, seats: [{ kind: 'human' }, { kind: 'ai', persona: 'speculator', level }] });
          s.turn = 1; s.players[1].cash = 1200; s.phase = 'buy'; s.pending = { kind: 'buy', space: 15 };
          if (A.aiAction(s).type === 'buy') b++;
        }
        return b / n;
      };
      const be = buys('easy', 600), bn = buys('normal', 600);
      t.log(`buys a lot it wants: easy ${(be * 100).toFixed(1)}%, normal ${(bn * 100).toFixed(1)}%`);
      t.expect(bn === 1, 'Normal buys every lot it wants');
      t.expect(be > 0.80 && be < 0.90, `Easy passes on about 15% of the lots it wants (buys ${(be * 100).toFixed(1)}%)`);
      // Across whole games: Easy never offers a trade and never builds past level 2; the others do.
      const seatsOf = (lv) => ['hotelier', 'speculator', 'showman', 'banker'].map((p) => ({ kind: 'ai', persona: p, level: lv }));
      const watch = (lv) => {
        let offers = 0, maxLevel = 0;
        for (let k = 0; k < 12; k++) {
          const s = E.createGame({ seed: 40 + k, seats: seatsOf(lv) });
          for (let n = 0; n < 60000 && !s.ended && s.round <= 80; n++) {
            const r = E.apply(s, A.aiAction(s));
            for (const e of r.events) if (e.t === 'offer') offers++;
            for (const i of data.OWNABLE) maxLevel = Math.max(maxLevel, s.lots[i].level);
          }
        }
        return { offers, maxLevel };
      };
      const we = watch('easy'), wn = watch('normal'), wh = watch('hard');
      t.log(`12 games each: easy ${JSON.stringify(we)}, normal ${JSON.stringify(wn)}, hard ${JSON.stringify(wh)}`);
      t.equal(we.offers, 0, 'Easy barons never propose a trade');
      t.expect(we.maxLevel <= 2, `Easy barons never build past level 2 (reached ${we.maxLevel})`);
      t.expect(wn.offers > 0 && wh.offers > 0, 'Normal and Hard barons do propose trades');
      t.expect(wn.maxLevel >= 3, 'Normal barons build Grand Resorts');
    },
  },
  {
    name: 'S3-01 Hard beats Normal beats Easy head to head (200 games per pairing)',
    node: true,
    async run(t) {
      const { pairing, row } = await tools('levels.mjs');
      const hn = pairing('hard', 'normal', 100), ne = pairing('normal', 'easy', 100), he = pairing('hard', 'easy', 100);
      for (const r of [hn, ne, he]) t.log(row(r));
      t.expect(hn.share > 0.5 && hn.nwA > hn.nwB, `Hard beats Normal (${(hn.share * 100).toFixed(1)}% of ${hn.games}, net worth ${Math.round(hn.nwA)} vs ${Math.round(hn.nwB)})`);
      t.expect(ne.share > 0.6, `Normal beats Easy (${(ne.share * 100).toFixed(1)}% of ${ne.games})`);
      t.expect(he.share > 0.6, `Hard beats Easy (${(he.share * 100).toFixed(1)}% of ${he.games})`);
    },
  },
  {
    name: 'S3-01 AI decisions at every level stay cheap (mean under 5 ms, none near a second)',
    node: true,
    async run(t) {
      const [, E, A] = await rules();
      for (const level of ['easy', 'normal', 'hard']) {
        const ms = [];
        for (const seed of [9, 10, 11]) {
          const s = E.createGame({ seed, seats: ['hotelier', 'speculator', 'showman', 'banker'].map((p) => ({ kind: 'ai', persona: p, level })) });
          for (let n = 0; n < 40000 && !s.ended && s.round <= 70; n++) {
            const t0 = performance.now(); const a = A.aiAction(s); ms.push(performance.now() - t0);
            E.apply(s, a);
          }
        }
        ms.sort((a, b) => a - b);
        const mean = ms.reduce((a, b) => a + b, 0) / ms.length;
        t.log(`${level}: ${ms.length} decisions, mean ${mean.toFixed(3)} ms, median ${ms[ms.length >> 1].toFixed(3)} ms, p99 ${ms[Math.floor(ms.length * 0.99)].toFixed(2)} ms, slowest ${ms[ms.length - 1].toFixed(1)} ms`);
        t.expect(mean < 5, `${level}: mean decision ${mean.toFixed(3)} ms is under 5 ms`);
        t.expect(ms[ms.length - 1] < 1000, `${level}: the slowest decision (${ms[ms.length - 1].toFixed(1)} ms) is nowhere near a second, even on a busy machine`);
      }
    },
  },
  {
    name: 'S3-04 a baron may make three offers a turn, then the engine refuses and the turn counter resets',
    node: true,
    async run(t) {
      const [data, E] = await rules();
      const s = E.createGame({ seed: 4, seats: [{ kind: 'human' }, { kind: 'ai', persona: 'hotelier' }] });
      s.lots[1].owner = 0; s.lots[3].owner = 1;
      const offer = (k) => ({ type: 'propose', to: 1, give: { lots: [], cash: 10 + k * 10 }, get: { lots: [3], cash: 0 } });
      for (let k = 0; k < 3; k++) {
        t.expect(E.legal(s).some((a) => a.type === 'propose'), `offer ${k + 1}: a proposal is legal`);
        t.expect(E.apply(s, offer(k)).ok, `offer ${k + 1} is accepted by the engine`);
        t.expect(E.apply(s, { type: 'respond', accept: false }).ok, 'the other baron answers');
      }
      t.equal(E.offersLeft(s), 0, 'no offers left');
      t.expect(!E.legal(s).some((a) => a.type === 'propose'), 'propose is no longer legal');
      const r = E.apply(s, offer(3));
      t.expect(!r.ok && /offer limit/.test(r.error), `the fourth offer is refused (${r.error})`);
      t.equal(s.phase, 'roll', 'the refusal changes nothing');
      s.phase = 'post'; E.apply(s, { type: 'end' });
      t.equal(E.offersLeft(s), data.RULES.offersPerTurn, 'a new turn starts with three offers');
      // a save from before the limit has no counter: it reads as none used
      const old = E.createGame({ seed: 5 }); delete old.turnOffers;
      t.equal(E.offersLeft(old), data.RULES.offersPerTurn, 'a save without the counter has three offers left');
    },
  },
  {
    name: 'S3-04 the AI counts a lot that leaves a rival one short, and asks more each time it is pressed',
    node: true,
    async run(t) {
      const [data, E, A] = await rules();
      const cl = data.LOTS_BY_D.cl;
      const make = () => {
        const s = E.createGame({ seed: 8, seats: [{ kind: 'human' }, { kind: 'ai', persona: 'hotelier' }, { kind: 'ai', persona: 'banker' }] });
        s.lots[cl[0]].owner = 0; s.lots[cl[1]].owner = 1; s.lots[cl[2]].owner = 2;
        return s;
      };
      // The least cash that makes the Hotelier sell cl[1] to a baron who already holds cl[0].
      const price = (s, from = 0) => {
        for (let c = 0; c <= 1500; c += 5) {
          const o = { from, to: 1, give: { lots: [], cash: c }, get: { lots: [cl[1]], cash: 0 } };
          if (A.evalTrade(s, 1, o) > 0) return c;
        }
        return Infinity;
      };
      const keep = { ...data.TRADE_AI };
      try {
        data.TRADE_AI.twoAway = 0; data.TRADE_AI.repeat = 0;
        const before = price(make());
        data.TRADE_AI.twoAway = keep.twoAway;
        const withThreat = price(make());
        t.log(`price the Hotelier asks for the second piece: ${before} before, ${withThreat} with the two-away threat`);
        t.expect(withThreat > before + 40, `the two-away threat raises the price (${before} to ${withThreat})`);
        t.expect(A.threat(make(), 0, cl[1]) > 0 && A.threat(make(), 0, cl[1]) < A.threat((() => { const s = make(); s.lots[cl[2]].owner = 0; return s; })(), 0, cl[1]), 'half the weight of a lot that completes the district');
        data.TRADE_AI.repeat = keep.repeat;
        const s = make();
        const first = price(s);
        const asked = [first];
        for (let k = 0; k < 2; k++) {
          s.offers.push(`${E.absMonth(s)}|0>1|${k}|0|${cl[1]}|0`);
          asked.push(price(s));
        }
        t.log(`price after 0, 1 and 2 earlier offers this month: ${asked.join(', ')}`);
        t.expect(asked[1] > asked[0] && asked[2] > asked[1], 'each earlier offer from the same baron raises the price');
        t.expect(asked[2] >= asked[0] * 1.05, `two earlier offers raise it by at least 5% (${asked[0]} to ${asked[2]})`);
        // offers from another baron, or from an earlier month, do not count
        const other = make(); other.offers.push(`${E.absMonth(other)}|2>1|9|0|${cl[1]}|0`, `${E.absMonth(other) - 1}|0>1|8|0|${cl[1]}|0`);
        t.equal(price(other), first, "another baron's offers and last month's offers do not count");
      } finally { Object.assign(data.TRADE_AI, keep); }
    },
  },
  {
    name: 'S3-04 the exploit bot wins under 30% of 200 four-baron games (it won 34.7% before)',
    node: true,
    async run(t) {
      const { trial } = await tools('exploit.mjs');
      const ex = trial('exploit', 'full', 200), ctl = trial('ai', 'full', 200);
      const f = (r) => `win ${(r.win * 100).toFixed(1)}% of ${r.games}, trades per game ${r.trades.toFixed(1)}`;
      t.log(`exploit: ${f(ex)}; control: ${f(ctl)}`);
      t.expect(ex.win < 0.30, `the exploit bot wins ${(ex.win * 100).toFixed(1)}%, under 30%`);
      t.expect(ex.win < ctl.win + 0.04, `and no longer beats the control by much (${(ex.win * 100).toFixed(1)}% against ${(ctl.win * 100).toFixed(1)}%)`);
    },
  },
  {
    name: 'S3-04 the player is told when the offer limit is reached, and the rule is in How to play',
    async run(t) {
      await start(t);
      await click(t, '[data-key="T"]');
      await t.waitForStable();
      t.equal((await t.state()).dialog, 'trade', 'the trade window opens with offers to spare');
      const note = await t.page.locator('#modal .fine').allInnerTexts();
      t.expect(note.some((x) => /Offers left this turn: 3 of 3/.test(x)), 'the window says how many offers are left');
      keep(`S3-04-offers-left-${t.viewport}`, (await t.shot('b-offers-left')).file);
      await t.checkLayout();
      await click(t, '[data-f="cancel"]');
      await t.waitForStable();
      const s = await g(t); s.turnOffers = 3;
      await t.game('setState', { game: s }); await t.waitForStable();
      await click(t, '[data-key="T"]');
      await t.waitForStable();
      t.expect((await t.state()).dialog !== 'trade', 'no trade window once three offers are made');
      const msg = await t.page.locator('#event').innerText();
      t.expect(/3 offers this turn/.test(msg), `the player is told why (${msg})`);
      keep(`S3-04-offer-limit-${t.viewport}`, (await t.shot('b-offer-limit')).file);
      await t.checkLayout();
      await t.game('scene', 'help');
      await t.waitForStable();
      const rules = await t.page.locator('[role="tabpanel"]').innerText();
      t.expect(/up to 3 offers a turn/.test(rules), 'How to play states the limit');
    },
  },
];
