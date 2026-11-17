import { Role } from '../../core/data/champion-data.service';
import { BuildFilter, BuildMeta, BUILD_FILTERS, EXACT_FILTERS } from '../../core/data/build-data.service';
import { Lang } from '../../core/site.config';

/** Stat shard rows of the rune page (offense, flex, defense). */
export const SHARD_ROWS: readonly (readonly number[])[] = [
  [5008, 5005, 5007],
  [5008, 5010, 5001],
  [5011, 5013, 5001],
];

/** Skill colours of the order grid: Q gold, W blue, E green, R pink. */
export const SKILL_COLORS: Record<string, string> = { '1': '#FFC93C', '2': '#36A3FF', '3': '#4FD18B', '4': '#FF5C9E' };

/** Colour of each rune tree (ring of the chosen runes, tree name): Precision, Domination, Sorcery, Inspiration, Resolve. */
export const TREE_COLORS: Record<number, string> = { 8000: '#E8C46E', 8100: '#F0707A', 8200: '#9FA8FF', 8300: '#5FCBD6', 8400: '#7FD6A0' };

export const treeColor = (id: number): string => TREE_COLORS[id] ?? '#E8C46E';

/** `?build=` value → index of the shown build: 0 to count - 1, anything else (old or unknown links) → 0. */
export function buildIndexFrom(value: string | null | undefined, count: number): number {
  const n = value && /^[0-9]$/.test(value) ? Number(value) : 0;
  return n < count ? n : 0;
}

export const ROLE_ORDER: readonly Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];

/** 0.5123 → "51,2 %" (fr) / "51.2%" (en). */
export function formatRate(value: number, lang: Lang, digits = 1): string {
  const n = (value * 100).toFixed(digits);
  // Narrow no-break space (U+202F) before % in French, so the sign never wraps alone.
  return lang === 'fr' ? `${n.replace('.', ',')}\u202f%` : `${n}%`;
}

/** Delta in rate points: 0.004 → "▲ 0,4" ; null when |delta| < 0.05 point. */
export function formatDelta(value: number, lang: Lang): { text: string; up: boolean } | null {
  const points = value * 100;
  if (Math.abs(points) < 0.05) return null;
  const n = Math.abs(points).toFixed(1);
  return { text: `${points > 0 ? '▲' : '▼'} ${lang === 'fr' ? n.replace('.', ',') : n}`, up: points > 0 };
}

export function formatInt(value: number, lang: Lang): string {
  return value.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US');
}

/** Multiset → [[id, count]] keeping the first-seen order. */
export function groupItems(items: readonly number[]): Array<[number, number]> {
  const counts = new Map<number, number>();
  for (const id of items) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()];
}

export const isBuildFilter = (value: string | null | undefined, filters: readonly BuildFilter[]): value is BuildFilter =>
  !!value && (filters as readonly string[]).includes(value);

/**
 * Rank filters that hold games of their own tier, widest first. Filters are cumulative (Emerald+ contains
 * Diamond+…), so a filter with no more games than the next narrower one only repeats it and is hidden.
 */
export function rankFilters(meta: BuildMeta | null | undefined, patch?: string | null, region = 'all'): BuildFilter[] {
  if (!meta) return [];
  const games = (meta.patches.find((p) => p.patch === patch) ?? meta.patches.find((p) => p.patch === meta.latest))?.games ?? {};
  const count = (f: BuildFilter | undefined) => (f ? games[`${f}|${region}`] ?? 0 : 0);
  const available = BUILD_FILTERS.filter((f) => meta.filters.includes(f));
  // Nested filters: shown when they add games of their own tier to the next, narrower one.
  const nested = available.filter((f) => !EXACT_FILTERS.includes(f));
  const exact = available.filter((f) => EXACT_FILTERS.includes(f) && count(f) > 0);
  return [...nested.filter((f, i) => count(f) > count(nested[i + 1])), ...exact];
}
