import { UpperCasePipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RouteContextService } from '../../core/route-context.service';
import { DISCORD_URL, GAMES, GameLink, Lang, SUPPORTED_LANGS } from '../../core/site.config';
import { PopupTwitchComponent } from '../../popup-twitch/popup-twitch.component';
import { TwitchService } from '../../services/twitch.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { GlobalSearchComponent } from '../global-search/global-search.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, TranslateModule, UpperCasePipe, IconComponent, GlobalSearchComponent, PopupTwitchComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  protected readonly ctx = inject(RouteContextService);
  protected readonly games = GAMES;
  protected readonly langs = SUPPORTED_LANGS;
  protected readonly discordUrl = DISCORD_URL;

  protected readonly searchOpen = signal(false);
  protected readonly live = signal(false);
  protected readonly otherLang = computed<Lang>(() => (this.ctx.lang() === 'fr' ? 'en' : 'fr'));

  private readonly mobileSearch = viewChild<GlobalSearchComponent>('mobileSearch');
  private readonly popup = viewChild.required(PopupTwitchComponent);

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      inject(TwitchService)
        .checkLiveStatus()
        .pipe(takeUntilDestroyed(inject(DestroyRef)))
        .subscribe((status) => {
          this.live.set(status.isLive);
          const popup = this.popup();
          popup.streamUrl = status.streamUrl ?? '';
          popup.streamTitle = status.streamTitle ?? '';
        });
    }
  }

  protected tabCurrent(game: GameLink): 'page' | 'true' | null {
    if (this.ctx.section() !== game.id) return null;
    return this.ctx.path() === game.path ? 'page' : 'true';
  }

  protected toggleSearch(): void {
    this.searchOpen.update((open) => !open);
    if (this.searchOpen()) setTimeout(() => this.mobileSearch()?.focus());
  }

  protected openLive(): void {
    this.popup().showPopup();
  }
}
