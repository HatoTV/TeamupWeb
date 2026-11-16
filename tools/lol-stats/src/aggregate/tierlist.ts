import { RANK_BAND_KEYS, bandOf, type Config, type RankBand } from '../config.ts';
import { ROLES, type GameRecord, type Role } from '../extract/game.ts';
import { siteRole, type TierListJson } from '../schema.ts';
import { MainRoles } from './roles.ts';
import { TIERS, rate, round, wilsonLower, type TierRank } from './stats.ts';

export type TierListConfig = Pick<Config, 'lowSampleGames' | 'tierPickWeight' | 'tierPickCap' | 'tierCuts'> & Partial<Pick<Config, 'mainRoleShare'>>;

interface Count {
  games: number;
  wins: number;
}

/**
 * Tier score: 100 × Wilson lower bound (95 %) of the win rate, plus a pick bonus capped at `pickCap` %:
 *   score = 100 × wilson + pickWeight × min(pick rate in %, pickCap)
 */
export function tierListScore(wins: number, games: number, pickRate: number, config: Pick<TierListConfig, 'tierPickWeight' | 'tierPickCap'>): number {
  return 100 * wilsonLower(wins, games) + config.tierPickWeight * Math.min(pickRate * 100, config.tierPickCap);
}

/** Tier of the champion at `position` (0 = best score) among `n`: percentile p = (position + 0.5) / n, cut by `cuts`. */
export function tierAt(position: number, n: number, cuts: readonly number[]): TierRank {
  const p = (position + 0.5) / n;
  const i = cuts.findIndex((cut) => p < cut);
  return TIERS[i === -1 ? cuts.length : i]!;
}

/**
 * Counts of one patch for the tier list, per rank band × role × champion (ranked solo/duo games only: the
 * collector keeps no other queue). A participant counts in the band of his own tier when he is in a collected
 * player list, otherwise in the band of the game (tier of the player(s) who led us to it).
 */
export class TierListCounter {
  /** Games per band, weighted: each participant of the band counts for 1/10 of the game. */
  readonly totals = new Map<RankBand, number>();
  readonly counts = new Map<string, Count>();
  /** Main roles of each champion over every band: off-role picks are neither ranked nor listed. */
  readonly roles = new MainRoles();

  add(game: GameRecord): void {
    this.roles.add(game);
    for (const p of game.participants) {
      const band = bandOf(p.tier ?? game.tier);
      this.totals.set(band, (this.totals.get(band) ?? 0) + 0.1);
      const key = `${band}|${p.role}|${p.champion}`;
      const c = this.counts.get(key) ?? { games: 0, wins: 0 };
      c.games++;
      if (p.win) c.wins++;
      this.counts.set(key, c);
    }
  }

  /** One file per band, the five roles in each. */
  files(patch: string, config: TierListConfig, generatedAt = new Date().toISOString()): TierListJson[] {
    return RANK_BAND_KEYS.map((band) => {
      const total = this.totals.get(band) ?? 0;
      const file: TierListJson = { patch, band, generatedAt, totalGames: Math.round(total), minGames: config.lowSampleGames, champions: [], unranked: [] };
      for (const role of ROLES) {
        const entries = [...this.counts]
          .filter(([key]) => key.startsWith(`${band}|${role}|`))
          .map(([key, c]) => ({ championId: Number(key.split('|')[2]), role: role as Role, ...c, pickRate: rate(c.games, total) }))
          .filter((e) => this.roles.isMain(e.championId, e.role, config.mainRoleShare));
        const ranked = entries
          .filter((e) => e.games >= config.lowSampleGames)
          .map((e) => ({ ...e, score: tierListScore(e.wins, e.games, e.pickRate, config) }))
          .sort((a, b) => b.score - a.score || b.games - a.games || a.championId - b.championId);
        ranked.forEach((e, i) =>
          file.champions.push({
            championId: e.championId,
            role: siteRole(e.role),
            tier: tierAt(i, ranked.length, config.tierCuts),
            games: e.games,
            wins: e.wins,
            winRate: round(rate(e.wins, e.games)),
            pickRate: round(Math.min(1, e.pickRate)),
          })
        );
        for (const e of entries.filter((x) => x.games < config.lowSampleGames).sort((a, b) => b.games - a.games || a.championId - b.championId)) {
          file.unranked.push({ championId: e.championId, role: siteRole(e.role), games: e.games });
        }
      }
      return file;
    });
  }
}
