import { start, g, act, mod } from './helpers.mjs';
import * as E from '../src/js/engine.js';
import { OWNABLE, SPACES, LOTS_BY_D, DISTRICTS } from '../src/js/data.js';

// Wave 3, batch D: greyed-out actions say why, a rival's refusal of a trade says why, the last build, sale or mortgage
// can be taken back, and the results screen says why the winner won.

export const tests = [];

// ---------- S2-04: unavailable actions say why ----------
const FV = LOTS_BY_D.ra, BP = LOTS_BY_D.bp;
function table() {
  const s = E.createGame({ seed: 4, seats: [{ kind: 'human', name: 'Ada' }, { kind: 'ai', persona: 'banker' }] });
  for (const i of OWNABLE) s.lots[i].owner = -1;
  s.phase = 'roll'; s.turn = 0; s.pending = null; s.built = [];
  return s;
}
tests.push({
  name: 'S2-04 the engine says why a build, mortgage or lift is refused, and says nothing when it is allowed',
  node: true,
  async run(t) {
    const s = table(), name = DISTRICTS.ra.name;
    s.lots[FV[0]].owner = 0;
    t.equal(E.whyNot(s, 0, 'build', FV[0]), `Need all ${FV.length} ${name} lots`, 'a lone lot: the district is not complete');
    for (const i of FV) s.lots[i].owner = 0;
    t.equal(E.whyNot(s, 0, 'build', FV[0]), '', 'a whole district with cash: nothing to say');
    s.players[0].cash = E.buildCost(FV[0]) - 15;
    t.equal(E.whyNot(s, 0, 'build', FV[0]), 'Short $15', 'cash short by $15 says so');
    s.players[0].cash = 1000; s.built = [FV[0]];
    t.equal(E.whyNot(s, 0, 'build', FV[0]), 'Built this turn', 'one level per lot per turn');
    s.built = []; s.lots[FV[1]].mortgaged = true;
    t.expect(/mortgage/i.test(E.whyNot(s, 0, 'build', FV[0])), 'a mortgaged lot in the district blocks building');
    s.lots[FV[1]].mortgaged = false; s.lots[FV[0]].level = 4;
    t.equal(E.whyNot(s, 0, 'build', FV[0]), 'Already a Grand Resort', 'the top level');
    s.lots[FV[0]].level = 1;
    t.expect(/buildings/i.test(E.whyNot(s, 0, 'mortgage', FV[1])), 'a lot in a built district cannot be mortgaged');
    s.lots[FV[0]].level = 0; s.lots[FV[2]].mortgaged = true; s.players[0].cash = 10;
    t.equal(E.whyNot(s, 0, 'unmortgage', FV[2]), `Short $${E.unmortgageCost(FV[2]) - 10}`, 'lifting a mortgage you cannot afford');
    t.equal(E.whyNot(s, 0, 'build', BP[0]), '', 'a lot you do not own: nothing');
    // Wherever the engine's own legal list allows an action there is no reason.
    s.players[0].cash = 1000;
    for (const k of ['build', 'mortgage', 'unmortgage']) for (const i of OWNABLE) {
      if (E.legal(s).some((a) => a.type === k && a.space === i)) t.equal(E.whyNot(s, 0, k, i), '', `${k} ${i} is legal, so no reason`);
    }
  },
});
tests.push({
  name: 'S2-04 Manage and Buy say what is missing under the greyed-out button',
  async run(t) {
    await start(t, { seed: 3 });
    await mod(t, (s) => {
      for (const i of OWNABLE) s.lots[i].owner = -1;
      s.lots[FV[0]].owner = 0; s.lots[BP[0]].owner = 0; s.lots[BP[1]].owner = 0; s.lots[BP[2]].owner = 0;
      s.players[0].cash = 1000; s.phase = 'roll';
    });
    await t.game('act', 'open', 'manage');
    await t.waitForStable();
    const rows = await t.page.evaluate(() => [...document.querySelectorAll('#modal .mlist li')].map((li) => {
      const b = li.querySelector('[data-act="build"]'), w = li.querySelector('.why'), vis = !!w && w.getBoundingClientRect().height > 0;
      return { name: li.querySelector('.lname').textContent, buildOff: !!b && b.disabled, why: w ? w.textContent : '', vis, by: b ? b.getAttribute('aria-describedby') : null, id: w ? w.id : null };
    }));
    const fv = rows.find((r) => r.buildOff && /Need all/.test(r.why));
    t.expect(!!fv, 'the lone Roadside lot says what is missing');
    t.equal(fv && fv.why, `Build: Need all ${FV.length} ${DISTRICTS.ra.name} lots`, 'in words');
    t.expect(fv && fv.vis && fv.by === fv.id, 'the line is on screen and the disabled button points at it');
    const ok = rows.filter((r) => !r.buildOff);
    t.expect(ok.length >= 3 && ok.every((r) => r.why === ''), 'lots that can build say nothing');
    await mod(t, (s) => { s.players[0].cash = 20; });
    await t.game('act', 'open', 'manage');
    await t.waitForStable();
    const txt = await t.page.locator('#modal').innerText();
    t.expect(/Build: Short \$\d+/.test(txt), 'with $20 the complete district says how much is short');
    await t.shot('S2-04-manage-why');
    await t.checkLayout();
    await t.page.keyboard.press('Escape');
    // Buy: the button says how much more the lot needs.
    await mod(t, (s) => { s.phase = 'buy'; s.pending = { kind: 'buy', space: BP[1] }; s.players[0].cash = SPACES[BP[1]].price - 40; });
    await t.waitForStable();
    const buy = t.page.locator('#actions .btn[data-key="B"]');
    t.expect(await buy.isDisabled(), 'Buy is greyed out when the cash is short');
    t.expect(/need \$40 more/.test(await buy.innerText()), 'and says "need $40 more"');
    t.expect(/you need \$40 more/.test(await buy.getAttribute('aria-label')), 'and a screen reader hears it');
    await t.shot('S2-04-buy-short');
    await t.checkLayout();
    await mod(t, (s) => { s.players[0].cash = SPACES[BP[1]].price; });
    t.expect(!(await buy.isDisabled()) && !/need/.test(await buy.innerText()), 'with the cash the button is plain and live');
  },
});
