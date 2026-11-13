// Integrates one researched matchup into the site data.
//
// Usage: node src/add.ts <draft.json> [draft.notes.json]
// - computes `abilityHash` of both champions from Data Dragon (patch `gameVersion`);
// - writes public/assets/data/community-tips/{A}__{B}.json and updates index.json;
// - keeps the private notes in tools/community-tips/notes/ and updates progress.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { abilityHash, championAbilities, ddragonVersion } from './ddragon.ts';
import { DATA_DIR, INDEX_FILE, NOTES_DIR, PROGRESS_FILE, readIndex, readProgress, today } from './paths.ts';
import { communityTipsSchema, compareTips, notesSchema, pairKey } from './schema.ts';

const [draftPath, notesPath] = process.argv.slice(2);
if (!draftPath) {
  console.error('Usage: node src/add.ts <draft.json> [draft.notes.json]');
  process.exit(1);
}

const draft = JSON.parse(readFileSync(draftPath, 'utf8')) as Record<string, unknown> & { pair: [string, string]; gameVersion: string };
const pair = [...draft.pair].sort() as [string, string];
const version = await ddragonVersion(draft.gameVersion);
const hashes: Record<string, string> = {};
for (const id of pair) hashes[id] = abilityHash(await championAbilities(version, id));

const file = communityTipsSchema.parse({ ...draft, pair, abilityHash: hashes });
// Store the tips in display order (FR and EN keep the same order).
for (const perspective of Object.values(file.perspectives)) {
  const order = perspective.fr.map((_, i) => i).sort((a, b) => compareTips(perspective.fr[a]!, perspective.fr[b]!) || a - b);
  perspective.fr = order.map((i) => perspective.fr[i]!);
  perspective.en = order.map((i) => perspective.en[i]!);
}
const key = pairKey(...pair);
mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(`${DATA_DIR}/${key}.json`, `${JSON.stringify(file, null, 2)}\n`);

const index = readIndex();
index.pairs[key] = file.status;
index.pairs = Object.fromEntries(Object.entries(index.pairs).sort(([a], [b]) => a.localeCompare(b)));
index.updatedAt = today();
writeFileSync(INDEX_FILE, `${JSON.stringify(index, null, 2)}\n`);

if (notesPath) {
  const notes = notesSchema.parse(JSON.parse(readFileSync(notesPath, 'utf8')));
  mkdirSync(NOTES_DIR, { recursive: true });
  writeFileSync(`${NOTES_DIR}/${key}.notes.json`, `${JSON.stringify(notes, null, 2)}\n`);
} else if (!existsSync(`${NOTES_DIR}/${key}.notes.json`)) {
  console.warn(`${key}: no notes file, the copy check cannot compare with the sources`);
}

const progress = readProgress();
progress.done = progress.done.filter((p) => p !== key);
progress.inProgress = progress.inProgress.filter((p) => p !== key);
progress.insufficientSources = progress.insufficientSources.filter((p) => p !== key);
(file.status === 'insufficientSources' ? progress.insufficientSources : progress.done).push(key);
writeFileSync(PROGRESS_FILE, `${JSON.stringify(progress, null, 2)}\n`);

console.log(`${basename(draftPath)} → ${key}.json (${file.status}, Data Dragon ${version})`);
