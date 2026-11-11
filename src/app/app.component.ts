import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RouteContextService } from './core/route-context.service';
import { FooterComponent } from './layout/footer/footer.component';
import { LolSidebarComponent } from './layout/lol-sidebar/lol-sidebar.component';
import { MobileTabbarComponent } from './layout/mobile-tabbar/mobile-tabbar.component';
import { TopbarComponent } from './layout/topbar/topbar.component';
import { LanguageService } from './services/language.service';
import { ConsentService } from './core/ads/consent.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TranslateModule, TopbarComponent, LolSidebarComponent, FooterComponent, MobileTabbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly ctx = inject(RouteContextService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    const language = inject(LanguageService);
    // The URL is the source of truth for the language.
    effect(() => language.changeLanguage(this.ctx.lang()));
    // Consent message, then ads only if allowed (browser only, after first interaction).
    inject(ConsentService).init();
  }

  protected skipToMain(event: Event): void {
    event.preventDefault();
    const main = this.document.getElementById('main');
    main?.focus();
    main?.scrollIntoView();
  }
}
