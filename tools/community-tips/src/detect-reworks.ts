// Detects champion reworks since the research of each matchup (run on every new patch).
//
// Usage: node src/detect-reworks.ts [--dry-run]
// For each champion of a researched pair, the current `abilityHash` (latest Data Dragon) is compared
// with the one stored at research time. When it differs, the abilities of both patches are compared:
// - renamed passive or spell, or a description that changed a lot (beyond numbers) → rework;
// - numbers only (cooldowns, damage) → balance change, ignored.
// On a rework, every file of the champion goes to `needsRecheck` (index.json too) and a GitHub issue
// « Rework détecté : {champion} » lists the matchups to redo (GITHUB_TOKEN + GITHUB_REPOSITORY, set by Actions).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { abilityHash, championAbilities, ddragonVersion, type ChampionAbilities } from './ddragon.ts';
import { reworkReasons } from './rework.ts';
import { DATA_DIR, INDEX_FILE, readIndex, today } from './paths.ts';
import { communityTipsSchema, pairKey, type CommunityTips } from './schema.ts';

const dryRun = process.argv.includes('--dry-run');
const CDN = 'https://ddragon.leagueoflegends.com';

async function main(): Promise<void> {
  const latest = ((await (await fetch(`${CDN}/api/versions.json`)).json()) as string[])[0]!;
  const files = readdirSync(DATA_DIR)
    .filter((f) => f.includes('__') && f.endsWith('.json'))
    .map((f) => communityTipsSchema.parse(JSON.parse(readFileSync(`${DATA_DIR}/${f}`, 'utf8'))));

  const abilities = new Map<string, Promise<ChampionAbilities>>();
  const load = (version: string, id: string) => {
    const key = `${version}/${id}`;
    if (!abilities.has(key)) abilities.set(key, championAbilities(version, id));
    return abilities.get(key)!;
  };

  // Champion → reasons and the matchups to redo.
  const reworks = new Map<string, { reasons: Set<string>; files: CommunityTips[] }>();
  for (const file of files) {
    if (file.status === 'insufficientSources') continue;
    for (const id of file.pair) {
      const now = await load(latest, id);
      if (abilityHash(now) === file.abilityHash[id]) continue;
      const before = await load(await ddragonVersion(file.gameVersion), id);
      const reasons = reworkReasons(before, now);
      if (!reasons.length) continue;
      const entry = reworks.get(id) ?? { reasons: new Set<string>(), files: [] };
      reasons.forEach((r) => entry.reasons.add(r));
      entry.files.push(file);
      reworks.set(id, entry);
    }
  }

  if (!reworks.size) {
    console.log(`No rework detected (Data Dragon ${latest}, ${files.length} file(s)).`);
    return;
  }

  const index = readIndex();
  for (const [champion, { reasons, files: affected }] of reworks) {
    const keys = affected.map((f) => pairKey(...f.pair));
    console.log(`Rework: ${champion} (${[...reasons].join('; ')}) → ${keys.join(', ')}`);
    if (dryRun) continue;
    for (const file of affected) {
      if (file.status === 'needsRecheck') continue;
      file.status = 'needsRecheck';
      const key = pairKey(...file.pair);
      writeFileSync(`${DATA_DIR}/${key}.json`, `${JSON.stringify(file, null, 2)}\n`);
      index.pairs[key] = 'needsRecheck';
    }
    await openIssue(champion, latest, [...reasons], keys);
  }
  if (!dryRun) {
    index.updatedAt = today();
    writeFileSync(INDEX_FILE, `${JSON.stringify(index, null, 2)}\n`);
  }
}

/** Opens « Rework détecté : {champion} » unless an open issue with that title exists. */
async function openIssue(champion: string, version: string, reasons: string[], matchups: string[]): Promise<void> {
  const token = process.env['GITHUB_TOKEN'];
  const repo = process.env['GITHUB_REPOSITORY'];
  const title = `Rework détecté : ${champion}`;
  if (!token || !repo) {
    console.log(`(no GITHUB_TOKEN / GITHUB_REPOSITORY: issue « ${title} » not opened)`);
    return;
  }
  const api = `https://api.github.com/repos/${repo}/issues`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const open = (await (await fetch(`${api}?state=open&per_page=100`, { headers })).json()) as Array<{ title: string }>;
  if (open.some((i) => i.title === title)) return;
  const body = [
    `Data Dragon ${version} : les compétences de **${champion}** ont changé depuis la recherche des tips de la communauté.`,
    '',
    '**Changements détectés**',
    ...reasons.map((r) => `- ${r}`),
    '',
    `**Matchups à refaire** (passés en \`needsRecheck\`, badge « À revérifier depuis le rework » sur le site)`,
    ...matchups.map((m) => `- [ ] ${m.replace('__', ' vs ')}`),
  ].join('\n');
  const res = await fetch(api, { method: 'POST', headers, body: JSON.stringify({ title, body }) });
  if (!res.ok) throw new Error(`GitHub issue: ${res.status} ${await res.text()}`);
  console.log(`Issue opened: ${title}`);
}

await main();
