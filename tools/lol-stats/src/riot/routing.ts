/** Riot platforms (league-v4, summoner-v4) and their regional routing (match-v5). */
export const PLATFORM_REGION = {
  EUW1: 'europe',
  EUN1: 'europe',
  TR1: 'europe',
  RU: 'europe',
  KR: 'asia',
  JP1: 'asia',
  NA1: 'americas',
  BR1: 'americas',
  LA1: 'americas',
  LA2: 'americas',
} as const;

export type Platform = keyof typeof PLATFORM_REGION;
export type Region = (typeof PLATFORM_REGION)[Platform];

export function regionOf(platform: Platform): Region {
  const region = PLATFORM_REGION[platform];
  if (!region) throw new Error(`Unknown platform: ${platform}`);
  return region;
}

export function isPlatform(value: string): value is Platform {
  return value in PLATFORM_REGION;
}

/** Host of a platform or region routing value, e.g. `euw1.api.riotgames.com`. */
export function hostOf(routing: Platform | Region): string {
  return `${routing.toLowerCase()}.api.riotgames.com`;
}
