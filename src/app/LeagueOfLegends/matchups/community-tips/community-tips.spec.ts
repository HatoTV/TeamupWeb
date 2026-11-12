import { CommunityTip, MAX_TIPS, formatSourceDate, sortTips } from './community-tips.service';

const tip = (text: string, sources: number, verifiedByGameData: boolean, category: CommunityTip['category']): CommunityTip => ({
  text,
  sources,
  verifiedByGameData,
  category,
});

describe('community tips', () => {
  it('sorts by sources read, then verified in game data, then lane / mechanics / macro', () => {
    const sorted = sortTips([
      tip('macro-2', 2, false, 'macro'),
      tip('mech-1-verified', 1, true, 'mechanics'),
      tip('lane-2', 2, false, 'lane'),
      tip('mech-2-verified', 2, true, 'mechanics'),
      tip('lane-3', 3, false, 'lane'),
    ]);
    expect(sorted.map((t) => t.text)).toEqual(['lane-3', 'mech-2-verified', 'lane-2', 'macro-2', 'mech-1-verified']);
  });

  it(`keeps ${MAX_TIPS} tips at most`, () => {
    const many = Array.from({ length: 12 }, (_, i) => tip(`t${i}`, 2, false, 'lane'));
    expect(sortTips(many).length).toBe(MAX_TIPS);
  });

  it('formats the consultation date in the page language', () => {
    expect(formatSourceDate('2026-11-12', 'fr')).toBe('12 nov. 2026');
    expect(formatSourceDate('2026-11-12', 'en')).toBe('Nov 12, 2026');
  });
});
