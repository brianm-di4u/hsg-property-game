#!/usr/bin/env node
// Confirms every fact the game displays (deeds, seasons, Headlines, Town Talk) traces to the
// audited trivia bank (games/trivia/data/questions.json: id exists, `confirmed`, same source,
// and every number in the displayed line appears in that bank item) or to a research file
// (the quoted phrase and every number appear in the file). Exit 1 on any failure.
//   node games/property-game/tools/check-facts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { data } from './sim.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const bank = JSON.parse(fs.readFileSync(path.join(root, 'games/trivia/data/questions.json'), 'utf8')).questions;
const norm = (t) => t.replace(/[–—]/g, '-').replace(/’/g, "'");
// Numbers as shown (years, money, counts); "1914–15" style ranges check both parts.
const numbers = (t) => (norm(t).match(/\d[\d,.]*\d|\d/g) || []).map((n) => n.replace(/[.,]$/, ''));

const facts = [];
for (const s of data.SPACES) if (s.fact) facts.push({ where: `space ${s.i} ${s.name}`, ...s.fact });
for (const x of data.SEASONS) if (x.fact) facts.push({ where: `season ${x.name}`, ...x.fact });
for (const c of [...data.NEWS, ...data.TALK]) if (c.fact) facts.push({ where: `card ${c.id}`, ...c.fact });

let bad = 0;
for (const f of facts) {
  const problems = [];
  if (f.bank) {
    const q = bank.find((x) => x.id === f.bank);
    if (!q) problems.push('id not in the audited bank');
    else {
      if (q.confidence !== 'confirmed') problems.push(`confidence is ${q.confidence}`);
      if (q.source !== f.src) problems.push(`source differs: bank says "${q.source}"`);
      const hay = norm(`${q.question} ${q.answer} ${q.explanation}`).replace(/,/g, '');
      for (const n of numbers(f.text)) if (!hay.includes(n.replace(/,/g, ''))) problems.push(`number ${n} not in ${f.bank}`);
    }
  } else if (f.ref) {
    const file = path.join(root, f.ref);
    if (!fs.existsSync(file)) problems.push(`missing ${f.ref}`);
    else {
      const txt = norm(fs.readFileSync(file, 'utf8'));
      if (!txt.includes(norm(f.quote))) problems.push(`quote not found in ${f.ref}: "${f.quote}"`);
      for (const n of numbers(f.text)) if (!txt.replace(/,/g, '').includes(n.replace(/,/g, ''))) problems.push(`number ${n} not in ${f.ref}`);
    }
  } else problems.push('no bank id or research reference');
  if (problems.length) { bad++; console.log(`FAIL ${f.where}: ${problems.join('; ')}`); }
  else console.log(`ok   ${f.where.padEnd(34)} ${f.bank || f.ref}`);
}
const fictional = [...data.TALK, ...data.NEWS].filter((c) => !c.fact).map((c) => c.id);
console.log(`\n${facts.length - bad}/${facts.length} displayed facts verified; fictional cards (labelled on screen): ${fictional.join(', ') || 'none'}`);
process.exit(bad ? 1 : 0);
