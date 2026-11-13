import { ChampionStatic, StaticCore } from '../../../core/data/build-data.service';
import { PlayTipsFile, playCombos } from './play-tips.service';

describe('playCombos', () => {
  const champion: ChampionStatic = {
    id: 'Yone',
    name: 'Yone',
    passive: { name: 'Voie du chasseur', icon: 'YonePassive.png', desc: '' },
    spells: ['Acier mortel', 'Fendoir spirituel', 'Libération spirituelle', 'Destin scellé'].map((name, i) => ({ name, icon: `Yone${'QWER'[i]}.png`, desc: '' })),
  };
  const core = { summoners: { '4': { name: 'Saut éclair', icon: 'SummonerFlash.png', desc: '' } } } as unknown as StaticCore;
  const file = (keys: PlayTipsFile['combos'][number]['keys'], summoners?: Record<string, string>): PlayTipsFile => ({
    champion: 'Yone',
    patch: '16.22',
    lastResearch: '2026-11-13',
    combos: [{ name: { fr: 'Engage', en: 'Engage' }, keys, summoners, level: 'medium', desc: { fr: 'fr', en: 'en' } }],
    tips: [],
    sources: [],
  });
  const icon = (image: string) => `icon/${image}`;

  it('shows the keys in AZERTY in French and QWERTY in English, with the spell names and icons', () => {
    const [fr] = playCombos(file(['E', 'Q', 'R', 'W']), champion, core, 'fr', icon);
    expect(fr!.steps.map((s) => s.key)).toEqual(['E', 'A', 'R', 'Z']);
    expect(fr!.steps.map((s) => s.name)).toEqual(['Libération spirituelle', 'Acier mortel', 'Destin scellé', 'Fendoir spirituel']);
    expect(fr!.steps[1]!.src).toBe('icon/YoneQ.png');
    const [en] = playCombos(file(['E', 'Q', 'R', 'W']), champion, core, 'en', icon);
    expect(en!.steps.map((s) => s.key)).toEqual(['E', 'Q', 'R', 'W']);
  });

  it('resolves summoner spells bound to D / F and drops a combo it cannot resolve', () => {
    const [combo] = playCombos(file(['Q', 'F'], { F: 'SummonerFlash' }), champion, core, 'fr', icon);
    expect(combo!.steps[1]).toEqual(jasmine.objectContaining({ key: 'F', name: 'Saut éclair', src: 'icon/SummonerFlash.png' }));
    expect(playCombos(file(['Q', 'D']), champion, core, 'fr', icon)).toEqual([]);
  });
});
