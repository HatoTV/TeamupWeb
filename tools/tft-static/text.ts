// Text helpers of the TFT static data: slugs, short ids and the cleaning of CommunityDragon descriptions.

export const slugify = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Stable 4-character id (base 36) of an API name, used in the team builder links. FNV-1a 32 bits. */
export function shortId(apiName: string, salt = ''): string {
  let h = 0x811c9dc5;
  for (const ch of salt + apiName) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h % 36 ** 4).toString(36).padStart(4, '0');
}

export type Lang = 'fr' | 'en';

/** Label shown in place of a value that the data does not give (placeholder `@Name@` without a variable). */
const PLACEHOLDER_LABELS: Array<[RegExp, Record<Lang, string>]> = [
  [/shield/i, { fr: 'bouclier', en: 'shield' }],
  [/heal|health|hp/i, { fr: 'PV', en: 'health' }],
  [/damage|dmg/i, { fr: 'dégâts', en: 'damage' }],
  [/duration|seconds|time|delay/i, { fr: 'durée', en: 'duration' }],
  [/mana/i, { fr: 'mana', en: 'mana' }],
  [/gold/i, { fr: 'PO', en: 'gold' }],
  [/percent|pct|multiplier|ratio/i, { fr: '%', en: '%' }],
];

const label = (name: string, lang: Lang): string =>
  PLACEHOLDER_LABELS.find(([re]) => re.test(name))?.[1][lang] ?? (lang === 'fr' ? 'valeur' : 'value');

const round = (n: number): string => String(Math.round(n * 100) / 100);

/** Ability variable values: index 1, 2 and 3 are the 1, 2 and 3-star values. */
export interface AbilityVariable {
  name: string;
  value: number[] | null;
}

/**
 * Readable description: `@Var@` replaced by its star values (`200 / 300 / 450`, or one value when they are equal) when
 * the variable is given, by a bracketed label (`[dégâts]`) otherwise; scaling icons (`%i:scaleAP%`) and markup removed.
 * Never invents a number.
 */
export function cleanDescription(desc: string | null | undefined, variables: readonly AbilityVariable[], lang: Lang): string {
  if (!desc) return '';
  const byName = new Map(variables.map((v) => [v.name.toLowerCase(), v.value]));
  return desc
    .replace(/\\r|\\n|\r|\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<rules>[\s\S]*?<\/rules>/gi, '')
    .replace(/%i:[a-z0-9_]+%/gi, '')
    .replace(/@([A-Za-z0-9_.*]+)@/g, (_, raw: string) => {
      const name = raw.split('*')[0]!;
      const values = byName.get(name.toLowerCase());
      if (values && values.length >= 4) {
        const stars = [values[1]!, values[2]!, values[3]!];
        return stars.every((v) => v === stars[0]) ? round(stars[0]!) : stars.map(round).join(' / ');
      }
      return `[${label(name, lang)}]`;
    })
    .replace(/<[^>]+>/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t  ]{2,}/g, ' ')
    .replace(/ +([.,;:!?)])/g, (m, p: string) => (lang === 'fr' && /[;:!?]/.test(p) ? ` ${p}` : p))
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();
}
