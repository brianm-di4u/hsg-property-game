import { start, g, act, mod, rollTo, TWO_HUMANS } from './helpers.mjs';
import * as E from '../src/js/engine.js';
import { OWNABLE, LOTS_BY_D } from '../src/js/data.js';
import { historyChart, whyLines, endingStory } from '../src/js/ui.js';

// Wave 4, batch A: a save from a newer version is left alone, season chip taps, the title menu above the fold, the lease
// Mortgage reason, the results chart for a game resumed late, one loss sting, mid-word breaks and the verifiers' loose ends.

const SAVE = 'hs-barons-save-v1';
const put = (t, k, v) => t.page.evaluate(([a, b]) => localStorage.setItem(a, b), [k, v]);
const read = (t, k) => t.page.evaluate((a) => localStorage.getItem(a), k);
export const tests = [];

// ---------- C4-01: a save from a newer version ----------
tests.push({
  name: 'C4-01 a saved game from a newer version is never written over, and the player is told once',
  viewports: ['desktop', 'mobile'],
  async run(t) {
    await start(t, { seed: 3 });
    const s = await g(t);
    s.v = 2; s.future = { note: 'written by a later build' };
    const newer = JSON.stringify(s);
    await put(t, SAVE, newer);
    await t.reload();
    await t.game('scene', 'title');
    await t.waitForStable();
    const note = t.page.locator('.title-hero .nosave');
    t.equal(await note.count(), 1, 'the title carries a notice');
    const text = await note.textContent();
    t.expect(/not being saved/.test(text) && /newer version/.test(text), `it says this visit is not saved, because the save is from a newer version (${text})`);
    t.expect(await t.page.locator('[data-go="continue"]').isDisabled(), 'Continue is off: this build cannot read that game');
    await t.shot('C4-01-newer-save-title');
    await t.checkLayout({ allowScrollY: true });
    // a full visit that would normally save: a setting changed, a game started and played
    await start(t, { seed: 9 });
    await rollTo(t, 2, 3);
    await t.waitForStable();
    t.expect(/not being saved/.test(await t.page.locator('#event').textContent()), 'the first move says once that this visit is not saved');
    await t.page.evaluate(() => document.querySelector('#b-sound').click());
    await t.game('act', 'autoplay', 3000);
    await t.waitForStable();
    t.equal(await read(t, SAVE), newer, 'the newer save is byte for byte what it was');
    await t.game('act', 'open', 'pause');
    t.equal(await t.page.locator('.dlg .nosave').count(), 1, 'the menu repeats the notice');
    await t.game('act', 'close');
    await t.game('scene', 'title');
    t.equal(await t.page.locator('.title-hero .nosave').count(), 1, 'and the title keeps it for the visit');
    t.equal(await read(t, SAVE), newer, 'still untouched on the way back to the title');
  },
});
tests.push({
  name: 'C4-01 a damaged or wrong-shaped save is handled as before: no notice, and the next game saves over it',
  viewports: ['desktop'],
  async run(t) {
    for (const bad of ['{"v":2,"players":', '{"v":"2","players":[]}', '{"v":1,"players":"x"}', '[]', 'null']) {
      await put(t, SAVE, bad);
      await t.reload();
      await t.game('scene', 'title');
      await t.waitForStable();
      t.equal(await t.page.locator('.title-hero .nosave').count(), 0, `${bad}: no notice`);
      t.expect(await t.page.locator('[data-go="continue"]').isDisabled(), `${bad}: nothing to continue`);
      await start(t, { seed: 4 });
      const kept = JSON.parse(await read(t, SAVE));
      t.equal(kept.v, 1, `${bad}: the new game was saved over it`);
    }
    await t.reload();
    await t.game('scene', 'title');
    await t.waitForStable();
    t.expect(await t.page.locator('[data-go="continue"]').isEnabled(), 'a current save still continues');
    t.equal(await t.page.locator('.title-hero .nosave').count(), 0, 'with no notice');
  },
});

// ---------- C4-04: season chips ----------
tests.push({
  name: 'C4-04 the lower quarter of every season chip lands on that chip, not on the chip below it',
  async run(t) {
    await start(t, { seed: 3 });
    if (t.viewport === 'mobile') await t.page.setViewportSize({ width: 320, height: 700 });
    // the month with the most chips, so the row wraps on a narrow phone
    let best = 0, most = 0;
    for (let m = 0; m < 12; m++) { await mod(t, (s) => { s.month = m; }); const n = await t.page.locator('#clock button.chip').count(); if (n > most) { most = n; best = m; } }
    await mod(t, (s) => { s.month = best; });
    const r = await t.page.evaluate(() => {
      const bs = [...document.querySelectorAll('#clock button.chip')], tops = new Set(bs.map((b) => Math.round(b.getBoundingClientRect().top)));
      const hit = (b, f) => { const q = b.getBoundingClientRect(), e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height * f); return !!e && e.closest('#clock button.chip') === b; };
      return { rows: tops.size, n: bs.length, lower: bs.map((b) => hit(b, 0.875)), upper: bs.map((b) => hit(b, 0.125)), mid: bs.map((b) => hit(b, 0.5)) };
    });
    if (t.viewport === 'mobile') t.expect(r.rows >= 2, `the chips wrap onto ${r.rows} rows, so a margin could cover a chip above it`);
    t.expect(r.n >= 3, `${r.n} chips`);
    t.expect(r.lower.every(Boolean), `the middle of each chip's lower quarter is on that chip (${JSON.stringify(r.lower)})`);
    t.expect(r.upper.every(Boolean) && r.mid.every(Boolean), 'and so are its upper quarter and middle');
    await t.shot('C4-04-season-chips');
    if (t.viewport === 'mobile') await t.page.setViewportSize({ width: 390, height: 844 });
  },
});

