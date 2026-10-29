// Short, quiet WebAudio sounds. Created on the first user gesture; mutable from Settings.
export const audio = { ctx: null, on: true, vol: 0.35, played: [] };

export function unlock() {
  if (audio.ctx) { if (audio.ctx.state === 'suspended') audio.ctx.resume(); return; }
  try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audio.ctx = new AC(); } catch (e) { audio.ctx = null; }
}

function tone(f, t0, dur, type = 'sine', g = 0.3, slide = 0) {
  const c = audio.ctx, o = c.createOscillator(), a = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + dur);
  a.gain.setValueAtTime(0.0001, t0); a.gain.exponentialRampToValueAtTime(g * audio.vol, t0 + 0.01); a.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(a).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(t0, dur, g = 0.2, hp = 800) {
  const c = audio.ctx, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource(), f = c.createBiquadFilter(), a = c.createGain();
  src.buffer = b; f.type = 'highpass'; f.frequency.value = hp; a.gain.value = g * audio.vol;
  src.connect(f).connect(a).connect(c.destination); src.start(t0);
}

export function sfx(name) {
  audio.played.push(name); if (audio.played.length > 30) audio.played.shift();
  if (!audio.on || !audio.ctx) return;
  const t = audio.ctx.currentTime;
  try {
    switch (name) {
      case 'dice': for (let k = 0; k < 4; k++) noise(t + k * 0.07, 0.05, 0.25, 1800); break;
      case 'step': tone(520, t, 0.05, 'triangle', 0.08); break;
      case 'coin': tone(988, t, 0.08, 'square', 0.08); tone(1319, t + 0.07, 0.14, 'square', 0.08); break;
      case 'pay': tone(440, t, 0.1, 'triangle', 0.15, -120); break;
      case 'card': noise(t, 0.12, 0.15, 3000); tone(660, t + 0.05, 0.08, 'sine', 0.1); break;
      case 'build': tone(220, t, 0.06, 'square', 0.12); tone(330, t + 0.08, 0.06, 'square', 0.12); break;
      case 'gavel': tone(140, t, 0.18, 'square', 0.2, -60); noise(t, 0.05, 0.2, 400); break;
      case 'bid': tone(784, t, 0.07, 'triangle', 0.12); break;
      case 'error': tone(180, t, 0.15, 'sawtooth', 0.08); break;
      case 'fanfare': [523, 659, 784, 1047].forEach((f, k) => tone(f, t + k * 0.12, 0.22, 'triangle', 0.16)); break;
      case 'bust': [392, 330, 262].forEach((f, k) => tone(f, t + k * 0.14, 0.2, 'triangle', 0.14)); break;
    }
  } catch (e) { /* audio is optional */ }
}
