import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { aggregate, type AggregateOutput } from './aggregate/aggregate.ts';
import type { Names } from './aggregate/summary.ts';
import { TIER_FILTERS, type Config, type SampledTier } from './config.ts';
import { gamesPrefix, patchMetaKey, type PatchMeta } from './crawl.ts';
import { COMMUNITY_DRAGON_PERKS, DataDragon, type Lang } from './ddragon.ts';
import type { GameRecord } from './extract/game.ts';
import { previousPatch } from './patch.ts';
import type { PlayerList } from './players.ts';
import { championBuildSchema, indexSchema, metaSchema, type IndexJson, type MetaJson } from './schema.ts';
import { decodeJsonl, getJson, type StateStore } from './state/store.ts';

const MAX_FILE_BYTES = 30 * 1024;

function writeJson(file: string, value: unknown): number {
  mkdirSync(dirname(file), { recursive: true });
  const body = JSON.stringify(value);
  writeFileSync(file, body);
  return Buffer.byteLength(body);
}

async function* storedGames(store: StateStore, patch: string): AsyncGenerator<GameRecord> {
  for (const key of await store.list(gamesPrefix(patch))) {
    const body = await store.get(key);
    if (body) yield* decodeJsonl<GameRecord>(body);
  }
}

async function namesFor(ddragon: DataDragon, version: string): Promise<Names & { ddragonIds: Map<number, string> }> {
  const [chFr, chEn, itFr, itEn] = await Promise.all([
    ddragon.champions(version, 'fr_FR'),
    ddragon.champions(version, 'en_US'),
    ddragon.items(version, 'fr_FR'),
    ddragon.items(version, 'en_US'),
  ]);
  const champs = (data: typeof chFr) => new Map(Object.values(data.data).map((c) => [Number(c.key), c.name]));
  const items = (data: typeof itFr) => new Map(Object.entries(data.data).map(([id, i]) => [Number(id), i.name]));
  return {
    champions: { fr: champs(chFr), en: champs(chEn) },
    items: { fr: items(itFr), en: items(itEn) },
    ddragonIds: new Map(Object.values(chEn.data).map((c) => [Number(c.key), c.id])),
  };
}

export interface AggregateReport {
  patch: string;
  files: number;
  largestBytes: number;
  oversized: string[];
  totals: Record<string, number>;
}

/** Aggregates the stored games of the patch and writes `{outputDir}/{patch}/{filter}[/{platform}]/…`. */
export async function aggregateAndWrite(config: Config, store: StateStore, ddragon = new DataDragon()): Promise<AggregateReport> {
  const versions = await ddragon.versions();
  const metas = (await store.list('')).filter((k) => /^\d+\.\d+\/meta\.json$/.test(k));
  const patchMetas = (await Promise.all(metas.map((k) => getJson<PatchMeta>(store, k)))).filter((m): m is PatchMeta => !!m);
  const meta = patchMetas.sort((a, b) => b.firstSeenAt - a.firstSeenAt)[0];
  if (!meta) throw new Error('No crawled patch in the state: run `crawl` first');

  const playerTier = new Map<string, SampledTier>();
  for (const platform of config.platforms) {
    for (const p of (await getJson<PlayerList>(store, `players/${platform}.json`))?.players ?? []) playerTier.set(p.puuid, p.tier);
  }
  const previous = new Map<string, IndexJson>();
  const prevPatch = previousPatch(versions, meta.patch);
  if (prevPatch) {
    for (const filter of TIER_FILTERS) {
      const file = join(config.outputDir, prevPatch, filter, 'index.json');
      if (existsSync(file)) previous.set(`${filter}|all`, JSON.parse(readFileSync(file, 'utf8')));
    }
  }

  const names = await namesFor(ddragon, meta.version);
  const out: AggregateOutput = await aggregate({
    patch: meta.patch,
    platforms: config.platforms,
    games: () => storedGames(store, meta.patch),
    playerTier,
    previous,
    names,
    config,
  });

  // Replace this patch's files.
  rmSync(join(config.outputDir, meta.patch), { recursive: true, force: true });
  let largest = 0;
  const oversized: string[] = [];
  for (const file of out.files) {
    const parsed = championBuildSchema.parse(file);
    const id = names.ddragonIds.get(file.champion) ?? String(file.champion);
    const dir = file.region === 'all' ? join(config.outputDir, file.patch, file.filter) : join(config.outputDir, file.patch, file.filter, file.region);
    const path = join(dir, `${id}_${file.role}.json`);
    const bytes = writeJson(path, parsed);
    largest = Math.max(largest, bytes);
    if (bytes > MAX_FILE_BYTES) oversized.push(`${file.filter}/${id}_${file.role} (${Math.round(bytes / 1024)} kB)`);
  }
  for (const index of out.indexes) {
    const dir = index.region === 'all' ? join(config.outputDir, index.patch, index.filter) : join(config.outputDir, index.patch, index.filter, index.region);
    writeJson(join(dir, 'index.json'), indexSchema.parse(index));
  }
  return { patch: meta.patch, files: out.files.length, largestBytes: largest, oversized, totals: Object.fromEntries(out.totals) };
}

// ---------- Static data for the page (localised names, descriptions, icons) ----------

const stripHtml = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** Writes `{staticDir}/{version}/{lang}/core.json` and `…/champions/{Id}.json` (only what the page shows). */
export async function writeStatic(staticDir: string, version: string, ddragon = new DataDragon()): Promise<void> {
  const perks = await ddragon.perks();
  const shardIcon = new Map(perks.map((p) => [p.id, p.iconPath.replace('/lol-game-data/assets/', '').toLowerCase()]));
  for (const lang of ['fr_FR', 'en_US'] as Lang[]) {
    const [items, runes, summoners, champions, full] = await Promise.all([
      ddragon.items(version, lang),
      ddragon.runes(version, lang),
      ddragon.summoners(version, lang),
      ddragon.champions(version, lang),
      ddragon.championsFull(version, lang),
    ]);
    const core = {
      version,
      items: Object.fromEntries(
        Object.entries(items.data)
          .filter(([, i]) => i.maps?.['11'])
          .map(([id, i]) => [id, { name: i.name, cost: i.gold.total, desc: stripHtml(i.description) }])
      ),
      runeTrees: runes.map((t) => ({
        id: t.id,
        name: t.name,
        icon: t.icon,
        slots: t.slots.map((s) => s.runes.map((r) => ({ id: r.id, name: r.name, icon: r.icon, desc: stripHtml(r.shortDesc) }))),
      })),
      /** Stat shards: names from CommunityDragon (English only), icons under raw.communitydragon.org. */
      shards: Object.fromEntries(
        perks.filter((p) => p.id >= 5000 && p.id < 5100).map((p) => [p.id, { name: p.name, icon: shardIcon.get(p.id) ?? '' }])
      ),
      summoners: Object.fromEntries(
        Object.values(summoners.data)
          .filter((s) => s.modes.includes('CLASSIC'))
          .map((s) => [s.key, { name: s.name, icon: s.image.full, desc: stripHtml(s.description) }])
      ),
      champions: Object.fromEntries(Object.values(champions.data).map((c) => [c.key, { id: c.id, name: c.name }])),
    };
    writeJson(join(staticDir, version, lang, 'core.json'), core);
    for (const c of Object.values(full.data)) {
      writeJson(join(staticDir, version, lang, 'champions', `${c.id}.json`), {
        id: c.id,
        name: c.name,
        passive: { name: c.passive.name, icon: c.passive.image.full, desc: stripHtml(c.passive.description) },
        spells: c.spells.map((s) => ({ name: s.name, icon: s.image.full, desc: stripHtml(s.description) })),
      });
    }
  }
}

/** meta.json + keeps only the current and previous patches (data and static files). */
export async function writeMeta(config: Config, store: StateStore, report: AggregateReport, ddragon = new DataDragon()): Promise<MetaJson> {
  const versions = await ddragon.versions();
  const meta = (await getJson<PatchMeta>(store, patchMetaKey(report.patch)))!;
  const prev = previousPatch(versions, report.patch);
  const metaFile = join(config.outputDir, 'meta.json');
  const old: MetaJson | null = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : null;
  const patches = [
    { patch: report.patch, ddragonVersion: meta.version, games: report.totals, updatedAt: new Date().toISOString() },
    ...(old?.patches ?? []).filter((p) => p.patch === prev),
  ];
  const keep = new Set(patches.map((p) => p.patch));
  for (const dir of existsSync(config.outputDir) ? readdirSync(config.outputDir) : []) {
    if (/^\d+\.\d+$/.test(dir) && !keep.has(dir)) rmSync(join(config.outputDir, dir), { recursive: true, force: true });
  }
  const staticDir = join(config.outputDir, '..', 'static');
  const keepVersions = new Set(patches.map((p) => p.ddragonVersion));
  for (const dir of existsSync(staticDir) ? readdirSync(staticDir) : []) {
    if (!keepVersions.has(dir)) rmSync(join(staticDir, dir), { recursive: true, force: true });
  }
  if (!existsSync(join(staticDir, meta.version))) await writeStatic(staticDir, meta.version, ddragon);

  const json: MetaJson = metaSchema.parse({
    current: report.patch,
    latest: report.patch,
    patches,
    filters: [...TIER_FILTERS],
    regions: config.platforms.length > 1 ? ['all', ...config.platforms] : ['all'],
    minGamesForNewPatch: config.minGamesForNewPatch,
  });
  writeJson(metaFile, json);
  return json;
}

export { COMMUNITY_DRAGON_PERKS };
