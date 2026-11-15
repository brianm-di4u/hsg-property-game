import { start, g, act, mod, AI2, TWO_HUMANS, click } from './helpers.mjs';
import * as E from '../src/js/engine.js';
import { OWNABLE } from '../src/js/data.js';

// Wave 3, batch B: selling a Grand Resort one step at a time, a faster way through the rivals' turns, bidding any
// amount, authored scenarios and the daily game, the Hot Springs stories on the deeds, and a way to look round the 3D board.

export const tests = [
  {
    name: 'P-N01 a Grand Resort sells back one step at a time, and Help says how building works',
    node: true,
    async run(t) {
      const s = E.createGame({ seed: 3, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai' }] });
      for (const i of OWNABLE) s.lots[i].owner = -1;
      const lot = 1, cost = E.buildCost(lot), half = Math.floor(cost * 0.5);
      s.lots[lot].owner = 0; s.lots[lot].level = 4; s.phase = 'post'; s.turn = 0; s.players[0].cash = 100;
      let r = E.apply(s, { type: 'sell', space: lot });
      t.expect(r.ok, 'a Grand Resort can be sold');
      t.equal(s.lots[lot].level, 3, 'it goes back to three bathhouses, not to nothing');
      t.equal(s.players[0].cash, 100 + half, 'and pays back one step, not four');
      r = E.apply(s, { type: 'sell', space: lot });
      t.equal(s.lots[lot].level, 2, 'the next sale takes one more level');
      t.equal(s.players[0].cash, 100 + 2 * half, 'for one more step');
      const { helpHtml } = await import('../src/js/ui.js');
      const html = helpHtml('rules');
      t.expect(/one level off at a time/i.test(html) && /three bathhouses/.test(html), 'Help says a resort sells back a step at a time');
      t.expect(/ahead of its neighbours/.test(html), 'and that building has no even-build rule');
    },
  },
];

// Waits for a condition on the game state (never for a fixed time); fails the test if it never comes.
async function until(t, what, ok, tries = 400) {
  let s;
  for (let k = 0; k < tries; k++) { s = await t.state(); if (s.dialog === 'card' && s.waitingOk) await t.page.click('[data-ok]'); else if (ok(s)) return s; await t.page.waitForTimeout(50); }
  t.fail(`never reached: ${what}`); return s;
}
// A one-human, one-rival table with the rival's move held, at the moment the human has ended their turn.
async function rivalToMove(t) {
  await start(t, { seats: AI2, seed: 11 }, { fast: false, pauseAI: true });
  for (let k = 0; k < 6; k++) {
    const s = await t.state();
    if (s.actor !== 0) return s;
    const L = s.legal.map((x) => x.type);
    const pick = L.includes('end') && s.game.phase === 'post' ? 'end' : L.includes('roll') ? 'roll' : L.includes('buy') ? 'buy' : L.includes('decline') ? 'decline' : L.includes('pass') ? 'pass' : L[0];
    await t.game('act', 'do', { type: pick });
    await t.waitForStable();
  }
  return t.state();
}

const skipTests = ['button', 'key'].map((how) => ({
  name: `S1-03 Skip ahead (${how}) runs the rival's turn at once, and the next move of yours is back to normal`,
  async run(t) {
    const s0 = await rivalToMove(t);
    t.equal(s0.actor, 1, 'the rival is to move');
    t.equal(s0.rush, false, 'skipping is off to begin with');
    const skip = t.page.locator('#actions .btn', { hasText: 'Skip ahead' });
    t.equal(await skip.count(), 1, 'a Skip ahead button shows while the rival plays');
    const b = await skip.boundingBox();
    t.expect(b && b.height >= 44 && b.width >= 44, `and it is a big enough target (${b && Math.round(b.width)}x${b && Math.round(b.height)})`);
    await t.checkLayout();
    await t.shot(`S1-03-skip-ahead-${how}`);
    if (how === 'button') await skip.click(); else await t.page.keyboard.press('Space');
    t.equal((await t.state()).rush, true, 'skipping is on');
    await t.game('act', 'aiPause', false);
    const s1 = await until(t, 'the human to move again', (s) => s.actor === 0 && !s.busy);
    t.equal(s1.rush, true, 'it stays on through the rest of the rivals\' moves');
    const L = s1.legal.map((x) => x.type);
    await t.game('act', 'do', { type: L.includes('roll') ? 'roll' : L.includes('pass') ? 'pass' : L.includes('buy') ? 'buy' : L[0] });
    t.equal((await t.state()).rush, false, 'and ends when the human acts');
  },
}));
tests.push(...skipTests);
tests.push({
  name: 'S1-03 Skip ahead is offered only while a rival plays, and the rival\'s think time is shorter',
  node: true,
  async run(t) {
    const src = (await import('node:fs')).readFileSync(new URL('../src/js/main.js', import.meta.url), 'utf8');
    t.expect(/AI_THINK = \{ normal: 400,/.test(src), 'the Normal think time is 400 ms (it was 650)');
    t.expect(/AI_CARD_HOLD = \{ normal: 1500,/.test(src), 'the rival\'s card is held 1500 ms (it was 2200)');
  },
});

tests.push({
  name: 'S1-04 a human can bid any amount: type it, step it with +10, +25, +50 or Max, and a bad amount is refused with a reason',
  async run(t) {
    await start(t, { seats: TWO_HUMANS, seed: 5 });
    await act(t, { type: 'roll' }); // whatever the first roll brings, send the next lot (or the one landed on) to auction
    let s = await g(t);
    if (s.phase === 'buy') await act(t, { type: 'decline' });
    else { await mod(t, (x) => { x.phase = 'roll'; x.again = false; x.pending = null; }); await t.game('act', 'dice', 2, 3); await act(t, { type: 'roll' }); await act(t, { type: 'decline' }); }
    s = await g(t);
    t.equal(s.phase, 'auction', 'an auction is open');
    await t.waitForStable();
    const field = t.page.locator('#modal [data-bidamt]');
    t.equal(await field.count(), 1, 'there is a number field beside the three presets');
    t.equal(await t.page.locator('#modal [data-bid]').count(), 3, 'and the three presets are still there');
    await t.checkLayout();
    const who = (await t.state()).actor, cash = s.players[who].cash, min = s.pending.min;
    t.equal(+(await field.inputValue()), min, 'the field starts at the lowest bid');
    const hint = () => t.page.locator('#bidhint').innerText();
    // quick raises and Max fill the field
    await t.page.locator('#modal [data-bidadd="25"]').click();
    t.equal(+(await field.inputValue()), min + 25, '+25 adds 25');
    await t.page.locator('#modal [data-bidadd="10"]').click();
    t.equal(+(await field.inputValue()), min + 35, '+10 adds 10 to what is typed');
    await t.page.locator('#modal [data-bidmax]').click();
    t.equal(+(await field.inputValue()), cash, 'Max is all your cash');
    await t.shot('S1-04-bid-field');
    // a bad amount is refused and says why
    for (const [v, re] of [['5', /lowest bid/], [String(cash + 10), /You have/], ['', /whole number/], ['12.5', /whole number/]]) {
      await field.fill(v);
      await t.page.locator('#modal [data-bidgo]').click();
      t.equal((await g(t)).pending.bid, 0, `"${v}" places no bid`);
      t.expect(re.test(await hint()), `"${v}" is explained: ${await hint()}`);
    }
    // a good amount, with the button
    await field.fill('130');
    await t.page.locator('#modal [data-bidgo]').click();
    await t.waitForStable();
    s = await g(t);
    t.equal(s.pending.bid, 130, 'a typed amount is bid as it is');
    t.equal(s.pending.leader, who, 'by the baron who typed it');
    // the next baron: the field starts again at the new lowest bid, and Enter bids
    const next = (await t.state()).actor;
    t.expect(next !== who, 'the other baron is up');
    const f2 = t.page.locator('#modal [data-bidamt]');
    t.equal(+(await f2.inputValue()), 140, 'the next field starts at the new lowest bid');
    await f2.fill('205');
    await f2.press('Enter');
    await t.waitForStable();
    t.equal((await g(t)).pending.bid, 205, 'Enter in the field bids');
    await t.checkLayout();
  },
});
tests.push({
  name: 'S1-04 a baron who cannot cover the next bid has the field switched off and is told to drop out',
  viewports: ['desktop'],
  async run(t) {
    await start(t, { seats: TWO_HUMANS, seed: 5 });
    await t.game('act', 'dice', 2, 3); await act(t, { type: 'roll' }); await act(t, { type: 'decline' });
    await mod(t, (x) => { x.players[(x.pending.order || [0, 1])[0]].cash = 5; x.players[0].cash = 5; x.players[1].cash = 5; });
    await t.waitForStable();
    t.expect(await t.page.locator('#modal [data-bidamt]').isDisabled(), 'the field is off');
    t.expect(/drop out/.test(await t.page.locator('#bidhint').innerText()), 'and the hint says to drop out');
  },
});

tests.push({
  name: 'S4-01 the Pythian, Woodmen, Ohio Club and Arlington deeds tell their stories, and every displayed fact still checks out',
  node: true,
  async run(t) {
    const { SPACES } = await import('../src/js/data.js');
    const fact = (name) => SPACES.find((sp) => sp.name === name).fact.text;
    t.expect(/Malvern Avenue/.test(fact('Pythian Bathhouse')) && /half-price/.test(fact('Pythian Bathhouse')), 'the Pythian deed says where it stood and who got half-price baths');
    t.expect(/African American fraternal group/.test(fact('Woodmen of Union')) && /Count Basie/.test(fact('Woodmen of Union')), 'the Woodmen deed says whose building it was and who played there');
    t.expect(/casino and sports book until 1967/.test(fact('Ohio Club')), 'the Ohio Club deed says what it was for');
    t.expect(/Capone/.test(fact('Arlington Hotel')) && /disputed/.test(fact('Arlington Hotel')), 'the Arlington deed has Capone, flagged as disputed');
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(process.execPath, ['tools/check-facts.mjs'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
    t.equal(r.status, 0, 'tools/check-facts.mjs passes: ' + (r.stdout.match(/FAIL.*/g) || []).join('; '));
  },
});

// ---- S4-21: looking round the 3D board
const view = (t) => t.game('view');
const settle3d = (t) => t.waitForStable();
async function canvasCentre(t) { const b = await t.page.locator('#board').boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; }

tests.push({
  name: 'S4-21 the 3D board zooms with the wheel and the + - 0 keys, pans with a drag, and the view button resets it',
  url: 'index.html?gl=3d',
  async run(t) {
    await start(t);
    t.equal((await t.game('boardMode')).mode, '3d', 'the 3D table is on');
    await settle3d(t);
    const v0 = await view(t);
    t.equal(v0.user, false, 'the automatic camera to begin with');
    const [cx, cy] = await canvasCentre(t);
    await t.page.mouse.move(cx, cy);
    await t.page.mouse.wheel(0, -400);
    await settle3d(t);
    const v1 = await view(t);
    t.expect(v1.user && v1.dist < v0.dist * 0.9, `the wheel zooms in (${v0.dist.toFixed(1)} to ${v1.dist.toFixed(1)})`);
    t.equal(await t.page.locator('#b-view').getAttribute('aria-label'), 'Reset the view', 'the view button now says Reset the view');
    await t.shot('S4-21-zoomed');
    // a drag pans, and does not open a deed when it ends
    const before = await view(t);
    await t.page.mouse.move(cx, cy); await t.page.mouse.down(); await t.page.mouse.move(cx - 60, cy - 40, { steps: 6 }); await t.page.mouse.move(cx - 120, cy - 80, { steps: 6 }); await t.page.mouse.up();
    await settle3d(t);
    const after = await view(t);
    t.expect(Math.hypot(after.tx - before.tx, after.tz - before.tz) > 0.05, `a drag moves the view (${before.tx.toFixed(2)},${before.tz.toFixed(2)} to ${after.tx.toFixed(2)},${after.tz.toFixed(2)})`);
    t.equal((await t.state()).dialog, null, 'and the end of the drag opens no deed');
    // keys
    await t.page.keyboard.press('-'); await settle3d(t);
    t.expect((await view(t)).dist > after.dist, 'the minus key zooms out');
    await t.page.keyboard.press('+'); await t.page.keyboard.press('+'); await settle3d(t);
    t.expect((await view(t)).dist < after.dist, 'the plus key zooms in');
    // the view button, and a roll, put the automatic camera back
    await t.page.click('#b-view'); await settle3d(t);
    const v2 = await view(t);
    t.expect(!v2.user && Math.abs(v2.dist - v0.dist) < 0.05, 'Reset the view returns to the whole board');
    await t.page.keyboard.press('+'); await settle3d(t);
    t.expect((await view(t)).user, 'zoomed again');
    await t.page.keyboard.press('0'); await settle3d(t);
    t.expect(!(await view(t)).user, 'the 0 key resets too');
    await t.page.keyboard.press('+'); await settle3d(t);
    await act(t, { type: 'roll' }); await settle3d(t);
    t.expect(!(await view(t)).user, 'a roll gives the camera back so it can follow the move');
    // a plain click still reads a deed
    if ((await t.page.locator('#b-view').getAttribute('aria-label')) === 'Show the whole board') await t.page.click('#b-view');
    await settle3d(t);
    const p = await t.game('spaceScreen', 31);
    await t.page.mouse.click(p[0], p[1]); await t.waitForStable();
    t.equal((await t.state()).dialog, 'deed', 'a plain click on a space still opens its deed');
  },
});

tests.push({
  name: 'S4-21 a gamepad rolls, steps between buttons, opens and closes the Menu and moves the 3D view',
  url: 'index.html?gl=3d',
  viewports: ['desktop'],
  async run(t) {
    await start(t);
    await settle3d(t);
    await t.page.evaluate(() => {
      const btn = () => ({ pressed: false, value: 0 });
      window.__pad = { index: 0, connected: true, id: 'test pad', buttons: Array.from({ length: 17 }, btn), axes: [0, 0, 0, 0] };
      navigator.getGamepads = () => [window.__pad];
      window.dispatchEvent(new Event('gamepadconnected'));
      window.__frames = (n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    });
    const press = async (i) => { await t.page.evaluate((i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; return window.__frames(3); }, i); await t.page.evaluate((i) => { window.__pad.buttons[i] = { pressed: false, value: 0 }; return window.__frames(3); }, i); };
    t.equal((await g(t)).phase, 'roll', 'it is time to roll');
    await press(0);
    await until(t, 'A to roll the dice', (s) => s.game.phase !== 'roll');
    await press(1);
    t.equal((await t.state()).dialog, 'pause', 'B opens the Menu');
    await press(13);
    t.expect(await t.page.evaluate(() => !!document.querySelector('#modal :focus')), 'the d-pad moves focus to a button in the Menu');
    await press(1);
    t.equal((await t.state()).dialog, null, 'B closes it');
    const v0 = await view(t);
    await t.page.evaluate(() => { window.__pad.axes = [0, 0, 0, -1]; return window.__frames(40); });
    await t.page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; });
    await settle3d(t);
    const v1 = await view(t);
    t.expect(v1.user && v1.dist < v0.dist * 0.9, 'the right stick zooms in');
    await t.page.evaluate(() => { window.__pad.axes = [1, 0, 0, 0]; return window.__frames(20); });
    await t.page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; });
    await settle3d(t);
    const v2 = await view(t);
    t.expect(Math.hypot(v2.tx - v1.tx, v2.tz - v1.tz) > 0.05, 'the left stick moves the view');
  },
});
