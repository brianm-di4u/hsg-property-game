// Shared helpers for Bathhouse Barons tests (imported by the harness's test files).
export const HUMAN_VS_AI = [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'hotelier' }, { kind: 'ai', persona: 'speculator' }, { kind: 'ai', persona: 'banker' }];
export const TWO_HUMANS = [{ kind: 'human', name: 'Ada' }, { kind: 'human', name: 'Ben' }];

// Starts a seeded game with AI paused and animations off.
export async function start(t, opts = {}, { fast = true, pauseAI = true } = {}) {
  await t.game('act', 'fast', fast);
  await t.game('act', 'aiPause', pauseAI);
  await t.seed(opts.seed ?? 7);
  const r = await t.game('newGame', { seats: HUMAN_VS_AI, ...opts });
  await t.waitForStable();
  return r;
}
export const g = (t) => t.state().then((s) => s.game);
export const act = (t, a) => t.game('act', 'do', a);
export async function settle(t) { await t.waitForStable(); }
// Plays AI moves (in the page) until a human must act or the game ends.
export async function runAI(t, max = 400) {
  for (let k = 0; k < max; k++) {
    const s = await t.state();
    if (!s.game || s.game.ended) return s;
    if (s.game.players[s.actor].kind !== 'ai') return s;
    await t.game('act', 'ai');
  }
  return t.state();
}

// Edits the live engine state in Node and loads it back (setState).
export async function mod(t, fn) {
  const s = await g(t);
  fn(s);
  await t.game('setState', { game: s });
  await t.waitForStable();
  return s;
}
export async function rollTo(t, a, b) { await t.game('act', 'dice', a, b); return act(t, { type: 'roll' }); }
export const AI2 = [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'showman' }];
// Center of an element, for real mouse or touch input.
export async function centerOf(t, sel) {
  const loc = t.page.locator(sel).first();
  if (!(await loc.count())) return null;
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  return b ? [b.x + b.width / 2, b.y + b.height / 2] : null;
}
export async function click(t, sel) { const c = await centerOf(t, sel); if (!c) { t.fail(`no element ${sel}`); return false; } await t.page.mouse.click(c[0], c[1]); return true; }
// Center of board space i in page coordinates.
export async function spaceAt(t, i) {
  return t.page.evaluate((i) => {
    const cv = document.getElementById('board'), r = cv.getBoundingClientRect(), v = window.__G && cv;
    const W = r.width, H = r.height, ux = W / 10, uy = H / 10, cw = 1.5 * ux, ch = 1.5 * uy;
    let x, y, w, h;
    if (i === 0) [x, y, w, h] = [W - cw, H - ch, cw, ch];
    else if (i < 8) [x, y, w, h] = [W - cw - i * ux, H - ch, ux, ch];
    else if (i === 8) [x, y, w, h] = [0, H - ch, cw, ch];
    else if (i < 16) [x, y, w, h] = [0, H - ch - (i - 8) * uy, cw, uy];
    else if (i === 16) [x, y, w, h] = [0, 0, cw, ch];
    else if (i < 24) [x, y, w, h] = [cw + (i - 17) * ux, 0, ux, ch];
    else if (i === 24) [x, y, w, h] = [W - cw, 0, cw, ch];
    else [x, y, w, h] = [W - cw, ch + (i - 25) * uy, cw, uy];
    void v;
    return [r.left + x + w / 2, r.top + y + h / 2];
  }, i);
}
