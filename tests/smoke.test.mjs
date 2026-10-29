import { start, g } from './helpers.mjs';
export const tests = [
  {
    name: 'loads to the title with hooks',
    async run(t) {
      const s = await t.state();
      t.equal(s.scene, 'title', 'starts on the title');
      t.expect(t.loadMs < 2000, `hooks ready in ${t.loadMs} ms`);
      await t.shot('01-title');
      await t.checkLayout();
    },
  },
  {
    name: 'board renders',
    async run(t) {
      await start(t);
      const s = await g(t);
      t.equal(s.players.length, 4, 'four barons');
      t.equal(Object.keys(s.lots).length, 25, '25 ownable spaces');
      await t.shot('05-board');
      await t.checkLayout();
    },
  },
];
