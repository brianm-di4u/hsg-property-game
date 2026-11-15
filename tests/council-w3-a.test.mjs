import { start, g, act, mod, rollTo, TWO_HUMANS, click } from './helpers.mjs';
import * as E from '../src/js/engine.js';
import { OWNABLE, SPACES, isRow } from '../src/js/data.js';
import { shuffle } from '../src/js/rng.js';

// Wave 3, batch A: menu screens dressed like the table, storage notice, volume controls, tests for every space type,
// Resign, auto end turn, Help layout, Short-game fairness and the results table on a phone.

export const tests = [
  {
    name: 'S4-08 menu screens use the table fonts, paper cards and the brand colour on sliders',
    async run(t) {
      await t.game('scene', 'settings');
      await t.waitForStable();
      const r = await t.page.evaluate(() => {
        const css = (el) => getComputedStyle(el);
        const primary = css(document.body).getPropertyValue('--primary').trim();
        const probe = document.createElement('i'); probe.style.color = primary; document.body.append(probe);
        const want = css(probe).color; probe.remove();
        const card = document.querySelector('#screen .card');
        return { accent: css(document.querySelector('input[type=range]')).accentColor, want, serif: css(card).fontFamily, rule: css(card).borderTopStyle, grain: css(card).backgroundImage + ' / ' + css(card).background + ' / ' + css(document.documentElement).getPropertyValue('--grain'), label: css(document.querySelector('.settings .card p > strong')).fontFamily };
      });
      t.equal(r.accent, r.want, 'sliders take the brand colour, not the browser blue');
      t.expect(/Libre Caslon/.test(r.serif), `card text is in the serif stack (${r.serif})`);
      t.equal(r.rule, 'double', 'the card has a deco double rule');
      t.expect(/repeating-linear-gradient/.test(r.grain), 'the card has a paper grain: ' + r.grain);
      t.expect(/Barlow Condensed/.test(r.label), 'setting labels use the deco face');
      await t.shot('S4-08-settings');
      await t.checkLayout({ allowScrollY: true });
      await t.game('scene', 'help');
      await t.page.click('[data-tab="seasons"]');
      await t.waitForStable();
      const th = await t.page.evaluate(() => getComputedStyle(document.querySelector('#screen table.t th')).fontFamily);
      t.expect(/Barlow Condensed/.test(th), `table headings use the deco face (${th})`);
      await t.shot('S4-08-help-seasons');
      await t.game('scene', 'about');
      await t.waitForStable();
      await t.shot('S4-08-about');
    },
  },
  {
    name: 'S4-62 a short phone shows the first title buttons without scrolling',
    viewports: ['mobile'],
    async run(t) {
      await t.page.setViewportSize({ width: 320, height: 568 });
      await t.game('scene', 'title');
      await t.waitForStable();
      const r = await t.page.evaluate(() => {
        const H = window.innerHeight, box = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; };
        const btns = [...document.querySelectorAll('.menu .btn')].map((b) => ({ label: b.textContent.trim().split(' (')[0], bottom: b.getBoundingClientRect().bottom }));
        return { H, lid: box('.title-hero .lid'), btns, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
      });
      await t.shot('S4-62-title-320x568');
      if (r.lid) t.expect(r.lid.bottom - r.lid.top <= r.H * 0.46, `the title picture takes at most 45% of a short screen (${Math.round(r.lid.bottom - r.lid.top)} of ${r.H})`);
      const inside = r.btns.filter((b) => b.bottom <= r.H).map((b) => b.label);
      t.expect(['New game', 'Continue', 'How to play', 'Career'].every((l) => inside.includes(l)), `New game, Continue, How to play and Career are on the first screen (${inside.join(', ')})`);
      t.expect(r.sw <= r.cw, 'no sideways scroll');
    },
  },
  {
    name: 'S5-07 the volume sliders say their level and the effects slider plays a tick, at most every 150 ms',
    async run(t) {
      await t.game('scene', 'settings');
      await t.waitForStable();
      const slide = (sel, values) => t.page.evaluate(([q, vs]) => { const el = document.querySelector(q); for (const v of vs) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } return el.getAttribute('aria-valuetext'); }, [sel, values]);
      const heard = async () => (await t.game('audioState')).count;
      const stored = () => t.page.evaluate(() => JSON.parse(localStorage.getItem('hs-barons-settings-v1')));
      t.equal(await t.page.locator('[data-vol]').getAttribute('aria-valuetext'), 'Sound effects volume 35 percent', 'effects slider reads its level');
      let n = await heard();
      t.equal(await slide('[data-vol]', [0.5, 0.6, 0.7, 0.8, 0.9]), 'Sound effects volume 90 percent', 'the text follows the slider');
      t.equal((await heard()) - n, 1, 'five quick moves play one tick');
      t.equal((await stored()).vol, 0.9, 'and the level is saved');
      n = await heard();
      t.equal(await slide('[data-mvol]', [0.2]), 'Music volume 20 percent', 'music slider reads its level');
      t.equal(await slide('[data-avol]', [0.4]), 'Ambience volume 40 percent', 'ambience slider reads its level');
      t.equal((await heard()) - n, 0, 'music and ambience are heard as they are, with no extra tick');
      const st = await stored();
      t.equal(st.mvol, 0.2, 'music level saved'); t.equal(st.avol, 0.4, 'ambience level saved');
    },
  },
  {
    name: 'S5-07 the quick volume sheet opens from the table, changes the levels and gives the game back',
    async run(t) {
      await start(t);
      await t.shot('S5-07-topbar');
      const bar = await t.page.evaluate(() => { const c = document.querySelector('#clock .month'); return { clipped: c.scrollWidth > c.clientWidth + 1, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; });
      t.expect(!bar.clipped && bar.sw <= bar.cw, 'the month title is not squeezed and nothing scrolls sideways');
      const before = await g(t);
      const open = async () => {
        if (await t.page.locator('#b-mix').isVisible()) await click(t, '#b-mix');
        else { await t.game('act', 'open', 'pause'); await click(t, '#modal [data-mixer]'); } // a phone's top bar has no room: Menu, then Volume
        await t.waitForStable();
      };
      t.equal(await t.page.locator('#b-mix').isVisible(), t.viewport === 'desktop', 'the top bar button shows where there is room (a phone uses Menu)');
      await open();
      t.equal((await t.state()).dialog, 'mixer', 'the volume sheet opens');
      t.equal(await t.page.locator('#modal input[type=range]').count(), 3, 'with effects, music and ambience');
      t.expect(/Music volume 70 percent/.test(await t.page.locator('#modal [data-mvol]').getAttribute('aria-valuetext')), 'each slider says its level');
      await t.shot('S5-07-mixer');
      await t.checkLayout();
      await t.page.evaluate(() => { const el = document.querySelector('#modal [data-mvol]'); el.value = 0.3; el.dispatchEvent(new Event('input', { bubbles: true })); });
      t.equal((await t.state()).settings.mvol, 0.3, 'the music level moved');
      await t.page.keyboard.press('Escape');
      t.equal((await t.state()).dialog, null, 'Escape closes the sheet');
      t.equal(JSON.stringify((await g(t)).log), JSON.stringify(before.log), 'the game went on untouched');
      await open();
      await click(t, '#modal [data-ok]');
      t.equal((await t.state()).dialog, null, 'Done closes it');
    },
  },
  {
    name: 'S6-19 the engine lets a baron resign on their own turn and nowhere else',
    node: true,
    async run(t) {
      const mk = () => E.createGame({ seed: 4, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }, { kind: 'ai', persona: 'banker' }] });
      let s = mk();
      t.expect(E.legal(s).some((a) => a.type === 'resign'), 'resign is legal before a roll');
      s.lots[1].owner = 0; s.lots[1].level = 1; s.lots[4].owner = 0; s.players[0].cash = 400;
      let r = E.apply(s, { type: 'resign' });
      t.expect(r.ok, 'and works');
      t.expect(s.players[0].out && s.players[0].cash === 0, 'the baron is out with no cash');
      t.equal(s.lots[1].owner, -1, 'lots go back to the town'); t.equal(s.lots[1].level, 0, 'without buildings');
      t.equal(s.turn, 1, 'the turn passes to the next baron'); t.equal(s.phase, 'roll', 'who may roll');
      t.expect(!s.ended, 'two barons play on');
      t.expect(r.events.some((e) => e.t === 'bankrupt' && e.resigned), 'the event says it was a resignation');
      t.expect(/Ada resigns/.test(s.log[s.log.length - 1]), 'and so does the ledger');
      s = mk(); E.apply(s, { type: 'roll' });
      if (s.phase === 'buy') { t.expect(!E.legal(s).some((a) => a.type === 'resign'), 'not while a buy decision waits'); r = E.apply(s, { type: 'resign' }); t.expect(!r.ok, 'and refused if tried'); E.apply(s, { type: 'buy' }); }
      t.expect(E.legal(s).some((a) => a.type === 'resign'), 'legal again after the landing is settled (post)');
      s = E.createGame({ seed: 4, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }] });
      E.apply(s, { type: 'resign' });
      t.expect(s.ended && s.winner === 1, 'in a two-baron game the other baron wins');
      s = mk(); s.turn = 1; r = E.apply(s, { type: 'resign', pid: 0 });
      t.expect(!r.ok, 'no one can resign for another baron');
    },
  },
  {
    name: 'S6-19 Resign in the menu takes two taps, and only on your own turn',
    async run(t) {
      await start(t);
      await mod(t, (s) => { s.lots[1].owner = 0; s.lots[3].owner = 0; s.lots[4].owner = 0; });
      await t.game('act', 'open', 'pause');
      const rb = t.page.locator('#modal [data-resign]');
      t.equal(await rb.count(), 1, 'the menu has a Resign button');
      t.expect(await rb.isEnabled(), 'enabled on your turn');
      await t.shot('S6-19-menu');
      await rb.click();
      t.expect(/Tap again: Ada leaves the table/.test(await rb.textContent()), 'the first tap asks again');
      t.equal((await g(t)).players[0].out, false, 'and changes nothing');
      await t.page.keyboard.press('Escape');
      await t.game('act', 'open', 'pause');
      t.equal((await t.page.locator('#modal [data-resign]').textContent()).trim(), 'Resign', 'closing the menu forgets the first tap');
      await t.page.locator('#modal [data-resign]').click();
      await t.shot('S6-19-confirm', { wait: false });
      await t.page.locator('#modal [data-resign]').click();
      await t.waitForStable();
      const s = await g(t);
      t.expect(s.players[0].out, 'the second tap resigns');
      t.equal(s.lots[1].owner, -1, 'her lots go back to the town');
      t.equal((await t.state()).dialog, null, 'the menu is closed');
      t.equal((await t.state()).scene, 'game', 'three barons play on');
      t.expect(s.turn !== 0, 'the turn has moved on');
      // an AI's turn: the button waits
      await mod(t, (x) => { x.players[0].out = false; x.turn = 1; });
      await t.game('act', 'aiPause', true);
      await t.game('act', 'open', 'pause');
      t.expect(!(await t.page.locator('#modal [data-resign]').isEnabled()), 'disabled while a rival is to play');
      t.expect(/on your own turn/.test(await t.page.locator('#modal').textContent()), 'and says why');
    },
  },
  {
    name: 'S6-19 resigning from a two-baron game goes to the results',
    async run(t) {
      await start(t, { seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }] });
      await t.game('act', 'open', 'pause');
      await t.page.locator('#modal [data-resign]').click();
      await t.page.locator('#modal [data-resign]').click();
      await t.page.waitForFunction(() => window.__game.getState().scene === 'over', null, { timeout: 8000 });
      const s = await g(t);
      t.equal(s.winner, 1, 'the rival wins');
      await t.checkLayout({ allowScrollY: true });
    },
  },
  {
    name: 'S6-04 Manage and Raise cash open for a baron who owns any one space, in both rule sets',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      const seats = [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }, { kind: 'ai', persona: 'banker' }];
      const load = (s) => t.game('setState', { game: s }).then(() => t.waitForStable());
      const count = (sel) => t.page.locator(sel).count();
      for (const i of OWNABLE) {
        const row = isRow(i), name = SPACES[i].name;
        // Manage, opened with the key
        let s = E.createGame({ seed: 3, seats }); s.lots[i].owner = 0; s.phase = 'post';
        await load(s);
        await t.page.keyboard.press('m');
        t.equal((await t.state()).dialog, 'manage', `${name}: Manage opens`);
        t.equal(await count(`#modal [data-act="mortgage"][data-i="${i}"]:not([disabled])`), row ? 0 : 1, `${name}: mortgage offered unless it is a federal lease`);
        t.expect(/Manage lots/.test(await t.page.locator('#modal').textContent()) && (await t.page.locator('#modal').textContent()).includes(name), `${name}: listed in Manage`);
        await t.game('act', 'close');
        // Raise cash: broke and owing, through to bankruptcy to the other baron (standard) or to the town (Common Ground)
        for (const variant of i === OWNABLE[0] || i === 4 || i === 10 || i === 5 ? ['standard', 'common'] : ['standard']) {
          s = E.createGame({ seed: 3, seats, variant }); s.lots[i].owner = 0; s.players[0].cash = 0; s.phase = 'debt'; s.resume = 'post';
          s.debts = [{ pid: 0, amount: 5000, to: 1, why: 'rent' }];
          await load(s);
          t.equal((await t.state()).dialog, 'debt', `${name} (${variant}): Raise cash opens`);
          t.equal(await count(`#modal [data-act="mortgage"][data-i="${i}"]:not([disabled])`), row ? 0 : 1, `${name} (${variant}): mortgage offered unless a lease`);
          await t.page.locator('#modal [data-act="bankrupt"]').click();
          await t.page.locator('#modal [data-act="bankrupt"]').click();
          await t.waitForStable();
          const after = await g(t);
          t.expect(after.players[0].out, `${name} (${variant}): bankruptcy goes through`);
          t.equal(after.lots[i].owner, 1, `${name} (${variant}): the lot passes to the creditor`);
        }
      }
    },
  },
  {
    name: 'S6-04 whoever is to act always has a control, in every phase',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      const seats = [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }, { kind: 'ai', persona: 'banker' }];
      const mk = () => E.createGame({ seed: 5, seats });
      const phases = {};
      phases.roll = mk();
      phases.buy = mk(); E.forceDice(phases.buy, 2, 3); E.apply(phases.buy, { type: 'roll' }); // lands on space 5, an unowned lot
      phases.post = mk(); phases.post.lots[1].owner = 0; phases.post.phase = 'post';
      phases.auction = mk(); E.forceDice(phases.auction, 2, 3); E.apply(phases.auction, { type: 'roll' }); E.apply(phases.auction, { type: 'decline' });
      phases.trade = mk(); phases.trade.lots[1].owner = 1; phases.trade.phase = 'trade'; phases.trade.pending = { kind: 'trade', from: 1, to: 0, give: { lots: [1], cash: 0 }, get: { lots: [], cash: 50 }, back: 'roll' };
      phases.debt = mk(); phases.debt.lots[1].owner = 0; phases.debt.players[0].cash = 0; phases.debt.phase = 'debt'; phases.debt.resume = 'post'; phases.debt.debts = [{ pid: 0, amount: 500, to: 1, why: 'rent' }];
      for (const [name, s] of Object.entries(phases)) {
        if (name === 'auction') { // the auction opens with the first bidder; make it the human
          const A = s.pending; if (E.actor(s) !== 0) { A.i = A.order.indexOf(0); }
        }
        await t.game('setState', { game: s }); await t.waitForStable();
        const st = await t.state();
        t.equal(st.game.phase, name, `the ${name} phase loaded`);
        t.equal(st.actor, 0, `${name}: Ada is to act`);
        const live = await t.page.evaluate(() => [...document.querySelectorAll('#actions button, #modal button')].filter((b) => !b.disabled && b.getBoundingClientRect().width > 0).length);
        t.expect(live > 0, `${name}: there is an enabled control (${live})`);
      }
    },
  },
  {
    name: 'S6-04 other table sizes and rule sets play through to the results without an error',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      const humanAnd = (n) => [{ kind: 'human', name: 'Ada' }, ...['hotelier', 'banker', 'showman', 'gambler', 'speculator'].slice(0, n - 1).map((persona) => ({ kind: 'ai', persona }))];
      const cases = [
        { name: '3 barons, Common Ground', opts: { seats: humanAnd(3), variant: 'common' } },
        { name: '6 barons, year limit 1', opts: { seats: humanAnd(6), years: 1 } },
        { name: '5 barons, Short game, Common Ground', opts: { seats: humanAnd(5), mode: 'short', variant: 'common' } },
        { name: '2 barons, 2 years', opts: { seats: humanAnd(2), years: 2 } },
      ];
      for (const [k, c] of cases.entries()) {
        await t.seed(100 + k);
        await t.game('newGame', c.opts);
        await t.waitForStable();
        const sum = await t.game('act', 'autoplay', 30000);
        t.expect(sum && !sum.error, `${c.name}: no illegal AI action`);
        await t.waitForStable();
        const st = await t.state();
        t.expect(st.game.ended, `${c.name}: the game ended`);
        t.equal(st.scene, 'over', `${c.name}: the results screen is showing`);
        t.expect(await t.page.locator('.over table.t tbody tr').count() === c.opts.seats.length, `${c.name}: one results row for every baron`);
      }
    },
  },
  {
    name: 'S1-05 Auto end turn is off by default, and when on ends a turn with nothing to build or lift',
    async run(t) {
      await start(t);
      const turn = async () => (await g(t)).turn;
      t.equal((await t.state()).settings.autoEnd, false, 'off for a new profile');
      await rollTo(t, 2, 3); await act(t, { type: 'buy' }); await t.waitForStable();
      await t.page.waitForTimeout(1000); // nothing should happen: there is no event to wait for
      t.equal((await g(t)).phase, 'post', 'with the option off the turn waits for End turn');
      // switch it on in Settings, as a player would
      await t.game('scene', 'settings'); await t.waitForStable();
      t.equal(await t.page.locator('[data-set="autoEnd"][aria-pressed="true"]').textContent(), 'Off', 'Settings shows it Off');
      await t.page.click('[data-set="autoEnd"][data-v="true"]');
      t.equal((await t.state()).settings.autoEnd, true, 'and On after a tap');
      await t.shot('S1-05-settings');
      await t.game('scene', 'game'); await t.waitForStable();
      await t.page.waitForFunction(() => window.__game.getState().game.turn !== 0, null, { timeout: 8000 });
      t.equal(await turn(), 1, 'now the turn ended by itself');
      // a turn that can still build keeps waiting
      await t.game('act', 'aiPause', true);
      await mod(t, (x) => { x.turn = 0; x.phase = 'post'; x.again = false; for (const i of [1, 3]) x.lots[i].owner = 0; x.players[0].cash = 1000; });
      await t.page.waitForTimeout(1000);
      t.equal((await g(t)).phase, 'post', 'a whole district to build on holds the turn');
      t.equal((await g(t)).turn, 0, 'still Ada');
      // doubles: the end goes back to rolling
      await mod(t, (x) => { x.lots[1].owner = -1; x.lots[3].owner = -1; x.turn = 0; x.phase = 'post'; x.again = true; });
      await t.page.waitForFunction(() => window.__game.getState().game.phase === 'roll', null, { timeout: 8000 });
      t.equal((await g(t)).turn, 0, 'after doubles Ada rolls again');
    },
  },
  {
    name: 'S1-05 Manage and Trade stay reachable until the turn ends, and an open dialog holds it',
    async run(t) {
      await start(t);
      await t.game('scene', 'settings'); await t.page.click('[data-set="autoEnd"][data-v="true"]'); await t.game('scene', 'game'); await t.waitForStable();
      // load the state and open Manage in one breath: mod() would wait for the turn to end first
      await t.page.evaluate(() => { const x = window.__game.getState().game; x.turn = 0; x.phase = 'post'; x.again = false; x.lots[5].owner = 0; window.__game.setState({ game: x }); window.__game.act('open', 'manage'); });
      t.equal((await t.state()).dialog, 'manage', 'Manage opens');
      await t.page.waitForTimeout(1000);
      t.equal((await g(t)).phase, 'post', 'an open Manage holds the turn');
      t.equal(await t.page.locator('#turnbar .who .sub').last().textContent(), 'Moved: manage, trade or end the turn', 'and the bar does not promise to end it');
      await t.game('act', 'close');
      t.expect(/ending your turn/.test(await t.page.locator('#turnbar .who .sub').last().textContent()) || (await g(t)).turn !== 0, 'closing it lets the turn end (the bar says so first)');
      await t.page.waitForFunction(() => window.__game.getState().game.turn !== 0, null, { timeout: 8000 });
    },
  },
  {
    name: 'S1-05 an old settings record loads with Auto end turn off, and the choice survives a reload',
    viewports: ['desktop'],
    async run(t) {
      await t.page.evaluate(() => localStorage.setItem('hs-barons-settings-v1', JSON.stringify({ sound: true, vol: 0.35, ai: 'fast' })));
      await t.reload();
      t.equal((await t.state()).settings.autoEnd, false, 'a record from before the option reads Off');
      t.equal((await t.state()).settings.ai, 'fast', 'and keeps its other choices');
      await t.game('scene', 'settings'); await t.page.click('[data-set="autoEnd"][data-v="true"]');
      await t.reload();
      t.equal((await t.state()).settings.autoEnd, true, 'On is remembered');
      await t.page.evaluate(() => localStorage.setItem('hs-barons-settings-v1', JSON.stringify({ autoEnd: 'yes' })));
      await t.reload();
      t.equal((await t.state()).settings.autoEnd, false, 'a damaged value falls back to Off');
    },
  },
  {
    name: 'S2-13 the Rules open with the goal and a three-step turn; the detail folds away and opens on a tap',
    async run(t) {
      await t.game('scene', 'help');
      await t.waitForStable();
      const panel = t.page.locator('[role="tabpanel"]');
      t.expect(await panel.locator('h3 + .goal').count() === 1, 'the goal still sits right under the Rules heading');
      t.equal(await panel.locator('.turncard .steps li').count(), 3, 'a turn is three steps');
      const steps = await panel.locator('.turncard .steps li').allInnerTexts();
      t.expect(/^Roll/.test(steps[0]) && /^Land/.test(steps[1]) && /end your turn/.test(steps[2]), 'roll, land, end');
      const n = await panel.locator('details.rule').count();
      t.expect(n >= 6, `the rest is folded into sections (${n})`);
      t.equal(await panel.locator('details.rule[open]').count(), 0, 'all closed at first');
      const hidden = await panel.locator('details.rule .prose').first().isVisible();
      t.expect(!hidden, 'so their text is out of the way');
      await t.shot('S2-13-rules-closed', { fullPage: true });
      await panel.locator('details.rule summary', { hasText: 'Buying and auctions' }).click();
      t.expect(/federal leases/.test(await panel.locator('details.rule[open]').innerText()), 'a tap opens a section');
      await panel.locator('details.rule summary', { hasText: 'Trading' }).focus();
      await t.page.keyboard.press('Enter');
      t.equal(await panel.locator('details.rule[open]').count(), 2, 'Enter opens one from the keyboard');
      await t.shot('S2-13-rules-open', { fullPage: true });
      await t.checkLayout({ allowScrollY: true });
    },
  },
  {
    name: 'S2-13 Controls lead with touch on a touch screen and with keys on a keyboard',
    async run(t) {
      await t.game('scene', 'help');
      await t.page.click('[data-tab="controls"]');
      await t.waitForStable();
      const first = await t.page.evaluate(() => [...document.querySelectorAll('[role="tabpanel"] h4')].map((h) => h.textContent));
      const coarse = await t.page.evaluate(() => matchMedia('(pointer: coarse)').matches);
      t.equal(coarse, t.viewport === 'mobile', 'the phone viewport reports a touch pointer');
      t.equal(first[0], coarse ? 'On a touch screen' : 'With a keyboard', 'the first block fits the input');
      t.equal(first.length, 3, 'and the other two are still there (the gamepad block, S4-21, comes last)');
      t.equal(first[2], 'With a gamepad', 'the gamepad block closes the page');
      t.expect(/Tap any space/.test(await t.page.locator('[role="tabpanel"]').innerText()), 'the touch text is shown');
      await t.shot('S2-13-controls', { fullPage: true });
      await t.checkLayout({ allowScrollY: true });
    },
  },
  {
    name: 'S3-05 the Short game deals each baron one dear and one cheap lot, evenly',
    node: true,
    async run(t) {
      const lots = OWNABLE.filter((i) => SPACES[i].type === 'lot' && !isRow(i)).sort((a, b) => SPACES[a].price - SPACES[b].price || a - b);
      const cheap = new Set(lots.slice(0, lots.length >> 1));
      const price = (i) => SPACES[i].price;
      const spread = (s) => { const v = s.players.map((p) => E.owned(s, p.id).reduce((a, i) => a + price(i), 0)); return (Math.max(...v) - Math.min(...v)) / (v.reduce((a, b) => a + b) / v.length); };
      const old = (seed, n) => { // the deal before this change: two lots each from the whole pool
        const s = E.createGame({ seed, seats: Array.from({ length: n }, () => ({ kind: 'ai' })) });
        const pool = shuffle(s, lots.slice()); const v = [];
        for (let p = 0; p < n; p++) { v.push(price(pool.pop()) + price(pool.pop())); }
        return (Math.max(...v) - Math.min(...v)) / (v.reduce((a, b) => a + b) / v.length);
      };
      const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
      for (const n of [2, 3, 4, 5, 6]) {
        const now = [], before = [];
        for (let seed = 1; seed <= 60; seed++) {
          const s = E.createGame({ seed, mode: 'short', seats: Array.from({ length: n }, () => ({ kind: 'ai' })) });
          for (const p of s.players) {
            const mine = E.owned(s, p.id);
            if (mine.length !== 2 || mine.some((i) => isRow(i) || SPACES[i].type !== 'lot') || mine.filter((i) => cheap.has(i)).length !== 1) { t.fail(`seed ${seed}, ${n} barons: baron ${p.id} does not hold one cheap and one dear plain lot`); return; }
          }
          now.push(spread(s)); before.push(old(seed, n));
        }
        t.expect(Math.max(...now) <= 0.4, `${n} barons: the worst of 60 deals is within 40% of the mean (${Math.max(...now).toFixed(2)})`);
        t.expect(med(now) <= med(before) / 2, `${n} barons: the median gap is under half the old random deal's (${med(now).toFixed(2)} against ${med(before).toFixed(2)})`);
      }
      const full = E.createGame({ seed: 3, seats: [{ kind: 'ai' }, { kind: 'ai' }] });
      t.equal(OWNABLE.filter((i) => full.lots[i].owner >= 0).length, 0, 'a Full game still starts with no lots dealt');
    },
  },
  {
    name: 'S3-05 in the Short game a building counts for its full cost in net worth and so in the ranking',
    node: true,
    async run(t) {
      const mk = (opts) => {
        const s = E.createGame({ seed: 9, seats: [{ kind: 'ai' }, { kind: 'ai' }], ...opts });
        for (const i of OWNABLE) s.lots[i].owner = -1;
        const lot = 1, cost = E.buildCost(lot), worthBare = SPACES[lot].price;
        s.lots[lot].owner = 0; s.lots[lot].level = 3;
        s.players[0].cash = 500; s.players[1].cash = Math.round(500 + worthBare + cost * 2.25); // between the half-cost and full-cost totals
        s.monthsPlayed = 11; s.turn = 1; s.phase = 'post';
        return { s, cost, worthBare };
      };
      const short = mk({ mode: 'short' });
      t.equal(E.netWorth(short.s, 0), 500 + short.worthBare + 3 * short.cost, 'Short: three bathhouses count at full cost');
      E.apply(short.s, { type: 'end' });
      t.expect(short.s.ended && short.s.winner === 0, 'so the builder wins a close finish');
      const full = mk({ mode: 'full', years: 1 });
      t.equal(E.netWorth(full.s, 0), 500 + full.worthBare + 1.5 * full.cost, 'Full game: still half cost');
      E.apply(full.s, { type: 'end' });
      t.expect(full.s.ended && full.s.winner === 1, 'and the same finish goes the other way');
      t.equal(E.BUILD_WORTH.short, 1, 'the named constant holds the new rate'); t.equal(E.BUILD_WORTH.full, 0.5, 'and the old one');
      const old = mk({ mode: 'short' }); delete old.s.opts.buildWorth; // a Short game saved before this change
      t.equal(E.netWorth(old.s, 0), 500 + old.worthBare + 1.5 * old.cost, 'a Short game saved before the change keeps scoring at half');
    },
  },
  {
    name: 'S4-61 the results table fits the card on a phone, every column in view',
    async run(t) {
      await start(t, { seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'speculator' }, { kind: 'ai', persona: 'preservationist' }, { kind: 'ai', persona: 'showman' }] });
      await t.seed(31);
      await t.game('act', 'autoplay', 30000);
      await t.waitForStable();
      t.equal((await t.state()).scene, 'over', 'the results are showing');
      const widths = [320, 360, 390];
      for (const w of t.viewport === 'mobile' ? widths : [1280]) {
        if (t.viewport === 'mobile') { await t.page.setViewportSize({ width: w, height: 844 }); await t.waitForStable(); }
        const r = await t.page.evaluate(() => {
          const card = document.querySelector('.over .tscroll').getBoundingClientRect(), box = document.querySelector('.tscroll');
          const ths = [...document.querySelectorAll('.over table.results th')].map((th) => { const b = th.getBoundingClientRect(); return { text: th.textContent, right: b.right, vis: getComputedStyle(th).display !== 'none' }; });
          const rows = [...document.querySelectorAll('.over table.results tbody tr')].map((tr) => tr.getBoundingClientRect().height);
          return { fineWide: [...document.querySelectorAll('.over table.results .bn .fine')].filter((f) => f.scrollWidth > f.clientWidth + 1).length, cardRight: card.right, scrolls: box.scrollWidth > box.clientWidth + 1, ths, tokens: document.querySelectorAll('.over .bn canvas').length, cells: [...document.querySelectorAll('.over table.results td')].every((td) => getComputedStyle(td).display === 'table-cell'), rows };
        });
        t.expect(r.cells, `${w}px: every cell is still a table cell (the name is wrapped in a div)`);
        t.equal(r.tokens, 4, `${w}px: every baron has a token`);
        const inside = r.ths.every((h) => h.right <= r.cardRight + 1);
        t.expect(inside || (w < 390 && r.scrolls), `${w}px: every column header ends inside the card, or on the narrowest phones the table scrolls inside it (${r.ths.map((h) => Math.round(h.right)).join(', ')} of ${Math.round(r.cardRight)})`);
        if (w >= 360 || t.viewport === 'desktop') t.expect(!r.scrolls, `${w}px: nothing needs sideways scrolling, so the Trades column is whole`);
        t.equal(r.fineWide, 0, `${w}px: a persona's name wraps between words, never inside one`);
        if (w >= 390) t.expect(Math.max(...r.rows) < 130, `${w}px: rows stay compact (${Math.round(Math.max(...r.rows))} px)`);
        await t.shot(`S4-61-results-${w}`, { fullPage: true });
      }
    },
  },
  {
    name: 'S6-10 blocked storage says so on the title, in the first move and in the menu',
    initScript: () => { Storage.prototype.setItem = function () { throw new DOMException('blocked', 'SecurityError'); }; },
    async run(t) {
      await t.game('scene', 'title');
      await t.waitForStable();
      const note = t.page.locator('.title-hero .nosave');
      t.equal(await note.count(), 1, 'the title carries the notice');
      t.expect(/not be kept/.test(await note.textContent()), 'and says progress will not be kept');
      await t.shot('S6-10-title-blocked');
      await t.checkLayout({ allowScrollY: true });
      await start(t);
      await rollTo(t, 2, 3);
      await t.waitForStable();
      t.expect(/a reload will lose this game/.test(await t.page.locator('#event').textContent()), 'the first move says a reload will lose the game');
      await t.game('act', 'open', 'pause');
      t.equal(await t.page.locator('.dlg .nosave').count(), 1, 'the menu repeats it');
      await t.shot('S6-10-menu-blocked');
    },
  },
  {
    name: 'S6-10 a save that cannot be written tells the player once; working storage says nothing',
    async run(t) {
      await t.game('scene', 'title');
      t.equal(await t.page.locator('.title-hero .nosave').count(), 0, 'no notice when storage works');
      await start(t);
      await t.page.evaluate(() => { const set = Storage.prototype.setItem; window.__realSet = set; Storage.prototype.setItem = function (k, v) { if (k === 'hs-barons-save-v1') throw new DOMException('quota', 'QuotaExceededError'); return set.call(this, k, v); }; });
      await rollTo(t, 2, 3);
      await t.waitForStable();
      t.expect(/a reload will lose this game/.test(await t.page.locator('#event').textContent()), 'a full store is reported when a save fails');
      await t.page.evaluate(() => { document.querySelector('#event').textContent = ''; });
      await act(t, { type: 'buy' });
      await t.waitForStable();
      t.expect(!/a reload will lose this game/.test(await t.page.locator('#event').textContent()), 'and not again on the next move');
      await t.page.evaluate(() => { Storage.prototype.setItem = window.__realSet; });
      await t.game('scene', 'title');
      t.equal(await t.page.locator('.title-hero .nosave').count(), 1, 'the title keeps the notice for the session');
    },
  },
];
