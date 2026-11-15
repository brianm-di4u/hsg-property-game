import { start, g, mod, HUMAN_VS_AI } from './helpers.mjs';

// Wave 3, batch E: the sound at full volume, who is heard when the game ends, spend and earn cues, rival voices,
// haptics, the dice, reduced-motion landings, the title on a short phone, board labels, the idle town and the ending.

export const tests = [];

// ---------- CL-01: nothing clips with every volume control at its maximum ----------
const MAX = { sfx: 1, music: 1, amb: 1 };
tests.push({
  name: 'CL-01 the busiest moment, with all three sliders at maximum, stays under 0.95',
  viewports: ['desktop'],
  async run(t) {
    await start(t);
    const shipped = await t.game('audioRender', 'mix', 14, false, { seed: 31 });
    const full = await t.game('audioRender', 'mix', 14, false, { seed: 31, sliders: MAX });
    t.log(`mix: shipped peak ${shipped.peak}, all sliders at maximum ${full.peak}`);
    t.expect(full.rms > shipped.rms, 'the sliders argument is read: maximum is louder than the shipped level');
    t.expect(shipped.peak < 0.95, `the shipped mix peaks at ${shipped.peak}`);
    for (const seed of [31, 32, 33]) {
      const r = await t.game('audioRender', 'mix', 14, false, { seed, sliders: MAX });
      t.expect(r.peak < 0.95, `play piece + town + the loudest cues at maximum volume peak at ${r.peak} (seed ${seed})`);
    }
  },
});
tests.push({
  name: 'CL-01 every cue, repeated at maximum effects volume, stays under 0.95',
  viewports: ['desktop'],
  async run(t) {
    await start(t);
    const names = (await t.game('audioList')).cues;
    let worst = 0, who = '';
    for (const name of names) for (let seed = 1; seed <= 6; seed++) {
      const r = await t.game('audioRender', `cue:${name}`, 2, false, { seed, sliders: { sfx: 1 }, i: seed, persona: seed % 2 ? 'speculator' : undefined });
      if (r.peak > worst) { worst = r.peak; who = name; }
    }
    t.log(`loudest cue at maximum: ${who} ${worst}`);
    t.expect(worst < 0.95, `${who} peaks at ${worst} with the effects slider at maximum`);
  },
});
