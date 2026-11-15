// Smoke test of the API key: a few league-v4 calls, then the limits the server announces (never the key).
// Exits with an error when the application limits are not the production ones (500 / 10 s, 30 000 / 10 min).
// Usage: node src/smoke.ts
import { loadConfig } from './config.ts';
import { apexLeague, leagueEntries } from './riot/api.ts';
import { RiotClient } from './riot/client.ts';

const config = loadConfig();
let last: Headers | null = null;
const client = new RiotClient({
  apiKey: config.apiKey,
  fetch: async (input, init) => {
    const res = await fetch(input, init);
    last = res.headers;
    return res;
  },
});
const platform = config.platforms[0]!;
const show = (name: string) => `${name}: ${last?.get(name) ?? '—'}`;

const challenger = await apexLeague(client, platform, 'CHALLENGER');
console.log(`${platform} challenger: ${challenger?.entries.length ?? 0} players, puuid present: ${challenger?.entries.filter((e) => e.puuid).length ?? 0}`);
const grandmaster = await apexLeague(client, platform, 'GRANDMASTER');
console.log(`${platform} grandmaster: ${grandmaster?.entries.length ?? 0} players`);
const diamond = await leagueEntries(client, platform, 'DIAMOND', 'I', 1);
console.log(`${platform} diamond I page 1: ${diamond?.length ?? 0} players`);
console.log([show('x-app-rate-limit'), show('x-app-rate-limit-count'), show('x-method-rate-limit'), show('x-method-rate-limit-count')].join('\n'));

const app = (last as Headers | null)?.get('x-app-rate-limit') ?? '';
const production = app.split(',').includes('500:10') && app.split(',').includes('30000:600');
console.log(production ? 'Production limits confirmed.' : 'Not the production limits.');
if (!production) process.exitCode = 1;
