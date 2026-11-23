import { TftCatalog } from '../tft-data.service';
import { boardCost, cellOf, decodeBoard, encodeBoard, placementRole, recommendedPlacement } from './board';
import { computeSynergies } from './synergies';
import { TftChampion, TftItem, TftStatic, TftTrait } from './tft-types';

// Subset of the real Set 18 data (public/data/tft/static/set18/en.json): ids, costs, traits, breakpoints, short ids.
const champ = (id: string, short: string, cost: number, traits: string[], range = 4, variantOf?: string): TftChampion => ({
  id,
  short,
  slug: id.toLowerCase(),
  name: id,
  cost,
  traits,
  ...(variantOf ? { variantOf } : {}),
  icon: null,
  ability: { name: '', desc: '', hasValues: false },
  stats: { hp: 800, damage: 50, armor: 40, magicResist: 40, attackSpeed: 0.75, range, mana: 60, initialMana: 0 },
});
const champions: TftChampion[] = [
  champ('DA_18_Aphelios', 'b5m8', 4, ['DA_18_Lunar', 'DA_18_Rapidfire']),
  champ('DA_18_Sivir', 'siv1', 4, ['DA_Primal18', 'DA_18_Hunter']),
  champ('DA_18_Ashe', 'ash1', 5, ['DA_18_Blossom', 'DA_18_Hunter']),
  champ('DA_18_Kayle', 'kay1', 2, ['DA_18_Solar', 'DA_18_Rapidfire']),
  champ('DA_18_Caitlyn', 'cai1', 2, ['DA_18_Coven', 'DA_18_Hunter']),
  champ('DA_18_Varus', 'var1', 1, ['DA_18_Inferno', 'DA_18_Rapidfire']),
  champ('DA_18_Tristana', 'tri1', 3, ['DA_18_Fae', 'DA_18_Sprykin', 'DA_18_Hunter']),
  champ('DA_18_Xayah', 'xay1', 1, ['DA_18_Elderwood', 'DA_18_Fae', 'DA_18_Rapidfire']),
  champ('DA_18_Maokai', 'mao1', 5, ['DA_18_Maokai_UniqueTrait', 'DA_Juggernaut18'], 1),
  champ('DA_18_Malphite', 'mal1', 4, ['DA_18_Blackthorn', 'DA_18_Battlemage'], 1),
  champ('DA_Amumu18', 'amu1', 4, ['DA_18_Inferno', 'DA_Juggernaut18'], 1),
  champ('DA_18_KhaZix', 'kha1', 3, ['DA_18_Rival'], 1),
  champ('DA_Lux18_Base', 'lux1', 5, ['DA_18_LuxUniqueTrait'], 6),
  champ('DA_18_Lux_Fae', 'lux2', 5, ['DA_18_Fae', 'DA_18_LuxUniqueTrait'], 6, 'DA_Lux18_Base'),
];
const tiers4 = [
  { min: 2, style: 'bronze' as const },
  { min: 3, style: 'silver' as const },
  { min: 4, style: 'silver' as const },
  { min: 5, style: 'gold' as const },
];
const trait = (id: string, breakpoints: TftTrait['breakpoints']): TftTrait => ({ id, name: id, icon: null, breakpoints });
const traits: TftTrait[] = [
  trait('DA_18_Rapidfire', tiers4),
  trait('DA_18_Hunter', tiers4),
  trait('DA_18_Lunar', tiers4),
  trait('DA_Juggernaut18', [{ min: 2, style: 'bronze' }, { min: 4, style: 'silver' }, { min: 6, style: 'gold' }]),
  trait('DA_18_Fae', [{ min: 2, style: 'bronze' }, { min: 4, style: 'gold' }]),
  trait('DA_18_Inferno', [{ min: 2, style: 'bronze' }, { min: 3, style: 'silver' }, { min: 5, style: 'gold' }, { min: 7, style: 'gold' }]),
  trait('DA_18_Maokai_UniqueTrait', [{ min: 1, style: 'unique' }]),
  trait('DA_18_LuxUniqueTrait', [{ min: 1, style: 'unique' }]),
  trait('DA_Primal18', [{ min: 2, style: 'bronze' }, { min: 4, style: 'gold' }]),
];
const item = (id: string, short: string, kind: TftItem['kind'], t?: string): TftItem => ({ id, short, slug: id.toLowerCase(), name: id, kind, icon: null, ...(t ? { trait: t } : {}) });
const items: TftItem[] = [
  item('DA_GuinsoosRageblade', 'v48x', 'complete'),
  item('DA_InfinityEdge', 'inf1', 'complete'),
  item('DA_18_EmblemJuggernaut', 'card', 'emblem', 'DA_Juggernaut18'),
  item('DA_18_EmblemFae', '75zn', 'emblem', 'DA_18_Fae'),
  item('DA_18_EmblemRapidfire', '3io1', 'emblem', 'DA_18_Rapidfire'),
];
const catalog = new TftCatalog({ set: 18, mutator: 'TFTSet18', version: '', generatedAt: '', champions, traits, items } satisfies TftStatic);
const count = (s: ReturnType<typeof computeSynergies>, id: string) => s.find((x) => x.trait === id);

describe('TFT synergies (team builder) on three known comps', () => {
  it('Rapidfire / Hunter: unique champions, a second copy adds nothing', () => {
    const s = computeSynergies(
      ['DA_18_Aphelios', 'DA_18_Sivir', 'DA_18_Ashe', 'DA_18_Kayle', 'DA_18_Kayle', 'DA_18_Caitlyn', 'DA_18_Varus', 'DA_18_Tristana', 'DA_18_Xayah'].map((champion) => ({ champion })),
      catalog.synergies
    );
    expect(count(s, 'DA_18_Rapidfire')).toEqual(jasmine.objectContaining({ count: 4, style: 'silver', level: 2 }));
    expect(count(s, 'DA_18_Hunter')).toEqual(jasmine.objectContaining({ count: 4, style: 'silver' }));
    expect(count(s, 'DA_18_Fae')).toEqual(jasmine.objectContaining({ count: 2, style: 'bronze' }));
    expect(count(s, 'DA_18_Lunar')).toEqual(jasmine.objectContaining({ count: 1, style: null, level: -1 }));
    expect(s.findIndex((x) => !x.style)).toBeGreaterThan(s.findIndex((x) => x.trait === 'DA_18_Fae'));
  });

  it('Juggernaut: an emblem adds its trait, not twice to a champion that has it', () => {
    const s = computeSynergies(
      [
        { champion: 'DA_18_Maokai', items: ['DA_18_EmblemJuggernaut'] },
        { champion: 'DA_Amumu18' },
        { champion: 'DA_18_Malphite', items: ['DA_18_EmblemJuggernaut', 'DA_GuinsoosRageblade'] },
        { champion: 'DA_18_Varus' },
      ],
      catalog.synergies
    );
    expect(count(s, 'DA_Juggernaut18')).toEqual(jasmine.objectContaining({ count: 3, style: 'bronze' }));
    expect(count(s, 'DA_18_Inferno')?.count).toBe(2);
    expect(count(s, 'DA_18_Maokai_UniqueTrait')?.style).toBe('unique');
  });

  it('Lux forms count once; emblems on Xayah (already Fae) and Tristana (Rapidfire)', () => {
    const s = computeSynergies(
      [
        { champion: 'DA_Lux18_Base' },
        { champion: 'DA_18_Lux_Fae' },
        { champion: 'DA_18_Xayah', items: ['DA_18_EmblemFae'] },
        { champion: 'DA_18_Tristana', items: ['DA_18_EmblemRapidfire'] },
      ],
      catalog.synergies
    );
    expect(count(s, 'DA_18_LuxUniqueTrait')?.count).toBe(1);
    expect(count(s, 'DA_18_Fae')).toEqual(jasmine.objectContaining({ count: 3, style: 'bronze' }));
    expect(count(s, 'DA_18_Rapidfire')).toEqual(jasmine.objectContaining({ count: 2, style: 'bronze' }));
  });
});

describe('TFT team builder link', () => {
  const short = { champion: (id: string) => catalog.champion(id)?.short, item: (id: string) => catalog.item(id)?.short };
  const ids = { champion: (s: string) => catalog.championByShort(s)?.id, item: (s: string) => catalog.itemByShort(s)?.id };

  it('restores the board from a shared link', () => {
    const board = [
      { champion: 'DA_18_Aphelios', stars: 2, cell: cellOf(3, 6), items: ['DA_GuinsoosRageblade', 'DA_InfinityEdge', 'DA_18_EmblemFae'] },
      { champion: 'DA_18_Maokai', stars: 3, cell: cellOf(0, 3), items: [] },
      { champion: 'DA_18_Lux_Fae', stars: 1, cell: cellOf(2, 0), items: ['DA_InfinityEdge'] },
    ];
    const code = encodeBoard(board, short);
    expect(code).toMatch(/^[0-9a-z_]+$/);
    expect(code).toContain('b5m82r');
    const restored = decodeBoard(code, ids);
    expect(restored).toEqual(jasmine.arrayWithExactContents(board));
  });

  it('skips unknown or broken parts and never stacks two units on a hex', () => {
    expect(decodeBoard('zzzz11_b5m8211_b5m82r_oops', ids)).toEqual([{ champion: 'DA_18_Aphelios', stars: 2, cell: 27, items: [] }]);
    expect(decodeBoard('b5m821_mao131', ids).length).toBe(1);
    expect(decodeBoard(null, ids)).toEqual([]);
  });
});

describe('TFT board rules', () => {
  it('gold value: cost × 3^(stars − 1)', () => {
    expect(boardCost([{ cost: 4, stars: 2 }, { cost: 1, stars: 3 }, { cost: 5, stars: 1 }])).toBe(12 + 9 + 5);
  });

  it('recommended placement: tanks in front, ranged carries in the back corners, assassins on the back sides', () => {
    const cells = recommendedPlacement(
      [
        { id: 'DA_18_Maokai', carry: false },
        { id: 'DA_18_Aphelios', carry: true },
        { id: 'DA_18_Ashe', carry: true },
        { id: 'DA_18_KhaZix', carry: true },
        { id: 'DA_18_Varus', carry: false },
      ],
      (id) => catalog.champion(id)
    );
    expect(cells.get('DA_18_Maokai')).toBe(cellOf(0, 3));
    expect([cells.get('DA_18_Aphelios'), cells.get('DA_18_Ashe')]).toEqual([cellOf(3, 0), cellOf(3, 6)]);
    expect(Math.floor(cells.get('DA_18_KhaZix')! / 7)).toBe(3);
    expect(cells.get('DA_18_Varus')).toBe(cellOf(3, 3));
    expect(placementRole(catalog.champion('DA_18_KhaZix')!, true)).toBe('assassin');
  });
});
