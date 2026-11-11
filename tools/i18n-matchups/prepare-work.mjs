#!/usr/bin/env node
// Prepares translation work for parallel translators (not committed: tools/i18n-matchups/work/).
//   - work/chunk-NN.json: untranslated tips grouped by champion, balanced by size
//   - work/glossary-compact.md: abilities (QWERTY/AZERTY, EN → FR), items, runes, summoner spells
//
// Usage: node tools/i18n-matchups/prepare-work.mjs [chunks=16]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const DIR = fileURLToPath(new URL('.', import.meta.url));
const WORK = join(DIR, 'work');
const read = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'));
const chunks = Number(process.argv[2] ?? 16);

const source = read('source.json');
const done = new Set(existsSync(join(DIR, 'matchups-fr.json')) ? read('matchups-fr.json').map((e) => e.id) : []);
const glossary = read('glossary.json');
mkdirSync(WORK, { recursive: true });

const byChampion = new Map();
for (const e of source) {
  if (done.has(e.id)) continue;
  if (!byChampion.has(e.champion)) byChampion.set(e.champion, []);
  byChampion.get(e.champion).push({ id: e.id, enemy: e.enemy, text: e.text });
}

// Greedy balancing: biggest champions first into the lightest chunk.
const size = (tips) => tips.reduce((n, t) => n + t.text.length, 0);
const bins = Array.from({ length: chunks }, () => ({ chars: 0, champions: {} }));
for (const [champion, tips] of [...byChampion].sort((a, b) => size(b[1]) - size(a[1]))) {
  const bin = bins.reduce((min, b) => (b.chars < min.chars ? b : min));
  bin.champions[champion] = tips;
  bin.chars += size(tips);
}
bins.forEach((bin, i) => writeFileSync(join(WORK, `chunk-${String(i + 1).padStart(2, '0')}.json`), JSON.stringify(bin.champions, null, 1)));

const lines = ['# Compact glossary (Data Dragon ' + glossary.version + ')', '', '## Abilities: Champion — Key(QWERTY→AZERTY) EN = FR', ''];
for (const c of Object.values(glossary.champions).sort((a, b) => a.en.localeCompare(b.en))) {
  lines.push(`- ${c.en}: P ${c.passive.en} = ${c.passive.fr}; ` + c.abilities.map((a) => `${a.qwerty}→${a.azerty} ${a.en} = ${a.fr}`).join('; '));
}
lines.push('', '## Items EN = FR', '');
for (const [en, fr] of Object.entries(glossary.items).sort()) lines.push(`- ${en} = ${fr}`);
lines.push('', '## Runes EN = FR', '');
for (const [en, fr] of Object.entries(glossary.runes).sort()) lines.push(`- ${en} = ${fr}`);
lines.push('', '## Summoner spells: EN = FR official → write', '');
for (const [en, s] of Object.entries(glossary.summoners)) lines.push(`- ${en} = ${s.fr} → ${s.community}`);
writeFileSync(join(WORK, 'glossary-compact.md'), lines.join('\n') + '\n');

console.log(bins.map((b, i) => `chunk-${String(i + 1).padStart(2, '0')}: ${Object.keys(b.champions).length} champions, ${b.chars} chars`).join('\n'));
