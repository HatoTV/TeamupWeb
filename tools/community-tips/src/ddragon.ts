import { createHash } from 'node:crypto';

const CDN = 'https://ddragon.leagueoflegends.com';

interface Spell {
  name: string;
  description: string;
  cooldownBurn?: string;
}

export interface ChampionAbilities {
  id: string;
  passive: Spell;
  spells: Spell[];
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Data Dragon ${res.status}: ${url}`);
  return (await res.json()) as T;
}

/** Full Data Dragon version (`16.22.1`) of a game patch (`16.22`): the latest release of that patch. */
export async function ddragonVersion(patch: string): Promise<string> {
  const versions = await getJson<string[]>(`${CDN}/api/versions.json`);
  const match = versions.find((v) => v.startsWith(`${patch}.`));
  if (!match) throw new Error(`No Data Dragon version for patch ${patch}`);
  return match;
}

export async function championAbilities(version: string, id: string): Promise<ChampionAbilities> {
  const json = await getJson<{ data: Record<string, ChampionAbilities> }>(`${CDN}/cdn/${version}/data/en_US/champion/${id}.json`);
  const champion = json.data[id];
  if (!champion) throw new Error(`Champion ${id} missing from Data Dragon ${version}`);
  return champion;
}

/** SHA-256 of the passive and the 4 spells: names, descriptions and cooldowns (en_US). */
export function abilityHash(champion: ChampionAbilities): string {
  const parts = [
    { name: champion.passive.name, description: champion.passive.description },
    ...champion.spells.map((s) => ({ name: s.name, description: s.description, cooldown: s.cooldownBurn ?? '' })),
  ];
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
