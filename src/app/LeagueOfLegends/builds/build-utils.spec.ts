import { BuildMeta } from '../../core/data/build-data.service';
import { buildIndexFrom, formatDelta, formatRate, groupItems, isBuildFilter, rankFilters } from './build-utils';

describe('build utils', () => {
  it('only keeps rank filters with games of their own tier', () => {
    const meta = (games: Record<string, number>): BuildMeta => ({
      current: '16.22',
      latest: '16.22',
      patches: [{ patch: '16.22', ddragonVersion: '16.22.1', games, updatedAt: '' }],
      filters: ['emerald_plus', 'diamond_plus', 'master_plus', 'grandmaster_plus', 'challenger'],
      regions: ['all'],
      minGamesForNewPatch: 200,
    });
    const masterOnly = { 'emerald_plus|all': 5399, 'diamond_plus|all': 5399, 'master_plus|all': 5399, 'grandmaster_plus|all': 186, 'challenger|all': 6 };
    expect(rankFilters(meta(masterOnly))).toEqual(['master_plus', 'grandmaster_plus', 'challenger']);
    expect(rankFilters(meta({ ...masterOnly, 'emerald_plus|all': 9000 }))).toEqual(['emerald_plus', 'master_plus', 'grandmaster_plus', 'challenger']);
    expect(rankFilters(meta({ ...masterOnly, 'challenger|all': 0 }))).toEqual(['master_plus', 'grandmaster_plus']);
    expect(rankFilters(null)).toEqual([]);
    const withExact = meta({ ...masterOnly, 'emerald_plus|all': 9000, 'emerald|all': 3601, 'master|all': 5213, 'diamond|all': 0 });
    withExact.filters = ['emerald_plus', 'diamond_plus', 'master_plus', 'grandmaster_plus', 'challenger', 'emerald', 'diamond', 'master', 'grandmaster'];
    expect(rankFilters(withExact)).toEqual(['emerald_plus', 'master_plus', 'grandmaster_plus', 'challenger', 'emerald', 'master']);
  });

  it('formats rates and deltas in both languages', () => {
    expect(formatRate(0.5123, 'fr')).toBe('51,2\u202f%');
    expect(formatRate(0.5123, 'en')).toBe('51.2%');
    expect(formatDelta(0.004, 'fr')).toEqual({ text: '▲ 0,4', up: true });
    expect(formatDelta(-0.011, 'en')).toEqual({ text: '▼ 1.1', up: false });
    expect(formatDelta(0.0001, 'fr')).toBeNull();
  });

  it('groups a multiset of items in purchase order', () => {
    expect(groupItems([1055, 2003, 2003])).toEqual([
      [1055, 1],
      [2003, 2],
    ]);
  });

  it('validates rank filters', () => {
    expect(isBuildFilter('master_plus', ['emerald_plus', 'master_plus'])).toBeTrue();
    expect(isBuildFilter('silver', ['emerald_plus'])).toBeFalse();
    expect(isBuildFilter(null, ['emerald_plus'])).toBeFalse();
  });

  it('selects the build from ?build=0..3, unknown values select build 0', () => {
    expect(buildIndexFrom('3', 4)).toBe(3);
    expect(buildIndexFrom('1', 4)).toBe(1);
    expect(buildIndexFrom('3', 3)).toBe(0, 'no OFF-META build');
    expect(buildIndexFrom('7', 4)).toBe(0);
    expect(buildIndexFrom('abc', 4)).toBe(0);
    expect(buildIndexFrom('-1', 4)).toBe(0);
    expect(buildIndexFrom(null, 4)).toBe(0);
  });
});
