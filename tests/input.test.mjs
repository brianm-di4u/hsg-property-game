// Real input only: mouse clicks and key presses (no setState, no act('do')).
import { click } from './helpers.mjs';

async function humanTurns(t, turns, useKeys) {
  let ended = 0, guard = 0, actions = 0;
  while (ended < turns && guard++ < 400) {
    await t.page.waitForFunction(() => { const s = window.__game.getState(); return window.__game.isIdle() && (!s.game || s.game.ended || s.game.players[s.actor]?.kind === 'human' || s.dialog === 'card'); }, null, { timeout: 15000 });
    const st = await t.state();
    const s = st.game;
    if (!s || s.ended || st.scene !== 'game') break;
    const press = async (k, sel) => { actions++; if (useKeys) await t.page.keyboard.press(k); else await click(t, sel); };
    if (st.dialog === 'card') { actions++; if (useKeys) await t.page.keyboard.press('Enter'); else await click(t, '#modal [data-ok]'); continue; }
    if (st.dialog === 'deed' || st.dialog === 'manage') { await t.page.keyboard.press('Escape'); continue; }
    if (s.players[st.actor].kind !== 'human') continue;
    if (s.phase === 'roll') await press('r', '#actions [data-key="R"]');
    else if (s.phase === 'buy') { if (s.players[st.actor].cash >= 400) await press('b', '#actions [data-key="B"]'); else await press('a', '#actions [data-key="A"]'); }
    else if (s.phase === 'post') { await press('e', '#actions [data-key="E"]'); if (!s.again) ended++; }
    else if (s.phase === 'auction') { actions++; await click(t, '#modal [data-pass]'); }
    else if (s.phase === 'debt') { actions++; await click(t, '#modal [data-act]:not([disabled])'); }
    else if (s.phase === 'trade') { actions++; await click(t, '#modal [data-resp="0"]'); }
    else break;
  }
  return { ended, actions };
}

export const tests = [
  {
    name: 'real clicks play several turns against the AI',
    async run(t) {
      await t.game('act', 'fast', true);
      await t.seed(21);
      await click(t, '[data-go="setup"]');
      for (const k of [3, 2]) await click(t, `[data-rm="${k}"]`); // Ada vs one AI
      await click(t, '[data-start]');
      const r = await humanTurns(t, 6, false);
      t.expect(r.ended >= 6, `ended ${r.ended} turns by clicking (${r.actions} actions)`);
      const s = (await t.state()).game;
      t.expect(s.round >= 6, `reached month ${s.round}`);
      t.expect(s.log.some((l) => /^Player 1 rolls/.test(l)), 'the human rolled');
      t.expect(s.log.some((l) => /^Odessa Marlow rolls/.test(l)), 'the AI played too');
      await t.shot('25-input-after');
      await t.checkLayout();
    },
  },
  {
    name: 'keyboard-only: menus and turns',
    viewports: ['desktop'],
    async run(t) {
      await t.game('act', 'fast', true);
      await t.seed(5);
      // Title → setup by keyboard: New game has focus.
      await t.page.keyboard.press('Enter');
      t.equal((await t.state()).scene, 'setup', 'Enter opens setup');
      // Tab to the Start button (last control) and press it.
      for (let k = 0; k < 60; k++) { const f = await t.page.evaluate(() => document.activeElement && document.activeElement.dataset.start != null); if (f) break; await t.page.keyboard.press('Tab'); }
      await t.page.keyboard.press('Enter');
      await t.waitForStable();
      t.equal((await t.state()).scene, 'game', 'game started by keyboard');
      const r = await humanTurns(t, 3, true);
      t.expect(r.ended >= 3, `three turns by keys (${r.actions} key actions)`);
      // Board cursor and deed by keyboard
      await t.page.focus('#board');
      await t.page.keyboard.press('ArrowRight');
      await t.page.keyboard.press('Enter');
      t.equal((await t.state()).dialog, 'deed', 'Enter opens a deed');
      await t.page.keyboard.press('Escape');
      t.equal((await t.state()).dialog, null, 'Esc closes it');
      await t.page.keyboard.press('p');
      t.equal((await t.state()).dialog, 'pause', 'P opens the menu');
      await t.page.keyboard.press('Escape');
    },
  },
];
