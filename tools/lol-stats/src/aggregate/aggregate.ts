import { filtersForTier, type Config, type SampledTier, type TierFilter } from '../config.ts';
import type { GameRecord, ParticipantRecord, Role } from '../extract/game.ts';
import type { ExclusiveGroups } from '../extract/items.ts';
import { maxOrder } from '../extract/skills.ts';
import { siteRole, type BuildJson, type ChampionBuildJson, type IndexJson, type SiteRole } from '../schema.ts';
import { bootsSlot, buildKey, coreItems, nextSlots, selectBuilds, type BuildCandidate, type SelectedBuild } from './builds.ts';
import { splitCounters, type OpponentCount } from './counters.ts';
import { MainRoles } from './roles.ts';
import { Histogram, rate, round, tierRanks, tierScores, wilsonLower, type TierRank } from './stats.ts';
import { summaryTexts, type Names } from './summary.ts';

/** Duo partner role used for "best synergy". */
const SYNERGY_ROLE: Record<Role, Role> = { TOP: 'JUNGLE', MIDDLE: 'JUNGLE', JUNGLE: 'MIDDLE', BOTTOM: 'UTILITY', UTILITY: 'BOTTOM' };

interface WinCount {
  games: number;
  wins: number;
}

interface ChampionRoleCounters extends WinCount {
  champion: number;
  role: Role;
  keys: Map<string, BuildCandidate>;
  opponents: Map<number, OpponentCount>;
  mates: Map<number, WinCount>;
}

interface BuildDetails {
  runes: Map<string, WinCount>;
  spells: Map<string, WinCount>;
  start: Map<string, number>;
  firstBuy: Map<string, number>;
  firstBuyT: Histogram;
  /** Purchase time of each core item (for the core timings). */
  itemT: Map<number, Histogram>;
  /** Completed major items bought 3rd to 6th (boots excluded). */
  slots: Array<Map<number, WinCount>>;
  /** Tier-2 boots, shown apart from the other items with their alternatives. */
  boots: Map<number, WinCount>;
  skills: Map<string, WinCount>;
}

export interface Scope {
  filter: TierFilter;
  region: string;
}

const scopeKey = (s: Scope) => `${s.filter}|${s.region}`;
const crKey = (scope: string, champion: number, role: Role) => `${scope}|${champion}|${role}`;

function bump<K>(map: Map<K, WinCount>, key: K, win: boolean): void {
  const c = map.get(key) ?? { games: 0, wins: 0 };
  c.games++;
  if (win) c.wins++;
  map.set(key, c);
}

function count<K>(map: Map<K, number>, key: K): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function top<K>(map: Map<K, number>): [K, number] | null {
  let best: [K, number] | null = null;
  for (const entry of map) if (!best || entry[1] > best[1]) best = entry;
  return best;
}

function topWin<K>(map: Map<K, WinCount>): [K, WinCount] | null {
  let best: [K, WinCount] | null = null;
  for (const entry of map) if (!best || entry[1].games > best[1].games) best = entry;
  return best;
}

export interface AggregateInput {
  patch: string;
  /** Platforms present in the data; per-platform files are only produced when there are several. */
  platforms: string[];
  /** Iterates every stored game of the patch (called twice). */
  games: () => AsyncIterable<GameRecord> | Iterable<GameRecord>;
  /** Called once per game during the first pass (e.g. tier list counts), so that the games are read only twice. */
  onGame?: (game: GameRecord) => void;
  /** Previous patch index per scope key, for deltas. */
  previous: Map<string, IndexJson>;
  names: Names;
  /** Exclusive item groups (Data Dragon): two items of a group are never shown in the same build. */
  exclusive: ExclusiveGroups;
  config: Pick<
    Config,
    'minBuildGames' | 'minBuildShare' | 'offMetaMinShare' | 'offMetaMaxShare' | 'offMetaMinGames' | 'altMinShare' | 'altMinGames' | 'lateShare' | 'minMatchupGames' | 'lowSampleGames'
  > &
    Partial<Pick<Config, 'mainRoleShare' | 'minCounterGames'>>;
}

export interface AggregateOutput {
  files: ChampionBuildJson[];
  indexes: IndexJson[];
  /** Games per scope key. */
  totals: Map<string, number>;
}

export async function aggregate(input: AggregateInput): Promise<AggregateOutput> {
  const { config } = input;
  const regions = input.platforms.length > 1 ? ['all', ...input.platforms] : ['all'];
  const scopeCache = new Map<string, string[]>();
  /** Scopes of a player of `tier` on `platform`: the filters of his tier, all regions and his own. */
  const scopesOf = (tier: SampledTier, platform: string): string[] => {
    const cacheKey = `${tier}|${platform}`;
    let scopes = scopeCache.get(cacheKey);
    if (!scopes) {
      scopes = filtersForTier(tier).flatMap((filter) => regions.filter((r) => r === 'all' || r === platform).map((region) => scopeKey({ filter, region })));
      scopeCache.set(cacheKey, scopes);
    }
    return scopes;
  };
  /**
   * Tier of a participant: his own when he is in the collected player list (games count in the filters of each
   * player's tier); records collected before 2026-11-15 only have the game tier.
   */
  const tierOfParticipant = (game: GameRecord, legacy: boolean, p: ParticipantRecord): SampledTier | undefined => p.tier ?? (legacy ? game.tier : undefined);
  const isLegacy = (game: GameRecord) => !game.participants.some((p) => p.tier);

  // ---------- Pass 1: totals, bans, build candidates, opponents, duos ----------
  /** Games per scope, weighted: each player of the scope counts for 1/10 of the game. */
  const totals = new Map<string, number>();
  const bans = new Map<string, Map<number, number>>();
  const counters = new Map<string, ChampionRoleCounters>();
  /** Players of the scope in each role (`scope|ROLE`): the pick rate is a share of the role, two players per game. */
  const roleTotals = new Map<string, number>();
  /** Main roles of each champion, over every participant of the patch (all ranks, even outside the build filters). */
  const mainRoles = new MainRoles();

  for await (const game of input.games()) {
    input.onGame?.(game);
    mainRoles.add(game);
    const legacy = isLegacy(game);
    const inScope = new Map<string, number>();
    for (const p of game.participants) {
      const tier = tierOfParticipant(game, legacy, p);
      if (!tier) continue;
      for (const scope of scopesOf(tier, game.platform)) {
        inScope.set(scope, (inScope.get(scope) ?? 0) + 1);
        roleTotals.set(`${scope}|${p.role}`, (roleTotals.get(`${scope}|${p.role}`) ?? 0) + 1);
        const key = crKey(scope, p.champion, p.role);
        let cr = counters.get(key);
        if (!cr) {
          cr = { champion: p.champion, role: p.role, games: 0, wins: 0, keys: new Map(), opponents: new Map(), mates: new Map() };
          counters.set(key, cr);
        }
        cr.games++;
        if (p.win) cr.wins++;

        // Games under two completed major items have no build key: they only count in the general statistics.
        const bk = buildKey(p);
        if (bk) {
          const candidate = cr.keys.get(bk) ?? { key: bk, games: 0, wins: 0, orders: new Map() };
          candidate.games++;
          if (p.win) candidate.wins++;
          count(candidate.orders, coreItems(p).join('-'));
          cr.keys.set(bk, candidate);
        }
        if (p.opponent) {
          const o = cr.opponents.get(p.opponent) ?? { games: 0, wins: 0, goldSum: 0, goldGames: 0 };
          o.games++;
          if (p.win) o.wins++;
          if (p.goldDiff15 !== undefined) {
            o.goldSum += p.goldDiff15;
            o.goldGames++;
          }
          cr.opponents.set(p.opponent, o);
        }
        const mate = p.mates[SYNERGY_ROLE[p.role]];
        if (mate) bump(cr.mates, mate, p.win);
      }
    }
    for (const [scope, n] of inScope) {
      const weight = n / 10;
      totals.set(scope, (totals.get(scope) ?? 0) + weight);
      const banMap = bans.get(scope) ?? new Map<number, number>();
      for (const champion of game.bans) banMap.set(champion, (banMap.get(champion) ?? 0) + weight);
      bans.set(scope, banMap);
    }
  }

  // Off-role picks (champion / role outside his main roles) are dropped: no file, no index entry, no tier, and they
  // are never shown as an opponent or a duo partner.
  const isMain = (champion: number, role: Role) => mainRoles.isMain(champion, role, config.mainRoleShare);
  for (const [key, cr] of counters) if (!isMain(cr.champion, cr.role)) counters.delete(key);

  // ---------- Build selection ----------
  const selected = new Map<string, SelectedBuild[]>();
  for (const [key, cr] of counters) selected.set(key, selectBuilds([...cr.keys.values()], cr, config));

  // ---------- Pass 2: details of the selected builds ----------
  const details = new Map<string, Map<string, BuildDetails>>();
  const newDetails = (): BuildDetails => ({
    runes: new Map(),
    spells: new Map(),
    start: new Map(),
    firstBuy: new Map(),
    firstBuyT: new Histogram(10_000),
    itemT: new Map(),
    slots: [new Map(), new Map(), new Map(), new Map()],
    boots: new Map(),
    skills: new Map(),
  });

  for await (const game of input.games()) {
    const legacy = isLegacy(game);
    for (const p of game.participants) {
      const tier = tierOfParticipant(game, legacy, p);
      if (!tier) continue;
      for (const scope of scopesOf(tier, game.platform)) {
        const key = crKey(scope, p.champion, p.role);
        const builds = selected.get(key);
        const bk = buildKey(p);
        if (!builds?.length || !bk || !builds.some((b) => b.key === bk)) continue;
        const perKey = details.get(key) ?? new Map<string, BuildDetails>();
        details.set(key, perKey);
        const d = perKey.get(bk) ?? newDetails();
        perKey.set(bk, d);
        collectDetails(d, p);
      }
    }
  }

  // ---------- Per scope: rates, tiers, files ----------
  const files: ChampionBuildJson[] = [];
  const indexes: IndexJson[] = [];
  for (const [scope, total] of totals) {
    const [filter, region] = scope.split('|') as [TierFilter, string];
    const banMap = bans.get(scope)!;
    const pickOf = (cr: ChampionRoleCounters) => Math.min(1, (2 * cr.games) / Math.max(1, roleTotals.get(`${scope}|${cr.role}`) ?? 0));
    const entries = [...counters.entries()].filter(([key]) => key.startsWith(`${scope}|`)).map(([key, cr]) => ({ key, cr }));

    // Tier per role, among champions with a meaningful sample in the role.
    const tierOf = new Map<string, TierRank>();
    for (const role of ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const) {
      const pool = entries.filter((e) => e.cr.role === role && e.cr.games >= config.minMatchupGames);
      const scores = tierScores(pool.map((e) => ({ wins: e.cr.wins, games: e.cr.games, pickRate: pickOf(e.cr), banRate: rate(banMap.get(e.cr.champion) ?? 0, total) })));
      tierRanks(scores).forEach((rank, i) => tierOf.set(pool[i]!.key, rank));
    }

    const previous = input.previous.get(scope);
    const index: IndexJson = { patch: input.patch, filter, region, totalGames: Math.round(total), champions: [] };
    const byChampion = new Map<number, IndexJson['champions'][number]>();

    for (const { key, cr } of entries) {
      const role = siteRole(cr.role);
      const winRate = rate(cr.wins, cr.games);
      const pickRate = pickOf(cr);
      const banRate = rate(banMap.get(cr.champion) ?? 0, total);
      const tier = tierOf.get(key) ?? null;
      const lowSample = cr.games < config.lowSampleGames;
      const prev = previous?.champions.find((c) => c.champion === cr.champion)?.roles.find((r) => r.role === role);

      const entry = byChampion.get(cr.champion) ?? { champion: cr.champion, roles: [] };
      entry.roles.push({ role, games: cr.games, winRate: round(winRate), pickRate: round(pickRate), banRate: round(banRate), tier, lowSample });
      byChampion.set(cr.champion, entry);

      const builds = (selected.get(key) ?? []).map((b) => buildJson(b, cr, details.get(key)?.get(b.key), input.exclusive, config));
      const opponents = [...cr.opponents.entries()].filter(([champion, o]) => o.games >= config.minMatchupGames && isMain(champion, cr.role));
      const byWin = [...opponents].sort((a, b) => rate(a[1].wins, a[1].games) - rate(b[1].wins, b[1].games));
      const weakAgainst = byWin.slice(0, 6).map(([champion, o]) => ({ champion, games: o.games, winRate: round(rate(o.wins, o.games)) }));
      const strongAgainst = byWin
        .slice(-6)
        .reverse()
        .filter(([champion]) => !weakAgainst.some((w) => w.champion === champion))
        .map(([champion, o]) => ({ champion, games: o.games, winRate: round(rate(o.wins, o.games)) }));
      // Counters tab: every main-role lane opponent above the threshold.
      const counters = splitCounters(
        [...cr.opponents.entries()].filter(([champion]) => isMain(champion, cr.role)),
        config.minCounterGames ?? 200
      );
      const synergyRole = siteRole(SYNERGY_ROLE[cr.role]);
      const synergy = [...cr.mates.entries()]
        .filter(([champion, m]) => m.games >= config.minMatchupGames && isMain(champion, SYNERGY_ROLE[cr.role]))
        .sort((a, b) => wilsonLower(b[1].wins, b[1].games) - wilsonLower(a[1].wins, a[1].games))
        .slice(0, 6)
        .map(([champion, m]) => ({ champion, role: synergyRole, games: m.games, winRate: round(rate(m.wins, m.games)) }));

      const file: ChampionBuildJson = {
        patch: input.patch,
        filter,
        region,
        champion: cr.champion,
        role,
        games: cr.games,
        wins: cr.wins,
        winRate: round(winRate),
        pickRate: round(pickRate),
        banRate: round(banRate),
        tier,
        delta: prev ? { winRate: round(winRate - prev.winRate), pickRate: round(pickRate - prev.pickRate), banRate: round(banRate - prev.banRate) } : null,
        lowSample,
        builds,
        weakAgainst,
        strongAgainst,
        counters,
        synergy,
        summary: { fr: '', en: '' },
      };
      file.summary = summaryTexts(file, input.names);
      files.push(file);
    }
    index.champions = [...byChampion.values()].sort((a, b) => a.champion - b.champion);
    indexes.push(index);
  }
  return { files, indexes, totals: new Map([...totals].map(([scope, n]) => [scope, Math.round(n)])) };
}

function collectDetails(d: BuildDetails, p: ParticipantRecord): void {
  bump(d.runes, p.runes.join(','), p.win);
  bump(d.spells, p.spells.join(','), p.win);
  if (p.start.length) count(d.start, [...p.start].sort((a, b) => a - b).join(','));
  if (p.firstBuy.length) count(d.firstBuy, [...p.firstBuy].sort((a, b) => a - b).join(','));
  if (p.firstBuyT !== null) d.firstBuyT.add(p.firstBuyT);
  for (const [id, t] of p.majors.slice(0, 2)) {
    let h = d.itemT.get(id);
    if (!h) d.itemT.set(id, (h = new Histogram(10_000)));
    h.add(t);
  }
  // Items 3 to 6 without boots: the boots have their own slot.
  p.majors.slice(2, 6).forEach(([item], i) => bump(d.slots[i]!, item, p.win));
  if (p.boots) bump(d.boots, p.boots[0], p.win);
  if (p.skills.length >= 15) bump(d.skills, p.skills, p.win);
}

function buildJson(build: SelectedBuild, cr: ChampionRoleCounters, d: BuildDetails | undefined, exclusive: ExclusiveGroups, config: AggregateInput['config']): BuildJson {
  const runes = d && topWin(d.runes);
  const spells = d && topWin(d.spells);
  const start = d && top(d.start);
  const firstBuy = d && top(d.firstBuy);
  const skills = d && topWin(d.skills);
  const boots = d ? bootsSlot(d.boots, build.games, config) : null;
  // Five items and the boots; six items for an ADC (the role quest frees a slot for the boots) or without boots.
  const slotCount = cr.role === 'BOTTOM' || !boots ? 4 : 3;

  return {
    label: build.label,
    core: build.core,
    keystone: build.keystone,
    subStyle: build.subStyle,
    games: build.games,
    wins: build.wins,
    winRate: round(rate(build.wins, build.games)),
    share: round(rate(build.games, cr.games)),
    runes: runes ? { page: runes[0].split(',').map(Number), games: runes[1].games, wins: runes[1].wins, winRate: round(rate(runes[1].wins, runes[1].games)) } : null,
    spells: spells
      ? { ids: spells[0].split(',').map(Number) as [number, number], games: spells[1].games, wins: spells[1].wins, winRate: round(rate(spells[1].wins, spells[1].games)) }
      : null,
    start: start ? { items: start[0].split(',').map(Number), games: start[1] } : null,
    firstBuy: firstBuy ? { items: firstBuy[0].split(',').map(Number), games: firstBuy[1], medianMs: d!.firstBuyT.median() } : null,
    coreTimes: build.core.map((id) => d?.itemT.get(id)?.median() ?? null),
    next: d ? nextSlots(build.core, d.slots, build.games, exclusive, config, slotCount) : [],
    boots,
    skills: skills ? { order: skills[0].slice(0, 18), max: maxOrder(skills[0]), games: skills[1].games, wins: skills[1].wins, winRate: round(rate(skills[1].wins, skills[1].games)) } : null,
  };
}

export type { SiteRole };
