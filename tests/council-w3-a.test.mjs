import { start, g, act, mod, rollTo, TWO_HUMANS, click } from './helpers.mjs';
import * as E from '../src/js/engine.js';
import { OWNABLE, SPACES } from '../src/js/data.js';

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
