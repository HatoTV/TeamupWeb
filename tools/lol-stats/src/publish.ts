import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { aggregate } from './aggregate/aggregate.ts';
import { TierListCounter } from './aggregate/tierlist.ts';
import type { Names } from './aggregate/summary.ts';
import { TIER_FILTERS, type Config } from './config.ts';
import { gamesPrefix, resolvePatches, type PatchMeta } from './crawl.ts';
import { COMMUNITY_DRAGON_PERKS, DataDragon, type Lang } from './ddragon.ts';
import type { GameRecord } from './extract/game.ts';
import { exclusiveGroups } from './extract/items.ts';
import { championBuildSchema, indexSchema, metaSchema, tierListSchema, type IndexJson, type MetaJson, type TierListJson } from './schema.ts';
import { decodeJsonl, getJson, putJson, type StateStore } from './state/store.ts';

const MAX_FILE_BYTES = 30 * 1024;
/** Files kept in Git (prerendered pages): the default filter, all regions. The rest is served from R2. */
const GIT_FILTER = 'emerald_plus';
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900, s-maxage=3600' };

function writeJson(file: string, value: unknown): number {
  mkdirSync(dirname(file), { recursive: true });
  const body = JSON.stringify(value);
  writeFileSync(file, body);
  return Buffer.byteLength(body);
}

async function* storedGames(store: StateStore, keys: readonly string[]): AsyncGenerator<GameRecord> {
  // Downloads one part ahead while the previous one is parsed.
  let next = keys.length ? store.get(keys[0]!) : null;
  for (let i = 0; i < keys.length; i++) {
    const body = await next;
    next = i + 1 < keys.length ? store.get(keys[i + 1]!) : null;
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
  /** False when the patch had no new games since the last publication (files kept as they are). */
  aggregated: boolean;
}

/** Version of the published JSON format: a new version re-aggregates every patch, even without new games. */
const FORMAT = 4;

/** Last publication of a patch (state store): parts aggregated, games per scope, JSON format. */
interface Published {
  parts: number;
  totals: Record<string, number>;
  files: number;
  format?: number;
}
const publishedKey = (patch: string) => `published/${patch}.json`;
const manifestKey = (patch: string) => `published/${patch}.manifest.json`;

const scopeDir = (outputDir: string, patch: string, filter: string, region: string) =>
  region === 'all' ? join(outputDir, patch, filter) : join(outputDir, patch, filter, region);

/** Index of a scope: local file, else the public bucket. */
async function readIndex(config: Config, publicStore: StateStore | null, patch: string, filter: string, region: string): Promise<IndexJson | null> {
  const file = join(scopeDir(config.outputDir, patch, filter, region), 'index.json');
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const key = `builds/${patch}/${filter}/${region === 'all' ? '' : `${region}/`}index.json`;
  const body = await publicStore?.get(key);
  return body ? JSON.parse(body.toString('utf8')) : null;
}

/**
 * Aggregates the stored games of one patch and writes `{outputDir}/{patch}/{filter}[/{platform}]/…`.
 * A patch without new games since its last publication in the same format is skipped (`force` to aggregate anyway).
 */
export async function aggregatePatch(
  config: Config,
  store: StateStore,
  publicStore: StateStore | null,
  meta: PatchMeta,
  previousPatch: string | null,
  ddragon = new DataDragon(),
  force = false
): Promise<AggregateReport> {
  const keys = await store.list(gamesPrefix(meta.patch));
  const last = await getJson<Published>(store, publishedKey(meta.patch));
  const hasOutput = existsSync(join(config.outputDir, meta.patch)) && existsSync(join(config.tierListDir, meta.patch));
  if (!force && last && last.format === FORMAT && last.parts === keys.length && hasOutput) {
    return { patch: meta.patch, files: last.files, largestBytes: 0, oversized: [], totals: last.totals, aggregated: false };
  }

  const regions = config.platforms.length > 1 ? ['all', ...config.platforms] : ['all'];
  const previous = new Map<string, IndexJson>();
  if (previousPatch) {
    for (const filter of TIER_FILTERS) {
      for (const region of regions) {
        const index = await readIndex(config, publicStore, previousPatch, filter, region);
        if (index) previous.set(`${filter}|${region}`, index);
      }
    }
  }

  const names = await namesFor(ddragon, meta.version);
  const tierList = new TierListCounter();
  const out = await aggregate({
    patch: meta.patch,
    platforms: config.platforms,
    games: () => storedGames(store, keys),
    onGame: (game) => tierList.add(game),
    previous,
    names,
    exclusive: exclusiveGroups((await ddragon.items(meta.version, 'en_US')).data),
    config,
  });

  // Replace this patch's files.
  rmSync(join(config.outputDir, meta.patch), { recursive: true, force: true });
  let largest = 0;
  const oversized: string[] = [];
  for (const file of out.files) {
    const parsed = championBuildSchema.parse(file);
    const id = names.ddragonIds.get(file.champion) ?? String(file.champion);
    const bytes = writeJson(join(scopeDir(config.outputDir, file.patch, file.filter, file.region), `${id}_${file.role}.json`), parsed);
    largest = Math.max(largest, bytes);
    if (bytes > MAX_FILE_BYTES) oversized.push(`${file.filter}/${file.region}/${id}_${file.role} (${Math.round(bytes / 1024)} kB)`);
  }
  for (const index of out.indexes) writeJson(join(scopeDir(config.outputDir, index.patch, index.filter, index.region), 'index.json'), indexSchema.parse(index));
  writeTierLists(config, meta.patch, tierList.files(meta.patch, config));

  const totals = Object.fromEntries(out.totals);
  await putJson(store, publishedKey(meta.patch), { parts: keys.length, totals, files: out.files.length, format: FORMAT } satisfies Published);
  return { patch: meta.patch, files: out.files.length, largestBytes: largest, oversized, totals, aggregated: true };
}

/** Writes `{tierListDir}/{patch}/{band}.json` (kept in Git: a few small files, prerendered page). */
export function writeTierLists(config: Config, patch: string, files: TierListJson[]): void {
  rmSync(join(config.tierListDir, patch), { recursive: true, force: true });
  for (const file of files) writeJson(join(config.tierListDir, patch, `${file.band}.json`), tierListSchema.parse(file));
}

/** Tier lists only (one pass over the stored games, the state is only read): `node src/cli.ts tierlist`. */
export async function publishTierLists(config: Config, store: StateStore, ddragon = new DataDragon()): Promise<Array<{ patch: string; totals: Record<string, number> }>> {
  const { current, previous } = await resolvePatches(store, ddragon);
  const reports = [];
  for (const meta of [current, previous].filter((m): m is PatchMeta => !!m)) {
    const counter = new TierListCounter();
    for await (const game of storedGames(store, await store.list(gamesPrefix(meta.patch)))) counter.add(game);
    const files = counter.files(meta.patch, config);
    writeTierLists(config, meta.patch, files);
    reports.push({ patch: meta.patch, totals: Object.fromEntries(files.map((f) => [f.band, f.totalGames])) });
  }
  return reports;
}

/** Uploads the changed files of a patch to the public bucket (content hashes in a manifest) and removes stale ones. */
async function uploadPatch(store: StateStore, publicStore: StateStore, outputDir: string, patch: string): Promise<{ uploaded: number; deleted: number }> {
  const root = join(outputDir, patch);
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.json')) files.push(path);
    }
  };
  if (existsSync(root)) walk(root);
  const manifest = (await getJson<Record<string, string>>(store, manifestKey(patch))) ?? {};
  const next: Record<string, string> = {};
  const changed: Array<{ key: string; body: Buffer }> = [];
  for (const file of files) {
    const key = `builds/${relative(outputDir, file).split(sep).join('/')}`;
    const body = readFileSync(file);
    const hash = createHash('sha1').update(body).digest('hex');
    next[key] = hash;
    if (manifest[key] !== hash) changed.push({ key, body });
  }
  let i = 0;
  await Promise.all(
    Array.from({ length: 32 }, async () => {
      while (i < changed.length) {
        const { key, body } = changed[i++]!;
        await publicStore.put(key, body, JSON_HEADERS);
      }
    })
  );
  const stale = Object.keys(manifest).filter((key) => !(key in next));
  for (const key of stale) await publicStore.delete(key);
  await putJson(store, manifestKey(patch), next);
  return { uploaded: changed.length, deleted: stale.length };
}

/** Git keeps `{patch}/emerald_plus/*.json` (all regions) for the prerendered pages; the public bucket serves the rest. */
function pruneForGit(outputDir: string, patch: string): void {
  for (const filter of existsSync(join(outputDir, patch)) ? readdirSync(join(outputDir, patch)) : []) {
    const dir = join(outputDir, patch, filter);
    if (filter !== GIT_FILTER) {
      rmSync(dir, { recursive: true, force: true });
      continue;
    }
    for (const name of readdirSync(dir)) if (statSync(join(dir, name)).isDirectory()) rmSync(join(dir, name), { recursive: true, force: true });
  }
}

export interface PublishReport {
  reports: AggregateReport[];
  meta: MetaJson;
  uploads: Record<string, { uploaded: number; deleted: number }>;
}

/**
 * Publishes the current and the previous patch: aggregation (skipped for a patch without new games), meta.json,
 * static Data Dragon data, older patches removed. With a public bucket, every file goes to R2 and Git keeps the
 * default filter only.
 */
export async function publish(config: Config, store: StateStore, publicStore: StateStore | null, ddragon = new DataDragon()): Promise<PublishReport> {
  const { current, previous } = await resolvePatches(store, ddragon);
  const metas = [previous, current].filter((m): m is PatchMeta => !!m);
  const reports: AggregateReport[] = [];
  // Previous patch first: the current one reads its indexes for the deltas.
  for (const meta of metas) {
    const prevOfThis = meta === current ? (previous?.patch ?? null) : null;
    const forceCurrent = meta === current && reports[0]?.aggregated === true;
    reports.push(await aggregatePatch(config, store, publicStore, meta, prevOfThis, ddragon, forceCurrent));
  }

  const keep = new Set(metas.map((m) => m.patch));
  for (const root of [config.outputDir, config.tierListDir]) {
    for (const dir of existsSync(root) ? readdirSync(root) : []) {
      if (/^\d+\.\d+$/.test(dir) && !keep.has(dir)) rmSync(join(root, dir), { recursive: true, force: true });
    }
  }
  const staticDir = join(config.outputDir, '..', 'static');
  const keepVersions = new Set(metas.map((m) => m.version));
  for (const dir of existsSync(staticDir) ? readdirSync(staticDir) : []) {
    if (!keepVersions.has(dir)) rmSync(join(staticDir, dir), { recursive: true, force: true });
  }
  for (const m of metas) if (!existsSync(join(staticDir, m.version))) await writeStatic(staticDir, m.version, ddragon);

  const now = new Date().toISOString();
  const metaFile = join(config.outputDir, 'meta.json');
  const old: MetaJson | null = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : null;
  const json: MetaJson = metaSchema.parse({
    current: current.patch,
    latest: current.patch,
    // Newest first; a patch without data yet is still listed so that the site can fall back to the previous one.
    patches: [current, ...(previous ? [previous] : [])].map((m) => {
      const report = reports.find((r) => r.patch === m.patch)!;
      const updatedAt = report.aggregated ? now : (old?.patches.find((p) => p.patch === m.patch)?.updatedAt ?? now);
      return { patch: m.patch, ddragonVersion: m.version, games: report.totals, updatedAt };
    }),
    filters: [...TIER_FILTERS],
    regions: config.platforms.length > 1 ? ['all', ...config.platforms] : ['all'],
    minGamesForNewPatch: config.minGamesForNewPatch,
    ...(config.sample ? { sample: true } : {}),
  });
  writeJson(metaFile, json);

  const uploads: PublishReport['uploads'] = {};
  if (publicStore) {
    for (const report of reports) if (report.aggregated) uploads[report.patch] = await uploadPatch(store, publicStore, config.outputDir, report.patch);
    await publicStore.put('builds/meta.json', readFileSync(metaFile), JSON_HEADERS);
    // Patches no longer published.
    for (const key of await publicStore.list('builds/')) {
      const patch = key.split('/')[1] ?? '';
      if (/^\d+\.\d+$/.test(patch) && !keep.has(patch)) await publicStore.delete(key);
    }
    for (const m of metas) pruneForGit(config.outputDir, m.patch);
  }
  return { reports, meta: json, uploads };
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

export { COMMUNITY_DRAGON_PERKS };
