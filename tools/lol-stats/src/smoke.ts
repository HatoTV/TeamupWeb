// Smoke test of the API key: one league call, prints the limits the server announces (never the key).
// Usage: node src/smoke.ts
import { loadConfig } from './config.ts';
import { apexLeague } from './riot/api.ts';
import { RiotClient } from './riot/client.ts';
import { RateLimiter } from './riot/rate-limiter.ts';

const config = loadConfig();
const limiter = new RateLimiter();
const client = new RiotClient({ apiKey: config.apiKey, limiter });
const platform = config.platforms[0]!;
const league = await apexLeague(client, platform, 'CHALLENGER');
const entries = league?.entries ?? [];
console.log(`${platform} challenger: ${entries.length} players, puuid present: ${entries.filter((e) => e.puuid).length}`);
console.log('app limits:', JSON.stringify(limiter.appBucket(platform).limits));
console.log('method limits:', JSON.stringify(limiter.methodBucket(platform, 'league-v4.challengerleagues').limits));
