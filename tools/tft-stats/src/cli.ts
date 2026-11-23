// Usage: node src/cli.ts <crawl|publish|full|sample|smoke|count>   (see README.md)
import { readFileSync } from 'node:fs';
import { RiotClient } from '../../lol-stats/src/riot/client.ts';
import type { Platform } from '../../lol-stats/src/riot/routing.ts';
import { r2FromEnv, r2PublicFromEnv } from '../../lol-stats/src/state/r2.ts';
import { FileStateStore, type StateStore } from '../../lol-stats/src/state/store.ts';
import type { TftStatic } from '../../../src/app/tft/logic/tft-types.ts';
import { REPO_DIR, loadConfig } from './config.ts';
import { crawlPlatform, loadPlayers } from './crawl.ts';
import { publish, resolvePatches, storedRecords } from './publish.ts';
import { apexLeague, leagueEntries, match, matchIds, summonerByPuuid } from './riot.ts';
import { sampleRecords } from './sample.ts';
import { loadSetData } from './static.ts';

const command = process.argv[2] ?? 'full';
const config = loadConfig();

/** Private state: R2 (prefix `tft-stats/`) on GitHub Actions, a local folder otherwise. */
function openStore(): StateStore {
  return r2FromEnv({ ...process.env, R2_PREFIX: 'tft-stats' }) ?? new FileStateStore(config.stateDir);
}

async function crawl() {
  const store = openStore();
  const patches = await resolvePatches(store);
  const deadline = Date.now() + config.budgetMinutes * 60_000;
  console.log(`Crawl ${config.platforms.join(', ')} · patches ${patches.current}${patches.previous ? ` and ${patches.previous}` : ''} · ${config.budgetMinutes} min`);
  const reports = await Promise.all(config.platforms.map((platform) => crawlPlatform(platform, patches, config, { client: new RiotClient({ apiKey: config.apiKey }), store }, deadline)));
  for (const r of reports) console.log(JSON.stringify(r));
}

async function publishAll() {
  const store = openStore();
  const patches = await resolvePatches(store);
  const list = [patches.current, ...(patches.previous ? [patches.previous] : [])];
  const publicStore = r2PublicFromEnv();
  await publish(
    list.map((patch) => ({ patch, releasedAt: patches.firstSeen[patch], records: () => storedRecords(store, patch) })),
    loadSetData(config.set),
    config,
    { publicStore, writeAllLocally: !publicStore }
  );
}

async function sample() {
  const data = JSON.parse(readFileSync(`${REPO_DIR}public/data/tft/static/set${config.set}/en.json`, 'utf8')) as TftStatic;
  const lol = JSON.parse(readFileSync(`${REPO_DIR}public/data/lol/builds/meta.json`, 'utf8')) as { patches: Array<{ patch: string }> };
  const [current, previous] = lol.patches.map((p) => p.patch);
  const matches = Number(process.env['TFT_SAMPLE_MATCHES'] ?? 30000);
  const list = [current!, ...(previous ? [previous] : [])];
  await publish(
    list.map((patch, i) => ({ patch, records: () => sampleRecords(data, patch, i === 0 ? matches : Math.round(matches / 2), 18 + i) })),
    loadSetData(config.set),
    config,
    { publicStore: null, writeAllLocally: true },
    { sample: true }
  );
}

/** Checks that the key can call the TFT APIs (status and limits only, never the key). */
async function smoke() {
  let last: Headers | null = null;
  const client = new RiotClient({
    apiKey: config.apiKey,
    maxRetries: 1,
    fetch: async (input, init) => {
      const res = await fetch(input, init);
      last = res.headers;
      console.log(`${res.status} ${String(input).replace(/\?.*/, '').replace(/by-puuid\/[^/]+/, 'by-puuid/…').replace(/matches\/[A-Z0-9]+_\d+/, 'matches/…')}`);
      return res;
    },
  });
  const platform = config.platforms[0]!;
  const challenger = await apexLeague(client, platform, 'CHALLENGER', 'ranked');
  const puuid = challenger?.entries[0]?.puuid;
  console.log(`challenger: ${challenger?.entries.length ?? 0} players`);
  const diamond = await leagueEntries(client, platform, 'DIAMOND', 'I', 1, 'ranked');
  console.log(`diamond I page 1: ${diamond?.length ?? 0} players`);
  if (puuid) {
    await summonerByPuuid(client, platform, puuid);
    const ids = await matchIds(client, platform, puuid, Math.floor(Date.now() / 1000) - 7 * 86400, 5);
    if (ids?.[0]) {
      const m = await match(client, platform, ids[0]);
      const p = m?.info.participants[0];
      console.log(`match: set ${m?.info.tft_set_number}, queue ${m?.info.queue_id}, ${m?.info.game_version}; participant fields: ${p ? Object.keys(p).join(', ') : '—'}`);
    }
  }
  const h = last as Headers | null;
  console.log(`x-app-rate-limit: ${h?.get('x-app-rate-limit') ?? '—'} · x-method-rate-limit: ${h?.get('x-method-rate-limit') ?? '—'}`);
}

/** Players per tier and per queue (sizing of the collection). */
async function count() {
  const client = new RiotClient({ apiKey: config.apiKey });
  for (const platform of config.platforms as Platform[]) {
    const list = await loadPlayers(client, new FileStateStore(`${config.stateDir}/count`), platform, config, Date.now());
    const byTier: Record<string, number> = {};
    for (const p of list.players) for (const [q, t] of Object.entries(p.tiers)) byTier[`${q} ${t}`] = (byTier[`${q} ${t}`] ?? 0) + 1;
    console.log(platform, list.players.length, 'players', JSON.stringify(byTier));
  }
}

const commands: Record<string, () => Promise<void>> = {
  crawl,
  publish: publishAll,
  full: async () => {
    await crawl();
    await publishAll();
  },
  sample,
  smoke,
  count,
};
const run = commands[command];
if (!run) {
  console.error(`Unknown command: ${command} (${Object.keys(commands).join(', ')})`);
  process.exit(1);
}
await run();
