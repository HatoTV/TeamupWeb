import { CommunityTip, CommunityTipsFile, MAX_TIPS, MIN_TIPS_PER_SIDE, VsTipsFile, sideTips, sortTips, vsTips } from './community-tips.service';

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

  it(`hides a perspective with fewer than ${MIN_TIPS_PER_SIDE} tips`, () => {
    const one = [tip('only', 1, true, 'mechanics')];
    const two = [tip('a', 2, false, 'lane'), tip('b', 1, true, 'mechanics')];
    const file: CommunityTipsFile = {
      pair: ['Yasuo', 'Yone'],
      researchedAt: '2026-11-12',
      gameVersion: '16.22',
      status: 'ok',
      perspectives: { Yasuo: { fr: one, en: one }, Yone: { fr: two, en: two } },
      sources: [],
    };
    expect(sideTips(file, 'Yasuo', 'fr')).toEqual([]);
    expect(sideTips(file, 'Yone', 'en').map((t) => t.text)).toEqual(['a', 'b']);
    expect(sideTips({ ...file, status: 'insufficientSources' }, 'Yone', 'fr')).toEqual([]);
  });

  it('shows a « how to play against » file only with enough tips and not insufficient', () => {
    const two = [tip('b', 1, true, 'mechanics'), tip('a', 2, false, 'lane')];
    const file: VsTipsFile = { champion: 'Zed', researchedAt: '2026-11-13', gameVersion: '16.22', status: 'ok', tips: { fr: two, en: two }, sources: [] };
    expect(vsTips(file, 'fr').map((t) => t.text)).toEqual(['a', 'b']);
    expect(vsTips({ ...file, tips: { fr: [two[0]!], en: [two[0]!] } }, 'fr')).toEqual([]);
    expect(vsTips({ ...file, status: 'insufficientSources' }, 'en')).toEqual([]);
    expect(vsTips(null, 'fr')).toEqual([]);
  });
});
