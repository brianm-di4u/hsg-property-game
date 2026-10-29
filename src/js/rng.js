// Seeded dice. mulberry32 by Tommy Ettinger, as published (public domain) in bryc/code
// jshash/PRNGs.md (commit 88c1317). The whole generator state is one uint32 kept in state.rng,
// so a saved game resumes the exact same sequence.

export function seedState(n) {
  return (Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0) || 1;
}

// Advances state.rng and returns a float in [0, 1).
export function rand(s) {
  let a = (s.rng + 0x6d2b79f5) | 0;
  s.rng = a >>> 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const die = (s) => 1 + Math.floor(rand(s) * 6);

export function shuffle(s, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
