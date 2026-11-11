/** Data Dragon (static game data) and CommunityDragon (stat shard icons). */

const DDRAGON = 'https://ddragon.leagueoflegends.com';
export const COMMUNITY_DRAGON_PERKS = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perks.json';

export type Lang = 'fr_FR' | 'en_US';

export interface DDragonItem {
  name: string;
  description: string;
  plaintext?: string;
  gold: { base: number; total: number; sell: number; purchasable: boolean };
  from?: string[];
  into?: string[];
  tags?: string[];
  maps: Record<string, boolean>;
  consumed?: boolean;
  inStore?: boolean;
  requiredChampion?: string;
  requiredAlly?: string;
  depth?: number;
}

export interface DDragonItems {
  data: Record<string, DDragonItem>;
}

export interface DDragonRuneTree {
  id: number;
  key: string;
  icon: string;
  name: string;
  slots: { runes: { id: number; key: string; icon: string; name: string; shortDesc: string; longDesc: string }[] }[];
}

export interface DDragonSummoner {
  id: string;
  key: string;
  name: string;
  description: string;
  image: { full: string };
  modes: string[];
}

export interface DDragonChampionSummary {
  id: string;
  key: string;
  name: string;
  tags: string[];
}

export interface DDragonChampionFull extends DDragonChampionSummary {
  passive: { name: string; description: string; image: { full: string } };
  spells: { id: string; name: string; description: string; image: { full: string } }[];
}

async function getJson<T>(url: string, fetchImpl: typeof fetch = fetch): Promise<T> {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

export class DataDragon {
  private readonly cache = new Map<string, Promise<unknown>>();
  private readonly fetchImpl: typeof fetch;

  constructor(fetchImpl: typeof fetch = fetch) {
    this.fetchImpl = fetchImpl;
  }

  private cached<T>(url: string): Promise<T> {
    let p = this.cache.get(url) as Promise<T> | undefined;
    if (!p) this.cache.set(url, (p = getJson<T>(url, this.fetchImpl)));
    return p;
  }

  versions(): Promise<string[]> {
    return this.cached(`${DDRAGON}/api/versions.json`);
  }

  items(version: string, lang: Lang = 'en_US'): Promise<DDragonItems> {
    return this.cached(`${DDRAGON}/cdn/${version}/data/${lang}/item.json`);
  }

  runes(version: string, lang: Lang = 'en_US'): Promise<DDragonRuneTree[]> {
    return this.cached(`${DDRAGON}/cdn/${version}/data/${lang}/runesReforged.json`);
  }

  summoners(version: string, lang: Lang = 'en_US'): Promise<{ data: Record<string, DDragonSummoner> }> {
    return this.cached(`${DDRAGON}/cdn/${version}/data/${lang}/summoner.json`);
  }

  champions(version: string, lang: Lang = 'en_US'): Promise<{ data: Record<string, DDragonChampionSummary> }> {
    return this.cached(`${DDRAGON}/cdn/${version}/data/${lang}/champion.json`);
  }

  championsFull(version: string, lang: Lang = 'en_US'): Promise<{ data: Record<string, DDragonChampionFull> }> {
    return this.cached(`${DDRAGON}/cdn/${version}/data/${lang}/championFull.json`);
  }

  /** CommunityDragon perks (stat shards have no Data Dragon entry). */
  perks(): Promise<{ id: number; name: string; iconPath: string }[]> {
    return this.cached(COMMUNITY_DRAGON_PERKS);
  }
}
