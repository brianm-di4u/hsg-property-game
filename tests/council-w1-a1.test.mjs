import { start, g, act, mod, rollTo, TWO_HUMANS, click } from './helpers.mjs';
import * as E from '../src/js/engine.js';
import { OWNABLE, SPACES } from '../src/js/data.js';

// Debt for Ada with only a transit line (4) or the Water Co. (10) to sell: the Raise cash dialog must open.
const debtOwning = (space) => async (t) => {
  await start(t, { seats: TWO_HUMANS });
  await mod(t, (s) => { s.players[0].cash = 20; s.lots[space].owner = 0; s.lots[5].owner = 1; s.lots[6].owner = 1; s.lots[7].owner = 1; s.lots[5].level = 1; s.month = 3; });
  await rollTo(t, 2, 3);
  t.equal((await g(t)).phase, 'debt', 'in debt');
  t.equal((await t.state()).dialog, 'debt', 'Raise cash dialog opened');
  t.equal(await t.page.locator(`#modal [data-act="build"], #modal [data-act="sell"]`).count(), 0, 'no Build or Sell button for a line or utility');
  await click(t, `#modal [data-act="mortgage"][data-i="${space}"]`);
  await t.waitForStable();
  const s = await g(t);
  t.expect(s.lots[space].mortgaged, 'mortgaged from the dialog');
  t.equal(s.phase, 'post', 'debt paid, turn resumes');
};

export const tests = [
  { name: 'S1-01 debt dialog opens when the debtor owns only a transit line', run: debtOwning(4) },
  { name: 'S1-01 debt dialog opens when the debtor owns only the Water Co.', run: debtOwning(10) },
  {
    name: 'S1-01 Manage opens for an owner of a line and the utility',
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await mod(t, (s) => { s.lots[4].owner = 0; s.lots[10].owner = 0; s.lots[1].owner = 0; s.phase = 'post'; });
      await t.game('act', 'open', 'manage');
      t.equal((await t.state()).dialog, 'manage', 'Manage dialog open');
      t.equal(await t.page.locator('#modal [data-act="build"][data-i="4"], #modal [data-act="build"][data-i="10"], #modal [data-act="sell"][data-i="4"], #modal [data-act="sell"][data-i="10"]').count(), 0, 'no Build or Sell on line or utility');
      t.equal(await t.page.locator('#modal [data-act="mortgage"][data-i="4"]').count(), 1, 'line can be mortgaged');
      t.equal(await t.page.locator('#modal [data-act="mortgage"][data-i="10"]').count(), 1, 'utility can be mortgaged');
      t.equal(await t.page.locator('#modal [data-act="build"][data-i="1"]').count(), 1, 'lots keep Build');
      await t.checkLayout();
    },
  },
  {
    name: 'S6-01 engine cost and worth helpers accept every ownable space',
    node: true,
    async run(t) {
      const s = E.createGame({ seed: 3, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'human', name: 'Ben' }] });
      for (const i of OWNABLE) {
        let cost;
        try { cost = E.buildCost(i); } catch (e) { t.fail(`buildCost(${i}) threw: ${e.message}`); continue; }
        if (SPACES[i].type !== 'lot') t.equal(cost, 0, `${SPACES[i].name} has no build cost`);
        s.lots[i].owner = 0;
        t.expect(Number.isFinite(E.lotWorth(s, i)) && Number.isFinite(E.netWorth(s, 0)), `worth of ${SPACES[i].name} is a number`);
      }
    },
  },
  {
    name: 'S6-07 AI turns wait while the tab is hidden and resume when it returns',
    async run(t) {
      await start(t, { seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }] });
      await rollTo(t, 2, 3); await act(t, { type: 'buy' }); await act(t, { type: 'end' });
      await t.waitForStable();
      const vis = (hidden) => t.page.evaluate((h) => {
        Object.defineProperty(document, 'hidden', { value: h, configurable: true });
        Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      }, hidden);
      const before = await g(t);
      t.equal((await t.state()).game.players[(await t.state()).actor].kind, 'ai', 'an AI is to act');
      await vis(true);
      await t.game('act', 'aiPause', false);
      await t.page.waitForTimeout(800);
      const during = await g(t);
      t.equal(JSON.stringify(during.log), JSON.stringify(before.log), 'no AI move while hidden');
      t.equal(during.turn, before.turn, 'still the AI turn');
      await vis(false);
      await t.page.waitForFunction((n) => window.__game.getState().game.log.length > n, before.log.length, { timeout: 8000 });
      t.expect((await g(t)).log.length > before.log.length, 'the AI acted once visible');
    },
  },
  {
    name: 'S6-06 lost WebGL context falls back to the flat board',
    url: 'index.html?gl=3d',
    viewports: ['desktop'],
    async run(t) {
      await t.waitForStable();
      t.equal((await t.game('boardMode')).mode, '3d', '3D table on');
      const prevented = await t.page.evaluate(() => {
        const ev = new Event('webglcontextlost', { cancelable: true });
        document.getElementById('board').dispatchEvent(ev);
        return ev.defaultPrevented;
      });
      t.expect(prevented, 'context loss is claimed so a restore could follow');
      await t.waitForStable();
      const m = await t.game('boardMode');
      t.equal(m.mode, '2d', 'flat board after the loss');
      t.equal(m.why, 'lost', 'reason recorded');
    },
  },
  {
    name: 'S6-06 slow-frame watchdog measures the gap between frames, not CPU submit time',
    url: 'index.html?gl=3d',
    viewports: ['desktop'],
    async run(t) {
      await t.waitForStable();
      t.equal((await t.game('boardMode')).mode, '3d', '3D table on');
      await start(t);
      // a clock where every animation frame is 60 ms after the last (a GPU-bound phone): draw calls stay cheap
      await t.page.evaluate(() => {
        let fake = performance.now();
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (cb) => raf(() => { fake += 60; cb(fake); });
        performance.now = () => fake;
      });
      for (let k = 0; k < 75; k++) await t.page.evaluate((k) => { window.__game.act('cursor', k % 40); return new Promise((r) => requestAnimationFrame(() => r())); }, k);
      await t.game('act', 'do', { type: 'roll' });
      await t.waitForStable();
      const m = await t.game('boardMode');
      t.equal(m.mode, '2d', 'fell back to the flat board');
      t.equal(m.why, 'slow', 'because frames were slow');
    },
  },
  {
    name: 'S2-11 starting a new game asks before replacing a saved one',
    async run(t) {
      await start(t);
      await rollTo(t, 2, 3); await act(t, { type: 'buy' });
      const saved = await g(t);
      await t.reload();
      await click(t, '[data-go="setup"]');
      await click(t, '[data-start]');
      t.equal((await t.state()).dialog, 'replace', 'asks first');
      t.expect(/March|January|February|April|May|June|July|August|September|October|November|December/.test(await t.page.locator('#modal').innerText()), 'names the saved month');
      await t.shot('60-replace-save');
      await t.checkLayout();
      await click(t, '#modal [data-ok]');
      t.equal((await t.state()).dialog, null, 'dialog closed');
      t.equal((await t.state()).scene, 'setup', 'still on setup');
      const kept = await t.page.evaluate(() => JSON.parse(localStorage.getItem('hs-barons-save-v1')));
      t.equal(JSON.stringify(kept.log), JSON.stringify(saved.log), 'Cancel keeps the saved game');
      await click(t, '[data-start]');
      await click(t, '#modal [data-replace]');
      await t.waitForStable();
      t.equal((await t.state()).scene, 'game', 'Replace starts the new game');
      t.expect((await g(t)).log.length <= 2, 'a fresh game');
    },
  },
  {
    name: 'S2-11 no prompt when there is no saved game',
    async run(t) {
      await t.page.evaluate(() => localStorage.clear());
      await t.reload();
      await t.game('act', 'aiPause', true);
      await click(t, '[data-go="setup"]');
      await click(t, '[data-start]');
      await t.waitForStable();
      t.equal((await t.state()).scene, 'game', 'starts straight away');
    },
  },
  {
    name: 'S6-08 a save written by another tab stops this tab from overwriting it',
    async run(t) {
      await start(t);
      const mine = await t.page.evaluate(() => localStorage.getItem('hs-barons-save-v1'));
      const other = await t.page.evaluate(() => {
        const o = JSON.parse(localStorage.getItem('hs-barons-save-v1')); o.log.push('Written by another tab.');
        const v = JSON.stringify(o); localStorage.setItem('hs-barons-save-v1', v);
        window.dispatchEvent(new StorageEvent('storage', { key: 'hs-barons-save-v1', newValue: v, oldValue: null, storageArea: localStorage }));
        return v;
      });
      t.expect(other !== mine, 'the other tab changed the save');
      t.equal((await t.state()).dialog, 'stale', 'warning shown');
      await t.shot('61-save-changed');
      await t.checkLayout();
      const r = await act(t, { type: 'roll' });
      t.expect(!r.ok, 'this tab can no longer act');
      t.equal(await t.page.evaluate(() => localStorage.getItem('hs-barons-save-v1')), other, "the other tab's save is untouched");
      await t.page.keyboard.press('Escape');
      t.equal((await t.state()).dialog, 'stale', 'the warning cannot be dismissed');
      await click(t, '#modal [data-stale]');
      t.equal((await t.state()).scene, 'title', 'back on the title');
      t.expect(!(await t.page.locator('[data-go="continue"]').isDisabled()), 'Continue offers the newest save');
    },
  },
  {
    name: 'S6-08 an unrelated storage event is ignored',
    async run(t) {
      await start(t);
      await t.page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'hs-barons-settings-v1', newValue: '{}' })));
      t.equal((await t.state()).dialog, null, 'no warning');
    },
  },
];
