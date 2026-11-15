import { afterNextRender, DestroyRef, inject, signal, Signal } from '@angular/core';
import { Champion, ChampionMatchups, Role } from '../../core/data/champion-data.service';
import { ChampionOption } from '../../shared/ui/champion-combobox/champion-combobox.component';
import { DifficultyLevel, DIFFICULTY_LEVELS_DESC, toLevel } from '../../shared/ui/difficulty/matchup-difficulty';

const RANK_IDS = ['challenger', 'grandmaster', 'master', 'diamond', 'emerald', 'platinum', 'gold', 'silver', 'bronze', 'iron'];
const RANK_ALIASES: Record<string, string> = { diamant: 'diamond' };

/** Splits a raw tip into sentences (same rules as the previous page, without the dashes). */
export function splitTips(raw: string): string[] {
  return raw
    .replace(/\|\s?/g, '')
    .replace(/(?<!\d)\.\s+/g, '.\n')
    .split('\n')
    .map((line) => line.replace(/^[^\p{L}\p{N}]+/u, '').trim())
    .filter((line) => line.length > 0)
    .map((line) => line.charAt(0).toUpperCase() + line.slice(1));
}

export function rankId(rank: string | null): string | null {
  if (!rank) return null;
  for (const token of rank.toLowerCase().split(/[^a-zé]+/)) {
    const id = RANK_ALIASES[token] ?? token;
    if (RANK_IDS.includes(id)) return id;
  }
  return null;
}

/** One opponent in a list / board column. */
export interface MatchupEntry {
  name: string;
  slug: string;
  icon: string;
  level: DifficultyLevel;
}

export interface BoardColumn {
  level: DifficultyLevel;
  entries: MatchupEntry[];
}

export interface ChampionLookup {
  findByName(name: string): Champion | null | undefined;
  iconUrl(champion: Champion): string;
}

function entries(data: ChampionMatchups, lookup: ChampionLookup): Array<MatchupEntry & { champion: Champion }> {
  const result: Array<MatchupEntry & { champion: Champion }> = [];
  for (const m of data.matchups) {
    const champion = lookup.findByName(m.enemy);
    if (!champion) continue;
    result.push({ name: champion.name, slug: champion.slug, icon: lookup.iconUrl(champion), level: toLevel(m.level), champion });
  }
  return result;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

/** Same-role opponents of `owner` within `levels`, in the order of `levels` then by name. */
export function listEntries(owner: Champion, data: ChampionMatchups, levels: readonly number[], lookup: ChampionLookup): MatchupEntry[] {
  return entries(data, lookup)
    .filter((e) => levels.includes(e.level) && e.champion.roles.some((role) => owner.roles.includes(role)))
    .sort((a, b) => levels.indexOf(a.level) - levels.indexOf(b.level) || byName(a, b))
    .map(({ champion: _champion, ...entry }) => entry);
}

/** Every classified opponent, grouped by level (hardest first by default). Empty levels are kept. */
export function boardColumns(
  data: ChampionMatchups | null | undefined,
  lookup: ChampionLookup,
  order: readonly DifficultyLevel[] = DIFFICULTY_LEVELS_DESC
): BoardColumn[] {
  const all = data ? entries(data, lookup) : [];
  return order.map((level) => ({
    level,
    entries: all
      .filter((e) => e.level === level)
      .sort(byName)
      .map(({ champion: _champion, ...entry }) => entry),
  }));
}

/** Combobox options with the difficulty of each opponent: classified first (hardest first), then the rest by name. */
export function optionsWithLevels(options: readonly ChampionOption[], data: ChampionMatchups | null | undefined, exclude?: string): ChampionOption[] {
  const levels = new Map<string, number>();
  for (const m of data?.matchups ?? []) levels.set(m.enemy, toLevel(m.level));
  return options
    .filter((o) => o.champion.slug !== exclude)
    .map((o) => ({ ...o, level: levels.get(o.champion.name) }))
    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0) || a.champion.name.localeCompare(b.champion.name));
}

/**
 * Champions that can be selected, optionally for one role. Every champion is selectable: without author
 * matchups, its pages show the « how to play against » advice and the build data.
 */
export function pickableChampions(champions: readonly Champion[], role: Role | null): Champion[] {
  return champions.filter((c) => !role || c.roles.includes(role));
}

/**
 * `true` under 768 px. Starts `false` (server render and hydration), then follows the viewport.
 * Must be called in an injection context.
 */
export function injectIsMobile(): Signal<boolean> {
  const mobile = signal(false);
  const destroyRef = inject(DestroyRef);
  afterNextRender(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => mobile.set(query.matches);
    update();
    query.addEventListener('change', update);
    destroyRef.onDestroy(() => query.removeEventListener('change', update));
  });
  return mobile.asReadonly();
}
