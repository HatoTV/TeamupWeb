#!/usr/bin/env node
// Merges translated batches (tools/i18n-matchups/batches/*.json, `{ id: frenchText }`) into matchups-fr.json.
// Resumable: an id already present in matchups-fr.json is never overwritten (use --force to replace).
// `champion`, `enemy` and `level` are copied from source.json; only `text` comes from the batch.
//
// Usage: node tools/i18n-matchups/apply-batch.mjs [--force] [batch files…]   (default: every batch)

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const DIR = fileURLToPath(new URL('.', import.meta.url));
const SOURCE = join(DIR, 'source.json');
const TARGET = join(DIR, 'matchups-fr.json');
const BATCHES = join(DIR, 'batches');

const args = process.argv.slice(2);
const force = args.includes('--force');
const files = args.filter((a) => a !== '--force');
const batchFiles = files.length ? files : readdirSync(BATCHES).filter((f) => f.endsWith('.json')).sort().map((f) => join(BATCHES, f));

const source = new Map(JSON.parse(readFileSync(SOURCE, 'utf8')).map((e) => [e.id, e]));
const target = new Map(existsSync(TARGET) ? JSON.parse(readFileSync(TARGET, 'utf8')).map((e) => [e.id, e]) : []);

let added = 0;
let skipped = 0;
const unknown = [];
for (const file of batchFiles) {
  const batch = JSON.parse(readFileSync(file, 'utf8'));
  for (const [id, text] of Object.entries(batch)) {
    const src = source.get(id);
    if (!src) {
      unknown.push(id);
      continue;
    }
    if (target.has(id) && !force) {
      skipped++;
      continue;
    }
    target.set(id, { id, champion: src.champion, enemy: src.enemy, level: src.level, text: String(text).trim() });
    added++;
  }
}

// Keep the source order so diffs stay readable.
const ordered = [...source.keys()].filter((id) => target.has(id)).map((id) => target.get(id));
writeFileSync(TARGET, JSON.stringify(ordered, null, 1) + '\n');
console.log(`${added} added, ${skipped} already translated, ${ordered.length}/${source.size} translated in total`);
if (unknown.length) {
  console.error(`Unknown ids (not in source.json): ${unknown.join(', ')}`);
  process.exitCode = 1;
}
