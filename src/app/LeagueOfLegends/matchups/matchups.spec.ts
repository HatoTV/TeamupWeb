import { convertToParamMap, UrlSegment } from '@angular/router';
import { Champion, ChampionMatchups } from '../../core/data/champion-data.service';
import { ChampionOption } from '../../shared/ui/champion-combobox/champion-combobox.component';
import { boardColumns, listEntries, optionsWithLevels, pickableChampions } from './matchups-data';
import { legacySelection, matchupPath, matchupsMatcher } from './matchups-url';

const seg = (url: string) => url.split('/').filter(Boolean).map((p) => new UrlSegment(p, {}));
const params = (url: string) => {
  const match = matchupsMatcher(seg(url));
  return match ? Object.fromEntries(Object.entries(match.posParams ?? {}).map(([k, v]) => [k, v.path])) : null;
};

const champ = (name: string, roles: Champion['roles'], hasMatchups = true): Champion => ({
  slug: name.toLowerCase().replace(/[^a-z]+/g, '-'),
  name,
  ddragonId: name,
  roles,
  difficulty: null,
  hasMatchups,
});

const janna = champ('Janna', ['support']);
const blitz = champ('Blitzcrank', ['support']);
const pyke = champ('Pyke', ['support']);
const braum = champ('Braum', ['support']);
const yasuo = champ('Yasuo', ['mid', 'top']);
const teemo = champ('Teemo', ['top'], false);
const all = [janna, blitz, pyke, braum, yasuo, teemo];
const lookup = { findByName: (n: string) => all.find((c) => c.name === n), iconUrl: (c: Champion) => `icon/${c.slug}` };

const jannaData: ChampionMatchups = {
  champion: 'Janna',
  author: null,
  rank: null,
  urlGuide: null,
  urlGuideFr: null,
  matchups: [
    { enemy: 'Pyke', level: 5, tips: '' },
    { enemy: 'Blitzcrank', level: 5, tips: '' },
    { enemy: 'Braum', level: 1, tips: '' },
    { enemy: 'Yasuo', level: 4, tips: '' },
    { enemy: 'Unknown', level: 2, tips: '' },
  ],
};

describe('matchup URLs', () => {
  it('matches the four states and exposes me / vs', () => {
    expect(params('fr/lol/matchups')).toEqual({ lang: 'fr' });
    expect(params('fr/lol/matchups/janna')).toEqual({ lang: 'fr', me: 'janna' });
    expect(params('en/lol/matchups/vs/blitzcrank')).toEqual({ lang: 'en', vs: 'blitzcrank' });
    expect(params('fr/lol/matchups/janna/vs/blitzcrank')).toEqual({ lang: 'fr', me: 'janna', vs: 'blitzcrank' });
  });

  it('rejects other paths', () => {
    expect(params('fr/lol/picker')).toBeNull();
    expect(params('fr/lol/matchups/vs')).toBeNull();
    expect(params('fr/lol/matchups/janna/blitz')).toBeNull();
    expect(params('fr/lol/matchups/Janna')).toBeNull();
    expect(params('fr/lol/matchups/a/vs/b/c')).toBeNull();
  });

  it('builds paths and converts legacy query strings', () => {
    expect(matchupPath({ me: 'janna', vs: 'pyke' })).toBe('/lol/matchups/janna/vs/pyke');
    expect(matchupPath({ me: 'janna', vs: null })).toBe('/lol/matchups/janna');
    expect(matchupPath({ me: null, vs: 'pyke' })).toBe('/lol/matchups/vs/pyke');
    expect(matchupPath({ me: null, vs: null })).toBe('/lol/matchups');
    expect(legacySelection(convertToParamMap({ champion: 'janna', enemy: 'blitzcrank' }))).toEqual({ me: 'janna', vs: 'blitzcrank' });
    expect(legacySelection(convertToParamMap({ me: 'Janna' }))).toEqual({ me: 'janna', vs: null });
    expect(legacySelection(convertToParamMap({ foo: 'x' }))).toBeNull();
  });
});

describe('matchup data', () => {
  it('lists same-role opponents of the requested levels, hardest first then by name', () => {
    expect(listEntries(janna, jannaData, [5, 4], lookup).map((e) => e.name)).toEqual(['Blitzcrank', 'Pyke']);
    expect(listEntries(janna, jannaData, [1, 2], lookup).map((e) => e.name)).toEqual(['Braum']);
  });

  it('groups every classified opponent into 5 columns, keeping empty ones', () => {
    const columns = boardColumns(jannaData, lookup);
    expect(columns.map((c) => c.level)).toEqual([5, 4, 3, 2, 1]);
    expect(columns.map((c) => c.entries.map((e) => e.name))).toEqual([['Blitzcrank', 'Pyke'], ['Yasuo'], [], [], ['Braum']]);
    expect(boardColumns(null, lookup).every((c) => c.entries.length === 0)).toBeTrue();
  });

  it('sorts suggestions by difficulty, then the unrated ones by name', () => {
    const options: ChampionOption[] = all.map((champion) => ({ champion, icon: '' }));
    const sorted = optionsWithLevels(options, jannaData, 'janna');
    expect(sorted.map((o) => [o.champion.name, o.level])).toEqual([
      ['Blitzcrank', 5],
      ['Pyke', 5],
      ['Yasuo', 4],
      ['Braum', 1],
      ['Teemo', undefined],
    ]);
  });

  it('keeps every champion, also without matchups, optionally for one role', () => {
    expect(pickableChampions(all, null).length).toBe(6);
    expect(pickableChampions(all, 'top').map((c) => c.name)).toEqual(['Yasuo', 'Teemo']);
  });
});
