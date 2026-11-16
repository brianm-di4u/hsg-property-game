import { start, g, act, rollTo } from './helpers.mjs';
import { SPACES } from '../src/js/data.js';

// Wave 4, batch B: the action bar while pieces move, key repeat, the balance bands, the seed on the results screen and
// a rematch with the same deal, the audio error count, and a settings blob that is not trusted.

const SETS = 'hs-barons-settings-v1';
export const tests = [];

// ---------- S1-08: the buttons stay put while the pieces move ----------
tests.push({
  name: 'S1-08 the action buttons stay in the bar, switched off, with the skip hint written under them while the pieces move',
  async run(t) {
    await start(t, { seed: 7 }, { fast: false });
    await t.page.evaluate(() => { window.__G.settings.motion = 'full'; });
    await t.game('act', 'dice', 2, 3);
    // the click and the reading are one page call: the bar is redrawn the moment the move starts, and nothing can finish in between
    const box = () => t.page.evaluate(() => { const b = document.querySelector('#board').getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(Math.round); });
    const was = await box();
    const r = await t.page.evaluate(() => {
      const before = [...document.querySelectorAll('#actions .btn')].map((b) => b.textContent.replace(/\s+/g, ' ').trim());
      document.querySelector('#actions [data-key="R"]').click();
      const bar = document.querySelector('#actions'), note = bar.querySelector('.ai-note.moving');
      const btns = [...bar.querySelectorAll('.btn')];
      const keep = btns.filter((b) => !b.classList.contains('ghost'));
      const nb = note && note.getBoundingClientRect(), low = Math.max(...btns.map((b) => b.getBoundingClientRect().bottom));
      return { before, labels: btns.map((b) => b.textContent.replace(/\s+/g, ' ').trim()), noteText: note ? note.textContent : '', allOff: keep.every((b) => b.disabled), n: keep.length, under: !!nb && nb.top >= low - 1, busy: window.__G.busy };
    });
    t.expect(r.busy, 'the move is under way');
    t.expect(/Buy/.test(r.labels.join('|')) && /Auction/.test(r.labels.join('|')), `the buttons are still there (${r.labels.join(', ')})`);
    t.expect(r.n >= 2 && r.allOff, 'and every one of them that can act is switched off');
    t.expect(/skip/.test(r.noteText), `the hint says how to skip (${r.noteText})`);
    t.expect(r.under, 'and it sits under the buttons, not beside them');
    await t.waitFrames(4);
    t.equal(JSON.stringify(await box()), JSON.stringify(was), 'the board does not move or change size when the hint appears');
    await t.shot('S1-08-moving', { wait: false });
    await t.page.keyboard.press(' ');
    await t.page.waitForFunction(() => !window.__G.busy);
    await t.waitForStable();
    t.equal(await t.page.locator('#actions .ai-note.moving').count(), 0, 'the hint is gone when the move is over');
    t.expect(await t.page.locator('#actions .btn:not(.ghost):not(:disabled)').count() >= 1, 'and the buttons work again');
  },
});

// ---------- S6-15: a held key does not repeat its action ----------
tests.push({
  name: 'S6-15 a held key repeats nothing but the arrows and the zoom keys',
  async run(t) {
    await start(t, { seed: 7 });
    await rollTo(t, 2, 3);
    await act(t, { type: 'buy' });
    await t.waitForStable();
    const key = (k, repeat) => t.page.evaluate(([key, rep]) => { document.dispatchEvent(new KeyboardEvent('keydown', { key, repeat: rep, bubbles: true, cancelable: true })); }, [k, repeat]);
    const turn = async () => (await g(t)).turn;
    const t0 = await turn();
    t.equal((await g(t)).phase, 'post', 'the turn is ready to end');
    await key('e', true); await key('E', true); await t.waitForStable();
    t.equal(await turn(), t0, 'a held E does not end the turn');
    await key('p', true); await key('Escape', true); await t.waitForStable();
    t.equal(await t.page.locator('.dlg').count(), 0, 'a held P or Escape does not open the Menu');
    await key('Escape', false); await t.waitForStable();
    t.equal(await t.page.locator('.dlg').count(), 1, 'one press of Escape does');
    await key('Escape', true); await t.waitForStable();
    t.equal(await t.page.locator('.dlg').count(), 1, 'and a held Escape does not close it again');
    await key('Escape', false); await t.waitForStable();
    t.equal(await t.page.locator('.dlg').count(), 0, 'a fresh press closes it');
    // the arrows keep repeating: holding one walks the board cursor along
    await t.game('act', 'cursor', 3);
    await key('ArrowRight', true); await key('ArrowRight', true); await t.waitForStable();
    await t.page.waitForFunction(() => /Press Enter for the deed/.test(document.querySelector('#live').textContent));
    const said = await t.page.locator('#live').textContent();
    t.expect(said.includes(SPACES[4].name) && said.includes(SPACES[5].name), `a held arrow still walks the board cursor (${said})`);
    await key('e', false); await t.waitForStable();
    t.expect(await turn() !== t0, 'one press of E still ends the turn');
  },
});

// ---------- S3-10: the balance tool is part of npm test ----------
tests.push({
  name: 'S3-10 tools/balance.mjs --quick finishes with no band out, rows for the exploit baron and the dearest starting lots included',
  node: true,
  async run(t) {
    const { spawnSync } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const root = fileURLToPath(new URL('..', import.meta.url));
    // Seeded (games 9000+k and 5000+k), so a rerun prints the same numbers. A band is wide enough that a different set of seeds
    // would leave it with chance under 1 in 7000 over all rows (4.5 standard errors; the reasoning is at the top of the tool).
    const r = spawnSync(process.execPath, ['tools/balance.mjs', '30', '4', '--quick'], { cwd: root, encoding: 'utf8', timeout: 240000 });
    t.equal(r.status, 0, `the tool exits 0 (stderr: ${(r.stderr || '').slice(0, 200)})`);
    const rows = r.stdout.split('\n').filter((l) => /\s(ok|OUT)$/.test(l));
    const out = rows.filter((l) => /OUT$/.test(l));
    t.expect(rows.length >= 20, `it prints its rows (${rows.length})`);
    t.equal(out.length, 0, `no row is out of its band: ${out.join(' | ')}`);
    t.expect(rows.some((l) => /Trade exploit baron/.test(l)), 'there is a row for the trade exploit baron');
    t.expect(rows.some((l) => /winner had the dearest starting lots/.test(l)), 'and one for the winner holding the dearest starting lots');
    t.expect(/Errors: 0 /.test(r.stdout), 'no game raised an error');
    t.log(r.stdout.split('\n').filter((l) => /^Errors:/.test(l)).join(''));
  },
});

// ---------- S3-11: the results screen shows the seed and can deal the same game again ----------
tests.push({
  name: 'S3-11 the results screen shows the seed, and Same deal again deals the same lots, cards and barons',
  async run(t) {
    const SHORT = { mode: 'short' };
    await start(t, { seed: 4242, ...SHORT });
    const first = await g(t);
    await t.game('act', 'autoplay', 100000);
    await t.waitForStable();
    t.equal(await t.page.evaluate(() => window.__game.getState().scene), 'over', 'the game is over');
    const line = await t.page.locator('.over .seedline').textContent();
    t.expect(/Seed 4242\b/.test(line), `the results screen names the seed (${line})`);
    await t.page.locator('.over .row').scrollIntoViewIfNeeded();
    await t.shot('S3-11-results-seed');
    await t.checkLayout({ allowScrollY: true });
    const btn = t.page.locator('.over [data-same]');
    t.equal(await btn.count(), 1, 'there is a Same deal again button');
    t.expect((await btn.boundingBox()).height >= 40, 'and it is a full-size button');
    await btn.click();
    await t.waitForStable();
    const again = await g(t);
    t.equal(await t.page.evaluate(() => window.__game.getState().scene), 'game', 'it starts a new game');
    t.equal(again.seed, 4242, 'with the same seed');
    t.equal(again.round, 1, 'from the start');
    const owners = (s) => Object.keys(s.lots).map((i) => s.lots[i].owner).join(',');
    t.equal(owners(again), owners(first), 'the same lots dealt to the same barons');
    t.equal(JSON.stringify(again.decks), JSON.stringify(first.decks), 'and the same cards in the same order');
    t.equal(again.players.map((p) => `${p.name}/${p.persona}`).join('|'), first.players.map((p) => `${p.name}/${p.persona}`).join('|'), 'the same barons at the table');
    t.equal(again.opts.mode, 'short', 'under the same rules');
    // Play again is still a fresh deal
    await t.game('act', 'autoplay', 100000);
    await t.waitForStable();
    await t.page.locator('.over [data-again]').click();
    await t.waitForStable();
    t.expect((await g(t)).seed !== 4242, 'Play again still deals a new game');
  },
});
tests.push({
  name: 'S3-11 a daily game keeps Play again as its same deal and shows no seed',
  viewports: ['desktop'],
  async run(t) {
    await t.game('act', 'fast', true);
    await t.game('act', 'aiPause', true);
    await t.game('newGame', { seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'banker' }, { kind: 'ai', persona: 'showman' }, { kind: 'ai', persona: 'hotelier' }], mode: 'short', seed: 777, daily: '2026-11-16' });
    await t.waitForStable();
    await t.game('act', 'autoplay', 100000);
    await t.waitForStable();
    t.equal(await t.page.locator('.over .seedline').count(), 0, 'no seed line');
    t.equal(await t.page.locator('.over [data-same]').count(), 0, 'no second button');
    t.equal(await t.page.locator('.over [data-again]').count(), 1, 'Play again is there');
  },
});
