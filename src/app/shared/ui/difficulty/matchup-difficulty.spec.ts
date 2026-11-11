import { DIFFICULTY_LEVELS, MATCHUP_DIFFICULTY, difficulty, distribution, levelFromApi, toLevel } from './matchup-difficulty';

describe('MatchupDifficulty', () => {
  it('maps the API values to the 1–5 scale', () => {
    expect(['Tiny', 'Minor', 'Even', 'Major', 'Extreme'].map(levelFromApi)).toEqual([1, 2, 3, 4, 5]);
    expect(levelFromApi('extreme')).toBe(5);
    expect(levelFromApi('nope')).toBeNull();
  });

  it('clamps out-of-range and invalid levels', () => {
    expect(toLevel(0)).toBe(1);
    expect(toLevel(9)).toBe(5);
    expect(toLevel(3.6)).toBe(4);
    expect(toLevel(NaN)).toBe(3);
    expect(toLevel(undefined)).toBe(3);
  });

  it('gives every level a colour, an icon and i18n keys', () => {
    for (const level of DIFFICULTY_LEVELS) {
      const d = MATCHUP_DIFFICULTY[level];
      expect(d.color).toBe(`var(--diff-${level})`);
      expect(d.icon).toMatch(/^M/);
      expect(d.labelKey).toBe(`UI.DIFFICULTY.${level}`);
      expect(d.messageKey).toBe(`UI.DIFFICULTY_MESSAGE.${level}`);
      expect(d.adviceKey).toBe(`UI.DIFFICULTY_ADVICE.${level}`);
    }
    expect(new Set(DIFFICULTY_LEVELS.map((l) => MATCHUP_DIFFICULTY[l].icon)).size).toBe(5);
    expect(difficulty(12).level).toBe(5);
  });

  it('counts the non-empty levels in the requested order', () => {
    expect(distribution([5, 4, 5, 1])).toEqual([
      { level: 1, count: 1 },
      { level: 4, count: 1 },
      { level: 5, count: 2 },
    ]);
    expect(distribution([2, 2], [5, 4, 3, 2, 1])).toEqual([{ level: 2, count: 2 }]);
    expect(distribution([])).toEqual([]);
  });
});
