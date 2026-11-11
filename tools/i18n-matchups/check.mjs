#!/usr/bin/env node
// Checks matchups-fr.json against source.json and glossary.json. Exit code 1 on any blocking error.
//
//   - same ids as the source (missing ids are reported; with --complete they are errors)
//   - champion / enemy / level strictly unchanged
//   - same numbers (levels, %, timings…) in the source and the translation
//   - no QWERTY key left (Q / W), and every Q / W of the source has its A / Z
//   - no English item / rune name left when a French one exists
//   - no common English words left
//   - FR / EN length ratio between 0.8 and 1.7 (warnings)
//
// Usage: node tools/i18n-matchups/check.mjs [--complete] [--ids=id1,id2]

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const DIR = fileURLToPath(new URL('.', import.meta.url));
const read = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'));
const source = new Map(read('source.json').map((e) => [e.id, e]));
const glossary = read('glossary.json');

const complete = process.argv.includes('--complete');
// --batch=a.json,b.json: check batch files ({ id: text }) directly, without merging them.
const batchFiles = process.argv.find((a) => a.startsWith('--batch='))?.slice(8).split(',');
const target = batchFiles
  ? batchFiles.flatMap((f) =>
      Object.entries(JSON.parse(readFileSync(f, 'utf8'))).map(([id, text]) => ({ ...(source.get(id) ?? {}), id, text }))
    )
  : read('matchups-fr.json');
let onlyIds = process.argv.find((a) => a.startsWith('--ids='))?.slice(6).split(',');
if (batchFiles) onlyIds = target.map((t) => t.id);

/** Tokens that look like keys but are not abilities. */
const KEY_EXCEPTIONS = /\b(QSS|QWER|W\/L|WR)\b/g;
const ENGLISH_WORDS = /\b(the|you|your|when|don't|dont|can't|cant|with|against|will|should|which|because|early on|play safe and|get)\b/i;

const errors = [];
const warnings = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const warn = (id, msg) => warnings.push(`${id}: ${msg}`);

const numbers = (s) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.')).sort();
const count = (s, re) => (s.replace(KEY_EXCEPTIONS, '').match(re) ?? []).length;

/** English item / rune names whose French name differs (longest first, word-bounded). */
const translatable = Object.entries({ ...glossary.items, ...glossary.runes })
  .filter(([en, fr]) => en !== fr && en.length > 3)
  .sort((a, b) => b[0].length - a[0].length);

const seen = new Set();
for (const t of target) {
  if (onlyIds && !onlyIds.includes(t.id)) continue;
  const s = source.get(t.id);
  if (!s) {
    err(t.id, 'id not in source');
    continue;
  }
  if (seen.has(t.id)) err(t.id, 'duplicate id');
  seen.add(t.id);

  if (t.champion !== s.champion || t.enemy !== s.enemy || t.level !== s.level) err(t.id, 'champion / enemy / level changed');

  const a = numbers(s.text).join(' ');
  const b = numbers(t.text).join(' ');
  if (a !== b) err(t.id, `numbers differ: [${a}] → [${b}]`);

  // Keys: no standalone Q / W in French; Q/W count of the source must be matched by A/Z.
  const residual = t.text.replace(KEY_EXCEPTIONS, '').match(/(?<![\p{L}'’])[QW](?![\p{L}])/gu);
  if (residual) err(t.id, `QWERTY key left: ${residual.join(', ')}`);
  // Source keys may be lowercase ("q Naut", "his q"); French keys are always written uppercase.
  const srcQ = count(s.text, /(?<![\p{L}'’])[Qq](?![\p{L}])|\b(?:[QWER]{2,4})\b/gu);
  const srcW = count(s.text, /(?<![\p{L}'’])[Ww](?![\p{L}])/gu);
  const frA = count(t.text, /(?<![\p{L}'’])A(?![\p{L}])|\b(?:[AZER]{2,4})\b/gu);
  const frZ = count(t.text, /(?<![\p{L}'’])Z(?![\p{L}])/gu);
  if (frA < srcQ) warn(t.id, `fewer A (${frA}) than source Q (${srcQ})`);
  if (frZ < srcW) warn(t.id, `fewer Z (${frZ}) than source W (${srcW})`);

  for (const [en, fr] of translatable) {
    const re = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(t.text) && !t.text.includes(fr)) err(t.id, `English name left: "${en}" (FR: "${fr}")`);
  }

  const english = t.text.match(ENGLISH_WORDS);
  if (english) err(t.id, `English word left: "${english[0]}"`);

  const ratio = t.text.length / s.text.length;
  if (ratio < 0.8 || ratio > 1.7) warn(t.id, `length ratio ${ratio.toFixed(2)}`);
}

const scoped = onlyIds ? onlyIds.length : source.size;
const missing = onlyIds ? onlyIds.filter((id) => !seen.has(id)) : [...source.keys()].filter((id) => !seen.has(id));
if (missing.length) (complete || onlyIds ? errors : warnings).push(`${missing.length} id(s) not translated yet`);

console.log(`Checked ${seen.size}/${scoped} translations`);
for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(errors.length ? `${errors.length} error(s)` : 'OK: no blocking error');
process.exitCode = errors.length ? 1 : 0;
