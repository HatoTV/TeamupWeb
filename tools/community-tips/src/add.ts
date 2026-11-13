// Integrates one researched matchup, or one « how to play against » file, into the site data.
//
// Usage: node src/add.ts <draft.json> [draft.notes.json]
// - pair draft (`pair`): computes `abilityHash` of both champions from Data Dragon (patch `gameVersion`),
//   writes public/assets/data/community-tips/{A}__{B}.json, index.json, notes/{A}__{B}.notes.json, progress.json;
// - vs draft (`champion`): same for one champion, in vs/{championId}.json, vs/index.json,
//   notes/vs/{championId}.notes.json and progress-vs.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { abilityHash, championAbilities, ddragonVersion } from './ddragon.ts';
import { DATA_DIR, INDEX_FILE, NOTES_DIR, PROGRESS_FILE, VS_DIR, VS_INDEX_FILE, VS_NOTES_DIR, VS_PROGRESS_FILE, readIndex, readProgress, readVsIndex, today } from './paths.ts';
import { communityTipsSchema, compareTips, notesSchema, pairKey, vsTipsSchema, type Tip } from './schema.ts';

const [draftPath, notesPath] = process.argv.slice(2);
if (!draftPath) {
  console.error('Usage: node src/add.ts <draft.json> [draft.notes.json]');
  process.exit(1);
}

/** Stores the tips in display order (FR and EN keep the same order). */
function sortList(list: { fr: Tip[]; en: Tip[] }): void {
  const order = list.fr.map((_, i) => i).sort((a, b) => compareTips(list.fr[a]!, list.fr[b]!) || a - b);
  list.fr = order.map((i) => list.fr[i]!);
  list.en = order.map((i) => list.en[i]!);
}

function updateProgress(file: string, key: string, status: string): void {
  const progress = readProgress(file) as ReturnType<typeof readProgress> & { queue?: string[] };
  progress.done = progress.done.filter((p) => p !== key);
  progress.inProgress = progress.inProgress.filter((p) => p !== key);
  progress.insufficientSources = progress.insufficientSources.filter((p) => p !== key);
  if (progress.queue) progress.queue = progress.queue.filter((p) => p !== key);
  (status === 'insufficientSources' ? progress.insufficientSources : progress.done).push(key);
  writeFileSync(file, `${JSON.stringify(progress, null, 2)}\n`);
}

const draft = JSON.parse(readFileSync(draftPath, 'utf8')) as Record<string, unknown> & { pair?: [string, string]; champion?: string; gameVersion: string };

if (draft.champion) {
  const id = draft.champion;
  const version = await ddragonVersion(draft.gameVersion);
  const file = vsTipsSchema.parse({ ...draft, abilityHash: abilityHash(await championAbilities(version, id)) });
  sortList(file.tips);
  mkdirSync(VS_DIR, { recursive: true });
  writeFileSync(`${VS_DIR}/${id}.json`, `${JSON.stringify(file, null, 2)}\n`);
  const index = readVsIndex();
  index.champions[id] = file.status;
  index.champions = Object.fromEntries(Object.entries(index.champions).sort(([a], [b]) => a.localeCompare(b)));
  index.updatedAt = today();
  writeFileSync(VS_INDEX_FILE, `${JSON.stringify(index, null, 2)}\n`);
  if (notesPath) {
    mkdirSync(VS_NOTES_DIR, { recursive: true });
    writeFileSync(`${VS_NOTES_DIR}/${id}.notes.json`, `${JSON.stringify(notesSchema.parse(JSON.parse(readFileSync(notesPath, 'utf8'))), null, 2)}\n`);
  } else if (!existsSync(`${VS_NOTES_DIR}/${id}.notes.json`)) {
    console.warn(`vs/${id}: no notes file, the copy check cannot compare with the sources`);
  }
  updateProgress(VS_PROGRESS_FILE, id, file.status);
  console.log(`${basename(draftPath)} → vs/${id}.json (${file.status}, ${file.tips.fr.length} tips, Data Dragon ${version})`);
  process.exit(0);
}

const pair = [...draft.pair!].sort() as [string, string];
const version = await ddragonVersion(draft.gameVersion);
const hashes: Record<string, string> = {};
for (const id of pair) hashes[id] = abilityHash(await championAbilities(version, id));

const file = communityTipsSchema.parse({ ...draft, pair, abilityHash: hashes });
for (const perspective of Object.values(file.perspectives)) sortList(perspective);
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

updateProgress(PROGRESS_FILE, key, file.status);

console.log(`${basename(draftPath)} → ${key}.json (${file.status}, Data Dragon ${version})`);
