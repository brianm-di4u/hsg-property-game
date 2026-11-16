import { start, g, mod } from './helpers.mjs';
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

// ---------- C4-03: the Pythian deed ----------
tests.push({
  name: 'C4-03 the Pythian deed says who built it and for whom, in the approved words, and its source is in the research file',
  node: true,
  async run(t) {
    const fs = await import('node:fs');
    const sp = SPACES[lot('Pythian Bathhouse')];
    t.equal(sp.fact.text, APPROVED_PYTHIAN, 'the deed line is the approved one, character for character');
    t.equal([sp.name, sp.short, sp.d, sp.price].join('|'), 'Pythian Bathhouse|Pythian|ps|220', 'the lot keeps its name, group and price');
    const research = fs.readFileSync(new URL('../research/downtown-and-landmarks.md', import.meta.url), 'utf8');
    t.expect(research.includes(sp.fact.quote), 'the quoted phrase is in the research file');
    t.expect(!/Black-owned|insurance order|\bonly\b/.test(sp.fact.text), 'and none of the words the sources do not use is in it');
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(process.execPath, ['tools/check-facts.mjs'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
    t.equal(r.status, 0, 'tools/check-facts.mjs passes: ' + (r.stdout.match(/FAIL.*/g) || []).join('; '));
  },
});
tests.push({
  name: 'C4-03 the new deed line fits its card',
  async run(t) {
    await start(t);
    await t.game('act', 'open', 'deed', lot('Pythian Bathhouse'));
    await t.waitForStable();
    const dlg = (await t.page.locator('#modal .dlg').innerText()).replace(/\s+/g, ' ');
    t.expect(dlg.includes(APPROVED_PYTHIAN), 'the deed shows the approved line');
    await t.checkLayout({ allowScrollY: true });
    await t.shot('C4-03-pythian-deed');
    await t.game('act', 'close');
  },
});

// ---------- S3-22: the summer season has a fact ----------
tests.push({
  name: 'S3-22 the summer season carries a sourced fact, and its sheet shows it',
  async run(t) {
    const summer = SEASONS.find((x) => x.id === 'summer');
    t.expect(summer.fact && summer.fact.bank === 'hs-0427' && /June/.test(summer.fact.text), 'the season has a line from the audited bank');
    await start(t, { seed: 3 });
    await mod(t, (s) => { s.month = 6; });
    await t.page.locator('#clock button.chip', { hasText: 'Summer visitors' }).click();
    await t.waitForStable();
    const txt = (await t.page.locator('#modal .dlg').innerText()).replace(/\s+/g, ' ');
    t.expect(txt.includes(summer.fact.text) && txt.includes(summer.fact.src), 'the sheet shows the line and its source');
    t.expect(!/game rule, not history/.test(txt), 'and no longer calls the season a game rule');
    await t.shot('S3-22-summer-sheet');
    await t.checkLayout({ allowScrollY: true });
  },
});

// ---------- S4-10: Park Avenue names, the Vapors and the Row ----------
tests.push({
  name: 'S4-10 the three Park Avenue lots take their researched names on the same spaces, and the Vapors and the Row say what they are',
  node: true,
  async run(t) {
    const want = { 'Langdon Filling Station': [13, 180], "Butchie's Drive-In": [14, 180], 'Velda Rose': [15, 200] };
    for (const [n, [i, price]] of Object.entries(want)) t.equal(`${lot(n)}|${SPACES[i].d}|${SPACES[i].price}`, `${i}|pa|${price}`, `${n}: same space, group and price as before`);
    t.expect(['Motor Courts', 'Drive-In', 'Tower Motel'].every((n) => lot(n) < 0), 'the generic names are gone');
    t.expect(!/\b19(60|63)\b/.test(SPACES[15].fact.text), 'the Velda Rose deed leaves out the year the sources disagree on');
    const vap = SPACES[lot('The Vapors')].fact.text;
    t.expect(/late-night casino/.test(vap) && /clubs/.test(vap), 'the Vapors deed says why it is a club');
    const { helpHtml } = await import('../src/js/ui.js');
    const rules = helpHtml('rules');
    t.expect(/Quapaw/.test(rules) && /Superior/.test(rules) && /Hale/.test(rules), 'the rules name Row bathhouses that are not in the game');
  },
});
tests.push({
  name: 'S4-10 the Vapors and the three Park Avenue deeds fit their cards',
  async run(t) {
    await start(t);
    for (const name of ['The Vapors', 'Velda Rose', "Butchie's Drive-In", 'Langdon Filling Station']) {
      await t.game('act', 'open', 'deed', lot(name));
      await t.waitForStable();
      const dlg = (await t.page.locator('#modal .dlg').innerText()).replace(/\s+/g, ' ');
      t.expect(dlg.includes(SPACES[lot(name)].fact.text), `${name}: the deed shows its line`);
      await t.checkLayout({ allowScrollY: true });
      await t.game('act', 'close');
    }
  },
});
tests.push({
  name: 'S4-10 a lot owned in a game begun before the rename shows under its new name',
  async run(t) {
    await start(t, { seed: 3 });
    await mod(t, (s) => { s.lots[15].owner = 0; });
    await t.game('act', 'open', 'deed', 15);
    await t.waitForStable();
    const dlg = (await t.page.locator('#modal .dlg').innerText()).replace(/\s+/g, ' ');
    t.expect(/Velda Rose/.test(dlg) && /Ada/.test(dlg), `the owned lot shows the new name and its owner (${dlg.slice(0, 120)})`);
    await t.shot('S4-10-velda-rose-deed');
    await t.game('act', 'close');
  },
});
