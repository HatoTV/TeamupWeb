import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DataDragon } from '../../lol-stats/src/ddragon.ts';
import { currentPatch, previousPatch } from '../../lol-stats/src/patch.ts';
import { decodeJsonl, getJson, putJson, type StateStore } from '../../lol-stats/src/state/store.ts';
import type { TftStatsFile, TftStatsMeta } from '../../../src/app/tft/logic/tft-types.ts';
import { aggregateQueue } from './aggregate/aggregate.ts';
import { RANK_FILTERS, REPO_DIR, type Config } from './config.ts';
import { PATCHES_KEY, gamesPrefix, type PatchState } from './crawl.ts';
import type { BoardRecord } from './extract.ts';
import { metaSchema, statsFileSchema } from './schema.ts';
import type { SetData } from './static.ts';

export const STATS_DIR = join(REPO_DIR, 'public/data/tft/stats');
/** Files kept in Git (prerendering of the default view); the others are served from the public R2 bucket. */
export const GIT_FILTER = 'platinum_plus';

/** Current patch (Data Dragon, same numbering as TFT) and the previous one; a new patch is recorded when first seen. */
export async function resolvePatches(store: StateStore, now = Date.now(), ddragon = new DataDragon()): Promise<PatchState> {
  const versions = await ddragon.versions();
  const { patch } = currentPatch(versions);
  const state = (await getJson<PatchState>(store, PATCHES_KEY)) ?? { current: patch, previous: null, firstSeen: {} };
  if (state.current !== patch) {
    state.previous = state.current;
    state.current = patch;
  }
  state.previous ??= previousPatch(versions, patch);
  state.firstSeen[patch] ??= now;
  if (state.previous) state.firstSeen[state.previous] ??= now - 14 * 86_400_000;
  await putJson(store, PATCHES_KEY, state);
  return state;
}

export async function* storedRecords(store: StateStore, patch: string): AsyncGenerator<BoardRecord> {
  for (const key of await store.list(gamesPrefix(patch))) {
    const body = await store.get(key);
    if (body) yield* decodeJsonl<BoardRecord>(body);
  }
}

export interface PublishTarget {
  /** Public bucket (all files) when configured. */
  publicStore: StateStore | null;
  /** Write every filter locally (development) instead of the Git subset only. */
  writeAllLocally: boolean;
}

const fileKey = (f: Pick<TftStatsFile, 'patch' | 'queue' | 'filter'>) => `${f.patch}/${f.queue}/${f.filter}.json`;

/** Aggregates each patch and queue, validates and writes the files and `meta.json`. */
export async function publish(
  patches: Array<{ patch: string; releasedAt?: number; records: () => AsyncIterable<BoardRecord> | Iterable<BoardRecord> }>,
  data: SetData,
  config: Config,
  target: PublishTarget,
  options: { sample?: boolean; now?: Date } = {}
): Promise<TftStatsMeta> {
  const generatedAt = (options.now ?? new Date()).toISOString();
  const meta: TftStatsMeta = { set: data.set, latest: patches[0]!.patch, patches: [], queues: config.queues, filters: [...RANK_FILTERS], ...(options.sample ? { sample: true } : {}) };
  for (const { patch, releasedAt, records } of patches) {
    const all: BoardRecord[] = [];
    for await (const r of records()) all.push(r);
    const matches: Record<string, number> = {};
    for (const queue of config.queues) {
      for (const file of aggregateQueue(all, patch, queue, data, config, generatedAt)) {
        if (options.sample) file.sample = true;
        const parsed = statsFileSchema.parse(file);
        matches[`${queue}|${file.filter}`] = file.matches;
        const body = JSON.stringify(parsed);
        if (target.publicStore) await target.publicStore.put(`tft/stats/${fileKey(file)}`, Buffer.from(body), { 'content-type': 'application/json', 'cache-control': 'public, max-age=600' });
        if (target.writeAllLocally || file.filter === GIT_FILTER) {
          const out = join(STATS_DIR, fileKey(file));
          mkdirSync(dirname(out), { recursive: true });
          writeFileSync(out, body);
        }
        console.log(`${patch} ${queue} ${file.filter}: ${file.matches} matches, ${file.comps.length} comps, ${file.champions.length} champions, ${file.items.length} items`);
      }
    }
    meta.patches.push({ patch, updatedAt: generatedAt, ...(releasedAt ? { releasedAt: new Date(releasedAt).toISOString() } : {}), matches });
  }
  const parsedMeta = metaSchema.parse(meta);
  mkdirSync(STATS_DIR, { recursive: true });
  writeFileSync(join(STATS_DIR, 'meta.json'), JSON.stringify(parsedMeta, null, 1) + '\n');
  if (target.publicStore) await target.publicStore.put('tft/stats/meta.json', Buffer.from(JSON.stringify(parsedMeta)), { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' });
  // Only the published patches stay on disk.
  const keep = new Set(patches.map((p) => p.patch));
  for (const dir of existsSync(STATS_DIR) ? readdirSync(STATS_DIR) : []) if (/^\d+\.\d+$/.test(dir) && !keep.has(dir)) rmSync(join(STATS_DIR, dir), { recursive: true, force: true });
  return parsedMeta;
}
