import { BuildData, StaticCore } from '../../core/data/build-data.service';
import { buildAsText, formatDelta, formatRate, formatTiming, groupItems, isBuildFilter } from './build-utils';

describe('build utils', () => {
  it('formats rates, deltas and timings in both languages', () => {
    expect(formatRate(0.5123, 'fr')).toBe('51,2 %');
    expect(formatRate(0.5123, 'en')).toBe('51.2%');
    expect(formatDelta(0.004, 'fr')).toEqual({ text: '▲ 0,4', up: true });
    expect(formatDelta(-0.011, 'en')).toEqual({ text: '▼ 1.1', up: false });
    expect(formatDelta(0.0001, 'fr')).toBeNull();
    expect(formatTiming(1_234_000)).toBe('20:34');
    expect(formatTiming(null)).toBe('');
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

  it('copies a readable build with AZERTY keys in French', () => {
    const core: StaticCore = {
      version: '16.22.1',
      items: { 3031: { name: "Lame d'infini", cost: 3450, desc: '' }, 3006: { name: 'Jambières', cost: 1100, desc: '' }, 6673: { name: 'Arc-bouclier', cost: 3000, desc: '' } },
      runeTrees: [{ id: 8000, name: 'Précision', icon: '', slots: [[{ id: 8008, name: 'Tempo mortel', icon: '', desc: '' }], [{ id: 9101, name: 'Absorption', icon: '', desc: '' }], [{ id: 9104, name: 'Alacrité', icon: '', desc: '' }], [{ id: 8299, name: 'Dernier rempart', icon: '', desc: '' }]] }],
      shards: { 5008: { name: 'Adaptive', icon: '' }, 5011: { name: 'Health', icon: '' } },
      summoners: { 4: { name: 'Saut éclair', icon: '', desc: '' }, 14: { name: 'Embrasement', icon: '', desc: '' } },
      champions: {},
    };
    const build = {
      label: 'most_played',
      core: [6673, 3006, 3031],
      full: [6673, 3006, 3031],
      start: null,
      runes: { page: [8000, 8008, 9101, 9104, 8299, 8400, 8444, 8451, 5008, 5008, 5011], games: 10, wins: 5, winRate: 0.5 },
      spells: { ids: [4, 14], games: 10, wins: 5, winRate: 0.5 },
      skills: { order: '123111', max: '132', games: 10, wins: 5, winRate: 0.5 },
    } as unknown as BuildData;
    const text = buildAsText(build, core, 'fr', { title: 'Yone Mid', core: 'Objets principaux', full: 'Build complet', start: 'Départ', runes: 'Runes', spells: 'Sorts', skills: 'Compétences', max: 'Max' });
    expect(text).toContain("Objets principaux : Arc-bouclier > Jambières > Lame d'infini");
    expect(text).toContain('Runes : Tempo mortel, Absorption, Alacrité, Dernier rempart');
    expect(text).toContain('Sorts : Saut éclair + Embrasement');
    expect(text).toContain('Compétences : A Z E A A A');
    expect(text).toContain('Max : A > E > Z');
  });
});
