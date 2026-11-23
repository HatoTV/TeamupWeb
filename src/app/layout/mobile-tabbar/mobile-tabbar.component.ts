import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RouteContextService, SiteSection } from '../../core/route-context.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { IconName } from '../../shared/ui/icon/icons';

interface TabItem {
  section: SiteSection;
  labelKey: string;
  icon: IconName;
  path: string;
}

/** Bottom navigation shown on small screens (< 768 px). */
@Component({
  selector: 'app-mobile-tabbar',
  standalone: true,
  imports: [RouterLink, TranslateModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="tabbar" [attr.aria-label]="'NAV.MAIN' | translate">
      @for (tab of tabs; track tab.section) {
        <a
          class="tabbar__item"
          [attr.data-section]="tab.section"
          [routerLink]="ctx.link(tab.path)"
          [class.is-active]="ctx.section() === tab.section"
          [attr.aria-current]="ctx.section() === tab.section ? 'page' : null"
        >
          <span class="tabbar__icon"><app-icon [name]="tab.icon" [size]="20" /></span>
          {{ tab.labelKey | translate }}
        </a>
      }
    </nav>
  `,
  styleUrl: './mobile-tabbar.component.scss',
})
export class MobileTabbarComponent {
  protected readonly ctx = inject(RouteContextService);
  protected readonly tabs: TabItem[] = [
    { section: 'home', labelKey: 'NAV.HOME', icon: 'home', path: '/home' },
    { section: 'lol', labelKey: 'GAMES.LOL_SHORT', icon: 'game-lol', path: '/lol/matchups' },
    { section: 'tft', labelKey: 'GAMES.TFT_SHORT', icon: 'game-tft', path: '/tft/compositions' },
    { section: 'rl', labelKey: 'GAMES.RL_SHORT', icon: 'game-rl', path: '/rocket/mecanics' },
    { section: 'about', labelKey: 'ABOUTME', icon: 'user', path: '/contact' },
  ];
}
