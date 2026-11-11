/**
 * Single source of truth for matchup difficulty: API value, colour tokens, icon and i18n keys.
 * Level 1 = very easy … 5 = extreme, always from the point of view of the champion it belongs to.
 */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

/** Values used by the guides API (`counters_matchups[].difficulty`). */
export type ApiDifficulty = 'Tiny' | 'Minor' | 'Even' | 'Major' | 'Extreme';

export interface MatchupDifficulty {
  level: DifficultyLevel;
  api: ApiDifficulty;
  /** SVG path on a 24×24 grid (stroke icon). */
  icon: string;
  /** CSS custom properties: base colour, text colour, 16 % background, 45 % glow. */
  color: string;
  text: string;
  bg: string;
  glow: string;
  /** i18n keys: label, short message, generic advice sentence. */
  labelKey: string;
  messageKey: string;
  adviceKey: string;
}

const ICONS: Record<DifficultyLevel, string> = {
  1: 'M6 13l6-6 6 6M6 19l6-6 6 6',
  2: 'M6 15l6-6 6 6',
  3: 'M5 9h14M5 15h14',
  4: 'M6 9l6 6 6-6',
  5: 'M6 5l6 6 6-6M6 11l6 6 6-6',
};

const API: Record<DifficultyLevel, ApiDifficulty> = { 1: 'Tiny', 2: 'Minor', 3: 'Even', 4: 'Major', 5: 'Extreme' };

/** Easiest first. */
export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = [1, 2, 3, 4, 5];
/** Hardest first (board columns, counters). */
export const DIFFICULTY_LEVELS_DESC: readonly DifficultyLevel[] = [5, 4, 3, 2, 1];

export const MATCHUP_DIFFICULTY: Readonly<Record<DifficultyLevel, MatchupDifficulty>> = Object.fromEntries(
  DIFFICULTY_LEVELS.map((level) => [
    level,
    {
      level,
      api: API[level],
      icon: ICONS[level],
      color: `var(--diff-${level})`,
      text: `var(--diff-${level}-text)`,
      bg: `var(--diff-${level}-bg)`,
      glow: `var(--diff-${level}-glow)`,
      labelKey: `UI.DIFFICULTY.${level}`,
      messageKey: `UI.DIFFICULTY_MESSAGE.${level}`,
      adviceKey: `UI.DIFFICULTY_ADVICE.${level}`,
    },
  ])
) as Record<DifficultyLevel, MatchupDifficulty>;

/** Clamps any number (or garbage) to a valid level; defaults to 3 (even). */
export function toLevel(value: number | null | undefined): DifficultyLevel {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 3;
  return Math.min(5, Math.max(1, Math.round(value))) as DifficultyLevel;
}

/** API value (case-insensitive) → level, or null when unknown. */
export function levelFromApi(value: string | null | undefined): DifficultyLevel | null {
  const key = String(value ?? '').toLowerCase();
  const level = DIFFICULTY_LEVELS.find((l) => API[l].toLowerCase() === key);
  return level ?? null;
}

export function difficulty(level: number | null | undefined): MatchupDifficulty {
  return MATCHUP_DIFFICULTY[toLevel(level)];
}

export interface DistributionSlice {
  level: DifficultyLevel;
  count: number;
}

/** Number of matchups per level (non-empty levels only), in the given order. */
export function distribution(levels: readonly number[], order: readonly DifficultyLevel[] = DIFFICULTY_LEVELS): DistributionSlice[] {
  const counts = new Map<DifficultyLevel, number>();
  for (const value of levels) {
    const level = toLevel(value);
    counts.set(level, (counts.get(level) ?? 0) + 1);
  }
  return order.filter((level) => counts.has(level)).map((level) => ({ level, count: counts.get(level)! }));
}
