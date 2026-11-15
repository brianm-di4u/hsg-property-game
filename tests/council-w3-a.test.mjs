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
];
