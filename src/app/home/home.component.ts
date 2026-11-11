import { ImgFallbackPipe, SrcsetPipe } from '../core/images/image-utils';
import { NgOptimizedImage } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, map, of } from 'rxjs';
import { ChampionDataService } from '../core/data/champion-data.service';
import { LiveStatusService } from '../core/live-status.service';
import { LOL_GUIDE_GROUPS } from '../core/navigation/lol-nav';
import { RouteContextService } from '../core/route-context.service';
import { DISCORD_URL, GameId, TWITCH_URL } from '../core/site.config';
import { GlobalSearchComponent } from '../layout/global-search/global-search.component';
import { SafeHtmlPipe } from '../safe-html.pipe';
import { DifficultyBadgeComponent } from '../shared/ui/difficulty-badge.component';
import { IconComponent } from '../shared/ui/icon/icon.component';

interface QuickLink {
  labelKey: string;
  path: string;
  fragment?: string;
  game: GameId;
}

interface GameCard {
  game: GameId;
  nameKey: string;
  path: string;
  image: string;
}

interface Tile {
  game: GameId;
  kickerKey: string;
  titleKey: string;
  textKey: string;
  path: string;
  image: string;
}

const RANKS = ['iron', 'bronze', 'silver', 'gold', 'platinum', 'emerald', 'diamond', 'master', 'grandmaster', 'challenger'];
const PICKER_PREVIEW = 7;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [SrcsetPipe, ImgFallbackPipe, NgOptimizedImage, TranslateModule, RouterLink, SafeHtmlPipe, GlobalSearchComponent, IconComponent, DifficultyBadgeComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  protected readonly ctx = inject(RouteContextService);
  protected readonly champions = inject(ChampionDataService);
  protected readonly live = inject(LiveStatusService);
  private readonly translate = inject(TranslateService);

  protected readonly discordUrl = DISCORD_URL;
  protected readonly twitchUrl = TWITCH_URL;
  protected readonly ranks = RANKS.map((id, i) => ({ id, key: `HOMEPAGE.RANKS.${id.toUpperCase()}`, low: i < 7 }));
  protected readonly lolGuideCount = LOL_GUIDE_GROUPS.reduce((total, group) => total + group.items.length, 0);

  protected readonly quickLinks: QuickLink[] = [
    { labelKey: 'NAV.MATCHUPS', path: '/lol/matchups', game: 'lol' },
    { labelKey: 'NAV.LOL_WAVEMANAGEMENT', path: '/lol/wavemanagement', game: 'lol' },
    { labelKey: 'HOMEPAGE.QUICK_TFT', path: '/tft', game: 'tft' },
    { labelKey: 'HOMEPAGE.QUICK_RL', path: '/rocket/mecanics/fast-aerial', game: 'rl' },
  ];

  protected readonly games: GameCard[] = [
    { game: 'lol', nameKey: 'GAMES.LOL', path: '/lol/matchups', image: 'assets/img/site/gameLoL.webp' },
    { game: 'tft', nameKey: 'GAMES.TFT', path: '/tft', image: 'assets/img/site/gameTFT.webp' },
    { game: 'rl', nameKey: 'GAMES.RL', path: '/rocket/mecanics', image: 'assets/img/site/gameRL.webp' },
  ];

  protected readonly tiles: Tile[] = [
    {
      game: 'lol',
      kickerKey: 'HOMEPAGE.TILE_LOL_KICKER',
      titleKey: 'NAV.LOL_WAVEMANAGEMENT',
      textKey: 'HOMEPAGE.TILE_WAVE_TEXT',
      path: '/lol/wavemanagement',
      image: 'assets/img/site/bkgContent_Wavemanagement.webp',
    },
    {
      game: 'tft',
      kickerKey: 'HOMEPAGE.TILE_TFT_KICKER',
      titleKey: 'HOMEPAGE.TILE_TFT_TITLE',
      textKey: 'HOMEPAGE.TILE_TFT_TEXT',
      path: '/tft',
      image: 'assets/img/site/bkgContent_Tft.webp',
    },
    {
      game: 'rl',
      kickerKey: 'GAMES.RL',
      titleKey: 'HOMEPAGE.TILE_RL_TITLE',
      textKey: 'HOMEPAGE.TILE_RL_TEXT',
      path: '/rocket/mecanics',
      image: 'assets/img/site/bkgRocketLeague.webp',
    },
  ];

  protected readonly pillars = [
    { n: '01', titleKey: 'HOME.TITLE2', textKey: 'HOME.CONTENT2', image: 'assets/img/splash/Ahri.webp', position: '50% 25%' },
    { n: '02', titleKey: 'HOME.TITLE3', textKey: 'HOME.CONTENT3', image: 'assets/img/splash/LeeSin.webp', position: '50% 20%' },
    { n: '03', titleKey: 'HOME.TITLE4', textKey: 'HOME.CONTENT4', image: 'assets/img/splash/Darius.webp', position: '50% 30%' },
  ];

  protected readonly rlCount = toSignal(
    inject(HttpClient)
      .get<unknown[]>('assets/rlmecanics.json')
      .pipe(
        map((list) => list.length),
        catchError(() => of(null))
      ),
    { initialValue: null }
  );

  /** "Bienvenue sur TeamUpp" split so the brand name can be highlighted. */
  protected readonly welcome = toSignal(
    this.translate.stream('HOME.BIENVENUE').pipe(
      map((text: string) => {
        const index = text.lastIndexOf('TeamUpp');
        return index === -1 ? { before: text, brand: '' } : { before: text.slice(0, index).trim(), brand: 'TeamUpp' };
      })
    ),
    { initialValue: { before: '', brand: '' } }
  );

  /** HOME.CONTENT1 paragraphs; the last one is Hato's motto, shown as a quote. */
  protected readonly platform = toSignal(
    this.translate.stream('HOME.CONTENT1').pipe(map((text: string) => splitParagraphs(text))),
    { initialValue: [] as string[] }
  );
  protected readonly ready = toSignal(
    this.translate.stream('HOME.CONTENT5').pipe(map((text: string) => splitParagraphs(text))),
    { initialValue: [] as string[] }
  );

  protected readonly pickerPreview = computed(() =>
    (this.champions.index()?.champions ?? []).slice(0, PICKER_PREVIEW).map((c) => ({ name: c.name, icon: this.champions.iconUrl(c) }))
  );
  protected readonly pickerMore = computed(() => Math.max(0, (this.champions.index()?.champions.length ?? 0) - PICKER_PREVIEW));
  protected readonly matchupDemo = computed(() => {
    this.champions.index();
    const ally = this.champions.findByName('Janna');
    const enemy = this.champions.findByName('Blitzcrank');
    return ally && enemy ? { ally: this.champions.iconUrl(ally), enemy: this.champions.iconUrl(enemy) } : null;
  });

  constructor() {
    void this.champions.loadIndex().catch(() => undefined);
  }
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/(?:<br\s*\/?>\s*){2,}/i)
    .map((part) => part.trim())
    .filter(Boolean);
}
