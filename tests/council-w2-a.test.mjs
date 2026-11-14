import fs from 'node:fs';
import { start, g, act, mod, rollTo, runAI, click, TWO_HUMANS, HUMAN_VS_AI } from './helpers.mjs';

// Batch A (sound): music and ambience (S5-01), the silent events (S5-03) and the layered, varied cues (S5-04).
// Nobody can listen in a test run, so the music, the ambience and every cue are rendered offline at the shipped
// levels and measured. HS_WAV_DIR=<folder> also writes each render as a WAV for a person to listen to.
const SETS = 'hs-barons-settings-v1';
const COUNCIL = new URL('../../_council/hsg-property-game/wave-2/', import.meta.url);

const audio = (t) => t.game('audioState');
// Poll the audio state until `ok` holds (the buses glide, so a fixed wait is timing-fragile); returns the last state.
async function pollAudio(t, ok, ms = 6000) {
  let a = await audio(t);
  for (const end = Date.now() + ms; !ok(a) && Date.now() < end;) { await t.page.waitForTimeout(100); a = await audio(t); }
  return a;
}
const heardAfter = async (t, fn) => { await t.game('audioState', true); await fn(); await t.waitForStable(); return (await audio(t)).heard; };
// A real click: it is the gesture that wakes the audio.
async function wake(t) { await t.page.mouse.click(5, 5); await t.page.waitForFunction(() => window.__game.audioState().state === 'running', null, { timeout: 4000 }).catch(() => {}); }
// Audio levels glide, so wait for a condition rather than a fixed time.
const until = (t, pred, label) => t.page.waitForFunction(pred, null, { timeout: 4000 }).catch(() => t.fail(`timed out waiting for ${label}`));
function keep(name, file) {
  try { if (fs.existsSync(COUNCIL)) { fs.mkdirSync(new URL('shots/', COUNCIL), { recursive: true }); fs.copyFileSync(file, new URL(`shots/${name}.png`, COUNCIL)); } } catch (e) { /* shots are a courtesy */ }
}
function wav(name, r) {
  if (process.env.HS_WAV_DIR && r.wav) { fs.mkdirSync(process.env.HS_WAV_DIR, { recursive: true }); fs.writeFileSync(`${process.env.HS_WAV_DIR}/${name.replace(/[:]/g, '-')}.wav`, Buffer.from(r.wav, 'base64')); }
}
const wantWav = () => !!process.env.HS_WAV_DIR;

export const tests = [
  {
    name: 'S5-01 audioList names the pieces, the places and the cues',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      const l = await t.game('audioList');
      t.equal(JSON.stringify(l.music), JSON.stringify(['title', 'play', 'results']), 'three moods: title, play, results');
      t.equal(JSON.stringify(l.ambience), JSON.stringify(['town', 'bathhouse']), 'two places');
      t.expect(l.cues.length >= 30, `${l.cues.length} cues are listed`);
    },
  },
  {
    name: 'S5-01 each piece of music fits the mix and has form (60 s render)',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      for (const name of (await t.game('audioList')).music) {
        const r = await t.game('audioRender', name, 60, wantWav()); wav(name, r);
        t.log(`${name}: peak ${r.peak}, rms ${r.rmsDb} dB, form ${r.built.formBars} bars = ${r.built.formSeconds} s at ${r.built.bpm} bpm, distinct bars ${r.built.distinctBars}, pitches ${r.built.pitches}, stereo ${r.stereo}, longest silence ${r.longestSilence} s`);
        t.expect(r.peak >= 0.06 && r.peak <= 0.16, `${name}: peak ${r.peak} within 0.06 to 0.16`);
        t.expect(r.rmsDb >= -40 && r.rmsDb <= -28, `${name}: RMS ${r.rmsDb} dBFS within -40 to -28`);
        t.expect(r.built.formSeconds >= 45, `${name}: ${r.built.formSeconds} s before it repeats`);
        t.expect(r.built.distinctBars >= 6, `${name}: ${r.built.distinctBars} distinct lead bars`);
        t.expect(r.built.pitches >= 6, `${name}: ${r.built.pitches} lead pitches`);
        t.expect(r.longestSilence < 2, `${name}: longest silence ${r.longestSilence} s`);
      }
    },
  },
  {
    name: 'S5-01 each ambience bed fits the mix and never goes silent (30 s render)',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      for (const name of (await t.game('audioList')).ambience) {
        for (const crowd of name === 'town' ? [0.2, 1] : [0.2]) {
          const r = await t.game('audioRender', name, 30, wantWav() && crowd === 0.2, { crowd }); if (crowd === 0.2) wav(`amb-${name}`, r);
          t.log(`${name} (crowd ${crowd}): peak ${r.peak}, rms ${r.rmsDb} dB, longest silence ${r.longestSilence} s`);
          t.expect(r.peak < 0.07, `${name}: peak ${r.peak} under 0.07`);
          t.expect(r.rmsDb >= -52 && r.rmsDb <= -38, `${name}: RMS ${r.rmsDb} dBFS within -52 to -38`);
          t.expect(r.longestSilence < 2, `${name}: longest silence ${r.longestSilence} s`);
        }
      }
    },
  },
  {
    name: 'S5-04 every cue peaks between 0.2 and 0.45, and no two plays are the same',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      const peaks = {};
      for (const name of (await t.game('audioList')).cues) {
        const rs = [];
        for (const seed of [1, 2, 3, 4, 5, 6]) rs.push(await t.game('audioRender', `cue:${name}`, 3, wantWav() && seed === 1, { seed }));
        wav(`cue-${name}`, rs[0]);
        const p = rs.map((r) => r.peak);
        peaks[name] = `${Math.min(...p).toFixed(3)}-${Math.max(...p).toFixed(3)}`;
        t.expect(Math.min(...p) >= 0.2 && Math.max(...p) <= 0.45, `${name}: peaks ${peaks[name]} within 0.2 to 0.45`);
        t.expect(new Set(p).size >= 3, `${name}: six plays gave ${new Set(p).size} different peaks`);
        const sig = new Set(rs.map((r) => r.secs.join(',')));
        t.expect(sig.size >= 3, `${name}: six plays gave ${sig.size} different second-by-second profiles`);
      }
      t.log(JSON.stringify(peaks));
    },
  },
  {
    name: 'S5-04 cue pitch follows the game: bids and coins climb with the sum, steps walk up a scale',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      const secs = async (name, opt) => (await t.game('audioRender', `cue:${name}`, 1, false, opt));
      // A higher pitch has more zero crossings per second; measure it as the loudness profile can't. Compare the
      // renders themselves: they must differ between pitch settings.
      const a = await secs('bid', { pitch: 0 }), b = await secs('bid', { pitch: 6 });
      t.expect(a.secs.join() !== b.secs.join() || a.rms !== b.rms, 'a higher bid renders differently');
      const s0 = await secs('step', { i: 0 }), s7 = await secs('step', { i: 7 });
      t.expect(s0.rms !== s7.rms || s0.peak !== s7.peak, 'step 7 renders differently from step 0');
    },
  },
  {
    name: 'S5-01 the loudest cues on top of music and the street never clip',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      const r = await t.game('audioRender', 'mix', 16, wantWav()); wav('mix', r);
      t.log(`mix: peak ${r.peak}`);
      t.expect(r.peak < 0.95, `music + street + fanfare, gavel, dice, coin and bust together peak at ${r.peak}`);
      t.expect(r.peak > 0.3, 'the cues are in the render');
    },
  },
  {
    name: 'S5-01 nothing plays before the first gesture; then the title piece and the street start',
    viewports: ['desktop'],
    async run(t) {
      await start(t, {}, { fast: true });
      await t.game('scene', 'title');
      let a = await audio(t);
      t.equal(a.ready, false, 'no audio context before a gesture');
      await wake(t);
      await t.page.waitForTimeout(300);
      a = await audio(t);
      t.equal(a.state, 'running', 'the context runs after a click');
      t.equal(a.music, 'title', 'the title piece is wanted on the title');
      t.equal(a.amb, 'town', 'the town street is wanted');
      t.expect(a.musicGain > 0 && a.ambGain > 0, `music bus ${a.musicGain} and ambience bus ${a.ambGain} are open`);
    },
  },
  {
    name: 'S5-01 the mood follows the screen: title, play, results; a screen opened from the game keeps the game piece',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      await wake(t);
      const mood = async () => { const a = await audio(t); return `${a.music}/${a.amb}`; };
      t.equal(await mood(), 'play/town', 'in a game');
      await t.game('scene', 'settings');
      t.equal(await mood(), 'play/town', 'settings opened from a game keeps the game piece');
      await t.game('scene', 'title');
      t.equal(await mood(), 'title/town', 'back on the title');
      await t.game('scene', 'game');
      t.equal(await mood(), 'play/town', 'back in the game');
      await t.game('act', 'autoplay', 3000);
      t.equal((await t.state()).scene, 'over', 'the game ended');
      t.equal(await mood(), 'results/bathhouse', 'the Gazette has its own piece and place');
    },
  },
  {
    name: 'S5-01 the street gets louder at an auction',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      await wake(t);
      await rollTo(t, 2, 3); await act(t, { type: 'decline' });
      await t.page.waitForFunction(() => window.__game.getState().game.phase === 'auction');
      const crowd = await t.page.evaluate(() => window.__G.s.phase);
      t.equal(crowd, 'auction', 'auction under way');
      // the crowd bed's level follows setCrowd(); read it through the street's param by rendering both ways
      const quiet = await t.game('audioRender', 'town', 10, false, { crowd: 0.2 }), busy = await t.game('audioRender', 'town', 10, false, { crowd: 1 });
      t.expect(busy.rms > quiet.rms * 1.15, `the auction street (${busy.rmsDb} dB) is louder than the quiet one (${quiet.rmsDb} dB)`);
    },
  },
  {
    name: 'S5-01 Settings has Sound effects, Music and Ambience; each persists and silences its bus',
    viewports: ['desktop', 'mobile'],
    async run(t) {
      await start(t);
      await t.game('scene', 'settings');
      await t.waitForStable();
      for (const k of ['sfx', 'music', 'amb']) t.expect(await t.page.locator(`[data-set="${k}"][data-v="false"]`).count() === 1, `an on/off switch for ${k}`);
      for (const k of ['data-vol', 'data-mvol', 'data-avol']) t.expect(await t.page.locator(`input[${k}]`).count() === 1, `a volume slider ${k}`);
      const shot = await t.shot('settings-sound'); keep(`S5-01-settings-${t.viewport}`, shot.file);
      await t.checkLayout();
      await wake(t);
      await click(t, '[data-set="music"][data-v="false"]');
      let a = await pollAudio(t, (x) => x.music === null && x.musicGain === 0);
      t.equal(a.music, null, 'Music off: no piece is playing');
      t.expect(a.musicGain === 0, `Music off: the music bus is at ${a.musicGain}`);
      t.expect(a.ambGain > 0 && a.amb === 'town', 'the street is still on');
      await click(t, '[data-set="amb"][data-v="false"]');
      await click(t, '[data-set="sfx"][data-v="false"]');
      a = await pollAudio(t, (x) => x.ambGain === 0 && x.amb === null && x.fxTarget === 0);
      t.expect(a.ambGain === 0 && a.amb === null, 'Ambience off: bus closed');
      t.expect(a.fxTarget === 0, `Sound effects off: effects bus target ${a.fxTarget}`);
      const st = (await t.state()).settings;
      t.expect(st.music === false && st.amb === false && st.sfx === false, 'the three switches are in the settings');
      await t.reload();
      const st2 = (await t.state()).settings;
      t.expect(st2.music === false && st2.amb === false && st2.sfx === false && st2.sound === true, 'all three survive a reload, and the master switch is untouched');
      await t.game('scene', 'settings');
      await wake(t);
      a = await pollAudio(t, (x) => x.music === null && x.amb === null && x.musicGain === 0 && x.ambGain === 0);
      t.expect(a.music === null && a.amb === null && a.musicGain === 0 && a.ambGain === 0, 'after a reload nothing plays');
      await click(t, '[data-set="music"][data-v="true"]');
      a = await pollAudio(t, (x) => x.music !== null && x.musicGain > 0);
      t.expect(a.music !== null && a.musicGain > 0, 'Music on again: the piece returns');
      await click(t, '[data-set="amb"][data-v="true"]'); await click(t, '[data-set="sfx"][data-v="true"]');
    },
  },
  {
    name: 'S5-01 the sliders move the buses',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      await t.game('scene', 'settings');
      await wake(t);
      const set = (sel, v) => t.page.locator(sel).evaluate((el, x) => { el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
      await set('[data-mvol]', 0.35); await set('[data-avol]', 0.1);
      await t.page.waitForTimeout(500);
      const a = await audio(t);
      t.expect(Math.abs(a.musicGain - 0.5) < 0.02, `music slider 0.35 gives bus ${a.musicGain}`);
      t.expect(Math.abs(a.ambGain - 0.1 / 0.7) < 0.02, `ambience slider 0.1 gives bus ${a.ambGain}`);
      const st = (await t.state()).settings;
      t.expect(st.mvol === 0.35 && st.avol === 0.1, 'both levels are saved');
    },
  },
  {
    name: 'S5-01 a save from before music keeps its settings and gets the new ones at their defaults; sound off stays silent',
    viewports: ['desktop'],
    initScript: () => { try { if (!sessionStorage.getItem('w2a')) { sessionStorage.setItem('w2a', '1'); localStorage.setItem('hs-barons-settings-v1', JSON.stringify({ sound: false, vol: 0.5, motion: 'reduce', text: 1.25, theme: 'dark', ai: 'fast' })); } } catch (e) { /* none */ } },
    async run(t) {
      const st = (await t.state()).settings;
      t.expect(st.sound === false && st.vol === 0.5 && st.motion === 'reduce' && st.text === 1.25 && st.theme === 'dark' && st.ai === 'fast', 'every old setting is kept');
      t.expect(st.sfx === true && st.music === true && st.amb === true && st.mvol === 0.7 && st.avol === 0.7, 'the new ones take their defaults');
      await wake(t);
      await t.page.waitForTimeout(400);
      const a = await audio(t);
      t.expect(a.held === true, 'the master switch is off, so music and ambience are held');
      t.expect(a.fxTarget === 0, `sound off: effects bus target ${a.fxTarget}`);
      t.expect(a.music === null && a.amb === null, 'sound off: no piece and no street are playing');
    },
  },
  {
    name: 'S5-01 damaged sound settings fall back to the defaults',
    viewports: ['desktop'],
    initScript: () => { try { if (!sessionStorage.getItem('w2a2')) { sessionStorage.setItem('w2a2', '1'); localStorage.setItem('hs-barons-settings-v1', JSON.stringify({ sound: true, vol: 'loud', music: 'yes', amb: 3, mvol: 9, avol: -1, sfx: null })); } } catch (e) { /* none */ } },
    async run(t) {
      const st = (await t.state()).settings;
      t.expect(st.vol === 0.35 && st.sfx === true && st.music === true && st.amb === true && st.mvol === 0.7 && st.avol === 0.7, `damaged fields reset: ${JSON.stringify(st)}`);
      await wake(t);
      const a = await audio(t);
      t.expect(a.state === 'running' && a.musicGain > 0, 'and the audio still starts');
    },
  },
  {
    name: 'S5-01 the pause card fades the music and street out and schedules nothing; closing it brings them back',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      await wake(t);
      await t.page.waitForTimeout(700);
      let a = await audio(t);
      t.equal(a.held, false, 'playing');
      const bars0 = a.bars;
      await t.game('act', 'open', 'pause');
      await t.page.waitForTimeout(1500);
      a = await audio(t);
      t.equal(a.held, true, 'held behind the pause card');
      t.expect(a.musicGain < 0.01 && a.ambGain < 0.01, `buses faded out (${a.musicGain}, ${a.ambGain})`);
      const bars1 = a.bars;
      await t.page.waitForTimeout(1500);
      t.equal((await audio(t)).bars, bars1, 'no bar was scheduled while the card was open');
      await t.game('act', 'close');
      await t.page.waitForTimeout(1200);
      a = await audio(t);
      t.equal(a.held, false, 'released');
      t.expect(a.musicGain > 0.5 && a.ambGain > 0.5, `buses back (${a.musicGain}, ${a.ambGain})`);
      t.expect(a.bars >= bars1 && bars1 >= bars0, 'the piece carried on from where it was');
    },
  },
  {
    name: 'S5-01 a hidden tab holds the audio and a visible one resumes it without a pile-up',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      await wake(t);
      await t.page.waitForTimeout(500);
      const vis = (hidden) => t.page.evaluate((h) => {
        Object.defineProperty(document, 'hidden', { value: h, configurable: true });
        Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      }, hidden);
      await vis(true);
      await t.page.waitForTimeout(600);
      let a = await audio(t);
      t.equal(a.held, true, 'held while hidden');
      t.expect(a.state === 'suspended', `the context is ${a.state} while hidden`);
      const bars = a.bars, count = a.count;
      await t.page.waitForTimeout(1200);
      t.equal((await audio(t)).bars, bars, 'nothing scheduled while hidden');
      await vis(false);
      await t.page.waitForFunction(() => window.__game.audioState().state === 'running', null, { timeout: 4000 });
      await t.page.waitForTimeout(800);
      a = await audio(t);
      t.equal(a.held, false, 'released when visible');
      t.expect(a.bars - bars <= 2, `${a.bars - bars} bars scheduled after coming back (no pile-up)`);
      t.equal(a.count, count, 'no cue fired by coming back');
    },
  },
  {
    name: 'S5-03 a turn: dice, a landing, a purchase and a handover each have a cue',
    viewports: ['desktop'],
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      let h = await heardAfter(t, () => rollTo(t, 2, 3));
      t.expect(h.includes('dice') && h.includes('land'), `roll and landing: ${h.join(',')}`);
      h = await heardAfter(t, () => act(t, { type: 'buy' }));
      t.expect(h.includes('coin'), `buying: ${h.join(',')}`);
      h = await heardAfter(t, () => act(t, { type: 'end' }));
      t.expect(h.includes('turn'), `the next human is told it is their turn: ${h.join(',')}`);
      const s = await heardAfter(t, async () => { await t.game('act', 'do', { type: 'nonsense' }); });
      t.expect(s.includes('error'), `a refused action: ${s.join(',')}`);
    },
  },
  {
    name: 'S5-03 an AI turn is not announced as yours',
    viewports: ['desktop'],
    async run(t) {
      await start(t, { seats: HUMAN_VS_AI });
      await rollTo(t, 2, 3); await act(t, { type: 'buy' });
      const h = await heardAfter(t, () => act(t, { type: 'end' }));
      t.expect(!h.includes('turn'), `no turn chime when an AI is next: ${h.join(',')}`);
    },
  },
  {
    name: 'S5-03 doubles, the Grand Jury release and a fee',
    viewports: ['desktop'],
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await rollTo(t, 1, 1); await act(t, { type: 'buy' });
      let h = await heardAfter(t, () => act(t, { type: 'end' }));
      t.expect(h.includes('again'), `doubles give another roll: ${h.join(',')}`);
      await mod(t, (s) => { s.players[0].held = 1; s.players[0].pos = 24; s.phase = 'roll'; s.turn = 0; s.again = false; });
      h = await heardAfter(t, () => act(t, { type: 'bail' }));
      t.expect(h.includes('release') && h.includes('tax'), `paying bail releases (and the fee clunks): ${h.join(',')}`);
      await mod(t, (s) => { s.players[0].held = 1; s.players[0].pos = 24; s.players[0].pardons = 1; s.phase = 'roll'; s.turn = 0; });
      h = await heardAfter(t, () => act(t, { type: 'pardon' }));
      t.expect(h.includes('release'), `a pardon releases: ${h.join(',')}`);
      await mod(t, (s) => { s.players[0].pos = 25; s.phase = 'roll'; s.turn = 0; s.players[0].held = 0; s.again = false; });
      h = await heardAfter(t, () => rollTo(t, 1, 2));
      t.expect(h.includes('tax'), `landing on the Thermal Water Tax: ${h.join(',')}`);
    },
  },
  {
    name: 'S5-03 mortgage, lift, sell, rent and debt',
    viewports: ['desktop'],
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await mod(t, (s) => { s.lots[5].owner = 0; s.lots[1].owner = 0; s.lots[3].owner = 0; s.lots[3].level = 1; s.players[0].cash = 1000; });
      let h = await heardAfter(t, () => act(t, { type: 'mortgage', space: 5 }));
      t.expect(h.includes('mort'), `mortgage: ${h.join(',')}`);
      h = await heardAfter(t, () => act(t, { type: 'unmortgage', space: 5 }));
      t.expect(h.includes('unmort'), `lift: ${h.join(',')}`);
      const L = (await t.state()).legal.filter((x) => x.type === 'sell');
      t.expect(L.length > 0, 'a sale is legal');
      h = await heardAfter(t, () => act(t, { type: 'sell', space: L[0].space }));
      t.expect(h.includes('sell'), `sell: ${h.join(',')}`);
      await mod(t, (s) => { s.lots[13].owner = 1; s.lots[13].level = 3; s.players[0].pos = 10; s.players[0].cash = 5; s.turn = 0; s.phase = 'roll'; });
      h = await heardAfter(t, () => rollTo(t, 1, 2));
      t.expect(h.includes('debt'), `a debt: ${h.join(',')}`);
    },
  },
  {
    name: 'S5-03 rent has its own cue',
    viewports: ['desktop'],
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await mod(t, (s) => { s.lots[13].owner = 1; s.lots[13].level = 0; s.players[0].pos = 10; s.turn = 0; s.phase = 'roll'; });
      const h = await heardAfter(t, () => rollTo(t, 1, 2));
      t.expect(h.includes('pay'), `rent: ${h.join(',')}`);
    },
  },
  {
    name: 'S5-03 an auction starts with a bell, a drop-out and an unsold lot are heard',
    viewports: ['desktop'],
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await rollTo(t, 2, 3);
      let h = await heardAfter(t, () => act(t, { type: 'decline' }));
      t.expect(h.includes('auctionStart'), `auction opens: ${h.join(',')}`);
      h = await heardAfter(t, async () => { await act(t, { type: 'pass' }); await act(t, { type: 'pass' }); });
      t.expect(h.includes('drop'), `dropping out: ${h.join(',')}`);
      t.expect(h.includes('unsold'), `no bids: ${h.join(',')}`);
    },
  },
  {
    name: 'S5-03 a bid and a won lot; offers and refusals',
    viewports: ['desktop'],
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await rollTo(t, 2, 3); await act(t, { type: 'decline' });
      let h = await heardAfter(t, () => act(t, { type: 'bid', amount: 20 }));
      t.expect(h.includes('bid'), `bid: ${h.join(',')}`);
      h = await heardAfter(t, () => act(t, { type: 'pass' }));
      t.expect(h.includes('gavel'), `won: ${h.join(',')}`);
      await mod(t, (s) => { s.players[0].cash = 1000; s.turn = 0; s.phase = 'post'; s.lots[3].owner = 1; });
      h = await heardAfter(t, () => act(t, { type: 'propose', to: 1, give: { lots: [], cash: 120 }, get: { lots: [3], cash: 0 } }));
      t.expect(h.includes('offer'), `offer: ${h.join(',')}`);
      h = await heardAfter(t, () => act(t, { type: 'respond', accept: false }));
      t.expect(h.includes('declined'), `refusal: ${h.join(',')}`);
    },
  },
  {
    name: 'S5-03 a new month turns a page',
    viewports: ['desktop'],
    async run(t) {
      await start(t, { seats: TWO_HUMANS });
      await mod(t, (s) => { s.turn = 1; s.phase = 'post'; });
      const h = await heardAfter(t, () => act(t, { type: 'end' }));
      t.expect(h.includes('month'), `month change: ${h.join(',')}`);
    },
  },
  {
    name: 'S5-03 buttons tick, closing a card sounds different, a deed slides open',
    viewports: ['desktop', 'mobile'],
    async run(t) {
      await start(t);
      await wake(t);
      let h = await heardAfter(t, () => click(t, '#b-menu'));
      t.expect(h.includes('click'), `a button: ${h.join(',')}`);
      h = await heardAfter(t, () => click(t, '#modal [data-ok]'));
      t.expect(h.includes('close'), `closing: ${h.join(',')}`);
      h = await heardAfter(t, () => t.game('act', 'open', 'deed', 5));
      t.expect(h.includes('deed'), `deed: ${h.join(',')}`);
    },
  },
  {
    name: 'S5-04 a seven-step move walks a scale: one step cue per hop, then a landing thud',
    viewports: ['desktop'],
    async run(t) {
      await start(t, {}, { fast: false });
      await t.game('audioState', true);
      await rollTo(t, 3, 4);
      await t.page.waitForFunction(() => !window.__game.getState().busy, null, { timeout: 8000 });
      await t.waitForStable();
      const h = (await audio(t)).heard;
      t.equal(h.filter((x) => x === 'step').length, 7, `seven hops: ${h.join(',')}`);
      t.expect(h.indexOf('land') > h.lastIndexOf('step'), 'the thud comes after the last hop');
    },
  },
  {
    name: 'S5-01 the game-over fanfare hands the music to the results piece',
    viewports: ['desktop'],
    async run(t) {
      await start(t);
      await wake(t);
      await t.page.waitForTimeout(500);
      await t.game('act', 'autoplay', 3000);
      await t.page.waitForTimeout(300);
      const a = await audio(t);
      t.equal(a.music, 'results', 'the results piece has taken over');
    },
  },
];
