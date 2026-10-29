// Shared Node loader for the rules engine and AI (used by balance.mjs and quick checks).
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../src/js');
const imp = (f) => import(pathToFileURL(path.join(src, f)).href);
export const data = await imp('data.js');
export const engine = await imp('engine.js');
export const ai = await imp('ai.js');

// Plays one AI-only game; returns the final state. Throws if an AI picks an illegal action.
export function playGame(opts, maxActions = 60000, maxRounds = 120) {
  const s = engine.createGame(opts);
  let n = 0;
  while (!s.ended && n++ < maxActions && s.round <= maxRounds) {
    const a = ai.aiAction(s);
    const r = engine.apply(s, a);
    if (!r.ok) throw new Error(`illegal AI action ${JSON.stringify(a)} in ${s.phase}: ${r.error} (round ${s.round})`);
  }
  s.stalled = !s.ended;
  return s;
}
