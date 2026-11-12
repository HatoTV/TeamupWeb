import type { ChampionAbilities } from './ddragon.ts';

/** Below this word overlap (Jaccard, numbers removed), a description counts as rewritten. */
export const MIN_DESCRIPTION_SIMILARITY = 0.6;

const wordsOf = (html: string) =>
  new Set(
    html
      .replace(/<[^>]+>/g, ' ')
      .toLowerCase()
      .replace(/[\d.,%]+/g, ' ')
      .split(/[^\p{L}]+/u)
      .filter(Boolean)
  );

function similarity(a: string, b: string): number {
  const x = wordsOf(a);
  const y = wordsOf(b);
  const inter = [...x].filter((w) => y.has(w)).length;
  const union = new Set([...x, ...y]).size;
  return union === 0 ? 1 : inter / union;
}

/** Reasons why `after` is a rework of `before`, or [] for a simple balance change. */
export function reworkReasons(before: ChampionAbilities, after: ChampionAbilities): string[] {
  const reasons: string[] = [];
  const pairs = [
    ['passive', before.passive, after.passive],
    ...['Q', 'W', 'E', 'R'].map((k, i) => [k, before.spells[i], after.spells[i]] as const),
  ] as const;
  for (const [slot, old, now] of pairs) {
    if (!old || !now) {
      reasons.push(`${slot}: missing`);
      continue;
    }
    if (old.name !== now.name) reasons.push(`${slot}: « ${old.name} » → « ${now.name} »`);
    else if (similarity(old.description, now.description) < MIN_DESCRIPTION_SIMILARITY) reasons.push(`${slot} (${now.name}): description rewritten`);
  }
  return reasons;
}
