import { start } from './helpers.mjs';
import { SPACES, SEASONS, PERSONA_KEYS } from '../src/js/data.js';

// Wave 4, batch C: key badges and the size of the segmented controls, the Pythian deed, the summer season's fact, a human
// baron's portrait, and the Park Avenue, Vapors and Bathhouse Row wording.

export const tests = [];
const APPROVED_PYTHIAN = 'The Pythian Bathhouse opened on Malvern Avenue in 1914, built by the Knights of Pythias, an African American fraternal organization, for African American clients; members paid half price.';
const lot = (name) => SPACES.findIndex((s) => s.name === name);

// ---------- S2-14: no key badges on a touch screen, and the segmented controls are 44 px ----------
tests.push({
  name: 'S2-14 key badges are drawn only where there is a keyboard, and every segmented control is 44 px tall',
  async run(t) {
    await t.game('scene', 'setup');
    await t.waitForStable();
    const segs = await t.page.evaluate(() => [...document.querySelectorAll('.seg button')].map((b) => Math.round(b.getBoundingClientRect().height)));
    t.expect(segs.length >= 8 && segs.every((h) => h >= 44), `every setup toggle is at least 44 px tall (${[...new Set(segs)]})`);
    await t.shot('S2-14-setup', { wait: false });
    await t.checkLayout({ allowScrollY: true });
    await t.game('scene', 'settings');
    await t.waitForStable();
    const inSettings = await t.page.evaluate(() => [...document.querySelectorAll('.seg button')].map((b) => Math.round(b.getBoundingClientRect().height)));
    t.expect(inSettings.length >= 10 && inSettings.every((h) => h >= 44), `and so is every toggle in Settings (${[...new Set(inSettings)]})`);
    await start(t);
    const badges = await t.page.evaluate(() => {
      const k = [...document.querySelectorAll('#actions .btn kbd')];
      return { n: k.length, shown: k.filter((e) => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).length, touch: matchMedia('(hover: none)').matches };
    });
    t.expect(badges.n >= 1, 'the action buttons carry key badges in the page');
    t.equal(badges.touch, t.viewport === 'mobile', 'the phone is a touch screen and the desktop is not');
    t.equal(badges.shown, t.viewport === 'mobile' ? 0 : badges.n, t.viewport === 'mobile' ? 'a phone shows none of them' : 'a desktop shows all of them');
    await t.shot('S2-14-actions', { wait: false });
  },
});

