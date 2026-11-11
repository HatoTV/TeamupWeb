import { filtersForTier, type Config, type SampledTier, type TierFilter } from '../config.ts';
import type { GameRecord, ParticipantRecord, Role } from '../extract/game.ts';
import { buildKey } from '../extract/purchases.ts';
import { maxOrder } from '../extract/skills.ts';
import { siteRole, type BuildJson, type ChampionBuildJson, type IndexJson, type SiteRole } from '../schema.ts';
import { selectBuilds, type BuildCandidate } from './builds.ts';
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
  opponents: Map<number, WinCount & { keys: Map<string, number> }>;
  mates: Map<number, WinCount>;
  players: Map<string, WinCount & { riotId: string; platform: string; tier: SampledTier }>;
}

interface BuildDetails {
  runes: Map<string, WinCount>;
  spells: Map<string, WinCount>;
  start: Map<string, number>;
  firstBuy: Map<string, number>;
  firstBuyT: Histogram;
  coreT: Histogram;
  boots: Map<number, number>;
  slots: [Map<number, WinCount>, Map<number, WinCount>, Map<number, WinCount>];
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
  /** Sampled tier of known players (best players' rank). */
  playerTier: Map<string, SampledTier>;
  /** Previous patch index per scope key, for deltas. */
  previous: Map<string, IndexJson>;
  names: Names;
  config: Pick<Config, 'minBuildGames' | 'minBuildShare' | 'minMatchupGames' | 'minPlayerGames' | 'lowSampleGames'>;
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
  const scopesOf = (game: GameRecord): string[] =>
    filtersForTier(game.tier).flatMap((filter) =>
      regions.filter((r) => r === 'all' || r === game.platform).map((region) => scopeKey({ filter, region }))
    );

  // ---------- Pass 1: totals, bans, build candidates, opponents, duos, players ----------
  const totals = new Map<string, number>();
  const bans = new Map<string, Map<number, number>>();
  const counters = new Map<string, ChampionRoleCounters>();

  for await (const game of input.games()) {
    for (const scope of scopesOf(game)) {
      totals.set(scope, (totals.get(scope) ?? 0) + 1);
      const banMap = bans.get(scope) ?? new Map<number, number>();
      for (const champion of game.bans) count(banMap, champion);
      bans.set(scope, banMap);

      for (const p of game.participants) {
        const key = crKey(scope, p.champion, p.role);
        let cr = counters.get(key);
        if (!cr) {
          cr = { champion: p.champion, role: p.role, games: 0, wins: 0, keys: new Map(), opponents: new Map(), mates: new Map(), players: new Map() };
          counters.set(key, cr);
        }
        cr.games++;
        if (p.win) cr.wins++;

        const bk = buildKey(p.majors);
        if (bk) {
          const candidate = cr.keys.get(bk) ?? { key: bk, games: 0, wins: 0, orders: new Map() };
          candidate.games++;
          if (p.win) candidate.wins++;
          count(candidate.orders, p.majors.slice(0, 3).map(([id]) => id).join('-'));
          cr.keys.set(bk, candidate);
        }
        if (p.opponent) {
          const o = cr.opponents.get(p.opponent) ?? { games: 0, wins: 0, keys: new Map<string, number>() };
          o.games++;
          if (p.win) o.wins++;
          if (bk) count(o.keys, bk);
          cr.opponents.set(p.opponent, o);
        }
        const mate = p.mates[SYNERGY_ROLE[p.role]];
        if (mate) bump(cr.mates, mate, p.win);
        if (p.puuid) {
          const pl = cr.players.get(p.puuid) ?? { games: 0, wins: 0, riotId: p.riotId, platform: game.platform, tier: input.playerTier.get(p.puuid) ?? game.tier };
          pl.games++;
          if (p.win) pl.wins++;
          if (p.riotId) pl.riotId = p.riotId;
          cr.players.set(p.puuid, pl);
        }
      }
    }
  }

  // ---------- Build selection ----------
  const selected = new Map<string, ReturnType<typeof selectBuilds>>();
  for (const [key, cr] of counters) selected.set(key, selectBuilds([...cr.keys.values()], cr.games, config));

  // ---------- Pass 2: details of the selected builds ----------
  const details = new Map<string, Map<string, BuildDetails>>();
  const newDetails = (): BuildDetails => ({
    runes: new Map(),
    spells: new Map(),
    start: new Map(),
    firstBuy: new Map(),
    firstBuyT: new Histogram(10_000),
    coreT: new Histogram(10_000),
    boots: new Map(),
    slots: [new Map(), new Map(), new Map()],
    skills: new Map(),
  });

  for await (const game of input.games()) {
    for (const scope of scopesOf(game)) {
      for (const p of game.participants) {
        const key = crKey(scope, p.champion, p.role);
        const builds = selected.get(key);
        const bk = buildKey(p.majors);
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
    const entries = [...counters.entries()].filter(([key]) => key.startsWith(`${scope}|`)).map(([key, cr]) => ({ key, cr }));

    // Tier per role, among champions with a meaningful sample in the role.
    const tierOf = new Map<string, TierRank>();
    for (const role of ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const) {
      const pool = entries.filter((e) => e.cr.role === role && e.cr.games >= config.minMatchupGames);
      const scores = tierScores(pool.map((e) => ({ wins: e.cr.wins, games: e.cr.games, pickRate: rate(e.cr.games, total), banRate: rate(banMap.get(e.cr.champion) ?? 0, total) })));
      tierRanks(scores).forEach((rank, i) => tierOf.set(pool[i]!.key, rank));
    }

    const previous = input.previous.get(scope);
    const index: IndexJson = { patch: input.patch, filter, region, totalGames: total, champions: [] };
    const byChampion = new Map<number, IndexJson['champions'][number]>();

    for (const { key, cr } of entries) {
      const role = siteRole(cr.role);
      const winRate = rate(cr.wins, cr.games);
      const pickRate = rate(cr.games, total);
      const banRate = rate(banMap.get(cr.champion) ?? 0, total);
      const tier = tierOf.get(key) ?? null;
      const lowSample = cr.games < config.lowSampleGames;
      const prev = previous?.champions.find((c) => c.champion === cr.champion)?.roles.find((r) => r.role === role);

      const entry = byChampion.get(cr.champion) ?? { champion: cr.champion, roles: [] };
      entry.roles.push({ role, games: cr.games, winRate: round(winRate), pickRate: round(pickRate), banRate: round(banRate), tier, lowSample });
      byChampion.set(cr.champion, entry);

      const builds = (selected.get(key) ?? []).map((b) => buildJson(b, cr, details.get(key)?.get(b.key)));
      const opponents = [...cr.opponents.entries()].filter(([, o]) => o.games >= config.minMatchupGames);
      const byWin = [...opponents].sort((a, b) => rate(a[1].wins, a[1].games) - rate(b[1].wins, b[1].games));
      const weakAgainst = byWin.slice(0, 6).map(([champion, o]) => ({ champion, games: o.games, winRate: round(rate(o.wins, o.games)) }));
      const strongAgainst = byWin
        .slice(-6)
        .reverse()
        .filter(([champion]) => !weakAgainst.some((w) => w.champion === champion))
        .map(([champion, o]) => ({ champion, games: o.games, winRate: round(rate(o.wins, o.games)) }));
      const synergyRole = siteRole(SYNERGY_ROLE[cr.role]);
      const synergy = [...cr.mates.entries()]
        .filter(([, m]) => m.games >= config.minMatchupGames)
        .sort((a, b) => wilsonLower(b[1].wins, b[1].games) - wilsonLower(a[1].wins, a[1].games))
        .slice(0, 6)
        .map(([champion, m]) => ({ champion, role: synergyRole, games: m.games, winRate: round(rate(m.wins, m.games)) }));
      const vsOpponent = [...cr.opponents.entries()]
        .filter(([, o]) => o.games >= Math.min(10, config.minMatchupGames))
        .sort((a, b) => b[1].games - a[1].games)
        .map(([champion, o]) => {
          const best = top(o.keys);
          const core = best && best[1] >= 10 ? best[0].split('-').map(Number) : null;
          return { champion, games: o.games, winRate: round(rate(o.wins, o.games)), core };
        });
      const players = [...cr.players.values()]
        .filter((pl) => pl.games >= config.minPlayerGames && pl.riotId)
        .sort((a, b) => wilsonLower(b.wins, b.games) - wilsonLower(a.wins, a.games))
        .slice(0, 10)
        .map((pl) => ({ riotId: pl.riotId, platform: pl.platform, tier: pl.tier, games: pl.games, wins: pl.wins, winRate: round(rate(pl.wins, pl.games)) }));

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
        synergy,
        vsOpponent,
        players,
        summary: { fr: '', en: '' },
      };
      file.summary = summaryTexts(file, input.names);
      files.push(file);
    }
    index.champions = [...byChampion.values()].sort((a, b) => a.champion - b.champion);
    indexes.push(index);
  }
  return { files, indexes, totals };
}

function collectDetails(d: BuildDetails, p: ParticipantRecord): void {
  bump(d.runes, p.runes.join(','), p.win);
  bump(d.spells, p.spells.join(','), p.win);
  if (p.start.length) count(d.start, [...p.start].sort((a, b) => a - b).join(','));
  if (p.firstBuy.length) count(d.firstBuy, [...p.firstBuy].sort((a, b) => a - b).join(','));
  if (p.firstBuyT !== null) d.firstBuyT.add(p.firstBuyT);
  const third = p.majors[2];
  if (third) d.coreT.add(third[1]);
  if (p.boots) count(d.boots, p.boots[0]);
  p.majors.slice(3, 6).forEach(([item], i) => bump(d.slots[i]!, item, p.win));
  if (p.skills.length >= 15) bump(d.skills, p.skills, p.win);
}

function buildJson(build: ReturnType<typeof selectBuilds>[number], cr: ChampionRoleCounters, d: BuildDetails | undefined): BuildJson {
  const runes = d && topWin(d.runes);
  const spells = d && topWin(d.spells);
  const start = d && top(d.start);
  const firstBuy = d && top(d.firstBuy);
  const boots = d && top(d.boots);
  const skills = d && topWin(d.skills);
  const slotTop = (d?.slots ?? []).map((slot) => topWin(slot)?.[0] ?? null);
  const full = [...build.core, ...(boots ? [boots[0]] : []), ...slotTop.slice(0, 2).filter((x): x is number => x !== null)].slice(0, 6);

  const situational: BuildJson['situational'] = [];
  (d?.slots ?? []).forEach((slot, i) => {
    const main = slotTop[i] ?? null;
    const minGames = Math.max(10, Math.round(0.05 * build.games));
    [...slot.entries()]
      .filter(([item, c]) => item !== main && c.games >= minGames && !build.core.includes(item))
      .sort((a, b) => b[1].games - a[1].games)
      .slice(0, 3)
      .forEach(([item, c]) => situational.push({ slot: (i + 4) as 4 | 5 | 6, item, replaces: main, games: c.games, wins: c.wins, winRate: round(rate(c.wins, c.games)) }));
  });

  return {
    label: build.label,
    core: build.core,
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
    coreMedianMs: d?.coreT.median() ?? null,
    boots: boots ? { id: boots[0], games: boots[1] } : null,
    full,
    situational,
    skills: skills ? { order: skills[0].slice(0, 18), max: maxOrder(skills[0]), games: skills[1].games, wins: skills[1].wins, winRate: round(rate(skills[1].wins, skills[1].games)) } : null,
  };
}

export type { SiteRole };
