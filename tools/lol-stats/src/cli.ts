// TeamUpp LoL stats collector.
//   node src/cli.ts crawl       collect new ranked games of the current and previous patch (time budget: LOL_STATS_BUDGET_MINUTES)
//   node src/cli.ts publish     aggregate both patches, meta.json, static Data Dragon data, upload to the public bucket
//   node src/cli.ts dev         small sample with a development key: crawl (500 games) + publish
import { loadConfig, type Config } from './config.ts';
import { crawl } from './crawl.ts';
import { publish } from './publish.ts';
import { RiotClient } from './riot/client.ts';
import { openStore } from './state/open.ts';
import { r2PublicFromEnv } from './state/r2.ts';

const command = process.argv[2];

async function runCrawl(config: Config): Promise<void> {
  const store = openStore(config);
  const clients = new Map(config.platforms.map((p) => [p, new RiotClient({ apiKey: config.apiKey })]));
  const client = clients.get(config.platforms[0]!)!;
  for (const report of await crawl(config, { client, clientFor: (p) => clients.get(p)!, store })) {
    console.log(
      `[crawl] ${report.platform} patch ${report.patch}: ${report.newGames} new games ${JSON.stringify(report.newGamesByPatch)} in ${report.minutes} min ` +
        `(rotation: pass ${report.passes + 1}, player ${report.cursor}; ${report.playersCrawled} players crawled, ${report.requests} requests, ${report.rateLimited} × 429) ` +
        `players ${JSON.stringify(report.players)} skipped ${JSON.stringify(report.skipped)}`
    );
  }
}

async function runPublish(config: Config): Promise<void> {
  const started = Date.now();
  const { reports, meta, uploads } = await publish(config, openStore(config), r2PublicFromEnv());
  for (const r of reports) {
    if (!r.aggregated) console.log(`[publish] patch ${r.patch}: no new games, files kept`);
    else console.log(`[publish] patch ${r.patch}: ${r.files} files, largest ${Math.round(r.largestBytes / 1024)} kB, games ${JSON.stringify(r.totals)}`);
    if (r.oversized.length) console.warn(`[publish] over 30 kB: ${r.oversized.slice(0, 20).join(', ')}`);
  }
  if (Object.keys(uploads).length) console.log(`[publish] public bucket: ${JSON.stringify(uploads)}`);
  console.log(`[publish] meta.json: latest ${meta.latest}, patches ${meta.patches.map((p) => p.patch).join(', ')} (${Math.round((Date.now() - started) / 60000)} min)`);
}

switch (command) {
  case 'crawl':
    await runCrawl(loadConfig());
    break;
  case 'aggregate':
  case 'publish':
    await runPublish(loadConfig());
    break;
  case 'dev': {
    const config = loadConfig({
      maxGames: Number(process.env.LOL_STATS_MAX_GAMES ?? 500),
      budgetMinutes: Number(process.env.LOL_STATS_BUDGET_MINUTES ?? 90),
      pagesPerDivision: 1,
      // Small sample: lower thresholds so that pages have something to show.
      minBuildGames: Number(process.env.LOL_STATS_MIN_BUILD_GAMES ?? 3),
      offMetaMinGames: Number(process.env.LOL_STATS_OFF_META_MIN_GAMES ?? 3),
      minMatchupGames: Number(process.env.LOL_STATS_MIN_MATCHUP_GAMES ?? 2),
      sample: true,
    });
    if (!process.argv.includes('--no-crawl')) await runCrawl(config);
    await runPublish(config);
    break;
  }
  default:
    console.error('Usage: node src/cli.ts <crawl|publish|dev>');
    process.exitCode = 1;
}
