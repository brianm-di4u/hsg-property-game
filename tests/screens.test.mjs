import { click } from './helpers.mjs';

export const tests = [
  {
    name: 'title',
    async run(t) {
      await t.game('scene', 'title');
      const txt = await t.page.locator('#screen').innerText();
      for (const w of ['New game', 'Continue', 'How to play', 'Settings', 'About']) t.expect(txt.includes(w), `title has ${w}`);
      t.expect(await t.page.locator('[data-go="continue"]').isDisabled(), 'Continue disabled without a save');
      await t.shot('01-title');
      await t.checkLayout();
    },
  },
  {
    name: 'help and about',
    async run(t) {
      await t.game('scene', 'help');
      for (const [tab, name] of [['rules', '02-help-rules'], ['seasons', '02-help-seasons'], ['cards', '02-help-cards'], ['controls', '02-help-controls']]) {
        await click(t, `[data-tab="${tab}"]`);
        await t.waitForStable();
        const sel = await t.page.locator(`[data-tab="${tab}"]`).getAttribute('aria-selected');
        t.equal(sel, 'true', `${tab} tab selected`);
        if (tab === 'cards') t.expect(/Great Fire of 1913/.test(await t.page.locator('#screen').innerText()), 'cards tab lists Headlines');
        await t.shot(name);
        await t.checkLayout({ allowScrollY: true });
      }
      await t.game('scene', 'about');
      const about = await t.page.locator('#screen').innerText();
      t.expect(/MIT/.test(about), 'MIT license named');
      t.expect(/Landlord's Game/.test(about), 'heritage line');
      t.expect(/748,626/.test(about), 'patent cited');
      await t.shot('03-about');
      await t.checkLayout({ allowScrollY: true });
    },
  },
  {
    name: 'setup',
    async run(t) {
      await t.game('scene', 'title');
      await click(t, '[data-go="setup"]');
      await t.waitForStable();
      t.equal((await t.state()).scene, 'setup', 'setup screen');
      t.equal(await t.page.locator('.seat').count(), 4, 'four seats by default');
      await t.shot('04-setup');
      await t.checkLayout({ allowScrollY: true });
      await click(t, '[data-add]'); await click(t, '[data-add]');
      t.equal(await t.page.locator('.seat').count(), 6, 'six seats');
      t.expect(await t.page.locator('[data-add]').isDisabled(), 'no seventh seat');
      await click(t, '[data-kind="human"][data-k="1"]');
      await click(t, '[data-seg="mode"][data-v="short"]');
      await click(t, '[data-seg="variant"][data-v="common"]');
      await t.page.selectOption('[data-persona="2"]', 'gambler');
      await t.shot('04-setup-6');
      await t.checkLayout({ allowScrollY: true });
      await t.game('act', 'aiPause', true);
      await click(t, '[data-start]');
      await t.waitForStable();
      const s = (await t.state()).game;
      t.equal(s.players.length, 6, 'six barons');
      t.equal(s.players[1].kind, 'human', 'seat 2 is human');
      t.equal(s.players[2].persona, 'gambler', 'chosen persona');
      t.equal(s.opts.mode, 'short', 'short game'); t.equal(s.opts.variant, 'common', 'Common Ground');
      await t.shot('04-game-6');
      await t.checkLayout();
    },
  },
  {
    name: 'settings screen',
    async run(t) {
      await t.game('scene', 'settings');
      await t.shot('30-settings');
      await t.checkLayout({ allowScrollY: true });
    },
  },
];
