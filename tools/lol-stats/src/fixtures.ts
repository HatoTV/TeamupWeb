// Downloads 5 real ranked games (match + timeline) of the current patch into fixtures/ for the tests.
// Anonymised: fake match ids, fake puuid / Riot ID, only the participant fields we use, and timelines
// reduced to item / skill events.
// Usage: node src/fixtures.ts            download new fixtures
//        node src/fixtures.ts --rewrite  re-anonymise the files already in fixtures/ (no API call)
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACKAGE_DIR, loadConfig } from './config.ts';
import { DataDragon } from './ddragon.ts';
import { currentPatch, isGameInPatch } from './patch.ts';
import { apexLeague, match, matchIds, timeline, type MatchDto, type TimelineDto } from './riot/api.ts';
import { RiotClient } from './riot/client.ts';

const KEEP_EVENTS = new Set(['ITEM_PURCHASED', 'ITEM_SOLD', 'ITEM_DESTROYED', 'ITEM_UNDO', 'SKILL_LEVEL_UP']);
const KEEP_FIELDS = [
  'participantId',
  'championId',
  'championName',
  'teamId',
  'teamPosition',
  'individualPosition',
  'win',
  'summoner1Id',
  'summoner2Id',
  'perks',
  'gameEndedInEarlySurrender',
  'item0',
  'item1',
  'item2',
  'item3',
  'item4',
  'item5',
  'item6',
];

export function anonymise(m: MatchDto, t: TimelineDto, fakeMatchId: string): { match: MatchDto; timeline: TimelineDto } {
  const ids = new Map<string, string>();
  const fake = (puuid: string) => {
    if (!ids.has(puuid)) ids.set(puuid, `puuid-${ids.size + 1}`);
    return ids.get(puuid)!;
  };
  const participants = m.info.participants.map((p, i) => ({
    ...Object.fromEntries(KEEP_FIELDS.filter((k) => k in p).map((k) => [k, (p as unknown as Record<string, unknown>)[k]])),
    puuid: fake(p.puuid),
    riotIdGameName: `Player${i + 1}`,
    riotIdTagline: 'TEST',
  }));
  const { gameVersion, gameDuration, queueId, teams } = m.info;
  return {
    match: { metadata: { matchId: fakeMatchId }, info: { gameVersion, gameDuration, gameCreation: 0, queueId, teams, participants } } as MatchDto,
    timeline: {
      metadata: { matchId: fakeMatchId },
      info: { frames: t.info.frames.map((f) => ({ timestamp: f.timestamp, events: f.events.filter((e) => KEEP_EVENTS.has(e.type)) })) },
    },
  };
}

const dir = join(PACKAGE_DIR, 'fixtures');

async function download(): Promise<void> {
  const config = loadConfig();
  const client = new RiotClient({ apiKey: config.apiKey });
  const platform = config.platforms[0]!;
  const { patch } = currentPatch(await new DataDragon().versions());
  const league = await apexLeague(client, platform, 'CHALLENGER');
  mkdirSync(dir, { recursive: true });
  const saved = new Set<string>();
  for (const entry of league?.entries ?? []) {
    if (saved.size >= 5) break;
    const ids = (await matchIds(client, platform, entry.puuid!, Math.floor(Date.now() / 1000) - 7 * 86400, 5)) ?? [];
    for (const id of ids) {
      if (saved.size >= 5 || saved.has(id)) continue;
      const m = await match(client, platform, id);
      if (!m || !isGameInPatch(m.info.gameVersion, patch) || m.info.gameDuration < 15 * 60) continue;
      const t = await timeline(client, platform, id);
      if (!t) continue;
      saved.add(id);
      const fakeId = `TEST_${saved.size}`;
      writeFileSync(join(dir, `${fakeId}.json`), JSON.stringify(anonymise(m, t, fakeId)));
      console.log(`saved game ${saved.size} (${m.info.gameVersion}, ${Math.round(m.info.gameDuration / 60)} min)`);
      break; // one game per player for variety
    }
  }
  console.log(`${saved.size} fixtures in ${dir} · ${client.stats.requests} requests`);
}

function rewrite(): void {
  let n = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const { match: m, timeline: t } = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    const fakeId = `TEST_${++n}`;
    writeFileSync(join(dir, `${fakeId}.json`), JSON.stringify(anonymise(m, t, fakeId)));
    if (file !== `${fakeId}.json`) rmSync(join(dir, file));
  }
  console.log(`${n} fixtures re-anonymised`);
}

if (process.argv[1]?.endsWith('fixtures.ts')) {
  if (process.argv.includes('--rewrite')) rewrite();
  else await download();
}
