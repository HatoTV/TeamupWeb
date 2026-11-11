import { splitLead, splitLines, splitParagraphs, splitSequence, readingMinutes } from './LeagueOfLegends/guide-shared/guide-text';
import { rankId, splitTips } from './LeagueOfLegends/matchups/matchups.component';
import { bucketOf } from './LeagueOfLegends/picker/picker.component';
import { Mechanic } from './core/data/rl-mechanics.service';
import { sortMechanics } from './RocketLeague/mecanics/mecanics.component';
import { suggestions } from './RocketLeague/mecanic/mecanic.component';
import { LEGAL_DOCS } from './legal/legal.component';

describe('Matchups helpers', () => {
  it('splits raw tips into capitalised sentences without separators', () => {
    expect(splitTips(' | if you get hooked you die. Play safe in lane. Punish 1.5 misses.')).toEqual([
      'If you get hooked you die.',
      'Play safe in lane.',
      'Punish 1.5 misses.',
    ]);
  });

  it('maps free-form ranks to emblem ids', () => {
    expect(rankId('challenger')).toBe('challenger');
    expect(rankId('master & grandmaster')).toBe('master');
    expect(rankId('Diamant')).toBe('diamond');
    expect(rankId('???')).toBeNull();
    expect(rankId(null)).toBeNull();
  });
});

describe('Picker difficulty buckets', () => {
  it('follows LOL.PICKER.DIFFICULTIES (easy = 1-2)', () => {
    expect(bucketOf(1)?.id).toBe('easy');
    expect(bucketOf(2)?.id).toBe('easy');
    expect(bucketOf(3)?.id).toBe('average');
    expect(bucketOf(5)?.id).toBe('*');
    expect(bucketOf(null)).toBeNull();
  });
});

describe('Guide text helpers', () => {
  it('splits a bold lead label from its body', () => {
    expect(splitLead('<bold>Wave standard :</bold> 3 sbires.')).toEqual({
      label: 'Wave standard',
      rawLabel: 'Wave standard :',
      body: '3 sbires.',
    });
    expect(splitLead('plain text').label).toBe('');
  });

  it('splits paragraphs, lines and wave sequences', () => {
    expect(splitParagraphs('A<br><br>B<br>C')).toEqual(['A', 'B<br>C']);
    expect(splitLines('A<br>B\nC')).toEqual(['A', 'B', 'C']);
    expect(splitSequence('Wave standard -> Wave canon.')).toEqual(['Wave standard', 'Wave canon']);
    expect(splitSequence('Toutes les waves')).toEqual([]);
  });

  it('estimates reading time from a translation subtree', () => {
    const words = Array.from({ length: 400 }, () => 'mot').join(' ');
    expect(readingMinutes({ A: words, B: { C: '<b>x</b>' } })).toBe(2);
  });
});

describe('Rocket League helpers', () => {
  const m = (name: string, difficulty: number, utility: number) => ({ slug: name, name, difficulty, utility }) as Mechanic;
  const list = [m('A', 1, 5), m('B', 3, 3), m('C', 2, 5), m('D', 4, 2)];

  it('sorts by utility (highest first) then difficulty', () => {
    expect(sortMechanics(list, 'utility-desc').map((x) => x.name)).toEqual(['A', 'C', 'B', 'D']);
    expect(sortMechanics(list, 'name-desc').map((x) => x.name)).toEqual(['D', 'C', 'B', 'A']);
  });

  it('suggests the 3 closest mechanics in difficulty', () => {
    expect(suggestions(list, list[1]).map((x) => x.name)).toEqual(['C', 'D', 'A']);
  });
});

describe('Legal documents', () => {
  it('declares the three documents with existing section keys', () => {
    expect(Object.keys(LEGAL_DOCS)).toEqual(['cgu', 'privacy', 'mentions']);
    expect(LEGAL_DOCS.cgu.sections.length).toBe(9);
    expect(LEGAL_DOCS.mentions.path).toBe('/mentions-legales');
  });
});
