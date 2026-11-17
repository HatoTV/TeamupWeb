import { importProvidersFrom, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BuildDataService, TierList } from '../../core/data/build-data.service';
import { ChampionDataService } from '../../core/data/champion-data.service';
import { TierListComponent } from './tier-list.component';
import { bestWinRate, groupByTier, parseBand, parseRole, winTone, withAlpha } from './tier-list-utils';

describe('tier list utils', () => {
  it('best win rate: a tie on the shown rate goes to the highest tier', () => {
    const c = (name: string, tier: 'S+' | 'S' | 'A', winRate: number, games = 100) => ({ name, tier, winRate, games });
    expect(bestWinRate([c('A', 'A', 0.5361), c('S', 'S', 0.5358), c('Low', 'S+', 0.52)])?.name).toBe('S');
    expect(bestWinRate([c('A', 'A', 0.537), c('S', 'S', 0.536)])?.name).toBe('A');
    expect(bestWinRate([c('Few', 'S', 0.536, 50), c('Many', 'S', 0.536, 900)])?.name).toBe('Many');
    expect(bestWinRate([])).toBeNull();
  });

  it('badge colour at the bounds: 49.9 / 50.0 / 51.9 / 52.0 %', () => {
    expect(winTone(0.499)).toBe('bad');
    expect(winTone(0.5)).toBe('neutral');
    expect(winTone(0.519)).toBe('neutral');
    expect(winTone(0.52)).toBe('good');
    // Colour of the value shown (one decimal): 51.96 % is shown "52,0 %".
    expect(winTone(0.51996)).toBe('good');
    expect(winTone(0.49949)).toBe('bad');
  });

  it('unknown rank or role → defaults (Platinum → Diamond, Mid)', () => {
    expect(parseBand('elite')).toBe('elite');
    expect(parseBand('gold')).toBe('mid');
    expect(parseBand(null)).toBe('mid');
    expect(parseRole('support')).toBe('support');
    expect(parseRole('bot')).toBe('mid');
    expect(parseRole(undefined)).toBe('mid');
  });

  it('groups by tier S+ to D (empty tiers kept), best win rate first', () => {
    const groups = groupByTier([
      { tier: 'A' as const, winRate: 0.51, name: 'b' },
      { tier: 'A' as const, winRate: 0.53, name: 'a' },
      { tier: 'D' as const, winRate: 0.45, name: 'c' },
    ]);
    expect(groups.map((g) => g.tier)).toEqual(['S+', 'S', 'A', 'B', 'C', 'D']);
    expect(groups[2]!.champions.map((c) => c.name)).toEqual(['a', 'b']);
    expect(groups[0]!.champions).toEqual([]);
    expect(withAlpha('#14E0B4', 0.6)).toBe('#14E0B499');
    expect(withAlpha('#14E0B4', 0.08)).toBe('#14E0B414');
  });
});

// ---------- page ----------

const NAMES = ['Ahri', 'Akali', 'Annie', 'Azir', 'Ekko', 'Mel', 'Jinx', 'Caitlyn', 'Ezreal', 'Jhin', 'Vayne', 'Garen', 'Darius', 'Jax', 'Sion', 'Irelia'];
const core = { version: '16.22.1', items: {}, runeTrees: [], shards: {}, summoners: {}, champions: Object.fromEntries(NAMES.map((n, i) => [String(i + 1), { id: n, name: n }])) };
const key = (name: string) => NAMES.indexOf(name) + 1;
const entry = (name: string, role: TierList['champions'][number]['role'], tier: TierList['champions'][number]['tier'], winRate: number) => ({
  championId: key(name),
  role,
  tier,
  games: 1000,
  wins: Math.round(winRate * 1000),
  winRate,
  pickRate: 0.05,
});

const FILES: Record<string, TierList> = {
  mid: {
    patch: '16.22',
    band: 'mid',
    generatedAt: '2026-11-16T00:00:00Z',
    totalGames: 50000,
    minGames: 200,
    champions: [
      entry('Ahri', 'mid', 'S+', 0.52),
      entry('Akali', 'mid', 'S', 0.519),
      entry('Annie', 'mid', 'A', 0.5),
      entry('Azir', 'mid', 'B', 0.499),
      entry('Ekko', 'mid', 'C', 0.48),
      entry('Akali', 'top', 'A', 0.51), // same champion, other role
      entry('Jinx', 'adc', 'S', 0.53),
      entry('Caitlyn', 'adc', 'A', 0.51),
      entry('Ezreal', 'adc', 'B', 0.5),
      entry('Jhin', 'adc', 'C', 0.49),
      entry('Vayne', 'adc', 'D', 0.47),
    ],
    unranked: [{ championId: key('Mel'), role: 'mid', games: 120 }, { championId: key('Garen'), role: 'mid', games: 4 }],
  },
  low: {
    patch: '16.22',
    band: 'low',
    generatedAt: '2026-11-16T00:00:00Z',
    totalGames: 9000,
    minGames: 200,
    champions: [entry('Garen', 'mid', 'S', 0.55), entry('Darius', 'mid', 'A', 0.53), entry('Jax', 'mid', 'B', 0.51), entry('Sion', 'mid', 'C', 0.5), entry('Irelia', 'mid', 'D', 0.47)],
    unranked: [],
  },
  elite: { patch: '16.22', band: 'elite', generatedAt: '2026-11-16T00:00:00Z', totalGames: 300, minGames: 200, champions: [entry('Ahri', 'mid', 'B', 0.5)], unranked: [] },
};

const dataStub: Partial<BuildDataService> = {
  meta: () => Promise.resolve({ current: '16.22', latest: '16.22', patches: [{ patch: '16.22', ddragonVersion: '16.22.1', games: {}, updatedAt: '' }], filters: [], regions: ['all'], minGamesForNewPatch: 200 }),
  tierList: (_patch: string, band: TierList['band']) => Promise.resolve(FILES[band] ?? null),
  core: () => Promise.resolve(core),
  championIcon: (_v: string, id: string) => `icon/${id}.png`,
  splash: (id: string) => `splash/${id}.jpg`,
};
const championIndex = { version: '16.22.1', champions: NAMES.map((n) => ({ slug: n.toLowerCase(), name: n, ddragonId: n, roles: [], difficulty: null, hasMatchups: false })) };
const championsStub = { index: signal(championIndex), loadIndex: () => Promise.resolve(championIndex) };

describe('TierListComponent', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r));
      harness.detectChanges();
    }
  };
  const root = () => harness.routeNativeElement as HTMLElement;
  const shown = () => Array.from(root().querySelectorAll('.champ__name')).map((e) => e.textContent!.trim());
  const click = async (el: Element | null) => {
    (el as HTMLElement).click();
    await settle();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: ':lang/lol/tier-list', component: TierListComponent }]),
        importProvidersFrom(TranslateModule.forRoot()),
        { provide: BuildDataService, useValue: dataStub },
        { provide: ChampionDataService, useValue: championsStub },
      ],
    });
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
    await harness.navigateByUrl('/fr/lol/tier-list?rank=unknown&role=bot', TierListComponent);
    await settle();
  });

  it('defaults to Platinum → Diamond / Mid; each ranked champion once per role', async () => {
    expect(shown()).toEqual(['Ahri', 'Akali', 'Annie', 'Azir', 'Ekko']);
    for (const role of ['top', 'jungle', 'mid', 'adc', 'support']) {
      await click(root().querySelectorAll('.role')[['top', 'jungle', 'mid', 'adc', 'support'].indexOf(role)]!);
      const names = shown();
      expect(new Set(names).size).withContext(role).toBe(names.length);
      expect(names.length).withContext(role).toBe(FILES['mid']!.champions.filter((c) => c.role === role).length >= 5 ? FILES['mid']!.champions.filter((c) => c.role === role).length : 0);
    }
  });

  it('badges coloured at the bounds 49.9 / 50.0 / 51.9 / 52.0 %', () => {
    const badge = (name: string) => {
      const link = Array.from(root().querySelectorAll('.champ__link')).find((a) => a.querySelector('.champ__name')!.textContent!.trim() === name)!;
      return link.querySelector('.badge')!;
    };
    expect(badge('Azir').className).toContain('badge--bad');
    expect(badge('Annie').className).toContain('badge--neutral');
    expect(badge('Akali').className).toContain('badge--neutral');
    expect(badge('Ahri').className).toContain('badge--good');
    expect(badge('Ahri').textContent!.trim()).toBe('52,0\u202f%');
  });

  it('a role change updates the URL and the list', async () => {
    await click(root().querySelectorAll('.role')[3]!); // ADC
    expect(router.url).toContain('role=adc');
    expect(router.url).toContain('rank=mid');
    expect(shown()).toEqual(['Jinx', 'Caitlyn', 'Ezreal', 'Jhin', 'Vayne']);
    expect(root().querySelectorAll('.role')[3]!.getAttribute('aria-pressed')).toBe('true');
  });

  it('a rank change (listbox) updates the URL and the list; too few champions → empty state', async () => {
    const button = root().querySelector('.rank__button') as HTMLButtonElement;
    await click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const options = root().querySelectorAll('[role="option"]');
    expect(options[1]!.getAttribute('aria-selected')).toBe('true');
    await click(options[0]!); // Iron → Gold
    expect(router.url).toContain('rank=low');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(shown()).toEqual(['Garen', 'Darius', 'Jax', 'Sion', 'Irelia']);

    await click(button);
    await click(root().querySelectorAll('[role="option"]')[2]!); // Master → Challenger: 1 ranked champion
    expect(router.url).toContain('rank=elite');
    expect(shown()).toEqual([]);
    expect(root().querySelector('.empty')).not.toBeNull();
    expect(root().querySelectorAll('.tier').length).toBe(0);
  });

  it('keyboard: arrows, Enter and Escape on the rank listbox', async () => {
    const button = root().querySelector('.rank__button') as HTMLButtonElement;
    button.focus();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await settle();
    const list = root().querySelector('[role="listbox"]') as HTMLElement;
    expect(document.activeElement).toBe(list.querySelectorAll('[role="option"]')[1]!);
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(list.querySelectorAll('[role="option"]')[2]!);
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
    expect(router.url).not.toContain('rank=elite');
  });

  it('unranked champions are listed apart, with the threshold of the data', () => {
    const imgs = root().querySelectorAll('.unranked__list img');
    expect(imgs.length).withContext('occasional pick (4 games) left out').toBe(1);
    expect(imgs[0]!.getAttribute('alt')).toContain('Mel');
    expect(root().querySelector('.unranked__note')!.textContent).toContain('TIERLIST.UNRANKED_NOTE');
  });
});
