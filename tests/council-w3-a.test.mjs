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
