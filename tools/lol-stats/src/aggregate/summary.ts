import type { ChampionBuildJson } from '../schema.ts';

/** Localised names from Data Dragon (champion keys → names, item ids → names). */
export interface Names {
  champions: { fr: Map<number, string>; en: Map<number, string> };
  items: { fr: Map<number, string>; en: Map<number, string> };
}

const ROLE_NAMES = {
  fr: { top: 'top', jungle: 'jungle', mid: 'mid', adc: 'ADC', support: 'support' },
  en: { top: 'top', jungle: 'jungle', mid: 'mid', adc: 'ADC', support: 'support' },
} as const;

const FILTER_NAMES = {
  fr: { emerald_plus: 'Émeraude+', diamond_plus: 'Diamant+', master_plus: 'Maître+', grandmaster_plus: 'Grand Maître+', challenger: 'Challenger' },
  en: { emerald_plus: 'Emerald+', diamond_plus: 'Diamond+', master_plus: 'Master+', grandmaster_plus: 'Grandmaster+', challenger: 'Challenger' },
} as const;

const pct = (value: number, lang: 'fr' | 'en') =>
  lang === 'fr' ? `${(value * 100).toFixed(1).replace('.', ',')} %` : `${(value * 100).toFixed(1)}%`;
const int = (value: number, lang: 'fr' | 'en') => value.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US');

function list(names: string[], lang: 'fr' | 'en'): string {
  if (names.length <= 1) return names[0] ?? '';
  const last = names[names.length - 1]!;
  return `${names.slice(0, -1).join(', ')} ${lang === 'fr' ? 'et' : 'and'} ${last}`;
}

/** Short factual paragraph generated from the numbers (no advice is invented). */
export function summaryTexts(file: ChampionBuildJson, names: Names): { fr: string; en: string } {
  const out = { fr: '', en: '' };
  for (const lang of ['fr', 'en'] as const) {
    const champ = names.champions[lang].get(file.champion) ?? String(file.champion);
    const item = (id: number) => names.items[lang].get(id) ?? String(id);
    const role = ROLE_NAMES[lang][file.role];
    const filter = FILTER_NAMES[lang][file.filter];
    const parts: string[] = [];
    if (lang === 'fr') {
      parts.push(
        `Sur le patch ${file.patch}, ${champ} ${role} affiche ${pct(file.winRate, lang)} de victoires sur ${int(file.games, lang)} parties classées (${filter})` +
          (file.tier ? `, tier ${file.tier}.` : '.')
      );
      const first = file.builds.find((b) => b.label === 'most_played');
      const offMeta = file.builds.find((b) => b.label === 'off_meta');
      if (first) parts.push(`Le build le plus joué passe par ${list(first.core.map(item), lang)} (${pct(first.winRate, lang)} de victoires).`);
      if (offMeta) parts.push(`Moins courant, le build OFF-META ${list(offMeta.core.map(item), lang)} atteint ${pct(offMeta.winRate, lang)} sur ${int(offMeta.games, lang)} parties.`);
      if (file.strongAgainst.length) parts.push(`Il s'en sort le mieux contre ${list(file.strongAgainst.slice(0, 3).map((o) => names.champions.fr.get(o.champion) ?? '?'), lang)}.`);
      if (file.weakAgainst.length) parts.push(`Il souffre surtout contre ${list(file.weakAgainst.slice(0, 3).map((o) => names.champions.fr.get(o.champion) ?? '?'), lang)}.`);
    } else {
      parts.push(
        `On patch ${file.patch}, ${champ} ${role} has a ${pct(file.winRate, lang)} win rate over ${int(file.games, lang)} ranked games (${filter})` +
          (file.tier ? `, ${file.tier} tier.` : '.')
      );
      const first = file.builds.find((b) => b.label === 'most_played');
      const offMeta = file.builds.find((b) => b.label === 'off_meta');
      if (first) parts.push(`The most played build goes ${list(first.core.map(item), lang)} (${pct(first.winRate, lang)} win rate).`);
      if (offMeta) parts.push(`Less common, the OFF-META build ${list(offMeta.core.map(item), lang)} reaches ${pct(offMeta.winRate, lang)} over ${int(offMeta.games, lang)} games.`);
      if (file.strongAgainst.length) parts.push(`It does best against ${list(file.strongAgainst.slice(0, 3).map((o) => names.champions.en.get(o.champion) ?? '?'), lang)}.`);
      if (file.weakAgainst.length) parts.push(`It struggles most against ${list(file.weakAgainst.slice(0, 3).map((o) => names.champions.en.get(o.champion) ?? '?'), lang)}.`);
    }
    out[lang] = parts.join(' ');
  }
  return out;
}
