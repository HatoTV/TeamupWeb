// Counts ranked solo players per tier (Emerald → Challenger) on each platform, to size a complete collection.
// Diamond / Emerald divisions are counted by binary search on the page number (about 10 calls per division).
// Usage: LOL_STATS_PLATFORMS=EUW1,KR,NA1 node src/count-players.ts
import { loadConfig } from './config.ts';
import { apexLeague, leagueEntries } from './riot/api.ts';
import { RiotClient } from './riot/client.ts';
import type { Platform } from './riot/routing.ts';

const config = loadConfig();
const client = new RiotClient({ apiKey: config.apiKey });
const DIVISIONS = ['I', 'II', 'III', 'IV'] as const;

async function countDivision(platform: Platform, tier: 'DIAMOND' | 'EMERALD', division: (typeof DIVISIONS)[number]): Promise<number> {
  const size = async (page: number) => (await leagueEntries(client, platform, tier, division, page))?.length ?? 0;
  let lo = 1;
  let hi = 2;
  while ((await size(hi)) === 205) [lo, hi] = [hi, hi * 2];
  // Last full page is in [lo, hi): find the first page with fewer than 205 entries.
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if ((await size(mid)) === 205) lo = mid;
    else hi = mid;
  }
  return lo * 205 + (await size(hi));
}

await Promise.all(
  config.platforms.map(async (platform) => {
    const counts: Record<string, number> = {};
    for (const tier of ['CHALLENGER', 'GRANDMASTER', 'MASTER'] as const) counts[tier] = (await apexLeague(client, platform, tier))?.entries.length ?? 0;
    for (const tier of ['DIAMOND', 'EMERALD'] as const) {
      counts[tier] = 0;
      for (const d of DIVISIONS) counts[tier] += await countDivision(platform, tier, d);
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`${platform}: ${JSON.stringify(counts)} total ${total} (${client.stats.requests} requests so far)`);
  })
);
