// Bathhouse Barons sound, all synthesized (no audio files). Created on the first user gesture.
//   master -> limiter -> speakers, with three buses under master: effects (cues), music and ambience.
//   Music and ambience come from the council audio kit (generative score and noise beds, copied below and
//   adapted: it also exposes its two buses so tests can read them). Cues are layered voices with per-play
//   variation. Everything obeys the master Sound switch in Settings, and pauses behind the pause card and a
//   hidden tab. The offline renderers at the bottom measure each piece without touching the live audio.
export const audio = { ctx: null, on: true, sfx: true, music: true, amb: true, vol: 0.35, mvol: 0.7, avol: 0.7, played: [], count: 0, kit: null, cues: null, fx: null, fxTarget: 0 };

// Levels: at these slider positions the mix is at its measured level (see the tests). Sliders scale from there.
const REF_FX = 0.35, REF_MIX = 0.7, FX_MAX = 1.6;

// ============================================================================================ the audio kit (council kit, adapted: it also returns its two buses)
function makeAudioKit(ctx, out, opt = {}) {
  const sr = ctx.sampleRate;
  let seed = (opt.seed || 0x5EED1) >>> 0;
  const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();
  const pick = (xs) => xs[(rnd() * xs.length) | 0];
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const gain = (v, to) => { const n = ctx.createGain(); n.gain.value = v; if (to) n.connect(to); return n; };
  const panTo = (p, to) => { if (!p || !ctx.createStereoPanner) return to; const n = ctx.createStereoPanner(); n.pan.value = Math.max(-1, Math.min(1, p)); n.connect(to); return n; };
  const lowpass = (f, to, type = 'lowpass', q = 0.7) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; if (to) n.connect(to); return n; };
  const noiseBuf = ctx.createBuffer(1, sr * 2, sr);
  { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }
  const noise = (t, dur) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, rr(0, 1.9)); if (dur) s.stop(t + dur); return s; };

  let mLevel = opt.music ?? 0.5, aLevel = opt.ambience ?? 0.5, inten = 0, held = false, timer = 0;
  const musicBus = gain(mLevel, out), ambBus = gain(aLevel, out);
  const dead = [];   // { at, nodes }: sub-buses to disconnect once their fade-out has finished
  const retire = (bus, nodes, at, fade) => {
    bus.gain.cancelScheduledValues(at); bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), at);
    bus.gain.linearRampToValueAtTime(0.0001, at + Math.max(fade, 0.02)); dead.push({ at: at + fade + 0.2, nodes });
  };

  // ------------------------------------------------------------------------------------------- instruments
  // sus: held for the note's length then released over r seconds. Otherwise percussive: decays over `decay`.
  // waves: one oscillator each, detuned +/- det cents. parts: extra sine partials [frequency multiple, gain].
  const INST = {
    pad:    { waves: ['triangle', 'sine'], det: 6, sus: true, a: 0.9, r: 1.8, lp: 1500 },
    organ:  { waves: ['sine'], parts: [[2, 0.4], [3, 0.15]], sus: true, a: 0.04, r: 0.25 },
    flute:  { waves: ['sine'], parts: [[2, 0.07]], sus: true, a: 0.06, r: 0.3, vib: 5 },
    brass:  { waves: ['sawtooth', 'square'], det: 5, sus: true, a: 0.03, r: 0.12, lp: 1900 },
    mallet: { waves: ['sine'], parts: [[3, 0.16], [4.2, 0.05]], a: 0.004, decay: 1.1 },
    piano:  { waves: ['triangle'], parts: [[2, 0.22], [3, 0.07]], a: 0.004, decay: 0.75 },
    pluck:  { waves: ['sawtooth'], a: 0.003, decay: 0.38, lp: 3400, lpTo: 500 },
    bass:   { waves: ['triangle'], parts: [[2, 0.12]], a: 0.008, decay: 0.55, lp: 800 },
    tuba:   { waves: ['sawtooth'], sus: true, a: 0.02, r: 0.08, lp: 420 },
  };
  function voice(m, t, midi, dur, ins, level, pn, dry) {
    const f = hz(midi), a = ins.a, end = ins.sus ? t + Math.max(dur, a) + ins.r : t + Math.max(dur * 0.5, 0.05) + ins.decay;
    const peak = level / Math.sqrt(ins.waves.length), env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(peak, t + a);
    if (ins.sus) { env.gain.setValueAtTime(peak, t + Math.max(dur, a)); env.gain.linearRampToValueAtTime(0.0001, end); }
    else env.gain.exponentialRampToValueAtTime(0.0001, end);
    let dst = panTo(pn, dry ? m.lp : m.inp);
    if (ins.lp) { const fl = lowpass(ins.lp, dst); if (ins.lpTo) { fl.frequency.setValueAtTime(ins.lp, t); fl.frequency.exponentialRampToValueAtTime(ins.lpTo, t + ins.decay); } dst = fl; }
    env.connect(dst);
    ins.waves.forEach((w, i) => {
      const o = ctx.createOscillator(); o.type = w; o.frequency.value = f; if (ins.det) o.detune.value = (i % 2 ? -1 : 1) * ins.det;
      if (ins.vib) { const l = ctx.createOscillator(), lg = gain(f * 0.004, o.frequency); l.frequency.value = ins.vib; l.connect(lg); l.start(t); l.stop(end + 0.05); }
      o.connect(env); o.start(t); o.stop(end + 0.05);
    });
    for (const [mult, pg] of ins.parts || []) { const o = ctx.createOscillator(); o.frequency.value = f * mult; o.connect(gain(pg, env)); o.start(t); o.stop(end + 0.05); }
  }
  const DRUM = {
    k: (m, t, v) => { const o = ctx.createOscillator(), e = gain(0.0001, m.lp); o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.11); e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(e); o.start(t); o.stop(t + 0.2); },
    s: (m, t, v) => { const e = gain(0.0001, lowpass(1900, m.inp, 'bandpass', 0.8)); e.gain.setValueAtTime(v * 0.9, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.13); noise(t, 0.15).connect(e); },
    h: (m, t, v) => { const e = gain(0.0001, lowpass(6500, m.lp, 'highpass')); e.gain.setValueAtTime(v * 0.35, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); noise(t, 0.06).connect(e); },
    b: (m, t, v) => { const e = gain(0.0001, lowpass(3200, m.inp, 'bandpass', 0.5)); e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(v * 0.4, t + 0.03); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); noise(t, 0.22).connect(e); },   // brush
  };

  // ------------------------------------------------------------------------------------------------- music
  // A score is data:
  //   { bpm, beats: 4, spb: 2 (steps per beat: 2 = eighths, 4 = sixteenths), swing: 0..0.33,
  //     key: 62 (MIDI note of the tonic), scale: [0,2,4,5,7,9,11], sevenths: [4] (chord degrees that take a 7th),
  //     form: 'AABA', sections: { A: [0,5,3,4], B: [3,0,4,4] }   // chord roots as scale degrees, one bar each
  //                                                               // ([degree, bars] holds a chord for longer),
  //     pad:  { inst: 'pad', gain: 0.05 },
  //     bass: { inst: 'bass', pattern: 'root' | 'two' | 'walk', gain: 0.12 },
  //     comp: { inst: 'piano', at: [1, 3] (beats), gain: 0.04 },
  //     lead: { inst: 'mallet', gain: 0.09, oct: 1, lo: -2, hi: 9, classes: [0,1,2,4,5], vary: 0.3, rest: 0.15,
  //             rhythms: [[0,3,4,6], ...] (steps in the bar) },
  //     perc: { k: [0, 2], s: [1, 3], h: [0.5, 1.5, 2.5, 3.5], gain: 0.5 }, perc2: {...} (added at high intensity),
  //     lp: 4200, delay: 0.18 (echo level, 0 for none), delayBeats: 0.75 }
  // The lead is composed once per section bar and remembered, so A sounds like A each time it returns; on
  // every return a bar has a `vary` chance of a small variation that is not remembered.
  const RHY = {
    8: [[0, 3, 4, 6], [0, 2, 4], [0, 4, 6, 7], [2, 4, 6], [0, 3, 6], [0, 2, 3, 4, 6], [0, 4], [0, 1, 2, 4], [1, 2, 4, 6]],
    6: [[0, 2, 4], [0, 3], [0, 4, 5], [2, 4], [0, 2, 3, 4]],
    12: [[0, 4, 8], [0, 6], [0, 3, 6, 8, 10], [4, 6, 8], [0, 4, 6, 10]],
  };
  let cur = null;
  function buildBars(score) {
    const bars = [];
    for (const label of score.form) {
      const sec = score.sections[label], start = bars.length;
      for (const c of sec) { const [d, n] = Array.isArray(c) ? c : [c, 1]; for (let k = 0; k < n; k++) bars.push({ label, d, first: k === 0, len: n }); }
      bars.slice(start).forEach((b, i) => { b.i = i; }); bars[bars.length - 1].end = true;
    }
    return bars;
  }
  function mStart(score, at, fade) {
    const bus = gain(0.0001, musicBus), lp = lowpass(score.lp || 4200, bus), inp = gain(1, lp), nodes = [bus, lp, inp];
    if (score.delay !== 0) {
      const d = ctx.createDelay(1.5); d.delayTime.value = Math.min(1.4, (60 / score.bpm) * (score.delayBeats || 0.75));
      const fb = gain(0.3, d), wet = gain(score.delay ?? 0.18, lp); inp.connect(d); d.connect(fb); d.connect(wet); nodes.push(d, fb, wet);
    }
    bus.gain.setValueAtTime(0.0001, at); bus.gain.linearRampToValueAtTime(score.level ?? 1, at + Math.max(fade, 0.02));   // score.level: this game's own trim, set from the measurements
    return { score, bus, lp, inp, nodes, bars: buildBars(score), t: at, bar: 0, mem: {}, rh: {}, prev: 4, dir: 1, sigs: new Set(), pitches: new Set(), notes: 0 };
  }
  function genMotif(m, B, spbar, spb) {
    const s = m.score, L = s.lead, classes = L.classes || [0, 1, 2, 4, 5], lo = L.lo ?? -2, hi = L.hi ?? 9;
    const cls = (k) => ((k % 7) + 7) % 7, tones = [cls(B.d), cls(B.d + 2), cls(B.d + 4)];
    const ladder = [], strong = [];
    for (let k = lo; k <= hi; k++) { if (classes.includes(cls(k))) ladder.push(k); if (tones.includes(cls(k))) strong.push(k); }
    const pool = L.rhythms || RHY[spbar] || [Array.from({ length: spbar / spb }, (_, i) => i * spb)];
    let rh;
    if (B.end) rh = [0];
    else if (rnd() < (L.rest ?? 0.15)) rh = [];
    else if (B.i >= 2 && m.rh[B.label + (B.i - 2)] && rnd() < 0.6) rh = m.rh[B.label + (B.i - 2)];
    else rh = pick(pool);
    m.rh[B.label + B.i] = rh;
    const mot = [];
    rh.forEach((st, j) => {
      let d;
      if (st % spb === 0 || B.end) {   // on the beat: a chord tone near the last note, preferring to move
        const near = (B.end ? strong.filter((k) => cls(k) !== tones[2]) : strong).slice().sort((x, y) => Math.abs(x - m.prev) - Math.abs(y - m.prev));
        const moved = near.filter((k) => k !== m.prev), c = moved.length ? moved : near;
        d = c[rnd() < 0.65 || c.length < 2 ? 0 : 1];
      } else {                         // off the beat: step along the scale, mostly keeping direction
        if (m.prev >= hi - 1) m.dir = -1; else if (m.prev <= lo + 1) m.dir = 1; else if (rnd() < 0.35) m.dir = -m.dir;
        const i = ladder.reduce((best, k, ix) => (Math.abs(k - m.prev) < Math.abs(ladder[best] - m.prev) ? ix : best), 0);
        d = ladder[Math.max(0, Math.min(ladder.length - 1, i + m.dir))];
      }
      const next = j + 1 < rh.length ? rh[j + 1] : spbar;
      mot.push({ st, d, len: B.end ? Math.min(spbar, spb * 3) : Math.max(1, next - st) });
      m.prev = d;
    });
    return mot;
  }
  function varyMotif(m, mot, B, spbar) {
    if (mot.length < 2 || B.end) return mot;
    const v = mot.map((n) => ({ ...n })), k = 1 + ((rnd() * (v.length - 1)) | 0), how = rnd();
    if (how < 0.5) v[k].d += rnd() < 0.5 ? 1 : -1;                                   // neighbour note
    else if (how < 0.75 && v.length > 2) v.pop();                                     // leave a breath
    else if (v[k].st - v[k - 1].st >= 2) v.splice(k, 0, { st: v[k].st - 1, d: v[k - 1].d + (v[k].d > v[k - 1].d ? 1 : -1), len: 1 });   // passing note
    return v;
  }
  function playBar(m, t0) {
    const s = m.score, spb = s.spb || 2, beats = s.beats || 4, spbar = spb * beats, sc = s.scale || [0, 2, 4, 5, 7, 9, 11];
    const beat = 60 / (s.bpm * (1 + 0.06 * inten)), step = beat / spb, barDur = beat * beats;
    const B = m.bars[m.bar % m.bars.length], nextB = m.bars[(m.bar + 1) % m.bars.length];
    const at = (st) => t0 + st * step + (st % 2 ? (s.swing || 0) * step : 0);
    const deg = (d) => s.key + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    const fold = (n, lo) => lo + (((n - lo) % 12) + 12) % 12;
    const chord = [B.d, B.d + 2, B.d + 4].concat((s.sevenths || []).includes(((B.d % 7) + 7) % 7) ? [B.d + 6] : []);
    if (s.pad && B.first) for (const d of chord) voice(m, t0, fold(deg(d), s.key - 5), barDur * B.len, INST[s.pad.inst || 'pad'], (s.pad.gain ?? 0.05), rr(-0.4, 0.4), false);
    if (s.bass) {
      const ins = INST[s.bass.inst || 'bass'], lo = s.key - 24 + 12 * (s.bass.oct || 0), g = s.bass.gain ?? 0.12, root = fold(deg(B.d), lo);
      let fifth = fold(deg(B.d + 4), lo); if (fifth > root + 6) fifth -= 12;
      const p = s.bass.pattern || 'root';
      if (p === 'root') voice(m, t0, root, barDur * 0.9, ins, g, 0, true);
      else if (p === 'two') { voice(m, at(0), root, beat * 0.9, ins, g, 0, true); voice(m, at(spb * Math.floor(beats / 2)), fifth, beat * 0.9, ins, g * 0.9, 0, true); }
      else if (p === 'walk') {
        const target = fold(deg(nextB.d), lo), line = [root, fold(deg(B.d + 2), lo), fold(deg(B.d + 4), lo), target + (rnd() < 0.5 ? -1 : 1)];
        for (let b = 0; b < beats; b++) voice(m, at(b * spb), line[b % 4], beat * 0.9, ins, g * (b ? 0.85 : 1), 0, true);
      }
    }
    if (s.comp) for (const b of s.comp.at || [1, 3]) { const st = Math.round(b * spb); for (const d of chord) voice(m, at(st), fold(deg(d), s.key + 12 * (s.comp.oct || 0)), beat * (s.comp.len || 0.4), INST[s.comp.inst || 'piano'], (s.comp.gain ?? 0.04), s.comp.pan || 0, false); }
    for (const P of [s.perc, inten > 0.5 ? s.perc2 : null]) if (P) for (const key of Object.keys(DRUM)) for (const b of P[key] || []) DRUM[key](m, at(Math.round(b * spb)), (P.gain ?? 0.5) * 0.3);
    if (s.lead) {
      const L = s.lead, key = B.label + ':' + B.i; let mot = m.mem[key];
      if (!mot) mot = m.mem[key] = genMotif(m, B, spbar, spb); else if (rnd() < (L.vary ?? 0.3)) mot = varyMotif(m, mot, B, spbar);
      for (const n of mot) { const midi = deg(n.d) + 12 * ((L.oct ?? 1) + (inten > 0.8 && L.lift ? 1 : 0)); voice(m, at(n.st), midi, n.len * step * 0.92, INST[L.inst || 'mallet'], (L.gain ?? 0.09) * (1 + 0.2 * inten) * rr(0.88, 1), L.pan ?? rr(-0.25, 0.25), false); m.pitches.add(midi); m.notes++; }
      m.sigs.add(mot.map((n) => n.st + '.' + n.d).join(' '));
    }
    m.lp.frequency.setTargetAtTime((s.lp || 4200) * (1 + 0.6 * inten), t0, 0.4);
    return barDur;
  }
  const music = {
    play(score, o = {}) {
      const at = o.at ?? ctx.currentTime + 0.03, fade = o.fade ?? 1.2;
      if (cur && cur.score === score) return;
      if (cur) retire(cur.bus, cur.nodes, at, fade);
      cur = score ? mStart(score, at, fade) : null;
    },
    stop(fade = 1) { music.play(null, { fade }); },
    level(v) { mLevel = v; if (!held) musicBus.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
    duck(db = 6, ms = 400) { if (held) return; const t = ctx.currentTime; musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(mLevel * 10 ** (-db / 20), t, 0.02); musicBus.gain.setTargetAtTime(mLevel, t + ms / 1000, 0.25); },
    intensity(x) { inten = Math.max(0, Math.min(1, x)); },
    get score() { return cur && cur.score; },
    // For tests: how much the lead has really varied so far.
    info() { return cur ? { bars: cur.bar, formBars: cur.bars.length, distinctBars: cur.sigs.size, notes: cur.notes, pitches: cur.pitches.size } : null; },
  };

  // ---------------------------------------------------------------------------------------------- ambience
  // A scene is data:
  //   { beds:  [{ type: 'lowpass' | 'bandpass' | 'highpass', freq, q, gain, pan,
  //               lfo: { rate (Hz), depth 0..1 } (slow swell of the bed's level), flfo: { rate, depth (Hz) },
  //               param: 'wind', range: [0.2, 1] }],     // amb.set('wind', 0..1) moves this bed's level
  //     spots: [{ make: 'drip' | 'bird' | 'hiss' | 'bell' | 'cricket' | 'swell' | (ctx, dest, t, rnd) => {},
  //               every: [4, 10] (seconds between), gain, pan: [-0.6, 0.6], param: 'night' }] }
  // Beds are continuous; spots are sparse one-shots at random gaps so the place never loops audibly.
  const SPOT = {
    drip: (dst, t, v) => { const f = rr(1100, 2300), o = ctx.createOscillator(), e = gain(0.0001, dst); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.03); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.09); e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(e); o.start(t); o.stop(t + 0.14); },
    bird: (dst, t, v) => { const n = 2 + ((rnd() * 3) | 0), base = rr(2600, 4200); for (let i = 0; i < n; i++) { const s = t + i * rr(0.09, 0.16), o = ctx.createOscillator(), e = gain(0.0001, dst); o.frequency.setValueAtTime(base * rr(0.9, 1.1), s); o.frequency.exponentialRampToValueAtTime(base * rr(1.15, 1.5), s + 0.06); e.gain.setValueAtTime(0.0001, s); e.gain.linearRampToValueAtTime(v * 0.7, s + 0.015); e.gain.exponentialRampToValueAtTime(0.0001, s + 0.08); o.connect(e); o.start(s); o.stop(s + 0.1); } },
    hiss: (dst, t, v) => { const d = rr(0.7, 1.8), e = gain(0.0001, lowpass(rr(3500, 6000), dst, 'highpass')); e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(v * 0.6, t + d * 0.3); e.gain.exponentialRampToValueAtTime(0.0001, t + d); noise(t, d + 0.05).connect(e); },
    bell: (dst, t, v) => { const f = rr(700, 1100); for (const [mult, pg, dec] of [[1, 1, 2.2], [2.76, 0.4, 1.3], [5.4, 0.18, 0.7]]) { const o = ctx.createOscillator(), e = gain(0.0001, dst); o.frequency.value = f * mult; e.gain.setValueAtTime(v * pg * 0.6, t); e.gain.exponentialRampToValueAtTime(0.0001, t + dec); o.connect(e); o.start(t); o.stop(t + dec + 0.05); } },
    cricket: (dst, t, v) => { const f = rr(4200, 5200), n = 3 + ((rnd() * 4) | 0); for (let i = 0; i < n; i++) { const s = t + i * 0.055, o = ctx.createOscillator(), e = gain(0.0001, dst); o.frequency.value = f; e.gain.setValueAtTime(v * 0.35, s); e.gain.exponentialRampToValueAtTime(0.0001, s + 0.03); o.connect(e); o.start(s); o.stop(s + 0.04); } },
    swell: (dst, t, v) => { const d = rr(2.5, 5), e = gain(0.0001, lowpass(rr(500, 900), dst, 'bandpass', 0.6)); e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(v, t + d * 0.45); e.gain.linearRampToValueAtTime(0.0001, t + d); noise(t, d + 0.05).connect(e); },
  };
  let scene = null;
  const params = {};
  function aStart(def, at, fade) {
    const bus = gain(0.0001, ambBus), nodes = [bus], beds = [];
    for (const b of def.beds || []) {
      const g = gain(b.gain ?? 0.05, panTo(b.pan || 0, bus)), f = lowpass(b.freq || 600, g, b.type || 'lowpass', b.q ?? 0.7), src = noise(at);
      src.connect(f); nodes.push(src, g, f);
      if (b.lfo) { const l = ctx.createOscillator(); l.frequency.value = b.lfo.rate; l.connect(gain((b.gain ?? 0.05) * b.lfo.depth * 0.5, g.gain)); l.start(at); nodes.push(l); }
      if (b.flfo) { const l = ctx.createOscillator(); l.frequency.value = b.flfo.rate; l.connect(gain(b.flfo.depth, f.frequency)); l.start(at); nodes.push(l); }
      beds.push({ def: b, g });
    }
    bus.gain.setValueAtTime(0.0001, at); bus.gain.linearRampToValueAtTime(def.level ?? 1, at + Math.max(fade, 0.02));   // def.level: this game's own trim
    const sc = { def, bus, nodes, beds, spots: (def.spots || []).map((d) => ({ d, next: at + rr(0.3, d.every[1]) })) };
    for (const k of Object.keys(params)) applyParam(sc, k, params[k], at, 0.01);
    return sc;
  }
  function applyParam(sc, name, v, t, tc) { for (const b of sc.beds) if (b.def.param === name) { const r = b.def.range || [0, 1]; b.g.gain.setTargetAtTime((b.def.gain ?? 0.05) * (r[0] + (r[1] - r[0]) * v), t, tc); } }
  const amb = {
    play(def, o = {}) {
      const at = o.at ?? ctx.currentTime + 0.03, fade = o.fade ?? 2;
      if (scene && scene.def === def) return;
      if (scene) { const old = scene; retire(old.bus, old.nodes, at, fade); }
      scene = def ? aStart(def, at, fade) : null;
    },
    stop(fade = 1.5) { amb.play(null, { fade }); },
    level(v) { aLevel = v; if (!held) ambBus.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
    set(name, v, tc = 0.5) { params[name] = v; if (scene) applyParam(scene, name, v, ctx.currentTime, tc); },
    get scene() { return scene && scene.def; },
  };

  // --------------------------------------------------------------------------------------------- scheduler
  function scheduleUntil(T) {
    const now = ctx.currentTime;
    if (!held) {
      if (cur) { if (cur.t < now - 0.05) cur.t = now + 0.05; let guard = 0; while (cur.t < T && guard++ < 400) { cur.t += playBar(cur, cur.t); cur.bar++; } }
      if (scene) for (const sp of scene.spots) {
        if (sp.next < now - 0.05) sp.next = now + rr(0.2, sp.d.every[1]);
        let guard = 0;
        while (sp.next < T && guard++ < 400) {
          const on = sp.d.param ? (params[sp.d.param] ?? 0) : 1;
          if (on > 0 && rnd() < on) { const p = sp.d.pan || [-0.5, 0.5], dst = panTo(rr(p[0], p[1]), scene.bus), v = (sp.d.gain ?? 0.05) * rr(0.6, 1); if (typeof sp.d.make === 'function') sp.d.make(ctx, dst, sp.next, rnd, v); else SPOT[sp.d.make](dst, sp.next, v); }
          sp.next += rr(sp.d.every[0], sp.d.every[1]);
        }
      }
    }
    for (let i = dead.length - 1; i >= 0; i--) if (dead[i].at < now) { for (const n of dead[i].nodes) { try { if (n.stop) n.stop(); } catch (e) { /* already stopped */ } try { n.disconnect(); } catch (e) { /* already gone */ } } dead.splice(i, 1); }
  }

  return {
    music, amb, scheduleUntil, INST, buses: { music: musicBus, amb: ambBus },
    // Cue variation for the game's own tone() and noise(): multiply the frequency by f and the gain by g, start
    // a noise buffer at offset o (seconds), so no two repeats of a cue are sample-identical.
    jit(cents = 25, db = 1.5) { return { f: 2 ** (rr(-cents, cents) / 1200), g: 10 ** (rr(-db, 0) / 20), o: rr(0, 1.5) }; },
    start() { if (!timer) timer = setInterval(() => { if (ctx.state === 'running') scheduleUntil(ctx.currentTime + 0.25); }, 25); },
    stop() { if (timer) clearInterval(timer); timer = 0; },
    // Pause card or hidden tab: fade both buses out and schedule nothing until release().
    hold(tc = 0.08) { held = true; const t = ctx.currentTime; musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(0, t, tc); ambBus.gain.setTargetAtTime(0, t, tc); },
    release(tc = 0.3) { held = false; const t = ctx.currentTime; musicBus.gain.setTargetAtTime(mLevel, t, tc); ambBus.gain.setTargetAtTime(aLevel, t, tc); },
    get held() { return held; },
  };
}

// Renders `seconds` of audio faster than real time and measures it, so a test can check music and ambience
// that nobody in the test run can hear. `build(ctx, dest)` builds the graph on the offline context and schedules
// everything up to `seconds` (for the kit: make a kit on ctx, play, then kit.scheduleUntil(seconds)); whatever it
// returns comes back as `built` (return kit.music.info() to get the variation counts).
//   peak, rms: linear, 0..1 (peakDb, rmsDb in dBFS). longestSilence: seconds in a row below -60 dBFS.
//   stereo: side level over mid level (0 = mono). secs: RMS of each second. wav: base64 16-bit WAV if asked.
async function measureAudio(build, seconds, o = {}) {
  const rate = o.rate || 22050, OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const oc = new OC(2, Math.ceil(rate * seconds), rate), made = build(oc, oc.destination);
  const buf = await oc.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length;
  let peak = 0, mid = 0, side = 0, run = 0, longest = 0; const secs = [];
  for (let s = 0; s * rate < n; s++) {
    const end = Math.min(n, (s + 1) * rate); let e = 0;
    for (let i = s * rate; i < end; i++) { const a = (L[i] + R[i]) / 2, d = (L[i] - R[i]) / 2, p = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (p > peak) peak = p; e += a * a; side += d * d; }
    mid += e; const r = Math.sqrt(e / (end - s * rate)); secs.push(+r.toFixed(5));
    if (r < 0.001) { run++; longest = Math.max(longest, run); } else run = 0;
  }
  const rms = Math.sqrt(mid / n), db = (x) => +(20 * Math.log10(Math.max(x, 1e-9))).toFixed(1);
  const res = { seconds, peak: +peak.toFixed(4), rms: +rms.toFixed(4), peakDb: db(peak), rmsDb: db(rms), longestSilence: longest, stereo: +(Math.sqrt(side / n) / (rms || 1)).toFixed(3), secs, built: typeof made === 'function' ? made() : made };
  if (o.wav) {
    const bytes = new Uint8Array(44 + n * 4), v = new DataView(bytes.buffer), str = (at, s) => { for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); res.wav = btoa(bin);
  }
  return res;
}

// ============================================================================================ this game's music
// Chord roots are scale degrees (0 = I, 1 = ii, 3 = IV, 4 = V, 5 = vi). Each piece has its own key, tempo and lead.
const SCORES = {
  // Title and menus: a slow parlour waltz on a music box, 24 bars of 3/4 at 84 bpm, about 51 s before it returns.
  title: {
    level: 0.34, bpm: 84, beats: 3, key: 58, sevenths: [4], form: 'AABA',
    sections: { A: [0, 5, 3, 4, 0, 3], B: [3, 1, 4, 4, 5, 4] },
    pad: { gain: 0.04 }, bass: { inst: 'bass', pattern: 'two', gain: 0.1 }, comp: { inst: 'piano', at: [1, 2], gain: 0.03 },
    lead: { inst: 'mallet', gain: 0.1, vary: 0.35, rest: 0.12 },
    lp: 3800, delay: 0.2, delayBeats: 1,
  },
  // At the table: a light 1920s rag in F, oom-pah left hand and a syncopated right hand, 32 bars at 88 bpm, about 87 s.
  play: {
    level: 0.45, bpm: 88, swing: 0.15, key: 65, sevenths: [4, 1], form: 'AABA',
    sections: { A: [0, 0, 4, 4, 0, 5, 1, 4], B: [3, 3, 0, 5, 1, 4, 0, 4] },
    bass: { inst: 'bass', pattern: 'two', gain: 0.15 }, comp: { inst: 'piano', at: [1, 3], gain: 0.045 },
    lead: { inst: 'piano', gain: 0.1, vary: 0.3, rest: 0.06, rhythms: [[0, 1, 3, 4, 6], [0, 3, 4, 7], [1, 2, 4, 5, 7], [0, 2, 3, 5, 6], [0, 3, 6], [0, 2, 4, 6]] },
    lp: 4800, delay: 0,
  },
  // The Gazette: a slow, warm stroll in D with a flute over a walking bass and brushes, 16 bars at 76 bpm, about 51 s.
  results: {
    level: 0.35, bpm: 76, swing: 0.1, key: 62, sevenths: [4], form: 'AABA',
    sections: { A: [0, 3, 0, 4], B: [5, 1, 4, 0] },
    pad: { inst: 'organ', gain: 0.025 }, bass: { inst: 'bass', pattern: 'walk', gain: 0.11 }, comp: { inst: 'piano', at: [1, 3], gain: 0.035 },
    lead: { inst: 'flute', gain: 0.09, vary: 0.35, rest: 0.1 },
    perc: { b: [1, 3], h: [0.5, 2.5], gain: 0.4 },
    lp: 4200, delay: 0.12,
  },
};

// ============================================================================================ this game's ambience
// A far streetcar: two or three soft dings, dulled by distance.
function streetcar(c, dst, t, rnd, v) {
  const n = 2 + ((rnd() * 2) | 0), f = 880 + rnd() * 220, lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(dst);
  for (let i = 0; i < n; i++) for (const [m, pg, dec] of [[1, 1, 0.9], [2.76, 0.3, 0.5]]) {
    const o = c.createOscillator(), e = c.createGain(), s = t + i * 0.42;
    o.frequency.value = f * m; e.gain.setValueAtTime(0.0001, s); e.gain.linearRampToValueAtTime(v * pg, s + 0.004); e.gain.exponentialRampToValueAtTime(0.0001, s + dec);
    o.connect(e); e.connect(lp); o.start(s); o.stop(s + dec + 0.05);
  }
}
const SCENES = {
  // Hot Springs outdoors: a low street air, steam, the murmur of the street (louder at an auction) and a streetcar bell far off.
  town: {
    level: 0.52,
    beds: [
      { type: 'lowpass', freq: 300, gain: 0.05, lfo: { rate: 0.06, depth: 0.5 }, flfo: { rate: 0.04, depth: 90 } },
      { type: 'bandpass', freq: 3000, q: 0.5, gain: 0.012, pan: 0.3, lfo: { rate: 0.08, depth: 0.9 } },
      { type: 'bandpass', freq: 650, q: 0.5, gain: 0.035, lfo: { rate: 0.11, depth: 0.5 }, param: 'crowd', range: [0.4, 2] },
    ],
    spots: [{ make: streetcar, every: [14, 32], gain: 0.04, pan: [-0.8, 0.8] }, { make: 'hiss', every: [8, 18], gain: 0.03 }, { make: 'swell', every: [7, 15], gain: 0.03 }],
  },
  // The bathhouse lobby for the Gazette: a low wash of water, thin steam air, drips and the odd vent.
  bathhouse: {
    level: 0.6,
    beds: [
      { type: 'lowpass', freq: 520, gain: 0.06, lfo: { rate: 0.07, depth: 0.5 }, flfo: { rate: 0.05, depth: 140 } },
      { type: 'bandpass', freq: 2400, q: 0.6, gain: 0.012, pan: 0.3, lfo: { rate: 0.11, depth: 0.8 } },
    ],
    spots: [{ make: 'drip', every: [1.5, 5], gain: 0.04 }, { make: 'hiss', every: [9, 20], gain: 0.03 }],
  },
};

// ============================================================================================ cues
// Per-cue trim, set from the measurements in tests/council-w2-a.test.mjs so every cue peaks near 0.3.
const TRIM = { dice: 0.58, land: 0.7, tax: 0.65, build: 0.64, gavel: 0.62, bust: 0.45, mort: 0.6, unmort: 0.66, sell: 0.71, debt: 0.6, deed: 0.9, month: 0.8, turn: 0.82, release: 0.9, error: 0.85 };
const CUE_NAMES = ['click', 'open', 'close', 'deed', 'dice', 'step', 'land', 'coin', 'pay', 'tax', 'card', 'build', 'gavel', 'bid', 'drop', 'error', 'fanfare', 'bust',
  'turn', 'again', 'release', 'mort', 'unmort', 'sell', 'auctionStart', 'unsold', 'offer', 'declined', 'month', 'debt'];
const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];   // C pentatonic over two octaves, walked upward by a move
const BELL = [[1, 1], [2.76, 0.35], [5.4, 0.15]];

function makeCues(ctx, out, kit) {
  const sr = ctx.sampleRate, nb = ctx.createBuffer(1, sr * 2, sr);
  { const d = nb.getChannelData(0); let x = 0x9E3779B9; for (let i = 0; i < d.length; i++) { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; d[i] = x / 2147483648 - 1; } }
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const bus = (pan) => { if (!pan || !ctx.createStereoPanner) return out; const n = ctx.createStereoPanner(); n.pan.value = Math.max(-0.7, Math.min(0.7, pan)); n.connect(out); return n; };
  // One voice: partials [[multiple, gain]], an exponential tail, an optional lowpass and pitch slide (ratio over the tail).
  const tone = (d, t, f, o) => {
    const dur = o.dur ?? 0.2, g = o.g ?? 0.2, env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    if (o.rev) { env.gain.exponentialRampToValueAtTime(g, t + dur * 0.85); env.gain.linearRampToValueAtTime(0.0001, t + dur); }
    else { env.gain.linearRampToValueAtTime(g, t + (o.att ?? 0.003)); env.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    let dst = d;
    if (o.lp) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; lp.connect(d); dst = lp; }
    env.connect(dst);
    for (const [m, pg] of o.parts || [[1, 1]]) {
      const os = ctx.createOscillator(), gg = ctx.createGain();
      os.type = o.type || 'sine'; os.frequency.setValueAtTime(f * m, t);
      if (o.slide) os.frequency.exponentialRampToValueAtTime(Math.max(30, f * m * o.slide), t + dur);
      gg.gain.value = pg; os.connect(gg); gg.connect(env); os.start(t); os.stop(t + dur + 0.03);
    }
  };
  // A burst of filtered noise; `off` starts the buffer somewhere else each time.
  const hit = (d, t, o) => {
    const dur = o.dur ?? 0.05, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), e = ctx.createGain();
    s.buffer = nb; f.type = o.type || 'bandpass'; f.Q.value = o.q ?? 0.9; f.frequency.setValueAtTime(o.f || 2000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(o.g ?? 0.3, t + (o.att ?? 0.002)); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(e); e.connect(d); s.start(t, o.off ?? 0); s.stop(t + dur + 0.02);
  };
  const CUE = {
    click: (d, t, j) => { hit(d, t, { f: 2600, q: 1.2, dur: 0.03, g: 0.45 * j.g, off: j.o }); tone(d, t, 880 * j.f, { type: 'triangle', dur: 0.05, g: 0.2 * j.g, lp: 2400 }); },
    open: (d, t, j) => { tone(d, t, 660 * j.f, { type: 'triangle', dur: 0.09, g: 0.26 * j.g, slide: 1.35, lp: 2600 }); hit(d, t, { f: 3200, dur: 0.02, g: 0.2 * j.g, off: j.o }); },
    close: (d, t, j) => { tone(d, t, 520 * j.f, { type: 'triangle', dur: 0.09, g: 0.26 * j.g, slide: 0.74, lp: 2200 }); hit(d, t, { f: 2200, dur: 0.02, g: 0.2 * j.g, off: j.o }); },
    deed: (d, t, j) => { hit(d, t, { f: 1200, to: 3600, q: 0.7, dur: 0.12, att: 0.03, g: 0.5 * j.g, off: j.o }); tone(d, t + 0.1, 740 * j.f, { type: 'triangle', dur: 0.06, g: 0.2 * j.g, lp: 2400 }); },
    dice: (d, t, j) => {
      const n = 5; let at = t;
      for (let k = 0; k < n; k++) {
        const fall = 1 - k / n;
        hit(d, at, { f: 1200 + ((j.o * 977 + k * 613) % 2300), q: 0.8, dur: 0.05, g: 0.55 * j.g * (0.45 + 0.55 * fall), off: j.o + k * 0.13 });
        tone(d, at, 150 * j.f * (1 + 0.1 * k), { dur: 0.07, g: 0.3 * j.g * (0.4 + 0.6 * fall), lp: 500, slide: 0.7 });
        at += 0.055 + 0.02 * k + 0.012 * ((j.o * 10 + k) % 3);
      }
    },
    step: (d, t, j, o) => {
      const i = o.i || 0, n = i < 10 ? i : 9 - (i % 2), f = hz(PENTA[n]) * j.f;
      tone(d, t, f, { type: 'sine', parts: [[1, 1], [2, 0.2]], dur: 0.13, g: 0.28 * j.g, lp: 3600 });
      hit(d, t, { f: 3000, q: 1, dur: 0.012, g: 0.2 * j.g, off: j.o });
    },
    land: (d, t, j) => { tone(d, t, 95 * j.f, { dur: 0.18, g: 0.5 * j.g, slide: 0.55, lp: 420 }); hit(d, t, { type: 'lowpass', f: 600, q: 0.5, dur: 0.07, g: 0.35 * j.g, off: j.o }); },
    coin: (d, t, j, o) => {
      const f = 1319 * j.f * 2 ** ((o.pitch || 0) / 12);
      tone(d, t, f, { parts: BELL, dur: 0.3, g: 0.17 * j.g });
      tone(d, t + 0.075, f * 1.335, { parts: BELL, dur: 0.42, g: 0.17 * j.g });
      hit(d, t, { f: 6500, q: 1.5, dur: 0.012, g: 0.3 * j.g, off: j.o });
      tone(d, t, f / 2, { type: 'triangle', dur: 0.1, g: 0.1 * j.g, lp: 1800 });
    },
    pay: (d, t, j) => {
      tone(d, t, 523 * j.f, { type: 'triangle', parts: [[1, 1], [2, 0.3]], dur: 0.24, g: 0.26 * j.g, slide: 0.6, lp: 2600 });
      hit(d, t, { f: 1800, dur: 0.05, g: 0.4 * j.g, off: j.o });
      tone(d, t + 0.02, 1760 * j.f, { parts: BELL, dur: 0.25, g: 0.07 * j.g });
    },
    tax: (d, t, j) => {
      tone(d, t, 180 * j.f, { dur: 0.14, g: 0.45 * j.g, slide: 0.6, lp: 700 });
      hit(d, t, { f: 1200, q: 1.2, dur: 0.04, g: 0.5 * j.g, off: j.o });
      tone(d, t + 0.09, 2300 * j.f, { parts: BELL, dur: 0.35, g: 0.1 * j.g });
    },
    card: (d, t, j) => {
      hit(d, t, { f: 900, to: 4200, q: 0.8, dur: 0.11, att: 0.02, g: 0.5 * j.g, off: j.o });
      tone(d, t + 0.05, 660 * j.f, { parts: [[1, 1], [2, 0.15]], dur: 0.16, g: 0.2 * j.g });
    },
    build: (d, t, j) => {
      const base = [220, 262, 330];
      base.forEach((f, k) => {
        const at = t + k * 0.1;
        tone(d, at, f * j.f, { type: 'triangle', parts: [[1, 1], [2.4, 0.3]], dur: 0.09, g: 0.3 * j.g, lp: 1500 });
        hit(d, at, { f: 1700, q: 1, dur: 0.03, g: 0.5 * j.g, off: j.o + k * 0.2 });
      });
      tone(d, t + 0.3, 1319 * j.f, { parts: BELL, dur: 0.3, g: 0.08 * j.g });
    },
    gavel: (d, t, j) => {
      tone(d, t, 150 * j.f, { dur: 0.26, g: 0.5 * j.g, slide: 0.5, lp: 520 });
      hit(d, t, { f: 1400, q: 1.5, dur: 0.045, g: 0.55 * j.g, off: j.o });
      tone(d, t, 420 * j.f, { type: 'triangle', dur: 0.05, g: 0.2 * j.g, lp: 2500 });
    },
    bid: (d, t, j, o) => {
      const f = 784 * j.f * 2 ** ((o.pitch || 0) / 12);
      tone(d, t, f, { parts: [[1, 1], [2.76, 0.3]], dur: 0.24, g: 0.28 * j.g });
      hit(d, t, { f: 4500, q: 1.5, dur: 0.01, g: 0.25 * j.g, off: j.o });
    },
    drop: (d, t, j) => { tone(d, t, 600 * j.f, { dur: 0.11, g: 0.3 * j.g, slide: 0.5, lp: 2600 }); hit(d, t, { f: 1500, dur: 0.02, g: 0.2 * j.g, off: j.o }); },
    error: (d, t, j) => {
      tone(d, t, 196 * j.f, { type: 'triangle', dur: 0.1, g: 0.32 * j.g, lp: 800 });
      tone(d, t + 0.11, 165 * j.f, { type: 'triangle', dur: 0.14, g: 0.32 * j.g, lp: 700 });
    },
    fanfare: (d, t, j) => {
      [523, 659, 784].forEach((f, k) => tone(d, t + k * 0.12, f * j.f, { type: 'sawtooth', dur: 0.2, g: 0.12 * j.g, lp: 2200 }));
      [523, 659, 784, 1047].forEach((f) => tone(d, t + 0.36, f * j.f, { type: 'sawtooth', parts: [[1, 1], [2, 0.1]], dur: 1.1, g: 0.09 * j.g, lp: 2400 }));
      tone(d, t + 0.36, 2093 * j.f, { parts: BELL, dur: 0.8, g: 0.08 * j.g });
    },
    bust: (d, t, j) => {
      [392, 330, 262].forEach((f, k) => tone(d, t + k * 0.15, f * j.f, { type: 'triangle', dur: 0.26, g: 0.3 * j.g, lp: 1200 }));
      tone(d, t + 0.3, 80 * j.f, { dur: 0.3, g: 0.4 * j.g, slide: 0.7 });
    },
    turn: (d, t, j) => {
      tone(d, t, 659 * j.f, { parts: [[1, 1], [2, 0.2], [2.76, 0.1]], dur: 0.36, g: 0.26 * j.g });
      tone(d, t + 0.12, 880 * j.f, { parts: [[1, 1], [2, 0.2], [2.76, 0.1]], dur: 0.5, g: 0.26 * j.g });
    },
    again: (d, t, j) => [784, 988, 1175].forEach((f, k) => tone(d, t + k * 0.06, f * j.f, { type: 'triangle', dur: 0.12, g: 0.26 * j.g, lp: 3500 })),
    release: (d, t, j) => {
      hit(d, t, { f: 3000, q: 1.4, dur: 0.02, g: 0.5 * j.g, off: j.o });
      tone(d, t, 300 * j.f, { type: 'triangle', dur: 0.07, g: 0.25 * j.g, lp: 900 });
      tone(d, t + 0.09, 523 * j.f, { parts: [[1, 1], [2, 0.2]], dur: 0.25, g: 0.25 * j.g });
      tone(d, t + 0.2, 784 * j.f, { parts: [[1, 1], [2, 0.2]], dur: 0.35, g: 0.25 * j.g });
    },
    mort: (d, t, j) => {
      hit(d, t, { f: 3000, q: 1, dur: 0.045, g: 0.55 * j.g, off: j.o });
      tone(d, t, 300 * j.f, { dur: 0.13, g: 0.4 * j.g, slide: 0.5, lp: 800 });
      hit(d, t + 0.06, { f: 1800, type: 'lowpass', q: 0.5, dur: 0.1, g: 0.12 * j.g, off: j.o + 0.4 });
    },
    unmort: (d, t, j) => {
      hit(d, t, { f: 3000, q: 1, dur: 0.045, g: 0.55 * j.g, off: j.o });
      tone(d, t, 200 * j.f, { dur: 0.13, g: 0.4 * j.g, slide: 1.7, lp: 800 });
      tone(d, t + 0.07, 1568 * j.f, { parts: BELL, dur: 0.22, g: 0.08 * j.g });
    },
    sell: (d, t, j) => {
      tone(d, t, 1568 * j.f, { parts: [[1, 1], [2.76, 0.3]], dur: 0.2, g: 0.3 * j.g, rev: true });
      hit(d, t + 0.2, { f: 5000, q: 1.2, dur: 0.012, g: 0.3 * j.g, off: j.o });
      tone(d, t + 0.2, 988 * j.f, { parts: BELL, dur: 0.22, g: 0.18 * j.g });
    },
    auctionStart: (d, t, j) => [0, 0.36].forEach((dt) => tone(d, t + dt, 1568 * j.f, { parts: [[1, 1], [1.335, 0.6], [2.76, 0.12]], dur: 0.7, g: 0.17 * j.g })),
    unsold: (d, t, j) => { tone(d, t, 160 * j.f, { type: 'triangle', dur: 0.13, g: 0.4 * j.g, slide: 0.8, lp: 420 }); hit(d, t, { type: 'lowpass', f: 380, q: 0.5, dur: 0.07, g: 0.35 * j.g, off: j.o }); },
    offer: (d, t, j) => { tone(d, t, 523 * j.f, { parts: BELL, dur: 0.3, g: 0.2 * j.g }); tone(d, t + 0.1, 659 * j.f, { parts: BELL, dur: 0.4, g: 0.2 * j.g }); },
    declined: (d, t, j) => { tone(d, t, 523 * j.f, { type: 'triangle', dur: 0.22, g: 0.28 * j.g, lp: 1400 }); tone(d, t + 0.11, 392 * j.f, { type: 'triangle', dur: 0.3, g: 0.28 * j.g, lp: 1200 }); },
    month: (d, t, j, o) => {
      hit(d, t, { f: 700, to: 4200, q: 0.7, dur: 0.35, att: 0.1, g: 0.5 * j.g, off: j.o });
      tone(d, t + 0.3, hz(PENTA[(o.m || 0) % 5] + 12) * j.f, { parts: BELL, dur: 0.55, g: 0.2 * j.g });
    },
    debt: (d, t, j) => [0, 0.16].forEach((dt) => tone(d, t + dt, 110 * j.f, { parts: [[1, 1], [2, 0.3]], dur: 0.12, g: 0.4 * j.g, lp: 700 })),
  };
  return {
    names: Object.keys(CUE),
    play(name, t, o = {}) {
      const fn = CUE[name]; if (!fn) return;
      const j = kit.jit(20, 1.5); j.g *= TRIM[name] ?? 1;
      fn(bus(o.pan), t, j, o);
    },
  };
}

// ============================================================================================ live controls
const holds = { hidden: false, pause: false };
const want = { music: 'title', amb: 'town', crowd: 0.2 };
let lastClick = -1;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function graph(ctx, dest) {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -4; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.12;
  limiter.connect(dest);
  const master = ctx.createGain(); master.connect(limiter);
  const fx = ctx.createGain(); fx.connect(master);
  return { master, fx };
}

// Pushes the settings and the wanted mood into the live graph. Music and ambience obey the master Sound switch.
export function applyAudio() {
  const k = audio.kit, ctx = audio.ctx; if (!k || !ctx) return;
  const on = audio.on, t = ctx.currentTime;
  audio.fxTarget = on && audio.sfx ? clamp(audio.vol / REF_FX, 0, FX_MAX) : 0;
  audio.fx.gain.setTargetAtTime(audio.fxTarget, t, 0.03);
  k.music.level(audio.music ? clamp(audio.mvol / REF_MIX, 0, 1.5) : 0); k.amb.level(audio.amb ? clamp(audio.avol / REF_MIX, 0, 1.5) : 0);
  if (on && audio.music && want.music) k.music.play(SCORES[want.music], { fade: 1.8 }); else k.music.stop(0.6);
  if (on && audio.amb && want.amb) k.amb.play(SCENES[want.amb], { fade: 2.5 }); else k.amb.stop(0.8);
  const hold = !on || holds.hidden || holds.pause;
  if (hold && !k.held) k.hold(); else if (!hold && k.held) k.release();
}

export function unlock() {
  if (!audio.ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ctx = new AC(), g = graph(ctx, ctx.destination);
      audio.ctx = ctx; audio.fx = g.fx;
      audio.kit = makeAudioKit(ctx, g.master, { seed: (Date.now() & 0xffff) + 1 });
      audio.cues = makeCues(ctx, g.fx, audio.kit);
      audio.kit.amb.set('crowd', want.crowd, 0.01);
      audio.kit.start();
    } catch (e) { audio.ctx = null; audio.kit = null; audio.cues = null; return; }
    applyAudio();
    return;
  }
  if (audio.ctx.state !== 'running' && audio.ctx.state !== 'closed') audio.ctx.resume().catch(() => {});
}

// Hidden tab: fade out, schedule nothing, suspend the context. holdAudio('hidden', false) and unlock() bring it back.
export function suspendAudio() {
  holdAudio('hidden', true);
  if (audio.ctx && audio.ctx.state === 'running') audio.ctx.suspend().catch(() => {});
}
export function holdAudio(reason, on) { holds[reason] = !!on; applyAudio(); }
// Which piece and which place the current screen wants (null for none). Starts when the context exists.
export function setMood(music, amb) { want.music = music; want.amb = amb; applyAudio(); }
// How lively the street is, 0 to 1 (an auction fills it).
export function setCrowd(v) { if (want.crowd === v) return; want.crowd = v; if (audio.kit) audio.kit.amb.set('crowd', v, 0.8); }

export function sfx(name, o = {}) {
  audio.played.push(name); audio.count++; if (audio.played.length > 30) audio.played.shift();
  const c = audio.ctx;
  if (!audio.on || !audio.sfx || !c || !audio.cues || c.state !== 'running') return;
  const now = c.currentTime;
  if (name === 'click') lastClick = now; else if (name === 'open' && now - lastClick < 0.15) return;
  try {
    audio.cues.play(name, now + 0.004, o);
    if (name === 'fanfare') audio.kit.music.duck(6, 1800); else if (name === 'bust') audio.kit.music.duck(4, 700);
  } catch (e) { /* audio is optional */ }
}

// ============================================================================================ test hooks
const nameOf = (table, v) => Object.keys(table).find((k) => table[k] === v) || null;
export function audioList() { return { music: Object.keys(SCORES), ambience: Object.keys(SCENES), cues: CUE_NAMES.slice() }; }
export function audioState(reset) {
  const k = audio.kit, info = k && k.music.info();
  const out = {
    ready: !!audio.ctx, state: audio.ctx ? audio.ctx.state : 'none', music: k ? nameOf(SCORES, k.music.score) : null, amb: k ? nameOf(SCENES, k.amb.scene) : null,
    musicGain: k ? +k.buses.music.gain.value.toFixed(3) : 0, ambGain: k ? +k.buses.amb.gain.value.toFixed(3) : 0, fxTarget: audio.fxTarget ?? 0,
    held: k ? k.held : false, bars: info ? info.bars : 0, heard: audio.played.slice(), count: audio.count,
  };
  if (reset) audio.played.length = 0;
  return out;
}
// Renders one piece ('title', 'play', 'results'), one place ('town', 'bathhouse'), one cue ('cue:coin') or a worst-case
// mix ('mix': play music, town street, and the loudest cues struck together) on an offline context at the shipped
// levels, and measures it. It never touches the live audio or the settings.
export function audioRender(name, seconds = 30, wantWav = false, opt = {}) {
  return measureAudio((oc, dest) => {
    const g = graph(oc, dest), kit = makeAudioKit(oc, g.master, { seed: opt.seed ?? 7 });
    kit.music.level(1); kit.amb.level(1);
    let cues = null;
    const forever = { at: 0, fade: 0.02 };
    if (SCORES[name]) kit.music.play(SCORES[name], forever);
    else if (SCENES[name]) { kit.amb.set('crowd', opt.crowd ?? want.crowd, 0.01); kit.amb.play(SCENES[name], forever); }
    else if (name === 'mix') {
      kit.music.play(SCORES.play, forever); kit.amb.set('crowd', 1, 0.01); kit.amb.play(SCENES.town, forever);
      cues = makeCues(oc, g.fx, kit);
      for (const n of ['fanfare', 'gavel', 'dice', 'coin', 'bust']) cues.play(n, 10, { pitch: 0 });
    } else if (name.startsWith('cue:')) { cues = makeCues(oc, g.fx, kit); cues.play(name.slice(4), 0.05, { pitch: opt.pitch || 0, i: opt.i || 0, m: opt.m || 0 }); }
    kit.scheduleUntil(seconds);
    return () => { const i = kit.music.info(), s = SCORES[name]; return i && s ? { ...i, bpm: s.bpm, formSeconds: +(i.formBars * (s.beats || 4) * 60 / s.bpm).toFixed(1) } : i; };
  }, seconds, { wav: wantWav });
}
