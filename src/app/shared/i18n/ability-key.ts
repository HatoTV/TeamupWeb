import { Pipe, PipeTransform } from '@angular/core';
import { Lang } from '../../core/site.config';

/** Ability slot as written in English sources (QWERTY) or as Riot's `skillSlot` (1–4). */
export type AbilitySlot = 'Q' | 'W' | 'E' | 'R' | 1 | 2 | 3 | 4;

const QWERTY = ['Q', 'W', 'E', 'R'] as const;
const AZERTY: Record<(typeof QWERTY)[number], string> = { Q: 'A', W: 'Z', E: 'E', R: 'R' };

/**
 * Key shown for an ability slot: AZERTY (A Z E R) in French, QWERTY (Q W E R) in English.
 * Single source of truth for every ability key displayed on the site (builds, guides, matchups).
 */
export function abilityKey(slot: AbilitySlot, lang: Lang): string {
  const qwerty = typeof slot === 'number' ? QWERTY[slot - 1] : slot;
  if (!qwerty) throw new Error(`Unknown ability slot: ${slot}`);
  return lang === 'fr' ? AZERTY[qwerty] : qwerty;
}

/** `{{ 'Q' | abilityKey: ctx.lang() }}` → `A` in French, `Q` in English. */
@Pipe({ name: 'abilityKey', standalone: true })
export class AbilityKeyPipe implements PipeTransform {
  transform(slot: AbilitySlot, lang: Lang): string {
    return abilityKey(slot, lang);
  }
}
