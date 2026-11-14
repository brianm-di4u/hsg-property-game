import fs from 'node:fs';

// Follow-up S3-02: the Career button made six title buttons; they must fit the first screen wherever five did in wave 1.
const COUNCIL = new URL('../../_council/hsg-property-game/wave-2/', import.meta.url);
function keep(name, file) {
  try { if (fs.existsSync(COUNCIL)) { fs.mkdirSync(new URL('shots/', COUNCIL), { recursive: true }); fs.copyFileSync(file, new URL(`shots/${name}.png`, COUNCIL)); } } catch (e) { /* shots are a courtesy */ }
}
// [width, height, how many of the six buttons must be fully inside the window]
const SIZES = [[1920, 1080, 6], [800, 1100, 6], [768, 1024, 6], [390, 844, 6], [1024, 600, 5]];

export const tests = [
  {
    name: 'S3-02 the six title buttons fit the first screen where five did',
    viewports: ['desktop'],
    async run(t) {
      await t.game('scene', 'title');
      for (const [w, h, need] of SIZES) {
        await t.page.setViewportSize({ width: w, height: h });
        await t.waitForStable();
        const r = await t.page.evaluate(() => [...document.querySelectorAll('.menu .btn')].map((e) => { const b = e.getBoundingClientRect(); return { go: e.dataset.go, top: b.top, bottom: b.bottom }; }));
        t.equal(r.length, 6, 'six title buttons');
        const inside = r.filter((b) => b.top >= 0 && b.bottom <= h).length;
        t.expect(inside >= need, `${w}x${h}: ${inside} of 6 buttons inside the window (need ${need}); bottoms ${r.map((b) => `${b.go}:${Math.round(b.bottom)}`).join(' ')}`);
        if (w === 800 || w === 390) { const shot = await t.shot(`title-${w}x${h}`); keep(`S3-02-title-${w}x${h}`, shot.file); }
      }
    },
  },
];
