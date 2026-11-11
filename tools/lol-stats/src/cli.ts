// TeamUpp LoL stats collector.
//   node src/cli.ts crawl       collect new ranked games (time budget: LOL_STATS_BUDGET_MINUTES)
//   node src/cli.ts aggregate   compute statistics from the stored games
//   node src/cli.ts publish     write the JSON files of the site
//   node src/cli.ts dev         small sample with a development key (crawl 500 games + aggregate + publish)
import { loadConfig, type Config } from './config.ts';
import { crawl } from './crawl.ts';
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

switch (command) {
  case 'crawl':
    await runCrawl(loadConfig());
    break;
  case 'dev': {
    const config = loadConfig({ maxGames: Number(process.env.LOL_STATS_MAX_GAMES ?? 500), budgetMinutes: Number(process.env.LOL_STATS_BUDGET_MINUTES ?? 90), pagesPerDivision: 1 });
    await runCrawl(config);
    break;
  }
  default:
    console.error('Usage: node src/cli.ts <crawl|aggregate|publish|dev>');
    process.exitCode = 1;
}
