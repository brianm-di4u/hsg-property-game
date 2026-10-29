import { start, g, act, rollTo, mod, TWO_HUMANS, click } from './helpers.mjs';

// Text contrast of every visible text element against its effective background.
const CONTRAST = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 0.99) break; } } let out = stack.pop() || { r: 255, g: 255, b: 255, a: 1 }; while (stack.length) { const c = stack.pop(); out = { r: c.r * c.a + out.r * (1 - c.a), g: c.g * c.a + out.g * (1 - c.a), b: c.b * c.a + out.b * (1 - c.a), a: 1 }; } return out; };
  const fails = [];
  const els = [...document.querySelectorAll('body *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  for (const e of els) {
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    if (cs.visibility === 'hidden' || cs.display === 'none' || r.width === 0 || e.closest('[hidden]') || e.closest('.sr-only') || e.closest('#toast') || e.closest(':disabled') || e.closest('#app[hidden]')) continue;
    if (document.querySelector('#modal:not([hidden])') && !e.closest('#modal')) continue; // behind the modal scrim
    let op = 1; for (let x = e; x; x = x.parentElement) op *= parseFloat(getComputedStyle(x).opacity);
    if (op < 0.9) continue;
    const fg = parse(cs.color), bg = bgOf(e);
    const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    if (ratio < (big ? 3 : 4.5)) fails.push(`${e.tagName}.${e.className} "${e.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}`);
  }
  return fails;
};

async function sweep(t, label) {
  const out = [];
  const check = async (where) => { const f = await t.page.evaluate(CONTRAST); if (f.length) out.push(`${where}: ${f.slice(0, 4).join('; ')}`); };
  await t.game('scene', 'title'); await check('title');
  await t.game('scene', 'help'); await check('help');
  await t.game('scene', 'settings'); await check('settings');
  await t.game('scene', 'setup'); await check('setup');
  await start(t);
  await check('game');
  await mod(t, (s) => { s.lots[5].owner = 1; s.lots[9].owner = 0; s.lots[9].mortgaged = true; });
  await t.game('act', 'open', 'deed', 31); await check('deed');
  await t.game('act', 'close'); await t.game('act', 'open', 'card', 'n-gi'); await check('card');
  await t.game('act', 'close'); await t.game('act', 'open', 'manage'); await check('manage');
  await t.game('act', 'close'); await t.game('act', 'open', 'trade', 1); await check('trade');
  await t.game('act', 'close');
  await rollTo(t, 2, 3); // Ostrich Farm is owned: rent
  await t.game('act', 'close');
  await t.game('scene', 'title');
  t.equal(out.length, 0, `${label}: text contrast ≥ 4.5:1 (${out.join(' | ') || 'all pass'})`);
}

export const tests = [
  {
    name: 'contrast light',
    colorScheme: 'light',
    async run(t) { await sweep(t, 'light'); },
  },
  {
    name: 'contrast dark',
    colorScheme: 'dark',
    async run(t) {
      await sweep(t, 'dark');
      await start(t);
      await t.shot('28-dark');
      await t.checkLayout();
    },
  },
  {
    name: 'reduced motion makes moves instant',
    reducedMotion: true,
    async run(t) {
      await start(t, {}, { fast: false });
      await t.game('act', 'dice', 3, 4);
      await act(t, { type: 'roll' });
      const idle = await t.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(window.__game.isIdle() || window.__G.anim === 0)))));
      t.expect(idle, 'no running animation after a roll');
      t.equal(await t.page.evaluate(() => window.__G.anim), 0, 'animation counter is zero');
      const s = await g(t);
      t.equal(s.players[0].pos, 7, 'moved');
    },
  },
  {
    name: 'settings persist and storage blocked',
    async run(t) {
      await t.game('scene', 'settings');
      await click(t, '[data-set="theme"][data-v="dark"]');
      await click(t, '[data-set="text"][data-v="1.25"]');
      await click(t, '[data-set="sound"][data-v="false"]');
      await t.reload();
      const st = await t.state();
      t.equal(st.settings.theme, 'dark', 'theme persisted');
      t.equal(st.settings.text, 1.25, 'text size persisted');
      t.equal(st.settings.sound, false, 'mute persisted');
      t.expect(await t.page.evaluate(() => document.body.classList.contains('theme-dark')), 'dark theme applied');
    },
  },
  {
    name: 'storage blocked still plays',
    initScript: () => { const thrower = () => { throw new Error('blocked'); }; Object.defineProperty(window, 'localStorage', { get: thrower }); },
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await rollTo(t, 2, 3);
      await act(t, { type: 'buy' });
      const s = await g(t);
      t.equal(s.lots[5].owner, 0, 'game works without storage');
      await t.game('scene', 'settings');
      await click(t, '[data-set="motion"][data-v="reduce"]');
      t.equal((await t.state()).settings.motion, 'reduce', 'settings work without storage');
    },
  },
  {
    name: 'live region and audio mute',
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await rollTo(t, 2, 3);
      await t.page.waitForFunction(() => /rolls 2 \+ 3/.test(document.getElementById('live').textContent), null, { timeout: 3000 });
      const live = await t.page.locator('#live').textContent();
      t.expect(/Ada rolls 2 \+ 3/.test(live), 'roll announced');
      t.expect(await t.page.locator('#live').getAttribute('aria-live') === 'polite', 'polite live region');
      const sounds = (await t.state()).sounds;
      t.expect(sounds.includes('dice'), 'dice sound triggered');
      await click(t, '#b-sound');
      t.equal((await t.state()).settings.sound, false, 'sound button mutes');
      t.expect(/Sound off/.test(await t.page.locator('#b-sound').getAttribute('aria-label')), 'mute state labelled');
    },
  },
];
