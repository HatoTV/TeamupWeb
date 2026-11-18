import { BuildMeta } from '../../core/data/build-data.service';
import { NEW_PATCH_GRACE_MS, buildIndexFrom, defaultPatch, formatDelta, formatRate, groupItems, isBuildFilter, patchOptions, rankFilters, resolvePatch } from './build-utils';

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
  describe('default patch', () => {
    const now = Date.parse('2026-11-18T12:00:00Z');
    const meta = (releasedAt: string | undefined, newGames = 300): BuildMeta => ({
      current: '16.23',
      latest: '16.23',
      patches: [
        { patch: '16.23', ddragonVersion: '16.23.1', games: { 'emerald_plus|all': newGames }, updatedAt: '', ...(releasedAt ? { releasedAt } : {}) },
        { patch: '16.22', ddragonVersion: '16.22.1', games: { 'emerald_plus|all': 1_000_000 }, updatedAt: '' },
      ],
      filters: ['emerald_plus'],
      regions: ['all'],
      minGamesForNewPatch: 200,
    });

    it('keeps the previous patch during the first two days of a new one', () => {
      expect(defaultPatch(meta(new Date(now - 3_600_000).toISOString()), now)).toBe('16.22');
      expect(defaultPatch(meta(new Date(now - NEW_PATCH_GRACE_MS + 60_000).toISOString()), now)).toBe('16.22');
      expect(defaultPatch(meta(new Date(now - NEW_PATCH_GRACE_MS).toISOString()), now)).toBe('16.23');
    });

    it('falls back to the share of games without a release date', () => {
      expect(defaultPatch(meta(undefined, 300), now)).toBe('16.22');
      expect(defaultPatch(meta(undefined, 200_000), now)).toBe('16.23');
    });

    it('honours a valid ?patch= only', () => {
      const m = meta(new Date(now).toISOString());
      expect(resolvePatch(m, '16.23', now)).toBe('16.23');
      expect(resolvePatch(m, '16.10', now)).toBe('16.22');
      expect(resolvePatch(null, '16.23', now)).toBeNull();
    });

    it('offers the current and previous patch, the new one flagged while thin', () => {
      const options = patchOptions(meta(new Date(now).toISOString()), 'emerald_plus', 'all', now);
      expect(options.map((o) => [o.patch, o.kind, o.games, o.fewData])).toEqual([
        ['16.23', 'current', 300, true],
        ['16.22', 'previous', 1_000_000, false],
      ]);
    });
  });
});
