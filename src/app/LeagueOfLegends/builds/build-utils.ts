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

/** A new patch is shown by default only this long after its release: before that it has too few games. */
export const NEW_PATCH_GRACE_MS = 48 * 3_600_000;
/** Without a release date (older meta.json): the new patch is the default once it has this share of the previous one's games. */
export const NEW_PATCH_MIN_SHARE = 0.1;

/**
 * Patch shown by default: the previous one during the first two days of a new patch (few games yet), then the newest.
 * Shared by the builds list, the champion build page and the tier list.
 */
export function defaultPatch(meta: BuildMeta | null | undefined, now = Date.now()): string | null {
  if (!meta?.patches.length) return null;
  const latest = meta.patches.find((p) => p.patch === meta.latest) ?? meta.patches[0]!;
  const previous = meta.patches.find((p) => p.patch !== latest.patch);
  if (!previous) return latest.patch;
  const released = latest.releasedAt ? Date.parse(latest.releasedAt) : NaN;
  if (Number.isFinite(released)) return now - released < NEW_PATCH_GRACE_MS ? previous.patch : latest.patch;
  const total = (p: typeof latest) => p.games[`${BUILD_FILTERS[0]}|all`] ?? 0;
  return total(latest) < total(previous) * NEW_PATCH_MIN_SHARE ? previous.patch : latest.patch;
}

/** `?patch=` when it is one of the published patches, the default patch otherwise. */
export function resolvePatch(meta: BuildMeta | null | undefined, requested: string | null | undefined, now = Date.now()): string | null {
  return requested && meta?.patches.some((p) => p.patch === requested) ? requested : defaultPatch(meta, now);
}

export interface PatchOption {
  patch: string;
  /** Newest patch (`current`) or the one before. */
  kind: 'current' | 'previous';
  /** Games of the shown rank filter and region; null when unknown (tier list bands below Emerald). */
  games: number | null;
  /** The newest patch is still in its first days: not the default yet. */
  fewData: boolean;
}

/** Options of the patch dropdown (newest first): only the current patch and the previous one are published. */
export function patchOptions(meta: BuildMeta | null | undefined, filter: BuildFilter | null, region = 'all', now = Date.now()): PatchOption[] {
  if (!meta) return [];
  const fallback = defaultPatch(meta, now);
  return meta.patches.slice(0, 2).map((p) => ({
    patch: p.patch,
    kind: p.patch === meta.latest ? 'current' : 'previous',
    games: filter ? (p.games[`${filter}|${region}`] ?? 0) : null,
    fewData: p.patch === meta.latest && fallback !== meta.latest,
  }));
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
