import type { GameRecord, Role } from '../extract/game.ts';

/** Default share of a champion's games a role needs to be one of his main roles. */
export const DEFAULT_MAIN_ROLE_SHARE = 0.1;

/**
 * Main roles of each champion, from every participant of the patch (all ranks, all regions): a role is a main
 * role when it holds at least `minShare` of the champion's games; the most played role always is. Off-role picks
 * (a few Evelynn ADC games) get no tier, no build page and no entry in the lists: their win rate means nothing.
 */
export class MainRoles {
  private readonly games = new Map<number, Map<Role, number>>();
  private cache: { minShare: number; roles: Map<number, Set<Role>> } | null = null;

  add(game: GameRecord): void {
    for (const p of game.participants) this.count(p.champion, p.role, 1);
  }

  count(champion: number, role: Role, games: number): void {
    const roles = this.games.get(champion) ?? new Map<Role, number>();
    roles.set(role, (roles.get(role) ?? 0) + games);
    this.games.set(champion, roles);
    this.cache = null;
  }

  /** Main roles per champion. */
  resolve(minShare = DEFAULT_MAIN_ROLE_SHARE): Map<number, Set<Role>> {
    if (this.cache?.minShare === minShare) return this.cache.roles;
    const out = new Map<number, Set<Role>>();
    for (const [champion, roles] of this.games) {
      const total = [...roles.values()].reduce((a, b) => a + b, 0);
      const sorted = [...roles].sort((a, b) => b[1] - a[1]);
      out.set(champion, new Set(sorted.filter(([, n], i) => i === 0 || n >= minShare * total).map(([role]) => role)));
    }
    this.cache = { minShare, roles: out };
    return out;
  }

  isMain(champion: number, role: Role, minShare = DEFAULT_MAIN_ROLE_SHARE): boolean {
    return this.resolve(minShare).get(champion)?.has(role) ?? false;
  }
}
