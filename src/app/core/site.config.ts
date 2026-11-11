import { BrandName } from '../shared/ui/icon/brand-icons';

export type Lang = 'fr' | 'en';
export const SUPPORTED_LANGS: readonly Lang[] = ['fr', 'en'];
export const DEFAULT_LANG: Lang = 'fr';

export type GameId = 'lol' | 'tft' | 'rl';

export interface GameLink {
  id: GameId;
  labelKey: string;
  short: string;
  /** Path without the language prefix. */
  path: string;
}

export const GAMES: readonly GameLink[] = [
  { id: 'lol', labelKey: 'GAMES.LOL', short: 'LoL', path: '/lol/matchups' },
  { id: 'tft', labelKey: 'GAMES.TFT', short: 'TFT', path: '/tft' },
  { id: 'rl', labelKey: 'GAMES.RL', short: 'RL', path: '/rocket/mecanics' },
];

/** Feature flags for pages that are not live yet (links to them stay hidden while false). */
export const FEATURES = {
  /** LoL champion build pages (`/lol/champions/:id/build/:role`). */
  buildPages: false,
} as const;

export const DISCORD_URL = 'https://discord.gg/pM4Eu5quyg';
export const TWITCH_URL = 'https://www.twitch.tv/Hato_TV';

export interface SocialLink {
  brand: BrandName;
  name: string;
  handle: string;
  href: string;
}

/** Order used everywhere (Instagram first, as requested for the About page). */
export const SOCIALS: readonly SocialLink[] = [
  { brand: 'instagram', name: 'Instagram', handle: '@callmehato', href: 'https://www.instagram.com/callmehato/' },
  { brand: 'twitch', name: 'Twitch', handle: 'Hato_TV', href: TWITCH_URL },
  { brand: 'youtube', name: 'YouTube', handle: '@Hato_YT', href: 'https://www.youtube.com/@Hato_YT' },
  { brand: 'tiktok', name: 'TikTok', handle: '@hato.tv', href: 'https://www.tiktok.com/@hato.tv' },
  { brand: 'discord', name: 'Discord', handle: 'TeamUpp', href: DISCORD_URL },
];
