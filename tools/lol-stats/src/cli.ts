// TeamUpp LoL stats collector.
//   node src/cli.ts crawl       collect new ranked games (time budget: LOL_STATS_BUDGET_MINUTES)
//   node src/cli.ts aggregate   compute the statistics of the current patch and write the build JSON files
//   node src/cli.ts publish     meta.json, static Data Dragon data, keep only the current and previous patch
//   node src/cli.ts dev         small sample with a development key: crawl (500 games) + aggregate + publish
import { loadConfig, type Config } from './config.ts';
import { crawl } from './crawl.ts';
import { aggregateAndWrite, writeMeta, type AggregateReport } from './publish.ts';
import { RiotClient } from './riot/client.ts';
import { openStore } from './state/open.ts';

const command = process.argv[2];

async function runCrawl(config: Config): Promise<void> {
  const store = openStore(config);
  const client = new RiotClient({ apiKey: config.apiKey });
  for (const report of await crawl(config, { client, store })) {
    console.log(
      `[crawl] ${report.platform} patch ${report.patch}: ${report.newGames} new games in ${report.minutes} min ` +
        `(${report.playersCrawled} players crawled, ${report.requests} requests, ${report.rateLimited} × 429) ` +
        `players ${JSON.stringify(report.players)} skipped ${JSON.stringify(report.skipped)}`
    );
  }
}

async function runAggregate(config: Config): Promise<AggregateReport> {
  const report = await aggregateAndWrite(config, openStore(config));
  console.log(
    `[aggregate] patch ${report.patch}: ${report.files} files, largest ${Math.round(report.largestBytes / 1024)} kB, games ${JSON.stringify(report.totals)}`
  );
  if (report.oversized.length) console.warn(`[aggregate] over 30 kB: ${report.oversized.join(', ')}`);
  return report;
}

async function runPublish(config: Config, report?: AggregateReport): Promise<void> {
  const r = report ?? (await runAggregate(config));
  const meta = await writeMeta(config, openStore(config), r);
  console.log(`[publish] meta.json: latest ${meta.latest}, patches ${meta.patches.map((p) => p.patch).join(', ')}`);
}

switch (command) {
  case 'crawl':
    await runCrawl(loadConfig());
    break;
  case 'aggregate':
    await runAggregate(loadConfig());
    break;
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
      minMatchupGames: Number(process.env.LOL_STATS_MIN_MATCHUP_GAMES ?? 2),
      minPlayerGames: 2,
    });
    if (!process.argv.includes('--no-crawl')) await runCrawl(config);
    await runPublish(config);
    break;
  }
  default:
    console.error('Usage: node src/cli.ts <crawl|aggregate|publish|dev>');
    process.exitCode = 1;
}
