import { z } from 'zod';
import { TIER_FILTERS } from './config.ts';
import type { Role } from './extract/game.ts';
import { TIERS } from './aggregate/stats.ts';
import { BUILD_LABELS } from './aggregate/builds.ts';

/** Site roles (URLs, files) ↔ Riot `teamPosition`. */
export const SITE_ROLES = { TOP: 'top', JUNGLE: 'jungle', MIDDLE: 'mid', BOTTOM: 'adc', UTILITY: 'support' } as const satisfies Record<Role, string>;
export type SiteRole = (typeof SITE_ROLES)[Role];
export const siteRole = (role: Role): SiteRole => SITE_ROLES[role];

const id = z.number().int().nonnegative();
const rate = z.number().min(0).max(1);
const games = z.number().int().nonnegative();
const ms = z.number().int().nonnegative().nullable();
const siteRoleSchema = z.enum(['top', 'jungle', 'mid', 'adc', 'support']);

const statLine = z.object({ games, wins: games, winRate: rate });

const slotItem = z.object({ item: id, games, wins: games, winRate: rate, share: rate });

export const buildSchema = z.object({
  label: z.enum(BUILD_LABELS),
  /** First three main items (boots included) in their most frequent purchase order. */
  core: z.array(id).length(3),
  /** Keystone and secondary tree: part of the build key. */
  keystone: id,
  subStyle: id,
  games,
  wins: games,
  winRate: rate,
  /** Share of the champion's games in the role that used this build. */
  share: rate,
  /** [primaryStyle, keystone, p1, p2, p3, subStyle, s1, s2, offense, flex, defense] */
  runes: statLine.extend({ page: z.array(id).length(11) }).nullable(),
  spells: statLine.extend({ ids: z.tuple([id, id]) }).nullable(),
  /** Multisets (quantities = repeated ids). */
  start: z.object({ items: z.array(id), games }).nullable(),
  firstBuy: z.object({ items: z.array(id), games, medianMs: ms }).nullable(),
  /** Median purchase time of each core item, same order as `core`. */
  coreTimes: z.array(ms).length(3),
  /** Items 4, 5 and 6 (no duplicate with the core or between them), each with at most two alternatives. */
  next: z.array(slotItem.extend({ slot: z.union([z.literal(4), z.literal(5), z.literal(6)]), alternatives: z.array(slotItem).max(2) })).max(3),
  skills: z.object({ order: z.string().regex(/^[1-4]{1,18}$/), max: z.string().regex(/^[1-3]{3}$/), games, wins: games, winRate: rate }).nullable(),
});
export type BuildJson = z.infer<typeof buildSchema>;

/**
 * Items repeated where they must not be: in the main line (core, then items 4-6) or within one slot
 * (core, slot item and its alternatives). An alternative may repeat an item of another slot.
 */
export function repeatedItems(build: BuildJson): number[] {
  const lists = [[...build.core, ...build.next.map((s) => s.item)], ...build.next.map((s) => [...build.core, s.item, ...s.alternatives.map((a) => a.item)])];
  return [...new Set(lists.flatMap((l) => l.filter((x, i) => l.indexOf(x) !== i)))];
}

const opponent = z.object({ champion: id, games, winRate: rate });

export const championBuildSchema = z.object({
  patch: z.string(),
  filter: z.enum(TIER_FILTERS),
  region: z.string(),
  champion: id,
  role: siteRoleSchema,
  games,
  wins: games,
  winRate: rate,
  pickRate: rate,
  banRate: rate,
  tier: z.enum(TIERS).nullable(),
  /** Change since the previous patch (same filter and region), in rate points. */
  delta: z.object({ winRate: z.number(), pickRate: z.number(), banRate: z.number() }).nullable(),
  /** Few games for this filter: the page shows a warning. */
  lowSample: z.boolean(),
  builds: z.array(buildSchema).max(4),
  weakAgainst: z.array(opponent).max(6),
  strongAgainst: z.array(opponent).max(6),
  synergy: z.array(opponent.extend({ role: siteRoleSchema })).max(6),
  summary: z.object({ fr: z.string(), en: z.string() }),
});
export type ChampionBuildJson = z.infer<typeof championBuildSchema>;

export const indexSchema = z.object({
  patch: z.string(),
  filter: z.enum(TIER_FILTERS),
  region: z.string(),
  totalGames: games,
  champions: z.array(
    z.object({
      champion: id,
      roles: z.array(z.object({ role: siteRoleSchema, games, winRate: rate, pickRate: rate, banRate: rate, tier: z.enum(TIERS).nullable(), lowSample: z.boolean() })),
    })
  ),
});
export type IndexJson = z.infer<typeof indexSchema>;

export const metaSchema = z.object({
  /** Patch shown by default (the previous one while the new patch lacks data). */
  current: z.string(),
  /** Newest patch being collected. */
  latest: z.string(),
  patches: z.array(z.object({ patch: z.string(), ddragonVersion: z.string(), games: z.record(z.string(), games), updatedAt: z.string() })),
  filters: z.array(z.enum(TIER_FILTERS)),
  regions: z.array(z.string()),
  minGamesForNewPatch: games,
  /** Sample data collected with a development key. */
  sample: z.boolean().optional(),
});
export type MetaJson = z.infer<typeof metaSchema>;
