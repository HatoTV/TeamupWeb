import { Role } from '../../core/data/champion-data.service';
import { BuildData, BuildFilter, StaticCore } from '../../core/data/build-data.service';
import { abilityKey } from '../../shared/i18n/ability-key';
import { Lang } from '../../core/site.config';

/** Stat shard rows of the rune page (offense, flex, defense). */
export const SHARD_ROWS: readonly (readonly number[])[] = [
  [5008, 5005, 5007],
  [5008, 5010, 5001],
  [5011, 5013, 5001],
];

/** Skill colours of the order grid: Q gold, W blue, E green, R pink. */
export const SKILL_COLORS: Record<string, string> = { '1': '#FFC93C', '2': '#36A3FF', '3': '#4FD18B', '4': '#FF5C9E' };

export const ROLE_ORDER: readonly Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];

/** 0.5123 → "51,2 %" (fr) / "51.2%" (en). */
export function formatRate(value: number, lang: Lang, digits = 1): string {
  const n = (value * 100).toFixed(digits);
  return lang === 'fr' ? `${n.replace('.', ',')} %` : `${n}%`;
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

/** 1 234 567 ms → "20:34". */
export function formatTiming(ms: number | null): string {
  if (ms === null) return '';
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Multiset → [[id, count]] keeping the first-seen order. */
export function groupItems(items: readonly number[]): Array<[number, number]> {
  const counts = new Map<number, number>();
  for (const id of items) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()];
}

export interface CopyLabels {
  title: string;
  core: string;
  full: string;
  start: string;
  runes: string;
  spells: string;
  skills: string;
  max: string;
}

/** Plain-text build, readable anywhere (no client import format). */
export function buildAsText(build: BuildData, core: StaticCore, lang: Lang, labels: CopyLabels): string {
  const item = (id: number) => core.items[id]?.name ?? String(id);
  const rune = (id: number) =>
    core.runeTrees.flatMap((t) => [{ id: t.id, name: t.name }, ...t.slots.flat()]).find((r) => r.id === id)?.name ?? core.shards[id]?.name ?? String(id);
  const lines = [labels.title, `${labels.core} : ${build.core.map(item).join(' > ')}`];
  if (build.full.length) lines.push(`${labels.full} : ${build.full.map(item).join(' > ')}`);
  if (build.start) lines.push(`${labels.start} : ${build.start.items.map(item).join(', ')}`);
  if (build.runes) {
    const p = build.runes.page;
    lines.push(`${labels.runes} : ${rune(p[1]!)}, ${p.slice(2, 5).map(rune).join(', ')} / ${p.slice(6, 8).map(rune).join(', ')} / ${p.slice(8, 11).map(rune).join(', ')}`);
  }
  if (build.spells) lines.push(`${labels.spells} : ${build.spells.ids.map((id) => core.summoners[id]?.name ?? id).join(' + ')}`);
  if (build.skills) {
    const keys = [...build.skills.order].map((s) => abilityKey(Number(s) as 1 | 2 | 3 | 4, lang));
    const max = [...build.skills.max].map((s) => abilityKey(Number(s) as 1 | 2 | 3, lang));
    lines.push(`${labels.skills} : ${keys.join(' ')}`, `${labels.max} : ${max.join(' > ')}`);
  }
  return lines.join('\n');
}

export const isBuildFilter = (value: string | null | undefined, filters: readonly BuildFilter[]): value is BuildFilter =>
  !!value && (filters as readonly string[]).includes(value);
