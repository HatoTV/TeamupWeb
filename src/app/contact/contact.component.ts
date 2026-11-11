import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LiveStatusService } from '../core/live-status.service';
import { RouteContextService } from '../core/route-context.service';
import { SeoService } from '../core/seo.service';
import { SOCIALS, TWITCH_URL } from '../core/site.config';
import { ParagraphsPipe } from '../LeagueOfLegends/guide-shared/guide-text';
import { SafeHtmlPipe } from '../safe-html.pipe';
import { BrandIconComponent } from '../shared/ui/icon/brand-icon.component';
import { IconComponent } from '../shared/ui/icon/icon.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [TranslateModule, SafeHtmlPipe, ParagraphsPipe, IconComponent, BrandIconComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {
  protected readonly live = inject(LiveStatusService);
  protected readonly socials = SOCIALS;
  protected readonly twitchUrl = TWITCH_URL;
  /** Twitch handle shown as the page name. */
  protected readonly handle = 'Hato_TV';

  constructor() {
    const seo = inject(SeoService);
    const translate = inject(TranslateService);
    const ctx = inject(RouteContextService);
    effect(() => {
      ctx.lang();
      translate.get(['ABOUTME', 'ABOUTPAGE.META']).subscribe((t) =>
        seo.setPage({ title: t['ABOUTME'], description: t['ABOUTPAGE.META'], image: '/assets/img/site/HatoPP_circular.webp' })
      );
    });
  }
}
