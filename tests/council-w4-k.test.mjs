import { PERSONA_KEYS } from '../src/js/data.js';

// Wave 4, clean-up pass: a human baron's portrait choice says it is a portrait, and two human seats never wear one face.

export const tests = [];

// ---------- K-01 ----------
tests.push({
  name: 'K-01 the portrait choice is labelled as a portrait and a face a human seat has taken is not offered to another',
  async run(t) {
    await t.game('scene', 'setup');
    await t.waitForStable();
    const opts = (k) => t.page.evaluate((k) => [...document.querySelectorAll(`select[data-face="${k}"] option`)].map((o) => [o.value, o.textContent]), k);
    const first = await opts(0);
    t.expect(first.length === 1 + PERSONA_KEYS.length && first.every(([, label]) => /^Portrait: /.test(label)), `every entry says it is a portrait (${first.map((o) => o[1])})`);
    await t.page.locator('[data-kind="human"][data-k="1"]').click();
    await t.waitForStable();
    t.equal(await t.page.locator('select[data-face]').count(), 2, 'two human seats, two portrait choices');
    await t.page.selectOption('select[data-face="0"]', 'banker');
    await t.waitForStable();
    const second = (await opts(1)).map((o) => o[0]);
    t.expect(!second.includes('banker') && second.includes('hotelier') && second.includes(''), `seat 2 no longer offers the face seat 1 took (${second})`);
    t.expect((await opts(0)).some(([v]) => v === 'banker'), 'seat 1 still offers its own face');
    await t.page.selectOption('select[data-face="1"]', 'hotelier');
    await t.waitForStable();
    t.expect(!(await opts(0)).some(([v]) => v === 'hotelier'), 'and seat 1 is not offered the one seat 2 took');
    t.equal(await t.page.locator('.seat[data-k="1"] img.seatface').count(), 1, 'seat 2 wears its own face');
    await t.shot('K-01-two-portraits');
    await t.checkLayout({ allowScrollY: true });
    await t.page.locator('[data-kind="ai"][data-k="0"]').click();
    await t.page.locator('[data-kind="human"][data-k="0"]').click();
    await t.waitForStable();
    const back = (await opts(0)).map((o) => o[0]);
    t.expect(!back.includes('hotelier'), `a human seat coming back never doubles up a taken face (${back})`);
  },
});
